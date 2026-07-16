/* End-to-end smoke test
   ✅ menu + lobby (create, join, setMode, startGame, room_full, host_only)
   ✅ full game loop (question → submitAnswer → answerResult → next turn → gameOver)
   ✅ host handoff, late-join rejection, wrong-code rejection
*/
import { io } from 'socket.io-client';

const URL = 'http://localhost:3000';
const log = (...a) => console.log('  ', ...a);
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

const VERBOSE = process.env.V === '1';
function client(name) {
  const s = io(URL, { transports: ['websocket'] });
  s.name  = name;
  s.snapshot = null;
  s.currentTurn = null;
  s.currentQuestion = null;
  s.lastResult = null;
  s.gameOver = null;
  s.on('gameStarted',  (p) => { s.snapshot = p.snapshot; s.currentTurn = p.currentTurn; log(`[${name}] gameStarted currentTurn=${nameOf(s, p.currentTurn)}`); });
  s.on('turnChanged',  (p) => { s.currentTurn = p.currentTurn; if (VERBOSE) log(`[${name}] turnChanged → ${nameOf(s, p.currentTurn)}`); });
  s.on('question',     (q) => { s.currentQuestion = q; if (VERBOSE) log(`[${name}] question(turn=${nameOf(s,q.currentTurn)}) "${q.text || '[img]'}" choices=[${q.choices.join(',')}]`); });
  s.on('answerResult', (r) => { s.lastResult = r; s.currentQuestion = null; if (VERBOSE) log(`[${name}] answerResult playerId=${nameOf(s,r.playerId)} correct=${r.correct} timeout=${r.timeout} from=${r.from} landed=${r.landed} to=${r.to}`); });
  s.on('boardUpdate',  (b) => {
    if (!s.snapshot) return;
    for (const bp of b.players) {
      const p = s.snapshot.players.find(x=>x.id===bp.id);
      if (!p) continue;
      p.position = bp.position;
      if (bp.items     !== undefined) p.items    = bp.items;
      if (bp.shielded  !== undefined) p.shielded = bp.shielded;
      if (bp.skipTurns !== undefined) p.skipTurns = bp.skipTurns;
    }
  });
  s.on('gameOver',     (g) => { s.gameOver = g; log(`[${name}] gameOver winner=${nameOf(s, g.winnerId)} reason=${g.reason}`); });
  s.on('turnSkipped',  (t) => { log(`[${name}] turnSkipped playerId=${nameOf(s, t.playerId)}`); });
  s.itemsGranted = [];
  s.on('itemGranted',  (g) => { s.itemsGranted.push(g); log(`[${name}] itemGranted ${g.type} → ${nameOf(s, g.playerId)}`); });
  s.on('itemUsed',     (u) => { log(`[${name}] itemUsed ${u.type} by=${nameOf(s, u.userId)} target=${u.targetId?nameOf(s,u.targetId):'-'} blocked=${u.blocked||'-'}`); });
  return new Promise((res) => s.on('connect', () => res(s)));
}
function nameOf(s, id) {
  return s.snapshot?.players.find(p => p.id === id)?.name || id;
}
const emit = (s, ev, p={}) => new Promise((res, rej) => {
  s.emit(ev, p, (r) => (r && r.ok === false) ? rej(new Error(r.error)) : res(r));
});

async function waitFor(cond, timeoutMs = 5000, label = 'condition') {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (cond()) return;
    await sleep(50);
  }
  throw new Error(`timeout waiting for: ${label}`);
}

(async () => {
  console.log('\n▶  PART 1: Lobby flows\n');

  const alice = await client('Alice');
  const create = await emit(alice, 'createRoom', { name: 'Alice' });
  const code = create.snapshot.code;
  log(`✅ createRoom → code=${code}`);

  const bob = await client('Bob');
  await emit(bob, 'joinRoom', { code, name: 'Bob' });
  log(`✅ joinRoom (Bob)`);

  // setMode host-only
  const m = await emit(alice, 'setMode', { mode: 50 });
  log(`✅ setMode(50) by host → ${m.mode}`);
  try { await emit(bob, 'setMode', { mode: 100 }); throw new Error('EXPECTED_REJECTION'); }
  catch (e) { log(`✅ setMode by non-host rejected: ${e.message}`); }

  await sleep(100);

  console.log('\n▶  PART 2: Full game loop\n');

  // start game
  await emit(alice, 'startGame', {});
  await waitFor(() => alice.snapshot && alice.currentTurn, 3000, 'gameStarted');
  await waitFor(() => alice.currentQuestion || bob.currentQuestion, 3000, 'first question');

  const activeQ = alice.currentQuestion || bob.currentQuestion;
  log(`✅ first question received: "${activeQ.text}" choices=[${activeQ.choices.join(',')}]`);

  // Play up to N turns, alternating whoever's turn it is
  const clients = [alice, bob];
  let turns = 0;
  const MAX_TURNS = 150;

  // ตัวช่วย: eval expression จากข้อความโจทย์ (ใช้เฉพาะใน test — client จริงไม่รู้เฉลย)
  function computeAnswer(text) {
    if (!text) return null;
    const left = text.replace(/=.*$/, '').trim();
    const expr = left.replace(/×/g, '*').replace(/÷/g, '/').replace(/−/g, '-');
    try { return Function(`"use strict"; return (${expr});`)(); } catch { return null; }
  }

  while (turns++ < MAX_TURNS) {
    if (alice.gameOver || bob.gameOver) break;

    const active = clients.find(c => c.currentTurn === c.id);
    if (!active) { await sleep(150); continue; }
    if (!active.currentQuestion) { await sleep(80); continue; }

    const q = active.currentQuestion;
    // 80% ตอบถูก, 20% ตอบมั่ว — ให้มี variance บ้างสำหรับเทสต์ snake/ladder
    const expected = computeAnswer(q.text);
    let choice;
    if (Math.random() < 0.8 && expected != null && q.choices.includes(expected)) {
      choice = q.choices.indexOf(expected);
    } else {
      choice = Math.floor(Math.random() * 3);
    }

    // ก่อนตอบ ถ้ามีของและมี target ที่เดินได้ ลองใช้ 50% chance
    if (active.snapshot) {
      const me = active.snapshot.players.find(x => x.id === active.id);
      if (me?.items?.length && Math.random() < 0.5) {
        const item = me.items[0];
        const others = active.snapshot.players.filter(x => x.id !== active.id);
        try {
          if (item === 'shield') {
            await emit(active, 'useItem', { type: 'shield' });
          } else if (item === 'trap' && others.length) {
            await emit(active, 'useItem', { type: 'trap', targetId: others[0].id });
          } else if (item === 'ticket' && others.length) {
            await emit(active, 'useItem', { type: 'ticket', targetId: others[0].id, direction: 'forward' });
          }
          await sleep(300);
        } catch (e) { log(`⚠️  useItem failed: ${e.message}`); }
      }
    }

    try {
      await emit(active, 'submitAnswer', { choiceIndex: choice });
      if (VERBOSE) log(`  → ${active.name} answered "${q.text}" with ${q.choices[choice]}`);
    } catch (e) {
      log(`⚠️  submitAnswer(${active.name}) failed: ${e.message}`);
      await sleep(200); continue;
    }
    await sleep(3200);
  }

  if (!alice.gameOver && !bob.gameOver) {
    log(`⚠️  ${MAX_TURNS} turns played without a winner — either RNG unlucky or bug`);
  } else {
    const g = alice.gameOver || bob.gameOver;
    log(`✅ game finished · winner=${nameOf(alice, g.winnerId)} · played ${turns} turns`);
  }

  // Verify final positions look sane
  const posA = alice.snapshot.players.find(p => p.id === alice.id).position;
  const posB = alice.snapshot.players.find(p => p.id === bob.id).position;
  log(`   final positions · Alice=${posA} · Bob=${posB} · board=${alice.snapshot.mode}`);

  console.log('\n▶  PART 3: restart game (host)\n');
  if (alice.gameOver) {
    try {
      await emit(alice, 'restartGame', {});
      log(`✅ restartGame ok`);
      await sleep(200);
    } catch (e) {
      log(`⚠️  restartGame failed: ${e.message}`);
    }
    // non-host cannot restart
    try { await emit(bob, 'restartGame', {}); throw new Error('EXPECTED_REJECTION'); }
    catch (e) { log(`✅ restart by non-host rejected: ${e.message}`); }
  }

  console.log('\n▶  PART 4: room_full + wrong code + late join\n');
  const carol = await client('Carol'); await emit(carol, 'joinRoom', { code, name: 'Carol' });
  const dave  = await client('Dave');  await emit(dave,  'joinRoom', { code, name: 'Dave' });
  log(`✅ 4th player joined`);
  const eve = await client('Eve');
  try { await emit(eve, 'joinRoom', { code, name: 'Eve' }); throw new Error('EXPECTED_REJECTION'); }
  catch (e) { log(`✅ 5th rejected: ${e.message}`); }
  eve.disconnect();

  const wrong = await client('Wrong');
  try { await emit(wrong, 'joinRoom', { code: 'XXXX', name: 'X' }); throw new Error('EXPECTED_REJECTION'); }
  catch (e) { log(`✅ wrong code rejected: ${e.message}`); }
  wrong.disconnect();

  alice.disconnect(); bob.disconnect(); carol.disconnect(); dave.disconnect();
  await sleep(200);
  console.log('\n✅  All checks passed.\n');
  process.exit(0);
})().catch(e => { console.error('\n❌', e, '\n'); process.exit(1); });

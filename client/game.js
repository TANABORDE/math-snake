/* =========================================
   Math Snake — game screen + question modal
   ใช้ APP object จาก menu.js (window.APP)
   ========================================= */

(() => {
  const { state, showScreen, toast, escapeHtml, initial } = window.APP;

  const $ = (id) => document.getElementById(id);

  // player colors (ตรงกับ lobby slot border)
  const PCOLORS = ['#ffcf3a', '#4be3a0', '#7bb5ff', '#ff9a7a'];

  const ITEM_META = {
    shield: { icon: '🛡️', needsTarget: false, needsDir: false },
    ticket: { icon: '🎫', needsTarget: true,  needsDir: true  },
    trap:   { icon: '⛔', needsTarget: true,  needsDir: false },
  };

  // BoardRenderer instance
  let board = null;
  function colorOf(playerId) {
    const idx = state.room?.players?.findIndex(p => p.id === playerId) ?? -1;
    return PCOLORS[idx % PCOLORS.length] || '#888';
  }
  function nameOf(playerId) {
    return state.room?.players?.find(p => p.id === playerId)?.name || '—';
  }

  /* =========================================================
     GAME SCREEN — render
     ========================================================= */
  function renderGame() {
    const r = state.room;
    if (!r) return;

    $('gameCode').textContent = r.code;
    $('gameMode').textContent = `1-${r.mode}`;
    $('gameGoal').textContent = `→ ${r.mode}`;

    // progress list
    const list = $('progressList');
    list.innerHTML = '';
    r.players.forEach((p, i) => {
      const color = PCOLORS[i % PCOLORS.length];
      const isTurn = (p.id === r.currentTurn);
      const isMe   = (p.id === state.myId);
      const pct = Math.max(0, Math.min(100, (p.position / r.mode) * 100));
      const li = document.createElement('li');
      li.className = 'progress-row' + (isTurn ? ' is-turn' : '');
      li.style.setProperty('--pcolor', color);
      li.innerHTML = `
        <span class="p-avatar">${escapeHtml(initial(p.name))}</span>
        <div class="p-body">
          <div class="p-name-row">
            <span class="p-name">${escapeHtml(p.name)}${isMe ? ' <span class="p-you">('+ (window.I18N?I18N.t('lobby.you'):'YOU') +')</span>' : ''}</span>
            <span class="p-pos">${p.position} / ${r.mode}</span>
          </div>
          <div class="p-bar"><div class="p-bar-fill" style="width: ${pct}%"></div></div>
        </div>
      `;
      list.appendChild(li);
    });

    // canvas board
    if (board) board.setState(r.players, r.currentTurn);

    // inventory
    renderInventory();

    // turn banner
    updateTurnBanner();
  }

  function renderInventory() {
    const r = state.room;
    const me = r?.players.find(p => p.id === state.myId);
    const items = me?.items || [];
    const card = $('inventoryCard');
    if (items.length === 0) { card.hidden = true; return; }
    card.hidden = false;

    const isMyTurn = r.currentTurn === state.myId;
    $('invHint').textContent = isMyTurn
      ? I18N.t('game.invHintOn')
      : I18N.t('game.invHintOff');

    // count each type
    const counts = { shield: 0, ticket: 0, trap: 0 };
    items.forEach(t => counts[t] = (counts[t] || 0) + 1);

    const wrap = $('invItems');
    wrap.innerHTML = '';
    ['shield', 'ticket', 'trap'].forEach(type => {
      const n = counts[type];
      if (!n) return;
      const btn = document.createElement('button');
      btn.className = 'inv-item';
      btn.disabled = !isMyTurn;
      btn.dataset.type = type;
      btn.innerHTML = `
        <span class="inv-icon">${ITEM_META[type].icon}</span>
        <span class="inv-name">${I18N.t('item.' + type)}</span>
        ${n > 1 ? `<span class="inv-count">×${n}</span>` : ''}
      `;
      btn.addEventListener('click', () => openItemModal(type));
      wrap.appendChild(btn);
    });
  }

  function updateTurnBanner() {
    const r = state.room;
    if (!r || !r.currentTurn) return;
    const p = r.players.find(x => x.id === r.currentTurn);
    if (!p) return;
    $('turnAvatar').textContent = initial(p.name);
    $('turnAvatar').style.background = colorOf(p.id);
    $('turnName').textContent = p.name;
    $('turnSub').textContent = (p.id === state.myId) ? I18N.t('game.yourTurn') : I18N.t('game.othersTurn');
  }

  /* ---------- Opponent countdown (ไม่มี modal สำหรับคนอื่น) ---------- */
  let oppTimer = null;
  function stopOpponentTimer() {
    if (oppTimer) { clearInterval(oppTimer); oppTimer = null; }
    const el = $('turnCountdown');
    el.hidden = true;
    el.classList.remove('warn');
  }
  function startOpponentTimer(deadline) {
    stopOpponentTimer();
    const el = $('turnCountdown');
    el.hidden = false;
    const tick = () => {
      const remain = Math.max(0, deadline - Date.now());
      const secs = Math.ceil(remain / 1000);
      el.textContent = secs;
      if (remain <= 3000) el.classList.add('warn');
      else el.classList.remove('warn');
      if (remain <= 0) { if (oppTimer) { clearInterval(oppTimer); oppTimer = null; } }
    };
    tick();
    oppTimer = setInterval(tick, 200);
  }

  /* =========================================================
     QUESTION MODAL
     ========================================================= */
  const qModal     = $('modal-question');
  const qPeek      = $('qPeek');
  const qPeekTimer = $('qPeekTimer');
  const qClose     = $('qClose');
  const qChoices = Array.from($('qChoices').querySelectorAll('button'));
  let qTimer   = null;
  let qDeadline = 0;
  let qActive  = null;   // question data ที่ active อยู่
  let qLocked  = false;  // กัน double-submit

  // ---- toggle helpers ----
  function hideQ()   { qModal.hidden = true;  if (qActive) qPeek.hidden = false; }
  function showQ()   { qPeek.hidden  = true;  qModal.hidden = false; }

  // ปุ่ม × บนหัว modal → ซ่อน modal + โผล่ peek
  qClose.addEventListener('click', (e) => { e.stopPropagation(); hideQ(); });

  // ปุ่มลอย → เปิด modal กลับ
  qPeek.addEventListener('click', () => { showQ(); });

  // Backdrop click บน modal โจทย์ (override generic behavior ใน menu.js)
  qModal.addEventListener('click', (e) => {
    if (e.target === qModal) hideQ();
  });

  // Escape → hide modal โจทย์ + โผล่ peek (แทนที่ generic escape handler)
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !qModal.hidden && qActive) {
      hideQ();
      e.stopPropagation();
    }
  }, true);   // capture phase — จับก่อน handler ตัวอื่น

  function openQuestion(payload) {
    qActive   = payload;
    qDeadline = payload.deadline;
    qLocked   = false;
    qPeek.hidden = true;   // เริ่มด้วย modal เปิด

    // header
    const isMyTurn = payload.currentTurn === state.myId;
    const turnName = nameOf(payload.currentTurn);
    $('qTurn').textContent = isMyTurn
      ? I18N.t('game.yourTurn')
      : I18N.t('game.turnOf', { name: turnName });
    $('qTurn').style.color = isMyTurn ? 'var(--accent)' : 'var(--text-dim)';

    // body: image OR text
    const img = $('qImage'), txt = $('qText');
    if (payload.image) {
      img.src = payload.image;
      img.hidden = false;
      txt.hidden = true;
      txt.textContent = '';
    } else {
      img.hidden = true;
      img.removeAttribute('src');
      txt.hidden = false;
      txt.textContent = payload.text || '?';
    }

    // choices
    qChoices.forEach((btn, i) => {
      btn.textContent = payload.choices[i];
      btn.disabled = !isMyTurn;
      btn.classList.remove('correct', 'wrong', 'reveal');
    });

    $('qHint').textContent = isMyTurn
      ? I18N.t('game.pickChoice')
      : I18N.t('game.watching', { name: turnName });

    // timer
    startTimer(payload.turnTimeMs || 20000);

    qModal.hidden = false;
  }

  function closeQuestion() {
    stopTimer();
    qActive = null;
    qModal.hidden = true;
    qPeek.hidden  = true;
  }

  function startTimer(totalMs) {
    stopTimer();
    let lastSecs = null;
    const tick = () => {
      const remain = Math.max(0, qDeadline - Date.now());
      const pct = totalMs > 0 ? Math.max(0, Math.min(1, remain / totalMs)) : 0;
      $('qTimerBar').style.transform = `scaleX(${pct})`;
      const secs = Math.ceil(remain / 1000);
      $('qTimerText').textContent = secs;
      qPeekTimer.textContent = secs;
      if (remain <= 3000) {
        $('qTimerText').classList.add('warn');
        qPeek.classList.add('warn');
      } else {
        $('qTimerText').classList.remove('warn');
        qPeek.classList.remove('warn');
      }
      // tick sound เมื่อวินาทีเปลี่ยน + เหลือ ≤ 5 วิ
      if (secs !== lastSecs) {
        if (lastSecs !== null && secs > 0 && secs <= 5) SFX.play('timerTick');
        lastSecs = secs;
      }
      if (remain <= 0) { stopTimer(); }
    };
    tick();
    qTimer = setInterval(tick, 100);
  }
  function stopTimer() {
    if (qTimer) { clearInterval(qTimer); qTimer = null; }
  }

  qChoices.forEach(btn => {
    btn.addEventListener('click', async () => {
      if (qLocked || btn.disabled) return;
      qLocked = true;
      qChoices.forEach(b => b.disabled = true);
      const idx = Number(btn.dataset.idx);
      try {
        await NET.emit(EVENTS.SUBMIT_ANSWER, { choiceIndex: idx });
        // ไม่ทำอะไรต่อ — รอ answerResult จาก server
      } catch (e) {
        qLocked = false;
        qChoices.forEach(b => b.disabled = false);
        toast(I18N.err(e.message), 'error');
      }
    });
  });

  /* =========================================================
     RESULT MODAL (แสดงสั้น ๆ)
     ========================================================= */
  const resultModal = $('modal-result');
  let resultTimer = null;

  function showResult(payload) {
    stopOpponentTimer();

    const isMyAnswer = payload.playerId === state.myId;
    if (resultTimer) clearTimeout(resultTimer);

    // ---- SFX ตามผลของ answerResult ----
    if (payload.timeout)      SFX.play('timeout');
    else if (payload.correct) SFX.play('correct');
    else                       SFX.play('wrong');
    // งู / บันได — เล่นหน่วง 400ms เพื่อไม่ให้ทับกับ correct/wrong
    if (payload.hit === 'snake')       setTimeout(() => SFX.play('snake'),  400);
    else if (payload.hit === 'ladder') setTimeout(() => SFX.play('ladder'), 400);

    // ถ้าเราเป็นคนตอบ + modal ยังเปิด → เผยเฉลย 900ms ก่อนโชว์ result
    if (isMyAnswer && qActive) {
      const answerIdx = payload.answerIndex;
      qChoices.forEach((btn, i) => {
        btn.disabled = true;
        if (i === answerIdx) btn.classList.add('correct');
        if (i === payload.choiceIndex && !payload.correct) btn.classList.add('wrong');
        if (i !== answerIdx && i !== payload.choiceIndex) btn.classList.add('reveal');
      });
      resultTimer = setTimeout(() => {
        closeQuestion();
        renderResultCard(payload);
        resultModal.hidden = false;
        resultTimer = setTimeout(() => { resultModal.hidden = true; }, 1800);
      }, 900);
    } else {
      // เราไม่ใช่คนตอบ (opponent) → โชว์ result ทันที ไม่มี modal ให้ reveal
      closeQuestion();
      renderResultCard(payload);
      resultModal.hidden = false;
      resultTimer = setTimeout(() => { resultModal.hidden = true; }, 1800);
    }
  }

  function renderResultCard(payload) {
    const card = $('resultCard');
    const icon = $('resultIcon');
    const title = $('resultTitle');
    const detail = $('resultDetail');

    const playerName = nameOf(payload.playerId);
    const isMe = payload.playerId === state.myId;

    card.className = 'modal-card result-card';

    if (payload.timeout) {
      card.classList.add('res-timeout');
      icon.textContent = '⏱️';
      title.textContent = I18N.t('res.timeout');
      detail.textContent = I18N.t('res.timeoutDetail', { name: isMe ? I18N.t('lobby.you') : playerName });
    } else if (payload.correct) {
      card.classList.add('res-correct');
      icon.textContent = '✓';
      title.textContent = I18N.t('res.correct');
      let dtl = I18N.t('res.correctDetail', { name: isMe ? I18N.t('lobby.you') : playerName, n: payload.value });
      if (payload.hit === 'ladder')     dtl += ' 🪜 ' + I18N.t('res.ladder');
      else if (payload.hit === 'snake') dtl += ' 🐍 ' + I18N.t('res.snake');
      if (payload.bounced)              dtl += ' ↩️ ' + I18N.t('res.bounced');
      detail.textContent = dtl;
    } else {
      card.classList.add('res-wrong');
      icon.textContent = '✗';
      title.textContent = I18N.t('res.wrong');
      let dtl = I18N.t('res.wrongDetail', { name: isMe ? I18N.t('lobby.you') : playerName, n: payload.value });
      if (payload.hit === 'ladder')     dtl += ' 🪜 ' + I18N.t('res.ladder');
      else if (payload.hit === 'snake') dtl += ' 🐍 ' + I18N.t('res.snake');
      detail.textContent = dtl;
    }
  }

  /* =========================================================
     GAME OVER MODAL
     ========================================================= */
  function showGameOver(payload) {
    closeQuestion();
    resultModal.hidden = true;
    const winnerId = payload.winnerId;
    $('winnerName').textContent = nameOf(winnerId);
    $('winnerName').style.color = colorOf(winnerId);
    $('winnerReason').textContent = payload.reason === 'last_standing'
      ? I18N.t('over.lastStanding')
      : I18N.t('over.reached');
    // ปุ่ม "เล่นอีกครั้ง" เฉพาะ host
    const isHost = state.room?.hostId === state.myId;
    $('btnPlayAgain').hidden = !isHost;
    $('modal-gameover').hidden = false;
  }

  $('btnPlayAgain').addEventListener('click', async () => {
    try {
      await NET.emit('restartGame', {});
      $('modal-gameover').hidden = true;
      // server จะ broadcast 'roomReset' ซึ่ง menu.js จัดการ transition ให้เอง
    } catch (e) {
      toast(I18N.err(e.message), 'error');
    }
  });

  $('btnBackMenu').addEventListener('click', () => {
    NET.emit(EVENTS.LEAVE_ROOM, {}).catch(() => {});
    state.room = null;
    $('modal-gameover').hidden = true;
    showScreen('menu');
  });

  $('btnLeaveGame').addEventListener('click', () => {
    if (!confirm(I18N.t('game.confirmLeave'))) return;
    NET.emit(EVENTS.LEAVE_ROOM, {}).catch(() => {});
    state.room = null;
    closeQuestion();
    resultModal.hidden = true;
    $('modal-gameover').hidden = true;
    showScreen('menu');
  });

  /* =========================================================
     ITEM MODAL
     ========================================================= */
  let itemState = { type: null, target: null, direction: null };
  const itemModal = $('modal-item');

  function openItemModal(type) {
    itemState = { type, target: null, direction: type === 'ticket' ? null : 'forward' };
    const meta = ITEM_META[type];
    $('itemBigIcon').textContent = meta.icon;
    $('itemTitle').textContent = I18N.t('item.' + type);
    $('itemSub').textContent   = I18N.t('item.' + type + 'Desc');

    // shield → ใช้ทันที ไม่ต้องเลือกเป้า
    if (!meta.needsTarget && !meta.needsDir) {
      itemModal.hidden = true;
      confirmUseItem();
      return;
    }

    // direction picker (ticket)
    $('itemDirections').hidden = !meta.needsDir;
    document.querySelectorAll('#itemDirections .dir-btn').forEach(b => b.classList.remove('active'));

    // target list
    $('itemTargetsLabel').hidden = !meta.needsTarget;
    renderTargets();

    $('btnItemConfirm').disabled = true;
    itemModal.hidden = false;
  }

  function renderTargets() {
    const wrap = $('itemTargets');
    wrap.innerHTML = '';
    const r = state.room;
    r.players.forEach((p, i) => {
      if (p.id === state.myId) return;
      const btn = document.createElement('button');
      btn.className = 'target-btn';
      btn.dataset.id = p.id;
      btn.style.setProperty('--pcolor', PCOLORS[i % PCOLORS.length]);
      const badges = [];
      if (p.shielded) badges.push('<span class="tgt-badge shield">🛡️</span>');
      if (p.skipTurns > 0) badges.push('<span class="tgt-badge trap">⛔</span>');
      btn.innerHTML = `
        <span class="tgt-avatar">${escapeHtml(initial(p.name))}</span>
        <span class="tgt-name">${escapeHtml(p.name)}</span>
        <span class="tgt-pos">@${p.position}</span>
        <span class="tgt-badges">${badges.join('')}</span>
      `;
      btn.addEventListener('click', () => {
        itemState.target = p.id;
        wrap.querySelectorAll('.target-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        maybeEnableConfirm();
      });
      wrap.appendChild(btn);
    });
  }

  document.querySelectorAll('#itemDirections .dir-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      itemState.direction = btn.dataset.dir;
      document.querySelectorAll('#itemDirections .dir-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      maybeEnableConfirm();
    });
  });

  function maybeEnableConfirm() {
    const meta = ITEM_META[itemState.type];
    let ok = true;
    if (meta.needsTarget && !itemState.target) ok = false;
    if (meta.needsDir    && !itemState.direction) ok = false;
    $('btnItemConfirm').disabled = !ok;
  }

  $('btnItemConfirm').addEventListener('click', confirmUseItem);

  async function confirmUseItem() {
    try {
      await NET.emit(EVENTS.USE_ITEM, {
        type:      itemState.type,
        targetId:  itemState.target,
        direction: itemState.direction,
      });
      itemModal.hidden = true;
    } catch (e) {
      toast(I18N.err(e.message), 'error');
    }
  }

  /* =========================================================
     SOCKET WIRING
     ========================================================= */
  NET.on(EVENTS.GAME_STARTED, (payload) => {
    try {
      if (payload?.snapshot) state.room = payload.snapshot;
      if (payload?.currentTurn && state.room) state.room.currentTurn = payload.currentTurn;
      closeQuestion();
      document.getElementById('modal-result').hidden = true;
      document.getElementById('modal-gameover').hidden = true;
      document.getElementById('modal-item').hidden = true;

      // แสดง screen ก่อนสร้าง board renderer เพื่อให้ container มีขนาดจริง
      showScreen('game');

      // (re)create board renderer หลัง screen visible
      if (board) board.destroy();
      if (state.room?.board) {
        board = new BoardRenderer($('boardCanvas'), state.room.board, state.room.mode);
      }
      renderGame();
      // safety: บังคับ resize หลาย ๆ ครั้ง เผื่อ layout ยังไม่ settle ที่ frame แรก
      requestAnimationFrame(() => board?._scheduleResize());
      setTimeout(() => board?._scheduleResize(), 60);
      setTimeout(() => board?._scheduleResize(), 200);
    } catch (err) {
      console.error('[gameStarted] error:', err);
      toast('เกิดข้อผิดพลาด: ' + err.message, 'error');
    }
  });

  NET.on(EVENTS.TURN_CHANGED, (payload) => {
    if (!state.room) return;
    state.room.currentTurn = payload.currentTurn;
    updateTurnBanner();
    // update progress list highlight
    renderGame();

    // ถ้าไม่ใช่ตาเรา → เริ่ม countdown ใน banner (opponent view)
    // ถ้าเป็นตาเรา → event 'question' จะตามมาและ start timer ใน modal เอง
    if (payload.currentTurn !== state.myId && payload.deadline) {
      startOpponentTimer(payload.deadline);
    } else {
      stopOpponentTimer();
      // เตือนว่าถึงตาเราแล้ว
      SFX.play('turn');
    }
  });

  NET.on(EVENTS.QUESTION, (payload) => {
    // event นี้ตอนนี้มาถึงเฉพาะ active player เท่านั้น
    stopOpponentTimer();
    openQuestion(payload);
  });

  NET.on(EVENTS.ANSWER_RESULT, (payload) => {
    showResult(payload);
  });

  NET.on(EVENTS.BOARD_UPDATE, (payload) => {
    if (!state.room || !payload?.players) return;
    // merge full player state (position + items + shielded + skipTurns)
    const map = new Map(payload.players.map(p => [p.id, p]));
    state.room.players.forEach(p => {
      const upd = map.get(p.id);
      if (upd) {
        p.position = upd.position;
        if (upd.items !== undefined)     p.items    = upd.items;
        if (upd.shielded !== undefined)  p.shielded = upd.shielded;
        if (upd.skipTurns !== undefined) p.skipTurns = upd.skipTurns;
      }
    });
    renderGame();
  });

  NET.on(EVENTS.ITEM_GRANTED, (payload) => {
    const name = nameOf(payload.playerId);
    const isMe = payload.playerId === state.myId;
    const label = I18N.t('item.' + payload.type);
    toast(
      isMe ? I18N.t('item.granted.me', { item: label })
           : I18N.t('item.granted.other', { name, item: label }),
      'success'
    );
    if (isMe) SFX.play('item');
  });

  NET.on('itemUsed', (payload) => {
    const who = nameOf(payload.userId);
    const tgt = payload.targetId ? nameOf(payload.targetId) : null;
    // SFX
    if (payload.blocked === 'shield') SFX.play('shield');
    else if (payload.type === 'shield') SFX.play('shield');
    else SFX.play('itemUse');
    let msg;
    if (payload.blocked === 'shield') {
      msg = I18N.t('item.blocked', { name: tgt || '—' });
    } else if (payload.type === 'shield') {
      msg = I18N.t('item.usedShield', { name: who });
    } else if (payload.type === 'trap') {
      msg = I18N.t('item.usedTrap', { name: who, target: tgt });
    } else if (payload.type === 'ticket') {
      const dir = payload.direction === 'backward'
        ? I18N.t('item.backward')
        : I18N.t('item.forward');
      msg = I18N.t('item.usedTicket', { name: who, target: tgt, dir });
    } else {
      msg = I18N.t('item.used', { name: who });
    }
    toast(msg, payload.blocked ? 'info' : 'success');
  });

  NET.on(EVENTS.GAME_OVER, (payload) => {
    if (payload?.snapshot) state.room = payload.snapshot;
    // SFX — ชนะ = win / ไม่ใช่ผู้ชนะ = lose
    if (payload.winnerId === state.myId) SFX.play('win');
    else SFX.play('lose');
    showGameOver(payload);
  });

  NET.on('turnSkipped', (payload) => {
    const name = nameOf(payload.playerId);
    toast(I18N.t('game.skipped', { name }), 'info');
  });

  // ถ้า playerLeft เกิดตอนอยู่ในเกม → re-render
  NET.on(EVENTS.PLAYER_LEFT, () => {
    if (state.room && state.room.phase === 'PLAYING') renderGame();
  });

})();

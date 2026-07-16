/* =========================================
   Math Snake — server entry
   Express + Socket.IO
   ========================================= */

import express from 'express';
import { createServer } from 'node:http';
import { Server as IOServer } from 'socket.io';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { RoomManager } from './game/RoomManager.js';
import { GameLoop }    from './game/GameLoop.js';
import { count as questionCount } from './game/questions.js';
import { EVENTS, NAME_MAX, PHASE, MIN_PLAYERS } from '../shared/constants.js';

const __dirname   = path.dirname(fileURLToPath(import.meta.url));
const CLIENT_DIR  = path.resolve(__dirname, '..', 'client');
const PORT        = Number(process.env.PORT) || 3000;

const app        = express();
const httpServer = createServer(app);
const io         = new IOServer(httpServer, {
  cors: { origin: '*' },        // TODO: จำกัด origin ตอน prod จริง
  pingInterval: 20000,
  pingTimeout:  25000,
});

// ---------- HTTP ----------
app.get('/health', (_req, res) => res.status(200).send('ok'));

// เสิร์ฟ client เป็น static (ไม่ต้อง build step)
app.use(express.static(CLIENT_DIR, {
  extensions: ['html'],
  maxAge: '1h',
}));

// ---------- Rooms ----------
const rooms = new RoomManager();

function sanitizeName(raw) {
  const s = String(raw ?? '').trim().slice(0, NAME_MAX);
  if (!s) throw new Error('name_required');
  return s;
}

function sanitizeCode(raw) {
  return String(raw ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8);
}

function broadcastRoom(room, event, payload) {
  io.to(room.code).emit(event, payload);
}

// ---------- Socket events ----------
io.on('connection', (socket) => {
  console.log(`[+] ${socket.id} connected  (rooms: ${rooms.stats().rooms})`);

  // ---- createRoom ----
  socket.on(EVENTS.CREATE_ROOM, (payload, ack) => {
    try {
      const name = sanitizeName(payload?.name);
      const room = rooms.create(socket.id, name);
      socket.join(room.code);

      // ack: ตอบกลับผู้เรียก
      ack?.({ ok: true, snapshot: room.publicSnapshot() });
      // event เพิ่มเติมตามสเปก
      socket.emit(EVENTS.ROOM_CREATED, { code: room.code });
      console.log(`[room] created ${room.code} by ${name}`);
    } catch (e) {
      ack?.({ ok: false, error: e.message });
    }
  });

  // ---- joinRoom ----
  socket.on(EVENTS.JOIN_ROOM, (payload, ack) => {
    try {
      const name = sanitizeName(payload?.name);
      const code = sanitizeCode(payload?.code);
      if (!code) throw new Error('code_required');

      const room = rooms.join(code, socket.id, name);
      socket.join(room.code);

      ack?.({ ok: true, snapshot: room.publicSnapshot() });
      broadcastRoom(room, EVENTS.PLAYER_JOINED, {
        players: room.publicSnapshot().players,
      });
      console.log(`[room] ${name} joined ${room.code}`);
    } catch (e) {
      ack?.({ ok: false, error: e.message });
    }
  });

  // ---- setMode (host เลือกโหมดใน lobby) ----
  // ไม่อยู่ในสเปก §7 แต่จำเป็นก่อน startGame ให้ทุกคนเห็นตรงกัน
  socket.on('setMode', (payload, ack) => {
    try {
      const mode = Number(payload?.mode);
      const room = rooms.setMode(socket.id, mode);
      broadcastRoom(room, 'modeChanged', { mode: room.mode });
      ack?.({ ok: true, mode: room.mode });
    } catch (e) {
      ack?.({ ok: false, error: e.message });
    }
  });

  // ---- startGame ----
  socket.on(EVENTS.START_GAME, (_payload, ack) => {
    const room = rooms.forSocket(socket.id);
    if (!room)                                return ack?.({ ok: false, error: 'not_in_room' });
    if (room.hostId !== socket.id)            return ack?.({ ok: false, error: 'host_only' });
    if (room.players.length < MIN_PLAYERS)    return ack?.({ ok: false, error: 'need_more_players' });
    if (room.phase !== PHASE.LOBBY)           return ack?.({ ok: false, error: 'already_started' });
    if (questionCount() === 0)                return ack?.({ ok: false, error: 'no_questions' });

    room.game = new GameLoop(room, io);
    room.game.start();   // จะ emit 'gameStarted' + เริ่มเทิร์นแรกให้เอง

    ack?.({ ok: true });
    console.log(`[room] ${room.code} started · mode=${room.mode} · ${room.players.length} players`);
  });

  // ---- submitAnswer ----
  socket.on(EVENTS.SUBMIT_ANSWER, (payload, ack) => {
    try {
      const room = rooms.forSocket(socket.id);
      if (!room)      throw new Error('not_in_room');
      if (!room.game) throw new Error('game_not_started');
      room.game.submitAnswer(socket.id, payload?.choiceIndex);
      ack?.({ ok: true });
    } catch (e) {
      ack?.({ ok: false, error: e.message });
    }
  });

  // ---- useItem ----
  socket.on(EVENTS.USE_ITEM, (payload, ack) => {
    try {
      const room = rooms.forSocket(socket.id);
      if (!room)      throw new Error('not_in_room');
      if (!room.game) throw new Error('game_not_started');
      room.game.useItem(socket.id, payload || {});
      ack?.({ ok: true });
    } catch (e) {
      ack?.({ ok: false, error: e.message });
    }
  });

  // ---- restartGame (host only, หลังจบเกม → กลับ LOBBY) ----
  socket.on('restartGame', (_payload, ack) => {
    const room = rooms.forSocket(socket.id);
    if (!room)                       return ack?.({ ok: false, error: 'not_in_room' });
    if (room.hostId !== socket.id)   return ack?.({ ok: false, error: 'host_only' });
    if (room.phase !== PHASE.GAME_OVER) return ack?.({ ok: false, error: 'not_finished' });

    room.resetToLobby();
    ack?.({ ok: true });
    broadcastRoom(room, 'roomReset', { snapshot: room.publicSnapshot() });
    console.log(`[room] ${room.code} reset to lobby`);
  });

  // ---- leaveRoom ----
  socket.on(EVENTS.LEAVE_ROOM, () => handleLeave(socket, 'leave'));

  // ---- disconnect ----
  socket.on('disconnect', (reason) => {
    console.log(`[-] ${socket.id} disconnected  (${reason})`);
    handleLeave(socket, 'disconnect');
  });
});

function handleLeave(socket, source) {
  const room = rooms.forSocket(socket.id);
  if (!room) return;

  // แจ้ง GameLoop ก่อน remove เพื่อให้จัดการเทิร์นถูกต้อง
  const wasPlaying = (room.phase === PHASE.PLAYING) && !!room.game;
  const leftId = socket.id;

  const res = rooms.removeSocket(socket.id);
  if (!res) return;
  if (source === 'leave') socket.leave(res.room.code);

  if (!res.destroyed) {
    broadcastRoom(res.room, EVENTS.PLAYER_LEFT, {
      players: res.room.publicSnapshot().players,
      hostId:  res.room.hostId,
    });
    if (wasPlaying && res.room.game) {
      res.room.game.onPlayerLeft(leftId);
    }
  } else if (wasPlaying) {
    // ห้องถูกทำลาย → หยุด game loop
    room.game?.stop();
  }
}

// ---------- Start ----------
httpServer.listen(PORT, () => {
  console.log(`\n  🐍  Math Snake  ·  http://localhost:${PORT}\n`);
});

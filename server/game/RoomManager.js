/* =========================================
   Room / RoomManager
   จัดการห้อง state ทั้งหมด (in-memory)
   ========================================= */

import {
  MAX_PLAYERS, CODE_LENGTH, PHASE, BOARD_MODES, DEFAULT_MODE,
  QUESTION_TOPICS, DEFAULT_QUESTION_TOPIC,
} from '../../shared/constants.js';
import { getBoard } from './boards.js';

// ตัวอักษรที่อ่านง่าย (ตัด I, O, 0, 1)
const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function randomCode(len = CODE_LENGTH) {
  let s = '';
  for (let i = 0; i < len; i++) {
    s += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
  }
  return s;
}

class Room {
  constructor(code, hostId) {
    this.code    = code;
    this.hostId  = hostId;
    this.phase          = PHASE.LOBBY;
    this.mode           = DEFAULT_MODE;
    this.questionTopic  = DEFAULT_QUESTION_TOPIC;
    this.players = []; // { id, name, position, items, skipTurns, shielded, connected }
    this.winnerId = null;
    this.game    = null;              // GameLoop instance ตอน phase=PLAYING
    this.createdAt = Date.now();
  }

  add(id, name) {
    if (this.phase !== PHASE.LOBBY)      throw new Error('game_in_progress');
    if (this.players.length >= MAX_PLAYERS) throw new Error('room_full');
    if (this.players.some(p => p.id === id)) return; // already in
    this.players.push({
      id, name,
      position: 0, items: [],
      skipTurns: 0, shielded: false,
      connected: true,
    });
  }

  remove(id) {
    const before = this.players.length;
    this.players = this.players.filter(p => p.id !== id);
    if (this.players.length === before) return false;
    // ย้าย host ให้คนถัดไปถ้าจำเป็น
    if (this.hostId === id && this.players.length > 0) {
      this.hostId = this.players[0].id;
    }
    return true;
  }

  setMode(mode) {
    if (!BOARD_MODES.includes(mode)) throw new Error('invalid_mode');
    this.mode = mode;
  }

  setQuestionTopic(topic) {
    if (!QUESTION_TOPICS.includes(topic)) throw new Error('invalid_topic');
    this.questionTopic = topic;
  }

  publicSnapshot() {
    return {
      code:          this.code,
      phase:         this.phase,
      mode:          this.mode,
      questionTopic: this.questionTopic,
      hostId:        this.hostId,
      winnerId: this.winnerId,
      currentTurn: this.game?.currentTurnId ?? null,
      board:    getBoard(this.mode),
      players:  this.players.map(p => ({
        id: p.id, name: p.name, position: p.position,
        items:    p.items || [],
        shielded: !!p.shielded,
        skipTurns: p.skipTurns || 0,
        isHost:   p.id === this.hostId,
        connected: p.connected,
      })),
    };
  }

  /** รีเซ็ตห้องกลับสู่ LOBBY (สำหรับปุ่ม "เล่นใหม่" หลังจบเกม) */
  resetToLobby() {
    if (this.game) { this.game.stop(); this.game = null; }
    this.phase    = PHASE.LOBBY;
    this.winnerId = null;
    for (const p of this.players) {
      p.position  = 0;
      p.items     = [];
      p.skipTurns = 0;
      p.shielded  = false;
    }
  }
}

export class RoomManager {
  constructor() {
    this.rooms       = new Map(); // code    -> Room
    this.socketRoom  = new Map(); // socket  -> code
  }

  create(hostId, name) {
    let code;
    let tries = 0;
    do {
      code = randomCode();
      if (++tries > 100) throw new Error('cannot_generate_code');
    } while (this.rooms.has(code));

    const room = new Room(code, hostId);
    room.add(hostId, name);
    this.rooms.set(code, room);
    this.socketRoom.set(hostId, code);
    return room;
  }

  join(code, socketId, name) {
    const room = this.rooms.get(code);
    if (!room) throw new Error('room_not_found');
    room.add(socketId, name);
    this.socketRoom.set(socketId, code);
    return room;
  }

  rejoin(code, oldId, newId, name) {
    const room = this.rooms.get(code);
    if (!room) throw new Error('room_not_found');

    const player = room.players.find(p => p.id === oldId || p.name === name);
    if (!player) throw new Error('not_in_room');

    const previousId = player.id;
    player.id = newId;
    player.connected = true;

    if (room.hostId === previousId) {
      room.hostId = newId;
    }

    this.socketRoom.delete(previousId);
    this.socketRoom.set(newId, code);

    if (room.game) {
      if (room.game.currentTurnId === previousId) {
        room.game.currentTurnId = newId;
      }
    }

    return room;
  }

  forSocket(socketId) {
    const code = this.socketRoom.get(socketId);
    return code ? this.rooms.get(code) : null;
  }

  removeSocket(socketId) {
    const room = this.forSocket(socketId);
    if (!room) return null;
    room.remove(socketId);
    this.socketRoom.delete(socketId);
    if (room.players.length === 0) {
      this.rooms.delete(room.code);
      return { room, destroyed: true };
    }
    return { room, destroyed: false };
  }

  setMode(socketId, mode) {
    const room = this.forSocket(socketId);
    if (!room) throw new Error('not_in_room');
    if (room.hostId !== socketId) throw new Error('host_only');
    room.setMode(mode);
    return room;
  }

  setQuestionTopic(socketId, topic) {
    const room = this.forSocket(socketId);
    if (!room) throw new Error('not_in_room');
    if (room.hostId !== socketId) throw new Error('host_only');
    room.setQuestionTopic(topic);
    return room;
  }

  stats() {
    return { rooms: this.rooms.size, connections: this.socketRoom.size };
  }
}

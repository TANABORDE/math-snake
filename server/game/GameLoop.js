/* =========================================
   GameLoop — state machine ต่อ 1 ห้องขณะเล่น
   จัดการ: เทิร์น · สุ่มโจทย์ · จับเวลา 20 วิ · เดิน · งู/บันได · ชนะ
   ========================================= */

import { PHASE, ITEM_TYPES, MAX_ITEMS, TICKET_STEPS } from '../../shared/constants.js';
import { getBoard } from './boards.js';
import { pickRandom, publicView, isCorrect } from './questions.js';

// ---- config ----
export const TURN_TIME_MS      = 60_000;   // เวลาให้ตอบ (1 นาที)
const TURN_GRACE_MS            = 1_000;    // เผื่อ latency
const RESULT_HOLD_MS           = 2_500;    // ค้าง result ให้ client อนิเมชัน
const SKIP_HOLD_MS             = 1_500;    // ค้างข้อความ "ถูก skip"
const RECENT_HISTORY           = 20;       // กันโจทย์ซ้ำในหน้าต่างนี้

export class GameLoop {
  constructor(room, io) {
    this.room = room;
    this.io   = io;

    this.currentTurnId   = null;
    this.currentQuestion = null;
    this.deadline        = 0;
    this.turnTimer       = null;
    this.pendingTimer    = null;
    this.usedIds         = [];
    this.stopped         = false;
  }

  /* -------------------------------------------------
   * lifecycle
   * ------------------------------------------------- */
  start() {
    this.room.phase = PHASE.PLAYING;
    for (const p of this.room.players) {
      p.position  = 0;
      p.skipTurns = 0;
      p.shielded  = false;
      p.items     = [];
    }
    this.currentTurnId = this.room.players[0]?.id ?? null;
    this._broadcast('gameStarted', {
      snapshot: this.room.publicSnapshot(),
      currentTurn: this.currentTurnId,
    });
    // เริ่มเทิร์นแรก (delay สั้น ๆ ให้ client render game screen ก่อน)
    this._schedule(() => this._beginTurn(), 800);
  }

  stop() {
    this.stopped = true;
    this._clearTimers();
    this.currentQuestion = null;
  }

  /* -------------------------------------------------
   * external hooks
   * ------------------------------------------------- */

  /** เรียกเมื่อผู้เล่นออก/หลุด ระหว่างเกม */
  onPlayerLeft(id) {
    if (this.stopped) return;
    if (this.room.phase !== PHASE.PLAYING) return;

    // เหลือ ≤ 1 คน → จบเกมทันที
    if (this.room.players.length < 2) {
      if (this.room.players.length === 1) {
        this._declareWinner(this.room.players[0].id, 'last_standing');
      } else {
        this.stop();
      }
      return;
    }

    // ถ้าคนที่ออกเป็นเจ้าของเทิร์นตอนนี้ → ข้ามไปคนถัดไป
    if (id === this.currentTurnId) {
      this._clearTimers();
      this.currentQuestion = null;
      this._schedule(() => this._advanceTurn(), 300);
    }
  }

  submitAnswer(socketId, choiceIndex) {
    if (this.stopped) throw new Error('game_stopped');
    if (socketId !== this.currentTurnId) throw new Error('not_your_turn');
    if (!this.currentQuestion)           throw new Error('no_active_question');

    const idx = Number(choiceIndex);
    if (![0, 1, 2].includes(idx)) throw new Error('invalid_choice');

    this._clearTimers();

    const p = this._currentPlayer();
    const q = this.currentQuestion;
    const correct = isCorrect(q, idx);
    const value   = q.choices[idx];
    const delta   = correct ? +value : -value;

    this._resolveMove(p, delta, {
      correct,
      choiceIndex: idx,
      value,
      answerIndex: q.answerIndex,
      timeout: false,
    });
  }

  /* -------------------------------------------------
   * turn flow (private)
   * ------------------------------------------------- */

  _currentPlayer() {
    return this.room.players.find(p => p.id === this.currentTurnId);
  }

  _beginTurn() {
    if (this.stopped) return;
    if (this.room.phase !== PHASE.PLAYING) return;
    if (this.room.players.length < 2) {
      if (this.room.players.length === 1) {
        this._declareWinner(this.room.players[0].id, 'last_standing');
      } else {
        this.stop();
      }
      return;
    }

    let p = this._currentPlayer();
    if (!p) {
      // เจ้าของเทิร์นหายไป (เพิ่งหลุด) → หยิบคนแรก
      p = this.room.players[0];
      this.currentTurnId = p.id;
    }

    // โดน trap? → ข้ามเทิร์น
    if (p.skipTurns > 0) {
      p.skipTurns--;
      this._broadcast('turnSkipped', { playerId: p.id, reason: 'trap' });
      this._schedule(() => this._advanceTurn(), SKIP_HOLD_MS);
      return;
    }

    // สุ่มโจทย์
    this.currentQuestion = pickRandom(this.usedIds, this.room.questionTopic);
    if (!this.currentQuestion) {
      console.error('[game] no questions available');
      this.stop();
      return;
    }
    this.usedIds.push(this.currentQuestion.id);
    if (this.usedIds.length > RECENT_HISTORY) this.usedIds.shift();

    this.deadline = Date.now() + TURN_TIME_MS;

    // turnChanged → ทุกคน (ให้ opponents รู้ว่าใครกำลังตอบ + deadline สำหรับ countdown)
    this._broadcast('turnChanged', {
      currentTurn: this.currentTurnId,
      deadline:    this.deadline,
      turnTimeMs:  TURN_TIME_MS,
    });
    // question → เฉพาะ active player เท่านั้น (privacy · ป้องกันคนอื่นเห็นโจทย์)
    this.io.to(this.currentTurnId).emit('question', {
      ...publicView(this.currentQuestion),
      currentTurn: this.currentTurnId,
      deadline:    this.deadline,
      turnTimeMs:  TURN_TIME_MS,
    });

    this.turnTimer = setTimeout(() => this._onTimeout(), TURN_TIME_MS + TURN_GRACE_MS);
  }

  _onTimeout() {
    if (this.stopped) return;
    const p = this._currentPlayer();
    const q = this.currentQuestion;
    if (!p || !q) return;

    this._broadcast('answerResult', {
      playerId:    p.id,
      correct:     false,
      timeout:     true,
      choiceIndex: null,
      value:       0,
      answerIndex: q.answerIndex,
      from:        p.position,
      landed:      p.position,
      to:          p.position,
      bounced:     false,
      hit:         null,
    });
    this.currentQuestion = null;
    this._schedule(() => this._advanceTurn(), RESULT_HOLD_MS);
  }

  _resolveMove(player, delta, resultMeta) {
    const board = getBoard(this.room.mode);
    const from  = player.position;
    let shielded = false;

    // Case A: ผลลบ + มีโล่ → กันการเดินถอยทั้งหมด
    if (delta < 0 && player.shielded) {
      player.shielded = false;
      shielded = true;
      delta = 0;
    }

    let target = from + delta;
    if (target < 0) target = 0;

    let bounced = false;
    if (target > board.size) {
      target = board.size - (target - board.size);
      bounced = true;
    }
    const landed = target;

    let finalTo = landed;
    let hit     = null;
    if (board.ladders[landed]) {
      finalTo = board.ladders[landed];
      hit = 'ladder';
    } else if (board.snakes[landed]) {
      // Case B: ลงหัวงู + มีโล่ (ยังไม่ถูกใช้) → กันการเลื่อนลง
      if (player.shielded) {
        player.shielded = false;
        shielded = true;
        // ไม่เลื่อนลง — อยู่ที่ landed
      } else {
        finalTo = board.snakes[landed];
        hit = 'snake';
      }
    }

    player.position = finalTo;

    // grant item ถ้าลงช่องพิเศษ
    const itemGranted = this._maybeGrantItem(player);

    this._broadcast('answerResult', {
      ...resultMeta,
      playerId: player.id,
      from,
      landed,
      to:       finalTo,
      bounced,
      hit,
      shielded,
    });

    if (itemGranted) {
      this._broadcast('itemGranted', { playerId: player.id, type: itemGranted });
    }

    this._broadcast('boardUpdate', this._boardUpdatePayload());
    this.currentQuestion = null;

    if (player.position >= board.size) {
      this._schedule(() => this._declareWinner(player.id, 'reached_goal'), RESULT_HOLD_MS);
      return;
    }
    this._schedule(() => this._advanceTurn(), RESULT_HOLD_MS);
  }

  /* -------------------------------------------------
   * items
   * ------------------------------------------------- */

  _maybeGrantItem(player) {
    const board = getBoard(this.room.mode);
    if (!board.special.includes(player.position)) return null;
    if (player.items.length >= MAX_ITEMS) return null;
    const type = ITEM_TYPES[Math.floor(Math.random() * ITEM_TYPES.length)];
    player.items.push(type);
    return type;
  }

  useItem(socketId, payload) {
    if (this.stopped) throw new Error('game_stopped');
    if (socketId !== this.currentTurnId) throw new Error('not_your_turn');

    const p = this._currentPlayer();
    const type = String(payload?.type || '');
    if (!ITEM_TYPES.includes(type)) throw new Error('invalid_item');

    const itemIdx = p.items.indexOf(type);
    if (itemIdx === -1) throw new Error('no_item');

    // remove item from inventory
    p.items.splice(itemIdx, 1);

    if (type === 'shield') {
      p.shielded = true;
      this._broadcast('itemUsed', { userId: p.id, type, targetId: null });
      this._broadcast('boardUpdate', this._boardUpdatePayload());
      return;
    }

    // ต้องมี target ที่ไม่ใช่ตัวเอง
    const target = this.room.players.find(x => x.id === payload?.targetId);
    if (!target || target.id === p.id) throw new Error('invalid_target');

    if (type === 'trap') {
      if (target.shielded) {
        target.shielded = false;
        this._broadcast('itemUsed', {
          userId: p.id, type, targetId: target.id, blocked: 'shield',
        });
      } else {
        target.skipTurns += 1;
        this._broadcast('itemUsed', {
          userId: p.id, type, targetId: target.id, skipTurns: target.skipTurns,
        });
      }
      this._broadcast('boardUpdate', this._boardUpdatePayload());
      return;
    }

    if (type === 'ticket') {
      const dir = payload?.direction === 'backward' ? -1 : 1;
      const delta = dir * TICKET_STEPS;

      if (dir < 0 && target.shielded) {
        target.shielded = false;
        this._broadcast('itemUsed', {
          userId: p.id, type, targetId: target.id, direction: 'backward', blocked: 'shield',
        });
        this._broadcast('boardUpdate', this._boardUpdatePayload());
        return;
      }

      const board = getBoard(this.room.mode);
      const from = target.position;
      let tgt = from + delta;
      if (tgt < 0) tgt = 0;
      let bounced = false;
      if (tgt > board.size) { tgt = board.size - (tgt - board.size); bounced = true; }
      const landed = tgt;

      let finalTo = landed;
      let hit = null;
      if (board.ladders[landed])      { finalTo = board.ladders[landed]; hit = 'ladder'; }
      else if (board.snakes[landed])  { finalTo = board.snakes[landed];  hit = 'snake';  }
      target.position = finalTo;

      this._broadcast('itemUsed', {
        userId: p.id, type, targetId: target.id,
        direction: payload?.direction || 'forward',
        from, landed, to: finalTo, bounced, hit,
      });
      this._broadcast('boardUpdate', this._boardUpdatePayload());

      // ticket ทำให้เป้าถึงเส้นชัย → เป้าชนะ (แม้ไม่ใช่เทิร์นเขา)
      if (target.position >= board.size) {
        this._schedule(() => this._declareWinner(target.id, 'reached_goal_by_ticket'), 1200);
      }
      return;
    }
  }

  _boardUpdatePayload() {
    return {
      players: this.room.players.map(p => ({
        id: p.id, position: p.position,
        items: [...p.items],
        shielded: !!p.shielded,
        skipTurns: p.skipTurns || 0,
      })),
    };
  }

  _advanceTurn() {
    if (this.stopped) return;
    if (this.room.phase !== PHASE.PLAYING) return;

    const players = this.room.players;
    if (players.length < 2) {
      if (players.length === 1) this._declareWinner(players[0].id, 'last_standing');
      else this.stop();
      return;
    }

    const curIdx  = players.findIndex(p => p.id === this.currentTurnId);
    const nextIdx = curIdx === -1 ? 0 : (curIdx + 1) % players.length;
    this.currentTurnId = players[nextIdx].id;
    this._beginTurn();
  }

  _declareWinner(playerId, reason) {
    if (this.stopped) return;
    this.room.phase    = PHASE.GAME_OVER;
    this.room.winnerId = playerId;
    this._clearTimers();
    this._broadcast('gameOver', {
      winnerId: playerId,
      reason,
      snapshot: this.room.publicSnapshot(),
    });
    this.stop();
  }

  /* -------------------------------------------------
   * utils
   * ------------------------------------------------- */
  _broadcast(event, payload) {
    this.io.to(this.room.code).emit(event, payload);
  }

  _schedule(fn, ms) {
    this._clearPending();
    this.pendingTimer = setTimeout(() => {
      this.pendingTimer = null;
      fn();
    }, ms);
  }

  _clearPending() {
    if (this.pendingTimer) { clearTimeout(this.pendingTimer); this.pendingTimer = null; }
  }

  _clearTimers() {
    if (this.turnTimer)    { clearTimeout(this.turnTimer);    this.turnTimer = null; }
    this._clearPending();
  }
}

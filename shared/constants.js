/* =========================================
   Shared constants — ใช้ทั้ง client + server
   ========================================= */

export const EVENTS = {
  // Client -> Server
  CREATE_ROOM:  'createRoom',
  JOIN_ROOM:    'joinRoom',
  START_GAME:   'startGame',
  SUBMIT_ANSWER:'submitAnswer',
  USE_ITEM:     'useItem',
  LEAVE_ROOM:   'leaveRoom',

  // Server -> Client
  ROOM_CREATED: 'roomCreated',
  PLAYER_JOINED:'playerJoined',
  PLAYER_LEFT:  'playerLeft',
  GAME_STARTED: 'gameStarted',
  TURN_CHANGED: 'turnChanged',
  QUESTION:     'question',
  ANSWER_RESULT:'answerResult',
  BOARD_UPDATE: 'boardUpdate',
  ITEM_GRANTED: 'itemGranted',
  GAME_OVER:    'gameOver',
  ERROR:        'error',
};

export const PHASE = {
  LOBBY:     'LOBBY',
  PLAYING:   'PLAYING',
  GAME_OVER: 'GAME_OVER',
};

export const MAX_PLAYERS = 4;
export const MIN_PLAYERS = 2;
export const CODE_LENGTH = 4;
export const NAME_MAX    = 16;

export const BOARD_MODES = [50, 100];
export const DEFAULT_MODE = 50;

export const QUESTION_TOPICS = ['limit_function', 'limit_sequence', 'all'];
export const DEFAULT_QUESTION_TOPIC = 'all';

export const ITEM_TYPES = ['shield', 'ticket', 'trap'];
export const MAX_ITEMS = 3;
export const TICKET_STEPS = 3;   // เดินไปด้านที่เลือก 3 ช่อง

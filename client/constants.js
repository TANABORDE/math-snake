/* =========================================
   Client-side mirror ของ shared/constants.js
   (client ไม่มี build step จริง จึง copy ค่ามาแทน import)
   ========================================= */

const EVENTS = {
  CREATE_ROOM:  'createRoom',
  JOIN_ROOM:    'joinRoom',
  START_GAME:   'startGame',
  SUBMIT_ANSWER:'submitAnswer',
  USE_ITEM:     'useItem',
  LEAVE_ROOM:   'leaveRoom',

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

const MAX_PLAYERS = 4;
const MIN_PLAYERS = 2;

const PHASE = {
  LOBBY:     'LOBBY',
  PLAYING:   'PLAYING',
  GAME_OVER: 'GAME_OVER',
};

/* =========================================
   นิยามกระดาน: BOARD_50 (โหมดสั้น) / BOARD_100 (โหมดเต็ม)
   - ladders: { from: to }    ปลายล่าง → ปลายบน (ปีนขึ้น)
   - snakes:  { head: tail }  หัวงู → หางงู       (ตกลง)
   - special: [ ...tileIds ]  ช่องที่ได้ไอเทม (ยังไม่ implement item ใน iteration นี้)
   ========================================= */

export const BOARD_50 = {
  size: 50,
  ladders: {
    3:  22,
    8:  26,
    15: 34,
    20: 41,
    27: 45,
  },
  snakes: {
    17: 4,
    30: 12,
    43: 25,
    49: 33,
  },
  special: [6, 14, 23, 31, 38, 47],
};

export const BOARD_100 = {
  size: 100,
  ladders: {
    4:  14,
    9:  31,
    20: 38,
    28: 84,
    40: 59,
    51: 67,
    63: 81,
    71: 91,
  },
  snakes: {
    17: 7,
    54: 34,
    62: 19,
    64: 60,
    87: 24,
    93: 73,
    95: 75,
    98: 79,
  },
  special: [10, 25, 42, 55, 68, 77, 89],
};

export function getBoard(mode) {
  const m = Number(mode);
  if (m === 100) return BOARD_100;
  return BOARD_50;
}

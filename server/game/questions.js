/* =========================================
   Question bank loader
   - โหลด questions.json ครั้งเดียวตอน boot
   - pickRandom(excludeIds) เพื่อไม่ให้ซ้ำเร็วเกิน
   - publicView() ตัด answerIndex ออก (ห้ามส่งไป client)
   ========================================= */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const QUESTIONS_PATH = path.resolve(__dirname, '..', 'data', 'questions.json');

let ALL = [];
try {
  const raw = fs.readFileSync(QUESTIONS_PATH, 'utf8');
  ALL = JSON.parse(raw);
  // sanity check ทุกข้อ
  for (const q of ALL) {
    if (!Array.isArray(q.choices) || q.choices.length !== 3)
      throw new Error(`bad choices in ${q.id}`);
    if (!(q.answerIndex >= 0 && q.answerIndex <= 2))
      throw new Error(`bad answerIndex in ${q.id}`);
  }
  console.log(`[questions] loaded ${ALL.length} questions`);
} catch (e) {
  console.error('[questions] failed to load:', e.message);
  ALL = [];
}

export function pickRandom(excludeIds = [], topic = 'all') {
  if (ALL.length === 0) return null;
  // กรองตาม topic (ถ้าไม่ใช่ 'all')
  let base = ALL;
  if (topic && topic !== 'all') {
    base = ALL.filter(q => q.topic === topic);
    if (base.length === 0) base = ALL; // fallback ถ้าไม่มีข้อในหัวข้อนั้น
  }
  const pool = base.filter(q => !excludeIds.includes(q.id));
  const list = pool.length > 0 ? pool : base;
  return list[Math.floor(Math.random() * list.length)];
}

export function count() { return ALL.length; }

/** ตัด answerIndex ออกก่อนส่งให้ client */
export function publicView(q) {
  return {
    id:      q.id,
    image:   q.image || null,
    text:    q.text  || null,
    choices: q.choices,
  };
}

/** ตรวจคำตอบ (server-side เท่านั้น) */
export function isCorrect(q, choiceIndex) {
  return q.answerIndex === Number(choiceIndex);
}

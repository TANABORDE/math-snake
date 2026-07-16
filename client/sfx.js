/* =========================================
   SFX — เสียง synthesize ด้วย Web Audio API
   ไม่ต้องใช้ audio file · เล็ก · เล่นได้ทันทีหลังผู้ใช้กด (browser autoplay policy)
   ========================================= */

const SFX = {
  ctx: null,
  muted: false,
  masterGain: 0.35,

  init() {
    this.muted = localStorage.getItem('mathsnake.muted') === '1';
  },

  /** สร้าง AudioContext แบบ lazy (ต้อง gesture ผู้ใช้ก่อน browser ถึงยอมเล่น) */
  _ensureCtx() {
    if (!this.ctx) {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return null;
      try { this.ctx = new Ctx(); } catch { return null; }
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  },

  toggle() {
    this.muted = !this.muted;
    localStorage.setItem('mathsnake.muted', this.muted ? '1' : '0');
    return this.muted;
  },

  isMuted() { return this.muted; },

  play(name) {
    if (this.muted) return;
    const ctx = this._ensureCtx();
    if (!ctx) return;
    const t = ctx.currentTime;

    switch (name) {
      case 'click':
        this._tone(ctx, t, 'sine', 900, 0.05, 0.08);
        break;
      case 'correct':
        // C E G (major chord arpeggio)
        this._arp(ctx, t, [523.25, 659.25, 783.99], 0.08, 0.15, 'sine');
        break;
      case 'wrong':
        // buzz แหลม ลงต่ำ
        this._sweep(ctx, t, 'sawtooth', 320, 130, 0.32, 0.15);
        break;
      case 'timeout':
        // เสียงเตือนหมดเวลา — 2 โน้ตต่ำ
        this._tone(ctx, t,        'square', 220, 0.18, 0.13);
        this._tone(ctx, t + 0.22, 'square', 180, 0.22, 0.13);
        break;
      case 'snake':
        // เสียงเลื่อนลง (งูดูด)
        this._sweep(ctx, t, 'sine', 700, 180, 0.7, 0.18);
        break;
      case 'ladder':
        // เสียงปีนขึ้น (arpeggio ขึ้น)
        this._arp(ctx, t, [392, 494, 587, 784], 0.09, 0.14, 'triangle');
        break;
      case 'timerTick':
        this._tone(ctx, t, 'square', 1400, 0.04, 0.09);
        break;
      case 'turn':
        // เสียงเทิร์นตัวเอง — bell soft
        this._tone(ctx, t,        'triangle', 660, 0.12, 0.12);
        this._tone(ctx, t + 0.06, 'triangle', 880, 0.15, 0.10);
        break;
      case 'item':
        // ได้ไอเทม — coin-like
        this._tone(ctx, t,        'square', 988,  0.06, 0.12);
        this._tone(ctx, t + 0.07, 'square', 1319, 0.12, 0.12);
        break;
      case 'itemUse':
        // ใช้ไอเทม — whoosh
        this._sweep(ctx, t, 'sine', 300, 900, 0.18, 0.10);
        break;
      case 'shield':
        // โล่กัน — metallic ring
        this._tone(ctx, t,        'sine', 1200, 0.08, 0.13);
        this._tone(ctx, t + 0.04, 'sine', 1500, 0.10, 0.10);
        break;
      case 'win':
        // ชนะ — victory fanfare
        this._arp(ctx, t, [523.25, 659.25, 783.99, 1046.5], 0.13, 0.25, 'triangle');
        break;
      case 'lose':
        // เกมโอเวอร์ (ไม่ใช่คนชนะ)
        this._sweep(ctx, t, 'sine', 400, 130, 0.9, 0.18);
        break;
    }
  },

  /** โน้ตเดียว ADSR แบบง่าย (attack เร็ว · decay exponential) */
  _tone(ctx, when, type, freq, dur, gain = 0.1) {
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, when);
    const peak = gain * this.masterGain;
    g.gain.setValueAtTime(0.0001, when);
    g.gain.exponentialRampToValueAtTime(peak,     when + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0001,   when + dur);
    o.connect(g).connect(ctx.destination);
    o.start(when);
    o.stop(when + dur + 0.02);
  },

  _arp(ctx, when, freqs, step, dur = 0.2, type = 'sine') {
    for (let i = 0; i < freqs.length; i++) {
      this._tone(ctx, when + i * step, type, freqs[i], dur, 0.1);
    }
  },

  _sweep(ctx, when, type, fromFreq, toFreq, dur, gain = 0.15) {
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(fromFreq, when);
    o.frequency.exponentialRampToValueAtTime(Math.max(20, toFreq), when + dur);
    const peak = gain * this.masterGain;
    g.gain.setValueAtTime(0.0001, when);
    g.gain.exponentialRampToValueAtTime(peak,     when + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001,   when + dur);
    o.connect(g).connect(ctx.destination);
    o.start(when);
    o.stop(when + dur + 0.02);
  },
};

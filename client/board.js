/* =========================================
   BoardRenderer — วาดกระดานด้วย HTML5 Canvas
   Layout: boustrophedon (แถว 1 ล่างซ้าย→ขวา · แถวถัดขึ้นสลับทิศ)
   Modes:
     - 50  → 10 คอลัมน์ × 5 แถว  (landscape)
     - 100 → 10 คอลัมน์ × 10 แถว (square)
   ========================================= */

const PALETTE = {
  tileA:   '#f5eddb',
  tileB:   '#dceed4',
  special: '#f7d4a8',
  start:   '#a8e0b8',
  final:   '#ffd76b',
  border:  'rgba(30, 40, 30, 0.18)',
  number:  'rgba(50, 60, 55, 0.85)',
  ladder:  '#b28850',
  ladderDark: '#8f6a3c',
  snake:   '#5aa34e',
  snakeAccent: 'rgba(255, 226, 130, 0.55)',
  snakeHead: '#3d7a34',
  tokenBorder: '#ffffff',
  tokenLabel: '#0f2e2b',
};

const PCOLORS = ['#ffcf3a', '#4be3a0', '#7bb5ff', '#ff9a7a'];

class BoardRenderer {
  constructor(canvas, board, mode) {
    this.canvas = canvas;
    this.ctx    = canvas.getContext('2d');
    this.board  = board;
    this.mode   = Number(mode);
    this.cols   = 10;
    this.rows   = this.mode / this.cols;   // 5 for 50, 10 for 100
    this.tileSize = 0;
    this.players = [];
    this.currentTurnId = null;

    this._resizePending = false;
    this._resize = this._resize.bind(this);
    this._scheduleResize = this._scheduleResize.bind(this);

    // เฉพาะ window resize เท่านั้น — ไม่ใช้ ResizeObserver แล้ว
    // (เจอ edge case ที่ container width toggle จาก scrollbar/layout → loop)
    window.addEventListener('resize', this._scheduleResize);
    this._scheduleResize();
  }

  destroy() {
    window.removeEventListener('resize', this._scheduleResize);
  }

  /** batch resize calls เป็น 1 frame ต่อรอบ */
  _scheduleResize() {
    if (this._resizePending) return;
    this._resizePending = true;
    requestAnimationFrame(() => {
      this._resizePending = false;
      this._resize();
    });
  }

  setState(players, currentTurnId) {
    this.players       = players || [];
    this.currentTurnId = currentTurnId;
    this.render();
  }

  _resize() {
    const container  = this.canvas.parentElement;
    const containerW = container.clientWidth;
    const viewportH  = window.innerHeight;
    // ถ้ายังไม่ layout (เช่น screen hidden) → skip · จะ resize อีกครั้งจาก ResizeObserver
    if (containerW < 40) return;

    const ratio = this.cols / this.rows;      // 2 mode50 · 1 mode100
    // ใช้ container width เต็ม (cap 1600 กันจอ ultra-wide)
    let w = Math.min(containerW, 1600);
    let h = w / ratio;
    // จำกัดความสูง — เว้นที่ให้ turn banner + progress cards + inventory
    // (ถ้าจอสั้นเกินก็สนใจแค่ 65% viewport)
    const maxH = Math.max(260, viewportH * 0.65);
    if (h > maxH) {
      h = maxH;
      w = h * ratio;
    }

    // ไม่มี tile min เข้มงวด — ให้ container ตัดสิน กัน overflow บนมือถือ
    const tile = Math.max(28, Math.floor(w / this.cols));
    w = tile * this.cols;
    h = tile * this.rows;
    const dpr = window.devicePixelRatio || 1;
    const cw = Math.round(w * dpr);
    const ch = Math.round(h * dpr);

    // ---- Guard: ถ้าขนาดจริงไม่เปลี่ยน → skip · กัน ResizeObserver loop ----
    if (this.canvas.width === cw && this.canvas.height === ch) return;

    this.canvas.style.width  = w + 'px';
    this.canvas.style.height = h + 'px';
    this.canvas.width  = cw;
    this.canvas.height = ch;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.tileSize = tile;
    this.render();
  }

  /* -------------------------------------------------
   * layout
   * ------------------------------------------------- */
  _tileCenter(tileId) {
    const idx = tileId - 1;
    const rowFromBottom = Math.floor(idx / this.cols);
    const y = (this.rows - 1 - rowFromBottom) * this.tileSize + this.tileSize / 2;
    const inRow = idx % this.cols;
    const col = (rowFromBottom % 2 === 0) ? inRow : (this.cols - 1 - inRow);
    const x = col * this.tileSize + this.tileSize / 2;
    return { x, y };
  }

  tokenPosition(player) {
    if (!player) return { x: 0, y: 0 };
    if (player.position <= 0) {
      // นอกกระดาน — วางไว้ก่อนช่อง 1 (ใน tile 1 มุมล่างซ้าย)
      const c = this._tileCenter(1);
      return { x: c.x - this.tileSize * 0.3, y: c.y + this.tileSize * 0.28 };
    }
    return this._tileCenter(Math.min(player.position, this.board.size));
  }

  /* -------------------------------------------------
   * render
   * ------------------------------------------------- */
  render() {
    if (!this.board || this.tileSize <= 0) return;
    const { ctx, canvas } = this;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (let t = 1; t <= this.board.size; t++) this._drawTile(t);
    for (const [from, to] of Object.entries(this.board.ladders)) {
      this._drawLadder(Number(from), Number(to));
    }
    for (const [head, tail] of Object.entries(this.board.snakes)) {
      this._drawSnake(Number(head), Number(tail));
    }

    // group tokens by position for offset
    const groups = new Map();
    this.players.forEach((p, i) => {
      const key = p.position || 0;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push({ p, idx: i });
    });
    groups.forEach((list) => {
      list.forEach((entry, offIdx) => this._drawToken(entry.p, entry.idx, offIdx, list.length));
    });
  }

  _drawTile(tileId) {
    const { ctx, tileSize, board } = this;
    const c = this._tileCenter(tileId);
    const x = c.x - tileSize / 2;
    const y = c.y - tileSize / 2;

    // alternating pastel
    const rowFromBottom = Math.floor((tileId - 1) / this.cols);
    const isEven = ((rowFromBottom + (tileId - 1)) % 2) === 0;
    let bg = isEven ? PALETTE.tileA : PALETTE.tileB;
    if (tileId === 1)                    bg = PALETTE.start;
    else if (tileId === board.size)      bg = PALETTE.final;
    else if (board.special.includes(tileId)) bg = PALETTE.special;

    ctx.fillStyle = bg;
    ctx.fillRect(x, y, tileSize, tileSize);
    ctx.strokeStyle = PALETTE.border;
    ctx.lineWidth = 1;
    ctx.strokeRect(x + 0.5, y + 0.5, tileSize - 1, tileSize - 1);

    // number
    ctx.fillStyle = PALETTE.number;
    ctx.font = `bold ${Math.max(9, Math.floor(tileSize * 0.22))}px system-ui, sans-serif`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(String(tileId), x + tileSize * 0.08, y + tileSize * 0.08);

    // labels
    if (tileId === 1) {
      ctx.fillStyle = '#1e5931';
      ctx.font = `900 ${Math.max(8, Math.floor(tileSize * 0.2))}px system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      ctx.fillText('START', c.x, y + tileSize - 3);
    } else if (tileId === board.size) {
      ctx.fillStyle = '#7a5210';
      ctx.font = `900 ${Math.max(8, Math.floor(tileSize * 0.2))}px system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      ctx.fillText('FINAL', c.x, y + tileSize - 3);
    } else if (board.special.includes(tileId)) {
      ctx.font = `${Math.max(12, Math.floor(tileSize * 0.42))}px system-ui, "Segoe UI Emoji", sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('🎁', c.x, c.y + tileSize * 0.05);
    }
  }

  _drawLadder(from, to) {
    const { ctx, tileSize } = this;
    const p1 = this._tileCenter(from);
    const p2 = this._tileCenter(to);
    const dx = p2.x - p1.x, dy = p2.y - p1.y;
    const len = Math.max(1, Math.hypot(dx, dy));
    const nx = -dy / len, ny = dx / len;
    const halfW = Math.max(6, tileSize * 0.18);

    // rails
    ctx.strokeStyle = PALETTE.ladder;
    ctx.lineWidth = Math.max(2, tileSize * 0.06);
    ctx.lineCap = 'round';
    for (const sign of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(p1.x + nx * halfW * sign, p1.y + ny * halfW * sign);
      ctx.lineTo(p2.x + nx * halfW * sign, p2.y + ny * halfW * sign);
      ctx.stroke();
    }
    // rungs
    ctx.strokeStyle = PALETTE.ladderDark;
    ctx.lineWidth = Math.max(1.5, tileSize * 0.04);
    const rungs = (tileSize > 0) ? Math.max(3, Math.floor(len / (tileSize * 0.36))) : 3;
    for (let i = 1; i < rungs; i++) {
      const t = i / rungs;
      const cx = p1.x + dx * t, cy = p1.y + dy * t;
      ctx.beginPath();
      ctx.moveTo(cx + nx * halfW, cy + ny * halfW);
      ctx.lineTo(cx - nx * halfW, cy - ny * halfW);
      ctx.stroke();
    }
  }

  _drawSnake(head, tail) {
    const { ctx, tileSize } = this;
    const h = this._tileCenter(head);
    const t = this._tileCenter(tail);
    const dx = t.x - h.x, dy = t.y - h.y;
    const len = Math.max(1, Math.hypot(dx, dy));
    const perpx = -dy / len, perpy = dx / len;
    const wave = Math.min(tileSize * 0.75, len * 0.32);

    const c1x = h.x + dx * 0.33 + perpx * wave;
    const c1y = h.y + dy * 0.33 + perpy * wave;
    const c2x = h.x + dx * 0.66 - perpx * wave;
    const c2y = h.y + dy * 0.66 - perpy * wave;

    // body
    ctx.strokeStyle = PALETTE.snake;
    ctx.lineWidth = Math.max(4, tileSize * 0.16);
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(h.x, h.y);
    ctx.bezierCurveTo(c1x, c1y, c2x, c2y, t.x, t.y);
    ctx.stroke();

    // pattern
    ctx.strokeStyle = PALETTE.snakeAccent;
    ctx.lineWidth = Math.max(1.5, tileSize * 0.045);
    ctx.setLineDash([tileSize * 0.15, tileSize * 0.12]);
    ctx.beginPath();
    ctx.moveTo(h.x, h.y);
    ctx.bezierCurveTo(c1x, c1y, c2x, c2y, t.x, t.y);
    ctx.stroke();
    ctx.setLineDash([]);

    // head
    ctx.fillStyle = PALETTE.snakeHead;
    ctx.beginPath();
    ctx.arc(h.x, h.y, tileSize * 0.18, 0, Math.PI * 2);
    ctx.fill();
    // eyes
    const eyeOX = perpx * tileSize * 0.07, eyeOY = perpy * tileSize * 0.07;
    ctx.fillStyle = 'white';
    ctx.beginPath(); ctx.arc(h.x + eyeOX, h.y + eyeOY, tileSize * 0.035, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(h.x - eyeOX, h.y - eyeOY, tileSize * 0.035, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'black';
    ctx.beginPath(); ctx.arc(h.x + eyeOX, h.y + eyeOY, tileSize * 0.015, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(h.x - eyeOX, h.y - eyeOY, tileSize * 0.015, 0, Math.PI * 2); ctx.fill();
  }

  _drawToken(player, playerIdx, offsetIdx, groupSize) {
    const { ctx, tileSize } = this;
    const c = this.tokenPosition(player);
    const r = Math.max(10, tileSize * 0.22);

    // stagger multiple tokens on same tile
    let ox = 0, oy = 0;
    if (groupSize > 1) {
      const spread = tileSize * 0.18;
      const ang = (Math.PI * 2 * offsetIdx) / groupSize - Math.PI / 2;
      ox = Math.cos(ang) * spread;
      oy = Math.sin(ang) * spread;
    }
    const cx = c.x + ox;
    const cy = c.y + oy;

    // highlight ring for current turn
    if (player.id === this.currentTurnId) {
      ctx.strokeStyle = '#ffcf3a';
      ctx.lineWidth = Math.max(2, tileSize * 0.06);
      ctx.beginPath();
      ctx.arc(cx, cy, r + Math.max(3, tileSize * 0.06), 0, Math.PI * 2);
      ctx.stroke();
    }

    // shadow
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath();
    ctx.ellipse(cx, cy + r * 0.75, r * 0.9, r * 0.28, 0, 0, Math.PI * 2);
    ctx.fill();

    // circle
    ctx.fillStyle = PCOLORS[playerIdx % PCOLORS.length];
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = PALETTE.tokenBorder;
    ctx.lineWidth = 2;
    ctx.stroke();

    // initial
    ctx.fillStyle = PALETTE.tokenLabel;
    ctx.font = `900 ${Math.max(10, Math.floor(tileSize * 0.28))}px system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText((player.name || '?').charAt(0).toUpperCase(), cx, cy + 1);

    // indicators
    if (player.shielded) {
      ctx.font = `${Math.max(10, Math.floor(tileSize * 0.28))}px system-ui, "Segoe UI Emoji", sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText('🛡️', cx + r * 0.95, cy - r * 0.9);
    }
    if (player.skipTurns > 0) {
      ctx.font = `${Math.max(10, Math.floor(tileSize * 0.28))}px system-ui, "Segoe UI Emoji", sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText('⛔', cx - r * 0.95, cy - r * 0.9);
    }
  }
}

window.BoardRenderer = BoardRenderer;

/* =========================================
   i18n — ตารางข้อความ TH / EN
   ========================================= */

const DICT = {
  th: {
    "lang.short":         "TH",
    "conn.connecting":    "กำลังเชื่อมต่อ…",
    "conn.online":        "ออนไลน์",
    "conn.offline":       "หลุดการเชื่อมต่อ",

    "brand.math":    "MATH",
    "brand.snake":   "SNAKE",
    "brand.tagline": "บันไดงู + คณิตศาสตร์ · เล่นได้สูงสุด 4 คน",

    "name.label":       "ชื่อผู้เล่นของคุณ",
    "name.placeholder": "เช่น น้องแก้ม",

    "menu.create.title": "สร้างห้องใหม่",
    "menu.create.sub":   "ตั้งกติกาแล้วชวนเพื่อน",
    "menu.join.title":   "เข้าห้องด้วยโค้ด",
    "menu.join.sub":     "ใส่โค้ด 4 ตัวจากเพื่อน",
    "menu.howto":        "วิธีเล่น",

    "foot.version": "เวอร์ชัน 0.1 · prototype",
    "foot.credits": "ทีมพัฒนา",
    "credits.title": "ทีมพัฒนา",
    "credits.sub": "รายชื่อผู้จัดทำและพัฒนาเกม Math Snake",

    "create.mode50":  "เกมสั้น · เหมาะเริ่มต้น",
    "create.mode100": "เกมเต็ม · สนุกจัด",

    "lobby.topic":         "หัวข้อโจทย์",
    "topic.all":           "รวมทั้งหมด",
    "topic.limit_function":"ลิมิตของฟังก์ชัน",
    "topic.limit_sequence": "ลิมิตของลำดับ",

    "join.title":   "เข้าห้องด้วยโค้ด",
    "join.sub":     "พิมพ์โค้ด 4 ตัวอักษรที่ได้รับจากเพื่อน",
    "join.error":   "โค้ดไม่ครบ 4 ตัว",
    "join.confirm": "เข้าห้อง",

    "howto.title": "วิธีเล่น",
    "howto.1.t": "เดินไปให้ถึงช่องสุดท้าย",
    "howto.1.b": "คนแรกที่ไปหยุด <b>ช่อง 50 หรือ 100 พอดี</b> เป็นผู้ชนะ",
    "howto.2.t": "แทนลูกเต๋าด้วยโจทย์คณิต",
    "howto.2.b": "แต่ละเทิร์นจะได้โจทย์ + <b>3 ตัวเลือก</b> · ตอบถูก = เดินหน้า · ตอบผิด = <b>ถอยหลัง</b>",
    "howto.3.t": "มีเวลา 1 นาที",
    "howto.3.b": "ตัดสินใจให้ดี ๆ ไม่งั้นถอยเอา 😅",
    "howto.4.t": "งู & บันได",
    "howto.4.b": "หยุดหัวงู = ตกลงล่าง · หยุดปลายบันได = ปีนขึ้น",
    "howto.5.t": "ช่องพิเศษ = ได้ไอเทม",
    "howto.5.b": "🛡️ โล่ · 🎫 ตั๋วสั่งเดิน · ⛔ กับดัก",
    "howto.ok":  "เข้าใจแล้ว!",

    "lobby.title":    "ห้องเกม",
    "lobby.leave":    "ออก",
    "lobby.code":     "โค้ดห้อง",
    "lobby.copy":     "📋 คัดลอกโค้ด",
    "lobby.players":  "ผู้เล่น",
    "lobby.mode":     "ขนาดกระดาน",
    "lobby.hostHint": "มีแค่ host ที่เปลี่ยนโหมดได้",
    "lobby.start":    "เริ่มเกม",
    "lobby.waiting":  "รออย่างน้อย 2 คน · host กด \"เริ่มเกม\"",
    "lobby.ready":    "พร้อมแล้ว! host กด \"เริ่มเกม\" ได้เลย",
    "lobby.waitHost": "รอ host กด \"เริ่มเกม\"",
    "lobby.empty":    "รอผู้เล่น…",
    "lobby.host":     "HOST",
    "lobby.you":      "คุณ",
    "lobby.copied":   "คัดลอกโค้ดแล้ว ✓",

    "err.not_connected":       "ยังเชื่อมต่อ server ไม่ได้",
    "err.name_required":       "กรุณาใส่ชื่อผู้เล่นก่อน",
    "err.code_required":       "กรุณาใส่โค้ดห้อง",
    "err.room_not_found":      "ไม่พบห้องนี้ · โค้ดถูกไหม?",
    "err.room_full":           "ห้องเต็มแล้ว (สูงสุด 4 คน)",
    "err.game_in_progress":    "ห้องนี้เล่นอยู่ · เข้าไม่ได้",
    "err.host_only":           "เฉพาะ host เท่านั้น",
    "err.need_more_players":   "ต้องมีอย่างน้อย 2 คนถึงจะเริ่มได้",
    "err.timeout":             "server ตอบช้าเกินไป · ลองใหม่",
    "err.generic":             "เกิดข้อผิดพลาด: {msg}",

    "info.startNotImpl":       "🚧 เกมยังไม่ implement — แต่การเชื่อมต่อทำงานถูกต้องแล้ว!",

    "game.waiting":     "รอเริ่มเทิร์น…",
    "game.yourTurn":    "ตาคุณแล้ว!",
    "game.othersTurn":  "กำลังตอบโจทย์อยู่ · โจทย์เป็นความลับ 🤫",
    "game.turnOf":      "ตาของ {name}",
    "game.progress":    "ความคืบหน้า",
    "game.pickChoice":  "เลือกคำตอบ (ตอบถูก = เดินหน้า · ผิด = ถอยหลัง)",
    "game.watching":    "รอ {name} ตอบ…",
    "game.skipped":     "{name} ถูกข้ามเทิร์น",
    "game.confirmLeave":"ออกจากเกมกลางคัน?",
    "game.peek":       "ดูโจทย์",

    "res.correct":       "ตอบถูก!",
    "res.correctDetail": "{name} เดินหน้า +{n} ช่อง",
    "res.wrong":         "ตอบผิด",
    "res.wrongDetail":   "{name} ถอยหลัง −{n} ช่อง",
    "res.timeout":       "หมดเวลา",
    "res.timeoutDetail": "{name} ไม่ได้ตอบ · ข้ามเทิร์น",
    "res.ladder":        "ปีนบันได!",
    "res.snake":         "โดนงูดูด!",
    "res.bounced":       "เกินช่อง — เด้งกลับ",

    "over.title":        "ผู้ชนะ!",
    "over.reached":      "ไปถึงช่องสุดท้ายแล้ว 🎉",
    "over.lastStanding": "เป็นผู้เล่นคนสุดท้ายที่เหลืออยู่",
    "over.again":        "เล่นอีกครั้ง",
    "over.menu":         "กลับหน้าเมนู",

    "err.not_your_turn":      "ยังไม่ถึงตาคุณ",
    "err.no_active_question": "ไม่มีโจทย์ที่กำลังเปิดอยู่",
    "err.invalid_choice":     "ตัวเลือกไม่ถูกต้อง",
    "err.game_not_started":   "เกมยังไม่เริ่ม",
    "err.game_stopped":       "เกมจบแล้ว",
    "err.already_started":    "เกมเริ่มไปแล้ว",
    "err.not_in_room":        "ไม่ได้อยู่ในห้อง",
    "err.not_finished":       "เกมยังไม่จบ",
    "err.no_questions":       "ยังไม่มีคลังโจทย์ในระบบ",
    "err.no_item":            "ไม่มีไอเทมชิ้นนี้ในกระเป๋า",
    "err.invalid_item":       "ประเภทไอเทมไม่ถูกต้อง",
    "err.invalid_target":     "เป้าหมายไม่ถูกต้อง",

    "game.inventory":   "ไอเทมของคุณ",
    "game.invHintOn":   "คลิกเพื่อใช้",
    "game.invHintOff":  "รอถึงตาคุณจึงจะใช้ได้",

    "item.shield":       "🛡️ โล่",
    "item.ticket":       "🎫 ตั๋วสั่งเดิน",
    "item.trap":         "⛔ กับดัก",
    "item.shieldDesc":   "กันผลลบครั้งถัดไป 1 ครั้ง (งู · ตอบผิด · โดนตั๋วถอย · โดนกับดัก)",
    "item.ticketDesc":   "บังคับให้ผู้เล่นคนอื่นเดินหน้าหรือถอยหลัง 3 ช่อง",
    "item.trapDesc":     "ผู้เล่นเป้าหมายถูกข้าม 1 เทิร์น",
    "item.pickTarget":   "เลือกเป้าหมาย",
    "item.forward":      "เดินหน้า +3",
    "item.backward":     "ถอยหลัง −3",
    "item.confirm":      "ใช้ไอเทม",

    "item.granted.me":    "🎁 ได้รับ {item}!",
    "item.granted.other": "🎁 {name} ได้รับ {item}",
    "item.usedShield":    "🛡️ {name} เปิดโล่",
    "item.usedTrap":      "⛔ {name} ใช้กับดักกับ {target}",
    "item.usedTicket":    "🎫 {name} สั่ง {target} {dir}",
    "item.blocked":       "🛡️ {name} มีโล่ กันเอาไว้ได้!",
    "item.used":          "{name} ใช้ไอเทม",
  },

  en: {
    "lang.short":         "EN",
    "conn.connecting":    "Connecting…",
    "conn.online":        "Online",
    "conn.offline":       "Disconnected",

    "brand.math":    "MATH",
    "brand.snake":   "SNAKE",
    "brand.tagline": "Snakes & Ladders + Math · Up to 4 players",

    "name.label":       "Your Player Name",
    "name.placeholder": "e.g. Alex",

    "menu.create.title": "Create Room",
    "menu.create.sub":   "Set the rules and invite friends",
    "menu.join.title":   "Join with Code",
    "menu.join.sub":     "Enter the 4-letter code",
    "menu.howto":        "How to Play",

    "foot.version": "v0.1 · prototype",
    "foot.credits": "Credits",
    "credits.title": "Development Team",
    "credits.sub": "Creators and Developers of Math Snake",

    "create.mode50":  "Quick game · great for beginners",
    "create.mode100": "Full game · maximum fun",

    "lobby.topic":         "Question Topic",
    "topic.all":           "All Topics",
    "topic.limit_function":"Limit of Functions",
    "topic.limit_sequence": "Limit of Sequences",

    "join.title":   "Join with Code",
    "join.sub":     "Type the 4-letter code your friend shared",
    "join.error":   "Please enter all 4 characters",
    "join.confirm": "Join Room",

    "howto.title": "How to Play",
    "howto.1.t": "Reach the final square",
    "howto.1.b": "First player to land <b>exactly on 50 or 100</b> wins",
    "howto.2.t": "Math replaces the dice",
    "howto.2.b": "Each turn: 1 question + <b>3 choices</b> · Correct = move forward · Wrong = move <b>backward</b>",
    "howto.3.t": "1-minute timer",
    "howto.3.b": "Choose wisely — or start walking backwards 😅",
    "howto.4.t": "Snakes & Ladders",
    "howto.4.b": "Snake head = slide down · ladder base = climb up",
    "howto.5.t": "Special tiles give items",
    "howto.5.b": "🛡️ Shield · 🎫 Move Ticket · ⛔ Trap",
    "howto.ok":  "Got it!",

    "lobby.title":    "Game Room",
    "lobby.leave":    "Leave",
    "lobby.code":     "Room Code",
    "lobby.copy":     "📋 Copy code",
    "lobby.players":  "Players",
    "lobby.mode":     "Board Size",
    "lobby.hostHint": "Only the host can change the mode",
    "lobby.start":    "Start Game",
    "lobby.waiting":  "Need at least 2 players · host presses \"Start\"",
    "lobby.ready":    "Ready! Host can press \"Start\"",
    "lobby.waitHost": "Waiting for host to start",
    "lobby.empty":    "Waiting…",
    "lobby.host":     "HOST",
    "lobby.you":      "YOU",
    "lobby.copied":   "Code copied ✓",

    "err.not_connected":       "Not connected to server",
    "err.name_required":       "Please enter your name",
    "err.code_required":       "Please enter a room code",
    "err.room_not_found":      "Room not found · check the code",
    "err.room_full":           "Room is full (max 4)",
    "err.game_in_progress":    "This room already started",
    "err.host_only":           "Host only",
    "err.need_more_players":   "Need at least 2 players",
    "err.timeout":             "Server timed out · try again",
    "err.generic":             "Error: {msg}",

    "info.startNotImpl":       "🚧 Game not implemented yet — but the connection works!",

    "game.waiting":     "Waiting for turn…",
    "game.yourTurn":    "Your turn!",
    "game.othersTurn":  "Answering now · question is private 🤫",
    "game.turnOf":      "{name}'s turn",
    "game.progress":    "Progress",
    "game.pickChoice":  "Pick an answer (correct = forward · wrong = backward)",
    "game.watching":    "Waiting for {name} to answer…",
    "game.skipped":     "{name} skipped a turn",
    "game.confirmLeave":"Leave the game?",
    "game.peek":       "Show question",

    "res.correct":       "Correct!",
    "res.correctDetail": "{name} moves +{n} spaces",
    "res.wrong":         "Wrong",
    "res.wrongDetail":   "{name} moves back −{n} spaces",
    "res.timeout":       "Time's up",
    "res.timeoutDetail": "{name} didn't answer · skipped",
    "res.ladder":        "Climbed a ladder!",
    "res.snake":         "Swallowed by a snake!",
    "res.bounced":       "Overshot — bounced back",

    "over.title":        "Winner!",
    "over.reached":      "Reached the final square 🎉",
    "over.lastStanding": "Last player standing",
    "over.again":        "Play Again",
    "over.menu":         "Back to Menu",

    "err.not_your_turn":      "Not your turn yet",
    "err.no_active_question": "No active question",
    "err.invalid_choice":     "Invalid choice",
    "err.game_not_started":   "Game hasn't started",
    "err.game_stopped":       "Game has ended",
    "err.already_started":    "Game already started",
    "err.not_in_room":        "Not in a room",
    "err.not_finished":       "Game not finished yet",
    "err.no_questions":       "No question bank available",
    "err.no_item":            "You don't have that item",
    "err.invalid_item":       "Invalid item type",
    "err.invalid_target":     "Invalid target",

    "game.inventory":   "Your Items",
    "game.invHintOn":   "Click to use",
    "game.invHintOff":  "Wait for your turn to use items",

    "item.shield":       "🛡️ Shield",
    "item.ticket":       "🎫 Move Ticket",
    "item.trap":         "⛔ Trap",
    "item.shieldDesc":   "Blocks the next negative effect (snake, wrong answer, backward ticket, trap)",
    "item.ticketDesc":   "Force another player to move forward or backward 3 spaces",
    "item.trapDesc":     "Target player skips their next turn",
    "item.pickTarget":   "Pick a target",
    "item.forward":      "Forward +3",
    "item.backward":     "Backward −3",
    "item.confirm":      "Use Item",

    "item.granted.me":    "🎁 You got {item}!",
    "item.granted.other": "🎁 {name} got {item}",
    "item.usedShield":    "🛡️ {name} raised a shield",
    "item.usedTrap":      "⛔ {name} trapped {target}",
    "item.usedTicket":    "🎫 {name} moved {target} {dir}",
    "item.blocked":       "🛡️ {name}'s shield blocked it!",
    "item.used":          "{name} used an item",
  },
};

const I18N = {
  lang: "th",

  init() {
    this.lang = localStorage.getItem("mathsnake.lang") || "th";
    this.apply();
  },

  toggle() {
    this.lang = this.lang === "th" ? "en" : "th";
    localStorage.setItem("mathsnake.lang", this.lang);
    document.documentElement.setAttribute("lang", this.lang);
    this.apply();
  },

  t(key, vars) {
    let s = (DICT[this.lang] && DICT[this.lang][key]) || DICT.th[key] || key;
    if (vars) for (const k in vars) s = s.replaceAll(`{${k}}`, vars[k]);
    return s;
  },

  /** map error code จาก server → ข้อความ user-friendly */
  err(code) {
    const key = `err.${code}`;
    const t = this.t(key);
    if (t === key) return this.t('err.generic', { msg: code });
    return t;
  },

  apply() {
    document.querySelectorAll("[data-i18n]").forEach((el) => {
      el.innerHTML = this.t(el.getAttribute("data-i18n"));
    });
    document.querySelectorAll("[data-i18n-attr]").forEach((el) => {
      const [attr, key] = el.getAttribute("data-i18n-attr").split("|");
      el.setAttribute(attr, this.t(key));
    });
    document.documentElement.setAttribute("lang", this.lang);
  },
};

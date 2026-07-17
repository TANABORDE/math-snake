/* =========================================
   Math Snake — main app logic
   จัดการ menu / lobby / socket integration
   ========================================= */

(() => {
  I18N.init();
  SFX.init();

  /* ---------- App state ---------- */
  const state = {
    myId:    null,           // socket.id
    room:    null,           // snapshot ล่าสุด: {code, phase, mode, hostId, players[]}
    myName:  '',
  };

  /* ---------- DOM refs ---------- */
  const $ = (id) => document.getElementById(id);
  const screens = {
    menu:  $('screen-menu'),
    lobby: $('screen-lobby'),
    game:  $('screen-game'),
  };
  const nameInput = $('playerName');

  function showScreen(name) {
    for (const k in screens) screens[k].hidden = (k !== name);
  }

  /* ---------- Connection status badge ---------- */
  const connBadge = $('connBadge');
  const connText  = $('connText');
  function setConn(kind) {
    connBadge.classList.remove('conn-off', 'conn-on', 'conn-pending');
    if (kind === 'on')      { connBadge.classList.add('conn-on');      connText.textContent = I18N.t('conn.online'); }
    else if (kind === 'pending') { connBadge.classList.add('conn-pending'); connText.textContent = I18N.t('conn.connecting'); }
    else                    { connBadge.classList.add('conn-off');     connText.textContent = I18N.t('conn.offline'); }
  }
  setConn('pending');

  /* ---------- Toast ---------- */
  const toastEl = $('toast');
  let toastTimer;
  function toast(msg, kind = 'info') {
    toastEl.textContent = msg;
    toastEl.className = `toast toast-${kind}`;
    toastEl.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => (toastEl.hidden = true), 2600);
  }

  /* ---------- Mute toggle ---------- */
  const muteBtn  = $('muteToggle');
  const muteIcon = $('muteIcon');
  function refreshMuteUI() {
    const m = SFX.isMuted();
    muteIcon.textContent = m ? '🔇' : '🔊';
    muteBtn.classList.toggle('muted', m);
  }
  refreshMuteUI();
  muteBtn.addEventListener('click', () => {
    SFX.toggle();
    refreshMuteUI();
    if (!SFX.isMuted()) SFX.play('click');
  });

  /* ---------- i18n hooks ---------- */
  $('langToggle').addEventListener('click', () => {
    I18N.toggle();
    setConn(NET.isConnected ? 'on' : 'off');
    if (state.room) renderLobby();
  });

  /* ---------- Player name ---------- */
  nameInput.value = localStorage.getItem('mathsnake.name') || '';
  state.myName = nameInput.value.trim();
  nameInput.addEventListener('input', () => {
    state.myName = nameInput.value.trim();
    localStorage.setItem('mathsnake.name', state.myName);
  });

  const RAND_TH = ['น้องแก้ม','น้องมิ้น','น้องต้นข้าว','น้องบีม','น้องพลอย','น้องเจ','น้องเอิร์ธ','น้องปันปัน'];
  const RAND_EN = ['Alex','Milo','Riko','Sky','Nova','Pip','Zed','Momo'];
  $('btnRandomName').addEventListener('click', () => {
    const pool = I18N.lang === 'th' ? RAND_TH : RAND_EN;
    nameInput.value = pool[Math.floor(Math.random() * pool.length)];
    nameInput.dispatchEvent(new Event('input'));
  });

  /* ---------- Modal helpers ---------- */
  function openModal(id) {
    const m = $(id);
    m.hidden = false;
    const f = m.querySelector('input, button:not(.modal-close)');
    if (f) setTimeout(() => f.focus(), 40);
  }
  document.querySelectorAll('[data-close]').forEach(btn =>
    btn.addEventListener('click', e => e.currentTarget.closest('.modal').hidden = true)
  );
  document.querySelectorAll('.modal').forEach(m =>
    m.addEventListener('click', e => { if (e.target === m) m.hidden = true; })
  );
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') document.querySelectorAll('.modal:not([hidden])').forEach(m => m.hidden = true);
  });

  /* ---------- Guard: name + connection ---------- */
  function requireName() {
    const n = nameInput.value.trim();
    if (!n) {
      nameInput.focus();
      nameInput.style.borderColor = '#ff9a7a';
      setTimeout(() => (nameInput.style.borderColor = ''), 1200);
      toast(I18N.t('err.name_required'), 'error');
      return null;
    }
    return n;
  }
  function requireConn() {
    if (!NET.isConnected) { toast(I18N.t('err.not_connected'), 'error'); return false; }
    return true;
  }

  /* =========================================================
     ACTIONS
     ========================================================= */
  $('btnCreate').addEventListener('click', async () => {
    const name = requireName();       if (!name) return;
    if (!requireConn()) return;
    try {
      const res = await NET.emit(EVENTS.CREATE_ROOM, { name });
      onRoomSnapshot(res.snapshot);
      showScreen('lobby');
    } catch (e) {
      toast(I18N.err(e.message), 'error');
    }
  });

  $('btnJoin').addEventListener('click', () => {
    if (!requireName())  return;
    if (!requireConn()) return;
    document.querySelectorAll('#codeInput input').forEach(i => { i.value = ''; i.classList.remove('filled'); });
    $('joinError').hidden = true;
    openModal('modal-join');
  });

  $('btnHowTo').addEventListener('click', () => openModal('modal-howto'));
  $('linkCredits').addEventListener('click', (e) => {
    e.preventDefault();
    openModal('modal-credits');
  });

  /* ---------- Code input UX ---------- */
  const codeInputs = Array.from(document.querySelectorAll('#codeInput input'));
  codeInputs.forEach((inp, idx) => {
    inp.addEventListener('input', (e) => {
      const v = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
      e.target.value = v;
      e.target.classList.toggle('filled', !!v);
      if (v && idx < codeInputs.length - 1) codeInputs[idx + 1].focus();
    });
    inp.addEventListener('keydown', (e) => {
      if (e.key === 'Backspace' && !inp.value && idx > 0) {
        codeInputs[idx - 1].focus();
        codeInputs[idx - 1].value = '';
        codeInputs[idx - 1].classList.remove('filled');
      }
      if (e.key === 'ArrowLeft'  && idx > 0)                         codeInputs[idx - 1].focus();
      if (e.key === 'ArrowRight' && idx < codeInputs.length - 1)     codeInputs[idx + 1].focus();
      if (e.key === 'Enter') $('btnJoinConfirm').click();
    });
    inp.addEventListener('paste', (e) => {
      e.preventDefault();
      const paste = (e.clipboardData.getData('text') || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, codeInputs.length);
      paste.split('').forEach((ch, i) => { codeInputs[i].value = ch; codeInputs[i].classList.add('filled'); });
      codeInputs[Math.min(paste.length, codeInputs.length - 1)].focus();
    });
  });

  $('btnJoinConfirm').addEventListener('click', async () => {
    const code = codeInputs.map(i => i.value).join('');
    if (code.length !== 4) { $('joinError').hidden = false; return; }
    const name = nameInput.value.trim();
    try {
      const res = await NET.emit(EVENTS.JOIN_ROOM, { code, name });
      $('modal-join').hidden = true;
      onRoomSnapshot(res.snapshot);
      showScreen('lobby');
    } catch (e) {
      toast(I18N.err(e.message), 'error');
    }
  });

  /* =========================================================
     LOBBY
     ========================================================= */
  function onRoomSnapshot(snap) {
    state.room = snap;
    renderLobby();
  }

  function renderLobby() {
    const r = state.room;
    if (!r) return;

    // room code
    $('roomCode').textContent = r.code;

    // player list (4 slots)
    const list = $('playerList');
    list.innerHTML = '';
    const isHost = r.hostId === state.myId;
    for (let i = 0; i < 4; i++) {
      const p = r.players[i];
      const li = document.createElement('li');
      if (!p) {
        li.className = 'player-slot empty';
        li.innerHTML = `<span class="slot-icon">＋</span><span class="slot-name">${I18N.t('lobby.empty')}</span>`;
      } else {
        li.className = 'player-slot';
        li.style.setProperty('--pcolor', ['#ffcf3a','#4be3a0','#7bb5ff','#ff9a7a'][i]);
        const isMe = (p.id === state.myId);
        const badges = [];
        if (p.isHost) badges.push(`<span class="badge host">${I18N.t('lobby.host')}</span>`);
        if (isMe)     badges.push(`<span class="badge you">${I18N.t('lobby.you')}</span>`);
        li.innerHTML = `
          <span class="slot-avatar">${escapeHtml(initial(p.name))}</span>
          <span class="slot-name">${escapeHtml(p.name)}</span>
          <span class="slot-badges">${badges.join('')}</span>
        `;
      }
      list.appendChild(li);
    }
    $('playerCount').textContent = `${r.players.length} / 4`;

    // mode picker (host only)
    const modeInputs = document.querySelectorAll('input[name="lobbyMode"]');
    modeInputs.forEach(inp => {
      inp.checked  = (Number(inp.value) === Number(r.mode));
      inp.disabled = !isHost;
    });
    $('hostHint').hidden = isHost;

    // topic picker (host only)
    const topicInputs = document.querySelectorAll('input[name="lobbyTopic"]');
    topicInputs.forEach(inp => {
      inp.checked  = (inp.value === (r.questionTopic || 'all'));
      inp.disabled = !isHost;
    });
    $('topicHostHint').hidden = isHost;

    // start button
    const canStart = isHost && r.players.length >= 2;
    const btn = $('btnStart');
    btn.hidden   = !isHost;
    btn.disabled = !canStart;
    const hint = $('startHint');
    if (isHost) {
      hint.textContent = canStart ? I18N.t('lobby.ready') : I18N.t('lobby.waiting');
    } else {
      hint.textContent = I18N.t('lobby.waitHost');
    }
  }

  function initial(name) {
    return (name || '?').trim().charAt(0).toUpperCase();
  }
  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }

  /* ---------- Lobby actions ---------- */
  $('btnCopyCode').addEventListener('click', async () => {
    if (!state.room) return;
    try {
      await navigator.clipboard.writeText(state.room.code);
      toast(I18N.t('lobby.copied'), 'success');
    } catch {
      toast(state.room.code, 'info');
    }
  });

  $('btnLeave').addEventListener('click', () => {
    NET.emit(EVENTS.LEAVE_ROOM, {}).catch(() => {});
    state.room = null;
    showScreen('menu');
  });

  document.querySelectorAll('input[name="lobbyMode"]').forEach(inp => {
    inp.addEventListener('change', async () => {
      if (!state.room) return;
      if (state.room.hostId !== state.myId) return;
      const mode = Number(inp.value);
      try {
        await NET.emit('setMode', { mode });
      } catch (e) {
        toast(I18N.err(e.message), 'error');
      }
    });
  });

  document.querySelectorAll('input[name="lobbyTopic"]').forEach(inp => {
    inp.addEventListener('change', async () => {
      if (!state.room) return;
      if (state.room.hostId !== state.myId) return;
      const topic = inp.value;
      try {
        await NET.emit('setQuestionTopic', { topic });
      } catch (e) {
        toast(I18N.err(e.message), 'error');
      }
    });
  });

  $('btnStart').addEventListener('click', async () => {
    try {
      const res = await NET.emit(EVENTS.START_GAME, {});
      toast(I18N.t('info.startNotImpl'), 'info');
      console.log('startGame ack:', res);
    } catch (e) {
      toast(I18N.err(e.message), 'error');
    }
  });

  /* =========================================================
     SOCKET WIRING
     ========================================================= */
  NET.connect();
  NET.onConnect(() => {
    const oldId = state.myId;
    state.myId = NET.socket.id;
    setConn('on');

    if (state.room && oldId && oldId !== state.myId) {
      console.log(`[net] Reconnecting. Rejoining room ${state.room.code} (old ID: ${oldId})`);
      NET.emit('rejoinRoom', { code: state.room.code, oldId, name: state.myName })
        .then(res => {
          state.room = res.snapshot;
          toast(I18N.lang === 'th' ? 'เชื่อมต่อห้องเล่นใหม่สำเร็จ ✓' : 'Reconnected to room successfully ✓', 'success');
          if (state.room.phase === 'LOBBY') {
            renderLobby();
          }
        })
        .catch(err => {
          console.warn('[net] Rejoin failed:', err.message);
          state.room = null;
          showScreen('menu');
          toast(I18N.lang === 'th' ? 'เชื่อมต่อใหม่ล้มเหลว (อาจหมดเวลารอ)' : 'Reconnection failed (timeout)', 'error');
        });
    }
  });
  NET.onDisconnect(() => {
    setConn('off');
  });

  NET.on(EVENTS.PLAYER_JOINED, (payload) => {
    if (!state.room) return;
    state.room.players = payload.players;
    renderLobby();
  });

  NET.on(EVENTS.PLAYER_LEFT, (payload) => {
    if (!state.room) return;
    state.room.players = payload.players;
    if (payload.hostId) state.room.hostId = payload.hostId;
    renderLobby();
  });

  NET.on('modeChanged', (payload) => {
    if (!state.room) return;
    state.room.mode = payload.mode;
    renderLobby();
  });

  NET.on('topicChanged', (payload) => {
    if (!state.room) return;
    state.room.questionTopic = payload.questionTopic;
    renderLobby();
  });

  NET.on(EVENTS.ERROR, (payload) => {
    toast(I18N.err(payload?.code || 'generic'), 'error');
  });

  // roomReset: กลับจาก GAME_OVER → LOBBY (host กด "เล่นอีกครั้ง")
  NET.on('roomReset', (payload) => {
    if (payload?.snapshot) state.room = payload.snapshot;
    // ปิด modal ที่อาจค้าง
    document.querySelectorAll('.modal:not([hidden])').forEach(m => m.hidden = true);
    renderLobby();
    showScreen('lobby');
  });

  /* =========================================================
     Expose APP สำหรับ game.js
     ========================================================= */
  window.APP = {
    state,
    screens,
    showScreen,
    toast,
    renderLobby,
    escapeHtml,
    initial,
  };

  showScreen('menu');
})();

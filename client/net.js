/* =========================================
   NET — ห่อ Socket.IO client ให้ใช้ง่าย
   - emit() คืน Promise (รอ ack)
   - on() ผูก event handler
   - จำลอง connection status ผ่าน callback
   ========================================= */

const NET = {
  socket:      null,
  isConnected: false,
  listeners:   { connect: [], disconnect: [] },

  connect() {
    if (this.socket) return this.socket;

    // io() มาจาก /socket.io/socket.io.js
    // eslint-disable-next-line no-undef
    this.socket = io({
      transports: ['websocket'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });

    this.socket.on('connect', () => {
      this.isConnected = true;
      console.log('[net] connected', this.socket.id);
      this.listeners.connect.forEach(fn => fn());
    });
    this.socket.on('disconnect', (reason) => {
      this.isConnected = false;
      console.log('[net] disconnected:', reason);
      this.listeners.disconnect.forEach(fn => fn(reason));
    });
    this.socket.on('connect_error', (err) => {
      console.warn('[net] connect_error:', err.message);
    });

    return this.socket;
  },

  /** emit + await ack (server callback) */
  emit(event, payload = {}) {
    return new Promise((resolve, reject) => {
      if (!this.socket) this.connect();
      if (!this.isConnected) {
        return reject(new Error('not_connected'));
      }
      let done = false;
      const timer = setTimeout(() => {
        if (done) return;
        done = true;
        reject(new Error('timeout'));
      }, 8000);

      this.socket.emit(event, payload, (res) => {
        if (done) return;
        done = true;
        clearTimeout(timer);
        if (res && res.ok === false) reject(new Error(res.error || 'server_error'));
        else resolve(res || { ok: true });
      });
    });
  },

  on(event, handler) {
    if (!this.socket) this.connect();
    this.socket.on(event, handler);
  },

  off(event, handler) {
    if (!this.socket) return;
    this.socket.off(event, handler);
  },

  onConnect(fn)    { this.listeners.connect.push(fn); },
  onDisconnect(fn) { this.listeners.disconnect.push(fn); },
};

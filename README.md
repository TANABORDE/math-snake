# 🐍 Math Snake

Snakes & Ladders + Math questions · Multiplayer (up to 4) web game
Node.js + Express + Socket.IO · Vanilla JS + HTML5 client · Deploy บน Fly.io free tier

---

## Quick start

```bash
# 1) install
npm install

# 2) run dev server (auto-restart when code changes)
npm run dev

# 3) เปิด browser
# http://localhost:3000
```

เปิดหลาย tab (หรือชวนเพื่อนใน LAN เดียวกัน) แล้วลอง create + join ห้อง

---

## Project structure

```
math-snake/
├── package.json
├── Dockerfile          ← สำหรับ Fly.io
├── fly.toml            ← config Fly.io
├── client/             ← static (เสิร์ฟโดย Express)
│   ├── index.html      ·  menu + lobby + modals
│   ├── style.css
│   ├── constants.js    ·  mirror ของ shared/constants.js
│   ├── i18n.js         ·  TH / EN
│   ├── net.js          ·  Socket.IO wrapper (Promise-based emit)
│   └── menu.js         ·  main app logic
├── server/
│   ├── index.js        ·  Express + Socket.IO entry
│   └── game/
│       └── RoomManager.js  ·  in-memory rooms
└── shared/
    └── constants.js    ·  event names + limits (ใช้ทั้ง client + server)
```

---

## What's working ✅

- **สร้างห้อง** → ได้โค้ด 4 ตัว, ผู้สร้างเป็น host
- **เข้าห้องด้วยโค้ด** → validate, max 4 คน
- **Lobby** — แสดง room code, รายชื่อผู้เล่น (4 slots), badge HOST/YOU
- **Host เลือกโหมด** 1-50 / 1-100 (broadcast ให้ทุกคนเห็น)
- **Auto reconnect** ของ Socket.IO ในตัว
- **Player left / host handoff** — ถ้า host หลุด, ยก host ให้คนถัดไปอัตโนมัติ
- **Empty room cleanup** — ห้องว่างถูกลบทันที
- **สลับ TH/EN** ทุกจอ
- **Connection badge** — เห็นสถานะการเชื่อมต่อชัด

## What's NOT done yet 🚧

- **เกมจริง** (สุ่มโจทย์ · จับเวลา 20 วิ · ตอบ · เดิน · งู/บันได · ไอเทม)
- คลังโจทย์ (`server/data/questions.json`)
- นิยามบอร์ด (`server/game/boards.js`)
- Game screen (Canvas)

หน้า Lobby มีปุ่ม "เริ่มเกม" ที่ยิง `startGame` ไปยัง server ได้ · server รับแล้ว broadcast `gameStarted` · แต่ยังไม่มี game loop จริง จะเห็น toast "🚧 เกมยังไม่ implement"

---

## Deploy to Fly.io

```bash
# ครั้งแรก
fly launch --no-deploy      # ตั้งชื่อ app, region · edit fly.toml ถ้าจำเป็น
fly deploy

# ครั้งต่อไป
fly deploy
```

Free tier: 3 x shared-cpu-1x/256MB VMs · autosuspend เมื่อไม่มี traffic
Cold start ~1-2 วิ · เกม in-memory (ห้องหายเมื่อ machine หยุดถ้าไม่มีคนเล่นค้างไว้)

---

## Socket events (ตอนนี้)

**Client → Server**
| event | payload | ack |
|---|---|---|
| `createRoom` | `{ name }` | `{ ok, snapshot }` |
| `joinRoom`   | `{ code, name }` | `{ ok, snapshot }` |
| `setMode`    | `{ mode }` (host only) | `{ ok, mode }` |
| `startGame`  | `{}` (host only) | `{ ok }` |
| `leaveRoom`  | — | — |

**Server → Client**
| event | payload |
|---|---|
| `roomCreated`  | `{ code }` |
| `playerJoined` | `{ players }` |
| `playerLeft`   | `{ players, hostId }` |
| `modeChanged`  | `{ mode }` |
| `gameStarted`  | `{ snapshot }` |

Snapshot shape: `{ code, phase, mode, hostId, players[{id,name,position,isHost,connected}] }`

---

## Next steps

1. เพิ่ม `server/game/boards.js` (BOARD_50, BOARD_100)
2. เพิ่ม `server/data/questions.json` + `server/game/questions.js`
3. เพิ่ม `server/game/GameRoom.js` — state machine เทิร์น
4. เพิ่ม `client/board.js` (Canvas render กระดาน)
5. เพิ่ม `client/ui/question.js` (modal โจทย์ + timer 20 วิ)
6. Implement ไอเทม (โล่ · ตั๋ว · กับดัก)

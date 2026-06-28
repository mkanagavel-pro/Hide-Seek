# 👀 Hide & Seek — Multiplayer Browser Game

Real-time multiplayer Hide and Seek built with Node.js, Express, Socket.IO, and vanilla canvas JS.

---

## Folder Structure

```
hide-and-seek/
├── package.json
├── README.md
│
├── server/
│   ├── index.js           ← Express + Socket.IO server entry
│   ├── gameManager.js     ← All game state, rooms, timers, tag logic
│   ├── socketHandlers.js  ← Socket event listeners (one per client)
│   ├── constants.js       ← Shared constants (map size, speed, etc.)
│   └── utils.js           ← Room code generator
│
└── public/
    ├── index.html         ← Single-page app shell (4 screens)
    │
    ├── css/
    │   └── style.css      ← Full game UI — lobby, waiting, HUD, game-over
    │
    └── js/
        ├── constants.js   ← Client constants (mirrors server)
        ├── map.js         ← Obstacle data + collision detection
        ├── renderer.js    ← Canvas drawing: ground, obstacles, players
        ├── input.js       ← Keyboard (WASD/arrows) + touch D-pad
        ├── game.js        ← Game loop, local movement, physics
        ├── ui.js          ← Screen transitions, DOM updates, HUD
        └── main.js        ← Socket.IO wiring + UI event handlers
```

---

## Installation

### Prerequisites
- Node.js ≥ 16
- npm ≥ 8

### Steps
```bash
# 1. Clone or unzip the project
cd hide-and-seek

# 2. Install dependencies
npm install

# 3. Start the server
npm start

# 4. Open in browser
# → http://localhost:3000
```

For auto-restart during development:
```bash
npm run dev   # uses nodemon
```

---

## Local Testing (Multiplayer)

To test multiplayer locally you need **multiple browser windows/tabs** or **different devices on the same network**.

### Same machine (2–4 tabs)
1. `npm start`
2. Open `http://localhost:3000` in 2–4 browser tabs
3. In the first tab: enter a name → **Create Room**
4. Copy the 6-character room code shown
5. In other tabs: enter different names → paste code → **Join**
6. Host clicks **Start Game** (need ≥ 2 players)

### Same Wi-Fi network
1. Find your local IP: `ifconfig | grep "inet "` (macOS/Linux) or `ipconfig` (Windows)
2. Other devices open `http://YOUR_IP:3000`

---

## Socket.IO Events

### Client → Server

| Event | Payload | Description |
|-------|---------|-------------|
| `createRoom` | `{ playerName }` | Create a new room as host |
| `joinRoom` | `{ roomCode, playerName }` | Join existing room by 6-char code |
| `startGame` | _(none)_ | Host starts the match |
| `playerMove` | `{ x, y, direction }` | Send position update (throttled to 50ms) |

### Server → Client

| Event | Payload | Description |
|-------|---------|-------------|
| `roomCreated` | `{ roomCode, players, state, myId }` | Confirms room creation |
| `joinedRoom` | `{ roomCode, players, state, myId }` | Confirms room join |
| `roomState` | `{ roomCode, players, state }` | Broadcast on any player join/leave |
| `gameStarted` | `{ players, seekerId, timeLeft }` | Game begins, roles assigned |
| `playerMoved` | `{ id, x, y, direction }` | Another player moved |
| `playerTagged` | `{ id, taggedBy }` | A hider was caught |
| `timerTick` | `{ timeLeft }` | Server countdown (every 1s) |
| `gameEnded` | `{ winner, players }` | Match over — `winner` is `'seeker'` or `'hiders'` |
| `error` | `{ message }` | Validation or game error |

---

## Gameplay

- **Seeker** (👁): Chase and tag all hiders within 3 minutes
- **Hider** (🙈): Survive the full 3 minutes without being tagged
- **Win conditions**:
  - Seeker wins if all hiders are tagged before time runs out
  - Hiders win if at least one survives the full 3 minutes
- Tagged hiders become spectators (ghost 👻)
- The map has walls, houses, trees, and rocks — use them as cover!

### Controls
| Input | Action |
|-------|--------|
| `W` / `↑` | Move up |
| `S` / `↓` | Move down |
| `A` / `←` | Move left |
| `D` / `→` | Move right |
| D-pad (mobile) | All directions |

---

## Architecture Notes

- **Authority**: The server is the authority for game start, role assignment, tagging, and timer. Position is client-authoritative (sent by client, echoed to others) for smooth feel — anti-cheat would reverse this.
- **Reconnect**: Socket.IO auto-reconnects; if the server has the room the client can rejoin. If the server restarted, players return to lobby.
- **Room lifecycle**: waiting → playing → ended → waiting (10s reset). Empty rooms are deleted immediately.
- **Collision**: AABB vs circle on both client (smooth) and server-clamped coordinates.

---

## Future Improvements

1. **Server-side movement validation** — prevent teleport cheating by validating distance between position updates
2. **Fog of war** — hiders can't see the seeker on their minimap until they're nearby
3. **Power-ups** — speed boost for seeker, invisibility cloak for hiders
4. **Multiple maps** — procedurally generated or hand-crafted map selection
5. **Persistent leaderboard** — track wins/losses per player name via Redis or SQLite
6. **Spectator camera controls** — let tagged hiders pan the camera freely
7. **Voice proximity chat** — WebRTC positional audio (louder when players are closer)
8. **Mobile joystick** — virtual joystick (nipplejs) instead of D-pad for smoother touch control
9. **Game modes** — timed rounds (best of 3), infection mode (tagged hiders become seekers)
10. **Cosmetics** — player skins, hats, trails unlocked by wins
11. **Private lobbies with password** — optional room password for friend groups
12. **Minimap** — small corner overlay showing relative positions

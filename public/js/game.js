/**
 * Game Module
 * Runs the main game loop, handles local player movement with collision
 * detection, manages local game state, and sends position updates to server.
 */

const Game = (() => {

  // ─── State ─────────────────────────────────────────────────────────────────
  let socket = null;
  let roomCode = '';
  let myId = '';
  let players = {};    // { socketId: PlayerData }
  let myRole = null;   // 'seeker' | 'hider'
  let timeLeft = 180;
  let gameRunning = false;
  let rafId = null;
  let lastSendTime = 0;

  // ─── Init ──────────────────────────────────────────────────────────────────

  function init(socketInstance, canvasEl) {
    socket = socketInstance;
    Renderer.init(canvasEl);
  }

  // ─── Start game ────────────────────────────────────────────────────────────

  function start(data, id, code) {
    console.log("Game.start() called");
    countdownPlayed = false;
    myId = id;
    roomCode = code;
    players = data.players;
    timeLeft = data.timeLeft;
    myRole = players[myId]?.role;
    gameRunning = true;

    InputManager.setEnabled(true);
    InputManager.reset();
    Sound.playBGM();

    // Kick off loop
    if (rafId) cancelAnimationFrame(rafId);
    loop();
  }

  function stop() {
    gameRunning = false;
    InputManager.setEnabled(false);
    if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
    Sound.stopBGM();
  }

  // ─── Main loop ─────────────────────────────────────────────────────────────

  function loop() {
    if (!gameRunning) return;
    rafId = requestAnimationFrame(loop);

    const me = players[myId];
    if (!me || me.status === 'tagged') {
      // Spectator: just render
      Renderer.draw({ players, myId, myRole });
      return;
    }

    // ── Movement ───────────────────────────────────────────────────
    const { dx, dy, direction, moving } = InputManager.getMovement();

    if (moving) {
      const speed = CONSTANTS.PLAYER_SPEED;
      const r = CONSTANTS.PLAYER_RADIUS;
      let nx = me.x + dx * speed;
      let ny = me.y + dy * speed;

      // Clamp to map bounds
      nx = Math.max(r, Math.min(CONSTANTS.MAP_WIDTH - r, nx));
      ny = Math.max(r, Math.min(CONSTANTS.MAP_HEIGHT - r, ny));

      // TEMP TEST - collision disabled
      const hit = GameMap.collidesWithObstacle(nx, ny, r);

      if (hit) {
        console.log("Hit obstacle");
      }

      if (!hit) {
        me.x = nx;
        me.y = ny;
      } else if (!GameMap.collidesWithObstacle(nx, me.y, r)) {
        me.x = nx;
      } else if (!GameMap.collidesWithObstacle(me.x, ny, r)) {
        me.y = ny;
      }

      // Throttled position send
      const now = performance.now();
      if (now - lastSendTime > CONSTANTS.SEND_RATE) {
        socket.emit('playerMove', { x: me.x, y: me.y, direction });
        lastSendTime = now;
      }
    }

    // ── Render ─────────────────────────────────────────────────────
    Renderer.draw({ players, myId, myRole });
  }

  // ─── Socket event handlers ─────────────────────────────────────────────────

  function onPlayerMoved({ id, x, y, direction }) {
    if (!players[id] || id === myId) return;  // skip self (we handle locally)
    players[id].x = x;
    players[id].y = y;
    players[id].direction = direction;
  }

  function onPlayerTagged({ id }) {
    console.log("Player tagged:", id);

    if (players[id]) {
      players[id].status = 'tagged';
    }

    if (id === myId) {
      console.log("Playing tag sound");
      Sound.play("tag");
    }

    updateHiderCount();
  }
  function onTimerTick({ timeLeft: t }) {
  console.log("Timer:", t);

  timeLeft = t;
  UI.updateTimer(t);

  if (t <= 10 && !countdownPlayed) {
    countdownPlayed = true;
    console.log("Countdown sound");
    Sound.play("countdown");
  }
}
  // ─── Hider count util ─────────────────────────────────────────────────────

  function updateHiderCount() {
    const activeHiders = Object.values(players).filter(
      p => p.role === 'hider' && p.status !== 'tagged'
    ).length;
    document.getElementById('hud-hiders-left').textContent = activeHiders;
  }

  // ─── Getters ──────────────────────────────────────────────────────────────

  function getPlayers() { return players; }
  function getMyId() { return myId; }
  function getMyRole() { return myRole; }
  function getRoomCode() { return roomCode; }
  function isRunning() { return gameRunning; }

  function setPlayers(p) { players = p; }

  return {
    init, start, stop,
    onPlayerMoved, onPlayerTagged, onTimerTick,
    getPlayers, getMyId, getMyRole, getRoomCode,
    setPlayers, updateHiderCount,
    isRunning,
  };
})();

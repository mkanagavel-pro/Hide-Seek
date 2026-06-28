/**
 * Main Client Entry Point
 * Connects to Socket.IO, wires up all UI interactions and socket events.
 *
 * ══ Socket events received ══════════════════════════════════════
 *  roomCreated   → entered new room as host
 *  joinedRoom    → successfully joined existing room
 *  roomState     → room player list updated (join/leave/game reset)
 *  gameStarted   → game is beginning, roles assigned
 *  playerMoved   → another player's position changed
 *  playerTagged  → a hider was caught
 *  timerTick     → countdown tick from server
 *  gameEnded     → match over with winner
 *  error         → server-side validation error
 * ════════════════════════════════════════════════════════════════
 */

(function () {
  'use strict';

  // ─── State ─────────────────────────────────────────────────────────────────
  let socket = null;
  let myId = '';
  let roomCode = '';

  // ─── Connect ───────────────────────────────────────────────────────────────

  function connect() {
    socket = io({ reconnectionAttempts: 5, reconnectionDelay: 1500 });

    socket.on('connect', () => {
      myId = socket.id;
      console.log('[Socket] Connected:', myId);
    });

    socket.on('disconnect', (reason) => {
      console.warn('[Socket] Disconnected:', reason);
      if (Game.isRunning()) {
        UI.toast('⚠️ Connection lost. Trying to reconnect…', 4000);
      }
    });

    socket.on('connect_error', () => {
      UI.toast('❌ Cannot reach server. Is it running?', 5000);
    });

    // Re-identify after reconnect (server will have dropped us, so go back to lobby)
    socket.on('reconnect', () => {
      UI.toast('✅ Reconnected!');
      UI.showScreen('lobby');
      Game.stop();
    });

    // ── Room events ───────────────────────────────────────────────

    socket.on('roomCreated', ({ roomCode: code, players, state, myId: id }) => {
      myId = id;
      roomCode = code;
      UI.showScreen('waiting');
      UI.updateWaitingRoom(code, players, myId, state);
    });

    socket.on('joinedRoom', ({ roomCode: code, players, state, myId: id }) => {
      myId = id;
      roomCode = code;
      UI.showScreen('waiting');
      UI.updateWaitingRoom(code, players, myId, state);
    });

    socket.on('roomState', ({ roomCode: code, players, state }) => {
      roomCode = code;

      if (state === 'waiting') {
        // Back in lobby after game ends
        if (!Game.isRunning()) {
          UI.showScreen('waiting');
        }
        UI.updateWaitingRoom(code, players, myId, state);
      } else {
        UI.updateWaitingRoom(code, players, myId, state);
      }

      // Update live player list if still waiting
      if (state === 'waiting' && document.getElementById('screen-waiting').classList.contains('active')) {
        UI.updateWaitingRoom(code, players, myId, state);
      }
    });

    // ── Game events ───────────────────────────────────────────────

    socket.on('gameStarted', ({ players, seekerId, timeLeft }) => {
      const me = players[myId];
      if (!me) return;

      UI.resetGameOverlay();
      UI.showScreen('game');
      UI.setupHUD(me.role, roomCode);
      UI.updateTimer(timeLeft);

      // Count hiders for HUD
      const hiderCount = Object.values(players).filter(p => p.role === 'hider').length;
      document.getElementById('hud-hiders-left').textContent = hiderCount;

      // Start game loop
      Game.start({ players, timeLeft }, myId, roomCode);

      // Show role banner
      setTimeout(() => UI.showRoleBanner(me.role), 200);
    });

    socket.on('playerMoved', (data) => {
      Game.onPlayerMoved(data);
    });

    socket.on('playerTagged', ({ id, taggedBy }) => {
      Game.onPlayerTagged({ id });

      if (id === myId) {
        UI.showSpectatorOverlay();
        UI.toast('💀 You were tagged! Now spectating…', 4000);
      } else {
        const players = Game.getPlayers();
        const name = players[id]?.name || 'Someone';
        UI.toast(`💀 ${name} was tagged!`, 2000);
      }

      Game.updateHiderCount();
    });

    socket.on('timerTick', ({ timeLeft }) => {
      Game.onTimerTick({ timeLeft });
    });

    socket.on('gameEnded', ({ winner, players }) => {
      console.log("Game Ended Event");
      Game.stop();
      console.log("Playing win sound");

      Sound.play("win");
      UI.showGameOver(winner, players, myId);

      // After 10s server resets room — listen for roomState to go back
      setTimeout(() => {
        if (document.getElementById('screen-gameover').classList.contains('active')) {
          UI.showScreen('waiting');
          UI.updateWaitingRoom(roomCode, players, myId, 'waiting');
        }
      }, 10500);
    });

    socket.on('error', ({ message }) => {
      const screen = document.querySelector('.screen.active')?.id || '';
      if (screen.includes('lobby')) {
        UI.showLobbyError(message);
      } else if (screen.includes('waiting')) {
        UI.showWaitingError(message);
      } else {
        UI.toast('⚠️ ' + message, 3000);
      }
    });
  }

  // ─── Lobby UI events ───────────────────────────────────────────────────────

  function setupLobbyEvents() {
    const nameInput = document.getElementById('player-name');
    const codeInput = document.getElementById('room-code-input');

    // Create room
    document.getElementById('btn-create').addEventListener('click', () => {
      Sound.play("button");
      const name = nameInput.value.trim();
      if (!name) return UI.showLobbyError('Please enter your name first.');

      socket.emit('createRoom', { playerName: name });
    });
    // Join room
    document.getElementById('btn-join').addEventListener('click', () => {
      Sound.play("button");
      const name = nameInput.value.trim();
      const code = codeInput.value.trim().toUpperCase();

      if (!name) return UI.showLobbyError('Please enter your name first.');
      if (code.length !== 6) return UI.showLobbyError('Room code must be 6 characters.');



      socket.emit('joinRoom', { roomCode: code, playerName: name });
    });
    // Enter key shortcuts
    nameInput.addEventListener('keydown', e => {
      if (e.key === 'Enter') codeInput.focus();
    });
    codeInput.addEventListener('keydown', e => {
      if (e.key === 'Enter') document.getElementById('btn-join').click();
    });
    codeInput.addEventListener('input', () => {
      codeInput.value = codeInput.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
    });
  }

  // ─── Waiting room UI events ────────────────────────────────────────────────

  function setupWaitingEvents() {
    document.getElementById('btn-start').addEventListener('click', () => {
      console.log(typeof Sound);
      Sound.play("button");
      setTimeout(() => {
        socket.emit('startGame');
      }, 200);
    });

    document.getElementById('btn-leave').addEventListener('click', () => {
      socket.disconnect();
      socket.connect();
      roomCode = '';
      UI.showScreen('lobby');
    });

    document.getElementById('btn-copy-code').addEventListener('click', () => {
      if (navigator.clipboard && roomCode) {
        navigator.clipboard.writeText(roomCode)
          .then(() => UI.toast('📋 Room code copied!'))
          .catch(() => UI.toast('Code: ' + roomCode));
      } else {
        UI.toast('Code: ' + roomCode);
      }
    });
  }

  // ─── Init ──────────────────────────────────────────────────────────────────

  function init() {
    InputManager.init();
    Game.init(null, document.getElementById('game-canvas'));
    connect();

    // Patch Game to use socket after connect
    const origInit = Game.init;
    Game.init = function (s, c) { origInit(s, c); };

    // Give socket to game module after connect
    socket = io({ reconnectionAttempts: 5, reconnectionDelay: 1500 });
    // NOTE: we call connect() above which sets socket, and then below re-assigns.
    // Let's fix this properly:
  }

  // ─── Clean init ────────────────────────────────────────────────────────────

  // Wait for DOM ready
  window.addEventListener('DOMContentLoaded', () => {
    // 1. Set up socket
    socket = io({ reconnectionAttempts: 5, reconnectionDelay: 1500 });

    // 2. Init systems
    InputManager.init();
    const canvas = document.getElementById('game-canvas');
    Game.init(socket, canvas);

    // 3. Wire up all socket events
    setupSocketEvents();

    // 4. Wire up UI events
    setupLobbyEvents();
    setupWaitingEvents();

    // 5. Show lobby
    UI.showScreen('lobby');
  });

  function setupSocketEvents() {
    socket.on('connect', () => {
      myId = socket.id;
      // Reassign socket in game module
      Game.init(socket, document.getElementById('game-canvas'));
      console.log('[Socket] Connected:', myId);
    });

    socket.on('disconnect', (reason) => {
      console.warn('[Socket] Disconnected:', reason);
      if (Game.isRunning()) {
        UI.toast('⚠️ Connection lost…', 4000);
        Game.stop();
      }
    });

    socket.on('reconnect', () => {
      UI.toast('✅ Reconnected!');
      UI.showScreen('lobby');
    });

    socket.on('roomCreated', ({ roomCode: code, players, state, myId: id }) => {
      myId = id || socket.id;
      roomCode = code;
      UI.showScreen('waiting');
      UI.updateWaitingRoom(code, players, myId, state);
    });

    socket.on('joinedRoom', ({ roomCode: code, players, state, myId: id }) => {
      myId = id || socket.id;
      roomCode = code;
      UI.showScreen('waiting');
      UI.updateWaitingRoom(code, players, myId, state);
    });

    socket.on('roomState', ({ roomCode: code, players, state }) => {
      roomCode = code;
      const waitingScreen = document.getElementById('screen-waiting');
      if (waitingScreen?.classList.contains('active') || state === 'waiting') {
        UI.updateWaitingRoom(code, players, myId, state);
      }
      if (state === 'waiting' && Game.isRunning()) {
        // shouldn't happen, but guard
      }
      Game.setPlayers(players);
    });

    socket.on('gameStarted', ({ players, seekerId, timeLeft }) => {
      const me = players[myId];
      if (!me) return;

      UI.resetGameOverlay();
      UI.showScreen('game');
      UI.setupHUD(me.role, roomCode);
      UI.updateTimer(timeLeft);

      const hiderCount = Object.values(players).filter(p => p.role === 'hider').length;
      document.getElementById('hud-hiders-left').textContent = hiderCount;

      Game.start({ players, timeLeft }, myId, roomCode);
      setTimeout(() => UI.showRoleBanner(me.role), 250);
    });

    socket.on('playerMoved', data => Game.onPlayerMoved(data));

    socket.on('playerTagged', ({ id, taggedBy }) => {
      Game.onPlayerTagged({ id });
      if (id === myId) {
        UI.showSpectatorOverlay();
        UI.toast('💀 You were tagged! Spectating…', 4000);
      } else {
        const name = Game.getPlayers()[id]?.name || 'A hider';
        UI.toast(`💀 ${name} was tagged!`, 2000);
      }
      Game.updateHiderCount();
    });

    socket.on('timerTick', ({ timeLeft }) => {
      UI.updateTimer(timeLeft);

      if (timeLeft === 10) {
        Sound.play("countdown");
      }
    });

    socket.on('gameEnded', ({ winner, players }) => {
      console.log("Winner =", winner);

      Game.stop();

      const myRole = Game.getMyRole();

      if (winner === myRole) {
        Sound.play("win");
      } else {
        Sound.play("lose");
      }

      UI.showGameOver(winner, players, myId);

      setTimeout(() => {
        if (document.getElementById('screen-gameover').classList.contains('active')) {
          UI.showScreen('waiting');
          UI.updateWaitingRoom(roomCode, players, myId, 'waiting');
        }
      }, 10500);
    });

    socket.on('error', ({ message }) => {
      const active = document.querySelector('.screen.active')?.id || '';
      if (active.includes('lobby')) UI.showLobbyError(message);
      else if (active.includes('waiting')) UI.showWaitingError(message);
      else UI.toast('⚠️ ' + message, 3500);
    });
  }

})();

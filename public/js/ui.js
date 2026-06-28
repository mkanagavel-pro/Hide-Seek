/**
 * UI Module
 * Manages screen transitions and DOM updates.
 * Keeps all DOM manipulation out of game logic.
 */

const UI = (() => {

  const SCREENS = ['lobby', 'waiting', 'game', 'gameover'];
  let currentScreen = 'lobby';
  let gameoverInterval = null;

  // ─── Screen transitions ───────────────────────────────────────────────────

  function showScreen(name) {
    SCREENS.forEach(s => {
      const el = document.getElementById(`screen-${s}`);
      if (el) {
        el.classList.toggle('active', s === name);
      }
    });
    currentScreen = name;
  }

  // ─── Lobby ────────────────────────────────────────────────────────────────

  function showLobbyError(msg) {
    const el = document.getElementById('lobby-error');
    el.textContent = msg;
    el.classList.remove('hidden');
    setTimeout(() => el.classList.add('hidden'), 4000);
  }

  function clearLobbyError() {
    document.getElementById('lobby-error').classList.add('hidden');
  }

  // ─── Waiting room ─────────────────────────────────────────────────────────

  function updateWaitingRoom(roomCode, players, myId, state) {
    document.getElementById('display-room-code').textContent = roomCode;
    document.getElementById('hud-room-code').textContent = roomCode;

    const playerArray = Object.values(players);
    document.getElementById('player-count').textContent = playerArray.length;

    const list = document.getElementById('players-list');
    list.innerHTML = '';

    // Render up to 4 slots
    for (let i = 0; i < 4; i++) {
      const player = playerArray[i];
      const card = document.createElement('div');

      if (player) {
        const isMe = player.id === myId;
        card.className = `player-card${isMe ? ' is-me' : ''}`;
        card.innerHTML = `
          <div class="player-avatar" style="background:${player.color}">
            ${player.name.charAt(0).toUpperCase()}
          </div>
          <div class="player-name">${escHtml(player.name)}${isMe ? ' (you)' : ''}</div>
          ${player.isHost ? '<div class="player-host-badge">HOST</div>' : ''}
        `;
      } else {
        card.className = 'player-card empty';
        card.innerHTML = `
          <div class="player-avatar" style="background:rgba(255,255,255,0.08)">?</div>
          <div class="player-name" style="opacity:0.3">Waiting…</div>
        `;
      }

      list.appendChild(card);
    }

    // Show start button only to host
    const me = players[myId];
    const btnStart = document.getElementById('btn-start');
    const hint     = document.getElementById('waiting-hint');

    if (me?.isHost) {
      btnStart.classList.remove('hidden');
      hint.classList.add('hidden');
      btnStart.disabled = playerArray.length < 2;
      btnStart.style.opacity = playerArray.length < 2 ? '0.5' : '1';
    } else {
      btnStart.classList.add('hidden');
      hint.classList.remove('hidden');
    }
  }

  function showWaitingError(msg) {
    const el = document.getElementById('waiting-error');
    el.textContent = msg;
    el.classList.remove('hidden');
    setTimeout(() => el.classList.add('hidden'), 4000);
  }

  // ─── Game HUD ─────────────────────────────────────────────────────────────

  function setupHUD(myRole, roomCode) {
    const roleEl = document.getElementById('hud-role');
    document.getElementById('hud-room-code').textContent = roomCode;

    if (myRole === 'seeker') {
      roleEl.textContent = '👁 Seeker';
      roleEl.className   = 'hud-role seeker';
    } else {
      roleEl.textContent = '🙈 Hider';
      roleEl.className   = 'hud-role';
    }
  }

  function updateTimer(seconds) {
    const m   = Math.floor(seconds / 60);
    const s   = seconds % 60;
    const str = `${m}:${s.toString().padStart(2, '0')}`;
    const el  = document.getElementById('hud-timer');
    el.textContent = str;
    el.classList.toggle('urgent', seconds <= 30);
  }

  // ─── Role banner (game start) ─────────────────────────────────────────────

  function showRoleBanner(role) {
    const banner = document.getElementById('role-banner');
    const icon   = document.getElementById('role-banner-icon');
    const text   = document.getElementById('role-banner-text');
    const sub    = banner.querySelector('.role-banner-sub');

    if (role === 'seeker') {
      icon.textContent = '👁';
      text.textContent = 'You are the Seeker!';
      text.style.color = '#ff6b6b';
      sub.textContent  = 'Tag all the hiders before time runs out!';
    } else {
      icon.textContent = '🙈';
      text.textContent = 'You are a Hider!';
      text.style.color = '#74b9ff';
      sub.textContent  = 'Find a good spot and survive for 3 minutes!';
    }

    banner.classList.remove('hidden');
    setTimeout(() => banner.classList.add('hidden'), 3200);
  }

  // ─── Spectator ───────────────────────────────────────────────────────────

  function showSpectatorOverlay() {
    document.getElementById('spectator-overlay').classList.remove('hidden');
  }

  // ─── Game Over ───────────────────────────────────────────────────────────

  function showGameOver(winner, players, myId) {
    const icon     = document.getElementById('gameover-icon');
    const title    = document.getElementById('gameover-title');
    const subtitle = document.getElementById('gameover-subtitle');

    if (winner === 'seeker') {
      icon.textContent     = '👁';
      title.textContent    = 'Seeker Wins!';
      subtitle.textContent = 'All hiders were tagged!';
      title.style.color    = '#ff6b6b';
    } else {
      icon.textContent     = '🏆';
      title.textContent    = 'Hiders Win!';
      subtitle.textContent = 'At least one hider survived the 3 minutes!';
      title.style.color    = '#7bc67e';
    }

    // Results list
    const results = document.getElementById('gameover-results');
    results.innerHTML = '';

    for (const player of Object.values(players)) {
      if (player.status === 'waiting') continue;
      const isMe  = player.id === myId;
      const won   = (winner === 'seeker' && player.role === 'seeker') ||
                    (winner === 'hiders' && player.role === 'hider' && player.status !== 'tagged');
      const row   = document.createElement('div');
      row.className = 'result-row';
      row.innerHTML = `
        <div class="result-avatar" style="background:${player.color}">
          ${player.name.charAt(0).toUpperCase()}
        </div>
        <div>
          <div class="result-name">${escHtml(player.name)}${isMe ? ' (you)' : ''}</div>
          <div class="result-role">${player.role === 'seeker' ? '👁 Seeker' : '🙈 Hider'}</div>
        </div>
        <div class="result-status" style="color:${won ? '#7bc67e' : '#ff6b6b'}">
          ${won ? '🏆 Won' : (player.status === 'tagged' ? '💀 Tagged' : '😔 Lost')}
        </div>
      `;
      results.appendChild(row);
    }

    // Countdown back to lobby
    let count = 10;
    document.getElementById('gameover-countdown').textContent = count;
    if (gameoverInterval) clearInterval(gameoverInterval);
    gameoverInterval = setInterval(() => {
      count--;
      const el = document.getElementById('gameover-countdown');
      if (el) el.textContent = count;
      if (count <= 0) {
        clearInterval(gameoverInterval);
        gameoverInterval = null;
      }
    }, 1000);

    showScreen('gameover');
  }

  // ─── Toast notification ───────────────────────────────────────────────────

  let toastTimeout = null;
  function toast(msg, duration = 2500) {
    const el = document.getElementById('toast');
    el.textContent = msg;
    el.classList.remove('hidden');
    el.classList.add('show');
    if (toastTimeout) clearTimeout(toastTimeout);
    toastTimeout = setTimeout(() => {
      el.classList.remove('show');
      setTimeout(() => el.classList.add('hidden'), 400);
    }, duration);
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────

  function escHtml(str) {
    return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  }

  function resetGameOverlay() {
    document.getElementById('role-banner').classList.add('hidden');
    document.getElementById('spectator-overlay').classList.add('hidden');
  }

  return {
    showScreen,
    showLobbyError, clearLobbyError,
    updateWaitingRoom, showWaitingError,
    setupHUD, updateTimer,
    showRoleBanner, showSpectatorOverlay,
    showGameOver,
    resetGameOverlay,
    toast,
  };
})();

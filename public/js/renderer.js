/**
 * Renderer
 * All canvas drawing: map tiles, obstacles, players, name tags, camera.
 */

const Renderer = (() => {

  let canvas, ctx;
  let camX = 0, camY = 0;  // camera top-left in world space

  const COLORS = {
    grass:     '#3d7a3a',
    grassDark: '#2d6028',
    grassLight:'#4a8f46',
    wall:      '#5c4a3a',
    wallTop:   '#7a6248',
    house:     '#c4956a',
    houseRoof: '#8b3a3a',
    houseDoor: '#5c3a1e',
    treeCanopy:'#2d6628',
    treeCanopy2:'#3d7a38',
    treeTrunk: '#7a5c38',
    rockBody:  '#8a8a8a',
    rockShade: '#6a6a6a',
    rockHigh:  '#aaaaaa',
  };

  function init(canvasEl) {
    canvas = canvasEl;
    ctx = canvas.getContext('2d');
    resize();
    window.addEventListener('resize', resize);
  }

  function resize() {
    canvas.width  = window.innerWidth;
    canvas.height = window.innerHeight;
  }

  /**
   * Main draw call. Called every animation frame.
   * @param {Object} state - { players, myId, myRole }
   */
  function draw(state) {
    if (!ctx) return;
    const { players, myId } = state;

    // Update camera to follow local player
    const me = players[myId];
    if (me) {
      camX = me.x - canvas.width / 2;
      camY = me.y - canvas.height / 2;
    }

    // Clamp camera to map bounds
    camX = Math.max(0, Math.min(CONSTANTS.MAP_WIDTH  - canvas.width,  camX));
    camY = Math.max(0, Math.min(CONSTANTS.MAP_HEIGHT - canvas.height, camY));

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    ctx.translate(-camX, -camY);

    drawGround();
    drawGroundPatches();
    drawObstacles();
    drawPlayers(players, myId, state.myRole);

    ctx.restore();
  }

  // ─── Ground ───────────────────────────────────────────────────────────────

  function drawGround() {
    const W = CONSTANTS.MAP_WIDTH;
    const H = CONSTANTS.MAP_HEIGHT;

    // Base grass fill
    ctx.fillStyle = COLORS.grass;
    ctx.fillRect(0, 0, W, H);

    // Subtle grid pattern for depth
    ctx.strokeStyle = COLORS.grassDark;
    ctx.lineWidth = 1;
    ctx.globalAlpha = 0.18;
    const GRID = 80;
    for (let x = 0; x <= W; x += GRID) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
    }
    for (let y = 0; y <= H; y += GRID) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  function drawGroundPatches() {
    for (const p of GameMap.GROUND_PATCHES) {
      ctx.save();
      ctx.translate(p.x, p.y);
      if (p.type === 0) {
        // Short grass tufts
        ctx.strokeStyle = COLORS.grassLight;
        ctx.lineWidth = 2;
        ctx.globalAlpha = 0.5;
        for (let i = -1; i <= 1; i++) {
          ctx.beginPath();
          ctx.moveTo(i * 5, 0);
          ctx.lineTo(i * 5 - 3, -p.size * 0.5);
          ctx.stroke();
        }
      } else if (p.type === 1) {
        // Small flowers
        ctx.globalAlpha = 0.6;
        ctx.fillStyle = '#ffe566';
        ctx.beginPath();
        ctx.arc(0, 0, p.size * 0.25, 0, Math.PI * 2);
        ctx.fill();
      } else {
        // Dirt patch
        ctx.fillStyle = '#8a6a3a';
        ctx.globalAlpha = 0.25;
        ctx.beginPath();
        ctx.ellipse(0, 0, p.size * 0.7, p.size * 0.45, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
    ctx.globalAlpha = 1;
  }

  // ─── Obstacles ────────────────────────────────────────────────────────────

  function drawObstacles() {
    for (const obs of GameMap.OBSTACLES) {
      switch (obs.type) {
        case 'wall':  drawWall(obs);  break;
        case 'house': drawHouse(obs); break;
        case 'tree':  drawTree(obs);  break;
        case 'rock':  drawRock(obs);  break;
      }
    }
  }

  function drawWall(obs) {
    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.fillRect(obs.x + 4, obs.y + 4, obs.w, obs.h);
    // Body
    ctx.fillStyle = COLORS.wall;
    ctx.fillRect(obs.x, obs.y, obs.w, obs.h);
    // Top highlight
    ctx.fillStyle = COLORS.wallTop;
    const t = Math.min(obs.w, obs.h, 8);
    ctx.fillRect(obs.x, obs.y, obs.w, t);
    // Brick pattern
    ctx.strokeStyle = 'rgba(0,0,0,0.2)';
    ctx.lineWidth = 1;
    const brickH = 14, brickW = 28;
    let row = 0;
    for (let y = obs.y; y < obs.y + obs.h; y += brickH) {
      const offset = (row % 2) * (brickW / 2);
      for (let x = obs.x - offset; x < obs.x + obs.w; x += brickW) {
        ctx.strokeRect(x, y, brickW, brickH);
      }
      row++;
    }
  }

  function drawHouse(obs) {
    const cx = obs.x + obs.w / 2;
    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.fillRect(obs.x + 6, obs.y + 6, obs.w, obs.h);
    // Walls
    ctx.fillStyle = COLORS.house;
    ctx.fillRect(obs.x, obs.y + obs.h * 0.35, obs.w, obs.h * 0.65);
    // Roof (triangle)
    ctx.fillStyle = COLORS.houseRoof;
    ctx.beginPath();
    ctx.moveTo(obs.x - 8, obs.y + obs.h * 0.38);
    ctx.lineTo(cx, obs.y - 4);
    ctx.lineTo(obs.x + obs.w + 8, obs.y + obs.h * 0.38);
    ctx.closePath();
    ctx.fill();
    // Roof ridge
    ctx.strokeStyle = '#6a2828';
    ctx.lineWidth = 2;
    ctx.stroke();
    // Door
    const dw = obs.w * 0.22, dh = obs.h * 0.32;
    ctx.fillStyle = COLORS.houseDoor;
    ctx.fillRect(cx - dw / 2, obs.y + obs.h - dh, dw, dh);
    // Window left
    ctx.fillStyle = '#a8d8ea';
    ctx.fillRect(obs.x + obs.w * 0.12, obs.y + obs.h * 0.5, obs.w * 0.2, obs.h * 0.2);
    ctx.strokeStyle = '#7a5c38';
    ctx.lineWidth = 2;
    ctx.strokeRect(obs.x + obs.w * 0.12, obs.y + obs.h * 0.5, obs.w * 0.2, obs.h * 0.2);
    // Window right
    ctx.fillStyle = '#a8d8ea';
    ctx.fillRect(obs.x + obs.w * 0.68, obs.y + obs.h * 0.5, obs.w * 0.2, obs.h * 0.2);
    ctx.strokeStyle = '#7a5c38';
    ctx.strokeRect(obs.x + obs.w * 0.68, obs.y + obs.h * 0.5, obs.w * 0.2, obs.h * 0.2);
    // Chimney
    ctx.fillStyle = COLORS.wall;
    ctx.fillRect(cx + obs.w * 0.15, obs.y - obs.h * 0.12, obs.w * 0.1, obs.h * 0.2);
  }

  function drawTree(obs) {
    const cx = obs.x + obs.w / 2;
    const cy = obs.y + obs.h / 2;
    const r  = Math.min(obs.w, obs.h) / 2;
    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.22)';
    ctx.beginPath();
    ctx.ellipse(cx + 4, cy + obs.h * 0.3, r * 0.7, r * 0.25, 0, 0, Math.PI * 2);
    ctx.fill();
    // Trunk
    ctx.fillStyle = COLORS.treeTrunk;
    ctx.fillRect(cx - 5, cy + r * 0.2, 10, r * 0.6);
    // Canopy layers
    ctx.fillStyle = COLORS.treeCanopy;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = COLORS.treeCanopy2;
    ctx.beginPath();
    ctx.arc(cx - r * 0.2, cy - r * 0.15, r * 0.72, 0, Math.PI * 2);
    ctx.fill();
    // Highlight
    ctx.fillStyle = 'rgba(255,255,255,0.1)';
    ctx.beginPath();
    ctx.arc(cx - r * 0.28, cy - r * 0.3, r * 0.35, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawRock(obs) {
    const cx = obs.x + obs.w / 2;
    const cy = obs.y + obs.h / 2;
    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    ctx.beginPath();
    ctx.ellipse(cx + 3, cy + 4, obs.w * 0.48, obs.h * 0.35, 0, 0, Math.PI * 2);
    ctx.fill();
    // Body
    ctx.fillStyle = COLORS.rockBody;
    ctx.beginPath();
    ctx.ellipse(cx, cy, obs.w * 0.48, obs.h * 0.44, 0, 0, Math.PI * 2);
    ctx.fill();
    // Shade bottom-right
    ctx.fillStyle = COLORS.rockShade;
    ctx.beginPath();
    ctx.ellipse(cx + obs.w * 0.12, cy + obs.h * 0.12, obs.w * 0.28, obs.h * 0.26, 0, 0, Math.PI * 2);
    ctx.fill();
    // Highlight top-left
    ctx.fillStyle = COLORS.rockHigh;
    ctx.beginPath();
    ctx.ellipse(cx - obs.w * 0.14, cy - obs.h * 0.14, obs.w * 0.2, obs.h * 0.18, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // ─── Players ──────────────────────────────────────────────────────────────

  function drawPlayers(players, myId, myRole) {
    for (const [id, player] of Object.entries(players)) {
      if (player.status === 'waiting') continue;

      const isMe = id === myId;
      const isTagged = player.status === 'tagged';

      // Seeker fog: hiders can't see seeker's exact position with full opacity if far
      // (future improvement – for now draw all players)

      ctx.save();

      // Fade tagged players
      if (isTagged) ctx.globalAlpha = 0.4;

      drawPlayer(player, isMe);

      ctx.restore();
    }
  }

  function drawPlayer(player, isMe) {
    const { x, y, color, name, role, status, direction } = player;
    const r = CONSTANTS.PLAYER_RADIUS;

    // Drop shadow
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath();
    ctx.ellipse(x + 2, y + r * 0.6, r * 0.7, r * 0.25, 0, 0, Math.PI * 2);
    ctx.fill();

    // Body circle
    ctx.fillStyle = color || '#ff6b6b';
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();

    // "Me" ring
    if (isMe) {
      ctx.strokeStyle = 'rgba(255,255,255,0.9)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(x, y, r + 4, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Eyes (direction-aware)
    const eyeOffsets = eyePositions(direction, r);
    ctx.fillStyle = '#fff';
    for (const e of eyeOffsets) {
      ctx.beginPath();
      ctx.arc(x + e.ex, y + e.ey, 4.5, 0, Math.PI * 2);
      ctx.fill();
    }
    // Pupils
    ctx.fillStyle = '#222';
    for (const e of eyeOffsets) {
      ctx.beginPath();
      ctx.arc(x + e.ex + e.px, y + e.ey + e.py, 2.5, 0, Math.PI * 2);
      ctx.fill();
    }

    // Role icon
    const icon = role === 'seeker' ? '👁' : (status === 'tagged' ? '💀' : '🙈');
    ctx.font = '13px serif';
    ctx.textAlign = 'center';
    ctx.fillText(icon, x, y + 5);

    // Name tag
    drawNameTag(x, y, r, name, isMe, role);
  }

  function eyePositions(direction, r) {
    const d = r * 0.42;
    const spread = 5;
    const look = 1.5;
    switch (direction) {
      case 'up':    return [{ ex: -spread, ey: -d, px: 0, py: -look }, { ex: spread, ey: -d, px: 0, py: -look }];
      case 'down':  return [{ ex: -spread, ey: d,  px: 0, py: look  }, { ex: spread, ey: d,  px: 0, py: look  }];
      case 'left':  return [{ ex: -d, ey: -spread, px: -look, py: 0 }, { ex: -d, ey: spread, px: -look, py: 0 }];
      case 'right': return [{ ex: d,  ey: -spread, px: look, py: 0  }, { ex: d,  ey: spread, px: look, py: 0  }];
      default:      return [{ ex: -spread, ey: d,  px: 0, py: look  }, { ex: spread, ey: d,  px: 0, py: look  }];
    }
  }

  function drawNameTag(x, y, r, name, isMe, role) {
    const tagY = y - r - 22;
    const bgColor = isMe
      ? 'rgba(123,198,126,0.92)'
      : role === 'seeker'
        ? 'rgba(255,107,107,0.88)'
        : 'rgba(30,50,30,0.82)';
    const textColor = isMe ? '#1a2e1a' : '#f0f4e8';

    ctx.font = 'bold 11px Nunito, sans-serif';
    ctx.textAlign = 'center';
    const tw = ctx.measureText(name).width;
    const pw = 8, ph = 4;
    const bw = tw + pw * 2, bh = 17;

    // Background pill
    ctx.fillStyle = bgColor;
    roundRect(ctx, x - bw / 2, tagY - ph - 1, bw, bh, 7);
    ctx.fill();

    // Name text
    ctx.fillStyle = textColor;
    ctx.fillText(name, x, tagY + ph + 1);
  }

  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  return { init, draw, resize, getCamera: () => ({ x: camX, y: camY }) };
})();

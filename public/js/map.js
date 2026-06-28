/**
 * Map Module
 * Defines the game world: ground tiles, walls, trees, rocks, houses.
 * Also provides collision detection against obstacle bounding boxes.
 */

const GameMap = (() => {

  const W = CONSTANTS.MAP_WIDTH;
  const H = CONSTANTS.MAP_HEIGHT;

  // ─── Obstacle types ────────────────────────────────────────────────────────
  // Each obstacle: { type, x, y, w, h }  (x,y = top-left, w/h = size)
  const OBSTACLES = [

    // ── Border walls ──────────────────────────────────────────────────────────
    { type: 'wall', x: 0, y: 0, w: W, h: 24 },  // top
    { type: 'wall', x: 0, y: H - 24, w: W, h: 24 },  // bottom
    { type: 'wall', x: 0, y: 0, w: 24, h: H },  // left
    { type: 'wall', x: W - 24, y: 0, w: 24, h: H },  // right

    // ── Inner walls ────────────────────────────────────────────────────────────
    { type: 'wall', x: 200, y: 100, w: 280, h: 22 },
    { type: 'wall', x: 900, y: 80, w: 22, h: 180 },
    { type: 'wall', x: 1200, y: 200, w: 200, h: 22 },
    { type: 'wall', x: 400, y: 600, w: 22, h: 220 },
    { type: 'wall', x: 700, y: 900, w: 300, h: 22 },
    { type: 'wall', x: 1100, y: 700, w: 22, h: 200 },
    { type: 'wall', x: 300, y: 1000, w: 200, h: 22 },
    { type: 'wall', x: 600, y: 400, w: 22, h: 150 },
    { type: 'wall', x: 1300, y: 500, w: 160, h: 22 },
    { type: 'wall', x: 800, y: 550, w: 22, h: 130 },

    // ── Houses ─────────────────────────────────────────────────────────────────
    { type: 'house', x: 80, y: 80, w: 110, h: 110 },
    { type: 'house', x: 1410, y: 80, w: 110, h: 110 },
    { type: 'house', x: 80, y: 1010, w: 110, h: 110 },
    { type: 'house', x: 1410, y: 1010, w: 110, h: 110 },
    { type: 'house', x: 640, y: 180, w: 140, h: 120 },
    { type: 'house', x: 1050, y: 400, w: 140, h: 120 },
    { type: 'house', x: 200, y: 700, w: 120, h: 120 },
    { type: 'house', x: 1150, y: 900, w: 120, h: 120 },
    { type: 'house', x: 700, y: 700, w: 130, h: 130 },
    { type: 'house', x: 480, y: 850, w: 120, h: 110 },

    // ── Trees ──────────────────────────────────────────────────────────────────
    { type: 'tree', x: 360, y: 160, w: 52, h: 52 },
    { type: 'tree', x: 500, y: 260, w: 48, h: 48 },
    { type: 'tree', x: 160, y: 340, w: 56, h: 56 },
    { type: 'tree', x: 1100, y: 130, w: 52, h: 52 },
    { type: 'tree', x: 1280, y: 300, w: 48, h: 48 },
    { type: 'tree', x: 1380, y: 450, w: 54, h: 54 },
    { type: 'tree', x: 900, y: 350, w: 50, h: 50 },
    { type: 'tree', x: 250, y: 480, w: 48, h: 48 },
    { type: 'tree', x: 550, y: 520, w: 52, h: 52 },
    { type: 'tree', x: 1050, y: 600, w: 50, h: 50 },
    { type: 'tree', x: 150, y: 800, w: 56, h: 56 },
    { type: 'tree', x: 900, y: 820, w: 48, h: 48 },
    { type: 'tree', x: 1300, y: 850, w: 52, h: 52 },
    { type: 'tree', x: 600, y: 980, w: 50, h: 50 },
    { type: 'tree', x: 380, y: 380, w: 48, h: 48 },
    { type: 'tree', x: 1180, y: 550, w: 50, h: 50 },
    { type: 'tree', x: 750, y: 200, w: 48, h: 48 },
    { type: 'tree', x: 440, y: 750, w: 52, h: 52 },

    // ── Rocks ──────────────────────────────────────────────────────────────────
    { type: 'rock', x: 310, y: 300, w: 42, h: 36 },
    { type: 'rock', x: 750, y: 130, w: 38, h: 34 },
    { type: 'rock', x: 1050, y: 250, w: 44, h: 36 },
    { type: 'rock', x: 1340, y: 650, w: 40, h: 34 },
    { type: 'rock', x: 520, y: 680, w: 42, h: 36 },
    { type: 'rock', x: 820, y: 480, w: 38, h: 32 },
    { type: 'rock', x: 200, y: 900, w: 44, h: 36 },
    { type: 'rock', x: 1000, y: 950, w: 40, h: 34 },
    { type: 'rock', x: 660, y: 580, w: 38, h: 32 },
    { type: 'rock', x: 130, y: 550, w: 42, h: 36 },
    { type: 'rock', x: 1450, y: 350, w: 38, h: 32 },
    { type: 'rock', x: 870, y: 700, w: 44, h: 36 },
  ];

  console.log("Obstacles:", OBSTACLES.map(o => o.type));

  // ─── Collision detection ───────────────────────────────────────────────────

  /**
   * Returns true if a circle (player) overlaps any obstacle AABB.
   * @param {number} cx - circle center X
   * @param {number} cy - circle center Y
   * @param {number} r  - circle radius
   */
  function collidesWithObstacle(cx, cy, r) {
  for (const obs of OBSTACLES) {

    const nearX = Math.max(obs.x, Math.min(cx, obs.x + obs.w));
    const nearY = Math.max(obs.y, Math.min(cy, obs.y + obs.h));

    const dx = cx - nearX;
    const dy = cy - nearY;

    if (dx * dx + dy * dy < r * r) {
      console.log("Hit:", obs.type);
      return true;
    }
  }

  return false;
}

  // ─── Ground decoration tiles (purely visual, no collision) ────────────────
  const GROUND_PATCHES = (() => {
    const patches = [];
    const rand = mulberry32(42);
    for (let i = 0; i < 80; i++) {
      patches.push({
        x: rand() * W,
        y: rand() * H,
        type: Math.floor(rand() * 3), // 0=short grass, 1=flowers, 2=dirt
        size: 14 + rand() * 12,
      });
    }
    return patches;
  })();

  // Deterministic RNG for consistent ground patches
  function mulberry32(seed) {
    return function () {
      seed |= 0; seed = seed + 0x6D2B79F5 | 0;
      let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }

  return { OBSTACLES, collidesWithObstacle, GROUND_PATCHES };
})();

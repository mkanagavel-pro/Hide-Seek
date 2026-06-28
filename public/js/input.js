/**
 * Input Module
 * Handles keyboard (WASD / arrow keys) and touch D-pad controls.
 * Exposes InputManager.getMovement() → { dx, dy, direction }
 */

const InputManager = (() => {

  // Active key state
  const keys = {
    up: false,
    down: false,
    left: false,
    right: false,
  };

  // Touch d-pad state
  const touch = {
    up: false,
    down: false,
    left: false,
    right: false,
  };

  let enabled = false;

  function init() {
    // Keyboard
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);

    // Touch D-pad buttons
    document.querySelectorAll('.dpad-btn').forEach(btn => {
      const dir = btn.dataset.dir;

      btn.addEventListener('touchstart', (e) => {
        e.preventDefault();
        touch[dir] = true;
        btn.classList.add('pressed');
      }, { passive: false });

      btn.addEventListener('touchend', (e) => {
        e.preventDefault();
        touch[dir] = false;
        btn.classList.remove('pressed');
      }, { passive: false });

      btn.addEventListener('touchcancel', () => {
        touch[dir] = false;
        btn.classList.remove('pressed');
      });

      // Mouse fallback for desktop testing with mouse
      btn.addEventListener('mousedown', () => { touch[dir] = true; });
      btn.addEventListener('mouseup', () => { touch[dir] = false; });
      btn.addEventListener('mouseleave', () => { touch[dir] = false; });
    });
  }

  function onKeyDown(e) {

    const tag = document.activeElement.tagName;

    if (tag === 'INPUT' || tag === 'TEXTAREA') {
      return;
    }

    console.log("KEYDOWN", e.code);

    switch (e.code) {
      case 'ArrowUp':
      case 'KeyW':
        keys.up = true;
        e.preventDefault();
        break;

      case 'ArrowDown':
      case 'KeyS':
        keys.down = true;
        e.preventDefault();
        break;

      case 'ArrowLeft':
      case 'KeyA':
        keys.left = true;
        e.preventDefault();
        break;

      case 'ArrowRight':
      case 'KeyD':
        keys.right = true;
        e.preventDefault();
        break;
    }
  }
  function onKeyUp(e) {

    const tag = document.activeElement.tagName;

    if (tag === 'INPUT' || tag === 'TEXTAREA') {
      return;
    }

    switch (e.code) {
      case 'ArrowUp':
      case 'KeyW':
        keys.up = false;
        break;

      case 'ArrowDown':
      case 'KeyS':
        keys.down = false;
        break;

      case 'ArrowLeft':
      case 'KeyA':
        keys.left = false;
        break;

      case 'ArrowRight':
      case 'KeyD':
        keys.right = false;
        break;
    }
  }
  /**
   * Returns the current movement vector and direction label.
   * @returns {{ dx: number, dy: number, direction: string, moving: boolean }}
   */
  function getMovement() {
    if (!enabled) return { dx: 0, dy: 0, direction: 'down', moving: false };

    const up = keys.up || touch.up;
    const down = keys.down || touch.down;
    const left = keys.left || touch.left;
    const right = keys.right || touch.right;

    let dx = 0, dy = 0;
    if (up) dy -= 1;
    if (down) dy += 1;
    if (left) dx -= 1;
    if (right) dx += 1;

    // Normalize diagonal movement
    if (dx !== 0 && dy !== 0) {
      dx *= 0.7071;
      dy *= 0.7071;
    }

    let direction = 'down';
    if (up && !down) direction = 'up';
    else if (down && !up) direction = 'down';
    else if (left && !right) direction = 'left';
    else if (right && !left) direction = 'right';

    const moving = dx !== 0 || dy !== 0;
    return { dx, dy, direction, moving };
  }

  function setEnabled(val) { enabled = val; }
  function reset() {
    Object.keys(keys).forEach(k => keys[k] = false);
    Object.keys(touch).forEach(k => touch[k] = false);
  }

  return { init, getMovement, setEnabled, reset };
})();

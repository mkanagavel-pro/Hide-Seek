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
     initJoystick();
  }

  let joyDX = 0;
let joyDY = 0;

function initJoystick() {

  const base = document.getElementById("joystick-base");
  const stick = document.getElementById("joystick-stick");

  if (!base || !stick) return;

  const radius = 35;

  function update(x, y) {

    const rect = base.getBoundingClientRect();

    let dx = x - (rect.left + rect.width / 2);
    let dy = y - (rect.top + rect.height / 2);

    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist > radius) {
      dx = dx / dist * radius;
      dy = dy / dist * radius;
    }

    stick.style.transform = `translate(${dx}px, ${dy}px)`;

    joyDX = dx / radius;
    joyDY = dy / radius;
  }

  base.addEventListener("touchstart", e => {
    update(e.touches[0].clientX, e.touches[0].clientY);
  }, { passive:false });

  base.addEventListener("touchmove", e => {
    e.preventDefault();
    update(e.touches[0].clientX, e.touches[0].clientY);
  }, { passive:false });

  function resetStick() {
    stick.style.transform = "translate(0px,0px)";
    joyDX = 0;
    joyDY = 0;
  }

  base.addEventListener("touchend", resetStick);
  base.addEventListener("touchcancel", resetStick);
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
  if (!enabled)
    return { dx: 0, dy: 0, direction: "down", moving: false };

  let dx = joyDX;
  let dy = joyDY;

  // Keyboard support
  if (keys.up) dy = -1;
  if (keys.down) dy = 1;
  if (keys.left) dx = -1;
  if (keys.right) dx = 1;

  // Normalize diagonal movement
  const len = Math.sqrt(dx * dx + dy * dy);
  if (len > 1) {
    dx /= len;
    dy /= len;
  }

  let direction = "down";

  if (Math.abs(dx) > Math.abs(dy)) {
    direction = dx > 0 ? "right" : "left";
  } else if (Math.abs(dy) > 0.1) {
    direction = dy > 0 ? "down" : "up";
  }

  const moving = Math.abs(dx) > 0.05 || Math.abs(dy) > 0.05;

  return {
    dx,
    dy,
    direction,
    moving
  };
}
  function setEnabled(val) { enabled = val; }
  function reset() {
    Object.keys(keys).forEach(k => keys[k] = false);
    Object.keys(touch).forEach(k => touch[k] = false);
  }

  return { init, getMovement, setEnabled, reset };
})();

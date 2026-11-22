// The Gilded Vault — input: keyboard state and mouse clicks, nothing else.
// The game reads this once per step; the DOM listeners live here only.
export const ACTION_START = 'start';
export const ACTION_SMOKE = 'smoke';
export const ACTION_PAUSE = 'pause';
export const ACTION_RESTART = 'restart';
export const ACTION_MUTE = 'mute';

const MOVE_KEYS = {
  KeyW: [0, -1],
  ArrowUp: [0, -1],
  KeyS: [0, 1],
  ArrowDown: [0, 1],
  KeyA: [-1, 0],
  ArrowLeft: [-1, 0],
  KeyD: [1, 0],
  ArrowRight: [1, 0],
};

/** Attach listeners to `canvas` and return the live input state. */
export function createInput(canvas) {
  const keys = new Set();
  const pressed = new Set(); // edge-triggered actions, consumed by the game
  const clicks = []; // queued {x, y} in canvas pixels, consumed by the game
  let mouse = { x: 0, y: 0 };

  window.addEventListener('keydown', (event) => {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(event.code)) {
      event.preventDefault();
    }
    if (event.repeat) return;
    keys.add(event.code);
    if (event.code === 'Enter' || event.code === 'Space') pressed.add(ACTION_START);
    if (event.code === 'KeyE') pressed.add(ACTION_SMOKE);
    if (event.code === 'KeyP' || event.code === 'Escape') pressed.add(ACTION_PAUSE);
    if (event.code === 'KeyR') pressed.add(ACTION_RESTART);
    if (event.code === 'KeyM') pressed.add(ACTION_MUTE);
  });
  window.addEventListener('keyup', (event) => {
    keys.delete(event.code);
  });
  window.addEventListener('blur', () => keys.clear());

  canvas.addEventListener('pointerdown', (event) => {
    const rect = canvas.getBoundingClientRect();
    mouse = { x: event.clientX - rect.left, y: event.clientY - rect.top };
    clicks.push({ x: mouse.x, y: mouse.y });
    pressed.add(ACTION_START);
  });
  canvas.addEventListener('pointermove', (event) => {
    const rect = canvas.getBoundingClientRect();
    mouse = { x: event.clientX - rect.left, y: event.clientY - rect.top };
  });

  return {
    /** Normalised movement vector from the held keys. */
    moveVector() {
      let x = 0;
      let y = 0;
      for (const code of keys) {
        const dir = MOVE_KEYS[code];
        if (dir) {
          x += dir[0];
          y += dir[1];
        }
      }
      if (x === 0 && y === 0) return { x: 0, y: 0 };
      const len = Math.hypot(x, y);
      return { x: x / len, y: y / len };
    },
    /** True once when the action was pressed since the last call. */
    consume(action) {
      if (pressed.has(action)) {
        pressed.delete(action);
        return true;
      }
      return false;
    },
    /** Drain queued clicks (canvas pixels). */
    drainClicks() {
      return clicks.splice(0, clicks.length);
    },
    mouse() {
      return mouse;
    },
  };
}

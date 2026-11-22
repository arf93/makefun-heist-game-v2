// The Gilded Vault — boot and the one loop.
// The game moves between title, play, paused, caught and win. Input is read
// every frame, the world advances in fixed 1/60 s steps, and the renderer
// paints what is there. ?shot=cover|play|caught|win (with &seed=N) stages
// that scene instead of running the loop, paints it twice and sets
// window.__shotReady for a screenshot.
import { ALARM, CAUGHT_FREEZE_SECONDS, ROOM, SCORE, STEP, THIEF, TOOLS } from './config.js';
import { createAudio } from './audio.js';
import { Camera, Guard } from './guards.js';
import { ACTION_MUTE, ACTION_PAUSE, ACTION_RESTART, ACTION_SMOKE, ACTION_START, createInput } from './input.js';
import { atExit, atLoot, buildLevel, moveCircle } from './level.js';
import { canvasToRoom, createRenderer, SCREEN_CAUGHT, SCREEN_PAUSED, SCREEN_PLAY, SCREEN_TITLE, SCREEN_WIN } from './render.js';
import { stageShot } from './shots.js';

const MAX_FRAME = 0.25;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');

/** Build a fresh game: level, watchers, thief and the whole HUD state. */
export function createGame() {
  const level = buildLevel();
  const game = {
    state: null,
    reset() {
      this.state = {
        level,
        thief: { x: level.entrance.x, y: level.entrance.y, hasLoot: false },
        guards: level.guardPatrols.map((p, i) => new Guard(p, i)),
        cameras: level.cameras.map((c, i) => new Camera(c, i)),
        alarm: 0,
        seen: false,
        smoke: [],
        decoy: null,
        smokeUses: TOOLS.smokeUses,
        decoyUses: TOOLS.decoyUses,
        time: 0,
        detections: 0,
        score: SCORE.base,
        screen: SCREEN_TITLE,
        caughtTimer: 0,
        muted: false,
        now: 0,
      };
    },
    /** Projected score right now (ghost bonus only counts on the win screen). */
    currentScore() {
      const s = this.state;
      return Math.max(0, SCORE.base - Math.floor(s.time) * SCORE.perSecond - s.detections * SCORE.perDetection);
    },
    /** Final score at the getaway, with the ghost bonus when never seen. */
    finalScore() {
      const s = this.state;
      return this.currentScore() + (s.detections === 0 ? SCORE.ghostBonus : 0);
    },
    /** One fixed step of the world. Input: {move, smoke, clicks} in room coords. */
    step(dt, input) {
      const s = this.state;
      s.now += dt;
      if (s.screen !== SCREEN_PLAY) return;
      s.time += dt;

      // Move the thief (axis-separated, sliding along cover and walls).
      const mv = input.move;
      moveCircle(level, s.thief, THIEF.radius, mv.x * THIEF.speed * dt, mv.y * THIEF.speed * dt);

      // Smoke bomb: a cloud that hides everyone inside it.
      if (input.smoke && s.smokeUses > 0) {
        s.smokeUses -= 1;
        s.smoke.push({ x: s.thief.x, y: s.thief.y, until: s.now + TOOLS.smokeSeconds, seed: Math.random() * 6 });
      }
      s.smoke = s.smoke.filter((c) => s.now < c.until);

      // Decoy: a click throws it (in range), the nearest guard investigates.
      for (const click of input.clicks) {
        if (s.decoyUses <= 0) break;
        const dx = click.x - s.thief.x;
        const dy = click.y - s.thief.y;
        if (Math.hypot(dx, dy) > TOOLS.decoyRange) continue;
        s.decoyUses -= 1;
        s.decoy = { x: click.x, y: click.y };
        let nearest = null;
        let nearestDist = Infinity;
        for (const g of s.guards) {
          const d = Math.hypot(g.x - click.x, g.y - click.y);
          if (d < nearestDist) {
            nearestDist = d;
            nearest = g;
          }
        }
        if (nearest) nearest.investigate(click.x, click.y, s.now + TOOLS.decoyLureSeconds);
      }

      // Watchers patrol, sweep and look. Smoke blinds whoever stands in it,
      // and hides the thief while he stands in it.
      const inSmoke = (x, y) => s.smoke.some((c) => Math.hypot(x - c.x, y - c.y) < TOOLS.smokeRadius);
      for (const g of s.guards) {
        g.update(dt, s.now, level, s.thief);
        if (inSmoke(g.x, g.y)) g.blind(s.now + 0.25);
        if (inSmoke(s.thief.x, s.thief.y)) g.seesThief = false;
      }
      for (const c of s.cameras) {
        c.update(dt, s.now, level, s.thief);
        if (inSmoke(c.x, c.y)) c.blind(s.now + 0.25);
        if (inSmoke(s.thief.x, s.thief.y)) c.seesThief = false;
      }

      // The alarm rises while seen, falls while hidden.
      s.seen = s.guards.some((g) => g.seesThief) || s.cameras.some((c) => c.seesThief);
      s.alarm = Math.max(0, Math.min(ALARM.max, s.alarm + (s.seen ? ALARM.risePerSecond : -ALARM.fallPerSecond) * dt));

      // Grab the Sunstone.
      if (!s.hasLoot && atLoot(level, s.thief.x, s.thief.y)) {
        s.hasLoot = true;
        s.thief.hasLoot = true;
        this.onPickup?.();
      }

      // Caught: the alarm filled. A fair freeze, then back to the door.
      if (s.alarm >= ALARM.max) {
        s.detections += 1;
        s.screen = SCREEN_CAUGHT;
        s.caughtTimer = CAUGHT_FREEZE_SECONDS;
        this.onCaught?.();
        return;
      }

      // Getaway: at the EXIT with the Sunstone.
      if (s.hasLoot && atExit(level, s.thief.x, s.thief.y)) {
        s.score = this.finalScore();
        s.screen = SCREEN_WIN;
        this.onWin?.();
      }
    },
  };
  game.reset();
  return game;
}

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const game = createGame();
const audio = createAudio();
const renderer = createRenderer(canvas);
const input = createInput(canvas);

game.onPickup = () => audio.pickup();
game.onCaught = () => audio.caught();
game.onWin = () => audio.win();

/** Announce the screen for screen readers. */
function announce(text) {
  status.textContent = text;
}

if (shot) {
  // Staged screenshot: paint the scene twice, then signal readiness.
  const screen = stageShot(shot, game);
  announce(screen === SCREEN_WIN ? 'The getaway: the Sunstone is yours.' : 'The Gilded Vault, a midnight museum heist.');
  let painted = 0;
  const paint = () => {
    renderer.draw(game.state, screen, game.state.now);
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  };
  requestAnimationFrame(paint);
} else {
  // The real game.
  let screen = SCREEN_TITLE;
  let alertTick = 0;
  let accumulator = 0;
  let last = performance.now();
  game.state.screen = SCREEN_TITLE;

  // Debug handle for playtests: the live state, never part of the game.
  window.__heist = {
    get state() {
      return game.state;
    },
    get screen() {
      return screen;
    },
  };

  // Pause when the tab is hidden mid-heist, so the alarm cannot fill while
  // the player is looking at another tab.
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      game.state.screen = SCREEN_PAUSED;
      announce('Paused.');
    }
  });

  function frame(nowMs) {
    const dt = Math.min(MAX_FRAME, (nowMs - last) / 1000);
    last = nowMs;

    if (input.consume(ACTION_MUTE)) {
      game.state.muted = audio.toggleMute();
    }
    if (input.consume(ACTION_RESTART)) {
      game.reset();
      screen = SCREEN_TITLE;
      game.state.screen = SCREEN_TITLE;
      announce('The Gilded Vault. Press Enter to start.');
    }

    if (screen === SCREEN_TITLE) {
      if (input.consume(ACTION_START)) {
        game.reset();
        screen = SCREEN_PLAY;
        game.state.screen = SCREEN_PLAY;
        announce('Sneaking. Reach the Sunstone, then the exit.');
      }
    } else if (screen === SCREEN_PLAY) {
      if (input.consume(ACTION_PAUSE)) {
        screen = SCREEN_PAUSED;
        announce('Paused.');
      } else {
        const roomClicks = input.drainClicks().map((c) => canvasToRoom(canvas, c.x, c.y));
        accumulator += dt;
        while (accumulator >= STEP) {
          game.step(STEP, {
            move: input.moveVector(),
            smoke: input.consume(ACTION_SMOKE),
            clicks: roomClicks.splice(0, roomClicks.length),
          });
          accumulator -= STEP;
          if (game.state.screen !== SCREEN_PLAY) break;
        }
        if (game.state.seen) {
          alertTick += dt;
          if (alertTick > 0.5) {
            alertTick = 0;
            audio.alert();
          }
        } else {
          alertTick = 0;
        }
        screen = game.state.screen;
        if (screen === SCREEN_CAUGHT) announce('Spotted! Back to the entrance.');
        if (screen === SCREEN_WIN) announce('Clean getaway! The Sunstone is yours.');
      }
    } else if (screen === SCREEN_PAUSED) {
      if (input.consume(ACTION_PAUSE) || input.consume(ACTION_START)) {
        screen = SCREEN_PLAY;
        game.state.screen = SCREEN_PLAY;
        announce('Sneaking.');
      }
    } else if (screen === SCREEN_CAUGHT) {
      game.state.caughtTimer -= dt;
      if (game.state.caughtTimer <= 0) {
        // Fair reset: back to the door, alarm empty, loot kept if grabbed.
        const keepLoot = game.state.hasLoot;
        const detections = game.state.detections;
        const time = game.state.time;
        const smokeUses = game.state.smokeUses;
        const decoyUses = game.state.decoyUses;
        game.reset();
        game.state.hasLoot = keepLoot;
        game.state.thief.hasLoot = keepLoot;
        game.state.detections = detections;
        game.state.time = time;
        game.state.smokeUses = smokeUses;
        game.state.decoyUses = decoyUses;
        game.state.thief.x = game.state.level.entrance.x;
        game.state.thief.y = game.state.level.entrance.y;
        screen = SCREEN_PLAY;
        game.state.screen = SCREEN_PLAY;
        announce('Back at the door. Try another route.');
      }
    } else if (screen === SCREEN_WIN) {
      if (input.consume(ACTION_RESTART) || input.consume(ACTION_START)) {
        game.reset();
        screen = SCREEN_TITLE;
        game.state.screen = SCREEN_TITLE;
        announce('The Gilded Vault. Press Enter to start.');
      }
    }

    renderer.draw(game.state, screen, game.state.now);
    requestAnimationFrame(frame);
  }

  announce('The Gilded Vault. Press Enter to start.');
  requestAnimationFrame(frame);
}

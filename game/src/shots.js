// The Gilded Vault — screenshot staging: deterministic scenes for ?shot=.
// Each scene plays the real rules forward from a fresh world for a fixed number
// of steps (guards patrol, cameras sweep), then poses the thief and the alarm,
// so every frame is what a real game looks like and the same seed gives the
// same frame. Nothing here draws: the renderer paints the staged state.
import { STEP } from './config.js';
import { SCREEN_CAUGHT, SCREEN_PLAY, SCREEN_WIN } from './render.js';

/** Advance the world with no input for `seconds` (guards patrol, cameras sweep). */
function advance(game, seconds) {
  const steps = Math.round(seconds / STEP);
  for (let i = 0; i < steps; i += 1) {
    game.step(STEP, { move: { x: 0, y: 0 }, smoke: false, clicks: [] });
  }
}

/**
 * Set the game to the named scene and return the screen to draw over it.
 * Scenes: cover (the whole room at a glance), play (a close call behind a
 * case, smoke in the air), caught (the fair SPOTTED! moment), win (getaway).
 */
export function stageShot(name, game) {
  game.reset();
  game.state.screen = SCREEN_PLAY;

  if (name === 'caught') {
    // The thief stepped into Mara's cone at the centre case; the alarm is full.
    advance(game, 4.5);
    const guard = game.state.guards[0];
    game.state.thief.x = guard.x + 120;
    game.state.thief.y = guard.y;
    guard.facing = 0;
    guard.seesThief = true;
    game.state.alarm = 100;
    game.state.seen = true;
    game.state.detections = 1;
    game.state.time = 95;
    game.state.screen = SCREEN_CAUGHT;
    return SCREEN_CAUGHT;
  }

  if (name === 'win') {
    // The getaway: Sunstone pocketed, thief at the EXIT, never seen once.
    advance(game, 3);
    game.state.hasLoot = true;
    game.state.thief.hasLoot = true;
    game.state.thief.x = game.state.level.exit.x;
    game.state.thief.y = game.state.level.exit.y - 40;
    game.state.time = 132;
    game.state.detections = 0;
    game.state.score = game.finalScore();
    game.state.screen = SCREEN_WIN;
    return SCREEN_WIN;
  }

  if (name === 'play') {
    // A close call: the thief crouches behind the centre case, smoke drifting,
    // Bram's cone sweeping just past the case. One smoke spent, alarm half up.
    advance(game, 7);
    game.state.thief.x = 500;
    game.state.thief.y = 330;
    game.state.alarm = 55;
    game.state.time = 78;
    game.state.smokeUses = 1;
    game.state.smoke.push({ x: 560, y: 330, until: game.state.time + 3, seed: 1.3 });
    game.state.guards[1].x = 620;
    game.state.guards[1].y = 528;
    game.state.guards[1].facing = Math.PI;
    return SCREEN_PLAY;
  }

  // cover: the whole room at a glance — thief in the left corridor, alarm
  // a third up, every guard and camera mid-patrol with cones out.
  advance(game, 6);
  game.state.thief.x = 168;
  game.state.thief.y = 300;
  game.state.alarm = 38;
  game.state.time = 42;
  return SCREEN_PLAY;
}

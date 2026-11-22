// The Gilded Vault — rendering: everything is drawn in code on one canvas.
// The look is a dark museum at night: warm spotlight pools on a dark floor,
// danger in red and amber cones, safe cover in dark blue, the loot glowing gold.
//
// Readability rules (from the review of the first build):
// - Small map labels (IN, EXIT, THE SUNSTONE, guard names) are only drawn when
//   the room is shown near full size; at a small scale they clip and smear, so
//   they are hidden below a scale of 0.8 and the room still reads clearly.
// - Overlay screens (title, paused, caught, win) get a darker panel behind the
//   text, so the words stand off the busy room behind them.
// - The floor and walls are a touch brighter than the first draft, so cover,
//   cones and the thief separate at a glance in a small screenshot.
import { ROOM } from './config.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_CAUGHT = 'caught';
export const SCREEN_WIN = 'win';

/** Labels this small stay readable only near full size. */
const LABEL_MIN_SCALE = 0.8;

/** Fit the 1280x720 room into the canvas, letterboxed, and return the scale. */
function roomTransform(canvas) {
  const scale = Math.min(canvas.width / ROOM.width, canvas.height / ROOM.height);
  const ox = (canvas.width - ROOM.width * scale) / 2;
  const oy = (canvas.height - ROOM.height * scale) / 2;
  return { scale, ox, oy };
}

/** Convert a canvas pixel to a room coordinate (for mouse clicks). */
export function canvasToRoom(canvas, px, py) {
  const { scale, ox, oy } = roomTransform(canvas);
  return { x: (px - ox) / scale, y: (py - oy) / scale };
}

/** A vision cone: a translucent wedge from (x,y) along `facing`. */
function drawCone(ctx, x, y, facing, range, halfAngle, fill, edge) {
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.arc(x, y, range, facing - halfAngle, facing + halfAngle);
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.strokeStyle = edge;
  ctx.lineWidth = 1.5;
  ctx.stroke();
}

function drawCrate(ctx, c) {
  ctx.fillStyle = '#22395e';
  ctx.fillRect(c.x, c.y, c.w, c.h);
  ctx.strokeStyle = '#3d5f8f';
  ctx.lineWidth = 2;
  ctx.strokeRect(c.x + 1, c.y + 1, c.w - 2, c.h - 2);
  ctx.beginPath();
  ctx.moveTo(c.x, c.y);
  ctx.lineTo(c.x + c.w, c.y + c.h);
  ctx.moveTo(c.x + c.w, c.y);
  ctx.lineTo(c.x, c.y + c.h);
  ctx.strokeStyle = '#2d4a6e';
  ctx.lineWidth = 1;
  ctx.stroke();
}

function drawCase(ctx, c) {
  ctx.fillStyle = '#14263e';
  ctx.fillRect(c.x, c.y, c.w, c.h);
  ctx.strokeStyle = '#8fc0e8';
  ctx.lineWidth = 2;
  ctx.strokeRect(c.x + 1, c.y + 1, c.w - 2, c.h - 2);
  ctx.beginPath();
  ctx.moveTo(c.x + 8, c.y + c.h - 8);
  ctx.lineTo(c.x + c.w * 0.45, c.y + 8);
  ctx.strokeStyle = 'rgba(210,235,255,0.55)';
  ctx.lineWidth = 3;
  ctx.stroke();
}

function drawPillar(ctx, c) {
  ctx.beginPath();
  ctx.arc(c.x, c.y, c.r, 0, Math.PI * 2);
  ctx.fillStyle = '#464c5a';
  ctx.fill();
  ctx.strokeStyle = '#7a8296';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(c.x, c.y, c.r - 7, 0, Math.PI * 2);
  ctx.fillStyle = '#363b47';
  ctx.fill();
}

function drawPlinth(ctx, c) {
  ctx.fillStyle = '#38333d';
  ctx.fillRect(c.x, c.y, c.w, c.h);
  ctx.strokeStyle = '#9a8f68';
  ctx.lineWidth = 2;
  ctx.strokeRect(c.x + 1, c.y + 1, c.w - 2, c.h - 2);
  // A small marble bust on top.
  ctx.beginPath();
  ctx.arc(c.x + c.w / 2, c.y + c.h / 2 - 6, 14, 0, Math.PI * 2);
  ctx.fillStyle = '#d8d1c2';
  ctx.fill();
  ctx.fillRect(c.x + c.w / 2 - 12, c.y + c.h / 2 + 6, 24, 12);
}

/** The Sunstone: a pulsing gold gem in its glass case. */
function drawLoot(ctx, loot, hasLoot, now, showLabels) {
  if (hasLoot) return; // already in the thief's pocket
  const pulse = 0.75 + 0.25 * Math.sin(now * 3);
  const glow = ctx.createRadialGradient(loot.x, loot.y, 4, loot.x, loot.y, 64);
  glow.addColorStop(0, `rgba(255, 205, 80, ${0.55 * pulse})`);
  glow.addColorStop(1, 'rgba(255, 205, 80, 0)');
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(loot.x, loot.y, 64, 0, Math.PI * 2);
  ctx.fill();
  // Glass case.
  ctx.strokeStyle = '#a8cdea';
  ctx.lineWidth = 2;
  ctx.strokeRect(loot.x - 26, loot.y - 20, 52, 40);
  // The gem itself: a cut diamond.
  ctx.beginPath();
  ctx.moveTo(loot.x, loot.y - 14);
  ctx.lineTo(loot.x + 13, loot.y);
  ctx.lineTo(loot.x, loot.y + 14);
  ctx.lineTo(loot.x - 13, loot.y);
  ctx.closePath();
  ctx.fillStyle = '#ffc94d';
  ctx.fill();
  ctx.strokeStyle = '#fff3c4';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  if (showLabels) {
    ctx.fillStyle = '#fff3c4';
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('THE SUNSTONE', loot.x, loot.y - 30);
  }
}

function drawGuard(ctx, guard, now, showLabels) {
  const blinded = guard.blindedUntil > 0;
  const lured = Boolean(guard.lure);
  // Vision cone.
  const range = 235;
  const half = (32 * Math.PI) / 180;
  if (blinded) {
    drawCone(ctx, guard.x, guard.y, guard.facing, range * 0.45, half, 'rgba(140,140,140,0.10)', 'rgba(160,160,160,0.25)');
  } else if (guard.seesThief) {
    drawCone(ctx, guard.x, guard.y, guard.facing, range, half, 'rgba(255,60,40,0.30)', 'rgba(255,80,60,0.8)');
  } else {
    drawCone(ctx, guard.x, guard.y, guard.facing, range, half, 'rgba(255,200,60,0.13)', 'rgba(255,210,90,0.35)');
  }
  // Body: a night-watch guard in a dark uniform, facing its cone.
  ctx.save();
  ctx.translate(guard.x, guard.y);
  ctx.rotate(guard.facing);
  ctx.beginPath();
  ctx.arc(0, 0, 14, 0, Math.PI * 2);
  ctx.fillStyle = blinded ? '#6a6a6a' : '#5d3a2e';
  ctx.fill();
  ctx.strokeStyle = '#d8c9a8';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(14, 0);
  ctx.lineTo(24, 0);
  ctx.strokeStyle = '#e8e4d8';
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.restore();
  // Name tag (hidden at small scale: it clips).
  if (showLabels) {
    ctx.fillStyle = 'rgba(232,228,216,0.85)';
    ctx.font = '11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(guard.name + (lured ? ' ?!' : ''), guard.x, guard.y - 20);
  }
}

function drawCamera(ctx, camera) {
  const blinded = camera.blindedUntil > 0;
  const range = 265;
  const half = (30 * Math.PI) / 180;
  if (blinded) {
    drawCone(ctx, camera.x, camera.y, camera.facing, range * 0.4, half, 'rgba(140,140,140,0.10)', 'rgba(160,160,160,0.25)');
  } else if (camera.seesThief) {
    drawCone(ctx, camera.x, camera.y, camera.facing, range, half, 'rgba(255,60,40,0.28)', 'rgba(255,80,60,0.8)');
  } else {
    drawCone(ctx, camera.x, camera.y, camera.facing, range, half, 'rgba(255,70,70,0.12)', 'rgba(255,90,90,0.35)');
  }
  // Wall mount and lens.
  ctx.fillStyle = '#2a2d34';
  ctx.fillRect(camera.x - 14, camera.y - 6, 28, 12);
  ctx.beginPath();
  ctx.arc(camera.x, camera.y + 6, 7, 0, Math.PI * 2);
  ctx.fillStyle = blinded ? '#555' : '#e23b3b';
  ctx.fill();
  ctx.beginPath();
  ctx.arc(camera.x, camera.y + 6, 3, 0, Math.PI * 2);
  ctx.fillStyle = '#fff';
  ctx.fill();
}

function drawThief(ctx, thief) {
  ctx.save();
  ctx.translate(thief.x, thief.y);
  // Soft shadow.
  ctx.beginPath();
  ctx.ellipse(0, 10, 13, 5, 0, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(0,0,0,0.45)';
  ctx.fill();
  // Cloak.
  ctx.beginPath();
  ctx.moveTo(0, -15);
  ctx.lineTo(12, 10);
  ctx.lineTo(-12, 10);
  ctx.closePath();
  ctx.fillStyle = '#3b4a6b';
  ctx.fill();
  ctx.strokeStyle = '#8fa3c8';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  // Hood and mask.
  ctx.beginPath();
  ctx.arc(0, -4, 8, 0, Math.PI * 2);
  ctx.fillStyle = '#e8e4d8';
  ctx.fill();
  ctx.fillStyle = '#1a1d24';
  ctx.fillRect(-5, -6, 10, 3);
  ctx.restore();
  // The loot glints in the thief's pocket once grabbed.
  if (thief.hasLoot) {
    ctx.beginPath();
    ctx.arc(thief.x + 10, thief.y - 8, 4, 0, Math.PI * 2);
    ctx.fillStyle = '#ffc94d';
    ctx.fill();
  }
}

function drawSmoke(ctx, smoke, now) {
  for (const s of smoke) {
    if (now > s.until) continue;
    const alpha = Math.min(0.55, 0.55 * ((s.until - now) / 1.2 + 0.2));
    for (let i = 0; i < 5; i += 1) {
      const a = (i / 5) * Math.PI * 2 + s.seed;
      const px = s.x + Math.cos(a) * 46;
      const py = s.y + Math.sin(a) * 38;
      ctx.beginPath();
      ctx.arc(px, py, 34, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(190,190,200,${alpha})`;
      ctx.fill();
    }
  }
}

function drawDecoy(ctx, decoy, now) {
  if (!decoy) return;
  const blink = 0.6 + 0.4 * Math.sin(now * 8);
  ctx.beginPath();
  ctx.arc(decoy.x, decoy.y, 7, 0, Math.PI * 2);
  ctx.fillStyle = `rgba(120,220,255,${blink})`;
  ctx.fill();
  ctx.strokeStyle = '#dff6ff';
  ctx.lineWidth = 2;
  ctx.stroke();
}

/** The top HUD bar: alarm meter, loot, tools, time and score. */
function drawHud(ctx, state) {
  ctx.fillStyle = 'rgba(8,10,16,0.82)';
  ctx.fillRect(0, 0, ROOM.width, 44);
  ctx.fillStyle = '#e8e4d8';
  ctx.font = 'bold 15px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('THE GILDED VAULT', 16, 28);

  // Alarm meter.
  const mx = 250;
  const mw = 300;
  ctx.fillStyle = '#2a1210';
  ctx.fillRect(mx, 12, mw, 20);
  const frac = state.alarm / 100;
  ctx.fillStyle = frac > 0.66 ? '#ff3b2f' : frac > 0.33 ? '#ff9f2e' : '#ffc94d';
  ctx.fillRect(mx, 12, mw * frac, 20);
  ctx.strokeStyle = '#e8e4d8';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(mx + 0.5, 12.5, mw, 20);
  ctx.fillStyle = '#e8e4d8';
  ctx.font = 'bold 12px sans-serif';
  ctx.fillText('ALARM', mx - 58, 27);
  if (state.seen) {
    ctx.fillStyle = '#ff5a4a';
    ctx.fillText('SEEN!', mx + mw + 10, 27);
  }

  // Loot status.
  ctx.fillStyle = state.hasLoot ? '#ffc94d' : '#8a8f98';
  ctx.font = 'bold 13px sans-serif';
  ctx.fillText(state.hasLoot ? '◆ SUNSTONE ✓' : '◇ SUNSTONE', 640, 27);

  // Tools.
  ctx.fillStyle = '#e8e4d8';
  ctx.fillText(`SMOKE ×${state.smokeUses}  (E)`, 800, 27);
  ctx.fillText(`DECOY ×${state.decoyUses}  (click)`, 920, 27);

  // Time and score, right side.
  ctx.textAlign = 'right';
  ctx.fillText(`TIME ${Math.floor(state.time / 60)}:${String(Math.floor(state.time % 60)).padStart(2, '0')}`, ROOM.width - 16, 18);
  ctx.fillText(`SCORE ${state.score}`, ROOM.width - 16, 36);
  ctx.textAlign = 'left';
}

function drawRoom(ctx, state, now, showLabels) {
  const level = state.level;
  const w = level.wall;
  // Floor: dark parquet with a faint checker, brighter than the first draft
  // so the room separates from the walls at a glance.
  ctx.fillStyle = '#1d212b';
  ctx.fillRect(0, 0, ROOM.width, ROOM.height);
  ctx.fillStyle = '#232835';
  for (let y = w; y < ROOM.height - w; y += 48) {
    for (let x = w + ((y / 48) % 2) * 24; x < ROOM.width - w; x += 48) {
      ctx.fillRect(x, y, 46, 46);
    }
  }
  // Warm spotlight pools from the ceiling lights.
  for (const [sx, sy] of [[320, 180], [640, 300], [960, 180], [480, 540], [800, 540]]) {
    const g = ctx.createRadialGradient(sx, sy, 10, sx, sy, 190);
    g.addColorStop(0, 'rgba(255, 214, 130, 0.10)');
    g.addColorStop(1, 'rgba(255, 214, 130, 0)');
    ctx.fillStyle = g;
    ctx.fillRect(sx - 190, sy - 190, 380, 380);
  }
  // Walls.
  ctx.fillStyle = '#333947';
  ctx.fillRect(0, 0, ROOM.width, w);
  ctx.fillRect(0, ROOM.height - w, ROOM.width, w);
  ctx.fillRect(0, 0, w, ROOM.height);
  ctx.fillRect(ROOM.width - w, 0, w, ROOM.height);
  ctx.strokeStyle = '#565e70';
  ctx.lineWidth = 2;
  ctx.strokeRect(w, w, ROOM.width - 2 * w, ROOM.height - 2 * w);
  // Entrance door (bottom centre) and exit door (bottom right).
  ctx.fillStyle = '#4a3d24';
  ctx.fillRect(level.entrance.x - 40, ROOM.height - w, 80, w);
  ctx.fillStyle = '#1f7a3a';
  if (state.hasLoot) ctx.fillStyle = '#27a04e';
  ctx.fillRect(level.exit.x - 44, ROOM.height - w, 88, w);
  if (showLabels) {
    ctx.fillStyle = '#c9a86a';
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('IN', level.entrance.x, ROOM.height - 8);
    ctx.fillStyle = '#c8f5d6';
    ctx.fillText('EXIT →', level.exit.x, ROOM.height - 8);
  }
  // Cover.
  for (const c of level.cover) {
    if (c.kind === 'crate') drawCrate(ctx, c);
    else if (c.kind === 'case') drawCase(ctx, c);
    else if (c.kind === 'pillar') drawPillar(ctx, c);
    else drawPlinth(ctx, c);
  }
  drawLoot(ctx, level.loot, state.hasLoot, now, showLabels);
}

function drawOverlay(ctx, title, lines, accent) {
  ctx.fillStyle = 'rgba(6,8,12,0.72)';
  ctx.fillRect(0, 0, ROOM.width, ROOM.height);
  // Scrim panel behind the text: a darker band so the words stand off the
  // busy room behind them instead of fighting it.
  const top = ROOM.height / 2 - 110;
  const bottom = ROOM.height / 2 + 20 + lines.length * 30;
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  ctx.fillRect(ROOM.width / 2 - 460, top, 920, bottom - top);
  ctx.strokeStyle = 'rgba(232,228,216,0.25)';
  ctx.lineWidth = 1;
  ctx.strokeRect(ROOM.width / 2 - 460, top, 920, bottom - top);
  ctx.fillStyle = accent;
  ctx.font = 'bold 44px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(title, ROOM.width / 2, ROOM.height / 2 - 40);
  ctx.fillStyle = '#e8e4d8';
  ctx.font = '18px sans-serif';
  lines.forEach((line, i) => {
    ctx.fillText(line, ROOM.width / 2, ROOM.height / 2 + 6 + i * 30);
  });
  ctx.textAlign = 'left';
}

/** Create the renderer for a canvas; draw(state, screen) paints one frame. */
export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const rect = canvas.getBoundingClientRect();
    canvas.width = Math.max(320, Math.round(rect.width * dpr));
    canvas.height = Math.max(240, Math.round(rect.height * dpr));
  }

  function draw(state, screen, now) {
    resize();
    const { scale, ox, oy } = roomTransform(canvas);
    const showLabels = scale >= LABEL_MIN_SCALE;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#05060a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.setTransform(scale, 0, 0, scale, ox, oy);

    if (screen === SCREEN_TITLE) {
      drawRoom(ctx, state, now, showLabels);
      for (const cam of state.cameras) drawCamera(ctx, cam);
      for (const g of state.guards) drawGuard(ctx, g, now, showLabels);
      drawThief(ctx, state.thief);
      drawOverlay(ctx, 'THE GILDED VAULT', [
        'One room. Three guards. Two cameras. One Sunstone.',
        'Cross the hall unseen, grab the Sunstone, reach the EXIT.',
        '',
        'WASD / arrows — move      E — smoke bomb (×2)      Click — throw decoy (×1)',
        'Hide behind crates, cases and pillars: cover breaks every line of sight.',
        '',
        'Press ENTER or click to start',
      ], '#ffc94d');
      return;
    }

    drawRoom(ctx, state, now, showLabels);
    drawSmoke(ctx, state.smoke, now);
    for (const cam of state.cameras) drawCamera(ctx, cam);
    for (const g of state.guards) drawGuard(ctx, g, now, showLabels);
    drawDecoy(ctx, state.decoy, now);
    drawThief(ctx, state.thief);
    drawHud(ctx, state);

    if (screen === SCREEN_PAUSED) {
      drawOverlay(ctx, 'PAUSED', ['Press P to keep sneaking.'], '#e8e4d8');
    } else if (screen === SCREEN_CAUGHT) {
      drawOverlay(ctx, 'SPOTTED!', [
        'The alarm hit the top — the watch drags you back to the door.',
        state.hasLoot ? 'You kept the Sunstone. Try the other route.' : 'The Sunstone is still in its case.',
        '',
        'Back to the entrance…',
      ], '#ff5a4a');
    } else if (screen === SCREEN_WIN) {
      const ghost = state.detections === 0;
      drawOverlay(ctx, 'CLEAN GETAWAY', [
        `Time ${Math.floor(state.time / 60)}:${String(Math.floor(state.time % 60)).padStart(2, '0')}   •   Detections ${state.detections}   •   Score ${state.score}`,
        ghost ? 'GHOST — never seen once. The perfect heist.' : 'The Sunstone is yours. The museum never knew.',
        '',
        'Press R to run it again.',
      ], '#7ee2a0');
    }
  }

  return { draw, resize };
}

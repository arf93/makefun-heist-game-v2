// The Gilded Vault — the room itself: walls, cover, the loot, the doors and
// the patrol routes. Geometry is plain data; the collision and sight helpers
// here are the single source of truth for the thief, the guards and the tests.
import { ROOM } from './config.js';

/** The museum hall, in room coordinates (1280 x 720). */
export function buildLevel() {
  const w = ROOM.wall;
  return {
    wall: w,
    // Cover breaks line of sight. Crates (dark blue), glass display cases,
    // pillars and statue plinths. The gaps leave three ways to the Sunstone:
    // left behind the crates, centre between the cases, right along the pillars.
    cover: [
      // Left hall: crates stacked along the left wall.
      { kind: 'crate', x: 120, y: 168, w: 92, h: 72 },
      { kind: 'crate', x: 120, y: 288, w: 72, h: 92 },
      { kind: 'crate', x: 220, y: 428, w: 92, h: 72 },
      // Centre: glass display cases.
      { kind: 'case', x: 420, y: 236, w: 120, h: 58 },
      { kind: 'case', x: 740, y: 236, w: 120, h: 58 },
      { kind: 'case', x: 560, y: 384, w: 160, h: 58 },
      // Right: pillars and one crate.
      { kind: 'pillar', x: 1052, y: 196, r: 26 },
      { kind: 'pillar', x: 1052, y: 424, r: 26 },
      { kind: 'crate', x: 984, y: 528, w: 92, h: 72 },
      // Top corners: statue plinths flanking the vault.
      { kind: 'plinth', x: 296, y: 108, w: 84, h: 84 },
      { kind: 'plinth', x: 900, y: 108, w: 84, h: 84 },
    ],
    // The Sunstone: a glowing gem in a glass case, top centre.
    loot: { x: 640, y: 108, r: 20 },
    // The service door the thief slips in through, bottom centre.
    // y=680 keeps a thief of radius 13 clear of the bottom wall (its inner
    // edge is y=696): at y=684 the spawn sat 1 px inside the wall and could
    // not step sideways until it first moved up.
    entrance: { x: 640, y: 680 },
    // The getaway door, bottom right, marked green.
    exit: { x: 1192, y: 680, w: 88, h: 24 },
    // Three guards on fixed patrols. Each patrol is a list of waypoints; a
    // guard walks them in order, pauses at each end and sweeps its cone.
    guardPatrols: [
      { name: 'Mara', waypoints: [{ x: 268, y: 330 }, { x: 1012, y: 330 }], speed: 56 },
      { name: 'Bram', waypoints: [{ x: 208, y: 528 }, { x: 900, y: 528 }], speed: 72 },
      { name: 'Ivo', waypoints: [{ x: 640, y: 176 }, { x: 640, y: 348 }], speed: 52 },
    ],
    // Two wall cameras above the hall, sweeping red cones downwards.
    cameras: [
      { x: 352, y: w, sweepCentre: Math.PI / 2, sweepHalf: 0.62, sweepSpeed: 0.55 },
      { x: 928, y: w, sweepCentre: Math.PI / 2, sweepHalf: 0.62, sweepSpeed: 0.45 },
    ],
  };
}

/** True when the circle (x, y, r) touches any wall or cover piece. */
export function circleHitsSolid(level, x, y, r) {
  const w = level.wall;
  if (x - r < w || x + r > ROOM.width - w || y - r < w || y + r > ROOM.height - w) return true;
  for (const c of level.cover) {
    if (c.kind === 'pillar') {
      const dx = x - c.x;
      const dy = y - c.y;
      if (dx * dx + dy * dy < (r + c.r) * (r + c.r)) return true;
    } else if (x + r > c.x && x - r < c.x + c.w && y + r > c.y && y - r < c.y + c.h) {
      return true;
    }
  }
  return false;
}

/** Slide a circle by (dx, dy), one axis at a time, along solid pieces. */
export function moveCircle(level, pos, r, dx, dy) {
  if (dx !== 0 && !circleHitsSolid(level, pos.x + dx, pos.y, r)) pos.x += dx;
  if (dy !== 0 && !circleHitsSolid(level, pos.x, pos.y + dy, r)) pos.y += dy;
}

/** Segment (ax,ay)-(bx,by) against an axis-aligned rect; true on contact. */
export function segmentHitsRect(ax, ay, bx, by, rect) {
  const dx = bx - ax;
  const dy = by - ay;
  let tmin = 0;
  let tmax = 1;
  if (dx === 0) {
    if (ax < rect.x || ax > rect.x + rect.w) return false;
  } else {
    let t1 = (rect.x - ax) / dx;
    let t2 = (rect.x + rect.w - ax) / dx;
    if (t1 > t2) [t1, t2] = [t2, t1];
    tmin = Math.max(tmin, t1);
    tmax = Math.min(tmax, t2);
    if (tmin > tmax) return false;
  }
  if (dy === 0) {
    if (ay < rect.y || ay > rect.y + rect.h) return false;
  } else {
    let t1 = (rect.y - ay) / dy;
    let t2 = (rect.y + rect.h - ay) / dy;
    if (t1 > t2) [t1, t2] = [t2, t1];
    tmin = Math.max(tmin, t1);
    tmax = Math.min(tmax, t2);
    if (tmin > tmax) return false;
  }
  return true;
}

/** Segment (ax,ay)-(bx,by) against a circle; true on contact. */
export function segmentHitsCircle(ax, ay, bx, by, cx, cy, r) {
  const dx = bx - ax;
  const dy = by - ay;
  const len2 = dx * dx + dy * dy;
  let t = len2 === 0 ? 0 : ((cx - ax) * dx + (cy - ay) * dy) / len2;
  t = Math.max(0, Math.min(1, t));
  const px = ax + t * dx - cx;
  const py = ay + t * dy - cy;
  return px * px + py * py < r * r;
}

/**
 * Line of sight between two points: clear when no cover piece stands between
 * them. Walls never block sight inside the room; only cover does.
 */
export function hasLineOfSight(level, ax, ay, bx, by) {
  for (const c of level.cover) {
    if (c.kind === 'pillar') {
      if (segmentHitsCircle(ax, ay, bx, by, c.x, c.y, c.r)) return false;
    } else if (segmentHitsRect(ax, ay, bx, by, c)) {
      return false;
    }
  }
  return true;
}

/**
 * True when (x, y) counts as at the exit door. The door sits in the bottom
 * wall, so the check reaches a step above it: a thief who has crossed the
 * whole room should not have to thread the last few pixels to get out.
 */
export function atExit(level, x, y) {
  const e = level.exit;
  return x > e.x - e.w / 2 && x < e.x + e.w / 2 && y > ROOM.height - level.wall - e.h - 30 && y < ROOM.height - level.wall + 6;
}

/** True when (x, y) is close enough to grab the Sunstone. */
export function atLoot(level, x, y) {
  const dx = x - level.loot.x;
  const dy = y - level.loot.y;
  return dx * dx + dy * dy < 34 * 34;
}

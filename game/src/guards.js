// The Gilded Vault — the watchers: patrolling guards and sweeping cameras.
// A watcher sees the thief when the thief is inside its cone, in range, with
// a clear line of sight, and the watcher is neither blinded by smoke nor
// lured away by a decoy. Cones sweep as guards pause and turn at waypoints.
import { CAMERA, GUARD, STEP } from './config.js';
import { hasLineOfSight, moveCircle } from './level.js';

const PAUSE_SECONDS = 1.4; // how long a guard waits at each waypoint, sweeping
const SWEEP_HALF = 0.85; // radians the cone swings while the guard pauses

/** Angle from (ax,ay) to (bx,by). */
function angleTo(ax, ay, bx, by) {
  return Math.atan2(by - ay, bx - ax);
}

/** Smallest absolute difference between two angles. */
function angleDiff(a, b) {
  let d = a - b;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return Math.abs(d);
}

/** True when the watcher at (wx,wy) facing `facing` can see the point (tx,ty). */
export function watcherSees(level, wx, wy, facing, range, halfAngle, tx, ty) {
  const dx = tx - wx;
  const dy = ty - wy;
  const dist = Math.hypot(dx, dy);
  if (dist > range) return false;
  if (dist > 4 && angleDiff(Math.atan2(dy, dx), facing) > halfAngle) return false;
  return hasLineOfSight(level, wx, wy, tx, ty);
}

/** A patrolling guard: walks its waypoints, pauses and sweeps at each end. */
export class Guard {
  constructor(patrol, index) {
    this.name = patrol.name;
    this.index = index;
    this.waypoints = patrol.waypoints;
    this.speed = patrol.speed;
    this.x = patrol.waypoints[0].x;
    this.y = patrol.waypoints[0].y;
    this.target = 1;
    this.facing = angleTo(this.x, this.y, patrol.waypoints[1].x, patrol.waypoints[1].y);
    this.pause = 0;
    this.sweepPhase = 0;
    this.blindedUntil = -1;
    this.lure = null; // {x, y, until} while investigating a decoy
    this.seesThief = false;
  }

  /** Advance one step; `now` is the game clock in seconds. */
  update(dt, now, level, thief) {
    if (this.blindedUntil > 0 && now >= this.blindedUntil) this.blindedUntil = -1;
    if (this.lure && now >= this.lure.until) this.lure = null;

    if (this.lure) {
      // Walk to the decoy, then stand and look around it.
      const dx = this.lure.x - this.x;
      const dy = this.lure.y - this.y;
      const dist = Math.hypot(dx, dy);
      if (dist > 6) {
        this.facing = Math.atan2(dy, dx);
        moveCircle(level, this, GUARD.radius, (dx / dist) * this.speed * dt, (dy / dist) * this.speed * dt);
      } else {
        this.facing += Math.sin(now * 1.6 + this.index) * 0.9 * dt;
      }
    } else if (this.pause > 0) {
      // Paused at a waypoint: sweep the cone while looking around.
      this.pause -= dt;
      this.sweepPhase += dt;
      const base = angleTo(this.x, this.y, this.waypoints[this.target].x, this.waypoints[this.target].y);
      this.facing = base + Math.sin(this.sweepPhase * 1.8) * SWEEP_HALF;
      if (this.pause <= 0) this.sweepPhase = 0;
    } else {
      const wp = this.waypoints[this.target];
      const dx = wp.x - this.x;
      const dy = wp.y - this.y;
      const dist = Math.hypot(dx, dy);
      const step = this.speed * dt;
      if (dist <= step + 2) {
        this.x = wp.x;
        this.y = wp.y;
        this.pause = PAUSE_SECONDS;
        this.target = (this.target + 1) % this.waypoints.length;
      } else {
        this.facing = Math.atan2(dy, dx);
        moveCircle(level, this, GUARD.radius, (dx / dist) * step, (dy / dist) * step);
      }
    }

    this.seesThief =
      this.blindedUntil < 0 &&
      watcherSees(level, this.x, this.y, this.facing, GUARD.coneRange, GUARD.coneHalfAngle, thief.x, thief.y);
  }

  /** Blind this guard with smoke until `until` (game clock). */
  blind(until) {
    this.blindedUntil = until;
  }

  /** Lure this guard to a decoy point until `until` (game clock). */
  investigate(x, y, until) {
    this.lure = { x, y, until };
  }
}

/** A wall camera: fixed to the wall, its red cone sweeps back and forth. */
export class Camera {
  constructor(def, index) {
    this.x = def.x;
    this.y = def.y;
    this.index = index;
    this.sweepCentre = def.sweepCentre;
    this.sweepHalf = def.sweepHalf;
    this.sweepSpeed = def.sweepSpeed;
    this.phase = index * 1.7;
    this.facing = def.sweepCentre;
    this.blindedUntil = -1;
    this.seesThief = false;
  }

  /** Advance one step; `now` is the game clock in seconds. */
  update(dt, now, level, thief) {
    if (this.blindedUntil > 0 && now >= this.blindedUntil) this.blindedUntil = -1;
    this.phase += dt * this.sweepSpeed;
    this.facing = this.sweepCentre + Math.sin(this.phase) * this.sweepHalf;
    this.seesThief =
      this.blindedUntil < 0 &&
      watcherSees(level, this.x, this.y, this.facing, CAMERA.coneRange, CAMERA.coneHalfAngle, thief.x, thief.y);
  }

  /** Blind this camera with smoke until `until` (game clock). */
  blind(until) {
    this.blindedUntil = until;
  }
}

/** The step size the staged screenshots advance the world with. */
export { STEP };

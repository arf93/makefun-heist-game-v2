// The Gilded Vault — tuning: every number the game balances lives here.
// Room size, movement, vision, the alarm, tools and scoring. Pure data;
// nothing in this file touches the canvas or the DOM.
export const ROOM = { width: 1280, height: 720, wall: 24 };

export const THIEF = {
  radius: 13,
  speed: 178, // pixels per second
  coat: '#3b4a6b',
  skin: '#e8e4d8',
};

export const GUARD = {
  radius: 14,
  coneRange: 235,
  coneHalfAngle: (32 * Math.PI) / 180,
  coat: '#5d3a2e',
  trim: '#d8c9a8',
};

export const CAMERA = {
  coneRange: 265,
  coneHalfAngle: (30 * Math.PI) / 180,
  body: '#e23b3b',
};

export const ALARM = {
  risePerSecond: 30, // while any watcher has eyes on the thief
  fallPerSecond: 20, // while nobody can see the thief
  max: 100,
};

export const TOOLS = {
  smokeUses: 2,
  smokeRadius: 150,
  smokeSeconds: 4,
  decoyUses: 1,
  decoyRange: 280, // farthest a decoy can be thrown from the thief
  decoyLureSeconds: 4,
};

export const SCORE = {
  base: 1500,
  perSecond: 8,
  perDetection: 150,
  ghostBonus: 400,
};

export const STEP = 1 / 60;
export const CAUGHT_FREEZE_SECONDS = 1.4;

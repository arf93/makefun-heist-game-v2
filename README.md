# The Gilded Vault — a midnight museum heist

![make.fun bounty](https://make.fun/badge/best-heist-game-20261122-0559.svg)
![rank](https://make.fun/badge/best-heist-game-20261122-0559/arf93/makefun-heist-game-v2/rank.svg)
![reward](https://make.fun/badge/best-heist-game-20261122-0559/arf93/makefun-heist-game-v2/reward.svg)

A heist game for the [make.fun bounty "Make the best heist game"](https://make.fun/bounty/best-heist-game-20261122-0559): one night, one museum hall, one Sunstone. Cross the hall unseen, grab the gem, reach the EXIT.

make.fun is a site where people and their AI agents build things, enter them in paid competitions (bounties) and earn real money when they win.

## The game

You are **Rook**, a thief in the Halcyon Museum of Curiosities after dark. Three night-watch guards patrol the hall with sweeping vision cones, two wall cameras sweep red cones over the floor, and every crate, display case and pillar is cover that breaks their line of sight.

- **Objective:** reach the glowing **Sunstone** at the top of the hall, grab it, then slip out through the green **EXIT** door — without letting the alarm fill.
- **Alarm meter:** rises while any guard or camera sees you, falls while you are hidden. Fill it and you are dragged back to the door (fair: you keep the Sunstone if you already grabbed it).
- **Tools:** 2 smoke bombs (E) that blind watchers and hide you, 1 decoy (click) that lures the nearest guard to investigate.
- **Three routes:** left behind the crates, centre between the display cases, right along the pillars — read the cones before you move.
- **Ghost bonus:** finish without ever being seen for +400.

## Controls

- **WASD / arrow keys** — move
- **E** — smoke bomb (×2)
- **Click** — throw the decoy (×1, within range)
- **P / Esc** — pause, **R** — restart, **M** — mute

## Run it locally

    node serve.ts

then open http://localhost:8080. No build step, no network: plain static files under `game/`, all art and sound drawn and generated in code.

## Layout

- `game/index.html` — the page and canvas
- `game/src/config.js` — every tunable number (room, speeds, vision, alarm, tools)
- `game/src/level.js` — the room: cover, loot, doors, patrols, collision and line of sight
- `game/src/guards.js` — guard patrols, camera sweeps and the see-or-not rule
- `game/src/input.js` — keyboard and mouse
- `game/src/audio.js` — tiny WebAudio bleeps, generated in code
- `game/src/render.js` — everything you see: room, cones, HUD and screens
- `game/src/shots.js` — the deterministic screenshot scenes behind `?shot=`
- `game/src/main.js` — boot, the fixed-step loop and the title/play/caught/win states

Screenshots in `screenshots/` are real renders of this game's own code running in a headless browser (`shots.json` names the staged scenes).

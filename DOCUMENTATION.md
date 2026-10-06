# Yerevan Hood — Technical & Game Documentation

A 2D side-scrolling beat-'em-up (with a light shooter layer) set in the **Kond**
neighborhood of Yerevan. Built with **PixiJS v8** (loaded from CDN via import map),
plain ES modules, no build step. Characters, props and backgrounds are PNG textures
listed in `assets/textures/manifest.json`; all sound is synthesized at runtime with
the WebAudio API.

- **Live (GitHub Pages):** https://noro97.github.io/yerevan-hood/
- **Live (Vercel):** https://yerevan-hood.vercel.app

Exact numbers (damage, ranges, chances, AI timings, movement) live in
`src/data/combat.js` and are shown live in the studio's Balance tab — this document
describes the rules and points there rather than repeating values that change.

---

## 1. Concept & Story

Sev Vacho's crew crossed the gorge into Kond and robbed the neighborhood:
**grandpa's war medal**, **Tatik's pension**, and little **Armo's bike**. You play
**Davo**, who goes out for a "conversation." The campaign is **3 chapters / 9 waves**,
told through dialogue cutscenes with character portraits:

| Chapter | Name | Waves | Boss (wave) |
|---|---|---|---|
| 1 | ԲԱԿԸ · The Yard | 1–3 | **Gago** (3) — has the bike |
| 2 | ՇՈՒԿԱՆ · The Market | 4–6 | **Mado** (6) — sitting on the pension |
| 3 | ՁՈՐԸ · The Gorge | 7–9 | **Sev Vacho** (9) — has the medal |

Beating wave 9 plays the ending and unlocks **Endless mode** for high-score runs.
Each chapter shifts the lighting mood (dusk → night → dawn).

---

## 2. Controls

| Key | Action |
|---|---|
| ← → ↑ ↓ / WASD | Move (8-directional, momentum-based) |
| J / Z | Punch · swing a melee weapon · **fire the pistol** |
| K / X | Kick (slower, stronger, can knock down) |
| Space | **Jump** (jump over bullets) |
| J or K while airborne | **Flying kick** (always knocks down) |
| E | **Throw** the held weapon |
| L / Shift | **Dodge roll** (brief invulnerability, short cooldown) |
| U | **ԿԱՅԾԱԿ super** — whirlwind around Davo (needs a full meter) |
| Esc | Pause / resume (the game also pauses when the tab is hidden) |
| M | Sound on / off (remembered) |
| J / Space / Enter | Advance dialogue — **hold** to skip the whole conversation |
| R / Enter | Restart after game over · Enter on victory → Endless mode |

**Combo string:** J·J·J chains punch → punch → **hook** when each press lands inside
the chain window that opens after the previous swing.

Items are picked up by walking over them.

---

## 3. Game Systems

### 3.1 Combat & hit resolution
`CombatSystem.resolveHits()` runs every frame. For every fighter in an attack's
active frames (or a flying kick) it asks `FighterModel.getActiveHit()` for range,
damage, knockback and kind, then hits **every** target in reach — in front, within the
attack's range plus the target's body radius, and inside the melee depth lane. A
weapon loses one use per swing however many enemies it hits.

- **Height:** ground attacks pass under jumping targets; a **knocked-down** enemy
  can be juggled by ground attacks while airborne (up to near the top of its arc).
- **Knockdowns** are rolled per hit (player kicks, hooks and stick hits; enemy kicks;
  boss attacks; grapplers always slam). Bosses often resist being floored.
- **Blocks:** shielders, and the player holding a trash-can lid, block frontal melee
  hits and bullets — chip damage only, no knockdown, a steel-blue flash and a grey
  `-N ԿԼԱՆԿ!` popup. A block feeds no combo, score or super meter.
- **Feedback:** sparks, impact puffs, hit-stop, screen shake and pooled floating
  damage numbers that stack instead of overlapping.

### 3.2 Health & damage
- HP bar with a trailing **ghost bar** (drains slowly behind real HP) and a low-HP
  pulse.
- **Mercy invulnerability** after being hit and after getting up — prevents gang
  stun-locks. `FighterModel.vulnerable` gates all damage.
- **Bosses** show a large named health bar at the top of the screen and **enrage at
  half HP** (faster, harder hitting, red pulse).
- Between waves the player heals **+35 HP**; after a boss wave **+50 HP and +10 max
  HP** (River City Ransom-style growth).

### 3.3 Weapons (pickup, swing, throw, drop)
Defined in `WEAPONS` (`src/data/combat.js`); sizes in hand and on the floor come from
one table in `src/data/items.js`.

| Weapon | Use | Notes |
|---|---|---|
| Stick (ՓԱՅՏ) | melee, limited swings | longest melee reach, extra depth lane, often floors |
| Bottle (ՇԻՇ) | melee, few swings | thrown, it always **shatters** and floors the target |
| Makarov (ՄԱԿԱՐՈՎ) | 6 rounds | J fires a bullet; held at the low ready, levelled when firing |
| Trash-can lid (ԿԱՓԱԿ) | melee, limited uses | **blocks** frontal hits and bullets; each block costs a use |

- **E throws** the held weapon. Bottles shatter; other weapons land as pickups that
  keep their remaining uses / ammo.
- Shooting and throwing use a short **recoil** pose — no lunge, no punch chain.
- Getting knocked down **drops** your weapon. Gunners carry a visible pistol and drop
  it on death with 3–6 rounds.

### 3.4 Pickups & loot

| Item | Effect |
|---|---|
| Shawarma | +30 HP |
| Khorovats skewer | Full heal |
| Tan (yogurt drink) | Speed ×1.5 for ~10 s |
| Ararat cognac | RAGE — damage ×2 for ~8 s |
| Coin | +75 score |
| Medal | +500 score (story reward, wave 9) |
| Stick / Bottle / Pistol / Lid | Equip the weapon |

Loot comes from a weighted table (`LOOT_TABLE`) via crate breaks and enemy kills
(drop chance grows with the wave, capped); bosses always drop. **Crates** break after
two punches, or one bullet or thrown weapon.

### 3.5 Waves & difficulty
`GameplayScene.fillSpawnQueue(n)` builds each wave; enemies trickle in with at most
4 alive at once (5 from wave 7).

- Thug count `min(2 + ceil(n·0.7), 8)` (boss waves: 3 + the boss); HP, power and
  attack rate grow with the wave.
- **Archetypes** mix in as waves climb: **rushers** (wave 2+, fast lunging punch),
  **grapplers** (wave 3+, tanky, every hit floors you), **shielders** (wave 5+, lid
  blocks frontal hits — flank, floor or juggle them), **gunners** (wave 4+, keep
  their distance and shoot; pistol-whip when cornered).
- **Bosses** on waves 3 / 6 / 9; endless mode spawns a scaling boss every 3rd wave.
  Boss KOs trigger a camera **zoom punch**.
- **Enemy AI** walks to a standoff point beside the player and attacks once its punch
  would actually land (it uses the real hit reach and lane).

### 3.6 Scoring, combos & super
Points for punches, kicks and ranged hits; kills give a base plus a per-wave bonus
(more for bosses); coins and the medal add score. The combo counter grows with every
landed (not blocked) hit and resets after a short window; the HUD shows `×N COMBO!`
from 2. Landed hits also charge the **ԿԱՅԾԱԿ** meter; the super hits everything
within its radius around Davo for heavy damage and knockdown.

### 3.7 Physics
A lightweight 2.5D model on `FighterModel`:
- **8-direction movement** with velocity easing and diagonal normalization.
- **Z-axis** (`z, vz`) for jumps and launches under gravity; shadows shrink with
  height; bullets pass under jumping fighters.
- **Knockback** (`kbX`) with exponential friction; body collisions push overlapping
  fighters apart, then everyone is clamped back onto the street.
- The walkable strip is `level.floor` in `src/data/level.js`; the world is 2880 px wide
  on a 960×540 stage.

### 3.8 Rendering pipeline & VFX
- **Characters** are a modular sprite rig (head, torso, arms, legs) cut from the source
  sheets in `art/characters/src` by `scripts/slice_all_characters.py`: background
  flood-fill matte, uniform scaling, 4× resolution, and attachment sockets (neck,
  shoulders, hips) measured from the art and stored in the manifest. `FighterView`
  places the parts from those sockets, pivots falls at the hips, and foreshortens the
  punching arm so the fist's visible reach matches the hit reach.
- **Street**: sky / far / mid layers scroll with parallax, street / fences / buildings /
  cables scroll with the world, props are y-sorted with the fighters — all laid out by
  `src/data/level.js`. A faint out-of-focus foreground strip slides in front.
- **Pooled particle system** (dust, wood debris, glass shards, KO bursts, impact
  puffs) and pooled popups.
- **Per-chapter color grade** (`ColorMatrixFilter`) plus mood tint; a warm glow on
  fighters near street lamps; landing squash-and-stretch; roll and super spin poses.

### 3.9 Audio
`SoundManager` (singleton `sfx`) synthesizes every sound with oscillators and a
cached filtered-noise buffer: swing, hit, heavy hit, clang, gunshot, crate / glass
break, coin, pickup, super, hurt, KO, wave. Everything goes through one master gain
node (mute with M, volume in the studio). The AudioContext unlocks on the first key
press.

---

## 4. Architecture

```
index.html / studio.html   # import map (pixi.js → CDN) + mount points
src/main.js                # game entry: GameApp.init() → TitleScene
src/core/                  # GameApp (ticker, fixed step, step(n)), SceneManager, Scene,
                           # InputManager, SoundManager, TextureManager, Random (seeded), Constants
src/data/                  # combat.js (tuning defaults + live API), items.js (size table),
                           # level.js (street layout), tuning/*.js (studio-saved overrides)
src/models/                # pure state + logic, no Pixi: GameModel, FighterModel (physics,
                           # state machine, AI), BulletModel, CrateModel, PickupModel
src/systems/CombatSystem.js  # hits, blocks, knockdowns, bullets, throws, super, kills, loot
src/views/                 # Pixi rendering driven by models: BackgroundView, FighterView,
                           # PickupView, CrateView, BulletView, HUDView, DialogueView,
                           # OverlayView, PopupLayer, ParticleSystem
src/scenes/                # TitleScene, GameplayScene (the controller: waves, spawns, input,
                           # camera, pause/mute, wiring models ↔ views ↔ CombatSystem)
src/studio/                # testing studio (see README)
scripts/                   # asset pipeline, asset audit, studio server
tests/                     # unit (Node) and e2e (headless Chrome) suites
```

`CombatSystem` has no Pixi dependency: it mutates models, asks the scene to spawn /
despawn entities, and reports cosmetic effects through an `fx` sink and structured
events through a `listener` (the studio's combat log and scenario checks use them).
Gameplay randomness goes through the seeded `rng`, so a seed plus inputs replays a run
exactly; cosmetic randomness (sparks, shake, particles, audio) uses `Math.random`.

### 4.1 Game loop
`GameApp` runs one Pixi ticker: clamp `dt ≤ 2.5` (or exactly 1 with `fixedStep`),
`sceneManager.update(dt)`, then clear the just-pressed keys. `app.step(n)` runs frames
synchronously for tests and the studio.

### 4.2 Update order (GameplayScene, per frame)
1. Pause / mute keys; dialogue (advance or hold-to-skip); game-over / victory keys.
2. Player input → movement intent, attacks, jump, roll, throw, shoot, super.
3. Buff timers; trickle-spawn from the wave queue.
4. Player and enemy updates (AI → physics), bounds, body collisions, re-clamp.
5. Lamp glow, landing dust, boss enrage.
6. `combat.resolveHits()`, `updateBullets`, `updateThrows`; particles; combo decay;
   `updatePickups`; effects and popups.
7. `syncViews()` — every view reads its model.
8. Remove dead enemies; wave cleared / player death checks.
9. Camera (follow, shake, zoom punch, parallax), HUD, overlay.

### 4.3 State machine (FighterModel.state)
`idle / walk → attack | recoil (shoot, throw) | roll → hurt → down → rise → dead`.
Models hold all logic; `FighterView` reads state, timers and `z` to pose the rig —
rendering never mutates game state.

### 4.4 Mode flow (GameModel.mode)
`title → dialogue → banner → playing → (gameover | victory)`, with dialogue and banner
interludes between waves and around bosses. Pause is a separate flag on the scene.

---

## 5. Data files

| File | What it holds |
|---|---|
| `src/data/combat.js` | documented defaults: attacks, weapons, lanes, hit / knockdown / block rules, super, bullets, throws, loot, AI, movement |
| `src/data/tuning/balance.js` | studio-saved changes to those defaults (only changed values) |
| `src/data/items.js` · `tuning/items.js` | item size table (real metres × readability) and its saved changes |
| `src/data/level.js` | street layout: floor, layers, buildings, props |
| `src/core/Constants.js` | stage and world size, palettes, faces, story script, chapter titles |
| `assets/textures/manifest.json` | every texture: file, anchor, resolution, rig sockets, item measurements |

---

## 6. Running locally
ES modules need a server (not `file://`); PixiJS needs internet (CDN).
```sh
npm install
npm run studio     # game + studio on http://127.0.0.1:8124 (studio can save data files)
npm run serve      # plain static server on :8123
npm run check      # lint + unit + headless browser tests
```
See README → "Development & testing" for the studio and the test suites.

---

## 7. Deployment
- **GitHub Pages:** repo `Noro97/yerevan-hood`, served from `main` root — auto-builds
  on every push to `main`.
- **Vercel:** zero-config static deploy via the CLI; redeploy with
  `vercel --prod --scope noro97s-projects`. (Not yet wired to git auto-deploy.)
- Both deploy the repository as-is, so `studio.html` is reachable too; it only changes
  state in the visitor's own tab (saving needs the local studio server).

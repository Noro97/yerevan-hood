# Yerevan Hood — Technical & Game Documentation

A 2D side-scrolling beat-'em-up (with a light shooter layer) set in the **Kond**
neighborhood of Yerevan. Built with **PixiJS v8** (loaded from CDN via import map),
pure ES modules, no build step. All graphics are drawn procedurally with the Pixi
`Graphics` API; all sound is synthesized at runtime with the WebAudio API. There are
**no image or audio asset files**.

- **Live (GitHub Pages):** https://noro97.github.io/yerevan-hood/
- **Live (Vercel):** https://yerevan-hood.vercel.app
- **Source:** ~3,600 lines of JavaScript across 22 modules.

---

## 1. Concept & Story

Sev Vacho's crew crossed the gorge into Kond and robbed the neighborhood:
**grandpa's war medal**, **Tatik's pension**, and little **Armo's bike**. You play
**Davo**, who goes out for a "conversation." The campaign is **3 chapters / 9 waves**,
told through dialogue cutscenes with hand-drawn vector portraits:

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
| J / Z | Punch · swing melee weapon · **fire pistol** |
| K / X | Kick (slower, stronger, can knock down) |
| Space | **Jump** (jump over bullets) |
| J or K while airborne | **Flying kick** (always knocks down) |
| E | **Throw** the held weapon |
| L / Shift | **Dodge roll** (i-frames, cooldown 42f) |
| U | **ԿԱՅԾԱԿ super** (full meter: AOE 38 dmg + knockdown, radius 270) |
| J / Space / Enter | Advance dialogue |
| R / Enter | Restart · (Enter on victory → Endless mode) |

**Combo string:** J·J·J chains punch → punch → **hook** (15 dmg, 60% knockdown) when
each press lands within the 24-frame chain window after the previous swing.

Items are picked up by walking over them.

---

## 3. Game Systems

### 3.1 Combat & hit resolution
`GameplayScene.resolveHits()` runs every frame. For each attacker in an active
attack/air-kick window it queries `FighterModel.getActiveHit()` (range, damage,
knockback, kind, weapon) and tests targets in front, within range, and within the
depth band (`|Δy| ≤ 30`). On a hit it applies damage, spawns a floating damage
number, a spark, hit-stop (2.5–4 frames), and screen shake.

**Knockdown rules** (probabilistic): player kicks 35%, stick hits 50%, flying kicks
100%; enemy kicks 18%, boss attacks 50%. Bosses resist being floored (~60%). A
knocked-down fighter is launched, lands flat, and has **wake-up invulnerability**.

### 3.2 Health & damage
- HP bar with a trailing **"ghost" damage bar** (drains slowly behind real HP) and a
  low-HP heartbeat pulse below 30%.
- **Mercy invulnerability frames** for the player: ~35 frames after being hit, ~30
  after rising — prevents gang stun-locks. `FighterModel.vulnerable` gates all damage.
- **Bosses** show a large named health bar at the top of the screen instead of the
  small overhead one.
- **Max-HP growth:** beating a chapter boss permanently grants **+10 max HP**
  (River City Ransom-style). Non-boss waves heal +35; boss waves heal +50.

### 3.3 Weapons (pickup, swing, throw, drop)
Defined in `Constants.WEAPONS`:

| Weapon | Melee dmg / range | Uses | Throw dmg | Notes |
|---|---|---|---|---|
| Stick (ՓԱՅՏ) | 16 / 90 | 8 | 16 | long reach |
| Bottle (ՇԻՇ) | 13 / 72 | 4 | 20 | **shatters** on throw → knockdown |
| Makarov (ՄԱԿԱՐՈՎ) | — | 6 ammo | 10 | ranged, fires bullets |

- **E throws** the held weapon (`throwWeapon`/`updateThrows`). Bottles shatter for 20
  dmg + guaranteed knockdown; sticks/pistols land as pickups preserving remaining
  uses/ammo (carried in `PickupModel.meta`).
- Getting **knocked down drops** your weapon on the pavement.
- Beaten gunners drop their pistol with only their leftover rounds.

### 3.4 Pickups & loot
`PickupView` draws nine detailed items. `applyPickup` effects:

| Item | Effect |
|---|---|
| Shawarma | +30 HP |
| Khorovats skewer | Full heal |
| Tan (yogurt drink) | Speed buff ×1.5 for ~10 s |
| Ararat cognac | RAGE — damage ×2 for ~8 s |
| Coin | +75 score |
| Medal | +500 score (story reward, wave 9) |
| Stick / Bottle / Pistol | Equip weapon |

Loot comes from a weighted table (`lootRoll`) via crate breaks, enemy kills (drop
chance scales `0.28 + wave·0.02`, capped 0.45), and guaranteed boss drops.
**Crates** (`CrateModel`, 2 HP) are smashed by melee, thrown weapons, or bullets.

### 3.5 Waves & difficulty
`fillSpawnQueue(n)` builds each wave; spawns trickle in with **max 4 enemies alive**
at once.

- Thug count: `min(2 + ceil(n·0.7), 8)` (bosses waves spawn 3 + the boss).
- Thug HP `26 + n·6`, power `0.5 + n·0.045`, attack cooldown `max(45, 85 − n·4)`.
- **Gunners** appear from wave 4 (`min(2, 1 + floor((n−4)/4))`): keep their distance
  (standoff ~215px) and shoot; pistol-whip when cornered.
- **Archetypes** mix in as waves climb: **rushers** (wave 2+, fast, 3.2× lunge),
  **grapplers** (wave 3+, 1.5× HP, their kick always slams — and knocks the player's
  weapon loose), **shielders** (wave 5+, trash-lid block reduces frontal damage to
  25%, bypassed from behind / by knockdowns / by the super).
- **Bosses** (waves 3/6/9) have hand-tuned HP/power/scale and **enrage at 50% HP**
  (+0.45 speed, ×1.3 power, red pulse). Endless past wave 9 spawns a scaling generic
  boss every 3rd wave. Boss KOs trigger a camera **zoom punch**.
- **Air juggles:** a launched (airborne-down) enemy can be re-hit while `z > 8`,
  relaunching them; grounded knockdowns keep wake-up invulnerability.
- **Super meter:** +5/+7 per landed punch/kick, +6 per bullet or thrown-weapon hit.

### 3.6 Scoring & combos
Punch +10, kick +15, bullet/throw +20; kills +100 + wave·20 (+300 for bosses); coins
+75; medal +500. Combo counter increments per landed hit and decays after ~110 frames;
HUD shows `×N COMBO!` at ≥2.

### 3.7 Physics
A lightweight 2.5D model on `FighterModel`:
- **8-direction movement** with velocity easing (`vx,vy` lerp toward intent) and
  diagonal normalization (×0.72). `BASE_SPEED = 2.7`.
- **Z-axis** (`z, vz`) for jumps and launches with gravity (`GRAVITY = 0.5`,
  `JUMP_VEL = 8`). Shadows shrink and lighten with height; bullets pass under airborne
  fighters (`z > 22`).
- **Knockback** (`kbX`) with exponential friction.
- The walkable depth band is `y ∈ [398, 524]`; the world is `2880 px` wide on a
  `960×540` stage.

### 3.8 Rendering pipeline & VFX
- The static street scenery (hundreds of Graphics/Texts) is **baked once into a
  RenderTexture** (`BackgroundView.bake`) — one sprite per frame instead of
  re-tessellating ~3,000 draw commands.
- **Pooled particle system** (`ParticleSystem`, cap 240): ground dust (running,
  landings, knockdowns), wood debris (crates), glass shards (bottles), gold KO
  bursts, impact puffs.
- **Per-chapter color grade** via `ColorMatrixFilter` on the world (dusk +sat,
  night −sat/−bright, dawn +sat/+bright) layered with the mood tint.
- **Lamp glow:** fighters within ~150px of a street lamp get a warm tint
  (`model.lampGlow`); hit flashes snap white for 2 frames before turning red.
- **Foreground parallax strip** (bollards, planters, a hydrant) slides at 1.25×
  camera speed; landing **squash-and-stretch**; somersault roll and whirlwind
  super override poses in `FighterView`.

### 3.9 Audio
`SoundManager` (singleton `sfx`) synthesizes everything with oscillators + filtered
noise: `swing, hit, hurt, ko, pickup, wave`. The AudioContext is unlocked on first
key press.

---

## 4. Architecture (MVC)

```
index.html                 # import map (pixi.js → CDN) + #game mount + boot
src/main.js                # entry: new GameApp().init() → start(TitleScene)
src/core/
  GameApp.js               # Pixi Application, ticker loop, InputManager, SceneManager
  SceneManager.js          # switchScene(): onExit old → addChild → onEnter new
  Scene.js                 # base: onEnter / onExit / update(dt)
  InputManager.js          # keydown/up sets, isDown / isPressed, onAnyKeyPress hook
  SoundManager.js          # WebAudio synth (singleton `sfx`)
  Constants.js             # all tunables: dims, ATTACKS, WEAPONS, PALETTES, STORY…
src/models/                # pure logic/state, no Pixi
  GameModel.js             # mode, wave, score, combo, buffs, camX, shake, timers
  FighterModel.js          # physics + state machine + AI + combat queries
  BulletModel.js  CrateModel.js  PickupModel.js
src/views/                 # Pixi rendering, driven by models
  BackgroundView.js        # sky / mountains / skyline / street / buildings / props
  FighterView.js           # limb rig, animation states, weapon, hp bar, blink
  HUDView.js               # HP+ghost bar, boss bar, weapon, buffs, combo, banner
  DialogueView.js          # portrait + typewriter dialogue panel
  OverlayView.js           # title / game-over / victory cards
  PickupView.js  CrateView.js  BulletView.js
src/scenes/
  TitleScene.js            # title screen → GameplayScene on any key
  GameplayScene.js         # the controller: owns models, spawns, combat, waves, HUD
```

### 4.1 Game loop
`GameApp` runs one Pixi ticker: clamp `dt ≤ 2.5`, `sceneManager.update(dt)`, then
`input.update()` (clears the just-pressed set). The active scene's `update(dt)` drives
everything.

### 4.2 Update order (GameplayScene, per frame)
1. Mode handling (title/dialogue/banner/playing/gameover/victory).
2. Read player input → intent on `playerModel`.
3. Apply buffs (speed/rage) and tick their timers.
4. Trickle-spawn from the queue (respecting the alive cap).
5. `playerModel.update` + clamp to bounds; each enemy `updateAI` → `update` → clamp.
6. `resolveHits`, `updateBullets`, `updateThrows`.
7. Combo decay; `updatePickups`, `updateEffects`, `updatePopups`.
8. **Sync views** from models (`view.updateView(dt, model)`).
9. Remove dead entities; check wave-cleared / player-death.
10. `updateCamera` (follow + shake + parallax), HUD update, overlay update.

### 4.3 State machine (FighterModel.state)
`idle → walk → attack → hurt → down → rise → dead`. Models hold all logic;
`FighterView` reads `state`/timers/`z` to pose the limb rig — **rendering never
mutates game state**.

### 4.4 Mode flow (GameModel.mode)
`title → dialogue → banner → playing → (gameover | victory)`, with `dialogue` and
`banner` interludes re-entered between waves and around bosses.

---

## 5. Key tunables (Constants.js)
`W/H = 960/540`, `WORLD_W = 2880`, `FLOOR_TOP/BOTTOM = 398/524`, `FINAL_WAVE = 9`,
`BASE_SPEED = 2.7`, `GRAVITY = 0.5`, `JUMP_VEL = 8`.
`ATTACKS.punch` (dmg 9, range 62), `ATTACKS.kick` (dmg 14, range 80),
`AIR_KICK` (dmg 17, range 68). Palettes, faces, story script, and chapter titles all
live here too — most balance and content changes are single-file edits.

---

## 6. Running locally
ES modules need a server (not `file://`); PixiJS needs internet (CDN).
```sh
cd yerevan-hood
npx serve .            # or: python3 -m http.server 8080
```
Debug handles exposed on `window`: `__app` (Pixi app) and, during gameplay, `__game`
(player, enemies, mode, wave, score, pickups, bullets, breakables, buffs).

---

## 7. Deployment
- **GitHub Pages:** repo `Noro97/yerevan-hood`, served from `main` root — auto-builds
  on every push to `main`.
- **Vercel:** zero-config static deploy via the CLI; redeploy with
  `vercel --prod --scope noro97s-projects`. (Not yet wired to git auto-deploy.)

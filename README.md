# Yerevan Hood — Kond Street Brawler

A 2D side-scrolling beat-'em-up (with a shooter twist) built with [PixiJS v8](https://pixijs.com), set in a Yerevan neighborhood: pink tuff buildings, Mount Ararat and the TV tower on the horizon, a parked Lada, laundry lines, Armenian shop signs. All graphics are drawn procedurally — no image assets — and sounds are synthesized with WebAudio.

## The story

Sev Vacho's crew rolled into Kond from across the gorge. They took **grandpa's war medal**, **Tatik's pension**, and little **Armo's bike**. Davo goes out for a conversation.

Three chapters, nine waves, told through dialogue cutscenes:

1. **ԲԱԿԸ · The Yard** — get the bike back from **Gago** (boss, wave 3)
2. **ՇՈՒԿԱՆ · The Market** — take the pension back from **Mado** (boss, wave 6)
3. **ՁՈՐԸ · The Gorge** — face **Sev Vacho** himself for the medal (final boss, wave 9)

Beat the story and unlock **endless mode** for high-score runs.

## Run it

The game uses ES modules, so it needs a local web server (opening `index.html` via `file://` won't work). PixiJS loads from a CDN, so you need an internet connection.

```sh
cd yerevan-hood
npx serve .
# or: python3 -m http.server 8080
```

Then open the printed localhost URL.

## Controls

| Key | Action |
| --- | --- |
| ← → ↑ ↓ or WASD | Move (8-directional, with momentum) |
| J or Z | Punch / swing weapon / **fire pistol** — chain **J·J·J** for a hook finisher |
| K or X | Kick (slower, stronger, chance to floor enemies) |
| Space | **Jump** — jump over bullets! |
| J or K in the air | **Flying kick** — always knocks down |
| E | **Throw** the held weapon (bottles shatter and floor the target) |
| L or Shift | **Dodge roll** — brief invulnerability |
| U | **ԿԱՅԾԱԿ super** — whirlwind that floors everyone nearby (needs a full meter) |
| J / Space / Enter | Advance dialogue |
| R / Enter | Restart · Enter at victory = endless mode |

Items are picked up by walking over them. Landing hits charges the gold super meter.

### Enemy archetypes

- **Rushers** (purple) sprint in with long lunging punches — roll through them.
- **Grapplers** (big, green) are slow but their grab always slams you down — and knocks your weapon loose.
- **Shielders** (blue, trash-can lid) block frontal hits down to scraps — flank them, floor them, or juggle them.
- **Gunners** (red) keep range and shoot; jump the bullets.
- **Bosses** enrage at half health: faster, harder, angrier.

### Health & damage

- Floating damage numbers on every hit; green popups for heals and buffs.
- The HP bar shows a pale **ghost trail** of recent damage and pulses when you're below 30%.
- **Mercy invulnerability**: after taking a hit you blink and can't be re-hit for a moment — no more gang stunlocks. Same after getting up from a knockdown.
- Bosses get a big named health bar at the top of the screen.
- Beating a chapter boss grants **+10 max HP** (River City Ransom-style growth).

### Throwing & dropping weapons

- **E throws your held weapon**: bottles shatter on impact for 20 damage and an automatic knockdown; sticks and pistols fly, hit for less, and land as pickups with their remaining uses/ammo.
- Getting knocked down **drops your weapon** on the pavement — pick it back up before someone else reaches it.
- Beaten gunners drop their Makarov with only the rounds they had left.

### Physics

- Momentum-based movement with easing and diagonal normalization.
- Full z-axis: jumps and launches follow a gravity arc, shadows shrink with height.
- Knockdowns: kicks (35%), sticks (50%), and flying kicks (always) send enemies to the pavement with classic wake-up invulnerability. Bosses resist and can floor *you*.
- Jumping clears gunner bullets — time it right.

## Items & bonuses

Inspired by the genre classics — Streets of Rage's disposable weapons and food, River City Ransom's coins and buffs, Metal Slug's limited-ammo guns:

| Item | Effect |
| --- | --- |
| Shawarma | +30 HP |
| Khorovats skewer | Full heal |
| Tan (yogurt drink) | Speed boost, 10 s |
| Ararat cognac | RAGE — double damage, 8 s |
| Coin | +75 score |
| Stick (փայտ) | Melee weapon, 8 swings, long range |
| Bottle (շիշ) | Melee weapon, 4 swings, breaks |
| Makarov pistol | 6 rounds, 24 dmg per shot |

- **Wooden crates** litter the street — smash them (fists, weapons, or bullets) for random loot.
- **Gunners** (red jackets) appear from wave 4: they keep their distance and shoot. Dodge vertically, close the gap — they drop their pistol when beaten.
- Chain hits for combos; +25 HP between waves; bosses always drop loot.

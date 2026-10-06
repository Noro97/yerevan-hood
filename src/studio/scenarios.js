import { ATTACKS, WEAPONS, HIT, SUPER, COMBAT_DEPTH_BAND } from "../data/combat.js";
import { STORY } from "../core/Constants.js";

/**
 * Studio scenarios. Each one starts from an empty street (player at x=300, y=460, seeded RNG),
 * builds a situation in setup(), feeds scripted input for `frames` frames and asserts in check().
 *
 *   input: [{ at, press: [codes] }, { from, to, hold: [codes] }]  or  (frame, api) => { press, hold }
 *   onFrame(api, frame): per-frame probe, store measurements in api.memo
 *   knownBug: the scenario describes the intended behaviour and currently fails; the suite
 *             expects it to fail until the fix lands, then flags it so the marker gets removed.
 */

const PLAYER_SCALE = 1.08 * 0.7;
const DUMMY_RADIUS = 16 * 0.7;
const meleeReach = (kind) => ATTACKS[kind].range * PLAYER_SCALE + DUMMY_RADIUS * HIT.reachAhead;

export const SCENARIOS = [
  // ---------- melee ----------
  {
    id: "melee.punch",
    group: "Melee",
    title: "A punch lands on a dummy in reach",
    frames: 25,
    setup: (s) => s.dummy(335),
    input: [{ at: 0, press: ["KeyJ"] }],
    check(t, s) {
      const hits = s.hits({ kind: "punch" });
      t.equal(hits.length, 1, "exactly one punch hit");
      t.equal(s.enemies[0].hp, 500 - ATTACKS.punch.dmg, "dummy lost punch damage");
    },
  },
  {
    id: "melee.chain",
    group: "Melee",
    title: "J-J-J chain finishes with a hook",
    frames: 75,
    setup(s) {
      s.pin(s.dummy(335));
      s.memo.presses = 0;
    },
    // press as soon as the player can act again (hitstop shifts the timeline, so no fixed frames)
    input(f, s) {
      const p = s.player;
      if (s.memo.presses < 3 && (p.state === "idle" || p.state === "walk") && p.cooldown <= 0) {
        s.memo.presses++;
        return { press: ["KeyJ"] };
      }
      return null;
    },
    check(t, s) {
      t.equal(s.hits().map((h) => h.kind).join(","), "punch,punch,hook", "hit sequence");
      t.equal(500 - s.enemies[0].hp, ATTACKS.punch.dmg * 2 + ATTACKS.hook.dmg, "total damage");
    },
  },
  {
    id: "melee.whiff",
    group: "Melee",
    title: "Punch and kick whiff on a target beyond reach + lunge",
    frames: 60,
    setup(s) {
      // kick reach + both attacks' lunges (the kick starts where the punch left off) + margin
      const lunge = (kind) => ATTACKS[kind].lunge * (ATTACKS[kind].to - ATTACKS[kind].from + 1);
      s.pin(s.dummy(300 + meleeReach("kick") + lunge("punch") + lunge("kick") + 6));
    },
    input: [{ at: 0, press: ["KeyJ"] }, { at: 30, press: ["KeyK"] }],
    check(t, s) {
      t.equal(s.hits().length, 0, "nothing connects");
    },
  },
  {
    id: "melee.lane",
    group: "Melee",
    title: "Attacks miss a target outside the depth lane",
    frames: 25,
    setup: (s) => s.dummy(335, {}, { y: 460 + COMBAT_DEPTH_BAND * 0.7 + 5 }),
    input: [{ at: 0, press: ["KeyJ"] }],
    check(t, s) {
      t.equal(s.hits().length, 0, "no hit");
    },
  },
  {
    id: "melee.air-kick",
    group: "Melee",
    title: "A jump kick knocks down a standing enemy",
    frames: 40,
    setup: (s) => s.pin(s.dummy(330)),
    input: [{ at: 0, press: ["Space"] }, { at: 4, press: ["KeyK"] }],
    check(t, s) {
      const hit = s.hits({ kind: "kick" })[0];
      t.ok(hit, "air kick connects");
      t.equal(hit?.knockdown, true, "air kick always knocks down");
    },
  },

  // ---------- blocking ----------
  {
    id: "block.shielder-front",
    group: "Blocking",
    title: "A shielder blocks a kick from the front",
    frames: 35,
    setup: (s) => s.spawn({ archetype: "shielder", x: 335 }, { dummy: true, facing: -1 }),
    input: [{ at: 0, press: ["KeyK"] }],
    check(t, s) {
      t.equal(s.events("block").length, 1, "one block");
      t.equal(s.enemies[0].hp, 50 - Math.max(1, Math.round(ATTACKS.kick.dmg * HIT.blockDamageMul)), "chip damage only");
    },
  },
  {
    id: "block.shielder-back",
    group: "Blocking",
    title: "A shielder hit from behind takes full damage",
    frames: 35,
    setup: (s) => s.spawn({ archetype: "shielder", x: 335 }, { dummy: true, facing: 1 }),
    input: [{ at: 0, press: ["KeyK"] }],
    check(t, s) {
      t.equal(s.events("block").length, 0, "not blocked");
      t.equal(s.enemies[0].hp, 50 - ATTACKS.kick.dmg, "full kick damage");
    },
  },
  {
    id: "block.lid-bullet",
    group: "Blocking",
    title: "A lid in hand blocks a bullet from the front",
    frames: 20,
    setup(s) {
      s.give("lid");
      s.setPlayer({ facing: -1 });
      s.bullet({ x: 200, dir: 1 });
    },
    check(t, s) {
      t.equal(s.events("block").length, 1, "bullet blocked");
      t.equal(s.player.hp, 98, "only chip damage");
    },
  },

  // ---------- weapons ----------
  {
    id: "weapon.pistol",
    group: "Weapons",
    title: "A pistol shot hits a dummy down the lane",
    frames: 45,
    setup(s) {
      s.give("pistol");
      s.dummy(520);
    },
    input: [{ at: 0, press: ["KeyJ"] }],
    check(t, s) {
      t.equal(s.hits({ source: "bullet" }).length, 1, "bullet hit");
      t.equal(s.enemies[0].hp, 500 - 24, "pistol damage");
      t.equal(s.player.weapon?.ammo, WEAPONS.pistol.ammo - 1, "one round used");
    },
  },
  {
    id: "weapon.stick-swing",
    group: "Weapons",
    title: "A stick swing uses stick damage and wears the stick",
    frames: 25,
    setup(s) {
      s.give("stick");
      s.dummy(345);
    },
    input: [{ at: 0, press: ["KeyJ"] }],
    check(t, s) {
      const hit = s.hits({ weapon: "stick" })[0];
      t.equal(hit?.dmg, WEAPONS.stick.dmg, "stick damage");
      t.equal(s.player.weapon?.uses, WEAPONS.stick.uses - 1, "one use spent");
    },
  },
  {
    id: "weapon.throw-bottle",
    group: "Weapons",
    title: "A thrown bottle hits and shatters",
    frames: 30,
    setup(s) {
      s.give("bottle");
      s.dummy(420);
    },
    input: [{ at: 0, press: ["KeyE"] }],
    check(t, s) {
      t.equal(s.hits({ source: "throw", weapon: "bottle" })[0]?.dmg, WEAPONS.bottle.throwDmg, "throw damage");
      t.equal(s.scene.pickups.filter((p) => p.type === "bottle").length, 0, "no bottle left on the floor");
      t.equal(s.player.weapon, null, "hands empty");
    },
  },
  {
    id: "weapon.throw-stick",
    group: "Weapons",
    title: "A thrown stick drops back on the floor",
    frames: 30,
    setup(s) {
      s.give("stick");
      s.dummy(420);
    },
    input: [{ at: 0, press: ["KeyE"] }],
    check(t, s) {
      t.equal(s.hits({ source: "throw" }).length, 1, "throw hit");
      t.equal(s.scene.pickups.filter((p) => p.type === "stick").length, 1, "stick on the floor");
    },
  },

  // ---------- items & super ----------
  {
    id: "item.crate",
    group: "Items",
    title: "Two punches break a crate and drop loot",
    frames: 50,
    setup: (s) => s.crate(335),
    input: [{ at: 0, press: ["KeyJ"] }, { at: 24, press: ["KeyJ"] }],
    check(t, s) {
      t.ok(s.events("crate").some((e) => e.broken), "crate broken");
      t.equal(s.scene.pickups.length + s.events("pickup").length, 1, "one loot drop (on the floor or already picked up)");
    },
  },
  {
    id: "item.shawarma",
    group: "Items",
    title: "Shawarma heals 30",
    frames: 5,
    setup(s) {
      s.setPlayer({ hp: 50 });
      s.pickup("shawarma", 305);
    },
    check(t, s) {
      t.equal(s.player.hp, 80, "healed");
      t.equal(s.scene.pickups.length, 0, "picked up");
    },
  },
  {
    id: "super.radius",
    group: "Super",
    title: "The super hits everything in its radius and nothing outside",
    frames: 30,
    setup(s) {
      s.scene.game.super = SUPER.max;
      s.dummy(380);
      s.dummy(220);
      s.dummy(300 + SUPER.radius * PLAYER_SCALE + 30);
    },
    input: [{ at: 0, press: ["KeyU"] }],
    check(t, s) {
      t.equal(s.hits({ source: "super" }).length, 2, "two dummies in range hit");
      t.equal(s.scene.game.super, 0, "meter spent");
    },
  },

  // ---------- flow ----------
  {
    id: "flow.ending",
    group: "Flow",
    title: "Enter through the ending dialogue lands on the victory screen",
    frames: 140,
    setup(s) {
      s.scene.showDialogue(STORY.ending, () => s.scene.showVictory());
    },
    input: (f, s) => (s.scene.game.mode === "dialogue" && f % 6 === 0 ? { press: ["Enter"] } : null),
    check(t, s) {
      t.equal(s.scene.game.mode, "victory", "victory screen shown");
      t.equal(s.scene.game.endless, false, "endless not started");
    },
  },

  // ---------- known bugs: intended behaviour, fixed in phase 3 / 4 ----------
  {
    id: "bug.juggle",
    group: "Known bugs",
    title: "Juggle: a punch connects with a knocked-down enemy near the top of its arc",
    knownBug: "ground attacks ignore targets above 18×scale, so juggles only land in a ~4 px window",
    frames: 30,
    setup(s) {
      const d = s.dummy(335);
      s.pin(d);
      d.applyHit(1, 1, 0, true);
    },
    input: [{ at: 2, press: ["KeyJ"] }],
    check(t, s) {
      const hit = s.hits({ kind: "punch" })[0];
      t.ok(hit, "the punch connects");
      // knockdown arc peaks at z≈19.9; the punch's active frames span the peak
      t.atLeast(hit?.z ?? 0, 15, "near the top of the arc");
    },
  },
  {
    id: "bug.multi-target",
    group: "Known bugs",
    title: "One swing hits every enemy in reach",
    knownBug: "resolveHits stops after the first target",
    frames: 25,
    setup(s) {
      s.dummy(330);
      s.dummy(338, {}, { y: 466 });
    },
    input: [{ at: 0, press: ["KeyJ"] }],
    check(t, s) {
      t.equal(s.hits({ kind: "punch" }).length, 2, "both dummies hit");
    },
  },
  {
    id: "bug.ai-stall",
    group: "Known bugs",
    title: "An adjacent, ready enemy attacks within 40 frames",
    knownBug: "AI stops up to 9 px off the 8.4 px attack lane and idles next to the player",
    frames: 900,
    seed: 11,
    setup(s) {
      s.god();
      s.spawn({ paletteKey: "thug2", hp: 9999, speed: 1.6, aiCool: 60, x: 600 });
      s.memo.streak = 0;
      s.memo.longest = 0;
    },
    onFrame(s) {
      const e = s.enemies[0];
      const p = s.player;
      const adjacent = Math.abs(e.x - p.x) < 45 * e.scaleF;
      const ready = e.alive && e.state !== "attack" && e.state !== "hurt" && e.cooldown <= 0;
      s.memo.streak = adjacent && ready ? s.memo.streak + 1 : 0;
      s.memo.longest = Math.max(s.memo.longest, s.memo.streak);
    },
    check(t, s) {
      t.atMost(s.memo.longest, 40, "longest stall next to the player");
    },
  },
  {
    id: "bug.shoot-lunge",
    group: "Known bugs",
    title: "Firing a pistol doesn't move the shooter",
    knownBug: "fireBullet reuses the punch state, so the shooter lunges forward",
    frames: 30,
    setup(s) {
      s.give("pistol");
      s.memo.x0 = s.player.x;
    },
    input: [{ at: 0, press: ["KeyJ"] }],
    check(t, s) {
      t.near(s.player.x, s.memo.x0, 0.5, "player x unchanged");
    },
  },
  {
    id: "bug.block-combo",
    group: "Known bugs",
    title: "A blocked hit doesn't build combo or score",
    knownBug: "blocked melee hits still add combo, score and super",
    frames: 35,
    setup: (s) => s.spawn({ archetype: "shielder", x: 335 }, { dummy: true, facing: -1 }),
    input: [{ at: 0, press: ["KeyK"] }],
    check(t, s) {
      t.equal(s.scene.game.combo, 0, "combo unchanged");
      t.equal(s.scene.game.score, 0, "score unchanged");
    },
  },
  {
    id: "bug.super-popup",
    group: "Known bugs",
    title: "The super's damage popup shows the damage actually dealt",
    knownBug: "popup always reads -38, even under rage (×2)",
    frames: 10,
    setup(s) {
      s.scene.game.super = SUPER.max;
      s.scene.game.buffs.rage = 300;
      s.dummy(380);
    },
    // rage is applied to the player's power during the first update, so fire on frame 2
    input: [{ at: 2, press: ["KeyU"] }],
    check(t, s) {
      const dealt = s.hits({ source: "super" })[0]?.dmg;
      t.equal(dealt, SUPER.damage * 2, "rage doubles the super's damage");
      t.ok(s.scene.popups.some((p) => p.t.text === `-${dealt}`), "popup matches", `dealt ${dealt}, popups: ${s.scene.popups.map((p) => p.t.text).join(" ")}`);
    },
  },
  {
    id: "bug.bounds-push",
    group: "Known bugs",
    title: "Body collisions can't push the player through the left wall",
    knownBug: "resolveBodyCollisions runs after the bounds clamp",
    frames: 30,
    setup(s) {
      s.setPlayer({ x: 30 });
      s.dummy(36);
      s.memo.minX = Infinity;
    },
    onFrame(s) {
      s.memo.minX = Math.min(s.memo.minX, s.player.x);
    },
    check(t, s) {
      t.atLeast(s.memo.minX, 30, "player never left the street");
    },
  },
  {
    id: "bug.kill-all",
    group: "Known bugs",
    title: "Kill-all leaves no 'alive' enemy at 0 HP",
    knownBug: "applyHit ignores non-vulnerable targets, onKill runs anyway",
    frames: 10,
    setup(s) {
      const e = s.spawn({ x: 420 });
      e.applyHit(1, 1, 0, true);
      e.z = 0;
      e.vz = 0;
    },
    onFrame(s, f) {
      if (f === 2) s.scene.killAllEnemies();
    },
    check(t, s) {
      t.equal(s.enemies.filter((e) => e.alive && e.hp <= 0).length, 0, "no zombie enemies");
      t.equal(s.events("kill").length, 1, "one kill event");
    },
  },
  {
    id: "bug.gunner-gun",
    group: "Known bugs",
    title: "A gunner visibly holds a pistol",
    knownBug: "spawnEnemy never gives gunners a weapon sprite",
    frames: 3,
    setup(s) {
      s.memo.gunner = s.scene.spawnEnemy({ paletteKey: "gunner", hp: 50, speed: 1.5, power: 1, scale: 1, gunner: true });
    },
    check(t, s) {
      t.ok(s.view(s.memo.gunner)?.weaponSprite.visible, "weapon sprite visible");
    },
  },
  {
    id: "bug.loot-floor",
    group: "Known bugs",
    title: "Loot respects custom floor bounds",
    knownBug: "spawnPickup clamps to the FLOOR_TOP/FLOOR_BOTTOM constants",
    frames: 2,
    setup(s) {
      s.scene.setFloorBounds(420, 500);
      s.memo.pickup = s.scene.spawnPickup(500, 395, "coin");
    },
    check(t, s) {
      t.atLeast(s.memo.pickup.y, 420, "pickup inside the walkable strip");
    },
  },
  {
    id: "bug.punch-reach",
    group: "Known bugs",
    title: "The fist's visual reach matches the punch's hit reach",
    knownBug: "the straight-arm rig reaches ~14 px past the hit range",
    frames: 12,
    input: [{ at: 0, press: ["KeyJ"] }],
    onFrame(s) {
      const p = s.player;
      if (p.state === "attack" && p.attackTimer >= 7 && p.attackTimer <= 9) {
        const reach = s.worldBounds(s.view(p).frontArm).maxX - p.x;
        s.memo.visual = Math.max(s.memo.visual ?? 0, reach);
      }
    },
    check(t, s) {
      t.near(s.memo.visual ?? 0, meleeReach("punch"), 6, "fist tip vs hit reach (px)");
    },
  },
];

import { ATTACKS, WEAPONS, HIT, SUPER, COMBAT_DEPTH_BAND } from "../data/combat.js";
import { ITEMS } from "../data/items.js";
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

  // ---------- phase 3 fixes (regressions) + known bugs ----------
  {
    id: "melee.juggle",
    group: "Melee",
    title: "Juggle: a punch connects with a knocked-down enemy near the top of its arc",
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
    id: "melee.multi-target",
    group: "Melee",
    title: "One swing hits every enemy in reach",
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
    id: "ai.engage",
    group: "AI",
    title: "An adjacent, ready enemy attacks within 40 frames",
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
    id: "weapon.shoot-recoil",
    group: "Weapons",
    title: "Firing a pistol doesn't move the shooter",
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
    id: "block.no-combo",
    group: "Blocking",
    title: "A blocked hit doesn't build combo or score",
    frames: 35,
    setup: (s) => s.spawn({ archetype: "shielder", x: 335 }, { dummy: true, facing: -1 }),
    input: [{ at: 0, press: ["KeyK"] }],
    check(t, s) {
      t.equal(s.scene.game.combo, 0, "combo unchanged");
      t.equal(s.scene.game.score, 0, "score unchanged");
    },
  },
  {
    id: "super.rage-popup",
    group: "Super",
    title: "The super's damage popup shows the damage actually dealt",
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
      t.ok(s.scene.popupLayer.texts.includes(`-${dealt}`), "popup matches", `dealt ${dealt}, popups: ${s.scene.popupLayer.texts.join(" ")}`);
    },
  },
  {
    id: "bounds.wall-push",
    group: "Bounds",
    title: "Body collisions can't push the player through the left wall",
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
    id: "flow.kill-all",
    group: "Flow",
    title: "Kill-all leaves no 'alive' enemy at 0 HP",
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
    id: "items.gunner-pistol",
    group: "Items",
    title: "A gunner visibly holds a pistol",
    frames: 3,
    setup(s) {
      s.memo.gunner = s.scene.spawnEnemy({ paletteKey: "gunner", hp: 50, speed: 1.5, power: 1, scale: 1, gunner: true });
    },
    check(t, s) {
      t.ok(s.view(s.memo.gunner)?.weaponSprite.visible, "weapon sprite visible");
    },
  },
  {
    id: "bounds.loot-floor",
    group: "Bounds",
    title: "Loot respects custom floor bounds",
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
    id: "melee.punch-reach",
    group: "Melee",
    title: "The fist's visual reach matches the punch's hit reach",
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
  {
    id: "weapon.throw-recoil",
    group: "Weapons",
    title: "Throwing a weapon doesn't move the thrower or start a punch chain",
    frames: 30,
    setup(s) {
      s.give("stick");
      s.memo.x0 = s.player.x;
    },
    input: [{ at: 0, press: ["KeyE"] }],
    check(t, s) {
      t.near(s.player.x, s.memo.x0, 0.5, "player x unchanged");
      t.equal(s.player.chainWindow <= 0, true, "no punch-chain window opened");
    },
  },
  {
    id: "weapon.wear-once",
    group: "Weapons",
    title: "A stick swing that hits two enemies wears the stick once",
    frames: 25,
    setup(s) {
      s.give("stick");
      s.dummy(340);
      s.dummy(350, {}, { y: 466 });
    },
    input: [{ at: 0, press: ["KeyJ"] }],
    check(t, s) {
      t.equal(s.hits({ weapon: "stick" }).length, 2, "both hit");
      t.equal(s.player.weapon?.uses, WEAPONS.stick.uses - 1, "one use spent");
    },
  },
  {
    id: "ai.floor-bounds",
    group: "AI",
    title: "With custom floor bounds, enemies stay inside and still engage",
    frames: 400,
    seed: 4,
    setup(s) {
      s.god();
      s.scene.setFloorBounds(430, 490);
      s.setPlayer({ y: 432 });
      s.spawn({ paletteKey: "thug1", hp: 9999, x: 560, y: 485 });
      s.memo.minY = Infinity;
      s.memo.maxY = -Infinity;
    },
    onFrame(s) {
      for (const e of s.enemies) {
        s.memo.minY = Math.min(s.memo.minY, e.y);
        s.memo.maxY = Math.max(s.memo.maxY, e.y);
      }
    },
    check(t, s) {
      t.atLeast(s.memo.minY, 430, "never above the top bound");
      t.atMost(s.memo.maxY, 490, "never below the bottom bound");
      t.atLeast(s.events("hit").filter((e) => e.target === s.player).length, 1, "the enemy lands at least one hit");
    },
  },
  {
    id: "items.floor-vs-hand",
    group: "Items",
    title: "Every weapon is the same size on the floor and in a scale-1 hand",
    frames: 2,
    setup(s) {
      s.memo.pairs = Object.keys(WEAPONS).map((kind, i) => {
        const holder = s.dummy(420 + i * 90);
        holder.setWeapon({ kind, def: WEAPONS[kind] });
        return { kind, holder, floor: s.pickup(kind, 440 + i * 90, 520) };
      });
    },
    check(t, s) {
      for (const { kind, holder, floor } of s.memo.pairs) {
        const hand = s.view(holder).weaponSprite;
        const icon = s.scene.pickupViews.get(floor).icon;
        const len = (sprite) => sprite.texture.content.length * s.worldScale(sprite);
        t.near(len(hand) / len(icon), 1, 0.03, `${kind}: hand / floor length`);
      }
    },
  },
  {
    id: "items.rest-on-floor",
    group: "Items",
    title: "Pickups rest on the street instead of sinking into it",
    frames: 40,
    setup(s) {
      s.memo.items = Object.keys(ITEMS).map((type, i) => s.pickup(type, 380 + i * 40, 500));
      s.memo.worst = 0;
    },
    onFrame(s) {
      // the icon's anchor is its lowest opaque row
      for (const p of s.memo.items) {
        const bottom = s.worldPoint(s.scene.pickupViews.get(p).icon).y;
        s.memo.worst = Math.max(s.memo.worst, bottom - p.y);
      }
    },
    check(t, s) {
      t.atMost(s.memo.worst, 0.5, "lowest icon pixel below the ground point (px)");
    },
  },
  {
    id: "items.stick-tip",
    group: "Items",
    title: "At impact a stick's tip is where its hit reaches",
    frames: 14,
    setup(s) {
      s.give("stick");
    },
    input: [{ at: 0, press: ["KeyJ"] }],
    onFrame(s) {
      const p = s.player;
      if (p.state === "attack" && p.attackTimer >= 7 && p.attackTimer <= 9) {
        const w = s.view(p).weaponSprite;
        const c = w.texture.content;
        const tip = s.scene.world.toLocal(w.toGlobal({ x: c.centerX - ITEMS.stick.grip[0], y: c.bottom - ITEMS.stick.grip[1] }));
        s.memo.tip = Math.max(s.memo.tip ?? 0, (tip.x - p.x) * p.facing);
      }
    },
    check(t, s) {
      const reach = WEAPONS.stick.range * PLAYER_SCALE + DUMMY_RADIUS * HIT.reachAhead;
      t.near(s.memo.tip ?? 0, reach, 8, "stick tip vs stick hit reach (px)");
    },
  },
  {
    id: "items.pistol-aim",
    group: "Items",
    title: "A pistol is held low at rest and levelled when firing",
    frames: 8,
    setup(s) {
      s.give("pistol");
      s.memo.dir = {};
    },
    input: [{ at: 4, press: ["KeyJ"] }],
    onFrame(s, f) {
      const w = s.view(s.player).weaponSprite;
      const a = s.scene.world.toLocal(w.toGlobal({ x: 0, y: 0 }));
      const b = s.scene.world.toLocal(w.toGlobal({ x: 0, y: 20 }));
      const len = Math.hypot(b.x - a.x, b.y - a.y);
      s.memo.dir[f] = { x: (b.x - a.x) / len, y: (b.y - a.y) / len };
    },
    check(t, s) {
      const rest = s.memo.dir[2];
      const firing = s.memo.dir[6];
      t.ok(rest.x > 0.4 && rest.y > 0.3, "at rest: barrel points forward and down", JSON.stringify(rest));
      t.ok(firing.x > 0.9, "firing: barrel points forward", JSON.stringify(firing));
    },
  },
  {
    id: "ui.popups-stack",
    group: "UI",
    title: "Popups that would overlap stack upward instead",
    frames: 8,
    setup(s) {
      s.dummy(330);
      s.dummy(338, {}, { y: 466 });
    },
    input: [{ at: 0, press: ["KeyJ"] }],
    check(t, s) {
      const live = s.scene.popupLayer.live.map((p) => p.t);
      t.equal(live.length, 2, "two damage popups");
      t.atLeast(Math.abs((live[0]?.y ?? 0) - (live[1]?.y ?? 0)), 12, "vertical gap (px)");
    },
  },
  {
    id: "ui.popup-pool",
    group: "UI",
    title: "Popups are recycled: a long fight creates only a handful of Text objects",
    frames: 1800,
    setup(s) {
      // pin both: punch lunges would otherwise carry the player past a knocked-down dummy
      s.pin(s.dummy(335, {}, { hp: 99999 }));
      s.pin(s.player);
      s.memo.created0 = s.scene.popupLayer.created;
    },
    input(f, s) {
      const p = s.player;
      return (p.state === "idle" || p.state === "walk") && p.cooldown <= 0 ? { press: ["KeyJ"] } : null;
    },
    check(t, s) {
      t.atLeast(s.hits().length, 20, "many hits landed");
      t.atMost(s.scene.popupLayer.created - s.memo.created0, 8, "Text objects created");
    },
  },
  {
    id: "ui.block-feedback",
    group: "UI",
    title: "A block reads differently from a hit: steel flash and a chip-damage popup",
    frames: 30,
    setup(s) {
      s.memo.target = s.spawn({ archetype: "shielder", x: 335 }, { dummy: true, facing: -1 });
      s.memo.steel = false;
    },
    input: [{ at: 0, press: ["KeyK"] }],
    onFrame(s) {
      const e = s.memo.target;
      if (e.blockFlash > 0 && e.flash <= 0) s.memo.steel = true;
      s.memo.texts = [...new Set([...(s.memo.texts ?? []), ...s.scene.popupLayer.texts])];
    },
    check(t, s) {
      const chip = Math.max(1, Math.round(ATTACKS.kick.dmg * HIT.blockDamageMul));
      t.ok(s.memo.steel, "steel flash, no damage flash");
      t.ok(s.memo.texts.includes(`-${chip} ԿԼԱՆԿ!`), "popup shows the chip damage", s.memo.texts.join(" | "));
    },
  },
  {
    id: "ui.pause",
    group: "UI",
    title: "Esc pauses everything and shows the pause screen; Esc resumes",
    frames: 70,
    setup(s) {
      s.memo.enemy = s.spawn({ paletteKey: "thug1", x: 650, hp: 999 });
    },
    input: [{ at: 10, press: ["Escape"] }, { at: 41, press: ["Escape"] }],
    onFrame(s, f) {
      if (f === 12) s.memo.x12 = s.memo.enemy.x;
      if (f === 38) {
        s.memo.x38 = s.memo.enemy.x;
        s.memo.paused = s.scene.paused;
        s.memo.title = s.scene.overlay.visible ? s.scene.overlay.titleBig.text : "";
      }
    },
    check(t, s) {
      t.ok(s.memo.paused, "paused after Esc");
      t.equal(s.memo.title, "ԴԱԴԱՐ", "pause screen shown");
      t.equal(s.memo.x38, s.memo.x12, "nothing moves while paused");
      t.ok(!s.scene.paused && s.memo.enemy.x !== s.memo.x38, "resumed after the second Esc");
    },
  },
  {
    id: "ui.mute",
    group: "UI",
    title: "M toggles sound and the HUD shows it",
    frames: 8,
    setup(s) {
      s.memo.initial = s.scene.hud.hudMuted.visible;
    },
    input: [{ at: 1, press: ["KeyM"] }, { at: 4, press: ["KeyM"] }],
    onFrame(s, f) {
      if (f === 2) s.memo.toggled = s.scene.hud.hudMuted.visible;
    },
    check(t, s) {
      t.equal(s.memo.toggled, !s.memo.initial, "indicator flips after one press");
      t.equal(s.scene.hud.hudMuted.visible, s.memo.initial, "back to the original state after two");
    },
  },
  {
    id: "ui.dialogue-skip",
    group: "UI",
    title: "Holding an advance key skips the whole conversation",
    frames: 70,
    setup(s) {
      s.scene.showDialogue(STORY.intro, () => {
        s.memo.doneAt = s.frame;
        s.scene.game.mode = "playing";
      });
    },
    input: [{ from: 0, to: 69, hold: ["Enter"] }],
    check(t, s) {
      t.ok(s.memo.doneAt !== undefined, "dialogue finished");
      t.atMost(s.memo.doneAt ?? Infinity, 50, "within ~¾ s of holding");
    },
  },
  {
    id: "ui.boss-bar",
    group: "UI",
    title: "A living boss gets the named health bar",
    frames: 3,
    setup: (s) => s.spawn({ boss: true, name: "ԳԱԳՈ", paletteKey: "thug1", hp: 120, scale: 1.18, x: 700 }, { dummy: true }),
    check(t, s) {
      t.ok(s.scene.hud.bossName.visible, "boss bar visible");
      t.equal(s.scene.hud.bossName.text, "ԳԱԳՈ", "boss name");
    },
  },
  {
    id: "ui.controls-hint",
    group: "UI",
    title: "The control hint lists every key the game reads",
    frames: 1,
    check(t, s) {
      const hint = s.scene.hud.hudHint.text;
      for (const key of ["WASD", "J/Z", "K/X", "SPACE", "E ", "L/Shift", "U ", "Esc", "M "]) t.ok(hint.includes(key), `mentions ${key.trim()}`);
    },
  },
  {
    id: "ui.foreground",
    group: "UI",
    title: "The foreground strip doesn't hide the fighters",
    frames: 1,
    check(t, s) {
      t.atMost(s.scene.bg.fore.alpha, 0.35, "foreground opacity");
    },
  },
];

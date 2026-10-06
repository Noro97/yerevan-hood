import { test } from "node:test";
import assert from "node:assert/strict";
import { rng } from "../../src/core/Random.js";
import { ATTACKS, WEAPONS, SCORE, SUPER, COMBO_WINDOW, LOOT_TABLE } from "../../src/data/combat.js";
import { CrateModel } from "../../src/models/CrateModel.js";
import { BulletModel } from "../../src/models/BulletModel.js";
import { PickupModel } from "../../src/models/PickupModel.js";
import { makeWorld, strike } from "./helpers.js";

test("a player punch in reach damages the enemy and feeds combo, score and super", () => {
  rng.seed(1);
  const { world, combat, events } = makeWorld({ enemies: [{ x: 330, facing: -1 }] });
  strike(world.playerModel, "punch");
  combat.resolveHits();
  const e = world.enemies[0];
  assert.equal(e.hp, 100 - ATTACKS.punch.dmg);
  assert.equal(world.game.combo, 1);
  assert.equal(world.game.comboTimer, COMBO_WINDOW);
  assert.equal(world.game.score, SCORE.punch);
  assert.equal(world.game.super, SUPER.gainPunch);
  assert.ok(world.playerModel.hitDone);
  assert.ok(events.some(([k, v]) => k === "popup" && v === `-${ATTACKS.punch.dmg}`));
});

test("no hit outside the depth lane or behind the attacker", () => {
  const offLane = makeWorld({ enemies: [{ x: 330, y: 470 + 40 }] });
  strike(offLane.world.playerModel);
  offLane.combat.resolveHits();
  assert.equal(offLane.world.enemies[0].hp, 100);

  const behind = makeWorld({ enemies: [{ x: 250 }] });
  strike(behind.world.playerModel);
  behind.combat.resolveHits();
  assert.equal(behind.world.enemies[0].hp, 100);
});

test("a shielder facing the attacker blocks; from behind the hit lands in full", () => {
  rng.seed(3);
  const front = makeWorld({ enemies: [{ x: 330, facing: -1, archetype: "shielder" }] });
  strike(front.world.playerModel, "kick");
  front.combat.resolveHits();
  assert.equal(front.world.enemies[0].hp, 100 - Math.max(1, Math.round(ATTACKS.kick.dmg * 0.25)));
  assert.ok(front.events.some(([k, v]) => k === "popup" && v === "ԿԼԱՆԿ!"));

  const back = makeWorld({ enemies: [{ x: 330, facing: 1, archetype: "shielder" }] });
  strike(back.world.playerModel, "kick");
  back.combat.resolveHits();
  assert.equal(back.world.enemies[0].hp, 100 - ATTACKS.kick.dmg);
});

test("a lid in the player's hands blocks bullets coming from the front", () => {
  const { world, combat } = makeWorld({ player: { facing: -1, weapon: { kind: "lid", def: WEAPONS.lid, uses: 6 } } });
  world.bullets.push(new BulletModel({ x: 290, gy: 470, ry: 420, vx: 9.5, dmg: 9, fromPlayer: false }));
  combat.updateBullets(1);
  assert.equal(world.playerModel.hp, 98);
  assert.equal(world.bullets.length, 0);
});

test("breaking a crate drops loot", () => {
  rng.seed(5);
  const { world, combat } = makeWorld();
  const crate = new CrateModel({ x: 330, y: 470 });
  world.crates.push(crate);
  combat.hitCrate(crate, 1);
  assert.equal(world.crates.length, 1);
  combat.hitCrate(crate, 1);
  assert.equal(world.crates.length, 0);
  assert.equal(world.pickups.length, 1);
  assert.ok(LOOT_TABLE.some(([, type]) => type === world.pickups[0].type));
});

test("shawarma heals up to max HP; a weapon is not picked up while holding one", () => {
  const { world, combat } = makeWorld({ player: { weapon: { kind: "stick", def: WEAPONS.stick, uses: 2 } } });
  world.playerModel.hp = 90;
  assert.ok(combat.applyPickup(new PickupModel({ x: 0, y: 0, type: "shawarma" })));
  assert.equal(world.playerModel.hp, 100);
  assert.equal(combat.applyPickup(new PickupModel({ x: 0, y: 0, type: "bottle" })), false);
});

test("a killed gunner always drops a pistol with 3-6 rounds", () => {
  for (let seed = 1; seed <= 20; seed++) {
    rng.seed(seed);
    const { world, combat } = makeWorld({ enemies: [{ x: 330 }] });
    world.enemies[0].gunner = true;
    combat.onKill(world.enemies[0]);
    assert.equal(world.pickups[0].type, "pistol");
    assert.ok(world.pickups[0].meta.ammo >= 3 && world.pickups[0].meta.ammo <= 6);
  }
});

test("body collisions push overlapping fighters apart symmetrically", () => {
  const { world, combat } = makeWorld({ enemies: [{ x: 305 }] });
  const before = world.playerModel.x + world.enemies[0].x;
  combat.resolveBodyCollisions();
  assert.ok(world.enemies[0].x - world.playerModel.x > 5);
  assert.ok(Math.abs(world.playerModel.x + world.enemies[0].x - before) < 1e-9);
});

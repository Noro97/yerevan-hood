import { test } from "node:test";
import assert from "node:assert/strict";
import { ATTACKS, COMBAT_DEPTH_BAND, setTuning, getTuning, tuningChanges, resetTuning, TUNING_DEFAULTS } from "../../src/data/combat.js";
import { makeWorld, strike } from "./helpers.js";

test("live edits reach the combat rules, including plain-number tunables", () => {
  try {
    setTuning("ATTACKS.punch.dmg", 30);
    const near = makeWorld({ enemies: [{ x: 330 }] });
    strike(near.world.playerModel);
    near.combat.resolveHits();
    assert.equal(near.world.enemies[0].hp, 70);

    const offLane = { enemies: [{ x: 330, y: 470 + 25 }] };
    const before = makeWorld(offLane);
    strike(before.world.playerModel);
    before.combat.resolveHits();
    assert.equal(before.world.enemies[0].hp, 100, "25 px off-lane misses with the default band");

    setTuning("COMBAT_DEPTH_BAND", 60);
    assert.equal(COMBAT_DEPTH_BAND, 60, "live binding updated");
    const after = makeWorld(offLane);
    strike(after.world.playerModel);
    after.combat.resolveHits();
    assert.equal(after.world.enemies[0].hp, 70, "a wider band reaches it");
  } finally {
    resetTuning();
  }
});

test("only changed values are reported for saving, and reset restores defaults", () => {
  try {
    setTuning("SUPER.damage", 50);
    setTuning("GRAVITY", 0.8);
    assert.deepEqual(tuningChanges(), { GRAVITY: 0.8, SUPER: { damage: 50 } });
  } finally {
    resetTuning();
  }
  assert.deepEqual(tuningChanges(), {});
  assert.equal(getTuning("GRAVITY"), TUNING_DEFAULTS.GRAVITY);
  assert.equal(ATTACKS.punch.dmg, TUNING_DEFAULTS.ATTACKS.punch.dmg);
});

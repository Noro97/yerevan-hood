import { test } from "node:test";
import assert from "node:assert/strict";
import { ATTACKS, WEAPONS } from "../../src/data/combat.js";
import { fighter } from "./helpers.js";

test("third punch inside the chain window becomes a hook", () => {
  const p = fighter({ x: 0, y: 470, isPlayer: true });
  const kinds = [];
  for (let i = 0; i < 3; i++) {
    assert.ok(p.tryAttack("punch"));
    kinds.push(p.attackKind);
    while (p.state === "attack") p.update(1);
    p.cooldown = 0;
  }
  assert.deepEqual(kinds, ["punch", "punch", "hook"]);
});

test("hits are only active inside the attack's active frames", () => {
  const p = fighter({ x: 0, y: 470, isPlayer: true });
  p.tryAttack("kick");
  const active = [];
  for (let t = 0; t < ATTACKS.kick.dur; t++) {
    p.attackTimer = t;
    if (p.getActiveHit()) active.push(t);
  }
  assert.equal(active[0], ATTACKS.kick.from);
  assert.equal(active.at(-1), ATTACKS.kick.to);
});

test("a melee weapon replaces punch range and damage", () => {
  const p = fighter({ x: 0, y: 470, isPlayer: true, weapon: { kind: "stick", def: WEAPONS.stick, uses: 3 } });
  p.tryAttack("punch");
  p.attackTimer = ATTACKS.punch.from;
  const hit = p.getActiveHit();
  assert.equal(hit.dmg, WEAPONS.stick.dmg);
  assert.equal(hit.weapon.kind, "stick");
});

test("vulnerability: rolling and grounded knockdown are safe, airborne knockdown can be juggled", () => {
  const f = fighter({ x: 0, y: 470 });
  assert.ok(f.vulnerable);
  f.state = "roll";
  assert.ok(!f.vulnerable);
  f.state = "down";
  f.z = 0;
  assert.ok(!f.vulnerable);
  f.z = 12;
  assert.ok(f.vulnerable);
});

test("player gets mercy frames when hurt; lethal damage kills", () => {
  const p = fighter({ x: 0, y: 470, isPlayer: true, hp: 20 });
  assert.equal(p.applyHit(5, 1, 4), false);
  assert.equal(p.state, "hurt");
  assert.ok(p.invul > 0);
  p.invul = 0;
  assert.equal(p.applyHit(50, 1, 4), true);
  assert.equal(p.state, "dead");
});

test("knockdown launches the target", () => {
  const e = fighter({ x: 0, y: 470 });
  e.applyHit(5, 1, 6, true);
  assert.equal(e.state, "down");
  assert.ok(e.vz > 0 && e.z > 0);
});

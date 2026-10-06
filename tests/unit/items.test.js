import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { WEAPONS, LOOT_TABLE } from "../../src/data/combat.js";
import { ITEMS, floorLength, handLength } from "../../src/data/items.js";
import { CHAR_SCALE } from "../../src/core/Constants.js";

const manifest = JSON.parse(readFileSync(new URL("../../assets/textures/manifest.json", import.meta.url), "utf8"));

test("every weapon has a size and a grip, every pickup type has a size", () => {
  for (const kind of Object.keys(WEAPONS)) {
    assert.ok(ITEMS[kind]?.grip, `${kind} grip`);
  }
  for (const [, type] of LOOT_TABLE) assert.ok(ITEMS[type], `${type} size`);
  assert.ok(ITEMS.medal);
});

test("floor size equals in-hand size for a scale-1 fighter", () => {
  for (const kind of Object.keys(ITEMS)) {
    assert.ok(Math.abs(floorLength(kind) - handLength(kind) * CHAR_SCALE) < 1e-9, kind);
  }
});

test("the manifest carries measured content for every item texture", () => {
  for (const kind of Object.keys(ITEMS)) {
    assert.ok(manifest[`pickups/${kind}`]?.content?.length > 0, `pickups/${kind}`);
    if (WEAPONS[kind]) assert.ok(manifest[`weapons/${kind}`]?.content?.length > 0, `weapons/${kind}`);
  }
});

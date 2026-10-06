import { test } from "node:test";
import assert from "node:assert/strict";
import { Random } from "../../src/core/Random.js";

test("same seed gives the same sequence", () => {
  const a = new Random(42);
  const b = new Random(42);
  for (let i = 0; i < 100; i++) assert.equal(a.next(), b.next());
});

test("values are in [0, 1) and different seeds diverge", () => {
  const a = new Random(1);
  const b = new Random(2);
  let same = 0;
  for (let i = 0; i < 1000; i++) {
    const v = a.next();
    assert.ok(v >= 0 && v < 1);
    if (v === b.next()) same++;
  }
  assert.ok(same < 5);
});

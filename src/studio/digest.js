const r = (v) => (typeof v === "number" ? Math.round(v * 1e4) / 1e4 : v);

/** A compact, comparable snapshot of the simulation (for replay verification). */
export function stateDigest(scene) {
  const g = scene.game;
  const p = scene.playerModel;
  return JSON.stringify([
    g.mode, g.wave, g.score, g.combo, r(g.super),
    p && [r(p.x), r(p.y), r(p.z), r(p.hp), p.state, p.weapon?.kind ?? "-"],
    scene.enemies.map((e) => [r(e.x), r(e.y), r(e.z), r(e.hp), e.state]),
    scene.pickups.map((k) => k.type).join(","),
    scene.crates.length, scene.bullets.length,
  ]);
}

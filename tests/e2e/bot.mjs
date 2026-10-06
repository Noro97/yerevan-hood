/**
 * Plays the game deterministically from state alone (no timers, no Math.random), so with a
 * fixed seed every run is identical. Runs inside the page via page.evaluate — keep it
 * self-contained. Returns a state digest every `sampleEvery` frames.
 */
export function playAndTrace({ frames, sampleEvery }) {
  const scene = window.__hood.app.scenes.currentScene;
  const app = scene.app;
  const input = app.input;
  const r = (v) => (typeof v === "number" ? Math.round(v * 1e4) / 1e4 : v);
  const samples = [];
  let attacks = 0;

  const digest = (f) => {
    const g = scene.game;
    const p = scene.playerModel;
    return [
      f, g.mode, g.wave, g.score, g.combo, r(g.super), r(g.camX),
      p && [r(p.x), r(p.y), r(p.z), r(p.hp), p.state, p.weapon?.kind ?? "-"],
      scene.enemies.map((e) => [r(e.x), r(e.y), r(e.z), r(e.hp), e.state, e.archetype ?? (e.gunner ? "gun" : "")]),
      scene.pickups.map((k) => k.type).join(","),
      scene.crates.length, scene.bullets.length, scene.throws.length,
    ];
  };

  for (let f = 0; f < frames; f++) {
    const down = new Set();
    const pressed = new Set();
    const g = scene.game;
    const p = scene.playerModel;

    if (g.mode === "dialogue" && f % 6 === 0) pressed.add("Enter");
    if (g.mode === "gameover" && f % 30 === 0) pressed.add("KeyR");
    if (g.mode === "victory" && f % 30 === 0) pressed.add("Enter");

    if (g.mode === "playing" && p?.alive) {
      const foes = scene.enemies.filter((e) => e.alive);
      const target = foes.sort((a, b) => Math.abs(a.x - p.x) + 2 * Math.abs(a.y - p.y) - (Math.abs(b.x - p.x) + 2 * Math.abs(b.y - p.y)))[0]
        ?? scene.pickups[0];
      if (target) {
        const side = target.x >= p.x ? 1 : -1;
        const wantX = foes.length ? target.x - side * 34 : target.x;
        const dx = wantX - p.x;
        const dy = target.y - p.y;
        if (Math.abs(dx) > 4) down.add(dx > 0 ? "KeyD" : "KeyA");
        else if (p.facing !== side) down.add(side > 0 ? "KeyD" : "KeyA");
        if (Math.abs(dy) > 3) down.add(dy > 0 ? "KeyS" : "KeyW");

        const inReach = foes.length && Math.abs(target.x - p.x) < 48 && Math.abs(dy) < 10;
        if (g.super >= 100 && inReach) pressed.add("KeyU");
        else if (p.weapon?.kind === "pistol" && foes.length && Math.abs(dy) < 8 && f % 20 === 0) pressed.add("KeyJ");
        else if (inReach && f % 7 === 0) {
          attacks++;
          pressed.add(attacks % 4 === 0 ? "KeyK" : "KeyJ");
        }
      }
      if (f % 240 === 120) pressed.add("Space");
      if (f % 240 === 132) pressed.add("KeyK");
      if (f % 300 === 0) pressed.add("KeyL");
      if (p.weapon?.def?.melee && f % 400 === 200) pressed.add("KeyE");
    }

    input.keys = down;
    input.justPressed = pressed;
    app.step(1);
    if (f % sampleEvery === 0) samples.push(JSON.stringify(digest(f)));
  }
  const g = scene.game;
  return { samples, summary: { mode: g.mode, wave: g.wave, score: g.score, hp: Math.round(scene.playerModel?.hp ?? 0) } };
}

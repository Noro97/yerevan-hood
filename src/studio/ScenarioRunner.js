import { rng } from "../core/Random.js";
import { WEAPONS } from "../data/combat.js";
import { BulletModel } from "../models/BulletModel.js";

const fmt = (v) => (typeof v === "number" ? String(Math.round(v * 100) / 100) : JSON.stringify(v));

/** Collects check results instead of throwing, so one scenario reports every failed expectation. */
export class Checker {
  constructor() {
    this.results = [];
  }

  ok(condition, message, detail = "") {
    this.results.push({ pass: !!condition, message, detail });
  }

  equal(actual, expected, message) {
    this.ok(Object.is(actual, expected), message, `expected ${fmt(expected)}, got ${fmt(actual)}`);
  }

  atLeast(actual, min, message) {
    this.ok(actual >= min, message, `expected ≥ ${fmt(min)}, got ${fmt(actual)}`);
  }

  atMost(actual, max, message) {
    this.ok(actual <= max, message, `expected ≤ ${fmt(max)}, got ${fmt(actual)}`);
  }

  near(actual, expected, tolerance, message) {
    this.ok(Math.abs(actual - expected) <= tolerance, message, `expected ${fmt(expected)} ± ${tolerance}, got ${fmt(actual)}`);
  }

  get passed() {
    return this.results.length > 0 && this.results.every((r) => r.pass);
  }
}

/**
 * Runs scenario definitions (see scenarios.js) against the live GameplayScene, one fixed
 * frame at a time: seed → startStudio() → setup → scripted input per frame → check.
 * The same code path serves instant runs, real-time "watch" runs and the headless suite.
 */
export class ScenarioRunner {
  constructor(app, scene) {
    this.app = app;
    this.scene = scene;
    this.events = [];
    this.frame = 0;
    this.pins = [];
    this.god = false;
    this.api = null;
  }

  record(event) {
    this.events.push(event);
  }

  prepare(sc) {
    rng.seed(sc.seed ?? 1);
    this.scene.startStudio();
    this.events = [];
    this.frame = 0;
    this.pins = [];
    this.god = false;
    this.api = this.makeApi();
    sc.setup?.(this.api);
  }

  inputFor(sc, frame) {
    const press = new Set();
    const hold = new Set();
    if (typeof sc.input === "function") {
      const r = sc.input(frame, this.api) ?? {};
      r.press?.forEach((k) => press.add(k));
      r.hold?.forEach((k) => hold.add(k));
    } else {
      for (const step of sc.input ?? []) {
        if (step.at === frame) step.press?.forEach((k) => press.add(k));
        if (step.from !== undefined && frame >= step.from && frame <= step.to) step.hold?.forEach((k) => hold.add(k));
      }
    }
    return { press, hold };
  }

  /** Advances one scripted frame. Returns true while the scenario still has frames left. */
  stepScenario(sc) {
    const { press, hold } = this.inputFor(sc, this.frame);
    this.app.input.keys = new Set([...hold, ...press]);
    this.app.input.justPressed = press;
    this.stepFrame();
    sc.onFrame?.(this.api, this.frame);
    this.frame++;
    return this.frame < sc.frames;
  }

  /** One simulation frame with the studio's fixtures (god mode, pinned positions) applied. */
  stepFrame() {
    const p = this.scene.playerModel;
    if (this.god && p) {
      p.hp = p.maxHp;
      if (!p.alive) p.state = "idle";
    }
    this.app.step(1);
    for (const { model, x, y } of this.pins) {
      model.x = x;
      model.y = y;
    }
  }

  evaluate(sc) {
    const t = new Checker();
    try {
      sc.check(t, this.api);
    } catch (err) {
      t.ok(false, "check() threw", String(err?.stack ?? err));
    }
    const pass = t.passed;
    let status = pass ? "pass" : "fail";
    if (sc.knownBug) status = pass ? "unexpected-pass" : "known-bug";
    return {
      id: sc.id, group: sc.group, title: sc.title, knownBug: sc.knownBug ?? null,
      status, pass, frames: this.frame, results: t.results,
    };
  }

  runSync(sc) {
    this.prepare(sc);
    while (this.stepScenario(sc));
    return this.evaluate(sc);
  }

  makeApi() {
    const runner = this;
    const scene = this.scene;
    return {
      scene,
      memo: {},
      get player() {
        return scene.playerModel;
      },
      get enemies() {
        return scene.enemies;
      },
      get frame() {
        return runner.frame;
      },
      events(type) {
        return runner.events.filter((e) => !type || e.type === type);
      },
      hits(filter = {}) {
        return runner.events.filter((e) => e.type === "hit" && Object.entries(filter).every(([k, v]) => e[k] === v));
      },
      setPlayer(props) {
        Object.assign(scene.playerModel, props);
        return scene.playerModel;
      },
      spawn(cfg = {}, props = {}) {
        const { x = null, y = scene.playerModel.y, ...rest } = cfg;
        const m = scene.spawnCustomEnemy({ scale: 1, ...rest }, x, y);
        Object.assign(m, props);
        return m;
      },
      dummy(x, props = {}, cfg = {}) {
        return this.spawn({ archetype: "dummy", hp: 500, x, ...cfg }, props);
      },
      crate(x, y = scene.playerModel.y) {
        return scene.spawnCustomCrate(x, y);
      },
      pickup(type, x, y = scene.playerModel.y) {
        return scene.spawnCustomPickup(type, x, y);
      },
      give(kind, extra = {}) {
        const def = WEAPONS[kind];
        scene.playerModel.setWeapon({ kind, def, uses: def.uses, ammo: def.ammo, ...extra });
      },
      bullet({ x, dir = 1, fromPlayer = false, y = scene.playerModel.y, dmg = 9 }) {
        return scene.spawnBullet(new BulletModel({ x, gy: y, ry: y - 40, vx: dir * 9.5, dmg, fromPlayer }));
      },
      pin(model) {
        runner.pins.push({ model, x: model.x, y: model.y });
      },
      god(on = true) {
        runner.god = on;
      },
      view(model) {
        return model.isPlayer ? scene.playerView : scene.enemyViews.get(model);
      },
      /** World point of a display object's local point (computed now, not from the last render). */
      worldPoint(displayObject, point = { x: 0, y: 0 }) {
        return scene.world.toLocal(displayObject.toGlobal(point));
      },
      /** Uniform world scale of a display object along its local y axis. */
      worldScale(displayObject) {
        const a = this.worldPoint(displayObject, { x: 0, y: 0 });
        const b = this.worldPoint(displayObject, { x: 0, y: 100 });
        return Math.hypot(b.x - a.x, b.y - a.y) / 100;
      },
      worldBounds(displayObject) {
        const b = displayObject.getBounds();
        const tl = scene.world.toLocal({ x: b.minX, y: b.minY });
        const br = scene.world.toLocal({ x: b.maxX, y: b.maxY });
        return { minX: tl.x, minY: tl.y, maxX: br.x, maxY: br.y };
      },
    };
  }
}

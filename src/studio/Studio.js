import { ScenarioRunner } from "./ScenarioRunner.js";
import { OverlayRenderer } from "./OverlayRenderer.js";
import { SCENARIOS } from "./scenarios.js";
import { h } from "./dom.js";
import { TransportBar } from "./panels/TransportBar.js";
import { ScenarioPanel } from "./panels/ScenarioPanel.js";
import { InspectorPanel } from "./panels/InspectorPanel.js";
import { SpawnPanel } from "./panels/SpawnPanel.js";
import { ViewPanel } from "./panels/ViewPanel.js";
import { CombatLog } from "./panels/CombatLog.js";
import { ResultPanel } from "./panels/ResultPanel.js";
import { ItemLabPanel } from "./panels/ItemLabPanel.js";
import { ScreensPanel } from "./panels/ScreensPanel.js";

const FREE_PLAY = {
  id: "free",
  title: "Free play",
  setup: (s) => s.dummy(430),
};

const MAX_STEPS_PER_TICK = 16;

/**
 * Testing studio: drives the real GameplayScene one fixed frame at a time (deterministic),
 * runs scenarios, draws debug overlays and hosts the inspection panels.
 */
export class Studio {
  constructor(app, scene, root) {
    this.app = app;
    this.scene = scene;
    this.runner = new ScenarioRunner(app, scene);
    this.overlays = new OverlayRenderer();
    this.scenarios = SCENARIOS;
    this.playing = false;
    this.speed = 1;
    this.acc = 0;
    this.watching = null;
    this.current = FREE_PLAY;
    this.selected = null;
    this.batch = false;
    this.results = new Map();
    this.handlers = { event: [], result: [], select: [], reset: [] };

    app.paused = true;
    scene.combat.listener = (e) => this.onCombatEvent(e);

    this.buildUI(root);
    this.bindCanvas();
    this.bindHotkeys();
    app.pixiApp.ticker.add(() => this.tick());
    this.reset(FREE_PLAY);
  }

  on(type, fn) {
    this.handlers[type].push(fn);
  }

  emit(type, payload) {
    for (const fn of this.handlers[type]) fn(payload);
  }

  buildUI(root) {
    this.transport = new TransportBar(this);
    this.scenarioPanel = new ScenarioPanel(this);
    this.inspector = new InspectorPanel(this);
    this.spawn = new SpawnPanel(this);
    this.view = new ViewPanel(this);
    this.log = new CombatLog(this);
    this.resultPanel = new ResultPanel(this);
    this.itemLab = new ItemLabPanel(this);
    this.screens = new ScreensPanel(this);

    const tabs = [
      ["Scenarios", this.scenarioPanel],
      ["Inspect", this.inspector],
      ["Spawn", this.spawn],
      ["Items", this.itemLab],
      ["Screens", this.screens],
      ["View", this.view],
    ];
    const tabButtons = tabs.map(([name], i) =>
      h("button", { class: i === 0 ? "tab active" : "tab", onClick: () => showTab(i) }, name));
    const tabBodies = tabs.map(([, panel], i) => h("div", { class: "tab-body", hidden: i !== 0 }, panel.el));
    const showTab = (index) => {
      tabButtons.forEach((b, i) => b.classList.toggle("active", i === index));
      tabBodies.forEach((b, i) => (b.hidden = i !== index));
    };
    this.showTab = (name) => showTab(tabs.findIndex(([n]) => n === name));

    root.querySelector("#transport").append(this.transport.el);
    const sidebar = root.querySelector("#sidebar");
    sidebar.append(h("nav", { class: "tabs" }, tabButtons), ...tabBodies);
    root.querySelector("#bottom").append(this.log.el, this.resultPanel.el);

    // Keys typed into panel inputs must not reach the game's window-level key handler.
    for (const el of [sidebar, root.querySelector("#transport"), root.querySelector("#bottom")]) {
      el.addEventListener("keydown", (e) => {
        if (e.target.matches("input, select, textarea")) e.stopPropagation();
      });
    }
  }

  bindCanvas() {
    const canvas = this.app.pixiApp.canvas;
    canvas.addEventListener("pointerdown", (e) => {
      const rect = canvas.getBoundingClientRect();
      const gx = ((e.clientX - rect.left) / rect.width) * this.app.pixiApp.screen.width;
      const gy = ((e.clientY - rect.top) / rect.height) * this.app.pixiApp.screen.height;
      const p = this.scene.world.toLocal({ x: gx, y: gy });
      const fighters = [this.scene.playerModel, ...this.scene.enemies].filter(Boolean);
      let best = null;
      let bestDist = 55;
      for (const f of fighters) {
        const d = Math.hypot(f.x - p.x, f.y - f.z - 45 * f.scaleF - p.y);
        if (d < bestDist) {
          best = f;
          bestDist = d;
        }
      }
      this.select(best);
      if (best) this.showTab("Inspect");
    });
  }

  bindHotkeys() {
    window.addEventListener("keydown", (e) => {
      if (e.target.matches?.("input, select, textarea")) return;
      if (e.code === "KeyP") this.setPlaying(!this.playing);
      else if (e.code === "KeyN") this.stepFrames(e.shiftKey ? 10 : 1);
    });
  }

  select(model) {
    this.selected = model;
    this.emit("select", model);
  }

  setPlaying(on) {
    this.playing = on;
    this.acc = 0;
    this.transport.refresh();
  }

  setSpeed(speed) {
    this.speed = speed;
    this.acc = 0;
  }

  /** Back to the free-play street, or re-run the setup of `sc` without starting it. */
  reset(sc = this.current) {
    this.watching = null;
    this.current = sc;
    this.runner.prepare(sc);
    this.redraw();
    this.select(this.scene.enemies[0] ?? this.scene.playerModel);
    this.emit("reset", sc);
    this.transport.refresh();
  }

  /** Refreshes views, camera and HUD without simulating a frame (paused previews). */
  redraw() {
    const s = this.scene;
    s.updateCamera(0);
    s.syncViews(0);
    s.hud.updateView(s.game, s.playerModel, s.enemies.find((e) => e.boss && e.alive));
  }

  freePlay() {
    this.reset(FREE_PLAY);
  }

  advance() {
    if (this.watching) {
      const more = this.runner.stepScenario(this.watching);
      if (!more) this.finishWatch();
    } else {
      this.runner.stepFrame();
      this.runner.frame++;
    }
  }

  stepFrames(n) {
    this.setPlaying(false);
    for (let i = 0; i < n; i++) this.advance();
  }

  tick() {
    if (this.playing) {
      this.acc += this.speed;
      let steps = 0;
      while (this.acc >= 1 && steps < MAX_STEPS_PER_TICK && this.playing) {
        this.acc -= 1;
        this.advance();
        steps++;
      }
    }
    const sel = this.selected;
    if (sel && sel !== this.scene.playerModel && !this.scene.enemies.includes(sel)) this.select(null);
    this.overlays.draw(this.scene, this.selected);
    this.transport.tick();
    this.inspector.tick();
  }

  onCombatEvent(event) {
    const e = { ...event, frame: this.runner.frame };
    this.runner.record(e);
    if (!this.batch) this.log.add(e);
  }

  storeResult(result) {
    this.results.set(result.id, result);
    this.emit("result", result);
    return result;
  }

  run(sc) {
    this.setPlaying(false);
    this.watching = null;
    this.current = sc;
    this.log.clear();
    const result = this.storeResult(this.runner.runSync(sc));
    this.resultPanel.show(result);
    return result;
  }

  watch(sc) {
    this.reset(sc);
    this.log.clear();
    this.watching = sc;
    this.setPlaying(true);
  }

  finishWatch() {
    const sc = this.watching;
    this.watching = null;
    this.setPlaying(false);
    this.resultPanel.show(this.storeResult(this.runner.evaluate(sc)));
  }

  runAll() {
    this.setPlaying(false);
    this.batch = true;
    const results = [];
    try {
      for (const sc of this.scenarios) results.push(this.storeResult(this.runner.runSync(sc)));
    } finally {
      this.batch = false;
    }
    this.reset(FREE_PLAY);
    this.resultPanel.showSummary(results);
    return results;
  }

  /** Surface for the headless test suite and the browser console (window.__studio). */
  api() {
    return {
      ready: true,
      studio: this,
      scenarios: this.scenarios.map(({ id, group, title, knownBug }) => ({ id, group, title, knownBug: knownBug ?? null })),
      runAll: () => this.runAll(),
      run: (id) => this.run(this.scenarios.find((s) => s.id === id)),
    };
  }
}

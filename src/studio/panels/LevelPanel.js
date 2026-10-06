import { h } from "../dom.js";
import { persist } from "../persist.js";
import { W, WORLD_W } from "../../core/Constants.js";
import { LAYERS } from "../../views/BackgroundView.js";
import level from "../../data/level.js";
import { clone } from "../../data/patch.js";

const PROP_TYPES = ["lamp", "lada", "bin"];
const LAYER_FIELDS = [["x", 1], ["y", 1], ["scaleX", 0.05], ["scaleY", 0.05], ["alpha", 0.05]];

/** Edits src/data/level.js live: floor, layers, buildings, props; drag props/buildings on the canvas. */
export class LevelPanel {
  constructor(studio) {
    this.studio = studio;
    this.saved = clone(level);
    this.status = h("span", { class: "muted" });
    this.body = h("div");
    this.el = h("div", { class: "panel level" },
      h("p", { class: "muted" }, "Edits src/data/level.js (what the game loads). Drag props and buildings on the canvas while this tab is open."),
      h("div", { class: "row wrap" },
        h("button", { class: "primary", onClick: () => this.save() }, "Save"),
        h("button", { onClick: () => this.revert() }, "Revert to file")),
      this.status,
      this.body);
    this.render();
  }

  get scene() {
    return this.studio.scene;
  }

  apply() {
    this.scene.bg.applyLevel();
    this.studio.redraw();
  }

  num(obj, key, step, onChange = () => this.apply()) {
    return h("input", {
      type: "number", step, value: obj[key], class: "short",
      onChange: (e) => {
        const v = Number(e.target.value);
        if (!Number.isFinite(v)) return;
        obj[key] = v;
        onChange();
      },
    });
  }

  check(obj, key) {
    return h("input", { type: "checkbox", checked: obj[key], onChange: (e) => { obj[key] = e.target.checked; this.apply(); } });
  }

  render() {
    const scroll = h("input", {
      type: "range", min: 0, max: WORLD_W - W, step: 10, value: this.scene.game.camX,
      onInput: (e) => this.scrollTo(Number(e.target.value)),
    });
    const applyFloor = () => this.scene.setFloorBounds(level.floor.top, level.floor.bottom);

    this.body.replaceChildren(
      h("h3", {}, "Camera"),
      h("div", { class: "row" }, "scroll", scroll),
      h("h3", {}, "Walkable floor"),
      h("div", { class: "row" }, "top", this.num(level.floor, "top", 1, applyFloor), "bottom", this.num(level.floor, "bottom", 1, applyFloor)),

      h("h3", {}, "Layers"),
      h("table", { class: "props grid" },
        h("tr", {}, h("th", {}, ""), LAYER_FIELDS.map(([f]) => h("th", {}, f)), h("th", {}, "on")),
        LAYERS.map((name) => h("tr", {}, h("th", {}, name),
          LAYER_FIELDS.map(([f, step]) => h("td", {}, this.num(level.layers[name], f, step))),
          h("td", {}, this.check(level.layers[name], "visible"))))),

      h("h3", {}, "Buildings"),
      h("table", { class: "props grid" },
        h("tr", {}, ["#", "tex", "x", "y", "scale", "on", ""].map((c) => h("th", {}, c))),
        level.buildings.map((b, i) => h("tr", {},
          h("th", {}, i),
          h("td", {}, this.num(b, "texture", 1)),
          h("td", {}, this.num(b, "x", 1)),
          h("td", {}, this.num(b, "y", 1)),
          h("td", {}, h("input", {
            type: "number", step: 0.05, value: b.scaleX, class: "short",
            onChange: (e) => { b.scaleX = b.scaleY = Number(e.target.value); this.apply(); },
          })),
          h("td", {}, this.check(b, "visible")),
          h("td", {}, h("button", { onClick: () => this.removeAt(level.buildings, i) }, "✕"))))),
      h("button", { onClick: () => this.add(level.buildings, { texture: 0, x: this.centerX(), y: 398, scaleX: 1, scaleY: 1, visible: true }) }, "+ building"),

      h("h3", {}, "Props"),
      h("table", { class: "props grid" },
        h("tr", {}, ["id", "type", "x", "y", "scale", ""].map((c) => h("th", {}, c))),
        level.props.map((p, i) => h("tr", {},
          h("th", {}, p.id),
          h("td", {}, h("select", { onChange: (e) => { p.type = e.target.value; this.apply(); } },
            PROP_TYPES.map((t) => h("option", { value: t, selected: t === p.type }, t)))),
          h("td", {}, this.num(p, "x", 1)),
          h("td", {}, this.num(p, "y", 1)),
          h("td", {}, this.num(p, "scale", 0.05)),
          h("td", {}, h("button", { onClick: () => this.removeAt(level.props, i) }, "✕"))))),
      h("div", { class: "row wrap" }, PROP_TYPES.map((type) =>
        h("button", { onClick: () => this.add(level.props, { id: this.nextPropId(type), type, x: this.centerX(), y: 400, scale: 1 }) }, `+ ${type}`))),
    );
  }

  centerX() {
    return Math.round(this.scene.game.camX + W / 2);
  }

  nextPropId(type) {
    const used = new Set(level.props.map((p) => p.id));
    let n = 1;
    while (used.has(`${type}_${n}`)) n++;
    return `${type}_${n}`;
  }

  add(list, entry) {
    list.push(entry);
    this.apply();
    this.render();
  }

  removeAt(list, index) {
    list.splice(index, 1);
    this.apply();
    this.render();
  }

  scrollTo(camX) {
    const p = this.scene.playerModel;
    if (p) p.x = camX + W / 2;
    this.scene.game.camX = camX;
    this.studio.redraw();
  }

  /** Canvas drag: returns true when the press landed on a prop or building. */
  pick(global) {
    const bg = this.scene.bg;
    const hit = (sprite) => sprite.visible && sprite.getBounds().containsPoint(global.x, global.y);
    const prop = [...bg.propsList].reverse().find((pr) => hit(pr.sprite));
    if (prop) {
      this.dragging = { cfg: prop.cfg, apply: () => bg.placeProp(prop) };
      return true;
    }
    const index = bg.buildings.map((s, i) => [s, i]).reverse().find(([s]) => hit(s))?.[1];
    if (index !== undefined) {
      const cfg = level.buildings[index];
      this.dragging = { cfg, apply: () => bg.buildings[index].position.set(cfg.x, cfg.y) };
      return true;
    }
    return false;
  }

  dragBy(dx, dy) {
    if (!this.dragging) return;
    const { cfg, apply } = this.dragging;
    cfg.x = Math.round(cfg.x + dx);
    cfg.y = Math.round(cfg.y + dy);
    apply();
  }

  endDrag() {
    this.dragging = null;
    this.apply();
    this.render();
  }

  revert() {
    for (const key of Object.keys(level)) level[key] = clone(this.saved[key]);
    this.scene.setFloorBounds(level.floor.top, level.floor.bottom);
    this.apply();
    this.render();
    this.status.textContent = "reverted to the last saved level";
  }

  async save() {
    try {
      this.status.textContent = await persist("level", level);
      this.saved = clone(level);
    } catch (err) {
      this.status.textContent = `save failed: ${err.message}`;
    }
  }
}

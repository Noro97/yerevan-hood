import { h } from "../dom.js";
import { persist } from "../persist.js";
import { WEAPONS } from "../../data/combat.js";
import { ITEMS, displayMeters, floorLength, FLOOR_PX_PER_METER, itemChanges, resetItems } from "../../data/items.js";

const r2 = (v) => Math.round(v * 100) / 100;

/** Edit the shared item size table live, next to characters and a metre ruler. */
export class ItemLabPanel {
  constructor(studio) {
    this.studio = studio;
    this.rows = new Map();
    this.status = h("span", { class: "muted" });
    const table = h("table", { class: "props items" },
      h("tr", {}, h("th", {}, "item"), h("th", {}, "real m"), h("th", {}, "× show"), h("th", {}, "shown"), h("th", {}, "floor px")),
      Object.keys(ITEMS).map((kind) => this.row(kind)));

    this.el = h("div", { class: "panel items" },
      h("p", { class: "muted" },
        `One size table for floor and hands (src/data/items.js). 1 m = ${r2(FLOOR_PX_PER_METER)} px on the street for a scale-1 fighter; `,
        "“× show” enlarges small things so they stay readable."),
      h("div", { class: "row wrap" },
        h("button", { class: "primary", onClick: () => this.layout() }, "Lay out item lab"),
        h("button", { onClick: () => this.save() }, "Save"),
        h("button", { onClick: () => this.reset() }, "Reset")),
      this.status,
      table);
  }

  row(kind) {
    const item = ITEMS[kind];
    const shown = h("td", { class: "mono" });
    const px = h("td", { class: "mono" });
    const input = (key, step) => h("input", {
      type: "number", step, min: 0.01, value: item[key], class: "short",
      onChange: (e) => {
        const v = Number(e.target.value);
        if (v > 0) {
          item[key] = v;
          this.apply();
        }
      },
    });
    const real = input("real", 0.01);
    const show = input("show", 0.1);
    this.rows.set(kind, { shown, px, real, show });
    this.fill(kind);
    return h("tr", {}, h("th", {}, kind, WEAPONS[kind] ? " ✋" : ""), h("td", {}, real), h("td", {}, show), shown, px);
  }

  fill(kind) {
    const { shown, px } = this.rows.get(kind);
    shown.textContent = `${r2(displayMeters(kind))} m`;
    px.textContent = r2(floorLength(kind));
  }

  async save() {
    try {
      this.status.textContent = await persist("items", itemChanges());
    } catch (err) {
      this.status.textContent = `save failed: ${err.message}`;
    }
  }

  reset() {
    resetItems();
    for (const [kind, { real, show }] of this.rows) {
      real.value = ITEMS[kind].real;
      show.value = ITEMS[kind].show;
    }
    this.apply();
    this.status.textContent = "reset to the defaults in items.js (not saved)";
  }

  apply() {
    const scene = this.studio.scene;
    for (const kind of this.rows.keys()) this.fill(kind);
    for (const view of scene.pickupViews.values()) view.applySize();
    for (const view of [scene.playerView, ...scene.enemyViews.values()]) view?.refreshWeapon();
  }

  layout() {
    const studio = this.studio;
    studio.reset({
      id: "item-lab",
      title: "Item lab",
      setup(s) {
        s.setPlayer({ x: 160, y: 455, facing: 1 });
        Object.keys(WEAPONS).forEach((kind, i) => {
          const d = s.dummy(240 + i * 75, { facing: 1 }, { y: 455 });
          d.setWeapon({ kind, def: WEAPONS[kind] });
        });
        Object.keys(ITEMS).forEach((type, i) => s.pickup(type, 200 + i * 52, 515));
        s.crate(760, 455);
      },
    });
    studio.overlays.layers.ruler = true;
    studio.view.sync();
  }
}

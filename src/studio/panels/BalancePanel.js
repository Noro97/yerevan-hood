import { h } from "../dom.js";
import { persist } from "../persist.js";
import { tuningSnapshot, setTuning, getTuning, tuningChanges, resetTuning, TUNING_DEFAULTS } from "../../data/combat.js";
import { getPath } from "../../data/patch.js";

const SCALARS = ["GRAVITY", "JUMP_VEL", "BASE_SPEED", "COMBAT_DEPTH_BAND", "PROJECTILE_DEPTH_BAND", "COMBO_WINDOW"];

/** Every number in src/data/combat.js, editable live; saves only the changes to tuning/balance.js. */
export class BalancePanel {
  constructor(studio) {
    this.studio = studio;
    this.inputs = new Map();
    this.status = h("span", { class: "muted" });
    this.count = h("span", { class: "summary" });
    const filter = h("input", { type: "search", placeholder: "filter, e.g. punch or AI.", onInput: (e) => this.filter(e.target.value) });

    const snap = tuningSnapshot();
    const sections = [
      this.section("Movement & lanes", SCALARS.map((k) => [k, k])),
      ...Object.keys(snap).filter((k) => !SCALARS.includes(k)).map((table) =>
        this.section(table, leaves(snap[table], table).map((path) => [labelFor(snap, table, path), path]))),
    ];

    this.el = h("div", { class: "panel balance" },
      h("p", { class: "muted" }, "Live values from src/data/combat.js. Edits apply instantly; Save writes only the changes to src/data/tuning/balance.js."),
      h("div", { class: "row wrap" },
        h("button", { class: "primary", onClick: () => this.save() }, "Save"),
        h("button", { onClick: () => this.resetAll() }, "Reset to defaults"),
        this.count),
      h("div", { class: "row" }, filter),
      this.status,
      sections);
    this.refreshAll();
  }

  section(title, entries) {
    const rows = entries.map(([label, path]) => {
      const value = getTuning(path);
      const input = typeof value === "boolean"
        ? h("input", { type: "checkbox", checked: value, onChange: (e) => this.edit(path, e.target.checked) })
        : h("input", { type: "number", step: stepFor(value), onChange: (e) => this.edit(path, Number(e.target.value)) });
      const row = h("tr", { "data-path": path.toLowerCase() }, h("th", { title: path }, label), h("td", {}, input));
      this.inputs.set(path, { input, row });
      return row;
    });
    return h("details", { open: title === "Movement & lanes" || title === "ATTACKS" },
      h("summary", {}, title), h("table", { class: "props" }, rows));
  }

  edit(path, value) {
    if (typeof value === "number" && !Number.isFinite(value)) return;
    setTuning(path, value);
    this.refresh(path);
    this.updateCount();
  }

  refresh(path) {
    const { input, row } = this.inputs.get(path);
    const value = getTuning(path);
    if (input.type === "checkbox") input.checked = value;
    else if (document.activeElement !== input) input.value = String(value);
    row.classList.toggle("changed", JSON.stringify(value) !== JSON.stringify(getPath(TUNING_DEFAULTS, path)));
  }

  refreshAll() {
    for (const path of this.inputs.keys()) this.refresh(path);
    this.updateCount();
  }

  updateCount() {
    const n = leaves(tuningChanges(), "").length;
    this.count.textContent = n ? `${n} changed` : "defaults";
    this.count.classList.toggle("bad", n > 0);
  }

  filter(text) {
    const q = text.trim().toLowerCase();
    for (const { row } of this.inputs.values()) row.hidden = q && !row.dataset.path.includes(q);
    for (const d of this.el.querySelectorAll("details")) {
      if (q) d.open = [...d.querySelectorAll("tr")].some((r) => !r.hidden);
    }
  }

  resetAll() {
    resetTuning();
    this.refreshAll();
    this.status.textContent = "reset to the defaults in combat.js (not saved)";
  }

  async save() {
    try {
      this.status.textContent = await persist("balance", tuningChanges());
    } catch (err) {
      this.status.textContent = `save failed: ${err.message}`;
    }
  }
}

/** Dotted paths of every number / boolean leaf under `obj`. */
function leaves(obj, prefix) {
  return Object.entries(obj).flatMap(([key, value]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === "object") return leaves(value, path);
    return typeof value === "number" || typeof value === "boolean" ? [path] : [];
  });
}

function labelFor(snap, table, path) {
  // LOOT_TABLE rows are [cumulative threshold, item]
  if (table === "LOOT_TABLE") return `${snap.LOOT_TABLE[Number(path.split(".")[1])][1]} below`;
  return path.slice(table.length + 1);
}

function stepFor(value) {
  if (Number.isInteger(value)) return 1;
  return Math.abs(value) < 1 ? 0.01 : 0.1;
}

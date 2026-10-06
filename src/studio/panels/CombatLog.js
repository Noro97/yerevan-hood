import { h, downloadJSON } from "../dom.js";

const TYPES = ["hit", "block", "kill", "crate", "pickup", "super"];
const MAX_ROWS = 400;
const who = (m) => (m ? `${m.label ?? (m.isPlayer ? "player" : "?")}${m.id ? `#${m.id}` : ""}` : "—");

export class CombatLog {
  constructor(studio) {
    this.studio = studio;
    this.entries = [];
    this.filters = new Set(TYPES);
    this.list = h("ol", { class: "log-list mono" });
    this.count = h("span", { class: "muted" }, "0 events");
    this.el = h("section", { class: "panel log" },
      h("div", { class: "panel-head" },
        h("h3", {}, "Combat log"),
        TYPES.map((t) => h("label", { class: `check tag ${t}` },
          h("input", { type: "checkbox", checked: true, onChange: (e) => this.setFilter(t, e.target.checked) }), t)),
        this.count,
        h("button", { onClick: () => this.clear() }, "Clear"),
        h("button", { onClick: () => downloadJSON("combat-log.json", this.entries.map(serialize)) }, "Export")),
      this.list);
  }

  setFilter(type, on) {
    if (on) this.filters.add(type);
    else this.filters.delete(type);
    this.list.replaceChildren(...this.entries.filter((e) => this.filters.has(e.type)).map((e) => this.row(e)));
  }

  clear() {
    this.entries = [];
    this.list.replaceChildren();
    this.count.textContent = "0 events";
  }

  add(e) {
    this.entries.push(e);
    if (this.entries.length > MAX_ROWS) this.entries.shift();
    this.count.textContent = `${this.entries.length} events`;
    if (!this.filters.has(e.type)) return;
    const stick = this.list.scrollTop + this.list.clientHeight >= this.list.scrollHeight - 4;
    this.list.append(this.row(e));
    while (this.list.childElementCount > MAX_ROWS) this.list.firstChild.remove();
    if (stick) this.list.scrollTop = this.list.scrollHeight;
  }

  row(e) {
    const what = e.type === "pickup" ? e.item
      : e.type === "crate" ? (e.broken ? "broken" : "cracked")
        : [e.source === "melee" ? e.kind : e.source, e.weapon].filter(Boolean).join(" ");
    return h("li", { class: e.type },
      h("span", { class: "f" }, `f${e.frame}`),
      h("span", { class: "t" }, e.type.toUpperCase()),
      h("span", { class: "who" }, e.type === "crate" ? "crate" : e.type === "kill" ? who(e.target) : `${who(e.attacker)} → ${who(e.target)}`),
      h("span", {}, what ?? ""),
      e.dmg !== undefined && h("span", { class: "dmg" }, `-${e.dmg}`),
      e.z !== undefined && e.z > 0.5 && h("span", { class: "muted" }, `z ${Math.round(e.z * 10) / 10}`),
      e.knockdown && h("span", { class: "flag" }, "KD"),
      e.killed && h("span", { class: "flag kill" }, "KO"),
      e.target?.dummy && h("span", { class: "muted" }, "dummy"));
  }
}

function serialize(e) {
  const out = {};
  for (const [k, v] of Object.entries(e)) out[k] = v && typeof v === "object" ? who(v) : v;
  return out;
}

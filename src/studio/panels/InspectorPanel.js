import { h } from "../dom.js";
import { WEAPONS } from "../../data/combat.js";

const n = (v, d = 1) => (typeof v === "number" ? (Math.round(v * 10 ** d) / 10 ** d).toString() : String(v));

const READ = [
  ["state", (f) => `${f.state}${f.alive ? "" : " (dead)"}${f.vulnerable ? "" : " · safe"}`],
  ["attack", (f) => (f.state === "attack" ? `${f.attackKind} @${n(f.attackTimer, 0)}${f.hitDone ? " · done" : ""}` : f.airKick ? "air kick" : "—")],
  ["active hit", (f) => {
    const hit = f.alive ? f.getActiveHit() : null;
    return hit ? `${hit.kind} ${n(hit.range)}px ${hit.dmg}dmg${hit.knockdown ? " KD" : ""}` : "—";
  }],
  ["z / vz", (f) => `${n(f.z)} / ${n(f.vz)}`],
  ["knockback", (f) => n(f.kbX, 2)],
  ["cooldown", (f) => n(f.cooldown)],
  ["chain", (f) => `${f.chain} · window ${n(f.chainWindow)}`],
  ["kind", (f) => [f.archetype, f.boss && "boss", f.gunner && "gunner", f.dummy && "AI off"].filter(Boolean).join(" · ") || "—"],
  ["weapon", (f) => (f.weapon ? `${f.weapon.kind} ${f.weapon.def?.melee ? `uses ${f.weapon.uses}` : `ammo ${f.weapon.ammo ?? "—"}`}` : "—")],
  ["to player", (f, s) => {
    const p = s.scene.playerModel;
    return f === p || !p ? "—" : `dx ${n(f.x - p.x)} · dy ${n(f.y - p.y)}`;
  }],
  ["AI", (f) => (f.isPlayer ? "—" : `side ${f.aiSide} · offY ${n(f.aiOffY)} · timer ${n(f.aiTimer, 0)}`)],
];

const EDIT = [
  ["x", 1], ["y", 1], ["hp", 1], ["maxHp", 1], ["power", 0.1], ["speed", 0.1], ["invul", 1], ["aiCool", 1],
];

export class InspectorPanel {
  constructor(studio) {
    this.studio = studio;
    this.last = 0;
    this.chips = h("div", { class: "chips" });
    this.title = h("div", { class: "inspect-title" }, "Nothing selected");
    this.readCells = new Map();
    this.inputs = new Map();

    const readRows = READ.map(([label]) => {
      const cell = h("td", { class: "mono" });
      this.readCells.set(label, cell);
      return h("tr", {}, h("th", {}, label), cell);
    });
    const editRows = EDIT.map(([key, step]) => {
      const input = h("input", { type: "number", step, onChange: (e) => this.write(key, Number(e.target.value)) });
      this.inputs.set(key, input);
      return h("tr", {}, h("th", {}, key), h("td", {}, input));
    });
    const facing = h("select", { onChange: (e) => this.write("facing", Number(e.target.value)) },
      h("option", { value: 1 }, "→ right"), h("option", { value: -1 }, "← left"));
    this.inputs.set("facing", facing);
    editRows.push(h("tr", {}, h("th", {}, "facing"), h("td", {}, facing)));

    const weaponSel = h("select", { onChange: (e) => this.giveWeapon(e.target.value) },
      h("option", { value: "" }, "weapon…"), h("option", { value: "none" }, "none"),
      Object.keys(WEAPONS).map((k) => h("option", { value: k }, k)));

    this.body = h("div", { class: "inspect-body", hidden: true },
      h("table", { class: "props" }, readRows),
      h("h3", {}, "Edit"),
      h("table", { class: "props" }, editRows),
      h("div", { class: "row wrap" },
        h("button", { onClick: () => this.act("heal") }, "Full HP"),
        h("button", { onClick: () => this.act("knockdown") }, "Knock down"),
        h("button", { onClick: () => this.act("kill") }, "Kill"),
        h("button", { onClick: () => this.act("ai") }, "Toggle AI"),
        h("button", { onClick: () => this.act("remove") }, "Remove"),
        weaponSel));

    this.el = h("div", { class: "panel inspector" }, h("h3", {}, "Fighters"), this.chips, this.title, this.body);
    studio.on("select", () => this.render(true));
  }

  get target() {
    return this.studio.selected;
  }

  write(key, value) {
    if (this.target && Number.isFinite(value)) this.target[key] = value;
  }

  giveWeapon(kind) {
    const f = this.target;
    if (!f || !kind) return;
    f.setWeapon(kind === "none" ? null : { kind, def: WEAPONS[kind], uses: WEAPONS[kind].uses, ammo: WEAPONS[kind].ammo });
  }

  act(action) {
    const f = this.target;
    if (!f) return;
    const scene = this.studio.scene;
    if (action === "heal") f.hp = f.maxHp;
    if (action === "knockdown") f.applyHit(0, -f.facing, 4, true);
    if (action === "kill" && f.alive) {
      f.invul = 0;
      if (f.state === "down" || f.state === "rise" || f.state === "roll") f.state = "idle";
      if (f.applyHit(f.hp + 1, -f.facing, 6, true) && !f.isPlayer) scene.combat.onKill(f);
    }
    if (action === "ai") f.dummy = !f.dummy;
    if (action === "remove" && !f.isPlayer) {
      scene.removeEnemy(f);
      this.studio.select(null);
    }
    this.render(true);
  }

  tick() {
    const now = performance.now();
    if (now - this.last < 100) return;
    this.last = now;
    this.render(false);
  }

  render(force) {
    const scene = this.studio.scene;
    const fighters = [scene.playerModel, ...scene.enemies].filter(Boolean);
    const key = fighters.map((f) => f.id).join(",");
    if (force || key !== this.chipKey) {
      this.chipKey = key;
      this.chips.replaceChildren(...fighters.map((f) =>
        h("button", { class: f === this.target ? "chip active" : "chip", onClick: () => this.studio.select(f) }, `${f.label} #${f.id}`)));
    }
    const f = this.target;
    this.body.hidden = !f;
    if (!f) {
      this.title.textContent = "Click a fighter on the canvas, or pick one above.";
      return;
    }
    this.title.textContent = `${f.label} #${f.id} · HP ${n(Math.max(0, f.hp), 0)}/${f.maxHp}`;
    for (const [label, fn] of READ) this.readCells.get(label).textContent = fn(f, this.studio);
    for (const [key, input] of this.inputs) {
      if (document.activeElement === input) continue;
      input.value = key === "facing" ? String(f.facing) : n(f[key], 2);
    }
  }
}

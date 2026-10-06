import { h } from "../dom.js";
import { ATTACKS, RECOIL, WEAPONS, GRAVITY, JUMP_VEL } from "../../data/combat.js";
import { textureManager } from "../../core/TextureManager.js";

const PALETTES = ["player", "thug1", "thug2", "thug3", "gunner", "shielder", "boss"];

// pose → [frames, apply(model, frame)]
const POSES = {
  idle: [120, (m, f) => { m.t = f; }],
  walk: [48, (m, f) => { Object.assign(m, { state: "walk", vx: 1, t: f }); }],
  punch: [ATTACKS.punch.dur, (m, f) => { Object.assign(m, { state: "attack", attackKind: "punch", attackTimer: f }); }],
  hook: [ATTACKS.hook.dur, (m, f) => { Object.assign(m, { state: "attack", attackKind: "hook", attackTimer: f }); }],
  kick: [ATTACKS.kick.dur, (m, f) => { Object.assign(m, { state: "attack", attackKind: "kick", attackTimer: f }); }],
  jump: [Math.ceil((2 * JUMP_VEL) / GRAVITY), (m, f) => { m.z = Math.max(0, JUMP_VEL * f - (GRAVITY * f * f) / 2); }],
  "air kick": [20, (m) => { Object.assign(m, { z: 30, airKick: true }); }],
  hurt: [13, (m, f) => { Object.assign(m, { state: "hurt", hurtTimer: 13 - f }); }],
  roll: [14, (m, f) => { Object.assign(m, { state: "roll", rollTimer: 14 - f }); }],
  down: [42, (m, f) => { Object.assign(m, { state: "down", downTimer: f }); }],
  rise: [18, (m, f) => { Object.assign(m, { state: "rise", riseTimer: f }); }],
  dead: [80, (m, f) => { Object.assign(m, { state: "dead", deadTimer: f }); }],
  shoot: [RECOIL.shoot, (m, f) => { Object.assign(m, { state: "recoil", recoilKind: "shoot", recoilTimer: RECOIL.shoot - f }); }],
  throw: [RECOIL.throw, (m, f) => { Object.assign(m, { state: "recoil", recoilKind: "throw", recoilTimer: RECOIL.throw - f }); }],
  super: [20, (m, f) => { m.superSpin = 20 - f; }],
};

const NEUTRAL = {
  state: "idle", z: 0, vz: 0, vx: 0, vy: 0, kbX: 0, airKick: false, superSpin: 0, flash: 0, blockFlash: 0,
  invul: 0, justLanded: 0, lampGlow: 0, enraged: false, attackKind: null,
};

/** Every character in every pose, frame by frame, without running the simulation. */
export class RigPanel {
  constructor(studio) {
    this.studio = studio;
    this.active = false;
    this.playing = true;
    this.pose = "punch";
    this.frame = 0;
    this.facing = 1;

    this.frameLabel = h("span", { class: "mono" });
    this.slider = h("input", { type: "range", min: 0, step: 1, value: 0, onInput: (e) => this.setFrame(Number(e.target.value)) });
    this.playBtn = h("button", { onClick: () => this.setPlaying(!this.playing) }, "⏸");
    this.detail = h("pre", { class: "mono manifest" });
    this.poseSelect = h("select", { onChange: (e) => this.setPose(e.target.value) },
      Object.keys(POSES).map((p) => h("option", { value: p, selected: p === this.pose }, p)));

    this.el = h("div", { class: "panel rig" },
      h("div", { class: "row wrap" },
        h("button", { class: "primary", onClick: () => this.open() }, "Line up all characters")),
      h("div", { class: "row" }, "pose", this.poseSelect,
        "weapon",
        h("select", { onChange: (e) => this.setWeapon(e.target.value) },
          h("option", { value: "" }, "none"), Object.keys(WEAPONS).map((k) => h("option", { value: k }, k))),
        h("button", { title: "Flip facing", onClick: () => { this.facing *= -1; this.apply(); } }, "⇄")),
      h("div", { class: "row" }, this.playBtn, this.slider, this.frameLabel),
      h("p", { class: "muted" }, "Tip: View → Rig pivots shows every part's anchor."),
      h("h3", {}, "Texture gallery"),
      this.gallery(),
      this.detail);

    studio.tickHooks.push(() => this.tick());
    studio.on("reset", (sc) => {
      this.active = sc?.id === "rig";
    });
    this.setPose(this.pose);
  }

  open() {
    this.studio.reset({
      id: "rig",
      title: "Rig viewer",
      setup(s) {
        s.setPlayer({ x: 110, y: 470 });
        PALETTES.slice(1).forEach((paletteKey, i) => s.dummy(220 + i * 110, {}, { paletteKey, y: 470 }));
      },
    });
    this.studio.select(null);
    this.apply();
  }

  get models() {
    const s = this.studio.scene;
    return [s.playerModel, ...s.enemies].filter(Boolean);
  }

  setPose(name) {
    this.pose = name;
    this.poseSelect.value = name;
    this.slider.max = POSES[name][0] - 1;
    this.setFrame(0);
  }

  setFrame(f) {
    this.frame = f;
    this.slider.value = String(Math.floor(f));
    this.apply();
  }

  setPlaying(on) {
    this.playing = on;
    this.playBtn.textContent = on ? "⏸" : "▶";
  }

  setWeapon(kind) {
    for (const m of this.models) m.setWeapon(kind ? { kind, def: WEAPONS[kind], uses: 9, ammo: 9 } : null);
    this.apply();
  }

  apply() {
    if (!this.active) return;
    const [frames, posefn] = POSES[this.pose];
    const f = Math.min(Math.floor(this.frame), frames - 1);
    this.frameLabel.textContent = `${f + 1} / ${frames}`;
    const scene = this.studio.scene;
    for (const m of this.models) {
      Object.assign(m, NEUTRAL, { facing: this.facing });
      posefn(m, f);
      const view = m.isPlayer ? scene.playerView : scene.enemyViews.get(m);
      view.alpha = 1;
      view.updateView(0, m);
    }
  }

  tick() {
    if (!this.active) return;
    if (this.playing) {
      this.frame = (this.frame + 0.5) % POSES[this.pose][0];
      this.slider.value = String(Math.floor(this.frame));
    }
    this.apply();
  }

  gallery() {
    const manifest = textureManager.manifest ?? {};
    const groups = new Map();
    for (const key of Object.keys(manifest)) {
      const group = key.split("/")[0];
      if (!groups.has(group)) groups.set(group, []);
      groups.get(group).push(key);
    }
    return h("div", { class: "gallery" }, [...groups].map(([group, keys]) => h("details", {},
      h("summary", {}, `${group} (${keys.length})`),
      h("div", { class: "thumbs" }, keys.map((key) => h("button", {
        class: "thumb", title: key,
        onClick: () => (this.detail.textContent = `${key}\n${JSON.stringify(manifest[key], null, 2)}`),
      }, h("img", { src: manifest[key].png, alt: key, loading: "lazy" }), h("span", {}, key.split("/")[1])))))));
  }
}

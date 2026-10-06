import { h } from "../dom.js";
import { WEAPONS } from "../../data/combat.js";

const ENEMIES = {
  thug1: { paletteKey: "thug1" },
  thug2: { paletteKey: "thug2" },
  thug3: { paletteKey: "thug3" },
  rusher: { archetype: "rusher", paletteKey: "thug3", speed: 2.2, lungeMul: 3.2, aiCool: 60 },
  grappler: { archetype: "grappler", paletteKey: "thug1", scale: 1.16, speed: 1.1, hp: 75, aiCool: 95 },
  gunner: { gunner: true, paletteKey: "gunner", speed: 1.5 },
  shielder: { archetype: "shielder", paletteKey: "shielder", speed: 1.2, scale: 1.06, hp: 65 },
  Gago: { boss: true, name: "ԳԱԳՈ", paletteKey: "thug1", hp: 120, speed: 1.5, power: 0.95, scale: 1.18, aiCool: 55 },
  Mado: { boss: true, name: "ՄԱԴՈ", paletteKey: "thug3", hp: 180, speed: 1.4, power: 1.05, scale: 1.24, aiCool: 55 },
  Vacho: { boss: true, name: "ՍԵՎ ՎԱՉՈ", paletteKey: "boss", hp: 280, speed: 1.3, power: 1.2, scale: 1.34, aiCool: 55 },
  dummy: { archetype: "dummy" },
};

const PICKUPS = ["shawarma", "khorovats", "tan", "cognac", "coin", "medal", "stick", "bottle", "pistol", "lid"];

export class SpawnPanel {
  constructor(studio) {
    this.studio = studio;
    const scene = () => studio.scene;
    const player = () => studio.scene.playerModel;
    const aiOff = h("input", { type: "checkbox" });
    const wave = h("input", { type: "number", value: 3, min: 1, max: 30, step: 1, class: "short" });
    const floorTop = h("input", { type: "number", value: 392, step: 1, class: "short" });
    const floorBottom = h("input", { type: "number", value: 538, step: 1, class: "short" });

    const spawnEnemy = (cfg) => {
      const m = scene().spawnCustomEnemy({ scale: 1, ...cfg });
      if (aiOff.checked) m.dummy = true;
      studio.select(m);
    };
    const give = (kind) => player()?.setWeapon(kind ? { kind, def: WEAPONS[kind], uses: WEAPONS[kind].uses, ammo: WEAPONS[kind].ammo } : null);

    this.el = h("div", { class: "panel spawn" },
      h("h3", {}, "Enemies"),
      h("div", { class: "row wrap" }, Object.entries(ENEMIES).map(([name, cfg]) => h("button", { onClick: () => spawnEnemy(cfg) }, name))),
      h("label", { class: "check" }, aiOff, "spawn with AI off"),

      h("h3", {}, "Player"),
      h("div", { class: "row wrap" },
        Object.keys(WEAPONS).map((k) => h("button", { onClick: () => give(k) }, k)),
        h("button", { onClick: () => give(null) }, "empty hands")),
      h("div", { class: "row wrap" },
        h("button", { onClick: () => (player().hp = player().maxHp) }, "Full HP"),
        h("button", { onClick: () => (scene().game.super = 100) }, "Super 100"),
        h("button", { onClick: () => (scene().game.buffs.rage = 480) }, "Rage"),
        h("button", { onClick: () => (scene().game.buffs.speed = 600) }, "Speed")),

      h("h3", {}, "Items"),
      h("div", { class: "row wrap" },
        PICKUPS.map((type) => h("button", { onClick: () => scene().spawnCustomPickup(type) }, type)),
        h("button", { onClick: () => scene().spawnCustomCrate() }, "crate")),

      h("h3", {}, "World"),
      h("div", { class: "row wrap" },
        h("button", { onClick: () => scene().killAllEnemies() }, "Kill all"),
        h("button", { onClick: () => scene().clearAllEnemies() }, "Clear enemies"),
        h("button", { onClick: () => { scene().clearAllPickups(); scene().clearAllCrates(); } }, "Clear items")),
      h("div", { class: "row" }, "Wave", wave,
        h("button", { title: "Queue that wave's enemies (no story, no auto-advance)", onClick: () => scene().setWave(Number(wave.value)) }, "Start wave")),
      h("div", { class: "row" }, "Floor", floorTop, "–", floorBottom,
        h("button", { onClick: () => scene().setFloorBounds(Number(floorTop.value), Number(floorBottom.value)) }, "Apply")));
  }
}

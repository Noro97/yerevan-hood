import { FighterModel } from "../../src/models/FighterModel.js";
import { GameModel } from "../../src/models/GameModel.js";
import { PickupModel } from "../../src/models/PickupModel.js";
import { CombatSystem } from "../../src/systems/CombatSystem.js";

const LISTS = { enemy: "enemies", crate: "crates", pickup: "pickups", bullet: "bullets", throw: "throws" };

/** A minimal world for CombatSystem: plain arrays, no views; fx calls are recorded in `events`. */
export function makeWorld({ player = {}, enemies = [] } = {}) {
  const events = [];
  const world = {
    game: new GameModel(),
    hitstop: 0,
    playerModel: fighter({ x: 300, y: 470, isPlayer: true, ...player }),
    enemies: enemies.map((cfg) => fighter({ x: 340, y: 470, ...cfg })),
    crates: [],
    pickups: [],
    bullets: [],
    throws: [],
    spawnPickup(x, y, type, meta = null) {
      const p = new PickupModel({ x, y, type, meta });
      world.pickups.push(p);
      return p;
    },
    spawnBullet(model) {
      world.bullets.push(model);
      return model;
    },
    spawnThrow(model) {
      world.throws.push(model);
      return model;
    },
    despawn(kind, model) {
      const list = world[LISTS[kind]];
      const i = list.indexOf(model);
      if (i !== -1) list.splice(i, 1);
    },
  };
  world.game.mode = "playing";
  const fx = {
    spark: () => events.push(["spark"]),
    popup: (x, y, text) => events.push(["popup", text]),
    sound: (name) => events.push(["sound", name]),
    particles: (kind) => events.push(["particles", kind]),
  };
  return { world, combat: new CombatSystem(world, fx), events };
}

export function fighter({ facing, archetype, weapon, ...cfg }) {
  const f = new FighterModel({ scale: 1, hp: 100, ...cfg });
  if (facing !== undefined) f.facing = facing;
  if (archetype) f.archetype = archetype;
  if (weapon) f.setWeapon(weapon);
  return f;
}

/** Puts a fighter into the first active frame of an attack. */
export function strike(f, kind = "punch", activeFrame = { punch: 5, kick: 9, hook: 6 }[kind]) {
  Object.assign(f, { state: "attack", attackKind: kind, attackTimer: activeFrame, hitDone: false });
}

import { rng } from "../core/Random.js";

export class PickupModel {
  constructor({ x, y, type, meta = null }) {
    this.x = x;
    this.y = y;
    this.type = type;
    this.meta = meta; // Preserved weapon state (remaining uses/ammo)
    this.t = rng.next() * 60; // Initial anim offset
    this.bobOffset = 0;
    this.removed = false;
  }

  update(dt) {
    this.t += dt;
    this.bobOffset = Math.sin(this.t * 0.1) * 3;
  }
}

import { W } from "../core/Constants.js";

export class BulletModel {
  constructor({ x, gy, ry, vx, dmg, fromPlayer }) {
    this.x = x;
    this.gy = gy; // Ground height (for z-depth matching)
    this.ry = ry; // Visual render height (adjusted for gun height)
    this.vx = vx;
    this.dmg = dmg;
    this.fromPlayer = fromPlayer;
    this.life = 110;
    this.removed = false;
  }

  update(dt, camX) {
    this.x += this.vx * dt;
    this.life -= dt;

    if (this.life <= 0 || this.x < camX - 100 || this.x > camX + W + 100) {
      this.removed = true;
    }
  }
}

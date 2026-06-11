export class CrateModel {
  constructor({ x, y, hp = 2 }) {
    this.x = x;
    this.y = y;
    this.hp = hp;
    this.removed = false;
  }

  hit(dmg) {
    this.hp -= dmg;
    if (this.hp <= 0) {
      this.removed = true;
    }
    return this.removed;
  }
}

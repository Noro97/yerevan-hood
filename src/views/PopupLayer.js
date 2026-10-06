import { Container, Text } from "pixi.js";
import { ARM_FONT } from "../core/Constants.js";

const LIFE = 42;
const RISE = 1.1;
const POP_FRAMES = 6;
// A new popup that would land on a live one moves up a row instead of overlapping it.
const STACK_DX = 28;
const STACK_STEP = 15;

/** Floating damage / heal / status text, recycled from a pool (Text re-creation is expensive). */
export class PopupLayer {
  constructor(parent) {
    this.root = new Container();
    this.root.zIndex = 10000;
    parent.addChild(this.root);
    this.pool = [];
    this.live = [];
    this.created = 0;
  }

  spawn(x, y, text, color, size = 15) {
    let py = y;
    for (let row = 0; row < 6; row++) {
      const blocker = this.live.find((p) => Math.abs(p.t.x - x) < STACK_DX && Math.abs(p.t.y - py) < STACK_STEP);
      if (!blocker) break;
      py = blocker.t.y - STACK_STEP;
    }
    const t = this.pool.pop() ?? this.make();
    t.text = text;
    t.style.fontSize = size;
    t.style.fill = color;
    t.alpha = 1;
    t.position.set(x, py);
    this.root.addChild(t);
    this.live.push({ t, life: LIFE });
  }

  make() {
    this.created++;
    const t = new Text({
      text: "",
      style: {
        fontFamily: ARM_FONT, fontSize: 15, fill: 0xffffff, fontWeight: "900",
        stroke: { color: 0x120d1d, width: 3 }, letterSpacing: 0.5,
      },
    });
    t.anchor.set(0.5);
    return t;
  }

  update(dt) {
    for (let i = this.live.length - 1; i >= 0; i--) {
      const p = this.live[i];
      p.life -= dt;
      p.t.y -= RISE * dt;
      p.t.alpha = Math.min(1, p.life / 20);
      const age = LIFE - p.life;
      p.t.scale.set(age < POP_FRAMES ? 1.3 - (0.3 * age) / POP_FRAMES : 1);
      if (p.life <= 0) {
        this.root.removeChild(p.t);
        this.pool.push(p.t);
        this.live.splice(i, 1);
      }
    }
  }

  get texts() {
    return this.live.map((p) => p.t.text);
  }
}

import { Container, Graphics } from "pixi.js";

const MAX_LIVE = 240;

/**
 * Pooled particle emitter. Particles are tiny pre-drawn Graphics recycled
 * between bursts — no per-frame allocation, no per-frame tessellation.
 */
export class ParticleSystem {
  constructor(parent) {
    this.root = new Container();
    this.root.zIndex = 9990; // above fighters inside the y-sorted actors layer
    parent.addChild(this.root);
    this.pool = [];
    this.live = [];
  }

  obtain(color, size, shape) {
    let p = this.pool.pop();
    if (!p) {
      p = { g: new Graphics(), vx: 0, vy: 0, life: 0, maxLife: 0, gravity: 0, color: 0, size: 0, shape: "" };
    }
    // redraw only when the look changes (pool reuse usually matches)
    if (p.color !== color || p.size !== size || p.shape !== shape) {
      p.color = color;
      p.size = size;
      p.shape = shape;
      p.g.clear();
      if (shape === "rect") p.g.rect(-size / 2, -size / 2, size, size * 0.7).fill(color);
      else p.g.circle(0, 0, size / 2).fill(color);
    }
    p.g.visible = true;
    p.g.alpha = 1;
    p.g.scale.set(1);
    this.root.addChild(p.g);
    return p;
  }

  emit({ x, y, count = 6, colors, speed = 2, life = 22, gravity = 0.12, size = 3, shape = "circle", upBias = 0.6, spread = Math.PI * 2 }) {
    for (let i = 0; i < count; i++) {
      if (this.live.length >= MAX_LIVE) break;
      const color = colors[(Math.random() * colors.length) | 0];
      const p = this.obtain(color, size * (0.7 + Math.random() * 0.6), shape);
      const a = -Math.PI / 2 + (Math.random() - 0.5) * spread;
      const v = speed * (0.4 + Math.random() * 0.9);
      p.vx = Math.cos(a) * v;
      p.vy = Math.sin(a) * v - upBias;
      p.life = p.maxLife = life * (0.7 + Math.random() * 0.6);
      p.gravity = gravity;
      p.g.position.set(x + (Math.random() - 0.5) * 8, y + (Math.random() - 0.5) * 4);
      this.live.push(p);
    }
  }

  update(dt) {
    for (let i = this.live.length - 1; i >= 0; i--) {
      const p = this.live[i];
      p.life -= dt;
      p.vy += p.gravity * dt;
      p.g.x += p.vx * dt;
      p.g.y += p.vy * dt;
      const t = Math.max(0, p.life / p.maxLife);
      p.g.alpha = t;
      p.g.scale.set(0.5 + t * 0.6);
      if (p.life <= 0) {
        p.g.visible = false;
        this.root.removeChild(p.g);
        this.pool.push(p);
        this.live.splice(i, 1);
      }
    }
  }

  // ---------- themed bursts ----------

  /** ground dust: running, landing, knockdowns */
  dust(x, y, count = 5) {
    this.emit({ x, y, count, colors: [0x6a6373, 0x7a7480, 0x59525f], speed: 1.3, life: 18, gravity: -0.01, size: 3.5, upBias: 0.4, spread: Math.PI * 0.9 });
  }

  /** wood splinters from crates */
  debris(x, y) {
    this.emit({ x, y: y - 16, count: 12, colors: [0x9a7340, 0x7e5c30, 0xc99c5e], speed: 3.2, life: 26, gravity: 0.22, size: 4, shape: "rect", upBias: 1.6 });
  }

  /** shattering bottle glass */
  glass(x, y) {
    this.emit({ x, y, count: 14, colors: [0x9fe8d8, 0x6fc8b4, 0xe8fff8], speed: 3.6, life: 20, gravity: 0.24, size: 3, shape: "rect", upBias: 1.2 });
  }

  /** golden KO burst */
  burst(x, y, big = false) {
    this.emit({ x, y, count: big ? 26 : 14, colors: [0xffd98a, 0xffb347, 0xfff3c0], speed: big ? 4.5 : 3.2, life: 30, gravity: 0.1, size: big ? 5 : 4, upBias: 1.4 });
  }

  /** quick impact puff at a hit point */
  puff(x, y) {
    this.emit({ x, y, count: 4, colors: [0xffe7b0, 0xf0e8f8], speed: 1.8, life: 12, gravity: 0, size: 2.6, upBias: 0.3 });
  }
}

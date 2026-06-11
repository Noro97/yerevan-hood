import { Container, Graphics } from "pixi.js";

const PLANK_SHADES = [0x9a7340, 0x8f6a38, 0xa57c46, 0x94703c];

export class CrateView extends Container {
  constructor() {
    super();
    const g = new Graphics();

    // Crate shadow
    g.ellipse(0, 0, 20, 6).fill({ color: 0x000000, alpha: 0.3 });

    // Horizontal planks, each its own shade with grain lines
    for (let p = 0; p < 4; p++) {
      const py = -32 + p * 8;
      g.rect(-18, py, 36, 7.4).fill(PLANK_SHADES[p % PLANK_SHADES.length]);
      g.rect(-18, py, 36, 1.2).fill({ color: 0xc99c5e, alpha: 0.45 });
      g.moveTo(-15 + (p % 2) * 6, py + 3).lineTo(8 + (p % 3) * 3, py + 3.6)
        .stroke({ width: 0.8, color: 0x6e4f28, alpha: 0.7 });
      g.moveTo(-10 + (p % 3) * 4, py + 5.5).lineTo(13 - (p % 2) * 5, py + 5.2)
        .stroke({ width: 0.7, color: 0x6e4f28, alpha: 0.5 });
    }
    // wood knots
    g.ellipse(-8, -21, 1.8, 1.2).fill(0x5e4322);
    g.ellipse(10, -6, 1.5, 1).fill(0x5e4322);

    // Side rails over the planks
    g.rect(-18, -32, 5, 32).fill(0x7e5c30);
    g.rect(13, -32, 5, 32).fill(0x7e5c30);
    g.rect(-18, -32, 1.5, 32).fill({ color: 0xc99c5e, alpha: 0.35 });
    g.rect(13, -32, 1.5, 32).fill({ color: 0xc99c5e, alpha: 0.35 });

    // Diagonal brace
    g.moveTo(-15, -30).lineTo(15, -2).stroke({ width: 4, color: 0x7e5c30 });
    g.moveTo(-15, -30).lineTo(15, -2).stroke({ width: 1, color: 0x6e4f28, alpha: 0.6 });

    // Nail heads
    for (const [nx, ny] of [[-15.5, -29], [-15.5, -4], [15.5, -29], [15.5, -4], [-15.5, -17], [15.5, -17]]) {
      g.circle(nx, ny, 1).fill(0x4a3a20);
      g.circle(nx - 0.3, ny - 0.3, 0.4).fill({ color: 0xd8c8a8, alpha: 0.8 });
    }

    // Metal corner brackets
    for (const [bx, by, fx, fy] of [[-18, -32, 1, 1], [18, -32, -1, 1], [-18, 0, 1, -1], [18, 0, -1, -1]]) {
      g.rect(bx, by - (fy < 0 ? 2 : 0), 6 * fx, 2 * fy).fill(0x5a5a62);
      g.rect(bx, by, 2 * fx, 6 * fy).fill(0x5a5a62);
    }

    // Pomegranate stencil (fruit crate from the market)
    g.circle(0, -16, 5).stroke({ width: 1.6, color: 0x8a2a2a, alpha: 0.65 });
    g.poly([-2, -20.5, 0, -23.5, 2, -20.5]).stroke({ width: 1.4, color: 0x8a2a2a, alpha: 0.65 });
    g.circle(-1.5, -15, 0.8).fill({ color: 0x8a2a2a, alpha: 0.6 });
    g.circle(1.5, -16.5, 0.8).fill({ color: 0x8a2a2a, alpha: 0.6 });
    g.circle(0.5, -13.5, 0.8).fill({ color: 0x8a2a2a, alpha: 0.6 });

    this.addChild(g);
  }

  updateView(dt, model) {
    this.x = model.x;
    this.y = model.y;
    this.zIndex = model.y;
  }
}

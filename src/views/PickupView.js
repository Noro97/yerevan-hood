import { Container, Graphics } from "pixi.js";

// ---------- Detailed item art ----------

function drawShawarma(g) {
  // foil-wrapped base
  g.roundRect(-12, -13, 24, 9, 3).fill(0xc9c9c9);
  g.moveTo(-9, -12).lineTo(-6, -6).stroke({ width: 1, color: 0xa8a8a8 });
  g.moveTo(-1, -13).lineTo(2, -5).stroke({ width: 1, color: 0xe2e2e2 });
  g.moveTo(6, -12).lineTo(8, -6).stroke({ width: 1, color: 0xa8a8a8 });
  // lavash wrap with toasted stripes
  g.roundRect(-12, -27, 24, 21, 9).fill(0xe8cf9e);
  g.roundRect(-12, -27, 24, 8, 9).fill({ color: 0xf2e0b8, alpha: 0.9 });
  g.ellipse(-4, -22, 5, 2.5).fill({ color: 0xc9a86a, alpha: 0.6 });
  g.ellipse(5, -18, 4, 2).fill({ color: 0xc9a86a, alpha: 0.5 });
  // filling peeking out the top
  g.rect(-9, -28, 4, 4).fill(0x8a4a2e);  // meat
  g.rect(-4, -29, 5, 4).fill(0xb33a3a);  // tomato
  g.rect(2, -28, 4, 4).fill(0x5c9e4a);   // greens
  g.rect(6, -27, 3, 3).fill(0xe8d44a);   // pickled pepper
  // checkered paper band
  g.rect(-12, -16, 24, 4).fill(0xf0e6d8);
  for (let k = 0; k < 6; k++) g.rect(-12 + k * 4, -16 + (k % 2) * 2, 4, 2).fill({ color: 0xb33a3a, alpha: 0.7 });
  // steam wisps
  g.moveTo(-5, -31).quadraticCurveTo(-8, -36, -5, -40).stroke({ width: 1.2, color: 0xffffff, alpha: 0.25 });
  g.moveTo(3, -32).quadraticCurveTo(6, -37, 3, -41).stroke({ width: 1.2, color: 0xffffff, alpha: 0.2 });
}

function drawKhorovats(g) {
  // skewer with looped handle
  g.moveTo(-18, -6).lineTo(17, -29).stroke({ width: 2.2, color: 0xbababa });
  g.moveTo(-18, -6).lineTo(-21, -3).stroke({ width: 2.2, color: 0xbababa });
  g.circle(-22.5, -2, 2.5).stroke({ width: 1.8, color: 0xbababa });
  g.poly([16, -28, 21, -31, 17, -33]).fill(0xbababa); // point
  // meat chunks with char and glisten
  const chunks = [[-10, -11, 5.5, 0x9a532e], [-3, -16, 6, 0xa3552e], [4, -21, 5.5, 0x8a4a2e]];
  for (const [cx, cy, r, col] of chunks) {
    g.circle(cx, cy, r).fill(col);
    g.arc(cx, cy, r - 0.5, Math.PI * 0.7, Math.PI * 1.4).stroke({ width: 2, color: 0x4a2516, alpha: 0.8 }); // char
    g.circle(cx - r * 0.35, cy - r * 0.35, 1.3).fill({ color: 0xffd9a0, alpha: 0.8 }); // glisten
  }
  // onion ring + tomato + pepper
  g.circle(0, -13, 3.2).stroke({ width: 1.8, color: 0xe8dcc8 });
  g.circle(10, -25, 4).fill(0xb33a3a);
  g.circle(9, -26, 1.2).fill({ color: 0xe87a7a, alpha: 0.9 });
  g.poly([12.5, -28, 16, -31, 14.5, -26.5]).fill(0x5c9e4a);
}

function drawTan(g) {
  // glass with foam head
  g.poly([-8, -25, 8, -25, 6.5, -3, -6.5, -3]).fill({ color: 0xf2f0e8, alpha: 0.95 });
  g.poly([-8, -25, -4, -25, -3, -3, -6.5, -3]).fill({ color: 0xffffff, alpha: 0.5 }); // body shine
  g.ellipse(0, -25, 8, 2.5).fill(0xffffff);
  g.ellipse(-3, -26, 3, 1.5).fill(0xf8f8f4);
  g.ellipse(4, -25.5, 2.5, 1.2).fill(0xf8f8f4);
  // glass rim + base
  g.ellipse(0, -3, 6.5, 1.8).fill({ color: 0xd8d4c8, alpha: 0.8 });
  // condensation droplets
  g.circle(-5, -18, 0.9).fill({ color: 0xc8e8f8, alpha: 0.8 });
  g.circle(5.5, -13, 0.8).fill({ color: 0xc8e8f8, alpha: 0.8 });
  g.circle(-4, -9, 0.7).fill({ color: 0xc8e8f8, alpha: 0.7 });
  g.moveTo(5.5, -13).lineTo(5, -8).stroke({ width: 0.8, color: 0xc8e8f8, alpha: 0.4 });
  // mint sprig
  g.ellipse(2, -27, 2, 1.2).fill(0x5c9e4a);
  g.ellipse(4.5, -28, 1.8, 1).fill(0x4a8a3a);
}

function drawCognac(g) {
  // Ararat-style bottle: shoulders + dark glass
  g.poly([-7, -14, -7, -4, 7, -4, 7, -14, 5, -21, -5, -21]).fill(0x3a2010);
  g.roundRect(-7, -8, 14, 6, 2).fill(0x3a2010);
  g.rect(-2.5, -30, 5, 10).fill(0x3a2010);
  g.poly([-5, -21, -2.5, -27, 2.5, -27, 5, -21]).fill(0x3a2010);
  // glass shine
  g.poly([-5, -19, -3, -19, -4, -5, -5.5, -5]).fill({ color: 0xa86a3a, alpha: 0.45 });
  // gold foil capsule
  g.rect(-3.5, -32, 7, 4).fill(0xd4af37);
  g.rect(-2.5, -28, 5, 2).fill(0xb8932a);
  // label with mountain emblem and stars
  g.roundRect(-5.5, -17, 11, 10, 1.5).fill(0xe8dcc0);
  g.poly([-3.5, -10.5, -1, -15, 1, -12, 3, -15.5, 4.5, -10.5]).fill(0x6a4a8a); // twin peaks
  g.poly([-1.6, -14, -1, -15, -0.4, -14]).fill(0xffffff);
  g.poly([2.4, -14.5, 3, -15.5, 3.6, -14.5]).fill(0xffffff);
  g.rect(-4.5, -9.5, 9, 1).fill(0x8a6a2a);
  for (let k = 0; k < 5; k++) g.circle(-4 + k * 2, -7.5, 0.6).fill(0xb8932a); // 5 stars
}

function drawCoin(g) {
  // ridged edge
  g.circle(0, -10, 9.5).fill(0xb8932a);
  for (let k = 0; k < 16; k++) {
    const a = (k * Math.PI * 2) / 16;
    g.rect(Math.cos(a) * 9 - 0.6, -10 + Math.sin(a) * 9 - 0.6, 1.2, 1.2).fill(0x8a6a1e);
  }
  g.circle(0, -10, 8).fill(0xd4af37);
  g.circle(0, -10, 6.5).stroke({ width: 1.2, color: 0xa8842a });
  // dram sign ֏
  g.moveTo(-2.5, -14.5).lineTo(-2.5, -5.5).stroke({ width: 2, color: 0xa8842a });
  g.moveTo(-2.5, -12.5).quadraticCurveTo(4.5, -12.5, 4.5, -9).stroke({ width: 2, color: 0xa8842a });
  g.moveTo(-4.5, -8).lineTo(2, -8).stroke({ width: 1.2, color: 0xa8842a });
  // glint
  g.poly([-5, -15, -3.5, -13.5, -5, -12, -6.5, -13.5]).fill({ color: 0xfff3c0, alpha: 0.9 });
}

function drawMedal(g) {
  // tricolor ribbon (Armenian flag)
  g.poly([-7, -32, 7, -32, 5, -18, -5, -18]).fill(0xb33a3a);
  g.poly([-7 + 4.6, -32, -7 + 9.3, -32, -5 + 6.6, -18, -5 + 3.3, -18]).fill(0x2a4a8a);
  g.poly([2.3, -32, 7, -32, 5, -18, 1.6, -18]).fill(0xe8913a);
  g.rect(-7.5, -33, 15, 2.5).fill(0x8a8a92);
  // ring + star medal
  g.circle(0, -17, 1.8).stroke({ width: 1.2, color: 0xa8842a });
  const star = [];
  for (let k = 0; k < 10; k++) {
    const a = -Math.PI / 2 + (k * Math.PI) / 5;
    const r = k % 2 ? 4 : 8.5;
    star.push(Math.cos(a) * r, -9 + Math.sin(a) * r);
  }
  g.poly(star).fill(0xd4af37);
  g.poly(star).stroke({ width: 1, color: 0xa8842a });
  g.circle(0, -9, 3.2).fill(0xb8932a);
  g.circle(0, -9, 3.2).stroke({ width: 0.8, color: 0x8a6a1e });
  g.circle(-1, -10, 1).fill({ color: 0xfff3c0, alpha: 0.8 });
}

function drawStick(g) {
  // tapered club with wood grain
  g.poly([-18, -13, 16, -11.5, 18, -8.5, -18, -7]).fill(0x8a5a2e);
  g.moveTo(-14, -11.5).lineTo(10, -10.5).stroke({ width: 0.8, color: 0x6e4520, alpha: 0.8 });
  g.moveTo(-12, -9).lineTo(14, -9.5).stroke({ width: 0.8, color: 0xa87a48, alpha: 0.7 });
  // knot
  g.ellipse(4, -10, 2, 1.4).fill(0x5e3c1c);
  g.ellipse(4, -10, 1, 0.7).fill(0x6e4520);
  // taped grip
  g.rect(-18, -13.5, 9, 7).fill(0x3a3a3a);
  g.moveTo(-16, -13).lineTo(-14, -7).stroke({ width: 1, color: 0x5a5a5a });
  g.moveTo(-13, -13).lineTo(-11, -7).stroke({ width: 1, color: 0x5a5a5a });
  // splintered tip
  g.poly([16, -11.5, 21, -10.5, 18, -8.5]).fill(0xa87a48);
}

function drawBottle(g) {
  // green glass on its side, liquid line, label, foil
  g.roundRect(-13, -12.5, 19, 8, 3.5).fill(0x2e7d4f);
  g.rect(6, -10.5, 6, 4).fill(0x2e7d4f);
  g.rect(11, -11, 3.5, 5).fill(0xd4af37);
  // liquid level
  g.roundRect(-12, -11.5, 13, 6, 3).fill({ color: 0x1e5d38, alpha: 0.9 });
  // label
  g.rect(-9, -12.5, 8, 8).fill(0xe8dcc0);
  g.rect(-8, -10.5, 6, 1).fill(0x8a6a2a);
  g.rect(-8, -8.5, 6, 1).fill({ color: 0x8a6a2a, alpha: 0.6 });
  // glass shine
  g.moveTo(-11, -11.5).lineTo(2, -11).stroke({ width: 1.2, color: 0xffffff, alpha: 0.35 });
}

function drawPistol(g) {
  // slide with serrations and sights
  g.roundRect(-10, -17, 20, 6.5, 2).fill(0x2a2a30);
  g.rect(-10, -17, 20, 2).fill(0x3e3e46);
  for (let k = 0; k < 4; k++) g.rect(5 + k * 1.8, -16.5, 1, 5.5).fill({ color: 0x18181d, alpha: 0.8 });
  g.rect(-10, -18.5, 2, 2).fill(0x2a2a30);  // rear sight
  g.rect(8, -18.5, 1.5, 2).fill(0x2a2a30);  // front sight
  g.circle(10, -13.8, 1.1).fill(0x121216);  // muzzle
  // frame, trigger guard, trigger
  g.rect(-9, -10.5, 17, 2.5).fill(0x33333b);
  g.moveTo(-1, -8).quadraticCurveTo(-1, -4.5, 3, -4.5).quadraticCurveTo(5, -4.5, 5, -8)
    .stroke({ width: 1.4, color: 0x2a2a30 });
  g.rect(1.2, -8, 1.6, 2.8).fill(0x18181d);
  // grip with checkered texture
  g.poly([-9, -10.5, -3.5, -10.5, -5, -1, -10.5, -1.5]).fill(0x4a3526);
  g.moveTo(-8.5, -8).lineTo(-5, -4).stroke({ width: 0.7, color: 0x33241a, alpha: 0.9 });
  g.moveTo(-9.2, -5.5).lineTo(-6.5, -2.5).stroke({ width: 0.7, color: 0x33241a, alpha: 0.9 });
  g.moveTo(-5.5, -9).lineTo(-9.5, -4).stroke({ width: 0.7, color: 0x33241a, alpha: 0.9 });
  g.circle(-7.5, -9, 0.8).fill(0x8a8a92); // grip screw
}

const DRAWERS = {
  shawarma: drawShawarma,
  khorovats: drawKhorovats,
  tan: drawTan,
  cognac: drawCognac,
  coin: drawCoin,
  medal: drawMedal,
  stick: drawStick,
  bottle: drawBottle,
  pistol: drawPistol,
};

export class PickupView extends Container {
  constructor(type) {
    super();
    this.type = type;

    // Static shadow on the ground
    this.shadow = new Graphics();
    this.shadow.ellipse(0, 0, 12, 4).fill({ color: 0x000000, alpha: 0.3 });
    this.addChild(this.shadow);

    // Soft glow so loot reads against the asphalt
    this.glow = new Graphics();
    this.glow.ellipse(0, -14, 16, 14).fill({ color: 0xffe7b0, alpha: 0.1 });
    this.addChild(this.glow);

    // Floating icon container
    this.icon = new Graphics();
    const drawFn = DRAWERS[type] || drawShawarma;
    drawFn(this.icon);
    this.addChild(this.icon);
  }

  updateView(dt, model) {
    this.x = model.x;
    this.y = model.y;
    this.zIndex = model.y;
    this.icon.y = model.bobOffset; // Apply float offset
    this.glow.alpha = 0.7 + (model.bobOffset / 3) * 0.3;
  }
}

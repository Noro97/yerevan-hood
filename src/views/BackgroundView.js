import { Container, Graphics, Text } from "pixi.js";
import { W, H, WORLD_W, ARM_FONT, TUFF } from "../core/Constants.js";

// Deterministic pseudo-random for stable texture scatter
function makeRng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1103515245 + 12345) >>> 0;
    return s / 4294967296;
  };
}

function lerpColor(a, b, t) {
  const ar = (a >> 16) & 255, ag = (a >> 8) & 255, ab = a & 255;
  const br = (b >> 16) & 255, bg = (b >> 8) & 255, bb = b & 255;
  return ((ar + (br - ar) * t) << 16) | (((ag + (bg - ag) * t) | 0) << 8) | ((ab + (bb - ab) * t) | 0);
}

const darken = (c, t) => lerpColor(c, 0x1c1218, t);
const lighten = (c, t) => lerpColor(c, 0xffe8d2, t);

export class BackgroundView {
  constructor() {
    this.sky = this.buildSky();
    this.far = this.buildFar();
    this.mid = this.buildMid();
    this.scenery = new Container();

    this.buildStreet();
    this.buildBuildings();
  }

  buildSky() {
    const c = new Container();
    const g = new Graphics();
    const stops = [
      [0.0, 0x241b45], [0.18, 0x4a2b5e], [0.38, 0x84426c],
      [0.58, 0xc05f6a], [0.78, 0xe8915c], [1.0, 0xf3bd72],
    ];
    const skyH = 400, bands = 24;
    for (let i = 0; i < bands; i++) {
      const t = i / (bands - 1);
      let k = 0;
      while (k < stops.length - 2 && stops[k + 1][0] < t) k++;
      const [t0, c0] = stops[k], [t1, c1] = stops[k + 1];
      const col = lerpColor(c0, c1, Math.max(0, Math.min(1, (t - t0) / (t1 - t0))));
      g.rect(0, (i * skyH) / bands, W, skyH / bands + 1).fill(col);
    }

    // Stars in dusk
    const rng = makeRng(777);
    for (let i = 0; i < 48; i++) {
      const x = rng() * W, y = rng() * 140, r = 0.7 + rng() * 1.1;
      if (Math.abs(x - 700) < 90 && y > 60) continue; // clear around the sun glow
      g.circle(x, y, r).fill({ color: 0xfff3d6, alpha: 0.25 + rng() * 0.45 });
    }

    // Sun glow
    g.circle(700, 300, 58).fill({ color: 0xffe7b0, alpha: 0.18 });
    g.circle(700, 300, 46).fill({ color: 0xffe7b0, alpha: 0.3 });
    g.circle(700, 300, 30).fill(0xffd98a);
    g.circle(694, 294, 10).fill({ color: 0xfff6dc, alpha: 0.7 });

    // Distant birds
    for (const [bx, by, s] of [[350, 120, 1], [380, 132, 0.8], [820, 95, 0.9]]) {
      g.moveTo(bx - 5 * s, by).quadraticCurveTo(bx - 2 * s, by - 3 * s, bx, by)
        .quadraticCurveTo(bx + 2 * s, by - 3 * s, bx + 5 * s, by)
        .stroke({ width: 1.2, color: 0x3a2a4a, alpha: 0.7 });
    }

    // Drifting clouds, edge-lit by the sunset
    for (const [cx, cy, s, a] of [[180, 90, 1.2, 0.12], [520, 150, 1, 0.1], [840, 70, 0.8, 0.12]]) {
      g.ellipse(cx, cy, 70 * s, 13 * s).fill({ color: 0xf3c9d8, alpha: a });
      g.ellipse(cx + 40 * s, cy + 6 * s, 50 * s, 10 * s).fill({ color: 0xf3c9d8, alpha: a * 0.8 });
      g.ellipse(cx - 45 * s, cy + 5 * s, 40 * s, 9 * s).fill({ color: 0xf3c9d8, alpha: a * 0.7 });
      g.ellipse(cx, cy + 10 * s, 60 * s, 6 * s).fill({ color: 0xffd9a8, alpha: a * 0.6 });
    }

    c.addChild(g);
    return c;
  }

  buildFar() {
    const c = new Container();
    const g = new Graphics();

    // Sis
    g.poly([180, 372, 330, 248, 410, 300, 470, 372]).fill(0x5d3f63);
    g.poly([330, 248, 410, 300, 470, 372, 330, 372]).fill({ color: 0x4a3153, alpha: 0.55 });
    g.poly([300, 273, 330, 248, 363, 270, 345, 286, 322, 276]).fill(0xe9e2ee);

    // Masis
    g.poly([380, 372, 620, 178, 720, 250, 860, 372]).fill(0x53375c);
    g.poly([620, 178, 720, 250, 860, 372, 620, 372]).fill({ color: 0x422b4e, alpha: 0.55 });
    g.poly([560, 226, 620, 178, 686, 226, 658, 250, 622, 234, 592, 252]).fill(0xf3eef7);
    g.poly([620, 178, 686, 226, 658, 250, 636, 230]).fill({ color: 0xd9cfe4, alpha: 0.8 });
    // Snow crevasses + scree texture on the slopes
    g.moveTo(602, 206).lineTo(594, 236).stroke({ width: 1.5, color: 0xb9a8c8, alpha: 0.6 });
    g.moveTo(636, 196).lineTo(640, 224).stroke({ width: 1.5, color: 0xb9a8c8, alpha: 0.5 });
    for (let i = 0; i < 9; i++) {
      const sx = 470 + i * 24, sy = 290 + (i % 3) * 18;
      g.moveTo(sx, sy).lineTo(sx + 14, sy + 9).stroke({ width: 1, color: 0x3e2a48, alpha: 0.5 });
    }

    // Second mountain peaks
    g.poly([1080, 372, 1300, 200, 1420, 280, 1560, 372]).fill(0x53375c);
    g.poly([1300, 200, 1420, 280, 1560, 372, 1300, 372]).fill({ color: 0x422b4e, alpha: 0.55 });
    g.poly([1245, 243, 1300, 200, 1360, 244, 1330, 262, 1300, 250, 1272, 264]).fill(0xf3eef7);

    // Horizon haze
    g.rect(0, 330, 1700, 42).fill({ color: 0xe8915c, alpha: 0.14 });

    // Yerevan TV tower with lattice
    g.poly([950, 372, 962, 200, 966, 200, 978, 372]).fill(0x3f2b4a);
    for (let i = 0; i < 7; i++) {
      const ty = 220 + i * 22;
      const half = 3 + (372 - ty) * 0.075;
      g.moveTo(964 - half, ty).lineTo(964 + half, ty + 11).stroke({ width: 1, color: 0x57406a, alpha: 0.8 });
      g.moveTo(964 + half, ty).lineTo(964 - half, ty + 11).stroke({ width: 1, color: 0x57406a, alpha: 0.8 });
    }
    g.rect(956, 230, 16, 6).fill(0x3f2b4a);
    g.rect(953, 260, 22, 6).fill(0x3f2b4a);
    g.moveTo(964, 200).lineTo(964, 168).stroke({ width: 2, color: 0x3f2b4a });
    g.circle(964, 172, 2.5).fill(0xff6a5e);

    c.addChild(g);
    return c;
  }

  buildMid() {
    const c = new Container();
    const g = new Graphics();
    const col = 0x47305a;
    const span = 960 + WORLD_W * 0.5 + 200;
    const rng = makeRng(424242);
    let x = -60;
    let i = 0;
    while (x < span) {
      const w = 90 + ((i * 53) % 110);
      const h = 70 + ((i * 37) % 90);
      g.rect(x, 372 - h, w, h).fill(col);

      // Church dome
      if (i % 5 === 2) {
        const cx = x + w / 2;
        g.poly([cx - 16, 372 - h, cx, 372 - h - 30, cx + 16, 372 - h]).fill(col);
        g.moveTo(cx, 372 - h - 30).lineTo(cx, 372 - h - 40).stroke({ width: 2.5, color: col });
        g.moveTo(cx - 4, 372 - h - 36).lineTo(cx + 4, 372 - h - 36).stroke({ width: 2.5, color: col });
      }
      // Rooftop antennas / water tank on some blocks
      if (i % 4 === 1) {
        g.moveTo(x + 14, 372 - h).lineTo(x + 14, 372 - h - 16).stroke({ width: 1.5, color: col });
        g.moveTo(x + 9, 372 - h - 12).lineTo(x + 19, 372 - h - 12).stroke({ width: 1, color: col });
      }
      if (i % 7 === 3) {
        g.rect(x + w - 26, 372 - h - 12, 16, 12).fill(col);
        g.moveTo(x + w - 26, 372 - h - 12).lineTo(x + w - 10, 372 - h - 12).stroke({ width: 2, color: col });
      }

      // Lit windows
      for (let k = 0; k < 4; k++) {
        if (rng() < 0.5) {
          g.rect(x + 10 + rng() * (w - 24), 372 - h + 10 + rng() * (h - 24), 5, 7)
            .fill({ color: 0xffd98a, alpha: 0.18 });
        }
      }
      x += w + 18 + ((i * 29) % 40);
      i++;
    }
    c.addChild(g);
    return c;
  }

  buildStreet() {
    const g = new Graphics();
    const rng = makeRng(909090);

    // Sidewalk
    g.rect(0, 352, WORLD_W, 40).fill(0x77707e);
    g.rect(0, 386, WORLD_W, 2).fill({ color: 0x9b94a6, alpha: 0.5 });
    g.rect(0, 388, WORLD_W, 4).fill(0x59525f);
    // segmented kerbstones
    for (let x = 0; x < WORLD_W; x += 46) {
      g.moveTo(x, 388).lineTo(x, 392).stroke({ width: 1.5, color: 0x4a4450 });
    }
    for (let x = 0; x < WORLD_W; x += 64) {
      g.moveTo(x, 354).lineTo(x - 8, 388).stroke({ width: 2, color: 0x6a6373 });
    }

    // Sidewalk wear + chewing gum spots
    for (let i = 0; i < WORLD_W / 90; i++) {
      g.ellipse(rng() * WORLD_W, 358 + rng() * 26, 8 + rng() * 14, 3).fill({ color: 0x6a6373, alpha: 0.5 });
    }
    for (let i = 0; i < 70; i++) {
      g.circle(rng() * WORLD_W, 354 + rng() * 32, 1 + rng()).fill({ color: 0x3e3944, alpha: 0.35 });
    }

    // Storm drain grates at the kerb
    for (const dx of [410, 1240, 2210]) {
      g.roundRect(dx, 393, 30, 7, 2).fill(0x26242c);
      for (let k = 1; k < 5; k++) {
        g.rect(dx + k * 6 - 1, 394, 2, 5).fill(0x3a3842);
      }
    }

    // Asphalt road
    g.rect(0, 392, WORLD_W, 148).fill(0x35333c);

    // Asphalt patches
    for (let i = 0; i < WORLD_W / 140; i++) {
      const x = (i * 313) % WORLD_W;
      const y = 410 + ((i * 97) % 110);
      g.ellipse(x, y, 28 + (i % 4) * 8, 9).fill({ color: 0x2c2a33, alpha: 0.7 });
    }

    // Asphalt noise grain
    for (let i = 0; i < 420; i++) {
      const x = rng() * WORLD_W, y = 394 + rng() * 144;
      g.circle(x, y, 0.7 + rng() * 1).fill({ color: rng() < 0.5 ? 0x44424c : 0x26242c, alpha: 0.4 });
    }

    // Asphalt cracks
    for (let i = 0; i < 8; i++) {
      let cx = rng() * WORLD_W, cy = 400 + rng() * 120;
      g.moveTo(cx, cy);
      for (let s = 0; s < 4; s++) {
        cx += 14 + rng() * 26;
        cy += (rng() - 0.5) * 22;
        g.lineTo(cx, cy);
      }
      g.stroke({ width: 1.5, color: 0x26242c, alpha: 0.7 });
    }
    // Glossy tar-seal snakes over old cracks
    for (let i = 0; i < 4; i++) {
      let cx = 300 + rng() * (WORLD_W - 600), cy = 420 + rng() * 90;
      g.moveTo(cx, cy);
      for (let s = 0; s < 5; s++) {
        cx += 20 + rng() * 30;
        cy += (rng() - 0.5) * 26;
        g.lineTo(cx, cy);
      }
      g.stroke({ width: 4, color: 0x211f27, alpha: 0.85 });
    }

    // Manhole covers with rim and pick-holes
    for (const mx of [520, 1660, 2480]) {
      g.ellipse(mx, 472, 15, 6.5).fill(0x211f27);
      g.ellipse(mx, 471, 14, 6).fill(0x2e2c34);
      g.ellipse(mx, 471, 9, 3.6).stroke({ width: 1, color: 0x211f27 });
      g.ellipse(mx, 471, 4.5, 1.8).stroke({ width: 1, color: 0x211f27 });
      g.circle(mx - 9, 471, 1).fill(0x18161d);
      g.circle(mx + 9, 471, 1).fill(0x18161d);
    }

    // Center divider dashes
    for (let x = 0; x < WORLD_W; x += 80) {
      g.roundRect(x, 468, 42, 5, 2).fill({ color: 0xcfc7a0, alpha: 0.35 + ((x / 80) % 3) * 0.1 });
    }

    // Zebra crosswalks
    for (const cx of [760, 2060]) {
      for (let i = 0; i < 9; i++) {
        g.poly([
          cx + i * 26, 392, cx + i * 26 + 16, 392,
          cx + i * 26 + 4, 540, cx + i * 26 - 12, 540,
        ]).fill({ color: 0xd8d2c2, alpha: 0.32 + ((i * 7) % 4) * 0.07 });
      }
    }

    this.scenery.addChild(g);

    // Sidewalk plane trees (behind the actors)
    const tg = new Graphics();
    for (const tx of [275, 1695]) {
      // root grate
      tg.roundRect(tx - 16, 376, 32, 8, 2).fill(0x4a4450);
      for (let k = 1; k < 6; k++) tg.rect(tx - 16 + k * 5.3, 377, 1.5, 6).fill(0x59525f);
      // trunk with bark patches (plane trees peel)
      tg.poly([tx - 5, 378, tx + 5, 378, tx + 3, 300, tx - 3, 300]).fill(0x6e5a48);
      tg.poly([tx - 4, 360, tx + 1, 358, tx, 342, tx - 4, 344]).fill({ color: 0x8a7560, alpha: 0.8 });
      tg.poly([tx, 330, tx + 4, 328, tx + 3, 314, tx - 1, 316]).fill({ color: 0x5a4838, alpha: 0.8 });
      tg.moveTo(tx - 2, 300).lineTo(tx - 14, 282).stroke({ width: 3, color: 0x6e5a48 });
      tg.moveTo(tx + 2, 300).lineTo(tx + 13, 280).stroke({ width: 3, color: 0x6e5a48 });
      // foliage clumps, dusk-lit
      tg.ellipse(tx - 14, 272, 26, 18).fill(0x4a5d3a);
      tg.ellipse(tx + 16, 268, 24, 16).fill(0x55683f);
      tg.ellipse(tx, 252, 28, 17).fill(0x5f7344);
      tg.ellipse(tx + 8, 246, 16, 10).fill({ color: 0xc99a5e, alpha: 0.35 }); // sunset rim light
    }
    this.scenery.addChild(tg);
  }

  buildBuildings() {
    const defs = [
      [10, 250, 4, 0, null, "ԿՈՆԴ"],
      [290, 220, 3, 1, "ՇԱՈՒՐՄԱ", null],
      [600, 300, 5, 2, "ԽԱՆՈՒԹ 24/7", null],
      [930, 200, 3, 3, null, "ARARAT 33"],
      [1160, 260, 4, 4, "ՎԱՐՍԱՎԻՐԱՆՈՑ", null],
      [1450, 230, 3, 0, null, null],
      [1710, 280, 5, 1, "ՎՈՒԼԿԱՆԻԶԱՑԻԱ", null],
      [2020, 220, 4, 2, null, "ԿՈՆԴ"],
      [2270, 290, 3, 3, "ՄԹԵՐՔ", null],
      [2590, 280, 4, 4, "ԿԱՐԱՈԿԵ", null],
    ];

    for (const [x, w, floors, ci, sign, graf] of defs) {
      this.scenery.addChild(this.makeBuilding(x, w, floors, ci, sign, graf));
    }

    // Sagging power cables strung between roofs
    const cable = new Graphics();
    const roofY = (d) => 352 - (46 + d[2] * 38 + 10) - 8;
    for (let i = 0; i < defs.length - 1; i++) {
      const a = defs[i], b = defs[i + 1];
      const x1 = a[0] + a[1] - 8, y1 = roofY(a);
      const x2 = b[0] + 8, y2 = roofY(b);
      const mx = (x1 + x2) / 2, my = Math.max(y1, y2) + 16;
      cable.moveTo(x1, y1).quadraticCurveTo(mx, my, x2, y2).stroke({ width: 1.5, color: 0x18121e, alpha: 0.7 });
      cable.moveTo(x1, y1 + 4).quadraticCurveTo(mx, my + 5, x2, y2 + 4).stroke({ width: 1, color: 0x18121e, alpha: 0.5 });
      cable.circle(x1, y1, 1.8).fill(0x2a2230);
      cable.circle(x2, y2, 1.8).fill(0x2a2230);
    }
    this.scenery.addChild(cable);

    // Alley fences with plank detail and a pasted poster
    const fence = new Graphics();
    for (const fx of [540, 1390, 1940]) {
      for (let k = 0; k < 6; k++) {
        const px = fx + k * 11;
        fence.rect(px, 312 + (k % 2), 10, 40 - (k % 2)).fill(lerpColor(0x5b4a52, 0x4a3b42, (k * 41 % 7) / 7));
        fence.moveTo(px + 3, 316).lineTo(px + 3, 348).stroke({ width: 1, color: 0x4a3b42, alpha: 0.5 });
        fence.circle(px + 5, 318, 1).fill(0x3a2d34);
        fence.circle(px + 5, 346, 1).fill(0x3a2d34);
      }
      fence.rect(fx, 318, 66, 3).fill(0x4a3b42);
      fence.rect(fx, 342, 66, 3).fill(0x4a3b42);
    }
    // concert poster on the middle fence
    fence.rect(1398, 320, 22, 18).fill(0xe8e0d0);
    fence.rect(1400, 322, 18, 4).fill(0xb33a3a);
    fence.rect(1400, 328, 18, 1.5).fill(0x3a3a3a);
    fence.rect(1400, 331, 14, 1.5).fill(0x3a3a3a);
    fence.rect(1400, 334, 16, 1.5).fill(0x3a3a3a);
    this.scenery.addChild(fence);
  }

  makeBuilding(x, w, floors, colorIdx, sign, graffiti) {
    const c = new Container();
    c.x = x;
    c.y = 352;
    const rng = makeRng((x * 7919 + w * 131) >>> 0);
    const color = TUFF[colorIdx % TUFF.length];
    const dark = 0x2e2238;
    const groundH = 46;
    const floorH = 38;
    const h = groundH + floors * floorH + 10;
    const g = new Graphics();

    // Mortar base behind the blocks
    g.rect(0, -h, w, h).fill(darken(color, 0.28));

    // --- Tuff stone blocks, running bond, per-block shade variation ---
    const bH = 13, bW = 26;
    let row = 0;
    for (let by = -h + 10; by < -groundH - 2; by += bH, row++) {
      const off = (row % 2) * (bW / 2);
      for (let bx = -off; bx < w; bx += bW) {
        const x0 = Math.max(1, bx), x1 = Math.min(w - 1, bx + bW - 1.5);
        if (x1 - x0 < 3) continue;
        const v = rng();
        const blockCol = v < 0.5
          ? lerpColor(color, darken(color, 0.16), v * 2)
          : lerpColor(color, lighten(color, 0.12), (v - 0.5) * 2);
        g.rect(x0, by, x1 - x0, bH - 1.5).fill(blockCol);
        if (rng() < 0.07) g.circle(x0 + 4 + rng() * (x1 - x0 - 8), by + 3 + rng() * 7, 1).fill({ color: 0x000000, alpha: 0.15 });
      }
    }
    // Quoins: lighter alternating corner stones
    for (let q = 0; q * bH < h - groundH - 14; q++) {
      const qy = -h + 10 + q * bH;
      const qw = q % 2 ? 18 : 12;
      g.rect(0, qy, qw, bH - 1.5).fill(lighten(color, 0.18));
      g.rect(w - qw, qy, qw, bH - 1.5).fill(lighten(color, 0.18));
    }

    // String courses between floors
    for (let f = 1; f < floors; f++) {
      const sy = -groundH - f * floorH + 5;
      g.rect(0, sy, w, 3).fill(lighten(color, 0.22));
      g.rect(0, sy + 3, w, 2).fill({ color: 0x000000, alpha: 0.18 });
    }

    // --- Roofline: cornice with dentils + rosette frieze ---
    g.rect(-4, -h - 8, w + 8, 10).fill(0x8a5446);
    g.rect(-4, -h - 8, w + 8, 2.5).fill(lighten(0x8a5446, 0.25));
    for (let dx = 4; dx < w - 4; dx += 9) {
      g.rect(dx, -h + 1, 5, 4).fill({ color: 0x000000, alpha: 0.2 }); // dentils
    }
    g.rect(0, -h, w, 5).fill({ color: 0x000000, alpha: 0.14 });
    // Armenian eternity-rosette frieze band
    const friezeY = -h + 12;
    for (let fx2 = 26; fx2 < w - 20; fx2 += 46) {
      g.circle(fx2, friezeY, 5).stroke({ width: 1.5, color: darken(color, 0.3), alpha: 0.7 });
      for (let k = 0; k < 6; k++) {
        const a = (k * Math.PI) / 3;
        g.circle(fx2 + Math.cos(a) * 2.8, friezeY + Math.sin(a) * 2.8, 1).fill({ color: darken(color, 0.3), alpha: 0.7 });
      }
    }

    // --- Ground floor: rusticated stone ---
    g.rect(0, -groundH, w, groundH).fill(0x9c6151);
    for (let ry = -groundH + 8; ry < -4; ry += 9) {
      g.rect(0, ry, w, 1.8).fill({ color: 0x000000, alpha: 0.16 });
    }
    g.rect(0, -groundH, w, 3).fill({ color: 0x000000, alpha: 0.12 });

    // --- Windows with carved surrounds ---
    const cols = Math.max(2, Math.floor((w - 30) / 46));
    const gap = (w - cols * 18) / (cols + 1);
    const curtains = [0xc46a6a, 0x6a8ac4, 0xc4b06a, 0x8ac49a];
    for (let f = 0; f < floors; f++) {
      const wy = -groundH - (f + 1) * floorH + 8;
      for (let cI = 0; cI < cols; cI++) {
        const wx = gap + cI * (18 + gap);
        const lit = (cI * 7 + f * 13 + colorIdx * 5) % 4 === 0;
        const fill = lit ? 0xffd98a : dark;

        // carved stone surround + keystone
        g.circle(wx + 9, wy + 8, 11.5).fill(lighten(color, 0.2));
        g.rect(wx - 2.5, wy + 8, 23, 17).fill(lighten(color, 0.2));
        g.poly([wx + 5.5, wy - 4.5, wx + 12.5, wy - 4.5, wx + 11, wy + 1.5, wx + 7, wy + 1.5]).fill(lighten(color, 0.32));

        // recessed glass
        g.circle(wx + 9, wy + 8, 9).fill(fill);
        g.rect(wx, wy + 8, 18, 16).fill(fill);
        g.circle(wx + 9, wy + 8, 9).stroke({ width: 1.5, color: 0x000000, alpha: 0.18 });
        g.rect(wx, wy + 14, 2, 10).fill({ color: 0x000000, alpha: 0.14 });

        if (lit) {
          g.rect(wx, wy + 16, 18, 8).fill({ color: 0xe8a04e, alpha: 0.5 });
          g.rect(wx + 8, wy + 2, 2, 22).fill({ color: 0x8a5446, alpha: 0.6 });
          // curtains
          const cc = curtains[(cI + f + colorIdx) % curtains.length];
          g.poly([wx, wy + 2, wx + 5, wy + 2, wx + 3.5, wy + 24, wx, wy + 24]).fill({ color: cc, alpha: 0.85 });
          g.poly([wx + 18, wy + 2, wx + 13, wy + 2, wx + 14.5, wy + 24, wx + 18, wy + 24]).fill({ color: cc, alpha: 0.85 });
          if (rng() < 0.4) g.circle(wx + 9, wy + 12, 1.5).fill(0xfff3c0); // ceiling lamp dot
        } else {
          g.moveTo(wx + 3, wy + 22).lineTo(wx + 13, wy + 4).stroke({ width: 2, color: 0xffffff, alpha: 0.08 });
          g.rect(wx, wy - 1, 18, 6).fill({ color: 0x6a5a8a, alpha: 0.18 }); // sky reflection
        }

        // sill on corbels + weathering streak
        g.rect(wx - 3, wy + 24, 24, 3.5).fill(lighten(color, 0.25));
        g.poly([wx - 1, wy + 27.5, wx + 2, wy + 27.5, wx + 0.5, wy + 31]).fill({ color: 0x000000, alpha: 0.2 });
        g.poly([wx + 16, wy + 27.5, wx + 19, wy + 27.5, wx + 17.5, wy + 31]).fill({ color: 0x000000, alpha: 0.2 });
        const streakH = 6 + rng() * 12;
        g.poly([wx + 1, wy + 28, wx + 17, wy + 28, wx + 14, wy + 28 + streakH, wx + 4, wy + 28 + streakH])
          .fill({ color: 0x000000, alpha: 0.07 });

        // occasional AC unit or flower pot
        const acc = rng();
        if (acc < 0.18) {
          g.roundRect(wx + 1, wy + 28, 16, 9, 1.5).fill(0xb9b4ab);
          g.rect(wx + 1, wy + 28, 16, 2).fill(0x9b968d);
          for (let v = 1; v < 4; v++) g.rect(wx + 2, wy + 30 + v * 1.6, 14, 0.8).fill({ color: 0x7a756c, alpha: 0.8 });
          g.poly([wx + 3, wy + 37, wx + 6, wy + 37, wx + 5, wy + 46, wx + 3.5, wy + 46]).fill({ color: 0x6e4a30, alpha: 0.25 }); // rust drip
        } else if (acc < 0.3 && !lit) {
          g.poly([wx + 5, wy + 21, wx + 13, wy + 21, wx + 12, wy + 26, wx + 6, wy + 26]).fill(0xa3552e);
          g.ellipse(wx + 9, wy + 19, 5, 3).fill(0x4a6e35);
        }
      }

      // Balcony with corbels + wrought iron
      if ((f + colorIdx) % 3 === 1 && w > 160) {
        const bx = w - 56;
        const by = -groundH - f * floorH - 14;
        g.poly([bx + 4, by + 4, bx + 10, by + 4, bx + 7, by + 11]).fill(0x5e382f);
        g.poly([bx + 34, by + 4, bx + 40, by + 4, bx + 37, by + 11]).fill(0x5e382f);
        g.rect(bx, by, 44, 4).fill(0x70443a);
        g.rect(bx, by, 44, 1.5).fill(lighten(0x70443a, 0.3));
        g.rect(bx, by + 4, 44, 2).fill({ color: 0x000000, alpha: 0.18 });
        g.moveTo(bx, by).lineTo(bx, by - 14).stroke({ width: 2, color: 0x3a3034 });
        g.moveTo(bx + 44, by).lineTo(bx + 44, by - 14).stroke({ width: 2, color: 0x3a3034 });
        g.moveTo(bx, by - 12).lineTo(bx + 44, by - 12).stroke({ width: 1.5, color: 0x3a3034 });
        for (let k = 1; k < 6; k++) {
          g.moveTo(bx + k * 7.3, by).lineTo(bx + k * 7.3, by - 12).stroke({ width: 1, color: 0x3a3034, alpha: 0.8 });
        }
        // wrought-iron diamonds
        for (let k = 0; k < 3; k++) {
          const dx2 = bx + 7 + k * 14.6;
          g.moveTo(dx2, by - 6).lineTo(dx2 + 7.3, by - 11).lineTo(dx2 + 14.6, by - 6).lineTo(dx2 + 7.3, by - 1).closePath()
            .stroke({ width: 1, color: 0x3a3034, alpha: 0.7 });
        }
        g.moveTo(bx + 2, by - 10).lineTo(bx + 42, by - 8).stroke({ width: 1, color: 0xdddddd });
        const cloth = [0xe05c5c, 0x5c9ee0, 0xf0e6c8];
        for (let k = 0; k < 3; k++) {
          g.rect(bx + 5 + k * 13, by - 9 + k, 9, 8).fill(cloth[k]);
          g.rect(bx + 5 + k * 13, by - 9 + k, 9, 2).fill({ color: 0x000000, alpha: 0.1 });
        }
      }
    }

    // --- Weathering: cracks, plaster damage, damp base ---
    for (let i = 0; i < 2 + Math.floor(rng() * 2); i++) {
      let cx2 = 20 + rng() * (w - 40), cy2 = -h + 20 + rng() * (h - groundH - 40);
      g.moveTo(cx2, cy2);
      for (let s = 0; s < 3; s++) {
        cx2 += (rng() - 0.5) * 14;
        cy2 += 8 + rng() * 14;
        g.lineTo(cx2, cy2);
      }
      g.stroke({ width: 1, color: 0x000000, alpha: 0.14 });
    }
    if (rng() < 0.7) {
      const px = 14 + rng() * (w - 60), py = -groundH - 16 - rng() * 30;
      g.poly([px, py, px + 34 + rng() * 16, py - 6, px + 40, py + 14, px + 8, py + 18]).fill(darken(color, 0.22));
      for (let bk = 0; bk < 5; bk++) {
        g.rect(px + 5 + (bk % 3) * 11, py + (bk > 2 ? 8 : 1), 9, 5).fill({ color: 0x8a4a3a, alpha: 0.8 });
      }
    }
    g.rect(0, -16, w, 16).fill({ color: 0x1c1218, alpha: 0.12 });
    g.rect(0, -8, w, 8).fill({ color: 0x1c1218, alpha: 0.12 });
    for (let i = 0; i < w / 60; i++) {
      g.ellipse(rng() * w, -6 - rng() * 12, 12 + rng() * 16, 6).fill({ color: 0x1c1218, alpha: 0.08 });
    }

    // --- Drainpipe with brackets and rust ---
    const pipeX = rng() < 0.5 ? 6 : w - 11;
    g.rect(pipeX, -h + 4, 5, h - 8).fill(darken(color, 0.34));
    g.rect(pipeX, -h + 4, 1.6, h - 8).fill({ color: 0xffffff, alpha: 0.1 });
    for (let py2 = -h + 18; py2 < -14; py2 += 42) {
      g.rect(pipeX - 1.5, py2, 8, 3).fill(darken(color, 0.45));
    }
    g.rect(pipeX - 3, -10, 11, 6).fill(darken(color, 0.4)); // elbow
    g.poly([pipeX + 1, -4, pipeX + 6, -4, pipeX + 5, 0, pipeX + 2, 0]).fill({ color: 0x6e4a30, alpha: 0.3 });

    // --- Door with arched transom and panels ---
    const dX = w / 2;
    g.circle(dX, -groundH + 10, 15).fill(lighten(color, 0.18));
    g.roundRect(dX - 15, -groundH + 8, 30, 44, 2).fill(lighten(color, 0.18));
    g.circle(dX, -groundH + 10, 12).fill(0x2a1c16);
    // transom fan
    g.moveTo(dX, -groundH + 10).lineTo(dX - 9, -groundH + 2).stroke({ width: 1.2, color: 0xd4af37, alpha: 0.5 });
    g.moveTo(dX, -groundH + 10).lineTo(dX, -groundH - 2).stroke({ width: 1.2, color: 0xd4af37, alpha: 0.5 });
    g.moveTo(dX, -groundH + 10).lineTo(dX + 9, -groundH + 2).stroke({ width: 1.2, color: 0xd4af37, alpha: 0.5 });
    g.rect(dX - 13, -groundH + 10, 26, 38).fill(0x4a2f28);
    g.rect(dX - 13, -groundH + 10, 26, 38).stroke({ width: 1.5, color: 0x000000, alpha: 0.25 });
    // door panels
    for (const [pdx, pdy] of [[-10, 14], [1, 14], [-10, 30], [1, 30]]) {
      g.rect(dX + pdx, -groundH + pdy, 9, 12).fill({ color: 0x5e3c32, alpha: 0.9 });
      g.rect(dX + pdx, -groundH + pdy, 9, 12).stroke({ width: 1, color: 0x2e1d18, alpha: 0.6 });
    }
    g.circle(dX + 9, -groundH + 31, 1.8).fill(0xd4af37);
    g.rect(dX - 16, -2, 32, 3).fill(0x6e453a);
    g.rect(dX - 16, -2, 32, 1).fill(lighten(0x6e453a, 0.3));

    // --- Ground-floor shop displays or barred basement windows ---
    if (sign) {
      for (const sx of [dX - 15 - 38, dX + 15 + 6]) {
        if (sx < 6 || sx + 32 > w - 6) continue;
        g.roundRect(sx - 2, -groundH + 12, 36, 30, 2).fill(lighten(color, 0.15));
        g.rect(sx, -groundH + 14, 32, 26).fill({ color: 0xffd98a, alpha: 0.55 });
        g.rect(sx, -groundH + 30, 32, 2).fill({ color: 0x4a2f28, alpha: 0.7 }); // shelf
        for (let b = 0; b < 4; b++) {
          g.rect(sx + 3 + b * 8, -groundH + 24, 4, 6).fill({ color: 0x6e3b2e, alpha: 0.8 });
          g.rect(sx + 4 + b * 8, -groundH + 34, 5, 5).fill({ color: 0x8a6a4a, alpha: 0.8 });
        }
        g.moveTo(sx + 4, -groundH + 38).lineTo(sx + 26, -groundH + 16).stroke({ width: 3, color: 0xffffff, alpha: 0.12 });
      }
    } else {
      for (const sx of [22, w - 50]) {
        g.rect(sx, -22, 28, 14).fill(0x241a14);
        g.rect(sx, -22, 28, 14).stroke({ width: 1.5, color: darken(color, 0.3) });
        for (let b = 1; b < 4; b++) g.rect(sx + b * 7 - 1, -22, 2, 14).fill(0x4a4044);
      }
    }

    // --- Roof clutter: chimney, antenna, dish, pigeons ---
    const chX = 30 + rng() * (w - 70);
    g.rect(chX, -h - 26, 16, 19).fill(darken(color, 0.18));
    g.rect(chX - 2, -h - 29, 20, 4).fill(darken(color, 0.32));
    g.rect(chX, -h - 22, 16, 1.5).fill({ color: 0x000000, alpha: 0.2 });
    g.rect(chX, -h - 16, 16, 1.5).fill({ color: 0x000000, alpha: 0.2 });
    g.moveTo(20, -h - 8).lineTo(20, -h - 34).stroke({ width: 2, color: 0x3a3a3a });
    g.moveTo(12, -h - 27).lineTo(28, -h - 27).stroke({ width: 1.5, color: 0x3a3a3a });
    g.moveTo(14, -h - 21).lineTo(26, -h - 21).stroke({ width: 1.5, color: 0x3a3a3a });
    if (w > 180) {
      g.ellipse(w - 30, -h - 12, 9, 7).fill(0xcccccc);
      g.ellipse(w - 32, -h - 12, 4, 5).fill({ color: 0x999999, alpha: 0.8 });
      g.moveTo(w - 30, -h - 12).lineTo(w - 24, -h - 16).stroke({ width: 1, color: 0x888888 });
    }
    // pigeons on the cornice
    for (let p = 0; p < 1 + Math.floor(rng() * 2); p++) {
      const px2 = 30 + rng() * (w - 60);
      g.ellipse(px2, -h - 10, 3, 2.2).fill(0x5a5560);
      g.circle(px2 + 2.5, -h - 12, 1.4).fill(0x5a5560);
    }

    c.addChild(g);

    // Shop sign with bulbs and glow
    if (sign) {
      const sg = new Graphics();
      const sw = Math.min(w - 24, sign.length * 13 + 26);
      sg.roundRect(w / 2 - sw / 2 - 4, -groundH - 30, sw + 8, 30, 6).fill({ color: 0xffd98a, alpha: 0.08 });
      sg.roundRect(w / 2 - sw / 2, -groundH - 26, sw, 22, 4).fill(0x231a2e);
      sg.roundRect(w / 2 - sw / 2, -groundH - 26, sw, 22, 4).stroke({ width: 2, color: 0xd4af37 });
      // marquee bulbs
      const nB = Math.floor(sw / 16);
      for (let b = 0; b <= nB; b++) {
        const bxp = w / 2 - sw / 2 + (b * sw) / nB;
        sg.circle(bxp, -groundH - 26, 1.5).fill(b % 2 ? 0xfff3c0 : 0xd4af37);
        sg.circle(bxp, -groundH - 4, 1.5).fill(b % 2 ? 0xd4af37 : 0xfff3c0);
      }
      c.addChild(sg);
      const t = new Text({
        text: sign,
        style: { fontFamily: ARM_FONT, fontSize: 13, fill: 0xffd98a, fontWeight: "700", letterSpacing: 1 },
      });
      t.anchor.set(0.5);
      t.position.set(w / 2, -groundH - 15);
      c.addChild(t);

      // Awning fabric with scalloped hem
      const ag = new Graphics();
      for (let k = 0; k < Math.floor(sw / 18); k++) {
        const ax = w / 2 - sw / 2 + k * 18;
        ag.poly([ax, -groundH - 2, ax + 18, -groundH - 2, ax + 15, -groundH + 10, ax + 3, -groundH + 10])
          .fill(k % 2 ? 0xb33a3a : 0xe8e0d0);
        ag.circle(ax + 9, -groundH + 10, 4).fill(k % 2 ? 0xb33a3a : 0xe8e0d0);
      }
      ag.rect(w / 2 - sw / 2, -groundH - 2, sw - 3, 2).fill({ color: 0xffffff, alpha: 0.15 });
      c.addChild(ag);
    }

    // Graffiti tag
    if (graffiti) {
      const t = new Text({
        text: graffiti,
        style: { fontFamily: ARM_FONT, fontSize: 17, fill: 0xffffff, fontWeight: "900", letterSpacing: 2 },
      });
      t.alpha = 0.5;
      t.rotation = -0.05;
      t.position.set(14, -groundH + 8);
      c.addChild(t);
    }

    return c;
  }

  buildProps(actors) {
    const makeLamp = () => {
      const c = new Container();
      const g = new Graphics();
      g.ellipse(0, 0, 10, 4).fill({ color: 0x000000, alpha: 0.3 });
      // plinth + ribbed pole
      g.poly([-6, 0, 6, 0, 4, -10, -4, -10]).fill(0x312c38);
      g.rect(-3, -150, 6, 140).fill(0x3c3744);
      g.rect(-3, -150, 2, 140).fill({ color: 0xffffff, alpha: 0.08 });
      for (let r = 0; r < 4; r++) g.rect(-3.8, -28 - r * 7, 7.6, 2).fill(0x312c38);
      g.roundRect(-3, -150, 22, 5, 2).fill(0x3c3744);
      g.poly([14, -145, 24, -145, 22, -138, 16, -138]).fill(0x312c38); // lamp housing
      g.circle(19, -140, 7).fill(0xffd98a);
      g.circle(19, -140, 16).fill({ color: 0xffd98a, alpha: 0.16 });
      g.circle(19, -140, 26).fill({ color: 0xffd98a, alpha: 0.06 });
      // taped flyer on the pole
      g.rect(-4, -86, 8, 10).fill(0xe8e0d0);
      g.rect(-3, -84, 6, 1).fill(0x3a3a3a);
      g.rect(-3, -82, 6, 1).fill(0x3a3a3a);
      c.addChild(g);
      return c;
    };

    const makeLada = () => {
      const c = new Container();
      const g = new Graphics();
      g.ellipse(0, 2, 62, 8).fill({ color: 0x000000, alpha: 0.3 });
      g.roundRect(-60, -30, 120, 24, 4).fill(0xe8e4d8);
      g.poly([-38, -30, -28, -48, 30, -48, 40, -30]).fill(0xe8e4d8);
      g.poly([-26, -45, 0, -45, 0, -31, -34, -31]).fill(0x3a4a5a);
      g.poly([3, -45, 27, -45, 35, -31, 3, -31]).fill(0x3a4a5a);
      g.moveTo(-28, -33).lineTo(-16, -44).stroke({ width: 2, color: 0xffffff, alpha: 0.25 });
      // roof rack
      g.rect(-26, -50, 54, 2).fill(0x8a857a);
      g.rect(-22, -48, 2, 3).fill(0x8a857a);
      g.rect(24, -48, 2, 3).fill(0x8a857a);
      // chrome trim + bumpers
      g.rect(-60, -16, 120, 3).fill(0xc9c4b4);
      g.rect(-63, -10, 8, 4).fill(0xb9b4a8);
      g.rect(55, -10, 8, 4).fill(0xb9b4a8);
      // grille
      for (let k = 0; k < 3; k++) g.rect(-59, -26 + k * 3, 6, 1.5).fill(0x8a857a);
      // door seams, handle, mirror
      g.moveTo(0, -30).lineTo(0, -8).stroke({ width: 1.5, color: 0xb8b3a3 });
      g.moveTo(-30, -30).lineTo(-30, -10).stroke({ width: 1, color: 0xb8b3a3, alpha: 0.7 });
      g.rect(-14, -24, 8, 2.5).fill(0x8a857a);
      g.rect(14, -24, 8, 2.5).fill(0x8a857a);
      g.rect(-30, -34, 5, 3).fill(0x9a958a);
      // rust patches over wheel arches
      g.ellipse(-38, -14, 10, 3).fill({ color: 0x6e4a30, alpha: 0.35 });
      g.ellipse(40, -13, 8, 2.5).fill({ color: 0x6e4a30, alpha: 0.3 });
      // wheels with hubcaps
      g.circle(-38, -4, 9).fill(0x1d1d1d);
      g.circle(-38, -4, 4).fill(0x888888);
      g.circle(-38, -4, 1.5).fill(0xc9c4b4);
      g.circle(38, -4, 9).fill(0x1d1d1d);
      g.circle(38, -4, 4).fill(0x888888);
      g.circle(38, -4, 1.5).fill(0xc9c4b4);
      // lights + plate
      g.rect(-62, -28, 4, 6).fill(0xffd98a);
      g.rect(58, -28, 4, 6).fill(0xb33a3a);
      g.rect(-54, -11, 12, 5).fill(0xe8e4d8);
      g.rect(-54, -11, 12, 5).stroke({ width: 0.8, color: 0x8a857a });
      c.addChild(g);
      return c;
    };

    const makeBin = () => {
      const c = new Container();
      const g = new Graphics();
      g.ellipse(0, 0, 12, 4).fill({ color: 0x000000, alpha: 0.3 });
      g.poly([-11, -30, 11, -30, 8, 0, -8, 0]).fill(0x4a5a48);
      g.poly([-11, -30, -6, -30, -4, 0, -8, 0]).fill({ color: 0xffffff, alpha: 0.07 });
      // dents and ribs
      g.moveTo(-7, -24).lineTo(-5, -18).stroke({ width: 1.5, color: 0x3a4838, alpha: 0.8 });
      g.moveTo(4, -14).lineTo(6, -8).stroke({ width: 1.5, color: 0x3a4838, alpha: 0.8 });
      g.rect(-9.5, -20, 19, 1.2).fill({ color: 0x3a4838, alpha: 0.7 });
      g.rect(-9, -10, 18, 1.2).fill({ color: 0x3a4838, alpha: 0.7 });
      // overflowing garbage
      g.ellipse(-3, -32, 6, 4).fill(0xd8d2c2);
      g.ellipse(5, -33, 4, 3).fill(0x8a9a5a);
      g.rect(7, -38, 3, 7).fill(0x4a7a4a);
      g.rect(-13, -33, 26, 5).fill(0x3c4a3a);
      g.rect(-13, -33, 26, 1.5).fill(lerpColor(0x3c4a3a, 0xffffff, 0.15));
      c.addChild(g);
      return c;
    };

    const props = [
      [makeLamp(), 180, 396],
      [makeLamp(), 980, 396],
      [makeLamp(), 1780, 396],
      [makeLamp(), 2580, 396],
      [makeLada(), 1320, 412],
      [makeBin(), 565, 400],
      [makeBin(), 1965, 402],
    ];

    for (const [p, x, y] of props) {
      p.position.set(x, y);
      p.zIndex = y;
      actors.addChild(p);
    }
  }

  updateCamera(camX) {
    this.scenery.x = -camX;
    this.mid.x = -camX * 0.45;
    this.far.x = -camX * 0.18;
  }
}

import { Container, Graphics, Text } from "pixi.js";
import { ARM_FONT, FACES } from "../core/Constants.js";

// ---------- PORTRAIT DRAWERS (Ported from story.js) ----------
function drawPortrait(key) {
  const f = FACES[key] || FACES.davo;
  const c = new Container();
  const g = new Graphics();
  g.roundRect(0, 0, 72, 72, 8).fill(0x1c1426);
  g.roundRect(0, 0, 72, 72, 8).stroke({ width: 2, color: 0xd4af37 });
  const cx = 36, cy = f.kid ? 42 : 40;
  
  // shoulders
  g.roundRect(cx - 26, cy + 16, 52, 20, 8).fill(f.chain ? 0x14161a : 0x3a3540);
  if (f.chain) {
    g.moveTo(cx - 14, cy + 18).quadraticCurveTo(cx, cy + 28, cx + 14, cy + 18).stroke({ width: 3, color: 0xd4af37 });
  }
  
  // head
  const r = f.kid ? 15 : 18;
  g.circle(cx, cy, r).fill(f.skin);
  if (f.beard) g.ellipse(cx, cy + 9, r * 0.72, r * 0.5).fill(f.beard);
  if (f.cap) {
    g.roundRect(cx - r - 1, cy - r - 4, (r + 1) * 2, r * 0.8, 5).fill(f.cap);
    g.roundRect(cx + 2, cy - r * 0.62, r, 4, 2).fill(f.cap);
  }
  
  if (f.scarf) {
    g.moveTo(cx - r - 2, cy + 4).arc(cx, cy - 2, r + 4, Math.PI * 0.9, Math.PI * 2.1).fill(f.scarf);
    g.poly([cx - r - 2, cy + 2, cx - r + 6, cy + 18, cx - r - 8, cy + 14]).fill(f.scarf);
    g.circle(cx, cy, r * 0.92).fill(f.skin);
    g.moveTo(cx - r, cy - 6).arc(cx, cy - 2, r, Math.PI * 0.95, Math.PI * 2.05).fill(f.scarf);
  }
  
  if (f.kid) g.rect(cx - r, cy - r - 2, r * 2, 6).fill(0x4a3320); // hair
  
  // eyes
  g.circle(cx - 6, cy - 3, 2).fill(0x1c1c1c);
  g.circle(cx + 6, cy - 3, 2).fill(0x1c1c1c);
  if (!f.scarf && !f.kid) {
    g.rect(cx - 10, cy - 9, 8, 2).fill(0x2a2118);
    g.rect(cx + 2, cy - 9, 8, 2).fill(0x2a2118);
  }
  c.addChild(g);
  return c;
}

export class DialogueView extends Container {
  constructor(W, H) {
    super();
    this.visible = false;

    const panelW = W - 120, panelH = 118;
    
    // Panel background
    this.panel = new Graphics();
    this.panel.roundRect(60, H - panelH - 18, panelW, panelH, 10).fill({ color: 0x140e20, alpha: 0.92 });
    this.panel.roundRect(60, H - panelH - 18, panelW, panelH, 10).stroke({ width: 2, color: 0xd4af37 });
    this.addChild(this.panel);

    // Speaker portrait slot
    this.portraitSlot = new Container();
    this.portraitSlot.position.set(76, H - panelH - 18 + 22);
    this.addChild(this.portraitSlot);

    // Speaker name
    this.nameText = new Text({
      text: "",
      style: { fontFamily: ARM_FONT, fontSize: 15, fill: 0xffd98a, fontWeight: "900", letterSpacing: 1 },
    });
    this.nameText.position.set(166, H - panelH - 18 + 14);
    this.addChild(this.nameText);

    // Typed dialogue text body
    this.bodyText = new Text({
      text: "",
      style: {
        fontFamily: ARM_FONT,
        fontSize: 15,
        fill: 0xf0e8f8,
        fontWeight: "400",
        wordWrap: true,
        wordWrapWidth: panelW - 130,
        lineHeight: 21,
      },
    });
    this.bodyText.position.set(166, H - panelH - 18 + 40);
    this.addChild(this.bodyText);

    // Skip/advance hint arrow
    this.hint = new Text({
      text: "J ▸",
      style: { fontFamily: ARM_FONT, fontSize: 13, fill: 0xc9a0ff, fontWeight: "700" },
    });
    this.hint.anchor.set(1, 1);
    this.hint.position.set(60 + panelW - 12, H - 28);
    this.addChild(this.hint);

    this.lines = [];
    this.idx = 0;
    this.chars = 0;
    this.onDone = null;
    this.t = 0;
  }

  show(lines, onDone) {
    this.lines = lines;
    this.idx = 0;
    this.chars = 0;
    this.onDone = onDone;
    this.visible = true;
    this.refreshSpeaker();
  }

  refreshSpeaker() {
    const line = this.lines[this.idx];
    if (!line) return;
    this.nameText.text = line.name;
    this.portraitSlot.removeChildren().forEach((c) => c.destroy({ children: true }));
    this.portraitSlot.addChild(drawPortrait(line.face));
  }

  advance() {
    const line = this.lines[this.idx];
    if (!line) return;
    
    if (this.chars < line.text.length) {
      this.chars = line.text.length; // Fast-forward typewriter
      return;
    }
    
    this.idx++;
    this.chars = 0;
    if (this.idx >= this.lines.length) {
      this.visible = false;
      const cb = this.onDone;
      this.onDone = null;
      if (cb) cb();
    } else {
      this.refreshSpeaker();
    }
  }

  update(dt) {
    this.t += dt;
    const line = this.lines[this.idx];
    if (!line) return;
    
    if (this.chars < line.text.length) {
      this.chars += dt * 1.3;
    }
    this.bodyText.text = line.text.slice(0, Math.floor(this.chars));
    this.hint.alpha = this.chars >= line.text.length ? 0.6 + Math.sin(this.t * 0.12) * 0.4 : 0.15;
  }

  get active() {
    return this.visible;
  }
}

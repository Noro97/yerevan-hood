import { Container, Graphics, Sprite, Text } from "pixi.js";
import { ARM_FONT } from "../core/Constants.js";
import { textureManager } from "../core/TextureManager.js";

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

    // Speaker portrait slot using cached Sprite
    this.portraitSlot = new Container();
    this.portraitSlot.position.set(76, H - panelH - 18 + 22);
    this.portraitSprite = new Sprite();
    this.portraitSlot.addChild(this.portraitSprite);
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
    const tex = textureManager.textures.portraits[line.face] || textureManager.textures.portraits.davo;
    if (tex) {
      this.portraitSprite.texture = tex;
    }
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

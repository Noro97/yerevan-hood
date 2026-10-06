import { Container, Sprite } from "pixi.js";
import { textureManager } from "../core/TextureManager.js";
import { floorLength } from "../data/items.js";

const HOVER = 3;

/** A pickup resting on the street (or spinning through the air when thrown). */
export class PickupView extends Container {
  constructor(type) {
    super();
    this.type = type;

    this.shadow = textureManager.createSprite(textureManager.textures.pickupShadow);
    this.icon = new Sprite(textureManager.textures.pickups[type] || textureManager.textures.pickups.shawarma);
    this.addChild(this.shadow, this.icon);

    this.applySize();
    this.setFlying(false);
  }

  /** Scales the icon from the shared size table; called again when the studio edits sizes. */
  applySize() {
    const tex = this.icon.texture;
    const s = floorLength(this.type) / (tex.content?.length ?? tex.width);
    this.icon.scale.set(s);
    const shadowTex = this.shadow.texture;
    this.shadow.scale.set(Math.max(0.6, (tex.width * s * 0.85) / shadowTex.width));
  }

  /** On the floor the icon rests on its lowest opaque row; in flight it spins around its centre. */
  setFlying(flying) {
    const tex = this.icon.texture;
    const c = tex.content ?? { bottom: tex.height, centerX: tex.width / 2 };
    this.icon.anchor.set(c.centerX / tex.width, flying ? 0.5 : c.bottom / tex.height);
    this.shadow.visible = !flying;
  }

  updateView(dt, model) {
    this.x = model.x;
    this.y = model.y;
    this.zIndex = model.y;
    // hovers between resting on the street and HOVER px above it
    this.icon.y = -((model.bobOffset + HOVER) / 2);
  }
}

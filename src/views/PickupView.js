import { Container } from "pixi.js";
import { SCALE_CONFIG } from "../core/Constants.js";
import { textureManager } from "../core/TextureManager.js";

export class PickupView extends Container {
  constructor(type) {
    super();
    this.type = type;

    // Ground shadow as Sprite
    const sTex = textureManager.textures.pickupShadow;
    this.shadow = textureManager.createSprite(sTex);
    this.addChild(this.shadow);

    // Floating item icon as Sprite
    const iTex = textureManager.textures.pickups[type] || textureManager.textures.pickups.shawarma;
    this.icon = textureManager.createSprite(iTex);
    this.addChild(this.icon);

    const s = SCALE_CONFIG.PICKUP_SCALES[type] || SCALE_CONFIG.PICKUP_SCALES.default;
    this.scale.set(s);
  }

  updateView(dt, model) {
    this.x = model.x;
    this.y = model.y;
    this.zIndex = model.y;
    this.icon.y = model.bobOffset;
  }
}

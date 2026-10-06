import { Container } from "pixi.js";
import { SCALE_CONFIG } from "../core/Constants.js";
import { textureManager } from "../core/TextureManager.js";

export class CrateView extends Container {
  constructor() {
    super();
    const tex = textureManager.textures.crate;
    this.sprite = textureManager.createSprite(tex);
    this.addChild(this.sprite);
    this.scale.set(SCALE_CONFIG.CRATE_SCALE);
  }

  updateView(dt, model) {
    this.x = model.x;
    this.y = model.y;
    this.zIndex = model.y;
  }
}

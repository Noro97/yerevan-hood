import { Container, Sprite } from "pixi.js";
import { CHAR_SCALE } from "../core/Constants.js";
import { textureManager } from "../core/TextureManager.js";

export class BulletView extends Container {
  constructor() {
    super();
    const tex = textureManager.textures.bullet;
    this.sprite = textureManager.createSprite(tex);
    this.addChild(this.sprite);
    this.scale.set(CHAR_SCALE);
  }

  updateView(dt, model) {
    this.x = model.x;
    this.y = model.ry;
    this.zIndex = model.gy + 10;
    this.scale.x = (model.vx < 0 ? -1 : 1) * CHAR_SCALE;
    this.scale.y = CHAR_SCALE;
  }
}

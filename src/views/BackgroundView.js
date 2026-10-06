import { Container, Sprite } from "pixi.js";
import { textureManager } from "../core/TextureManager.js";
import level from "../data/level.js";

export const LAYERS = ["sky", "far", "mid", "street", "fences", "cables", "fore"];

const PARALLAX = { far: 0.18, mid: 0.45, fore: 1.25 };

/**
 * The street, built from src/data/level.js. Sky / far / mid sit behind the world and scroll with
 * parallax; street, fences, buildings and cables are world scenery; props are y-sorted with the
 * fighters in the scene's actors layer; fore is drawn in front of everything.
 */
export class BackgroundView {
  constructor() {
    const tex = textureManager.textures;
    this.level = level;

    this.sky = new Sprite(tex.sky);
    this.far = new Sprite(tex.far);
    this.mid = new Sprite(tex.mid);

    this.scenery = new Container();
    this.street = new Sprite(tex.street);
    this.fences = new Sprite(tex.fences);
    this.buildingLayer = new Container();
    this.cables = new Sprite(tex.cables);
    this.scenery.addChild(this.street, this.fences, this.buildingLayer, this.cables);

    this.fore = new Sprite(tex.fore);

    this.buildings = [];
    this.propsList = [];
    this.lampXs = [];
    this.actorsRef = null;
    this.camX = 0;

    this.applyLayers();
    this.buildBuildings();
  }

  applyLayers() {
    for (const name of LAYERS) {
      const t = this.level.layers[name];
      const sprite = this[name];
      sprite.position.set(t.x, t.y);
      sprite.scale.set(t.scaleX, t.scaleY);
      sprite.alpha = t.alpha;
      sprite.visible = t.visible;
    }
    this.updateCamera(this.camX);
  }

  buildBuildings() {
    const textures = textureManager.textures.buildings;
    for (const sprite of this.buildings) sprite.destroy();
    this.buildings = this.level.buildings.map((b) => {
      const sprite = textureManager.createSprite(textures[b.texture % textures.length]);
      sprite.position.set(b.x, b.y);
      sprite.scale.set(b.scaleX, b.scaleY);
      sprite.visible = b.visible;
      this.buildingLayer.addChild(sprite);
      return sprite;
    });
  }

  /** Props are y-sorted with the fighters, so they live in the scene's actors layer. */
  buildProps(actors) {
    this.actorsRef = actors;
    for (const p of this.propsList) p.sprite.destroy();
    this.propsList = this.level.props.map((cfg) => {
      const tex = textureManager.textures.props;
      const sprite = textureManager.createSprite(tex[cfg.type] || tex.lamp);
      actors.addChild(sprite);
      const prop = { cfg, sprite, id: cfg.id, type: cfg.type, x: cfg.x, y: cfg.y };
      this.placeProp(prop);
      return prop;
    });
    this.updateLamps();
  }

  /** Lamp positions for the fighters' warm lamp glow; refreshed whenever props move. */
  updateLamps() {
    this.lampXs = this.propsList.filter((p) => p.type === "lamp").map((p) => p.x);
  }

  placeProp(prop) {
    const { cfg, sprite } = prop;
    Object.assign(prop, { x: cfg.x, y: cfg.y, type: cfg.type });
    sprite.position.set(cfg.x, cfg.y);
    sprite.scale.set(cfg.scale);
    sprite.zIndex = cfg.y;
    this.updateLamps();
  }

  /** Re-reads everything from the level data (studio Level tab). */
  applyLevel() {
    this.applyLayers();
    this.buildBuildings();
    if (this.actorsRef && !this.actorsRef.destroyed) this.buildProps(this.actorsRef);
  }

  updateCamera(camX) {
    this.camX = camX;
    for (const [name, factor] of Object.entries(PARALLAX)) {
      this[name].x = this.level.layers[name].x - camX * factor;
    }
  }
}

import { Container, Sprite } from "pixi.js";
import { SCALE_CONFIG } from "../core/Constants.js";
import { textureManager } from "../core/TextureManager.js";

const BUILDING_X_POSITIONS = [0, 311, 641, 1143, 1365, 1647, 1899, 2201, 2443, 2755];
const BUILDING_SCALES = [1.1, 1.3, 1.5, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0];

const FORE_ALPHA = 0.3;

export const DEFAULT_PROPS_CONFIG = [
  { id: "lamp_1", type: "lamp", x: 180, y: 396, scale: SCALE_CONFIG.PROP_SCALES.lamp },
  { id: "lamp_2", type: "lamp", x: 980, y: 396, scale: SCALE_CONFIG.PROP_SCALES.lamp },
  { id: "lamp_3", type: "lamp", x: 1780, y: 396, scale: SCALE_CONFIG.PROP_SCALES.lamp },
  { id: "lamp_4", type: "lamp", x: 2580, y: 396, scale: SCALE_CONFIG.PROP_SCALES.lamp },
  { id: "lada_1", type: "lada", x: 1320, y: 412, scale: SCALE_CONFIG.PROP_SCALES.lada },
  { id: "bin_1", type: "bin", x: 565, y: 400, scale: SCALE_CONFIG.PROP_SCALES.bin },
  { id: "bin_2", type: "bin", x: 1965, y: 402, scale: SCALE_CONFIG.PROP_SCALES.bin },
];

export class BackgroundView {
  constructor() {
    const tex = textureManager.textures;

    // 1. Sky layer (fixed, no parallax)
    this.sky = new Sprite(tex.sky);

    // 2. Far layer (Ararat + TV tower)
    this.far = new Sprite(tex.far);

    // 3. Mid layer (Distant skyline silhouettes)
    this.mid = new Sprite(tex.mid);

    // 4. World Scenery container (holds street, buildings, fences, cables)
    this.scenery = new Container();

    // Street & sidewalk
    this.street = new Sprite(tex.street);
    this.scenery.addChild(this.street);

    // Alley fences (recessed behind buildings)
    this.fences = new Sprite(tex.fences);
    this.scenery.addChild(this.fences);

    // Buildings as GPU-batched sprites
    this.buildings = [];
    for (let i = 0; i < tex.buildings.length; i++) {
      const bTex = tex.buildings[i];
      const bSprite = textureManager.createSprite(bTex);
      bSprite.position.set(BUILDING_X_POSITIONS[i], 398);
      if (BUILDING_SCALES[i] && BUILDING_SCALES[i] !== 1.0) {
        bSprite.scale.set(BUILDING_SCALES[i]);
      }
      this.buildings.push(bSprite);
      this.scenery.addChild(bSprite);
    }

    // Roof power cables
    this.cables = new Sprite(tex.cables);
    this.scenery.addChild(this.cables);

    // Out-of-focus foreground strip. NOTE: the placeholder texture is a near-opaque band over the
    // whole walkable street, so it's kept faint to leave the fighters readable.
    this.fore = new Sprite(tex.fore);
    this.fore.alpha = FORE_ALPHA;
    this.foreBaseY = 0;

    // Skyline base coordinates
    this.farBaseX = 0;
    this.farBaseY = 0;
    this.midBaseX = 0;
    this.midBaseY = 0;

    // Dynamic props registry
    this.propsList = [];
    this.actorsRef = null;
    this.customPropsConfig = null;
  }

  /**
   * Y-sorted street props added to actors container
   */
  buildProps(actors) {
    this.actorsRef = actors;
    this.clearProps();

    const configs = this.customPropsConfig || DEFAULT_PROPS_CONFIG;
    for (const cfg of configs) {
      this.createPropSprite(cfg, actors);
    }
  }

  createPropSprite(cfg, actors = this.actorsRef) {
    if (!actors) return null;
    const tex = textureManager.textures.props;
    const propTex = tex[cfg.type] || tex.lamp;
    if (!propTex) return null;

    const p = textureManager.createSprite(propTex);
    p.position.set(cfg.x, cfg.y);
    p.zIndex = cfg.y;
    p.scale.set(cfg.scale || 1.0);
    actors.addChild(p);

    const propItem = {
      id: cfg.id || `prop_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      type: cfg.type,
      x: cfg.x,
      y: cfg.y,
      scale: cfg.scale || 1.0,
      sprite: p,
    };
    this.propsList.push(propItem);
    return propItem;
  }

  addProp(type, x, y, scale = 1.0) {
    const id = `${type}_${Date.now()}`;
    const cfg = { id, type, x, y, scale };
    return this.createPropSprite(cfg);
  }

  removeProp(id) {
    const idx = this.propsList.findIndex((p) => p.id === id);
    if (idx !== -1) {
      const p = this.propsList[idx];
      if (p.sprite) {
        p.sprite.destroy({ children: true, texture: false });
      }
      this.propsList.splice(idx, 1);
      return true;
    }
    return false;
  }

  updateProp(id, { x, y, scale }) {
    const p = this.propsList.find((item) => item.id === id);
    if (!p) return;
    if (x !== undefined) {
      p.x = x;
      p.sprite.x = x;
    }
    if (y !== undefined) {
      p.y = y;
      p.sprite.y = y;
      p.sprite.zIndex = y;
    }
    if (scale !== undefined) {
      p.scale = scale;
      p.sprite.scale.set(scale);
    }
  }

  clearProps() {
    for (const p of this.propsList) {
      if (p.sprite) {
        p.sprite.destroy({ children: true, texture: false });
      }
    }
    this.propsList = [];
  }

  setStreetTransform({ x, y, scaleX, scaleY, alpha }) {
    if (!this.street) return;
    if (x !== undefined) this.street.x = x;
    if (y !== undefined) this.street.y = y;
    if (scaleX !== undefined) this.street.scale.x = scaleX;
    if (scaleY !== undefined) this.street.scale.y = scaleY;
    if (alpha !== undefined) this.street.alpha = alpha;
  }

  setForegroundTransform({ x, y, scaleX, scaleY, alpha, visible }) {
    if (!this.fore) return;
    if (x !== undefined) this.fore.x = x;
    if (y !== undefined) {
      this.foreBaseY = y;
      this.fore.y = y;
    }
    if (scaleX !== undefined) this.fore.scale.x = scaleX;
    if (scaleY !== undefined) this.fore.scale.y = scaleY;
    if (alpha !== undefined) this.fore.alpha = alpha;
    if (visible !== undefined) this.fore.visible = visible;
  }

  setFarTransform({ x, y, scaleX, scaleY, alpha, visible }) {
    if (!this.far) return;
    if (x !== undefined) {
      this.farBaseX = x;
      this.far.x = x;
    }
    if (y !== undefined) {
      this.farBaseY = y;
      this.far.y = y;
    }
    if (scaleX !== undefined) this.far.scale.x = scaleX;
    if (scaleY !== undefined) this.far.scale.y = scaleY;
    if (alpha !== undefined) this.far.alpha = alpha;
    if (visible !== undefined) this.far.visible = visible;
  }

  setMidTransform({ x, y, scaleX, scaleY, alpha, visible }) {
    if (!this.mid) return;
    if (x !== undefined) {
      this.midBaseX = x;
      this.mid.x = x;
    }
    if (y !== undefined) {
      this.midBaseY = y;
      this.mid.y = y;
    }
    if (scaleX !== undefined) this.mid.scale.x = scaleX;
    if (scaleY !== undefined) this.mid.scale.y = scaleY;
    if (alpha !== undefined) this.mid.alpha = alpha;
    if (visible !== undefined) this.mid.visible = visible;
  }

  setCablesTransform({ x, y, scaleX, scaleY, alpha, visible }) {
    if (!this.cables) return;
    if (x !== undefined) this.cables.x = x;
    if (y !== undefined) this.cables.y = y;
    if (scaleX !== undefined) this.cables.scale.x = scaleX;
    if (scaleY !== undefined) this.cables.scale.y = scaleY;
    if (alpha !== undefined) this.cables.alpha = alpha;
    if (visible !== undefined) this.cables.visible = visible;
  }

  setFencesTransform({ x, y, scaleX, scaleY, alpha, visible }) {
    if (!this.fences) return;
    if (x !== undefined) this.fences.x = x;
    if (y !== undefined) this.fences.y = y;
    if (scaleX !== undefined) this.fences.scale.x = scaleX;
    if (scaleY !== undefined) this.fences.scale.y = scaleY;
    if (alpha !== undefined) this.fences.alpha = alpha;
    if (visible !== undefined) this.fences.visible = visible;
  }

  setSkyTransform({ x, y, scaleX, scaleY, alpha, visible }) {
    if (!this.sky) return;
    if (x !== undefined) this.sky.x = x;
    if (y !== undefined) this.sky.y = y;
    if (scaleX !== undefined) this.sky.scale.x = scaleX;
    if (scaleY !== undefined) this.sky.scale.y = scaleY;
    if (alpha !== undefined) this.sky.alpha = alpha;
    if (visible !== undefined) this.sky.visible = visible;
  }

  setBuildingTransform(index, { x, y, scaleX, scaleY }) {
    const b = this.buildings[index];
    if (!b) return;
    if (x !== undefined) b.x = x;
    if (y !== undefined) b.y = y;
    if (scaleX !== undefined) b.scale.x = scaleX;
    if (scaleY !== undefined) b.scale.y = scaleY;
  }

  setBuildingVisibility(index, visible) {
    const b = this.buildings[index];
    if (b) b.visible = visible;
  }

  addBuilding(texIndex, x, y, scaleX = 1.0, scaleY = 1.0) {
    const tex = textureManager.textures.buildings[texIndex % 10];
    if (!tex) return null;
    const bSprite = textureManager.createSprite(tex);
    bSprite.position.set(x, y);
    bSprite.scale.set(scaleX, scaleY);
    this.buildings.push(bSprite);
    this.scenery.addChild(bSprite);
    return bSprite;
  }

  removeBuilding(index) {
    if (index >= 0 && index < this.buildings.length) {
      const b = this.buildings[index];
      b.destroy({ children: true, texture: false });
      this.buildings.splice(index, 1);
    }
  }

  updateCamera(camX) {
    if (this.mid) {
      this.mid.x = this.midBaseX - camX * 0.45;
      this.mid.y = this.midBaseY;
    }
    if (this.far) {
      this.far.x = this.farBaseX - camX * 0.18;
      this.far.y = this.farBaseY;
    }
    if (this.fore) {
      this.fore.x = -camX * 1.25;
      if (this.foreBaseY) {
        this.fore.y = this.foreBaseY;
      }
    }
  }
}

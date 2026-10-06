import { Assets, Sprite } from "pixi.js";
import { PALETTES, FACES } from "./Constants.js";

class TextureManager {
  constructor() {
    this.textures = {
      sky: null,
      far: null,
      mid: null,
      street: null,
      fore: null,
      fences: null,
      cables: null,
      buildings: [],
      props: {},
      characters: {},
      shadow: null,
      crate: null,
      pickups: {},
      pickupShadow: null,
      weapons: {},
      bullet: null,
      portraits: {},
    };
    this.manifest = null;
    this.initialized = false;
  }

  /**
   * Spawns a Sprite pre-configured with the texture's defaultAnchor if present.
   */
  createSprite(tex) {
    const s = new Sprite(tex);
    if (tex && tex.defaultAnchor) {
      s.anchor.set(tex.defaultAnchor.x, tex.defaultAnchor.y);
    }
    return s;
  }

  /**
   * Asynchronously loads all pre-generated texture image assets via PixiJS Assets.
   */
  async init(renderer) {
    if (this.initialized) return;

    // 1. Fetch manifest mapping asset keys to file paths and anchor coordinates
    const res = await fetch("./assets/textures/manifest.json");
    this.manifest = await res.json();

    // 2. Load all texture image files in parallel
    const keys = Object.keys(this.manifest);
    const promises = keys.map(async (key) => {
      const info = this.manifest[key];
      const url = `./${info.png}`;
      const tex = await Assets.load(info.res ? { src: url, data: { resolution: info.res } } : url);
      tex.defaultAnchor = { x: info.anchorX, y: info.anchorY };
      tex.pad = info.pad ?? 0;
      if (info.sockets) tex.sockets = info.sockets;
      return [key, tex];
    });

    const results = await Promise.all(promises);
    const texMap = Object.fromEntries(results);

    // 3. Map into structured texture dictionary
    // Environment
    this.textures.sky = texMap["environment/sky"];
    this.textures.far = texMap["environment/far"];
    this.textures.mid = texMap["environment/mid"];
    this.textures.street = texMap["environment/street"];
    this.textures.fences = texMap["environment/fences"];
    this.textures.cables = texMap["environment/cables"];
    this.textures.fore = texMap["environment/fore"];

    // Buildings (10 Yerevan tuff buildings)
    this.textures.buildings = [];
    for (let i = 0; i < 10; i++) {
      this.textures.buildings.push(texMap[`buildings/building_${i}`]);
    }

    // Props
    this.textures.props = {
      lamp: texMap["props/lamp"],
      lada: texMap["props/lada"],
      bin: texMap["props/bin"],
    };

    // Characters (modular limbs rig for each palette)
    this.textures.characters = {};
    for (const pKey of Object.keys(PALETTES)) {
      this.textures.characters[pKey] = {
        arm: texMap[`characters/${pKey}_arm`],
        leg: texMap[`characters/${pKey}_leg`],
        torso: texMap[`characters/${pKey}_torso`],
        head: texMap[`characters/${pKey}_head`],
      };
    }
    this.textures.shadow = texMap["characters/shadow"];

    // Objects
    this.textures.crate = texMap["objects/crate"];
    this.textures.bullet = texMap["objects/bullet"];

    // Pickups
    this.textures.pickups = {};
    const pickupKeys = [
      "shawarma", "khorovats", "tan", "cognac", "coin",
      "medal", "stick", "bottle", "pistol", "lid"
    ];
    for (const pKey of pickupKeys) {
      this.textures.pickups[pKey] = texMap[`pickups/${pKey}`];
    }
    this.textures.pickupShadow = texMap["pickups/pickup_shadow"];

    // In-hand weapons
    this.textures.weapons = {
      stick: texMap["weapons/stick"],
      bottle: texMap["weapons/bottle"],
      pistol: texMap["weapons/pistol"],
      lid: texMap["weapons/lid"],
    };

    // Dialogue Portraits
    this.textures.portraits = {};
    for (const fKey of Object.keys(FACES)) {
      this.textures.portraits[fKey] = texMap[`portraits/${fKey}`];
    }

    this.initialized = true;
    console.log(`[TextureManager] Successfully loaded ${keys.length} texture images into GPU cache.`);
  }
}

export const textureManager = new TextureManager();

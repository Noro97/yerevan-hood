import { Assets, Sprite } from "pixi.js";
import { PALETTES, FACES } from "./Constants.js";

const MANIFEST_URL = "./assets/textures/manifest.json";
const LAYERS = ["sky", "far", "mid", "street", "fences", "cables", "fore"];
const BODY_PARTS = ["arm", "leg", "torso", "head"];
const SINGLES = ["characters/shadow", "objects/crate", "objects/bullet", "pickups/pickup_shadow"];

/** Keys under `prefix/` in manifest order, without the prefix. */
const namesUnder = (keys, prefix) => keys.filter((k) => k.startsWith(`${prefix}/`)).map((k) => k.slice(prefix.length + 1));

class TextureManager {
  constructor() {
    this.textures = {
      sky: null, far: null, mid: null, street: null, fore: null, fences: null, cables: null,
      buildings: [], props: {}, characters: {}, shadow: null, crate: null,
      pickups: {}, pickupShadow: null, weapons: {}, bullet: null, portraits: {},
    };
    this.manifest = null;
    this.initialized = false;
  }

  /** A Sprite with the texture's manifest anchor. */
  createSprite(tex) {
    const s = new Sprite(tex);
    if (tex && tex.defaultAnchor) {
      s.anchor.set(tex.defaultAnchor.x, tex.defaultAnchor.y);
    }
    return s;
  }

  /**
   * Loads every texture in the manifest. Rejects with one message naming every texture that is
   * missing from the manifest or failed to load, instead of failing on the first broken file.
   */
  async init() {
    if (this.initialized) return;

    const res = await fetch(MANIFEST_URL);
    if (!res.ok) throw new Error(`Texture manifest ${MANIFEST_URL}: HTTP ${res.status}`);
    this.manifest = await res.json();
    const keys = Object.keys(this.manifest);

    const results = await Promise.allSettled(keys.map(async (key) => {
      const info = this.manifest[key];
      const url = `./${info.png}`;
      const tex = await Assets.load(info.res ? { src: url, data: { resolution: info.res } } : url);
      tex.defaultAnchor = { x: info.anchorX, y: info.anchorY };
      tex.pad = info.pad ?? 0;
      if (info.sockets) tex.sockets = info.sockets;
      if (info.content) tex.content = info.content;
      return [key, tex];
    }));
    const failed = keys.filter((_, i) => results[i].status === "rejected");
    const texMap = Object.fromEntries(results.filter((r) => r.status === "fulfilled").map((r) => r.value));

    const required = [
      ...LAYERS.map((l) => `environment/${l}`),
      ...Object.keys(PALETTES).flatMap((p) => BODY_PARTS.map((part) => `characters/${p}_${part}`)),
      ...Object.keys(FACES).map((f) => `portraits/${f}`),
      ...SINGLES,
    ];
    const missing = [...new Set([...failed, ...required.filter((k) => !(k in texMap))])];
    if (missing.length) throw new Error(`Missing or broken textures (${missing.length}): ${missing.join(", ")}`);

    const t = this.textures;
    for (const layer of LAYERS) t[layer] = texMap[`environment/${layer}`];
    t.buildings = namesUnder(keys, "buildings")
      .sort((a, b) => Number(a.split("_")[1]) - Number(b.split("_")[1]))
      .map((name) => texMap[`buildings/${name}`]);
    t.props = Object.fromEntries(namesUnder(keys, "props").map((n) => [n, texMap[`props/${n}`]]));
    t.characters = Object.fromEntries(Object.keys(PALETTES).map((p) =>
      [p, Object.fromEntries(BODY_PARTS.map((part) => [part, texMap[`characters/${p}_${part}`]]))]));
    t.shadow = texMap["characters/shadow"];
    t.crate = texMap["objects/crate"];
    t.bullet = texMap["objects/bullet"];
    t.pickups = Object.fromEntries(namesUnder(keys, "pickups").filter((n) => n !== "pickup_shadow").map((n) => [n, texMap[`pickups/${n}`]]));
    t.pickupShadow = texMap["pickups/pickup_shadow"];
    t.weapons = Object.fromEntries(namesUnder(keys, "weapons").map((n) => [n, texMap[`weapons/${n}`]]));
    t.portraits = Object.fromEntries(Object.keys(FACES).map((f) => [f, texMap[`portraits/${f}`]]));

    this.initialized = true;
  }
}

export const textureManager = new TextureManager();

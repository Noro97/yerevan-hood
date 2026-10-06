import { DEFAULT_PROPS_CONFIG } from "../views/BackgroundView.js";

const STORAGE_KEY = "yerevan_hood_sandbox_config";

export const DEFAULT_SANDBOX_STATE = {
  // Asset Scales & Dimensions
  scales: {
    player: 1.0,
    enemies: 1.0,
    buildingsGlobal: 1.0,
    buildings: [1.1, 1.3, 1.5, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0], // 10 buildings
    buildingScaleY: [1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0],
    propsLada: 1.2,
    propsLamps: 1.0,
    propsBins: 1.0,
    crates: 1.0,
    pickups: 1.0,
    handWeapon: 1.0,
  },

  // Skyline & Ararat Scaling and Positioning
  skyline: {
    araratScaleX: 1.0,
    araratScaleY: 1.0,
    araratX: 0,
    araratY: 0,
    araratAlpha: 1.0,
    araratVisible: true,
    midScaleX: 1.0,
    midScaleY: 1.0,
    midX: 0,
    midY: 0,
    midAlpha: 1.0,
    midVisible: true,
    cablesVisible: true,
    fencesVisible: true,
  },

  // Street texture position & scale
  street: {
    x: 0,
    y: 0,
    scaleX: 1.0,
    scaleY: 1.0,
    alpha: 1.0,
  },

  // Walkable Floor bounds (allows reaching the endline of the street)
  floor: {
    top: 392,
    bottom: 538,
    showBounds: false,
  },

  // Foreground strip & layer
  foreground: {
    x: 0,
    y: 0,
    scaleX: 1.0,
    scaleY: 1.0,
    alpha: 1.0,
    visible: true,
  },

  // Dynamic props collection (Lamps, Car, Bins, etc.)
  props: JSON.parse(JSON.stringify(DEFAULT_PROPS_CONFIG)),

  // Building custom offsets & visibility
  buildingOffsets: {
    x: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    y: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  },
  buildingVisibility: [true, true, true, true, true, true, true, true, true, true],

  // Visuals & Post-Processing
  visuals: {
    playerPalette: "player",
    weapon: "none",
    weaponScale: 1.0,
    ammo: 6,
    // ColorMatrixFilter
    hue: 0,           // degrees (-180 to 180)
    saturation: 1.0,  // multiplier (0 to 3)
    brightness: 1.0,  // multiplier (0 to 2)
    contrast: 1.0,    // multiplier (0 to 2)
    // Overlays
    moodColor: "#ffffff",
    moodAlpha: 0.0,
    vignette: true,
    vignetteAlpha: 1.0,
    // Layers visibility
    layerSky: true,
    layerFar: true,
    layerMid: true,
    layerScenery: true,
    layerFore: true,
  },

  // Cheats & Functional Controls
  cheats: {
    godMode: false,
    infiniteSuper: false,
    oneHitKO: false,
    unlimitedAmmo: false,
    speedMultiplier: 1.0,
  },

  // Time & Simulation
  time: {
    timeScale: 1.0,
    paused: false,
  },

  // Physics & Hitbox Overlays
  debug: {
    hitboxes: true,      // Active attack forward reach (red)
    hurtboxes: true,     // Entity cylinders and ground footprint (green)
    depthBand: true,     // Player combat Y-depth lane (yellow)
    vectors: true,       // Velocity, vertical, and knockback arrows (cyan/orange)
    separation: true,    // Entity push-box ground radius (blue)
    projectiles: true,   // Swept line raycasts for bullets/thrown items (magenta)
  },

  // UI state
  ui: {
    isOpen: true,
    activeTab: "physics", // physics | entities | assets | visuals | game | gallery | presets
    selectedBuilding: 0,  // 0-9 or -1 for all
    selectedPropId: "lamp_1",
  }
};

export class SandboxState {
  constructor() {
    this.data = JSON.parse(JSON.stringify(DEFAULT_SANDBOX_STATE));
    this.loadFromStorage();
  }

  loadFromStorage() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        this.mergeState(parsed);
      }
    } catch (err) {
      console.warn("[DevSandbox] Failed to load config from localStorage:", err);
    }
  }

  saveToStorage() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.data));
      return true;
    } catch (err) {
      console.warn("[DevSandbox] Failed to save config to localStorage:", err);
      return false;
    }
  }

  resetToDefaults() {
    this.data = JSON.parse(JSON.stringify(DEFAULT_SANDBOX_STATE));
    this.saveToStorage();
  }

  mergeState(incoming) {
    if (!incoming || typeof incoming !== "object") return;
    
    // Deep merge scales
    if (incoming.scales) {
      this.data.scales = { ...this.data.scales, ...incoming.scales };
      if (Array.isArray(incoming.scales.buildings)) {
        this.data.scales.buildings = [...incoming.scales.buildings];
      }
      if (Array.isArray(incoming.scales.buildingScaleY)) {
        this.data.scales.buildingScaleY = [...incoming.scales.buildingScaleY];
      }
    }

    if (incoming.buildingOffsets) {
      if (Array.isArray(incoming.buildingOffsets.x)) {
        this.data.buildingOffsets.x = [...incoming.buildingOffsets.x];
      }
      if (Array.isArray(incoming.buildingOffsets.y)) {
        this.data.buildingOffsets.y = [...incoming.buildingOffsets.y];
      }
    }

    if (incoming.street) {
      this.data.street = { ...this.data.street, ...incoming.street };
    }

    if (incoming.skyline) {
      this.data.skyline = { ...this.data.skyline, ...incoming.skyline };
    }

    if (incoming.floor) {
      this.data.floor = { ...this.data.floor, ...incoming.floor };
    }

    if (incoming.foreground) {
      this.data.foreground = { ...this.data.foreground, ...incoming.foreground };
    }

    if (Array.isArray(incoming.props)) {
      this.data.props = JSON.parse(JSON.stringify(incoming.props));
    }

    if (Array.isArray(incoming.buildingVisibility)) {
      this.data.buildingVisibility = [...incoming.buildingVisibility];
    }

    if (incoming.visuals) {
      this.data.visuals = { ...this.data.visuals, ...incoming.visuals };
    }

    if (incoming.cheats) {
      this.data.cheats = { ...this.data.cheats, ...incoming.cheats };
    }

    if (incoming.time) {
      this.data.time = { ...this.data.time, ...incoming.time };
    }

    if (incoming.ui) {
      this.data.ui = { ...this.data.ui, ...incoming.ui };
    }
  }

  exportJSON() {
    return JSON.stringify(this.data, null, 2);
  }

  importJSON(jsonString) {
    try {
      const parsed = JSON.parse(jsonString);
      this.mergeState(parsed);
      this.saveToStorage();
      return true;
    } catch (err) {
      console.error("[DevSandbox] Invalid JSON configuration:", err);
      return false;
    }
  }

  applyPreset(presetName) {
    const presets = {
      "default": DEFAULT_SANDBOX_STATE,
      "boss_arena": {
        scales: {
          player: 1.1,
          enemies: 1.35,
          buildingsGlobal: 1.0,
          propsLada: 1.4,
          crates: 1.2,
          pickups: 1.2,
        },
        visuals: {
          playerPalette: "player",
          weapon: "bottle",
          hue: 0,
          saturation: 1.2,
          brightness: 0.95,
          contrast: 1.2,
          moodColor: "#ff7744",
          moodAlpha: 0.12,
        },
        cheats: {
          godMode: false,
          infiniteSuper: true,
          oneHitKO: false,
        }
      },
      "gunner_gauntlet": {
        scales: {
          player: 1.0,
          enemies: 0.95,
          buildingsGlobal: 1.0,
        },
        visuals: {
          playerPalette: "player",
          weapon: "pistol",
          ammo: 24,
          hue: -15,
          saturation: 1.1,
          brightness: 0.9,
          contrast: 1.15,
          moodColor: "#3366cc",
          moodAlpha: 0.1,
        },
        cheats: {
          unlimitedAmmo: true,
        }
      },
      "micro_brawler": {
        scales: {
          player: 0.65,
          enemies: 1.55,
          buildingsGlobal: 1.2,
          propsLada: 1.5,
          crates: 0.7,
        },
        visuals: {
          hue: 20,
          saturation: 1.3,
          brightness: 1.05,
          contrast: 1.1,
        },
        cheats: {
          speedMultiplier: 1.4,
        }
      },
      "night_kond_noir": {
        scales: {
          player: 1.0,
          enemies: 1.0,
          buildingsGlobal: 1.0,
        },
        visuals: {
          playerPalette: "boss",
          hue: -80,
          saturation: 0.4,
          brightness: 0.75,
          contrast: 1.4,
          moodColor: "#110926",
          moodAlpha: 0.35,
          vignette: true,
          vignetteAlpha: 1.0,
        },
        cheats: {
          godMode: false,
        }
      }
    };

    const target = presets[presetName];
    if (target) {
      this.mergeState(target);
      this.saveToStorage();
      return true;
    }
    return false;
  }
}

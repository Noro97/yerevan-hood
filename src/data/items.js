import { CHAR_SCALE } from "../core/Constants.js";
import overrides from "./tuning/items.js";
import { clone, deepAssign, diff } from "./patch.js";

// Item sizes: one table, so the same object is the same size on the floor and in a hand.
//
// A character is ~135 body units tall ≈ 1.8 m, so 1 m = 75 body units. In-hand weapons live in
// body units (the rig scales them with the fighter); floor items live in world pixels, where a
// scale-1 fighter is drawn at CHAR_SCALE — so 1 m on the floor = 75 × CHAR_SCALE px.
//
// `real` is the object's real length in metres, `show` a readability factor for things that
// would be a few pixels tall at true scale (a coin, a pistol). Displayed length = real × show,
// measured along the object's main axis (see scripts/measure_items.py → manifest `content`).
export const UNITS_PER_METER = 75;
export const FLOOR_PX_PER_METER = UNITS_PER_METER * CHAR_SCALE;

export const ITEMS = {
  // Weapons. grip: hand position in weapons/<kind>.png pixels.
  // carry: rotation (rad) relative to the arm while not swinging or aiming; negative tips the
  // far end toward the facing direction (a pistol held at the low ready).
  stick: { real: 0.85, show: 1, grip: [15.5, 8], carry: 0 },
  bottle: { real: 0.3, show: 1.5, grip: [15.5, 10], carry: 0 },
  pistol: { real: 0.18, show: 1.8, grip: [18.8, 14.7], carry: -0.9 },
  lid: { real: 0.5, show: 1, grip: [18.4, 6], carry: 0 },

  // Food & valuables (floor only).
  shawarma: { real: 0.25, show: 1.6 },
  khorovats: { real: 0.45, show: 1.2 },
  tan: { real: 0.12, show: 2.4 },
  cognac: { real: 0.25, show: 1.5 },
  coin: { real: 0.04, show: 7 },
  medal: { real: 0.1, show: 4 },
};

export const displayMeters = (kind) => ITEMS[kind].real * ITEMS[kind].show;
export const floorLength = (kind) => displayMeters(kind) * FLOOR_PX_PER_METER;
export const handLength = (kind) => displayMeters(kind) * UNITS_PER_METER;

export const ITEM_DEFAULTS = clone(ITEMS);
export const itemChanges = () => diff(ITEM_DEFAULTS, ITEMS);
export const resetItems = () => deepAssign(ITEMS, ITEM_DEFAULTS);
deepAssign(ITEMS, overrides);

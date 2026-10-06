// Helpers for "defaults + saved overrides" data tables (combat tuning, item sizes).

export const clone = (value) => structuredClone(value);

/** Writes every leaf of `patch` into `target` in place (arrays are replaced wholesale). */
export function deepAssign(target, patch) {
  for (const [key, value] of Object.entries(patch ?? {})) {
    if (value && typeof value === "object" && !Array.isArray(value) && target[key] && typeof target[key] === "object") {
      deepAssign(target[key], value);
    } else {
      target[key] = clone(value);
    }
  }
  return target;
}

/** The minimal patch that turns `defaults` into `current` (only changed leaves). */
export function diff(defaults, current) {
  const out = {};
  for (const [key, value] of Object.entries(current)) {
    const base = defaults?.[key];
    if (value && typeof value === "object" && !Array.isArray(value)) {
      const sub = diff(base ?? {}, value);
      if (Object.keys(sub).length) out[key] = sub;
    } else if (JSON.stringify(value) !== JSON.stringify(base)) {
      out[key] = clone(value);
    }
  }
  return out;
}

/** Reads or writes a dotted path ("ATTACKS.punch.dmg") inside an object. */
export function getPath(root, path) {
  return path.split(".").reduce((obj, key) => obj?.[key], root);
}

export function setPath(root, path, value) {
  const keys = path.split(".");
  const last = keys.pop();
  const parent = keys.reduce((obj, key) => obj[key], root);
  parent[last] = value;
}

#!/usr/bin/env node
// Verifies assets/textures/manifest.json against the files on disk. Exits 1 on any problem,
// so it can gate a commit or CI run (npm run assets:audit).
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const TEXTURES = path.join(ROOT, "assets", "textures");
const manifest = JSON.parse(fs.readFileSync(path.join(TEXTURES, "manifest.json"), "utf8"));
const keys = Object.keys(manifest);
const problems = [];

/** Exact-case existence check: macOS is case-insensitive, the Vercel/Linux deploy isn't. */
function existsExactCase(relPath) {
  let dir = ROOT;
  for (const part of relPath.split("/")) {
    if (!fs.existsSync(dir) || !fs.readdirSync(dir).includes(part)) return false;
    dir = path.join(dir, part);
  }
  return true;
}

let bytes = 0;
const categories = {};
for (const [key, item] of Object.entries(manifest)) {
  const category = key.split("/")[0];
  categories[category] = (categories[category] ?? 0) + 1;

  if (!existsExactCase(item.png)) {
    problems.push(`${key}: file missing (or wrong case) — ${item.png}`);
    continue;
  }
  bytes += fs.statSync(path.join(ROOT, item.png)).size;
  if (!(item.anchorX >= 0 && item.anchorX <= 1 && item.anchorY >= 0 && item.anchorY <= 1)) {
    problems.push(`${key}: anchor outside 0–1 (${item.anchorX}, ${item.anchorY})`);
  }
  if (key.endsWith("_torso") && !item.sockets) problems.push(`${key}: no sockets (run npm run assets:slice)`);
  if (/^(pickups|weapons)\//.test(key) && !key.endsWith("pickup_shadow") && !item.content) {
    problems.push(`${key}: no content metrics (run npm run assets:measure)`);
  }
}

const listed = new Set(Object.values(manifest).map((i) => path.normalize(i.png)));
for (const dir of fs.readdirSync(TEXTURES, { withFileTypes: true }).filter((d) => d.isDirectory())) {
  for (const file of fs.readdirSync(path.join(TEXTURES, dir.name)).filter((f) => f.endsWith(".png"))) {
    const rel = path.normalize(path.join("assets", "textures", dir.name, file));
    if (!listed.has(rel)) problems.push(`${rel}: on disk but not in the manifest`);
  }
}

console.log(`${keys.length} textures, ${(bytes / 1024 / 1024).toFixed(2)} MB`);
console.log(Object.entries(categories).map(([c, n]) => `  ${c}: ${n}`).join("\n"));
if (problems.length) {
  console.error(`\n${problems.length} problem(s):\n${problems.map((p) => `  - ${p}`).join("\n")}`);
  process.exitCode = 1;
} else {
  console.log("\nall textures present, anchored and measured");
}

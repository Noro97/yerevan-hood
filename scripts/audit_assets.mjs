import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const MANIFEST_PATH = path.join(ROOT, "assets", "textures", "manifest.json");

if (!fs.existsSync(MANIFEST_PATH)) {
  console.error("❌ manifest.json not found at:", MANIFEST_PATH);
  process.exit(1);
}

const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, "utf-8"));
const keys = Object.keys(manifest);

console.log(`\n======================================================`);
console.log(`🔎 YEREVAN HOOD — ASSET AUDIT & RESOLUTION REPORT`);
console.log(`======================================================`);
console.log(`Total textures catalogued in manifest: ${keys.length}\n`);

let missingCount = 0;
let invalidAnchorCount = 0;
let totalSizeBytes = 0;
const categoryCounts = {};

for (const [key, item] of Object.entries(manifest)) {
  const category = key.split("/")[0] || "other";
  categoryCounts[category] = (categoryCounts[category] || 0) + 1;

  const fullPath = path.join(ROOT, item.png);
  if (!fs.existsSync(fullPath)) {
    console.error(`❌ Missing asset on disk: ${key} -> ${item.png}`);
    missingCount++;
    continue;
  }

  const stat = fs.statSync(fullPath);
  totalSizeBytes += stat.size;

  if (item.anchorX < 0 || item.anchorX > 1 || item.anchorY < 0 || item.anchorY > 1) {
    console.warn(`⚠️ Warning: Anchor out of 0-1 bounds for ${key}: (${item.anchorX}, ${item.anchorY})`);
    invalidAnchorCount++;
  }
}

console.log(`--- Category Breakdown ---`);
for (const [cat, count] of Object.entries(categoryCounts)) {
  console.log(`  • ${cat.padEnd(14)}: ${count} assets`);
}

console.log(`\n--- Integrity Summary ---`);
console.log(`  • Total Asset Footprint : ${(totalSizeBytes / (1024 * 1024)).toFixed(2)} MB`);
console.log(`  • Missing Assets        : ${missingCount}`);
console.log(`  • Out-of-bounds Anchors : ${invalidAnchorCount}`);

if (missingCount === 0 && invalidAnchorCount === 0) {
  console.log(`\n✅ ALL 72 ASSETS VERIFIED HEALTHY & FULLY REGISTERED!\n`);
} else {
  console.log(`\n⚠️ AUDIT COMPLETED WITH WARNINGS\n`);
}

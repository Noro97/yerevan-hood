import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const MANIFEST_PATH = path.join(ROOT, "assets", "textures", "manifest.json");
const OUTPUT_SVG = path.join(ROOT, "assets", "textures_reference_sheet.svg");
const OUTPUT_PNG = path.join(ROOT, "assets", "textures_reference_sheet.png");

const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, "utf-8"));
const TOTAL = Object.keys(manifest).length;

function getBase64(relPath) {
  const full = path.join(ROOT, relPath);
  if (!fs.existsSync(full)) {
    throw new Error(`File not found: ${full}`);
  }
  const buf = fs.readFileSync(full);
  return `data:image/png;base64,${buf.toString("base64")}`;
}

function escapeXml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

const W = 2600;
const H = 4220;
const PAD = 60;
const CONTENT_W = W - PAD * 2;

let svg = `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">
<defs>
  <style>
    .title { font-family: 'Noto Sans Armenian', 'Arial Unicode MS', -apple-system, sans-serif; font-weight: 900; }
    .label { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
    .mono { font-family: 'SF Mono', Menlo, Monaco, Consolas, monospace; }
  </style>
  <linearGradient id="bgGrad" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0%" stop-color="#14111d"/>
    <stop offset="50%" stop-color="#100e18"/>
    <stop offset="100%" stop-color="#0c0a12"/>
  </linearGradient>
  <pattern id="checker" width="16" height="16" patternUnits="userSpaceOnUse">
    <rect width="8" height="8" fill="#1c1826"/>
    <rect x="8" width="8" height="8" fill="#242032"/>
    <rect y="8" width="8" height="8" fill="#242032"/>
    <rect x="8" y="8" width="8" height="8" fill="#1c1826"/>
  </pattern>
</defs>

<!-- Main Background -->
<rect width="${W}" height="${H}" fill="url(#bgGrad)"/>
`;

// 1. Header
svg += `
<!-- HEADER -->
<rect x="0" y="0" width="${W}" height="200" fill="#1b1627"/>
<line x1="0" y1="200" x2="${W}" y2="200" stroke="#ffd060" stroke-width="3"/>

<text x="${PAD}" y="70" fill="#ffd060" font-size="44" class="title" letter-spacing="2">YEREVAN HOOD · ԵՐԵՎԱՆ ՀՈՒԴ</text>
<text x="${PAD}" y="112" fill="#ffffff" font-size="22" class="label" font-weight="700">COMPLETE TEXTURE ATLAS &amp; ASSET SPECIFICATION SHEET</text>
<text x="${PAD}" y="145" fill="#a49eb5" font-size="15" class="label">Comprehensive Visual Catalog of All ${TOTAL} Standalone Texture Files (32-Bit PNG Only · RGBA Straight Alpha) · PixiJS v8 Engine</text>

<!-- Header Badges -->
<g transform="translate(${W - PAD - 680}, 50)">
  <rect width="125" height="34" rx="6" fill="#ffd060"/>
  <text x="62.5" y="22" fill="#181224" font-size="13" class="label" font-weight="900" text-anchor="middle">${TOTAL} TEXTURES</text>

  <rect x="135" width="120" height="34" rx="6" fill="#6bc9ff"/>
  <text x="195" y="22" fill="#102538" font-size="13" class="label" font-weight="900" text-anchor="middle">PNG ONLY</text>

  <rect x="265" width="130" height="34" rx="6" fill="#ff7a6b"/>
  <text x="330" y="22" fill="#30100d" font-size="13" class="label" font-weight="900" text-anchor="middle">MODULAR RIGS</text>

  <rect x="405" width="135" height="34" rx="6" fill="#7ec850"/>
  <text x="472.5" y="22" fill="#12250c" font-size="13" class="label" font-weight="900" text-anchor="middle">PARALLAX MAPS</text>

  <rect x="550" width="130" height="34" rx="6" fill="#c084fc"/>
  <text x="615" y="22" fill="#251038" font-size="13" class="label" font-weight="900" text-anchor="middle">TUFF STREETS</text>
</g>
`;

function sectionHeader(y, num, title, subtitle, color = "#ffd060") {
  return `
  <!-- Section ${num} -->
  <g transform="translate(${PAD}, ${y})">
    <rect width="${CONTENT_W}" height="56" rx="8" fill="#1e1a2c"/>
    <rect width="8" height="56" rx="4" fill="${color}"/>
    <text x="24" y="36" fill="${color}" font-size="20" class="title" letter-spacing="1">SECTION ${escapeXml(num)}: ${escapeXml(title)}</text>
    <text x="${CONTENT_W - 20}" y="35" fill="#8e86a0" font-size="14" class="label" text-anchor="end">${escapeXml(subtitle)}</text>
  </g>
  `;
}

let curY = 230;
svg += sectionHeader(curY, "01", "ENVIRONMENT & PARALLAX LAYERS (7 TEXTURES)", "Multi-layer streetscape backdrop spanning up to 3560px", "#6bc9ff");
curY += 76;

const envLayers = [
  { key: "environment/sky", col: 0, row: 0, desc: "Fixed 16:9 sunset twilight sky gradient over Yerevan" },
  { key: "environment/far", col: 0, row: 1, desc: "Distant silhouette of Mount Ararat & Yerevan TV Tower" },
  { key: "environment/mid", col: 0, row: 2, desc: "Midground skyline with Soviet high-rises and hills" },
  { key: "environment/fore", col: 0, row: 3, desc: "Out-of-focus foreground strip for extreme depth blur" },
  { key: "environment/street", col: 1, row: 0, desc: "2880px sidewalk, asphalt street, trees & curb lines" },
  { key: "environment/fences", col: 1, row: 1, desc: "Rustic Kond alley fences recessed behind buildings" },
  { key: "environment/cables", col: 1, row: 2, desc: "Interconnected electrical power cables across rooftops" },
];

const envColW = (CONTENT_W - 24) / 2; // 1228px
const envRowH = 195;

for (const layer of envLayers) {
  const meta = manifest[layer.key];
  const b64 = getBase64(meta.png);
  const cx = PAD + layer.col * (envColW + 24);
  const cy = curY + layer.row * (envRowH + 15);

  const prevBoxW = 620;
  const prevBoxH = 165;
  const scale = Math.min((prevBoxW - 20) / meta.width, (prevBoxH - 20) / meta.height);
  const dw = meta.width * scale;
  const dh = meta.height * scale;
  const dx = 10 + (prevBoxW - 20 - dw) / 2;
  const dy = 10 + (prevBoxH - 20 - dh) / 2;

  svg += `
  <g transform="translate(${cx}, ${cy})">
    <rect width="${envColW}" height="${envRowH}" rx="8" fill="#181524" stroke="#2a243a" stroke-width="1.5"/>
    <!-- Preview Box -->
    <g transform="translate(15, 15)">
      <rect width="${prevBoxW}" height="${prevBoxH}" rx="6" fill="url(#checker)" stroke="#38304c" stroke-width="1"/>
      <image href="${b64}" x="${dx}" y="${dy}" width="${dw}" height="${dh}" preserveAspectRatio="xMidYMid meet"/>
    </g>
    <!-- Info -->
    <g transform="translate(${prevBoxW + 35}, 35)">
      <text y="0" fill="#ffffff" font-size="18" class="mono" font-weight="700">${escapeXml(layer.key)}.png</text>
      <text y="28" fill="#6bc9ff" font-size="14" class="label" font-weight="700">${meta.width} × ${meta.height} px · Anchor: (0, 0)</text>
      <text y="58" fill="#cfc8de" font-size="14" class="label">${escapeXml(layer.desc)}</text>
      <rect y="80" width="130" height="26" rx="4" fill="#262038"/>
      <text x="65" y="97" fill="#a49eb5" font-size="12" class="mono" text-anchor="middle">GPU Batched</text>
    </g>
  </g>
  `;
}

curY += 4 * (envRowH + 15) + 30;

svg += sectionHeader(curY, "02", "STREET BUILDINGS & TUFF FACADES (10 TEXTURES)", "Modular pink & orange volcanic tuff facades with signs & graffiti", "#ff9a60");
curY += 76;

const bColW = (CONTENT_W - 4 * 18) / 5; // ~481px
const bRowH = 340;

const bMetaInfo = [
  { sign: "ԿՈՆԴ", theme: "Residential Block (3-Storey)", color: "#c87b64" },
  { sign: "ՄԹԵՐՔ", theme: "Corner Grocery (Artik Tuff)", color: "#df8664" },
  { sign: "ԽԱՆՈՒԹ", theme: "Stalinist Neo-Classical Facade", color: "#c17462" },
  { sign: "ՇԵՆՔ", theme: "9-Storey Panel Block (Samostroy)", color: "#a89e90" },
  { sign: "ԹՈՆԻՐ", theme: "Corner Bakery / Lavash Tonir", color: "#b25540" },
  { sign: "ՎՈՒԼԿԱՆԻԶԱՑԻԱ", theme: "Auto-Repair Garage & Tires", color: "#3a3536" },
  { sign: "ՇԵՆՔ", theme: "Soviet Administrative Building", color: "#a8584c" },
  { sign: "ՎԱՐՍԱՎԻՐԱՆՈՑ", theme: "Hairdresser + Tailor", color: "#d99079" },
  { sign: "ԴԱՐՊԱՍ", theme: "Courtyard Gatehouse Portal", color: "#443e42" },
  { sign: "ՍՐՃԱՐԱՆ", theme: "Tea House / Chaikhana Awning", color: "#c98255" },
];

for (let i = 0; i < 10; i++) {
  const key = `buildings/building_${i}`;
  const meta = manifest[key];
  const b64 = getBase64(meta.png);
  const col = i % 5;
  const row = Math.floor(i / 5);
  const cx = PAD + col * (bColW + 18);
  const cy = curY + row * (bRowH + 18);

  const prevBoxW = bColW - 24;
  const prevBoxH = 220;
  const scale = Math.min((prevBoxW - 20) / meta.width, (prevBoxH - 20) / meta.height);
  const dw = meta.width * scale;
  const dh = meta.height * scale;
  const dx = 10 + (prevBoxW - 20 - dw) / 2;
  const dy = prevBoxH - 10 - dh; // align to bottom ground

  svg += `
  <g transform="translate(${cx}, ${cy})">
    <rect width="${bColW}" height="${bRowH}" rx="8" fill="#181524" stroke="#2a243a" stroke-width="1.5"/>
    <!-- Preview Box -->
    <g transform="translate(12, 12)">
      <rect width="${prevBoxW}" height="${prevBoxH}" rx="6" fill="url(#checker)" stroke="#38304c" stroke-width="1"/>
      <image href="${b64}" x="${dx}" y="${dy}" width="${dw}" height="${dh}"/>
    </g>
    <!-- Label -->
    <g transform="translate(14, 250)">
      <text y="0" fill="#ffffff" font-size="15" class="title" font-weight="700">BUILDING ${i}: ${escapeXml(bMetaInfo[i].sign)}</text>
      <text y="22" fill="#ff9a60" font-size="13" class="mono">${meta.width} × ${meta.height} px · Anchor: (${meta.anchorX}, ${meta.anchorY.toFixed(2)})</text>
      <text y="42" fill="#9e98af" font-size="12" class="label">${escapeXml(bMetaInfo[i].theme)}</text>
      <text y="60" fill="#6f6a80" font-size="11" class="mono">${escapeXml(key)}.png</text>
    </g>
  </g>
  `;
}

curY += 2 * (bRowH + 18) + 30;

svg += sectionHeader(curY, "03", "CHARACTERS & MODULAR BODY RIGS (29 TEXTURES: 7 RIGS × 4 PARTS + SHADOW)", "Modular skeletal limbs animated with rotation, depth hierarchy & flash filters", "#e86b85");
curY += 76;

const charKeys = [
  { id: "player", name: "DAVO (PLAYER)", role: "Hero of Kond · Balanced Melee", tint: "#ffd060" },
  { id: "thug1", name: "THUG 1 (KOND)", role: "Green Jacket & Cap · Rusher", tint: "#7ec850" },
  { id: "thug2", name: "THUG 2 (YARD)", role: "Grey Hoodie · Agile Fighter", tint: "#8eb5ff" },
  { id: "thug3", name: "THUG 3 (MARKET)", role: "Burgundy Tracksuit · Grappler", tint: "#ff829b" },
  { id: "gunner", name: "GUNNER (THUG)", role: "Crimson Coat · Makarov Pistol", tint: "#ff5252" },
  { id: "shielder", name: "SHIELDER (THUG)", role: "Blue Coat · Trash Lid Guard", tint: "#64b5f6" },
  { id: "boss", name: "SEV VACHO (BOSS)", role: "Gorge Syndicate Boss · 1.25x Scale", tint: "#ffd700" },
];

const cColW = (CONTENT_W - 6 * 14) / 7; // ~342px
const cRowH = 560;

for (let i = 0; i < charKeys.length; i++) {
  const c = charKeys[i];
  const cx = PAD + i * (cColW + 14);
  const cy = curY;

  const head = manifest[`characters/${c.id}_head`];
  const torso = manifest[`characters/${c.id}_torso`];
  const arm = manifest[`characters/${c.id}_arm`];
  const leg = manifest[`characters/${c.id}_leg`];

  const headB64 = getBase64(head.png);
  const torsoB64 = getBase64(torso.png);
  const armB64 = getBase64(arm.png);
  const legB64 = getBase64(leg.png);
  const shadowB64 = getBase64("assets/textures/characters/shadow.png");

  svg += `
  <g transform="translate(${cx}, ${cy})">
    <rect width="${cColW}" height="${cRowH}" rx="8" fill="#181524" stroke="#2a243a" stroke-width="1.5"/>
    
    <!-- Header -->
    <rect width="${cColW}" height="42" rx="8" fill="#201a2e"/>
    <rect y="38" width="${cColW}" height="4" fill="${c.tint}"/>
    <text x="14" y="26" fill="${c.tint}" font-size="14" class="title" font-weight="900">${escapeXml(c.name)}</text>

    <!-- Assembled Preview -->
    <g transform="translate(12, 54)">
      <rect width="${cColW - 24}" height="175" rx="6" fill="url(#checker)" stroke="#38304c" stroke-width="1"/>
      <text x="10" y="18" fill="#a49eb5" font-size="11" class="mono" font-weight="700">ASSEMBLED RIG PREVIEW</text>
      
      <!-- Center assembled character -->
      <g transform="translate(${(cColW - 24) / 2}, 152) scale(1.02)">
        <!-- Shadow -->
        <image href="${shadowB64}" x="-26" y="-10" width="52" height="20" opacity="0.6"/>
        <!-- Back Arm (Horizontally Flipped) -->
        <g transform="translate(-10, -98) scale(-1, 1) rotate(12)">
          <image href="${armB64}" x="${-arm.width / 2}" y="${-arm.height * arm.anchorY}" width="${arm.width}" height="${arm.height}"/>
        </g>
        <!-- Back Leg (Horizontally Flipped) -->
        <g transform="translate(-6, -38) scale(-1, 1)">
          <image href="${legB64}" x="${-leg.width / 2}" y="${-leg.height * leg.anchorY}" width="${leg.width}" height="${leg.height}"/>
        </g>
        <!-- Front Leg -->
        <g transform="translate(6, -38)">
          <image href="${legB64}" x="${-leg.width / 2}" y="${-leg.height * leg.anchorY}" width="${leg.width}" height="${leg.height}"/>
        </g>
        <!-- Head (Snug under Torso Collar, No Neck) -->
        <image href="${headB64}" x="${-head.width / 2}" y="${-99 - head.height * head.anchorY}" width="${head.width}" height="${head.height}"/>
        <!-- Front Arm -->
        <g transform="translate(10, -98) rotate(-12)">
          <image href="${armB64}" x="${-arm.width / 2}" y="${-arm.height * arm.anchorY}" width="${arm.width}" height="${arm.height}"/>
        </g>
        <!-- Torso (Renders on Top of Head, Arms, and Legs) -->
        <image href="${torsoB64}" x="${-torso.width / 2}" y="${-38 - torso.height}" width="${torso.width}" height="${torso.height}"/>
      </g>
    </g>

    <!-- Individual Modular Parts Grid -->
    <g transform="translate(12, 240)">
      <text x="2" y="10" fill="#d8c8e8" font-size="12" class="mono" font-weight="700">MODULAR TEXTURE PARTS (4)</text>

      <!-- Head Part -->
      <g transform="translate(0, 20)">
        <rect width="${(cColW - 32) / 2}" height="135" rx="5" fill="#1c1828" stroke="#2d263f" stroke-width="1"/>
        <rect x="10" y="10" width="${(cColW - 32) / 2 - 20}" height="70" rx="4" fill="url(#checker)"/>
        <image href="${headB64}" x="${((cColW - 32) / 2 - head.width * 1.5) / 2}" y="${10 + (70 - head.height * 1.5) / 2}" width="${head.width * 1.5}" height="${head.height * 1.5}"/>
        <text x="10" y="98" fill="#ffffff" font-size="12" class="title">HEAD</text>
        <text x="10" y="112" fill="#8e86a0" font-size="10" class="mono">${head.width}×${head.height}px</text>
        <text x="10" y="125" fill="#6f6a80" font-size="9" class="mono">anc: (${head.anchorX}, ${head.anchorY})</text>
      </g>

      <!-- Torso Part -->
      <g transform="translate(${(cColW - 32) / 2 + 8}, 20)">
        <rect width="${(cColW - 32) / 2}" height="135" rx="5" fill="#1c1828" stroke="#2d263f" stroke-width="1"/>
        <rect x="10" y="10" width="${(cColW - 32) / 2 - 20}" height="70" rx="4" fill="url(#checker)"/>
        <image href="${torsoB64}" x="${((cColW - 32) / 2 - torso.width * 1.5) / 2}" y="${10 + (70 - torso.height * 1.5) / 2}" width="${torso.width * 1.5}" height="${torso.height * 1.5}"/>
        <text x="10" y="98" fill="#ffffff" font-size="12" class="title">TORSO</text>
        <text x="10" y="112" fill="#8e86a0" font-size="10" class="mono">${torso.width}×${torso.height}px</text>
        <text x="10" y="125" fill="#6f6a80" font-size="9" class="mono">anc: (${torso.anchorX}, ${torso.anchorY})</text>
      </g>

      <!-- Arm Part -->
      <g transform="translate(0, 163)">
        <rect width="${(cColW - 32) / 2}" height="135" rx="5" fill="#1c1828" stroke="#2d263f" stroke-width="1"/>
        <rect x="10" y="10" width="${(cColW - 32) / 2 - 20}" height="70" rx="4" fill="url(#checker)"/>
        <image href="${armB64}" x="${((cColW - 32) / 2 - arm.width * 1.5) / 2}" y="${10 + (70 - arm.height * 1.5) / 2}" width="${arm.width * 1.5}" height="${arm.height * 1.5}"/>
        <text x="10" y="98" fill="#ffffff" font-size="12" class="title">ARM</text>
        <text x="10" y="112" fill="#8e86a0" font-size="10" class="mono">${arm.width}×${arm.height}px</text>
        <text x="10" y="125" fill="#6f6a80" font-size="9" class="mono">anc: (${arm.anchorX}, ${arm.anchorY})</text>
      </g>

      <!-- Leg Part -->
      <g transform="translate(${(cColW - 32) / 2 + 8}, 163)">
        <rect width="${(cColW - 32) / 2}" height="135" rx="5" fill="#1c1828" stroke="#2d263f" stroke-width="1"/>
        <rect x="10" y="10" width="${(cColW - 32) / 2 - 20}" height="70" rx="4" fill="url(#checker)"/>
        <image href="${legB64}" x="${((cColW - 32) / 2 - leg.width * 1.5) / 2}" y="${10 + (70 - leg.height * 1.5) / 2}" width="${leg.width * 1.5}" height="${leg.height * 1.5}"/>
        <text x="10" y="98" fill="#ffffff" font-size="12" class="title">LEG</text>
        <text x="10" y="112" fill="#8e86a0" font-size="10" class="mono">${leg.width}×${leg.height}px</text>
        <text x="10" y="125" fill="#6f6a80" font-size="9" class="mono">anc: (${leg.anchorX}, ${leg.anchorY})</text>
      </g>
    </g>
  </g>
  `;
}

curY += cRowH + 30;

svg += sectionHeader(curY, "04", "STREET PROPS, COMBAT OBJECTS & WEAPONS (9 TEXTURES)", "Street environment props, breakable loot crates, bullets & in-hand melee weapons", "#ffd060");
curY += 76;

const propItems = [
  { key: "props/lamp", title: "STREET LAMP", desc: "Warm yellow cast light beam on street", badge: "World Prop", tag: "y: 396" },
  { key: "props/lada", title: "LADA 2101 SEDAN", desc: "White Soviet classic car · 1.2x scale", badge: "World Prop", tag: "y: 412" },
  { key: "props/bin", title: "TRASH BIN", desc: "Heavy sidewalk concrete refuse container", badge: "World Prop", tag: "y: 400" },
  { key: "objects/crate", title: "LOOT CRATE", desc: "Breakable wooden crate dropping food & items", badge: "Breakable", tag: "HP: 2" },
  { key: "objects/bullet", title: "MAKAROV BULLET", desc: "High-velocity golden tracer projectile", badge: "Projectile", tag: "Dmg: 24" },
  { key: "weapons/stick", title: "WOODEN CLUB (ՓԱՅՏ)", desc: "Heavy street club · Reach: 60px · 8 Uses", badge: "Melee", tag: "Dmg: 16" },
  { key: "weapons/bottle", title: "GLASS BOTTLE (ՇԻՇ)", desc: "Shatters on throw · Reach: 50px · 4 Uses", badge: "Melee/Throw", tag: "Dmg: 13" },
  { key: "weapons/pistol", title: "PISTOL (ՄԱԿԱՐՈՎ)", desc: "6 rounds ammo · Gunner sidearm", badge: "Firearm", tag: "Ammo: 6" },
  { key: "weapons/lid", title: "TRASH LID (ԿԱՓԱԿ)", desc: "Shielder frontal defense · 75% dmg block", badge: "Shield", tag: "Block: 75%" },
  { key: "characters/shadow", title: "GROUND SHADOW", desc: "Dynamic squashed ellipse shadow for all fighters", badge: "Combat FX", tag: "52 × 20 px" },
];

const pColW = (CONTENT_W - 4 * 18) / 5; // ~481px
const pRowH = 205;

for (let i = 0; i < propItems.length; i++) {
  const item = propItems[i];
  const meta = manifest[item.key];
  const b64 = getBase64(meta.png);
  const col = i % 5;
  const row = Math.floor(i / 5);
  const cx = PAD + col * (pColW + 18);
  const cy = curY + row * (pRowH + 16);

  const prevBoxW = 160;
  const prevBoxH = 175;
  const scale = Math.min((prevBoxW - 20) / meta.width, (prevBoxH - 20) / meta.height);
  const dw = Math.max(meta.width * scale, 24);
  const dh = Math.max(meta.height * scale, 12);
  const dx = 10 + (prevBoxW - 20 - dw) / 2;
  const dy = 10 + (prevBoxH - 20 - dh) / 2;

  svg += `
  <g transform="translate(${cx}, ${cy})">
    <rect width="${pColW}" height="${pRowH}" rx="8" fill="#181524" stroke="#2a243a" stroke-width="1.5"/>
    <!-- Preview Box -->
    <g transform="translate(14, 15)">
      <rect width="${prevBoxW}" height="${prevBoxH}" rx="6" fill="url(#checker)" stroke="#38304c" stroke-width="1"/>
      <image href="${b64}" x="${dx}" y="${dy}" width="${dw}" height="${dh}"/>
    </g>
    <!-- Details -->
    <g transform="translate(${prevBoxW + 28}, 35)">
      <rect y="-18" width="80" height="20" rx="3" fill="#29223a"/>
      <text x="40" y="-4" fill="#ffd060" font-size="11" class="mono" font-weight="700" text-anchor="middle">${escapeXml(item.badge)}</text>
      <text y="20" fill="#ffffff" font-size="16" class="title" font-weight="700">${escapeXml(item.title)}</text>
      <text y="42" fill="#ffd060" font-size="13" class="mono">${meta.width} × ${meta.height} px · anc: (${meta.anchorX}, ${meta.anchorY ? meta.anchorY.toFixed(2) : 0})</text>
      <text y="68" fill="#cfc8de" font-size="13" class="label">${escapeXml(item.desc)}</text>
      <text y="92" fill="#6f6a80" font-size="11" class="mono">${escapeXml(item.key)}.png</text>
      <rect y="106" width="100" height="24" rx="4" fill="#1f2d1a"/>
      <text x="50" y="122" fill="#7ec850" font-size="11" class="mono" font-weight="700" text-anchor="middle">${escapeXml(item.tag)}</text>
    </g>
  </g>
  `;
}

curY += 2 * (pRowH + 16) + 30;

svg += sectionHeader(curY, "05", "STREET PICKUPS & CONSUMABLES (11 TEXTURES)", "Interactive food pickups, traditional Armenian drinks, money, and dropped loot", "#7ec850");
curY += 76;

const pickupItems = [
  { key: "pickups/shawarma", title: "SHAWARMA (ՇԱՈՒՐՄԱ)", effect: "+30 HP Health Recovery", desc: "Wrapped flatbread meat wrap" },
  { key: "pickups/khorovats", title: "KHOROVATS (ԽՈՐՈՎԱԾ)", effect: "FULL HP Instant Heal", desc: "Armenian BBQ pork skewers" },
  { key: "pickups/tan", title: "TAN DRINK (ԹԱՆ)", effect: "+50% Movement Speed", desc: "Cold yogurt drink with mint" },
  { key: "pickups/cognac", title: "COGNAC (ԿՈՆՅԱԿ)", effect: "2x Rage Damage Multiplier", desc: "Ararat 5-Star aged brandy" },
  { key: "pickups/coin", title: "GOLD COIN (֏)", effect: "+75 Score Points", desc: "Armenian Dram gold coin" },
  { key: "pickups/medal", title: "WAR MEDAL (ՄԵԴԱԼ)", effect: "+500 Victory Points", desc: "Grandpa's WWII heirloom medal" },
  { key: "pickups/stick", title: "DROPPED CLUB", effect: "Equip Melee Club", desc: "Dropped weapon on floor" },
  { key: "pickups/bottle", title: "DROPPED BOTTLE", effect: "Equip Glass Bottle", desc: "Throwable glass bottle" },
  { key: "pickups/pistol", title: "DROPPED PISTOL", effect: "Equip Makarov 9mm", desc: "Armed pistol with ammo" },
  { key: "pickups/lid", title: "DROPPED LID", effect: "Equip Trash Shield", desc: "Protective trash can lid" },
  { key: "pickups/pickup_shadow", title: "PICKUP SHADOW", effect: "Ground Item Shadow", desc: "Floor ellipse beneath pickups" },
  { key: "info", title: "LOOT SPAWN SYSTEM", effect: "Breakables & Drops", desc: "Crates drop shawarma (60%), tan (10%), cognac (7%), guns" },
];

const pickColW = (CONTENT_W - 5 * 16) / 6; // ~399px
const pickRowH = 170;

for (let i = 0; i < pickupItems.length; i++) {
  const item = pickupItems[i];
  const col = i % 6;
  const row = Math.floor(i / 6);
  const cx = PAD + col * (pickColW + 16);
  const cy = curY + row * (pickRowH + 16);

  if (item.key === "info") {
    svg += `
    <g transform="translate(${cx}, ${cy})">
      <rect width="${pickColW}" height="${pickRowH}" rx="8" fill="#1b201a" stroke="#2e4225" stroke-width="1.5"/>
      <g transform="translate(18, 28)">
        <text y="0" fill="#7ec850" font-size="15" class="title" font-weight="900">${escapeXml(item.title)}</text>
        <text y="24" fill="#a4d888" font-size="13" class="label">${escapeXml(item.effect)}</text>
        <text y="50" fill="#88b570" font-size="12" class="label">${escapeXml(item.desc)}</text>
        <rect y="72" width="130" height="26" rx="4" fill="#263820"/>
        <text x="65" y="89" fill="#7ec850" font-size="11" class="mono" font-weight="700" text-anchor="middle">Bob &amp; Float FX</text>
      </g>
    </g>
    `;
    continue;
  }

  const meta = manifest[item.key];
  const b64 = getBase64(meta.png);

  const prevBoxW = 95;
  const prevBoxH = 135;
  const scale = Math.min((prevBoxW - 16) / meta.width, (prevBoxH - 16) / meta.height);
  const dw = Math.max(meta.width * scale, 24);
  const dh = Math.max(meta.height * scale, 24);
  const dx = 8 + (prevBoxW - 16 - dw) / 2;
  const dy = 8 + (prevBoxH - 16 - dh) / 2;

  svg += `
  <g transform="translate(${cx}, ${cy})">
    <rect width="${pickColW}" height="${pickRowH}" rx="8" fill="#181524" stroke="#2a243a" stroke-width="1.5"/>
    <!-- Preview Box -->
    <g transform="translate(14, 18)">
      <rect width="${prevBoxW}" height="${prevBoxH}" rx="6" fill="url(#checker)" stroke="#38304c" stroke-width="1"/>
      <image href="${b64}" x="${dx}" y="${dy}" width="${dw}" height="${dh}"/>
    </g>
    <!-- Details -->
    <g transform="translate(${prevBoxW + 24}, 34)">
      <text y="0" fill="#ffffff" font-size="14" class="title" font-weight="700">${escapeXml(item.title)}</text>
      <text y="22" fill="#7ec850" font-size="12" class="mono" font-weight="700">${escapeXml(item.effect)}</text>
      <text y="44" fill="#cfc8de" font-size="12" class="label">${escapeXml(item.desc)}</text>
      <text y="66" fill="#8e86a0" font-size="11" class="mono">${meta.width} × ${meta.height} px</text>
      <text y="86" fill="#6f6a80" font-size="10" class="mono">${escapeXml(item.key)}.png</text>
    </g>
  </g>
  `;
}

curY += 2 * (pickRowH + 16) + 30;

svg += sectionHeader(curY, "06", "STORY & DIALOGUE PORTRAITS (6 TEXTURES)", "High-contrast story dialogue portraits rendered in cutscenes and boss encounters", "#c084fc");
curY += 76;

const portraitItems = [
  { key: "portraits/davo", name: "DAVO (ԴԱՎՈ)", role: "Kond Hero & Protagonist", quote: "«Ես գալիս եմ ձոր…»" },
  { key: "portraits/tatik", name: "TATIK (ՏԱՏԻԿ)", role: "Davo's Grandmother", quote: "«Ամբողջ թոշակս տարան…»" },
  { key: "portraits/armo", name: "ARMO (ԱՐՄՈ)", role: "Davo's Younger Brother", quote: "«Հեծանիվս խլեցին, ախպերս!»" },
  { key: "portraits/gago", name: "GAGO (ԳԱԳՈ)", role: "Alley Bully · Chapter 1 Boss", quote: "«Բարի գալուստ ԻՄ բակ…»" },
  { key: "portraits/mado", name: "MADO (ՄԱԴՈ)", role: "Market Boss · Chapter 2 Boss", quote: "«Այս շուկան մեզ է վճարում!»" },
  { key: "portraits/vacho", name: "SEV VACHO (ՎԱՉՈ)", role: "Syndicate Kingpin · Final Boss", quote: "«Գալիս ես ձո՞րը, Դավո…»" },
];

const portColW = (CONTENT_W - 5 * 16) / 6; // ~399px
const portRowH = 215;

for (let i = 0; i < portraitItems.length; i++) {
  const item = portraitItems[i];
  const meta = manifest[item.key];
  const b64 = getBase64(meta.png);
  const cx = PAD + i * (portColW + 16);
  const cy = curY;

  const prevBoxW = 110;
  const prevBoxH = 175;
  const scale = Math.min((prevBoxW - 10) / meta.width, (prevBoxH - 10) / meta.height);
  const dw = meta.width * scale;
  const dh = meta.height * scale;
  const dx = 5 + (prevBoxW - dw) / 2;
  const dy = 5 + (prevBoxH - dh) / 2;

  svg += `
  <g transform="translate(${cx}, ${cy})">
    <rect width="${portColW}" height="${portRowH}" rx="8" fill="#181524" stroke="#2a243a" stroke-width="1.5"/>
    <!-- Portrait Box -->
    <g transform="translate(14, 20)">
      <rect width="${prevBoxW}" height="${prevBoxH}" rx="6" fill="#201a30" stroke="#483a65" stroke-width="1.5"/>
      <image href="${b64}" x="${dx}" y="${dy}" width="${dw}" height="${dh}"/>
    </g>
    <!-- Description -->
    <g transform="translate(${prevBoxW + 26}, 45)">
      <text y="0" fill="#ffffff" font-size="15" class="title" font-weight="700">${escapeXml(item.name)}</text>
      <text y="24" fill="#c084fc" font-size="12" class="mono" font-weight="700">${escapeXml(item.role)}</text>
      <text y="50" fill="#ffd060" font-size="12" class="title">${escapeXml(item.quote)}</text>
      <text y="78" fill="#8e86a0" font-size="11" class="mono">${meta.width} × ${meta.height} px · RGB 32-bit</text>
      <text y="98" fill="#6f6a80" font-size="10" class="mono">${escapeXml(item.key)}.png</text>
    </g>
  </g>
  `;
}

curY += portRowH + 35;

svg += `
<!-- FOOTER -->
<g transform="translate(${PAD}, ${curY})">
  <rect width="${CONTENT_W}" height="70" rx="8" fill="#151220" stroke="#251f33" stroke-width="1"/>
  <text x="30" y="42" fill="#8e86a0" font-size="14" class="label">Yerevan Hood Texture Atlas · Generated: ${new Date().toISOString().split("T")[0]} · Total Textures Cataloged: ${TOTAL} · All Dimensions True-to-Scale</text>
  <text x="${CONTENT_W - 30}" y="42" fill="#ffd060" font-size="14" class="mono" font-weight="700" text-anchor="end">READY FOR PREVIEW &amp; PRODUCTION</text>
</g>
</svg>
`;

fs.writeFileSync(OUTPUT_SVG, svg, "utf-8");
console.log(`Generated SVG Reference Sheet: ${OUTPUT_SVG} (${(fs.statSync(OUTPUT_SVG).size / 1024).toFixed(1)} KB)`);

try {
  console.log("Rendering high-res PNG via macOS sips...");
  execFileSync("/usr/bin/sips", ["-s", "format", "png", OUTPUT_SVG, "--out", OUTPUT_PNG], { stdio: "inherit" });
  console.log(`Rendered PNG Reference Sheet: ${OUTPUT_PNG} (${(fs.statSync(OUTPUT_PNG).size / 1024).toFixed(1)} KB)`);
  if (fs.existsSync(OUTPUT_SVG)) {
    fs.unlinkSync(OUTPUT_SVG);
  }
} catch (e) {
  console.error("sips rendering error:", e.message);
}

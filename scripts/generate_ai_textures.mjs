import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const ASSETS_DIR = path.join(ROOT, "assets", "textures");
const MANIFEST_PATH = path.join(ASSETS_DIR, "manifest.json");

const PROMPT_SUFFIX = "orthographic side-on 2D game sprite, no perspective distortion, no camera tilt, single warm key light from the upper-left with soft cool fill, isolated on solid pure white background, chroma white isolation, no checkerboard, no ground plane, no cast shadow baked in, subject fully inside frame, no text or watermark, no border, semi-realistic painted-texture game art, consistent with a gritty late-90s Yerevan street-brawler";

export const TEXTURE_CATALOG = [
  // SECTION 01: ENVIRONMENT & PARALLAX (7)
  { key: "environment/sky", out: "environment/sky.png", w: 960, h: 540, ax: 0, ay: 0, opaque: true,
    prompt: "Photoreal twilight sky over Yerevan, deep indigo at the top grading through magenta and burnt orange to a pale gold band at the horizon, low hazy sun disc just above horizon, thin stratus cloud bands catching orange underlight, fine atmospheric dust haze, no ground, no buildings, no birds, seamless horizontal left and right edges" },
  { key: "environment/far", out: "environment/far.png", w: 1700, h: 540, ax: 0, ay: 0,
    prompt: "Far-distance silhouette layer: twin-peaked snow-capped Mount Ararat massif in cold blue-violet atmospheric haze, concrete lattice Yerevan TV Tower on ridge to right, heavy aerial perspective, low contrast, desaturated, upper 60% transparent, isolated on white background" },
  { key: "environment/mid", out: "environment/mid.png", w: 2600, h: 540, ax: 0, ay: 0,
    prompt: "Midground skyline strip: rows of weathered Soviet-era concrete panel high-rises with grimy balconies, satellite dishes and laundry lines, rolling dry hills behind, dusk rim light on roof edges, warm window squares lit at random, mid-tone violet-grey palette, moderate haze, isolated on white background" },
  { key: "environment/cables", out: "environment/cables.png", w: 2880, h: 540, ax: 0, ay: 0,
    prompt: "Overhead layer: chaotic web of sagging black electrical and telephone cables spanning rooftop to rooftop, rusted anchor brackets, leaning wooden pole with cracked transformer box, sneakers hung over wire, only upper third occupied, isolated on solid white background" },
  { key: "environment/fences", out: "environment/fences.png", w: 2880, h: 540, ax: 0, ay: 0,
    prompt: "Recessed alley layer: crooked corrugated-metal and weathered-plank fences of Kond district, rust bleed, torn political posters, spray-paint tags, leaning gate with bent latch, cracked plaster wall stubs between panels, isolated on solid pure white background" },
  { key: "environment/street", out: "environment/street.png", w: 2880, h: 540, ax: 0, ay: 0,
    prompt: "Ground layer: cracked asphalt road with patched tar seams, faded white paint line, oil stains, sunken round manhole cover, raised tuff-stone kerb and grey concrete sidewalk slabs with weed-filled joints, dusty plane trees in square soil cutouts with white painted trunks, wet-looking asphalt sheen under low sun, isolated on white background" },
  { key: "environment/fore", out: "environment/fore.png", w: 3560, h: 540, ax: 0, ay: 0,
    prompt: "Extreme foreground blur strip: heavily out-of-focus dark silhouettes of kerb edge, rubbish bag, parked car bumper and dry grass tufts, f/1.4 bokeh, dark desaturated, occupying bottom 25% of frame, rest transparent, isolated on white background" },

  // SECTION 02: STREET BUILDINGS & TUFF FACADES (10)
  { key: "buildings/building_0", out: "buildings/building_0.png", w: 290, h: 268, ax: 0, ay: 0.9254, artifact: "building_0_realistic_1789285335614.jpg",
    prompt: "Three-storey historic Kond house in warm pink-rose volcanic tuff, hand-cut irregular block coursing, arched second-floor windows with wooden frames, sagging carved wooden balcony on first floor, hairline plaster cracks, rusted downpipe, hand-painted Armenian sign reading ԿՈՆԴ over plain timber door, hollow worn stone steps, no side walls, no roof top, isolated on solid pure white background" },
  { key: "buildings/building_1", out: "buildings/building_1.png", w: 260, h: 230, ax: 0, ay: 0.9130,
    prompt: "Two-storey orange-ochre tuff corner building, ground floor shawarma kiosk with stainless steel counter, vertical rotisserie spit glowing behind glass, red-and-white striped awning, grease-darkened wall tiles, light box sign reading ՇԱՈՒՐՄԱ, two plain apartment windows above with rusty dripping AC unit, isolated on solid pure white background" },
  { key: "buildings/building_2", out: "buildings/building_2.png", w: 340, h: 306, ax: 0, ay: 0.9346,
    prompt: "Wide four-storey pale grey-pink tuff block, ground floor 24-hour corner shop with full-width glass front, stacked crates of bottles, fluorescent-lit interior, barred windows, green plastic sign ԽԱՆՈՒԹ 24/7, upper floors with aluminium-framed windows and mismatched glazed-in balconies, isolated on solid pure white background" },
  { key: "buildings/building_3", out: "buildings/building_3.png", w: 240, h: 230, ax: 0, ay: 0.9130,
    prompt: "Narrow two-storey deep orange tuff building, large weathered spray-painted football ultras mural reading ARARAT 73 across upper wall, ground floor small bakery with steamed-up window, bread trays visible, blue metal door, flour-dusted step, isolated on solid pure white background" },
  { key: "buildings/building_4", out: "buildings/building_4.png", w: 300, h: 268, ax: 0, ay: 0.9254,
    prompt: "Three-storey salmon-pink tuff building, ground floor barber shop with large mirror-lit window, chrome-and-glass door, spinning red-white-blue barber pole, faded photo poster of hairstyles, painted sign reading ՎԱՐՍԱՎԻՐԱՆՈՑ, two upper balconies with wrought-iron railings, isolated on solid pure white background" },
  { key: "buildings/building_5", out: "buildings/building_5.png", w: 270, h: 230, ax: 0, ay: 0.9130,
    prompt: "Two-storey weathered grey-beige tuff apartment block dominated by two deep open balconies crammed with drying laundry on cords, bicycle, plastic chairs, jars of preserves, peeling paint, satellite dish, cracked concrete balcony slab with exposed rebar, recessed stairwell entrance, isolated on solid pure white background" },
  { key: "buildings/building_6", out: "buildings/building_6.png", w: 320, h: 306, ax: 0, ay: 0.9346,
    prompt: "Wide four-storey soot-stained brown-orange tuff building, ground floor tyre workshop with roll-up corrugated shutter half raised, stacked worn tyres, air compressor, oil-black concrete apron, hand-lettered sign reading ՎՈՒԼԿԱՆԻԶԱՑԻԱ, upper floors plain with dusty windows, isolated on solid pure white background" },
  { key: "buildings/building_7", out: "buildings/building_7.png", w: 260, h: 268, ax: 0, ay: 0.9254,
    prompt: "Tall narrow three-storey heritage house in mottled red-brown tuff, visibly older and crooked, uneven window openings, boarded-up first-floor window, carved stone lintel, ivy creeping up edge, low arched alley passage at street level with dark interior, enamel sign plaque reading ԿՈՆԴ, isolated on solid pure white background" },
  { key: "buildings/building_8", out: "buildings/building_8.png", w: 330, h: 230, ax: 0, ay: 0.9130,
    prompt: "Wide low two-storey sandy-yellow tuff building, ground floor open produce shop with wooden crates of tomatoes, peppers and greens spilling onto pavement, hanging strings of dried fruit, stack of folded lavash under cloth, green canvas awning and sign reading ՄԹԵՐՔ, one glazed balcony above, isolated on solid pure white background" },
  { key: "buildings/building_9", out: "buildings/building_9.png", w: 320, h: 268, ax: 0, ay: 0.9254,
    prompt: "Three-storey dark plum-grey tuff building at night, ground floor karaoke lounge with blacked-out windows, purple-and-cyan neon sign reading ԿԱՐԱՈՔԵ casting colored light on wet sidewalk, padded leather door, velvet rope stand, cigarette bin, isolated on solid pure white background" },

  // SECTION 03: CHARACTERS & MODULAR RIGS (29)
  // Rig 1: Davo (Player)
  { key: "characters/player_head", out: "characters/player_head.png", w: 36, h: 36, ax: 0.5, ay: 0.90,
    prompt: "Young Armenian man head, short dark textured hair, thick eyebrows, light stubble, small scar on left cheekbone, determined expression, short neck stub reaching bottom edge, isolated on solid pure white background" },
  { key: "characters/player_torso", out: "characters/player_torso.png", w: 40, h: 70, ax: 0.5, ay: 1.00,
    prompt: "Lean young Armenian man torso in zipped navy blue tracksuit jacket with two white side stripes, worn fabric sheen, shoulders squared at top edge, cut flat at hip line, isolated on solid pure white background" },
  { key: "characters/player_arm", out: "characters/player_arm.png", w: 24, h: 44, ax: 0.5, ay: 0.14,
    prompt: "Straight hanging arm in navy blue tracksuit sleeve with white stripe, bare hand relaxed at bottom, shoulder socket at top, vertical alignment, isolated on solid pure white background" },
  { key: "characters/player_leg", out: "characters/player_leg.png", w: 28, h: 44, ax: 0.5, ay: 0.12,
    prompt: "Straight hanging leg in navy blue tracksuit trousers with white side stripe, worn white trainer sneaker at bottom, hip socket at top, vertical alignment, isolated on solid pure white background" },

  // Rig 2: Thug 1 (Kond)
  { key: "characters/thug1_head", out: "characters/thug1_head.png", w: 36, h: 36, ax: 0.5, ay: 0.90,
    prompt: "Stocky Armenian man head, military buzz cut, heavy jaw, thick black moustache, crooked broken nose, scowling grim expression, neck stub at bottom edge, isolated on solid pure white background" },
  { key: "characters/thug1_torso", out: "characters/thug1_torso.png", w: 40, h: 70, ax: 0.5, ay: 1.00,
    prompt: "Broad heavy man torso in faded olive-green army surplus jacket, flap chest pockets, frayed collar, sweat-darkened fabric, cut flat at hip line, isolated on solid pure white background" },
  { key: "characters/thug1_arm", out: "characters/thug1_arm.png", w: 24, h: 44, ax: 0.5, ay: 0.14,
    prompt: "Thick hanging arm in faded olive jacket sleeve, rolled cuff, scarred bare knuckled fist, shoulder socket at top, vertical alignment, isolated on solid pure white background" },
  { key: "characters/thug1_leg", out: "characters/thug1_leg.png", w: 28, h: 44, ax: 0.5, ay: 0.12,
    prompt: "Heavy hanging leg in dark olive cargo trousers with knee pocket, scuffed brown leather work boot, hip socket at top, vertical alignment, isolated on solid pure white background" },

  // Rig 3: Thug 2 (Yard)
  { key: "characters/thug2_head", out: "characters/thug2_head.png", w: 36, h: 36, ax: 0.5, ay: 0.90,
    prompt: "Lean Armenian man head, slicked-back dark hair, gaunt cheeks, sparse stubble beard, cigarette tucked behind ear, sneering smirk, neck stub at bottom, isolated on solid pure white background" },
  { key: "characters/thug2_torso", out: "characters/thug2_torso.png", w: 40, h: 70, ax: 0.5, ay: 1.00,
    prompt: "Slim tall man torso in washed blue denim jacket over white ribbed vest, open front, worn seams and metallic button glints, cut flat at hip line, isolated on solid pure white background" },
  { key: "characters/thug2_arm", out: "characters/thug2_arm.png", w: 24, h: 44, ax: 0.5, ay: 0.14,
    prompt: "Long thin hanging arm in washed blue denim sleeve, cheap silver metal watch on wrist, bare hand, shoulder socket at top, vertical alignment, isolated on solid pure white background" },
  { key: "characters/thug2_leg", out: "characters/thug2_leg.png", w: 28, h: 44, ax: 0.5, ay: 0.12,
    prompt: "Long hanging leg in heather grey tracksuit trousers, black-and-white retro trainer sneaker, hip socket at top, vertical alignment, isolated on solid pure white background" },

  // Rig 4: Thug 3 (Market)
  { key: "characters/thug3_head", out: "characters/thug3_head.png", w: 36, h: 36, ax: 0.5, ay: 0.90,
    prompt: "Middle-aged Armenian man head, thinning dark hair, thick drooping moustache, heavy eyelids, flushed skin, neck stub at bottom edge, isolated on solid pure white background" },
  { key: "characters/thug3_torso", out: "characters/thug3_torso.png", w: 40, h: 70, ax: 0.5, ay: 1.00,
    prompt: "Barrel-chested man torso in dark maroon buttoned shirt under stained beige canvas market apron, rolled collar, grease marks, cut flat at hip line, isolated on solid pure white background" },
  { key: "characters/thug3_arm", out: "characters/thug3_arm.png", w: 24, h: 44, ax: 0.5, ay: 0.14,
    prompt: "Thick hairy hanging arm in rolled-up maroon sleeve, bare muscular forearm, broad weathered hand, shoulder socket at top, vertical alignment, isolated on solid pure white background" },
  { key: "characters/thug3_leg", out: "characters/thug3_leg.png", w: 28, h: 44, ax: 0.5, ay: 0.12,
    prompt: "Sturdy hanging leg in dark brown baggy work trousers, flat-soled worn leather shoe, hip socket at top, vertical alignment, isolated on solid pure white background" },

  // Rig 5: Gunner (Thug)
  { key: "characters/gunner_head", out: "characters/gunner_head.png", w: 36, h: 36, ax: 0.5, ay: 0.90,
    prompt: "Wiry Armenian man head, short reddish-brown hair, sharp angular features, narrow squinting eyes, thin scar across left eyebrow, neck stub at bottom edge, isolated on solid pure white background" },
  { key: "characters/gunner_torso", out: "characters/gunner_torso.png", w: 40, h: 70, ax: 0.5, ay: 1.00,
    prompt: "Wiry man torso in deep crimson red leather bomber jacket, cracked leather grain, brown leather shoulder holster strap visible across chest, cut flat at hip line, isolated on solid pure white background" },
  { key: "characters/gunner_arm", out: "characters/gunner_arm.png", w: 24, h: 44, ax: 0.5, ay: 0.14,
    prompt: "Hanging arm in deep red leather jacket sleeve, black leather fingerless glove on hand, shoulder socket at top, vertical alignment, isolated on solid pure white background" },
  { key: "characters/gunner_leg", out: "characters/gunner_leg.png", w: 28, h: 44, ax: 0.5, ay: 0.12,
    prompt: "Hanging leg in slim black denim jeans, black leather combat ankle boot, hip socket at top, vertical alignment, isolated on solid pure white background" },

  // Rig 6: Shielder (Thug)
  { key: "characters/shielder_head", out: "characters/shielder_head.png", w: 36, h: 36, ax: 0.5, ay: 0.90,
    prompt: "Very broad Armenian man head, completely shaved bald scalp, cauliflower wrestler ear, thick bull neck stub reaching bottom edge, blank stubborn expression, isolated on solid pure white background" },
  { key: "characters/shielder_torso", out: "characters/shielder_torso.png", w: 40, h: 70, ax: 0.5, ay: 1.00,
    prompt: "Massive muscular torso in steel-blue padded quilted work jacket, reinforced shoulder panels, heavy leather belt strap across chest, cut flat at hip line, isolated on solid pure white background" },
  { key: "characters/shielder_arm", out: "characters/shielder_arm.png", w: 24, h: 44, ax: 0.5, ay: 0.14,
    prompt: "Very thick hanging arm in steel-blue padded sleeve, white athletic tape wrapped around wrist, large clenched fist, shoulder socket at top, vertical alignment, isolated on solid pure white background" },
  { key: "characters/shielder_leg", out: "characters/shielder_leg.png", w: 28, h: 44, ax: 0.5, ay: 0.12,
    prompt: "Thick heavy hanging leg in dark blue work trousers, heavy black steel-toe work boot, hip socket at top, vertical alignment, isolated on solid pure white background" },

  // Rig 7: Sev Vacho (Boss)
  { key: "characters/boss_head", out: "characters/boss_head.png", w: 36, h: 36, ax: 0.5, ay: 0.90,
    prompt: "Older Armenian crime syndicate boss head in his fifties, silver-streaked slicked-back black hair, heavy black moustache, cold deep-set ruthless eyes, gold-rimmed dark sunglasses pushed up on forehead, neck stub at bottom edge, isolated on solid pure white background" },
  { key: "characters/boss_torso", out: "characters/boss_torso.png", w: 40, h: 70, ax: 0.5, ay: 1.00,
    prompt: "Imposing crime boss torso in black leather trench coat over dark silk shirt, thick gold chain necklace on chest, polished leather highlights, cut flat at hip line, isolated on solid pure white background" },
  { key: "characters/boss_arm", out: "characters/boss_arm.png", w: 24, h: 44, ax: 0.5, ay: 0.14,
    prompt: "Heavy hanging arm in black leather coat sleeve, large gold signet ring on finger of hand, shoulder socket at top, vertical alignment, isolated on solid pure white background" },
  { key: "characters/boss_leg", out: "characters/boss_leg.png", w: 28, h: 44, ax: 0.5, ay: 0.12,
    prompt: "Hanging leg in tailored black wool trousers with sharp crease, polished black Italian dress shoe, hip socket at top, vertical alignment, isolated on solid pure white background" },
  { key: "characters/shadow", out: "characters/shadow.png", w: 52, h: 20, ax: 0.5, ay: 0.5,
    prompt: "Soft elliptical ground shadow, pure black fading smoothly to transparent at rim, densest at centre, horizontal squash ellipse, isolated on white background" },

  // SECTION 04: PROPS, OBJECTS & WEAPONS (9) [ALL 9 ALREADY PROCESSED]
  { key: "props/lamp", out: "props/lamp.png", w: 80, h: 190, ax: 0.375, ay: 0.92, artifact: "prop_lamp_real_1789285675014.jpg", done: true },
  { key: "props/lada", out: "props/lada.png", w: 140, h: 70, ax: 0.5, ay: 0.79, artifact: "lada_white_bg_1789285423189.jpg", done: true },
  { key: "props/bin", out: "props/bin.png", w: 40, h: 45, ax: 0.5, ay: 0.84, artifact: "prop_bin_real_1789285693347.jpg", done: true },
  { key: "objects/crate", out: "objects/crate.png", w: 50, h: 48, ax: 0.5, ay: 0.79, artifact: "object_crate_real_1789285712349.jpg", done: true },
  { key: "objects/bullet", out: "objects/bullet.png", w: 20, h: 10, ax: 0.5, ay: 0.5, artifact: "object_bullet_real_1789285732759.jpg", done: true },
  { key: "weapons/stick", out: "weapons/stick.png", w: 32, h: 70, ax: 0.5, ay: 0.14, artifact: "weapon_stick_real_1789285754770.jpg", done: true },
  { key: "weapons/bottle", out: "weapons/bottle.png", w: 32, h: 70, ax: 0.5, ay: 0.14, artifact: "weapon_bottle_real_1789285776820.jpg", done: true },
  { key: "weapons/pistol", out: "weapons/pistol.png", w: 32, h: 70, ax: 0.5, ay: 0.14, artifact: "weapon_pistol_real_1789285798156.jpg", done: true },
  { key: "weapons/lid", out: "weapons/lid.png", w: 32, h: 70, ax: 0.5, ay: 0.14, artifact: "weapon_lid_real_1789285824858.jpg", done: true },

  // SECTION 05: STREET PICKUPS & CONSUMABLES (11)
  { key: "pickups/shawarma", out: "pickups/shawarma.png", w: 64, h: 50, ax: 0.5, ay: 0.5, artifact: "pickup_shawarma_real_1789285587640.jpg", done: true },
  { key: "pickups/khorovats", out: "pickups/khorovats.png", w: 64, h: 50, ax: 0.5, ay: 0.5,
    prompt: "Two Armenian khorovats pork skewers, charred and glistening succulent chunks of pork alternating with blistered green peppers and onion slices, metallic skewers, char marks and rendered fat highlights, slight 3/4 tilt, isolated on solid pure white background" },
  { key: "pickups/tan", out: "pickups/tan.png", w: 64, h: 50, ax: 0.5, ay: 0.5,
    prompt: "Tall glass of Armenian tan salty yogurt drink, cold opaque white liquid, condensation beads on glass, sprig of fresh mint and crushed ice on top, slight 3/4 tilt, isolated on solid pure white background" },
  { key: "pickups/cognac", out: "pickups/cognac.png", w: 64, h: 50, ax: 0.5, ay: 0.5,
    prompt: "Squat bottle of Armenian Ararat 5-star brandy cognac, deep rich amber liquid catching light, embossed dark glass, gold foil neck, cream paper label with gold border, slight 3/4 tilt, isolated on solid pure white background" },
  { key: "pickups/coin", out: "pickups/coin.png", w: 64, h: 50, ax: 0.5, ay: 0.5,
    prompt: "Polished gold Armenian dram coin, milled circular edge, worn relief emblem on face, warm specular highlight sweeping across surface, slight 3/4 tilt, isolated on solid pure white background" },
  { key: "pickups/medal", out: "pickups/medal.png", w: 64, h: 50, ax: 0.5, ay: 0.5,
    prompt: "WWII Soviet heirloom military medal, tarnished brass star with red enamel centre, faded red-and-black striped St George ribbon, pin backing, aged metallic patina, slight 3/4 tilt, isolated on solid pure white background" },
  { key: "pickups/stick", out: "pickups/stick.png", w: 64, h: 50, ax: 0.5, ay: 0.5,
    prompt: "Wooden street club lying flat on ground at slight diagonal, black electrical tape wrapped handle, dents and dark stains on oak wood, isolated on solid pure white background" },
  { key: "pickups/bottle", out: "pickups/bottle.png", w: 64, h: 50, ax: 0.5, ay: 0.5,
    prompt: "Empty green glass beer bottle lying on side at slight diagonal, light refracting through glass, half-peeled label, intact glass, isolated on solid pure white background" },
  { key: "pickups/pistol", out: "pickups/pistol.png", w: 64, h: 50, ax: 0.5, ay: 0.5,
    prompt: "Soviet Makarov PM pistol lying flat at slight diagonal, blued steel slide, brown checkered bakelite grip, spare metal magazine beside it, isolated on solid pure white background" },
  { key: "pickups/lid", out: "pickups/lid.png", w: 64, h: 50, ax: 0.5, ay: 0.5,
    prompt: "Galvanised steel circular dustbin lid lying face-up on ground, concentric ridges catching light, dented metallic rim, central handle, isolated on solid pure white background" },
  { key: "pickups/pickup_shadow", out: "pickups/pickup_shadow.png", w: 32, h: 16, ax: 0.5, ay: 0.5,
    prompt: "Soft elliptical ground contact shadow for small item, pure black fading smoothly to transparent at rim, isolated on white background" },

  // SECTION 06: STORY & DIALOGUE PORTRAITS (6)
  { key: "portraits/davo", out: "portraits/davo.png", w: 72, h: 72, ax: 0.5, ay: 0.5, artifact: "portrait_davo_real_1789285554909.jpg", opaque: true, done: true },
  { key: "portraits/tatik", out: "portraits/tatik.png", w: 72, h: 72, ax: 0.5, ay: 0.5, opaque: true,
    prompt: "Square 1:1 bust portrait of Tatik, elderly Armenian grandmother in late seventies, deeply lined kind weathered face, dark burgundy headscarf tied under chin, silver hair at temples, warm knowing dark eyes, black mourning dress collar, soft warm lamp light from left, dark atmospheric background, cinematic cutscene framing" },
  { key: "portraits/armo", out: "portraits/armo.png", w: 72, h: 72, ax: 0.5, ay: 0.5, opaque: true,
    prompt: "Square 1:1 bust portrait of Armo, Armenian teenage boy around 16, wiry build, messy dark hair, wide anxious dark eyes, no facial hair, cheap grey hooded sweatshirt, slight family resemblance to Davo, side key lighting, dark atmospheric background, cinematic cutscene framing" },
  { key: "portraits/gago", out: "portraits/gago.png", w: 72, h: 72, ax: 0.5, ay: 0.5, opaque: true,
    prompt: "Square 1:1 bust portrait of Gago, stocky Armenian street bully in late twenties, buzz cut, thick black moustache, crooked broken nose, heavy jaw, dark olive army jacket collar, aggressive forward stare, harsh top-left light with deep eye shadows, dark grim background, cinematic cutscene framing" },
  { key: "portraits/mado", out: "portraits/mado.png", w: 72, h: 72, ax: 0.5, ay: 0.5, opaque: true,
    prompt: "Square 1:1 bust portrait of Mado, middle-aged Armenian market boss in forties, thinning dark hair, heavy moustache, flushed jowls, gold chain at open collar of dark maroon shirt, canvas apron strap, smug half-smile, warm sodium key light, dark market background, cinematic cutscene framing" },
  { key: "portraits/vacho", out: "portraits/vacho.png", w: 72, h: 72, ax: 0.5, ay: 0.5, opaque: true,
    prompt: "Square 1:1 bust portrait of Sev Vacho, older Armenian crime syndicate kingpin in fifties, silver-streaked slicked-back black hair, heavy black moustache, cold deep-set ruthless eyes, black leather coat collar, thick gold chain, lit from below-left with cold hard key light and deep black shadows for menace, dark moody background, cinematic cutscene framing" },
];

export function processAsset(sourceJpgPath, targetPngPath, width, height, isOpaque = false) {
  const fullOut = path.resolve(ROOT, targetPngPath);
  fs.mkdirSync(path.dirname(fullOut), { recursive: true });

  let vf;
  if (isOpaque) {
    vf = `scale=${width}:${height}:flags=lanczos`;
  } else {
    vf = `colorkey=0xffffff:0.06:0.04,scale=${width}:${height}:flags=lanczos`;
  }

  const cmd = `/opt/homebrew/bin/ffmpeg -i "${sourceJpgPath}" -vf "${vf}" -frames:v 1 -update 1 -y "${fullOut}"`;
  execSync(cmd, { stdio: "ignore" });
  return fullOut;
}

console.log(`[TextureCatalog] Loaded ${TEXTURE_CATALOG.length} texture specifications.`);

export const W = 960;
export const H = 540;
export const WORLD_W = 2880;

export const FLOOR_TOP = 398;
export const FLOOR_BOTTOM = 524;
export const FINAL_WAVE = 9;
export const BASE_SPEED = 2.7;

export const ARM_FONT = '"Noto Sans Armenian", "Arial Unicode MS", Arial, sans-serif';

export const GRAVITY = 0.5;
export const JUMP_VEL = 8;

export const ATTACKS = {
  punch: { dur: 18, from: 5, to: 11, range: 62, dmg: 9, kb: 4, lunge: 2.2 },
  kick: { dur: 26, from: 9, to: 16, range: 80, dmg: 14, kb: 8, lunge: 1.4 },
};

export const AIR_KICK = { range: 68, dmg: 17, kb: 9 };

export const PALETTES = {
  player: { jacket: 0x1f2126, stripe: 0xffffff, pants: 0x1f2126, skin: 0xd9a06b, cap: 0x2a2d33, shoe: 0xf2f2f2, beard: 0x32241a },
  thug1: { jacket: 0x4a5d23, stripe: 0x2e3a16, pants: 0x3b3f45, skin: 0xc89465, cap: 0x33401a, shoe: 0x222222, beard: 0x2a1d12 },
  thug2: { jacket: 0x555c66, stripe: 0x40454d, pants: 0x2c3e57, skin: 0xe0ab76, cap: 0x444a52, shoe: 0x333333, beard: null },
  thug3: { jacket: 0x6e3b4e, stripe: 0x542c3b, pants: 0x2b2b30, skin: 0xcf9a68, cap: 0x542c3b, shoe: 0x1d1d1d, beard: 0x241810 },
  gunner: { jacket: 0x8a3a3a, stripe: 0x5e2727, pants: 0x2b2b30, skin: 0xd2a070, cap: 0x5e2727, shoe: 0x222222, beard: null },
  boss: { jacket: 0x14161a, stripe: 0xd4af37, pants: 0x14161a, skin: 0xc89465, cap: 0x0e0f12, shoe: 0xffffff, beard: 0x1c130c, chain: true },
};

export const WEAPONS = {
  stick: { melee: true, range: 90, dmg: 16, kb: 6, uses: 8, throwDmg: 16, label: "ՓԱՅՏ" },
  bottle: { melee: true, range: 72, dmg: 13, kb: 5, uses: 4, throwDmg: 20, shatter: true, label: "ՇԻՇ" },
  pistol: { melee: false, ammo: 6, dmg: 24, throwDmg: 10, label: "ՄԱԿԱՐՈՎ" },
};

export const FACES = {
  davo: { skin: 0xd9a06b, cap: 0x2a2d33, beard: 0x32241a },
  tatik: { skin: 0xe0b58a, scarf: 0x9c3b4e },
  armo: { skin: 0xd9a06b, kid: true },
  gago: { skin: 0xc89465, cap: 0x33401a, beard: 0x2a1d12 },
  mado: { skin: 0xcf9a68, cap: 0x542c3b, beard: 0x241810 },
  vacho: { skin: 0xc89465, cap: 0x0e0f12, beard: 0x1c130c, chain: true },
};

export const TUFF = [0xc97f6a, 0xd9967f, 0xb96b58, 0xe0a98f, 0xcb8a72];

const D = (name, face, text) => ({ name, face, text });

export const STORY = {
  intro: [
    D("ՏԱՏԻԿ", "tatik", "Davo jan! Sev Vacho's crew came from across the gorge… They took grandpa's war medal. And my whole pension!"),
    D("ԱՐՄՈ", "armo", "And my bike, axper! Gago grabbed it and laughed in my face!"),
    D("ԴԱՎՈ", "davo", "Ara, calm down. Both of you. Eat something. I'm going out for a little… conversation."),
    D("ՏԱՏԻԿ", "tatik", "Be careful, balés. The whole hood is crawling with them!"),
  ],
  pre3: [
    D("ԳԱԳՈ", "gago", "Oooo, Davo himself! Welcome to MY yard now. Nice evening for a beating, che?"),
    D("ԴԱՎՈ", "davo", "The bike, Gago. Hand it over and you can still walk home."),
    D("ԳԱԳՈ", "gago", "Khelok ches, ara… GET HIM!"),
  ],
  post3: [
    D("ԴԱՎՈ", "davo", "The bike goes home to Armo. Now the market — Mado is sitting on Tatik's pension."),
  ],
  pre6: [
    D("ՄԱԴՈ", "mado", "Stop right there, hero. This market pays US now. Every dram. Even the lavash."),
    D("ԴԱՎՈ", "davo", "Tatik's pension, Mado. All of it. I'm not asking twice."),
    D("ՄԱԴՈ", "mado", "Then come and count it yourself."),
  ],
  post6: [
    D("ԴԱՎՈ", "davo", "Pension's safe. One thing left — grandpa's medal. Vacho… I'm coming to the gorge."),
  ],
  pre9: [
    D("ՍԵՎ ՎԱՉՈ", "vacho", "The famous Davo. You broke my whole crew, axper. For what — an old man's medal?"),
    D("ԴԱՎՈ", "davo", "That medal is worth more than your entire 'empire', Vacho."),
    D("ՍԵՎ ՎԱՉՈ", "vacho", "Kond is MINE now."),
    D("ԴԱՎՈ", "davo", "Kond belongs to nobody. Kond IS Kond."),
  ],
  ending: [
    D("ՏԱՏԻԿ", "tatik", "The medal… Davo jan, you brought it home. Grandpa would be proud of you."),
    D("ԱՐՄՈ", "armo", "AXPER! You're a legend! The whole hood is talking about it!"),
    D("ԴԱՎՈ", "davo", "Fire up the khorovats. Tonight the whole hood eats together."),
  ],
};

export const CHAPTERS = {
  1: "ԲԱԿԸ · THE YARD",
  2: "ՇՈՒԿԱՆ · THE MARKET",
  3: "ՁՈՐԸ · THE GORGE",
};

export const chapterOf = (wave) => (wave <= 3 ? 1 : wave <= 6 ? 2 : 3);

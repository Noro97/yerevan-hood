// Combat tuning: the single source of truth for hit, damage, projectile and loot numbers.
// Units: pixels at character scale 1 (multiplied by the fighter's scaleF where noted), frames at 60 fps.

export const ATTACKS = {
  punch: { dur: 18, from: 5, to: 11, range: 46, dmg: 9, kb: 4, lunge: 1.8 },
  kick: { dur: 26, from: 9, to: 16, range: 54, dmg: 14, kb: 8, lunge: 1.2 },
  // 3rd hit of the J-J-J chain: slower, harder, sends them flying
  hook: { dur: 22, from: 6, to: 13, range: 50, dmg: 15, kb: 9, lunge: 2.4 },
};

export const AIR_KICK = { range: 52, dmg: 17, kb: 9 };

export const WEAPONS = {
  stick: { melee: true, range: 60, dmg: 16, kb: 6, uses: 8, throwDmg: 16, label: "ՓԱՅՏ" },
  bottle: { melee: true, range: 50, dmg: 13, kb: 5, uses: 4, throwDmg: 20, shatter: true, label: "ՇԻՇ" },
  pistol: { melee: false, ammo: 6, dmg: 24, throwDmg: 10, label: "ՄԱԿԱՐՈՎ" },
  lid: { melee: true, range: 45, dmg: 8, kb: 4, uses: 6, throwDmg: 14, shield: true, label: "ԿԱՓԱԿ" },
};

// Max |Δy| between attacker and target lanes (× the smaller scaleF for melee).
export const COMBAT_DEPTH_BAND = 28;
export const PROJECTILE_DEPTH_BAND = 22;

export const HIT = {
  stickExtraLane: 6,
  groundTargetMaxZ: 18, // × target scaleF: ground attacks pass under targets higher than this
  jumpAttackMinZ: 6, // attacker z above this is a jumping attack
  jumpAttackZTolerance: 22, // × attacker scaleF
  airKickBelow: 8, // × attacker scaleF
  airKickAbove: 65, // × target scaleF
  reachBehind: 0.5, // × target hurtbox radius
  reachAhead: 0.8, // × target hurtbox radius
  blockDamageMul: 0.25,
  blockKnockback: 2,
  hitstopPunch: 2.5,
  hitstopHeavy: 4,
  hitstopBlocked: 3,
  crateMaxZ: 24, // × attacker scaleF
  crateReachBehind: 8, // × attacker scaleF
  crateReachAhead: 16, // × attacker scaleF
};

export const KNOCKDOWN = {
  playerKick: 0.35,
  playerHook: 0.6,
  playerStick: 0.5,
  bossHit: 0.5,
  enemyKick: 0.18,
  bossResist: 0.6,
};

export const COMBO_WINDOW = 110;

export const SCORE = {
  punch: 10,
  kick: 15,
  ranged: 20,
  kill: 100,
  killPerWave: 20,
  bossKill: 300,
};

export const SUPER = {
  max: 100,
  gainPunch: 5,
  gainHeavy: 7,
  gainRanged: 6,
  damage: 38,
  radius: 160, // × player scaleF
  depth: 42, // × player scaleF
  maxTargetZ: 40, // × target scaleF
  knockback: 11,
  spin: 20,
  invul: 26,
  shake: 16,
  hitstop: 5,
};

export const BULLET = {
  speed: 9.5,
  playerDamage: 24,
  enemyDamage: 9,
  muzzleX: 26,
  muzzleHeight: 52, // × owner scaleF
  knockback: 5,
  blockedDamage: 2,
  blockedKnockback: 2,
  maxTargetZ: 20, // × target scaleF: jumped over
  sweepPad: 12,
  cratePad: 14,
};

export const THROW = {
  speed: 8,
  life: 46,
  startX: 24,
  height: 50, // × thrower scaleF
  knockback: 7,
  fallbackDamage: 14,
  maxTargetZ: 22, // × target scaleF
  sweepPad: 16,
  cratePad: 18,
};

// Cumulative thresholds: the first entry whose limit is above the roll wins.
export const LOOT_TABLE = [
  [0.28, "shawarma"],
  [0.46, "coin"],
  [0.6, "stick"],
  [0.7, "bottle"],
  [0.8, "tan"],
  [0.88, "khorovats"],
  [0.95, "cognac"],
  [1, "pistol"],
];

export const DROPS = {
  base: 0.28,
  perWave: 0.02,
  max: 0.45,
  gunnerAmmoMin: 3,
  gunnerAmmoRange: 4,
  medalWave: 9,
};

export const PICKUP_EFFECTS = {
  shawarmaHeal: 30,
  speedBuff: 600,
  rageBuff: 480,
  coinScore: 75,
  medalScore: 500,
};

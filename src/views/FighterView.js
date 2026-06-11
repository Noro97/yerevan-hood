import { Container, Graphics, Text } from "pixi.js";
import { ARM_FONT, PALETTES } from "../core/Constants.js";

const OUTLINE = { width: 1.5, color: 0x140e16, alpha: 0.45 };

function limbArm(palette) {
  const c = new Container();
  const g = new Graphics();
  g.roundRect(-5, 0, 10, 28, 5).fill(palette.jacket).stroke(OUTLINE);
  g.rect(-5, 6, 10, 3).fill(palette.stripe);
  g.circle(0, 30, 5.5).fill(palette.skin).stroke(OUTLINE);
  c.addChild(g);
  c.gfx = [g];
  return c;
}

function limbLeg(palette) {
  const c = new Container();
  const g = new Graphics();
  g.roundRect(-5.5, 0, 11, 26, 5).fill(palette.pants).stroke(OUTLINE);
  g.roundRect(-5, 23, 17, 9, 4).fill(palette.shoe).stroke(OUTLINE);
  c.addChild(g);
  c.gfx = [g];
  return c;
}

function buildHead(palette) {
  const c = new Container();
  const g = new Graphics();
  g.rect(-4, -4, 8, 6).fill(palette.skin);
  g.circle(0, -12, 11).fill(palette.skin).stroke(OUTLINE);
  if (palette.beard) g.ellipse(2, -6, 8, 6).fill(palette.beard);
  g.roundRect(-12, -25, 24, 9, 4).fill(palette.cap).stroke(OUTLINE);
  g.roundRect(4, -19, 11, 3.5, 2).fill(palette.cap);
  g.circle(5.5, -13, 1.7).fill(0x1c1c1c);
  g.rect(2.5, -17, 7, 1.8).fill(0x2a2118);
  c.addChild(g);
  c.gfx = [g];
  return c;
}

function buildTorso(palette) {
  const g = new Graphics();
  g.roundRect(-13, -58, 26, 33, 8).fill(palette.jacket).stroke(OUTLINE);
  g.roundRect(-13, -58, 7, 33, 8).fill({ color: 0x000000, alpha: 0.12 });
  g.rect(-13, -50, 26, 3).fill(palette.stripe);
  g.rect(-13, -44, 26, 2).fill(palette.stripe);
  if (palette.chain) {
    g.moveTo(-8, -54).quadraticCurveTo(0, -44, 8, -54).stroke({ width: 2.5, color: 0xd4af37 });
  }
  return g;
}

export class FighterView extends Container {
  constructor(paletteKey, isPlayer = false, scale = 1, name = "") {
    super();
    this.palette = PALETTES[paletteKey] || PALETTES.thug1;
    this.isPlayer = isPlayer;
    this.scaleF = scale;
    this.currentWeaponKind = null;

    // Shadow
    this.shadow = new Graphics();
    this.shadow.ellipse(0, 0, 22, 7).fill({ color: 0x000000, alpha: 0.35 });
    this.addChild(this.shadow);

    // Body node (rotates and scales for facing)
    this.body = new Container();
    this.body.scale.set(scale);
    this.addChild(this.body);

    // Visual nodes
    this.backArm = limbArm(this.palette);
    this.backArm.position.set(-7, -54);
    
    this.backLeg = limbLeg(this.palette);
    this.backLeg.position.set(-5, -28);
    
    this.torso = buildTorso(this.palette);
    
    this.frontLeg = limbLeg(this.palette);
    this.frontLeg.position.set(5, -28);
    
    this.head = buildHead(this.palette);
    this.head.position.set(0, -58);
    
    this.frontArm = limbArm(this.palette);
    this.frontArm.position.set(7, -54);

    // Weapon slot
    this.weaponG = new Graphics();
    this.frontArm.addChild(this.weaponG);

    this.body.addChild(
      this.backArm,
      this.backLeg,
      this.torso,
      this.frontLeg,
      this.head,
      this.frontArm
    );

    this.tintables = [
      ...this.backArm.gfx,
      ...this.backLeg.gfx,
      this.torso,
      ...this.frontLeg.gfx,
      ...this.head.gfx,
      ...this.frontArm.gfx,
    ];

    // Enemy HUD (health bar and name tag)
    this.hpBar = null;
    if (!isPlayer) {
      this.hpBar = new Container();
      const bg = new Graphics();
      bg.roundRect(-19, 0, 38, 5, 2).fill({ color: 0x000000, alpha: 0.55 });
      this.hpFg = new Graphics();
      this.hpBar.addChild(bg, this.hpFg);
      this.hpBar.y = -96 * scale;
      this.hpBar.visible = false;
      this.addChild(this.hpBar);

      if (name) {
        const tag = new Text({
          text: name,
          style: {
            fontFamily: ARM_FONT,
            fontSize: 13,
            fill: 0xff6a5e,
            fontWeight: "900",
            stroke: { color: 0x120d1d, width: 2 },
            letterSpacing: 1,
          },
        });
        tag.anchor.set(0.5, 1);
        tag.y = -104 * scale;
        this.addChild(tag);
      }
    }
  }

  drawWeapon(weapon) {
    const g = this.weaponG;
    g.clear();
    if (!weapon) return;
    
    if (weapon.kind === "stick") {
      g.roundRect(-3, 24, 6, 38, 3).fill(0x8a5a2e).stroke(OUTLINE);
      g.roundRect(-3, 24, 6, 10, 3).fill(0x6e4520);
    } else if (weapon.kind === "bottle") {
      g.roundRect(-3.5, 26, 7, 17, 3).fill(0x2e7d4f).stroke(OUTLINE);
      g.rect(-1.5, 43, 3, 8).fill(0x2e7d4f);
      g.rect(-2, 49, 4, 3).fill(0xd4af37);
    } else if (weapon.kind === "pistol") {
      g.roundRect(-2.5, 24, 5, 10, 2).fill(0x3a3a42).stroke(OUTLINE);
      g.roundRect(-2.5, 32, 16, 5, 2).fill(0x2a2a30).stroke(OUTLINE);
    }
  }

  redrawEnemyHp(hp, maxHp) {
    if (!this.hpFg) return;
    const r = Math.max(hp, 0) / maxHp;
    this.hpFg.clear();
    if (r > 0) {
      this.hpFg.roundRect(-18, 1, 36 * r, 3, 1.5).fill(r > 0.5 ? 0x7ec850 : 0xe65040);
    }
  }

  updateView(dt, model) {
    // Sync transforms
    this.x = model.x;
    this.y = model.y;
    this.zIndex = model.y;

    // Facing direction and scale
    this.body.scale.x = model.facing * this.scaleF;
    this.body.scale.y = this.scaleF;

    // Height offset
    this.body.y = -model.z;

    // Shadow scaling
    const sh = Math.max(0.45, 1 - model.z / 140);
    this.shadow.scale.set(sh);
    this.shadow.alpha = 0.35 * sh + 0.1;

    // Flashing when hurt
    const baseTint = model.isPlayer 
      ? (model.power > 1 ? 0xffc36b : (model.speed > 2.7 ? 0xc8e8ff : 0xffffff)) 
      : 0xffffff;
    const tint = model.flash > 0 ? 0xff5b5b : baseTint;
    for (const g of this.tintables) {
      g.tint = tint;
    }

    // Mercy-frame blink
    this.body.alpha = model.invul > 0 && Math.floor(model.t / 3) % 2 === 0 ? 0.5 : 1;

    // Sync weapon
    const weaponKind = model.weapon ? model.weapon.kind : null;
    if (this.currentWeaponKind !== weaponKind) {
      this.currentWeaponKind = weaponKind;
      this.drawWeapon(model.weapon);
    }

    // Sync enemy health bar (bosses use the big HUD bar instead)
    if (this.hpBar) {
      const showBar = !model.boss && model.vulnerable && model.hp < model.maxHp;
      this.hpBar.visible = showBar;
      if (showBar) {
        this.redrawEnemyHp(model.hp, model.maxHp);
      }
    }

    // Limbs and body animations
    const FA = this.frontArm;
    const BA = this.backArm;
    const FL = this.frontLeg;
    const BL = this.backLeg;
    const restArm = 0.18;
    const swing = Math.sin(model.t * 0.25);

    switch (model.state) {
      case "idle":
      case "walk": {
        const moving = model.vx !== 0 || model.vy !== 0;
        if (model.z > 0) {
          // Jump animations
          if (model.airKick) {
            FL.rotation = -1.5;
            BL.rotation = 0.5;
            FA.rotation = restArm + 0.8;
            BA.rotation = restArm - 1;
            this.body.rotation = 0.3;
          } else {
            FL.rotation = 0.55;
            BL.rotation = -0.35;
            FA.rotation = restArm - 0.5;
            BA.rotation = restArm + 0.5;
            this.body.rotation = 0;
          }
          this.body.y = -model.z;
        } else if (moving) {
          // Walk animations
          FL.rotation = swing * 0.55;
          BL.rotation = -swing * 0.55;
          FA.rotation = restArm - swing * 0.45;
          BA.rotation = restArm + swing * 0.45;
          this.body.y = Math.abs(Math.cos(model.t * 0.25)) * -2.5;
          this.body.rotation = 0;
        } else {
          // Breathe idle animations
          const breathe = Math.sin(model.t * 0.07);
          FL.rotation = 0;
          BL.rotation = 0;
          FA.rotation = restArm + breathe * 0.05;
          BA.rotation = restArm - breathe * 0.05;
          this.body.y = breathe * 1.2;
          this.body.rotation = 0;
        }
        break;
      }
      case "attack": {
        const a = model.attackKind ? { dur: 18 } : { dur: 26 }; // Fallback punch/kick
        const dur = model.attackKind && model.attackKind === "kick" ? 26 : 18;
        const p = Math.min(model.attackTimer / dur, 1);
        let ext;
        if (p < 0.35) ext = p / 0.35;
        else if (p < 0.6) ext = 1;
        else ext = 1 - (p - 0.6) / 0.4;
        ext = Math.max(0, Math.min(1, ext));

        if (model.attackKind === "punch") {
          FA.rotation = restArm + (-1.75 - restArm) * ext;
          BA.rotation = restArm + 0.5 * ext;
          FL.rotation = 0.25 * ext;
          BL.rotation = -0.2 * ext;
          this.body.rotation = -0.06 * ext;
          this.body.y = -model.z;
        } else {
          // Kick
          FL.rotation = (-1.6) * ext;
          BL.rotation = 0.3 * ext;
          FA.rotation = restArm + 0.7 * ext;
          BA.rotation = restArm - 0.9 * ext;
          this.body.rotation = 0.18 * ext;
          this.body.y = -model.z - 2 * ext;
        }
        break;
      }
      case "hurt": {
        this.body.rotation = 0.22;
        FA.rotation = restArm + 0.6;
        BA.rotation = restArm - 0.4;
        FL.rotation = 0.1;
        BL.rotation = -0.1;
        break;
      }
      case "down": {
        const airborne = model.z > 0;
        const fall = airborne ? Math.min(1, model.downTimer / 10) : 1;
        this.body.rotation = 1.45 * fall;
        this.body.y = -model.z + (airborne ? 0 : 9);
        FA.rotation = 0.5;
        BA.rotation = -0.4;
        FL.rotation = 0.2;
        BL.rotation = -0.15;
        break;
      }
      case "rise": {
        const p = Math.min(1, model.riseTimer / 18);
        this.body.rotation = 1.45 * (1 - p);
        this.body.y = -model.z + 9 * (1 - p);
        FA.rotation = restArm;
        BA.rotation = restArm;
        FL.rotation = 0;
        BL.rotation = 0;
        break;
      }
      case "dead": {
        const fall = Math.min(model.deadTimer / 14, 1);
        this.body.rotation = 1.5 * fall;
        this.body.y = -model.z + (model.z > 0 ? 0 : 10 * fall);
        FA.rotation = 0.4;
        BA.rotation = -0.3;
        FL.rotation = 0.15;
        BL.rotation = -0.15;
        if (model.deadTimer > 45) {
          this.alpha = Math.max(0, 1 - (model.deadTimer - 45) / 35);
        }
        break;
      }
    }
  }
}

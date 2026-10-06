import { Container, Graphics, Sprite, Text } from "pixi.js";
import { ARM_FONT, PALETTES, CHAR_SCALE } from "../core/Constants.js";
import { ATTACKS, RECOIL, WEAPONS, HIT } from "../data/combat.js";
import { ITEMS, handLength } from "../data/items.js";
import { textureManager } from "../core/TextureManager.js";

const NECK_TUCK = 6;
const FOOT_SINK = 1;
const HAND_INSET = 6;
const LIE_HEIGHT = 12;
const FALL_ANGLE = 1.45;
// At full extension a punch is thrown toward the camera; shortening the arm keeps the fist's
// visible reach in line with the hit reach of ATTACKS.punch.
const PUNCH_FORESHORTEN = 0.3;
const PUNCH_ARM_ROTATION = -1.65;
// Hurtbox radius × reach-ahead of a scale-1 target: part of every melee hit reach.
const NOMINAL_TARGET_REACH = 16 * CHAR_SCALE * HIT.reachAhead;

function createSprite(tex) {
  return textureManager.createSprite(tex);
}

export class FighterView extends Container {
  constructor(paletteKey, isPlayer = false, scale = 1, name = "") {
    super();
    this.paletteKey = paletteKey;
    this.palette = PALETTES[paletteKey] || PALETTES.thug1;
    this.isPlayer = isPlayer;
    this.baseScale = scale;
    this.scaleF = scale * CHAR_SCALE;
    this.currentWeaponKind = null;

    const charTex = textureManager.textures.characters[paletteKey] || textureManager.textures.characters.thug1;

    // Shadow as sprite
    this.shadow = createSprite(textureManager.textures.shadow);
    this.shadow.anchor.set(0.5, 0.5);
    this.shadow.scale.set(this.scaleF);
    this.addChild(this.shadow);

    // Body node (rotates and scales for facing)
    this.body = new Container();
    this.body.scale.set(this.scaleF);
    this.addChild(this.body);

    this.backArm = new Sprite();
    this.backLeg = new Sprite();
    this.frontLeg = new Sprite();
    this.torso = new Sprite();
    this.head = new Sprite();
    this.frontArm = new Sprite();

    // A sibling of the arm placed at the hand each frame, so arm foreshortening never skews it.
    this.weaponSprite = new Sprite();
    this.weaponSprite.visible = false;
    this.weaponItem = null;

    this.tintables = [this.backArm, this.backLeg, this.frontLeg, this.torso, this.head, this.frontArm];
    this.body.addChild(...this.tintables, this.weaponSprite);
    this.layoutRig(charTex);

    // Enemy HUD (health bar and name tag)
    this.hpBar = null;
    if (!isPlayer) {
      this.hpBar = new Container();
      const bg = new Graphics();
      bg.roundRect(-19, 0, 38, 5, 2).fill({ color: 0x000000, alpha: 0.55 });
      this.hpFg = new Graphics();
      this.hpBar.addChild(bg, this.hpFg);
      this.hpBar.y = -148 * this.scaleF;
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
        tag.y = -158 * this.scaleF;
        this.addChild(tag);
      }
    }
  }

  /**
   * Places the parts from the sockets measured by scripts/slice_all_characters.py.
   * Body space: feet on y=0, `body` pivots at the hips so falls and spins turn around the waist.
   */
  layoutRig(charTex) {
    const parts = [
      [this.backArm, charTex.arm], [this.frontArm, charTex.arm],
      [this.backLeg, charTex.leg], [this.frontLeg, charTex.leg],
      [this.torso, charTex.torso], [this.head, charTex.head],
    ];
    for (const [sprite, tex] of parts) {
      sprite.texture = tex;
      sprite.anchor.set(tex.defaultAnchor.x, tex.defaultAnchor.y);
    }
    // NOTE: the leg art has its toes pointing left, so both legs are mirrored to face +x.
    this.backArm.scale.x = -1;
    this.backLeg.scale.x = -1;
    this.frontLeg.scale.x = -1;

    const leg = charTex.leg;
    const sk = charTex.torso.sockets;
    const hipY = -(leg.height * (1 - leg.defaultAnchor.y) - leg.pad) + FOOT_SINK;
    const torsoY = hipY - sk.hipL[1];
    this.backLeg.position.set(sk.hipL[0], hipY);
    this.frontLeg.position.set(sk.hipR[0], hipY);
    this.torso.position.set(0, torsoY);
    this.head.position.set(sk.neck[0], torsoY + sk.neck[1] + NECK_TUCK);
    this.backArm.position.set(sk.shoulderL[0], torsoY + sk.shoulderL[1]);
    this.frontArm.position.set(sk.shoulderR[0], torsoY + sk.shoulderR[1]);

    const arm = charTex.arm;
    this.handY = arm.height * (1 - arm.defaultAnchor.y) - arm.pad - HAND_INSET;
    if (this.heldWeapon) this.setWeaponGraphic(this.heldWeapon);

    this.hipY = hipY;
    this.body.pivot.set(0, hipY);
  }

  /** Weapon sprite from the item size table: gripped at ITEMS[kind].grip, sized by handLength(). */
  setWeaponGraphic(weapon) {
    this.heldWeapon = weapon;
    const tex = weapon?.kind && textureManager.textures.weapons[weapon.kind];
    const item = weapon?.kind && ITEMS[weapon.kind];
    if (!tex || !item) {
      this.weaponSprite.visible = false;
      this.weaponItem = null;
      return;
    }
    this.weaponSprite.texture = tex;
    this.weaponSprite.anchor.set(item.grip[0] / tex.width, item.grip[1] / tex.height);
    this.weaponBaseScale = handLength(weapon.kind) / tex.content.length;
    this.weaponItem = item;
    this.weaponSprite.visible = true;
    this.applyWeaponScale(weapon.scale ?? this.weaponScale ?? 1);

    // Angle at the moment of impact that puts the weapon's tip on its hit reach, so a
    // swing never visibly passes through an enemy it doesn't damage.
    const def = WEAPONS[weapon.kind];
    if (def?.melee) {
      const reach = def.range + NOMINAL_TARGET_REACH / this.scaleF;
      const fist = this.frontArm.x + Math.sin(-PUNCH_ARM_ROTATION) * this.handY * (1 - PUNCH_FORESHORTEN);
      const tipLength = (tex.content.bottom - item.grip[1]) * this.weaponSprite.scale.y;
      const forward = Math.max(0, Math.min(1, (reach - fist) / tipLength));
      this.weaponImpact = -Math.asin(forward) - PUNCH_ARM_ROTATION;
    } else {
      this.weaponImpact = item.carry;
    }
  }

  applyWeaponScale(mul) {
    this.weaponSprite.scale.set(this.weaponBaseScale * mul);
  }

  setWeaponScale(scale) {
    this.weaponScale = scale;
    if (this.weaponItem) this.applyWeaponScale(scale);
  }

  /** Re-reads the size table (studio item lab edits it live). */
  refreshWeapon() {
    if (this.heldWeapon) this.setWeaponGraphic(this.heldWeapon);
  }

  placeWeapon(model) {
    if (!this.weaponItem) return;
    const FA = this.frontArm;
    const hand = this.handY * FA.scale.y;
    this.weaponSprite.position.set(FA.x - Math.sin(FA.rotation) * hand, FA.y + Math.cos(FA.rotation) * hand);
    let rel = this.weaponItem.carry;
    if (model.state === "recoil" && model.recoilKind === "shoot") rel = 0;
    else if (model.state === "attack" && model.attackKind === "punch" && model.weapon?.def?.melee) {
      rel = this.weaponItem.carry + (this.weaponImpact - this.weaponItem.carry) * this.punchExtension;
    }
    this.weaponSprite.rotation = FA.rotation + rel;
  }

  redrawEnemyHp(hp, maxHp) {
    if (!this.hpFg) return;
    const r = Math.max(hp, 0) / maxHp;
    this.hpFg.clear();
    if (r > 0) {
      this.hpFg.roundRect(-18, 1, 36 * r, 3, 1.5).fill(r > 0.5 ? 0x7ec850 : 0xe65040);
    }
  }

  setPalette(paletteKey) {
    const charTex = textureManager.textures.characters[paletteKey];
    if (!charTex) return;
    this.paletteKey = paletteKey;
    this.palette = PALETTES[paletteKey] || PALETTES.thug1;
    this.layoutRig(charTex);
  }

  setScaleMultiplier(mult) {
    this.scaleF = (this.baseScale || 1) * CHAR_SCALE * mult;
    this.body.scale.set(this.scaleF);
    this.shadow.scale.set(this.scaleF);
    this.refreshWeapon();
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
    this.shadow.scale.set(sh * this.scaleF);
    this.shadow.alpha = 0.35 * sh + 0.1;

    // Tint pipeline: impact flash > enrage pulse > buffs > lamp glow
    let baseTint = model.isPlayer
      ? (model.power > 1 ? 0xffc36b : (model.speed > 2.7 ? 0xc8e8ff : 0xffffff))
      : 0xffffff;
    if (model.enraged) {
      baseTint = Math.sin(model.t * 0.2) > 0 ? 0xff9a8a : 0xffd0c0;
    } else if (model.lampGlow > 0) {
      const k = Math.min(1, model.lampGlow) * 0.45;
      const r = 0xff, gr = Math.round(0xff - 0x26 * k), b = Math.round(0xff - 0x60 * k);
      baseTint = (r << 16) | (gr << 8) | b;
    }
    const tint = model.flash > 6 ? 0xffffff : model.flash > 0 ? 0xff5b5b : baseTint;
    for (const sprite of this.tintables) {
      sprite.tint = tint;
    }

    // Landing squash-and-stretch
    if (model.justLanded > 0) {
      const sq = model.justLanded / 9;
      this.body.scale.y = this.scaleF * (1 - 0.16 * sq);
      this.body.scale.x = model.facing * this.scaleF * (1 + 0.12 * sq);
    }

    // Mercy-frame blink
    this.body.alpha = model.invul > 0 && Math.floor(model.t / 3) % 2 === 0 ? 0.5 : 1;

    // Sync weapon
    const weaponKind = model.weapon ? model.weapon.kind : null;
    if (this.currentWeaponKind !== weaponKind) {
      this.currentWeaponKind = weaponKind;
      this.setWeaponGraphic(model.weapon);
    }

    // Sync enemy health bar
    if (this.hpBar) {
      const showBar = !model.boss && model.vulnerable && model.hp < model.maxHp;
      this.hpBar.visible = showBar;
      if (showBar) {
        this.redrawEnemyHp(model.hp, model.maxHp);
      }
    }

    // Body rotations are facing-relative: positive leans toward the facing direction.
    const f = model.facing;
    const FA = this.frontArm;
    const BA = this.backArm;
    const FL = this.frontLeg;
    const BL = this.backLeg;
    const restArm = 0.06;
    const swing = Math.sin(model.t * 0.25);
    const lyingDrop = (-this.hipY - LIE_HEIGHT) * this.scaleF;
    let lean = 0;
    FA.scale.y = 1;
    this.punchExtension = 0;

    switch (model.state) {
      case "idle":
      case "walk": {
        const moving = model.vx !== 0 || model.vy !== 0;
        if (model.z > 0) {
          if (model.airKick) {
            FL.rotation = -1.5;
            BL.rotation = 0.5;
            FA.rotation = restArm + 0.8;
            BA.rotation = restArm - 1;
            lean = -0.25;
          } else {
            FL.rotation = 0.55;
            BL.rotation = -0.35;
            FA.rotation = restArm - 0.5;
            BA.rotation = restArm + 0.5;
          }
        } else if (moving) {
          FL.rotation = swing * 0.5;
          BL.rotation = -swing * 0.5;
          FA.rotation = restArm - swing * 0.4;
          BA.rotation = restArm + swing * 0.4;
          this.body.y += Math.abs(Math.cos(model.t * 0.25)) * -2.5;
        } else {
          const breathe = Math.sin(model.t * 0.07);
          FL.rotation = 0;
          BL.rotation = 0;
          FA.rotation = restArm + breathe * 0.04;
          BA.rotation = restArm - breathe * 0.04;
          this.body.y += breathe * 1.2;
        }
        break;
      }
      case "attack": {
        const dur = ATTACKS[model.attackKind]?.dur ?? 18;
        const p = Math.min(model.attackTimer / dur, 1);
        let ext;
        if (p < 0.35) ext = p / 0.35;
        else if (p < 0.6) ext = 1;
        else ext = 1 - (p - 0.6) / 0.4;
        ext = Math.max(0, Math.min(1, ext));

        if (model.attackKind === "punch" || model.attackKind === "hook") {
          const power = model.attackKind === "hook" ? 1.25 : 1;
          FA.rotation = restArm + (PUNCH_ARM_ROTATION * power - restArm) * ext;
          if (model.attackKind === "punch") {
            FA.scale.y = 1 - PUNCH_FORESHORTEN * ext;
            this.punchExtension = ext;
          }
          BA.rotation = restArm + 0.5 * power * ext;
          FL.rotation = 0.2 * ext;
          BL.rotation = -0.2 * ext;
          lean = 0.1 * power * ext;
        } else {
          FL.rotation = -1.6 * ext;
          BL.rotation = 0.3 * ext;
          FA.rotation = restArm + 0.7 * ext;
          BA.rotation = restArm - 0.9 * ext;
          lean = -0.15 * ext;
          this.body.y -= 2 * ext;
        }
        break;
      }
      case "recoil": {
        const p = 1 - Math.max(0, model.recoilTimer) / RECOIL[model.recoilKind];
        if (model.recoilKind === "shoot") {
          // arm levelled at the target, muzzle flip in the first few frames
          FA.rotation = -1.55 - 0.3 * Math.max(0, 1 - p * 4);
          lean = -0.04;
        } else {
          // throw: wind back, then release forward
          FA.rotation = p < 0.3 ? restArm + 0.9 * (p / 0.3) : restArm + 0.9 - 2.4 * Math.min(1, (p - 0.3) / 0.3);
          lean = p < 0.3 ? -0.08 : 0.08;
        }
        BA.rotation = restArm + 0.3;
        FL.rotation = 0.15;
        BL.rotation = -0.15;
        break;
      }
      case "hurt": {
        lean = -0.22;
        FA.rotation = restArm + 0.6;
        BA.rotation = restArm - 0.4;
        FL.rotation = 0.1;
        BL.rotation = -0.1;
        break;
      }
      case "roll": {
        const p = 1 - Math.max(0, model.rollTimer) / 14;
        lean = p * Math.PI * 2;
        this.body.y += -6 - Math.sin(p * Math.PI) * 8;
        FA.rotation = 1.2;
        BA.rotation = -1.2;
        FL.rotation = 1.4;
        BL.rotation = -1.0;
        break;
      }
      case "down": {
        const fall = model.z > 0 ? Math.min(1, model.downTimer / 10) : 1;
        lean = -FALL_ANGLE * fall;
        this.body.y += lyingDrop * fall;
        FA.rotation = 0.5;
        BA.rotation = -0.4;
        FL.rotation = 0.2;
        BL.rotation = -0.15;
        break;
      }
      case "rise": {
        const p = Math.min(1, model.riseTimer / 18);
        lean = -FALL_ANGLE * (1 - p);
        this.body.y += lyingDrop * (1 - p);
        FA.rotation = restArm;
        BA.rotation = restArm;
        FL.rotation = 0;
        BL.rotation = 0;
        break;
      }
      case "dead": {
        const fall = Math.min(model.deadTimer / 14, 1);
        lean = -FALL_ANGLE * fall;
        this.body.y += lyingDrop * fall;
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

    if (model.superSpin > 0) {
      lean = (1 - model.superSpin / 20) * Math.PI * 4;
      this.body.y -= 4;
      FA.rotation = -1.4;
      BA.rotation = 1.4;
    }

    this.body.rotation = lean * f;
    this.body.y += this.hipY * this.body.scale.y;
    this.placeWeapon(model);
  }
}

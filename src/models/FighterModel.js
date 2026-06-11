import { GRAVITY, JUMP_VEL, ATTACKS, AIR_KICK } from "../core/Constants.js";

export class FighterModel {
  constructor({ x, y, isPlayer = false, scale = 1, hp = 100, speed = 2.4, power = 1 }) {
    this.x = x;
    this.y = y;
    this.z = 0; // Height above ground
    this.vz = 0;
    this.vx = 0; // Momentum
    this.vy = 0;
    this.isPlayer = isPlayer;
    this.scaleF = scale;
    this.hp = hp;
    this.maxHp = hp;
    this.speed = speed;
    this.power = power;
    this.facing = isPlayer ? 1 : -1;

    this.state = "idle"; // idle | walk | attack | hurt | down | rise | dead
    this.t = Math.floor(x % 60); // Desync animation loops
    this.attackKind = null;
    this.attackTimer = 0;
    this.hitDone = false;
    this.airKick = false;
    this.cooldown = 0;
    this.hurtTimer = 0;
    this.downTimer = 0;
    this.riseTimer = 0;
    this.deadTimer = 0;
    this.flash = 0;
    this.invul = 0; // Mercy invulnerability frames (player only)
    this.kbX = 0;
    this.moveX = 0;
    this.moveY = 0;
    this.removed = false;

    // AI configuration parameters
    this.boss = false;
    this.gunner = false;
    this.aiCool = 0;
    this.shootCd = 0;
    this.aiTimer = 0;
    this.aiSide = Math.random() < 0.5 ? -1 : 1;
    this.aiOffY = 0;

    this.weapon = null;
  }

  setWeapon(weapon) {
    this.weapon = weapon;
  }

  get alive() {
    return this.state !== "dead";
  }

  get vulnerable() {
    return this.alive && this.state !== "down" && this.state !== "rise" && this.invul <= 0;
  }

  setMove(dx, dy) {
    this.moveX = dx;
    this.moveY = dy;
  }

  jump() {
    if (this.z > 0) return false;
    if (this.state !== "idle" && this.state !== "walk") return false;
    this.vz = JUMP_VEL;
    this.z = 0.01;
    return true;
  }

  tryAttack(kind) {
    if (this.z > 0) return false;
    if (this.state !== "idle" && this.state !== "walk") return false;
    if (this.cooldown > 0) return false;
    this.state = "attack";
    this.attackKind = kind;
    this.attackTimer = 0;
    this.hitDone = false;
    return true;
  }

  tryAirKick() {
    if (this.z <= 0 || this.airKick) return false;
    this.airKick = true;
    this.hitDone = false;
    return true;
  }

  getActiveHit() {
    // Flying kick active while airborne
    if (this.airKick && !this.hitDone && this.z > 4) {
      return {
        range: AIR_KICK.range * this.scaleF,
        dmg: Math.round(AIR_KICK.dmg * this.power),
        kb: AIR_KICK.kb,
        kind: "kick",
        knockdown: true,
      };
    }
    if (this.state !== "attack" || this.hitDone) return null;
    const a = ATTACKS[this.attackKind];
    if (this.attackTimer < a.from || this.attackTimer > a.to) return null;
    
    let { range, dmg, kb } = a;
    const w = this.weapon;
    if (w && w.def && w.def.melee && this.attackKind === "punch") {
      range = w.def.range;
      dmg = w.def.dmg;
      kb = w.def.kb;
    }
    return {
      range: range * this.scaleF,
      dmg: Math.round(dmg * this.power),
      kb,
      kind: this.attackKind,
      knockdown: false,
      weapon: w && w.def && w.def.melee && this.attackKind === "punch" ? w : null,
    };
  }

  applyHit(dmg, dir, kb, knockdown = false) {
    if (!this.vulnerable) return false;
    this.hp -= dmg;
    this.flash = 8;
    this.kbX = dir * kb;
    
    if (this.hp <= 0) {
      this.state = "dead";
      this.deadTimer = 0;
      this.vz = Math.max(this.vz, 3); // Pop up on death blow
      this.z = Math.max(this.z, 0.01);
      return true; // Killed
    }
    if (knockdown) {
      this.state = "down";
      this.downTimer = 0;
      this.vz = 5;
      this.z = Math.max(this.z, 0.01);
      this.kbX = dir * kb * 1.3;
      this.airKick = false;
      return false;
    }
    this.state = "hurt";
    this.hurtTimer = 13;
    if (this.isPlayer) this.invul = 35; // Mercy frames against gang stunlock
    return false;
  }

  updateAI(dt, playerModel, otherEnemies) {
    if (!this.alive || !playerModel || !playerModel.alive) return;
    if (this.state === "attack" || this.state === "hurt" || this.state === "down" || this.state === "rise") return;

    this.aiTimer -= dt;
    if (this.aiTimer <= 0) {
      this.aiTimer = 18 + Math.random() * 22;
      this.aiSide = this.x >= playerModel.x ? 1 : -1;
      if (!this.gunner && Math.random() < 0.18) this.aiSide *= -1;
      this.aiOffY = (Math.random() - 0.5) * 26;
    }

    const standoff = this.gunner ? 215 : (this.boss ? 66 : 56) * this.scaleF;
    const tx = Math.max(40, Math.min(2880 - 40, playerModel.x + this.aiSide * standoff));
    const ty = Math.max(398, Math.min(524, playerModel.y + (this.gunner ? 0 : this.aiOffY)));
    const dx = tx - this.x, dy = ty - this.y;

    let mx = 0, my = 0;
    if (Math.abs(dx) > 6) mx = Math.sign(dx);
    if (Math.abs(dy) > 5) my = Math.sign(dy);

    // Apply crowding separation
    for (const o of otherEnemies) {
      if (o === this || !o.alive) continue;
      const sx = this.x - o.x, sy = this.y - o.y;
      if (Math.abs(sx) < 34 && Math.abs(sy) < 16) {
        mx += Math.sign(sx || 1) * 0.6;
        my += Math.sign(sy || 1) * 0.6;
      }
    }
    this.setMove(Math.max(-1, Math.min(1, mx)), Math.max(-1, Math.min(1, my)));

    const pdx = playerModel.x - this.x;
    if (this.gunner) {
      this.shootCd -= dt;
      if (this.shootCd <= 0 && Math.abs(playerModel.y - this.y) < 14 && Math.abs(pdx) > 80) {
        this.facing = Math.sign(pdx) || this.facing;
        this.triggerShoot = true; // Flag for controller to spawn bullet
        this.shootCd = 140 + Math.random() * 60;
      } else if (Math.abs(pdx) < 58 && Math.abs(playerModel.y - this.y) < 22 && this.cooldown <= 0) {
        // Close range whip
        this.facing = Math.sign(pdx) || this.facing;
        this.tryAttack("punch");
      }
    } else if (Math.abs(pdx) < 62 * this.scaleF && Math.abs(playerModel.y - this.y) < 22 && this.cooldown <= 0) {
      this.facing = Math.sign(pdx) || this.facing;
      this.tryAttack(Math.random() < 0.65 ? "punch" : "kick");
    }
  }

  update(dt) {
    this.t += dt;
    if (this.cooldown > 0) this.cooldown -= dt;
    if (this.flash > 0) this.flash -= dt;
    if (this.invul > 0) this.invul -= dt;

    // Knockback movement
    this.x += this.kbX * dt;
    this.kbX *= Math.pow(0.86, dt);

    // Height/gravity physics
    if (this.z > 0 || this.vz !== 0) {
      this.z += this.vz * dt;
      this.vz -= GRAVITY * dt;
      if (this.z <= 0) {
        this.z = 0;
        this.vz = 0;
        if (this.airKick) {
          this.airKick = false;
          this.cooldown = Math.max(this.cooldown, 8);
        }
      }
    }

    switch (this.state) {
      case "idle":
      case "walk": {
        const moving = this.moveX !== 0 || this.moveY !== 0;
        this.state = moving ? "walk" : "idle";
        if (this.moveX !== 0) this.facing = Math.sign(this.moveX);
        const diag = this.moveX !== 0 && this.moveY !== 0 ? 0.72 : 1;
        const txv = this.moveX * this.speed * diag;
        const tyv = this.moveY * this.speed * 0.7 * diag;
        const ease = Math.min(1, 0.28 * dt);
        this.vx += (txv - this.vx) * ease;
        this.vy += (tyv - this.vy) * ease;
        this.x += this.vx * dt;
        this.y += this.vy * dt;
        break;
      }
      case "attack": {
        this.vx *= Math.pow(0.8, dt);
        this.vy *= Math.pow(0.8, dt);
        this.attackTimer += dt;
        const a = ATTACKS[this.attackKind];
        if (this.attackTimer >= a.from && this.attackTimer <= a.to) {
          this.x += this.facing * a.lunge * dt;
        }
        if (this.attackTimer >= a.dur) {
          this.state = "idle";
          this.cooldown = this.isPlayer ? 5 : (this.aiCool || 55) + Math.random() * 45;
        }
        break;
      }
      case "hurt": {
        this.vx *= Math.pow(0.7, dt);
        this.vy *= Math.pow(0.7, dt);
        this.hurtTimer -= dt;
        if (this.hurtTimer <= 0) this.state = "idle";
        break;
      }
      case "down": {
        this.vx = 0;
        this.vy = 0;
        const airborne = this.z > 0;
        if (!airborne) this.downTimer += dt;
        else this.downTimer = Math.min(this.downTimer + dt, 9);
        if (!airborne && this.downTimer > 42) {
          this.state = "rise";
          this.riseTimer = 0;
        }
        break;
      }
      case "rise": {
        this.riseTimer += dt;
        if (this.riseTimer >= 18) {
          this.state = "idle";
          if (this.isPlayer) this.invul = 30; // Wake-up protection
        }
        break;
      }
      case "dead": {
        this.deadTimer += dt;
        if (this.deadTimer > 85) this.removed = true;
        break;
      }
    }

    this.moveX = 0;
    this.moveY = 0;
  }
}

import {
  WEAPONS, COMBAT_DEPTH_BAND, PROJECTILE_DEPTH_BAND, HIT, KNOCKDOWN, COMBO_WINDOW, SCORE, SUPER,
  BULLET, THROW, LOOT_TABLE, DROPS, PICKUP_EFFECTS,
} from "../data/combat.js";
import { BulletModel } from "../models/BulletModel.js";
import { rng } from "../core/Random.js";

/**
 * Combat rules — melee hits, blocks, knockdowns, bullets, thrown weapons, the super,
 * kills, loot and pickups. Pure simulation with no Pixi dependency, so it runs in Node tests.
 *
 * `world` owns the entities and their views (GameplayScene, or a stub in tests):
 *   playerModel, enemies, crates, pickups, bullets, throws, game, hitstop,
 *   spawnPickup(x, y, type, meta), spawnBullet(model), spawnThrow(throwModel), despawn(kind, model)
 * `fx` receives cosmetic events only:
 *   spark(x, y, big, color), popup(x, y, text, color, size), sound(name), particles(kind, x, y, arg)
 */
export class CombatSystem {
  constructor(world, fx) {
    this.world = world;
    this.fx = fx;
  }

  get game() {
    return this.world.game;
  }

  registerRangedHit() {
    this.game.combo++;
    this.game.comboTimer = COMBO_WINDOW;
    this.game.score += SCORE.ranged;
    this.game.super = Math.min(SUPER.max, this.game.super + SUPER.gainRanged);
  }

  throwWeapon() {
    const p = this.world.playerModel;
    const w = p.weapon;
    if (!w || p.z > 0) return;
    if (p.state !== "idle" && p.state !== "walk") return;
    const meta = { uses: w.uses, ammo: w.ammo };
    p.setWeapon(null);

    this.world.spawnThrow({
      x: p.x + p.facing * THROW.startX,
      prevX: p.x + p.facing * THROW.startX,
      gy: p.y,
      ry: p.y - THROW.height * p.scaleF,
      vx: p.facing * THROW.speed,
      life: THROW.life,
      spin: 0,
      type: w.kind,
      meta,
    });
    this.fx.sound("swing");
    // throwing recoil pose, no melee hit attached
    p.state = "attack";
    p.attackKind = "punch";
    p.attackTimer = 0;
    p.hitDone = true;
  }

  updateThrows(dt) {
    const { throws, enemies, crates } = this.world;
    for (let i = throws.length - 1; i >= 0; i--) {
      const th = throws[i];
      const prevX = th.prevX !== undefined ? th.prevX : th.x;
      th.prevX = th.x;
      th.x += th.vx * dt;
      th.life -= dt;
      th.spin += 0.38 * dt * Math.sign(th.vx);

      let stopped = th.life <= 0;
      if (!stopped) {
        const minX = Math.min(prevX, th.x) - THROW.sweepPad;
        const maxX = Math.max(prevX, th.x) + THROW.sweepPad;
        for (const t of enemies) {
          if (!t.vulnerable || t.z > THROW.maxTargetZ * t.scaleF) continue;
          if (t.x >= minX && t.x <= maxX && Math.abs(t.y - th.gy) <= PROJECTILE_DEPTH_BAND) {
            const wDef = WEAPONS[th.type];
            const dmg = wDef ? wDef.throwDmg : THROW.fallbackDamage;
            const killed = t.applyHit(dmg, Math.sign(th.vx), THROW.knockback, th.type !== "pistol");
            this.fx.popup(t.x, t.y - 75 * t.scaleF, `-${dmg}`, 0xffe7b0);
            this.fx.spark(th.x, th.ry, true, th.type === "bottle" ? 0x9fe8d8 : 0xffb347);
            this.fx.sound(th.type === "bottle" ? "glassBreak" : "heavyHit");
            this.registerRangedHit();
            if (killed) this.onKill(t);
            stopped = true;
            break;
          }
        }
      }
      if (!stopped) {
        const minX = Math.min(prevX, th.x) - THROW.cratePad;
        const maxX = Math.max(prevX, th.x) + THROW.cratePad;
        for (const c of crates) {
          if (c.x >= minX && c.x <= maxX && Math.abs(c.y - th.gy) <= PROJECTILE_DEPTH_BAND) {
            this.hitCrate(c, 2);
            stopped = true;
            break;
          }
        }
      }
      if (stopped) {
        this.world.despawn("throw", th);
        if (WEAPONS[th.type] && WEAPONS[th.type].shatter) {
          // bottles never survive a flight
          this.fx.spark(th.x, th.gy - 18, true, 0x9fe8d8);
          this.fx.particles("glass", th.x, th.gy - 18);
        } else {
          this.world.spawnPickup(th.x, th.gy, th.type, th.meta);
        }
      }
    }
  }

  fireBullet(owner, dir) {
    const ry = owner.y - BULLET.muzzleHeight * owner.scaleF;
    this.world.spawnBullet(new BulletModel({
      x: owner.x + dir * BULLET.muzzleX,
      gy: owner.y,
      ry,
      vx: dir * BULLET.speed,
      dmg: owner.isPlayer ? BULLET.playerDamage : BULLET.enemyDamage,
      fromPlayer: owner.isPlayer,
    }));

    this.fx.spark(owner.x + dir * 30, ry, false, 0xfff3c0);
    this.fx.sound("gunshot");

    // firing recoil pose
    owner.state = "attack";
    owner.attackKind = "punch";
    owner.attackTimer = 0;
    owner.hitDone = true;
  }

  updateBullets(dt) {
    const { bullets, enemies, crates, playerModel } = this.world;
    for (let i = bullets.length - 1; i >= 0; i--) {
      const b = bullets[i];
      b.update(dt, this.game.camX);

      let dead = b.removed;
      if (!dead) {
        const targets = b.fromPlayer
          ? enemies.filter((e) => e.vulnerable)
          : (playerModel && playerModel.vulnerable ? [playerModel] : []);

        const minX = Math.min(b.prevX, b.x) - BULLET.sweepPad;
        const maxX = Math.max(b.prevX, b.x) + BULLET.sweepPad;

        for (const t of targets) {
          if (t.z > BULLET.maxTargetZ * t.scaleF) continue;
          if (t.x >= minX && t.x <= maxX && Math.abs(t.y - b.gy) <= PROJECTILE_DEPTH_BAND) {
            const bulletDir = Math.sign(b.vx);
            const blocked = bulletDir !== t.facing && (
              t.isPlayer ? t.weapon?.kind === "lid" : t.archetype === "shielder"
            );

            const killed = t.applyHit(
              blocked ? BULLET.blockedDamage : b.dmg,
              bulletDir,
              blocked ? BULLET.blockedKnockback : BULLET.knockback,
            );
            if (blocked) {
              this.fx.spark(b.x, b.ry, false, 0xb9c2cc);
              this.fx.popup(t.x, t.y - 75 * t.scaleF, "ԿԼԱՆԿ!", 0xb9c2cc);
              this.fx.sound("clang");
            } else {
              this.fx.spark(b.x, b.ry, false);
              this.fx.popup(t.x, t.y - 75 * t.scaleF, `-${b.dmg}`, b.fromPlayer ? 0xffe7b0 : 0xff6a5e);
              this.fx.sound("heavyHit");
            }
            if (b.fromPlayer) {
              this.registerRangedHit();
              if (killed) this.onKill(t);
            } else if (killed) {
              this.game.shake = 12;
            }
            dead = true;
            b.removed = true;
            break;
          }
        }
      }

      if (!dead && b.fromPlayer) {
        const minX = Math.min(b.prevX, b.x) - BULLET.cratePad;
        const maxX = Math.max(b.prevX, b.x) + BULLET.cratePad;
        for (const c of crates) {
          if (c.x >= minX && c.x <= maxX && Math.abs(c.y - b.gy) <= PROJECTILE_DEPTH_BAND) {
            this.hitCrate(c, 2);
            dead = true;
            b.removed = true;
            break;
          }
        }
      }

      if (dead) this.world.despawn("bullet", b);
    }
  }

  applyPickup(p) {
    const pm = this.world.playerModel;
    const px = pm.x, py = pm.y - 95 * pm.scaleF;
    switch (p.type) {
      case "shawarma":
        pm.hp = Math.min(pm.maxHp, pm.hp + PICKUP_EFFECTS.shawarmaHeal);
        this.fx.popup(px, py, `+${PICKUP_EFFECTS.shawarmaHeal}`, 0x7ec850);
        break;
      case "khorovats":
        pm.hp = pm.maxHp;
        this.fx.popup(px, py, "ԽՈՐՈՎԱԾ · FULL HP", 0x7ec850);
        break;
      case "tan":
        this.game.buffs.speed = PICKUP_EFFECTS.speedBuff;
        this.fx.popup(px, py, "ԹԱՆ · SPEED", 0x9fd8ff);
        break;
      case "cognac":
        this.game.buffs.rage = PICKUP_EFFECTS.rageBuff;
        this.fx.popup(px, py, "ԿՈՆՅԱԿ · RAGE x2", 0xffb347);
        break;
      case "coin":
        this.game.score += PICKUP_EFFECTS.coinScore;
        this.fx.popup(px, py, `+${PICKUP_EFFECTS.coinScore}`, 0xd4af37);
        break;
      case "medal":
        this.game.score += PICKUP_EFFECTS.medalScore;
        this.fx.popup(px, py, `ՄԵԴԱԼԸ! +${PICKUP_EFFECTS.medalScore}`, 0xd4af37, 18);
        break;
      case "stick":
      case "bottle":
      case "pistol":
      case "lid": {
        if (pm.weapon) return false;
        const def = WEAPONS[p.type];
        if (!def) return false;
        pm.setWeapon({
          kind: p.type,
          def,
          uses: p.meta?.uses ?? def.uses,
          ammo: p.meta?.ammo ?? def.ammo,
        });
        this.fx.popup(px, py, def.label, 0xe8cf9e);
        break;
      }
    }
    this.fx.sound(p.type === "coin" ? "coin" : "pickup");
    return true;
  }

  updatePickups(dt) {
    const { pickups, playerModel } = this.world;
    for (let i = pickups.length - 1; i >= 0; i--) {
      const p = pickups[i];
      p.update(dt);

      if (playerModel && playerModel.alive && Math.abs(playerModel.x - p.x) < 30 && Math.abs(playerModel.y - p.y) < 24) {
        if (this.applyPickup(p)) {
          p.removed = true;
          this.world.despawn("pickup", p);
        }
      }
    }
  }

  lootRoll() {
    const r = rng.next();
    return LOOT_TABLE.find(([limit]) => r < limit)[1];
  }

  // ԿԱՅԾԱԿ: whirlwind super — costs a full meter, clears the space around Davo
  trySuper() {
    const p = this.world.playerModel;
    if (this.game.super < SUPER.max || !p || !p.alive || p.z > 0) return;
    if (p.state !== "idle" && p.state !== "walk") return;
    this.game.super = 0;
    p.superSpin = SUPER.spin;
    p.invul = Math.max(p.invul, SUPER.invul);
    this.game.shake = SUPER.shake;
    this.world.hitstop = SUPER.hitstop;
    this.fx.popup(p.x, p.y - 120 * p.scaleF, "ԿԱՅԾԱԿ!", 0xffe14a, 22);
    this.fx.particles("burst", p.x, p.y - 40, true);
    this.fx.sound("super");
    for (const e of this.world.enemies) {
      if (!e.alive) continue;
      const dx = e.x - p.x;
      if (Math.abs(dx) > SUPER.radius * p.scaleF || Math.abs(e.y - p.y) > SUPER.depth * p.scaleF) continue;
      if (e.z > SUPER.maxTargetZ * e.scaleF) continue;
      e.invul = 0; // the storm respects no block
      if (!e.vulnerable) continue; // ...but grounded knockdowns stay safe
      const killed = e.applyHit(Math.round(SUPER.damage * p.power), Math.sign(dx) || 1, SUPER.knockback, true);
      this.fx.popup(e.x, e.y - 75 * e.scaleF, `-${SUPER.damage}`, 0xffe14a);
      this.fx.particles("burst", e.x, e.y - 35 * e.scaleF);
      if (killed) this.onKill(e);
    }
  }

  onKill(t) {
    const game = this.game;
    game.score += SCORE.kill + game.wave * SCORE.killPerWave + (t.boss ? SCORE.bossKill : 0);
    game.shake = t.boss ? 14 : 7;
    this.fx.particles("burst", t.x, t.y - 40, t.boss);
    if (t.boss) game.zoomPunch = 14;
    if (t.gunner) {
      // their pistol survives with whatever they hadn't fired yet
      this.world.spawnPickup(t.x, t.y, "pistol", { ammo: DROPS.gunnerAmmoMin + Math.floor(rng.next() * DROPS.gunnerAmmoRange) });
    } else if (t.boss && game.wave === DROPS.medalWave && !game.endless) {
      this.world.spawnPickup(t.x, t.y, "medal");
    } else if (rng.next() < Math.min(DROPS.max, DROPS.base + game.wave * DROPS.perWave) || t.boss) {
      this.world.spawnPickup(t.x, t.y, this.lootRoll());
    }
  }

  hitCrate(c, dmg) {
    const broken = c.hit(dmg);
    this.fx.spark(c.x, c.y - 16, false, 0xd9b380);
    this.fx.particles("debris", c.x, c.y);
    if (broken) {
      this.fx.sound("crateBreak");
      this.world.despawn("crate", c);
      this.world.spawnPickup(c.x, c.y, this.lootRoll());
    } else {
      this.fx.sound("hit");
    }
  }

  resolveBodyCollisions() {
    const { playerModel, enemies } = this.world;
    const fighters = playerModel && playerModel.alive ? [playerModel, ...enemies] : [...enemies];

    for (let i = 0; i < fighters.length; i++) {
      const f1 = fighters[i];
      if (!f1 || !f1.alive || f1.z > 8 || f1.state === "down") continue;
      for (let j = i + 1; j < fighters.length; j++) {
        const f2 = fighters[j];
        if (!f2 || !f2.alive || f2.z > 8 || f2.state === "down") continue;

        const dx = f1.x - f2.x;
        const dy = (f1.y - f2.y) * 2.0; // isometric depth compression
        const dist = Math.hypot(dx, dy);
        const minDist = (18 * f1.scaleF) + (18 * f2.scaleF);

        if (dist < minDist && dist > 0.001) {
          const overlap = (minDist - dist) / dist;
          const pushX = dx * overlap * 0.25;
          const pushY = (dy / 2.0) * overlap * 0.25;

          f1.x += pushX;
          f1.y += pushY;
          f2.x -= pushX;
          f2.y -= pushY;
        }
      }
    }
  }

  rollKnockdown(atk, hit, t) {
    let kd = hit.knockdown;
    if (!kd && atk.isPlayer) {
      if (hit.kind === "kick" && rng.next() < KNOCKDOWN.playerKick) kd = true;
      if (hit.kind === "hook" && rng.next() < KNOCKDOWN.playerHook) kd = true;
      if (hit.weapon && hit.weapon.kind === "stick" && rng.next() < KNOCKDOWN.playerStick) kd = true;
    } else if (!kd && !atk.isPlayer) {
      if (atk.archetype === "grappler") kd = true; // the bear hug always slams
      else if (atk.boss && rng.next() < KNOCKDOWN.bossHit) kd = true;
      else if (hit.kind === "kick" && rng.next() < KNOCKDOWN.enemyKick) kd = true;
    }
    if (kd && t.boss && rng.next() < KNOCKDOWN.bossResist) kd = false;
    return kd;
  }

  resolveHits() {
    const { playerModel, enemies, crates } = this.world;
    const all = [playerModel, ...enemies];
    for (const atk of all) {
      if (!atk || (atk.state !== "attack" && !atk.airKick)) continue;
      const hit = atk.getActiveHit();
      if (!hit) continue;

      const targets = atk.isPlayer ? enemies : [playerModel];
      let landed = false;
      for (const t of targets) {
        if (!t || !t.vulnerable) continue;

        if (atk.airKick) {
          if (atk.z < t.z - HIT.airKickBelow * atk.scaleF || atk.z > t.z + HIT.airKickAbove * t.scaleF) continue;
        } else if (atk.z > HIT.jumpAttackMinZ) {
          if (Math.abs(t.z - atk.z) > HIT.jumpAttackZTolerance * atk.scaleF) continue;
        } else if (t.z > HIT.groundTargetMaxZ * t.scaleF) {
          continue;
        }

        const extraLane = (hit.weapon && hit.weapon.kind === "stick") ? HIT.stickExtraLane : 0;
        const maxLaneDist = (COMBAT_DEPTH_BAND + extraLane) * Math.min(atk.scaleF, t.scaleF);
        if (Math.abs(t.y - atk.y) > maxLaneDist) continue;

        const tRadius = t.hurtbox ? t.hurtbox.rx : 16 * t.scaleF;
        const dx = (t.x - atk.x) * atk.facing;
        if (dx < -tRadius * HIT.reachBehind || dx > hit.range + tRadius * HIT.reachAhead) continue;

        let kd = this.rollKnockdown(atk, hit, t);

        // shielders or fighters equipped with a trash lid block frontal hits
        let dmg = hit.dmg;
        let blocked = false;
        const hasShield = t.archetype === "shielder" || (t.weapon && t.weapon.def && t.weapon.def.shield);
        if (hasShield && t.state !== "down" && t.facing === -atk.facing) {
          dmg = Math.max(1, Math.round(dmg * HIT.blockDamageMul));
          kd = false;
          blocked = true;
          if (t.isPlayer && t.weapon) {
            t.weapon.uses--;
            if (t.weapon.uses <= 0) {
              this.fx.spark(t.x, t.y - 40 * t.scaleF, true, 0xb9c2cc);
              t.setWeapon(null);
            }
          }
        }

        atk.hitDone = true;
        landed = true;

        const killed = t.applyHit(dmg, atk.facing, blocked ? HIT.blockKnockback : hit.kb, kd);
        const hitX = (atk.x + t.x) / 2;
        const hitY = t.y - 42 * t.scaleF;
        if (blocked) {
          this.fx.spark(hitX, hitY, false, 0xb9c2cc);
          this.fx.popup(t.x, t.y - 75 * t.scaleF, "ԿԼԱՆԿ!", 0xb9c2cc);
          this.fx.sound("clang");
          this.world.hitstop = HIT.hitstopBlocked;
        } else {
          this.fx.spark(hitX, hitY, hit.kind !== "punch");
          this.fx.popup(
            t.x, t.y - 75 * t.scaleF, `-${dmg}`,
            atk.isPlayer ? (hit.kind === "punch" ? 0xffe7b0 : 0xffb347) : 0xff6a5e,
          );
          this.fx.sound(hit.kind === "kick" || hit.weapon || atk.boss ? "heavyHit" : "hit");
          this.world.hitstop = hit.kind === "punch" ? HIT.hitstopPunch : HIT.hitstopHeavy;
        }
        this.fx.particles("puff", hitX, hitY);

        if (atk.isPlayer) {
          this.game.super = Math.min(SUPER.max, this.game.super + (hit.kind === "punch" ? SUPER.gainPunch : SUPER.gainHeavy));
        }

        // getting floored knocks the weapon out of your hands
        if (t.isPlayer && t.state === "down" && t.weapon) {
          const w = t.weapon;
          this.world.spawnPickup(t.x + atk.facing * 38, t.y + 6, w.kind, { uses: w.uses, ammo: w.ammo });
          t.setWeapon(null);
        }

        if (atk.isPlayer) {
          this.game.combo++;
          this.game.comboTimer = COMBO_WINDOW;
          this.game.score += hit.kind === "kick" ? SCORE.kick : SCORE.punch;
          if (hit.weapon) {
            hit.weapon.uses--;
            if (hit.weapon.uses <= 0) {
              this.fx.spark(t.x, t.y - 40 * t.scaleF, true, 0xd9b380);
              this.fx.sound(hit.weapon.kind === "bottle" ? "glassBreak" : "crateBreak");
              atk.setWeapon(null);
            }
          }
          if (killed) this.onKill(t);
        } else if (killed) {
          this.game.shake = 12;
        }
        break;
      }

      if (!landed && atk.isPlayer) {
        for (const c of crates) {
          const maxLaneDist = COMBAT_DEPTH_BAND * atk.scaleF;
          if (Math.abs(c.y - atk.y) > maxLaneDist) continue;
          if (atk.z > HIT.crateMaxZ * atk.scaleF) continue;
          const dx = (c.x - atk.x) * atk.facing;
          if (dx < -HIT.crateReachBehind * atk.scaleF || dx > hit.range + HIT.crateReachAhead * atk.scaleF) continue;
          atk.hitDone = true;
          this.hitCrate(c, 1);
          break;
        }
      }
    }
  }
}

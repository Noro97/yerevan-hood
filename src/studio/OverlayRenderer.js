import { Graphics } from "pixi.js";
import { WORLD_W } from "../core/Constants.js";
import { ATTACKS, COMBAT_DEPTH_BAND, PROJECTILE_DEPTH_BAND, HIT } from "../data/combat.js";
import { FLOOR_PX_PER_METER } from "../data/items.js";

export const OVERLAY_LAYERS = {
  hurtboxes: { label: "Hurtboxes", hint: "footprint + body column; grey = invulnerable", on: true },
  hitboxes: { label: "Active hits", hint: "red while an attack's active frames run", on: true },
  reach: { label: "Reach ticks", hint: "punch / kick / hook reach of the selected fighter", on: true },
  lanes: { label: "Depth lane", hint: "player's melee lane (yellow)", on: true },
  projectiles: { label: "Projectiles", hint: "bullet and thrown-weapon sweeps", on: true },
  pivots: { label: "Rig pivots", hint: "anchor of every body part", on: false },
  bounds: { label: "Floor bounds", hint: "walkable strip", on: false },
  ruler: { label: "Metre ruler", hint: "2 m scale next to the player (ticks every 10 cm)", on: false },
};

const COLORS = {
  hurt: 0x30d158,
  hurtOff: 0x8e8e93,
  hit: 0xff453a,
  lane: 0xffd60a,
  bullet: 0xbf5af2,
  thrown: 0x64d2ff,
  pivot: 0xff375f,
  bounds: 0x0a84ff,
  select: 0x5ac8fa,
};

/** Debug drawing on top of the actors layer; survives clearWorld() by re-creating its Graphics. */
export class OverlayRenderer {
  constructor() {
    this.layers = Object.fromEntries(Object.entries(OVERLAY_LAYERS).map(([k, v]) => [k, v.on]));
    this.g = null;
  }

  ensure(scene) {
    if (!this.g || this.g.destroyed) {
      this.g = new Graphics();
      this.g.zIndex = 1e6;
    }
    if (this.g.parent !== scene.actors) scene.actors.addChild(this.g);
    return this.g;
  }

  /** Vertical 2 m scale at a scale-1 fighter's metres (FLOOR_PX_PER_METER), ticks every 10 cm. */
  drawRuler(g, x, groundY) {
    const m = FLOOR_PX_PER_METER;
    g.moveTo(x, groundY).lineTo(x, groundY - 2 * m).stroke({ width: 2, color: 0xffffff, alpha: 0.9 });
    for (let i = 0; i <= 20; i++) {
      const w = i % 10 === 0 ? 10 : i % 5 === 0 ? 7 : 4;
      const y = groundY - (i / 10) * m;
      g.moveTo(x - w, y).lineTo(x, y).stroke({ width: i % 10 === 0 ? 2 : 1, color: 0xffffff, alpha: 0.9 });
    }
    g.moveTo(x, groundY + 4).lineTo(x + m, groundY + 4).stroke({ width: 2, color: 0xffd60a, alpha: 0.9 });
  }

  draw(scene, selected) {
    if (!scene.actors || scene.actors.destroyed) return;
    const g = this.ensure(scene);
    g.clear();
    const L = this.layers;
    const player = scene.playerModel;
    const fighters = [player, ...scene.enemies].filter(Boolean);

    if (L.bounds) {
      for (const y of [scene.floorTop, scene.floorBottom]) {
        g.moveTo(0, y).lineTo(WORLD_W, y).stroke({ width: 1.5, color: COLORS.bounds, alpha: 0.8 });
      }
    }

    if (L.ruler && player) this.drawRuler(g, player.x - 34, player.y);

    if (L.lanes && player?.alive) {
      const band = COMBAT_DEPTH_BAND * player.scaleF;
      g.rect(player.x - 140, player.y - band, 280, band * 2).fill({ color: COLORS.lane, alpha: 0.06 });
      for (const y of [player.y - band, player.y + band]) {
        g.moveTo(player.x - 140, y).lineTo(player.x + 140, y).stroke({ width: 1, color: COLORS.lane, alpha: 0.7 });
      }
    }

    for (const f of fighters) {
      const hb = f.hurtbox;
      const footY = f.y;
      const top = f.y - f.z - hb.h;

      if (L.hurtboxes) {
        const color = f.alive && f.vulnerable ? COLORS.hurt : COLORS.hurtOff;
        g.ellipse(f.x, footY, hb.rx, hb.ry).stroke({ width: 1.5, color, alpha: 0.9 });
        g.rect(f.x - hb.rx, top, hb.rx * 2, hb.h).stroke({ width: 1, color, alpha: 0.6 });
      }

      if (L.hitboxes && f.alive) {
        const hit = f.getActiveHit();
        if (hit) {
          const x1 = f.x + f.facing * hit.range;
          const chest = f.y - f.z - 92 * f.scaleF;
          g.rect(Math.min(f.x, x1), chest - 10 * f.scaleF, Math.abs(x1 - f.x), 20 * f.scaleF).fill({ color: COLORS.hit, alpha: 0.45 });
          const band = COMBAT_DEPTH_BAND * f.scaleF;
          g.rect(Math.min(f.x, x1), f.y - band, Math.abs(x1 - f.x), band * 2).stroke({ width: 1.5, color: COLORS.hit, alpha: 0.9 });
        }
      }

      if (L.reach && f === selected) {
        const ticks = [["punch", 0xffffff], ["kick", 0xff9f0a], ["hook", 0xff453a]];
        for (const [kind, color] of ticks) {
          const x = f.x + f.facing * (ATTACKS[kind].range * f.scaleF + 16 * 0.7 * HIT.reachAhead);
          g.moveTo(x, f.y - 8).lineTo(x, f.y + 8).stroke({ width: 2, color, alpha: 0.9 });
        }
      }

      if (f === selected) {
        g.ellipse(f.x, footY, hb.rx + 7, hb.ry + 4).stroke({ width: 2.5, color: COLORS.select, alpha: 1 });
      }

      if (L.pivots) {
        const view = f.isPlayer ? scene.playerView : scene.enemyViews.get(f);
        if (view && !view.destroyed) {
          for (const part of [view.head, view.torso, view.frontArm, view.backArm, view.frontLeg, view.backLeg]) {
            const p = scene.actors.toLocal(part.getGlobalPosition());
            g.moveTo(p.x - 3, p.y).lineTo(p.x + 3, p.y).moveTo(p.x, p.y - 3).lineTo(p.x, p.y + 3)
              .stroke({ width: 1.5, color: COLORS.pivot, alpha: 1 });
          }
        }
      }
    }

    if (L.projectiles) {
      for (const b of scene.bullets) {
        g.moveTo(b.prevX, b.gy).lineTo(b.x, b.gy).stroke({ width: 3, color: COLORS.bullet, alpha: 0.95 });
        g.rect(Math.min(b.prevX, b.x) - 12, b.gy - PROJECTILE_DEPTH_BAND, Math.abs(b.x - b.prevX) + 24, PROJECTILE_DEPTH_BAND * 2)
          .stroke({ width: 1, color: COLORS.bullet, alpha: 0.5 });
      }
      for (const th of scene.throws) {
        g.moveTo(th.prevX ?? th.x, th.gy).lineTo(th.x, th.gy).stroke({ width: 3, color: COLORS.thrown, alpha: 0.95 });
        g.rect(Math.min(th.prevX ?? th.x, th.x) - 16, th.gy - PROJECTILE_DEPTH_BAND, Math.abs(th.x - (th.prevX ?? th.x)) + 32, PROJECTILE_DEPTH_BAND * 2)
          .stroke({ width: 1, color: COLORS.thrown, alpha: 0.5 });
      }
    }
  }
}

import { Container, Graphics, Text, ColorMatrixFilter } from "pixi.js";
import { Scene } from "../core/Scene.js";
import { ParticleSystem } from "../views/ParticleSystem.js";
import { W, H, WORLD_W, FLOOR_TOP, FLOOR_BOTTOM, BASE_SPEED, ARM_FONT, WEAPONS, STORY, CHAPTERS, chapterOf, CHAR_SCALE, COMBAT_DEPTH_BAND, PROJECTILE_DEPTH_BAND, SCALE_CONFIG } from "../core/Constants.js";
import { sfx } from "../core/SoundManager.js?v=3";
import { GameModel } from "../models/GameModel.js";
import { FighterModel } from "../models/FighterModel.js";
import { CrateModel } from "../models/CrateModel.js";
import { PickupModel } from "../models/PickupModel.js";
import { BulletModel } from "../models/BulletModel.js";
import { BackgroundView } from "../views/BackgroundView.js";
import { FighterView } from "../views/FighterView.js";
import { CrateView } from "../views/CrateView.js";
import { PickupView } from "../views/PickupView.js";
import { BulletView } from "../views/BulletView.js";
import { HUDView } from "../views/HUDView.js";
import { DialogueView } from "../views/DialogueView.js";
import { OverlayView } from "../views/OverlayView.js";

export class GameplayScene extends Scene {
  constructor() {
    super();
    this.app = null;
    this.frame = 0;
    this.hitstop = 0;

    // Initialize Models
    this.game = new GameModel();
    this.playerModel = null;
    this.enemies = [];
    this.crates = [];
    this.pickups = [];
    this.bullets = [];

    // Initialize Maps to bind Models to Views
    this.enemyViews = new Map();
    this.crateViews = new Map();
    this.pickupViews = new Map();
    this.bulletViews = new Map();
    this.effects = [];
    this.popups = [];   // Floating damage/heal numbers
    this.throws = [];   // Weapons in flight

    this.floorTop = FLOOR_TOP;
    this.floorBottom = FLOOR_BOTTOM;
    this.showBoundsGuide = false;
    this.boundsGraphics = null;
  }

  onEnter(app) {
    this.app = app;
    this.frame = 0;
    this.hitstop = 0;

    // 1. Create Environmental Layers
    this.bg = new BackgroundView();
    this.addChild(this.bg.sky, this.bg.far, this.bg.mid);

    // 2. Create Dynamic World Layers
    this.world = new Container();
    this.actors = new Container();
    this.actors.sortableChildren = true;
    this.world.addChild(this.bg.scenery, this.actors);
    this.addChild(this.world);
    this.addChild(this.bg.fore); // out-of-focus foreground strip

    this.boundsGraphics = new Graphics();
    this.boundsGraphics.zIndex = 99999;
    this.actors.addChild(this.boundsGraphics);
    this.updateBoundsGuide();

    // Per-chapter color grade on the world
    this.grade = new ColorMatrixFilter();
    this.world.filters = [this.grade];

    // 3. Chapter mood overlay
    this.moodTint = new Graphics();
    this.moodTint.rect(0, 0, W, H).fill(0xffffff);
    this.moodTint.alpha = 0;
    this.addChild(this.moodTint);

    // 4. Soft vignette frame for depth
    this.vignette = new Graphics();
    this.vignette.rect(0, 0, W, 26).fill({ color: 0x0c0815, alpha: 0.18 });
    this.vignette.rect(0, 26, W, 18).fill({ color: 0x0c0815, alpha: 0.1 });
    this.vignette.rect(0, H - 30, W, 30).fill({ color: 0x0c0815, alpha: 0.2 });
    this.vignette.rect(0, H - 52, W, 22).fill({ color: 0x0c0815, alpha: 0.1 });
    this.vignette.rect(0, 0, 22, H).fill({ color: 0x0c0815, alpha: 0.12 });
    this.vignette.rect(W - 22, 0, 22, H).fill({ color: 0x0c0815, alpha: 0.12 });
    this.addChild(this.vignette);

    // 5. HUD, Dialogue panel, and Overlays
    this.hud = new HUDView();
    this.dialogue = new DialogueView(W, H);
    this.overlay = new OverlayView();
    this.overlay.hide();

    this.addChild(this.hud, this.dialogue, this.overlay);

    // Bind debug utilities
    Object.defineProperty(window, "__game", {
      configurable: true,
      get: () => ({
        player: this.playerModel,
        enemies: this.enemies,
        mode: this.game.mode,
        wave: this.game.wave,
        score: this.game.score,
        pickups: this.pickups,
        bullets: this.bullets,
        breakables: this.crates,
        buffs: this.game.buffs,
        superMeter: this.game.super,
        scene: this,
      }),
    });

    // Start the game logic
    this.startGame();
  }

  onExit() {
    delete window.__game;
    super.onExit();
  }

  clearWorld() {
    this.actors.removeChildren().forEach((c) => c.destroy({ children: true, texture: false }));
    
    this.enemies = [];
    this.enemyViews.clear();
    this.crates = [];
    this.crateViews.clear();
    this.pickups = [];
    this.pickupViews.clear();
    this.bullets = [];
    this.bulletViews.clear();

    for (const fx of this.effects) {
      fx.g.destroy();
    }
    this.effects = [];
    this.popups = [];  // views already destroyed via removeChildren
    this.throws = [];

    // Rebuild environmental props (Ladas, Lamps, Bins)
    this.bg.buildProps(this.actors);
    // Fresh particle pool (old one died with the actors layer)
    this.particles = new ParticleSystem(this.actors);
    this.boundsGraphics = new Graphics();
    this.boundsGraphics.zIndex = 99999;
    this.actors.addChild(this.boundsGraphics);
    this.updateBoundsGuide();
  }

  startGame() {
    this.clearWorld();

    this.playerModel = new FighterModel({
      x: 300,
      y: 460,
      isPlayer: true,
      scale: 1.08,
      hp: 100,
      speed: BASE_SPEED,
      power: 1,
    });
    this.playerView = new FighterView("player", true, 1.08);
    this.actors.addChild(this.playerView);

    this.game.reset();
    this.overlay.hide();
    this.setChapterMood(1);

    this.showDialogue(STORY.intro, () => this.beginWave(1));
  }

  startEndless() {
    this.game.endless = true;
    this.overlay.hide();
    if (this.playerModel) {
      this.playerModel.hp = this.playerModel.maxHp;
    }
    this.beginWave(10);
  }

  showDialogue(lines, onDone) {
    this.game.mode = "dialogue";
    this.dialogue.show(lines, onDone);
  }

  beginWave(n) {
    this.game.wave = n;
    this.setChapterMood(chapterOf(Math.min(n, 9)));
    const pre = !this.game.endless && {
      3: STORY.pre3,
      6: STORY.pre6,
      9: STORY.pre9,
    }[n];

    if (pre) {
      this.showDialogue(pre, () => this.setBanner(n));
    } else {
      this.setBanner(n);
    }
  }

  setBanner(n) {
    this.game.mode = "banner";
    this.game.bannerTimer = 100;

    const boss = this.bossNameFor(n);
    const title = boss ? `ԱԼԻՔ ${n} · ${boss}` : `ԱԼԻՔ ${n} · WAVE ${n}`;
    const subTitle = this.game.endless || n > 9 ? "ENDLESS · ԱՆՎԵՐՋ" : CHAPTERS[chapterOf(n)];

    this.hud.showBannerText(title, subTitle, !!boss);
    sfx.wave();
  }

  bossNameFor(n) {
    if (n === 3) return "ԳԱԳՈ";
    if (n === 6) return "ՄԱԴՈ";
    if (n === 9) return "ՍԵՎ ՎԱՉՈ";
    if (n > 9 && n % 3 === 0) return "BOSS";
    return null;
  }

  fillSpawnQueue(n) {
    const types = ["thug1", "thug2", "thug3"];
    const bossName = this.bossNameFor(n);
    // gentler late-game curve: fewer thugs, slower damage growth
    const count = bossName ? 3 : Math.min(2 + Math.ceil(n * 0.7), 8);
    for (let i = 0; i < count; i++) {
      const cfg = {
        paletteKey: types[(i + n) % types.length],
        hp: 26 + n * 6,
        speed: 1.25 + Math.random() * 0.6 + n * 0.05,
        power: 0.5 + n * 0.045,
        scale: 0.98 + Math.random() * 0.1,
        aiCool: Math.max(45, 85 - n * 4),
      };
      // archetype mix-ins as the waves climb
      if (n >= 2 && i % 4 === 1) {
        cfg.archetype = "rusher";
        cfg.paletteKey = "thug3";
        cfg.speed = 2.2;
        cfg.hp = Math.round(cfg.hp * 0.8);
        cfg.lungeMul = 3.2;
        cfg.aiCool = 60;
      } else if (n >= 3 && i % 5 === 2) {
        cfg.archetype = "grappler";
        cfg.paletteKey = "thug1";
        cfg.scale = 1.16;
        cfg.speed = 1.1;
        cfg.hp = Math.round(cfg.hp * 1.5);
        cfg.power = cfg.power * 1.2;
        cfg.aiCool = 95;
      }
      this.game.spawnQueue.push(cfg);
    }
    // shielders: trash-lid tanks that must be flanked or floored
    if (n >= 5) {
      const num = n >= 8 ? 2 : 1;
      for (let i = 0; i < num; i++) {
        this.game.spawnQueue.push({
          paletteKey: "shielder",
          archetype: "shielder",
          hp: 30 + n * 7,
          speed: 1.2,
          power: 0.5 + n * 0.04,
          scale: 1.06,
          aiCool: 80,
        });
      }
    }

    if (n >= 4) {
      const gunners = Math.min(2, 1 + Math.floor((n - 4) / 4));
      for (let i = 0; i < gunners; i++) {
        this.game.spawnQueue.push({
          paletteKey: "gunner",
          hp: 24 + n * 6,
          speed: 1.5,
          power: 1,
          scale: 1,
          gunner: true,
        });
      }
    }

    if (bossName) {
      const bossCfg = {
        3: { paletteKey: "thug1", hp: 120, speed: 1.5, power: 0.95, scale: 1.18 },
        6: { paletteKey: "thug3", hp: 180, speed: 1.4, power: 1.05, scale: 1.24 },
        9: { paletteKey: "boss", hp: 280, speed: 1.3, power: 1.2, scale: 1.34 },
      }[n] || { paletteKey: "boss", hp: 160 + n * 20, speed: 1.25, power: 1.1 + n * 0.05, scale: 1.3 };
      this.game.spawnQueue.push({ ...bossCfg, boss: true, name: bossName, aiCool: 55 });
    }

    this.spawnCrates(n);
  }

  spawnCrates(n) {
    const num = 2 + (n % 2);
    for (let i = 0; i < num && this.crates.length < 4; i++) {
      const x = Math.max(80, Math.min(WORLD_W - 80, this.game.camX + 100 + Math.random() * (W - 200)));
      const y = this.floorTop + 14 + Math.random() * (this.floorBottom - this.floorTop - 28);
      
      const model = new CrateModel({ x, y });
      const view = new CrateView();

      this.crates.push(model);
      this.crateViews.set(model, view);
      this.actors.addChild(view);
    }
  }

  spawnEnemy(cfg) {
    const fromLeft = Math.random() < 0.5;
    let x = fromLeft ? this.game.camX - 70 : this.game.camX + W + 70;
    x = Math.max(-80, Math.min(WORLD_W + 80, x));
    const y = this.floorTop + 10 + Math.random() * (this.floorBottom - this.floorTop - 20);

    const model = new FighterModel({
      x,
      y,
      hp: cfg.hp,
      speed: cfg.speed,
      power: cfg.power,
      scale: cfg.scale,
    });
    model.boss = !!cfg.boss;
    model.bossName = cfg.name || null;
    model.gunner = !!cfg.gunner;
    model.archetype = cfg.archetype || null;
    model.lungeMul = cfg.lungeMul || 1;
    model.aiCool = cfg.aiCool;
    model.shootCd = 60 + Math.random() * 60;
    if (model.archetype === "shielder") {
      model.setWeapon({ kind: "lid", def: { melee: false, label: "ԿԱՓԱԿ" } });
    }

    const view = new FighterView(cfg.paletteKey, false, cfg.scale, cfg.name);

    this.enemies.push(model);
    this.enemyViews.set(model, view);
    this.actors.addChild(view);
    return model;
  }

  spawnCustomEnemy(cfg = {}, x = null, y = null) {
    if (x === null || x === undefined) {
      x = this.playerModel ? this.playerModel.x + (Math.random() < 0.5 ? -140 : 140) : this.game.camX + W / 2;
    }
    if (y === null || y === undefined) {
      y = this.playerModel ? this.playerModel.y : this.floorTop + 50;
    }
    x = Math.max(30, Math.min(WORLD_W - 30, x));
    y = Math.max(this.floorTop + 5, Math.min(this.floorBottom - 5, y));

    const model = new FighterModel({
      x,
      y,
      hp: cfg.hp || (cfg.archetype === "dummy" ? 500 : 50),
      speed: cfg.speed !== undefined ? cfg.speed : (cfg.archetype === "dummy" ? 0 : 1.8),
      power: cfg.power || 1.0,
      scale: cfg.scale || 1.0,
    });
    model.boss = !!cfg.boss;
    model.bossName = cfg.name || (cfg.boss ? "BOSS" : cfg.archetype === "dummy" ? "SANDBAG" : null);
    model.gunner = !!cfg.gunner;
    model.dummy = !!cfg.dummy || cfg.archetype === "dummy";
    model.archetype = cfg.archetype || null;
    model.lungeMul = cfg.lungeMul || (cfg.archetype === "rusher" ? 3.2 : 1);
    model.aiCool = cfg.aiCool || (cfg.archetype === "grappler" ? 95 : 60);
    model.shootCd = 60 + Math.random() * 60;
    model.weaponScale = cfg.weaponScale || 1.0;

    if (cfg.weapon && cfg.weapon !== "none") {
      const def = WEAPONS[cfg.weapon] || { melee: true, label: cfg.weapon };
      model.setWeapon({ kind: cfg.weapon, def, scale: model.weaponScale });
    } else if (model.archetype === "shielder") {
      model.setWeapon({ kind: "lid", def: { melee: false, label: "ԿԱՓԱԿ" }, scale: model.weaponScale });
    }

    const paletteKey = cfg.paletteKey || (cfg.boss ? "boss" : cfg.gunner ? "gunner" : cfg.archetype === "shielder" ? "shielder" : "thug1");
    const view = new FighterView(paletteKey, false, cfg.scale || 1.0, model.bossName || "");

    if (model.weapon) {
      view.setWeaponScale(model.weaponScale);
      view.setWeaponGraphic(model.weapon);
    }

    this.enemies.push(model);
    this.enemyViews.set(model, view);
    this.actors.addChild(view);
    return model;
  }

  removeEnemy(enemyModel) {
    if (!enemyModel) return;
    const view = this.enemyViews.get(enemyModel);
    if (view) {
      view.destroy({ children: true, texture: false });
      this.enemyViews.delete(enemyModel);
    }
    const idx = this.enemies.indexOf(enemyModel);
    if (idx !== -1) {
      this.enemies.splice(idx, 1);
    }
  }

  clearAllEnemies() {
    for (const e of [...this.enemies]) {
      this.removeEnemy(e);
    }
  }

  killAllEnemies() {
    for (const e of [...this.enemies]) {
      if (e.alive) {
        e.hp = 0;
        e.applyHit(999, 1, 10, true);
        this.onKill(e);
      }
    }
  }

  spawnCustomCrate(x = null, y = null) {
    if (x === null || x === undefined) {
      x = this.playerModel ? this.playerModel.x + 80 : this.game.camX + 300;
    }
    if (y === null || y === undefined) {
      y = this.playerModel ? this.playerModel.y : this.floorTop + 40;
    }
    x = Math.max(40, Math.min(WORLD_W - 40, x));
    y = Math.max(this.floorTop + 10, Math.min(this.floorBottom - 10, y));

    const model = new CrateModel({ x, y });
    const view = new CrateView();
    this.crates.push(model);
    this.crateViews.set(model, view);
    this.actors.addChild(view);
    return model;
  }

  removeCrate(crateModel) {
    if (!crateModel) return;
    const view = this.crateViews.get(crateModel);
    if (view) {
      view.destroy({ children: true, texture: false });
      this.crateViews.delete(crateModel);
    }
    const idx = this.crates.indexOf(crateModel);
    if (idx !== -1) {
      this.crates.splice(idx, 1);
    }
  }

  clearAllCrates() {
    for (const c of [...this.crates]) {
      const view = this.crateViews.get(c);
      if (view) {
        view.destroy({ children: true, texture: false });
        this.crateViews.delete(c);
      }
    }
    this.crates = [];
  }

  spawnCustomPickup(type = "shawarma", x = null, y = null) {
    if (x === null || x === undefined) {
      x = this.playerModel ? this.playerModel.x + 60 : this.game.camX + 250;
    }
    if (y === null || y === undefined) {
      y = this.playerModel ? this.playerModel.y : this.floorTop + 40;
    }
    x = Math.max(40, Math.min(WORLD_W - 40, x));
    y = Math.max(this.floorTop + 10, Math.min(this.floorBottom - 10, y));

    const model = new PickupModel({ x, y, type });
    const view = new PickupView(type);
    this.pickups.push(model);
    this.pickupViews.set(model, view);
    this.actors.addChild(view);
    return model;
  }

  removePickup(pickupModel) {
    if (!pickupModel) return;
    const view = this.pickupViews.get(pickupModel);
    if (view) {
      view.destroy({ children: true, texture: false });
      this.pickupViews.delete(pickupModel);
    }
    const idx = this.pickups.indexOf(pickupModel);
    if (idx !== -1) {
      this.pickups.splice(idx, 1);
    }
  }

  clearAllPickups() {
    for (const p of [...this.pickups]) {
      const view = this.pickupViews.get(p);
      if (view) {
        view.destroy({ children: true, texture: false });
        this.pickupViews.delete(p);
      }
    }
    this.pickups = [];
  }

  setWave(n) {
    this.clearAllEnemies();
    this.game.spawnQueue = [];
    this.beginWave(n);
  }

  spawnSpark(x, y, big = false, color = null) {
    const g = new Graphics();
    const r = big ? 16 : 10;
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 + Math.random() * 0.5;
      g.moveTo(Math.cos(a) * 3, Math.sin(a) * 3)
       .lineTo(Math.cos(a) * r, Math.sin(a) * r)
       .stroke({ width: 3, color: color || (big ? 0xffb347 : 0xffe7b0) });
    }
    g.position.set(x, y);
    g.zIndex = 9999;
    this.actors.addChild(g);
    this.effects.push({ g, life: 9 });
  }

  spawnPopup(x, y, text, color, size = 15) {
    const t = new Text({
      text,
      style: {
        fontFamily: ARM_FONT, fontSize: size, fill: color, fontWeight: "900",
        stroke: { color: 0x120d1d, width: 3 }, letterSpacing: 0.5,
      },
    });
    t.anchor.set(0.5);
    t.position.set(x, y);
    t.zIndex = 10000;
    this.actors.addChild(t);
    this.popups.push({ t, life: 42 });
  }

  updatePopups(dt) {
    for (let i = this.popups.length - 1; i >= 0; i--) {
      const p = this.popups[i];
      p.life -= dt;
      p.t.y -= 1.1 * dt;
      p.t.alpha = Math.min(1, p.life / 20);
      if (p.life <= 0) {
        p.t.destroy();
        this.popups.splice(i, 1);
      }
    }
  }

  throwWeapon() {
    const p = this.playerModel;
    const w = p.weapon;
    if (!w || p.z > 0) return;
    if (p.state !== "idle" && p.state !== "walk") return;
    const meta = { uses: w.uses, ammo: w.ammo };
    p.setWeapon(null);

    const view = new PickupView(w.kind);
    view.shadow.visible = false;
    view.zIndex = 9998;
    this.actors.addChild(view);
    this.throws.push({
      x: p.x + p.facing * 24,
      prevX: p.x + p.facing * 24,
      gy: p.y,
      ry: p.y - 50 * p.scaleF,
      vx: p.facing * 8,
      life: 46,
      type: w.kind,
      meta,
      view,
    });
    sfx.swing();
    // throwing recoil pose, no melee hit attached
    p.state = "attack";
    p.attackKind = "punch";
    p.attackTimer = 0;
    p.hitDone = true;
  }

  updateThrows(dt) {
    for (let i = this.throws.length - 1; i >= 0; i--) {
      const th = this.throws[i];
      const prevX = th.prevX !== undefined ? th.prevX : th.x;
      th.prevX = th.x;
      th.x += th.vx * dt;
      th.life -= dt;
      th.view.x = th.x;
      th.view.y = th.ry;
      th.view.icon.rotation += 0.38 * dt * Math.sign(th.vx);

      let stopped = th.life <= 0;
      if (!stopped) {
        const minX = Math.min(prevX, th.x) - 16;
        const maxX = Math.max(prevX, th.x) + 16;
        for (const t of this.enemies) {
          if (!t.vulnerable || t.z > 22 * t.scaleF) continue;
          if (t.x >= minX && t.x <= maxX && Math.abs(t.y - th.gy) <= PROJECTILE_DEPTH_BAND) {
            const wDef = WEAPONS[th.type];
            const dmg = wDef ? wDef.throwDmg : 14;
            const killed = t.applyHit(dmg, Math.sign(th.vx), 7, th.type !== "pistol");
            this.spawnPopup(t.x, t.y - 75 * t.scaleF, `-${dmg}`, 0xffe7b0);
            this.spawnSpark(th.x, th.ry, true, th.type === "bottle" ? 0x9fe8d8 : 0xffb347);
            if (th.type === "bottle") {
              if (sfx.glassBreak) sfx.glassBreak(); else sfx.hit();
            } else {
              if (sfx.heavyHit) sfx.heavyHit(); else sfx.hit();
            }
            this.game.combo++;
            this.game.comboTimer = 110;
            this.game.score += 20;
            this.game.super = Math.min(100, this.game.super + 6);
            if (killed) this.onKill(t);
            stopped = true;
            break;
          }
        }
      }
      if (!stopped) {
        const minX = Math.min(prevX, th.x) - 18;
        const maxX = Math.max(prevX, th.x) + 18;
        for (const c of this.crates) {
          if (c.x >= minX && c.x <= maxX && Math.abs(c.y - th.gy) <= PROJECTILE_DEPTH_BAND) {
            this.hitCrate(c, 2);
            stopped = true;
            break;
          }
        }
      }
      if (stopped) {
        th.view.destroy({ children: true, texture: false });
        if (WEAPONS[th.type] && WEAPONS[th.type].shatter) {
          // bottles never survive a flight
          this.spawnSpark(th.x, th.gy - 18, true, 0x9fe8d8);
          this.particles.glass(th.x, th.gy - 18);
        } else {
          this.spawnPickup(th.x, th.gy, th.type, th.meta);
        }
        this.throws.splice(i, 1);
      }
    }
  }

  fireBullet(owner, dir) {
    const ry = owner.y - 52 * owner.scaleF;
    const bulletX = owner.x + dir * 26;
    const dmg = owner.isPlayer ? 24 : 9;

    const model = new BulletModel({
      x: bulletX,
      gy: owner.y,
      ry,
      vx: dir * 9.5,
      dmg,
      fromPlayer: owner.isPlayer,
    });

    const view = new BulletView();
    this.bullets.push(model);
    this.bulletViews.set(model, view);
    this.actors.addChild(view);

    this.spawnSpark(owner.x + dir * 30, ry, false, 0xfff3c0);
    sfx.gunshot();

    // Reset firing recoil pose
    owner.state = "attack";
    owner.attackKind = "punch";
    owner.attackTimer = 0;
    owner.hitDone = true;
  }

  updateBullets(dt) {
    for (let i = this.bullets.length - 1; i >= 0; i--) {
      const b = this.bullets[i];
      b.update(dt, this.game.camX);

      let dead = b.removed;
      if (!dead) {
        const targets = b.fromPlayer
          ? this.enemies.filter((e) => e.vulnerable)
          : (this.playerModel && this.playerModel.vulnerable ? [this.playerModel] : []);

        const minX = Math.min(b.prevX, b.x) - 12;
        const maxX = Math.max(b.prevX, b.x) + 12;

        for (const t of targets) {
          if (t.z > 20 * t.scaleF) continue; // Jumped over bullet
          if (t.x >= minX && t.x <= maxX && Math.abs(t.y - b.gy) <= PROJECTILE_DEPTH_BAND) {
            let blocked = false;
            const bulletDir = Math.sign(b.vx);
            if (t.isPlayer && t.weapon && t.weapon.kind === "lid" && (bulletDir !== t.facing)) {
              blocked = true;
            } else if (!t.isPlayer && t.archetype === "shielder" && (bulletDir !== t.facing)) {
              blocked = true;
            }

            const killed = t.applyHit(blocked ? 2 : b.dmg, bulletDir, blocked ? 2 : 5);
            if (blocked) {
              this.spawnSpark(b.x, b.ry, false, 0xb9c2cc);
              this.spawnPopup(t.x, t.y - 75 * t.scaleF, "ԿԼԱՆԿ!", 0xb9c2cc);
              if (sfx.clang) sfx.clang(); else sfx.hit();
            } else {
              this.spawnSpark(b.x, b.ry, false);
              this.spawnPopup(t.x, t.y - 75 * t.scaleF, `-${b.dmg}`, b.fromPlayer ? 0xffe7b0 : 0xff6a5e);
              if (sfx.heavyHit) sfx.heavyHit(); else sfx.hit();
            }
            if (b.fromPlayer) {
              this.game.combo++;
              this.game.comboTimer = 110;
              this.game.score += 20;
              this.game.super = Math.min(100, this.game.super + 6);
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
        const minX = Math.min(b.prevX, b.x) - 14;
        const maxX = Math.max(b.prevX, b.x) + 14;
        for (const c of this.crates) {
          if (c.x >= minX && c.x <= maxX && Math.abs(c.y - b.gy) <= PROJECTILE_DEPTH_BAND) {
            this.hitCrate(c, 2);
            dead = true;
            b.removed = true;
            break;
          }
        }
      }

      if (dead) {
        const view = this.bulletViews.get(b);
        if (view) {
          view.destroy({ children: true, texture: false });
          this.bulletViews.delete(b);
        }
        this.bullets.splice(i, 1);
      }
    }
  }

  spawnPickup(x, y, type, meta = null) {
    // keep loot reachable: clamp into the walkable strip
    x = Math.max(40, Math.min(WORLD_W - 40, x));
    y = Math.max(FLOOR_TOP, Math.min(FLOOR_BOTTOM, y));
    const model = new PickupModel({ x, y, type, meta });
    const view = new PickupView(type);

    this.pickups.push(model);
    this.pickupViews.set(model, view);
    this.actors.addChild(view);
  }

  applyPickup(p) {
    const pm = this.playerModel;
    const px = pm.x, py = pm.y - 95 * pm.scaleF;
    switch (p.type) {
      case "shawarma":
        pm.hp = Math.min(pm.maxHp, pm.hp + 30);
        this.spawnPopup(px, py, "+30", 0x7ec850);
        break;
      case "khorovats":
        pm.hp = pm.maxHp;
        this.spawnPopup(px, py, "ԽՈՐՈՎԱԾ · FULL HP", 0x7ec850);
        break;
      case "tan":
        this.game.buffs.speed = 600;
        this.spawnPopup(px, py, "ԹԱՆ · SPEED", 0x9fd8ff);
        break;
      case "cognac":
        this.game.buffs.rage = 480;
        this.spawnPopup(px, py, "ԿՈՆՅԱԿ · RAGE x2", 0xffb347);
        break;
      case "coin":
        this.game.score += 75;
        this.spawnPopup(px, py, "+75", 0xd4af37);
        break;
      case "medal":
        this.game.score += 500;
        this.spawnPopup(px, py, "ՄԵԴԱԼԸ! +500", 0xd4af37, 18);
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
        this.spawnPopup(px, py, def.label, 0xe8cf9e);
        break;
      }
    }
    if (p.type === "coin") {
      sfx.coin();
    } else {
      sfx.pickup();
    }
    return true;
  }

  lootRoll() {
    const r = Math.random();
    if (r < 0.28) return "shawarma";
    if (r < 0.46) return "coin";
    if (r < 0.6) return "stick";
    if (r < 0.7) return "bottle";
    if (r < 0.8) return "tan";
    if (r < 0.88) return "khorovats";
    if (r < 0.95) return "cognac";
    return "pistol";
  }

  // ԿԱՅԾԱԿ: whirlwind super — costs a full meter, clears the space around Davo
  trySuper() {
    const p = this.playerModel;
    if (this.game.super < 100 || !p || !p.alive || p.z > 0) return;
    if (p.state !== "idle" && p.state !== "walk") return;
    this.game.super = 0;
    p.superSpin = 20;
    p.invul = Math.max(p.invul, 26);
    this.game.shake = 16;
    this.hitstop = 5;
    this.spawnPopup(p.x, p.y - 120 * p.scaleF, "ԿԱՅԾԱԿ!", 0xffe14a, 22);
    this.particles.burst(p.x, p.y - 40, true);
    sfx.super();
    for (const e of this.enemies) {
      if (!e.alive) continue;
      const dx = e.x - p.x;
      if (Math.abs(dx) > 160 * p.scaleF || Math.abs(e.y - p.y) > 42 * p.scaleF) continue;
      if (e.z > 40 * e.scaleF) continue;
      e.invul = 0; // the storm respects no block
      if (!e.vulnerable) continue; // ...but grounded knockdowns stay safe
      const killed = e.applyHit(Math.round(38 * p.power), Math.sign(dx) || 1, 11, true);
      this.spawnPopup(e.x, e.y - 75 * e.scaleF, "-38", 0xffe14a);
      this.particles.burst(e.x, e.y - 35 * e.scaleF);
      if (killed) this.onKill(e);
    }
  }

  onKill(t) {
    this.game.score += 100 + this.game.wave * 20 + (t.boss ? 300 : 0);
    this.game.shake = t.boss ? 14 : 7;
    this.particles.burst(t.x, t.y - 40, t.boss);
    if (t.boss) this.game.zoomPunch = 14; // cinematic zoom kick
    if (t.gunner) {
      // their pistol survives with whatever they hadn't fired yet
      this.spawnPickup(t.x, t.y, "pistol", { ammo: 3 + Math.floor(Math.random() * 4) });
    } else if (t.boss && this.game.wave === 9 && !this.game.endless) {
      this.spawnPickup(t.x, t.y, "medal");
    } else if (Math.random() < Math.min(0.45, 0.28 + this.game.wave * 0.02) || t.boss) {
      // food gets more common as the hood gets meaner
      this.spawnPickup(t.x, t.y, this.lootRoll());
    }
  }

  hitCrate(c, dmg) {
    const broken = c.hit(dmg);
    this.spawnSpark(c.x, c.y - 16, false, 0xd9b380);
    this.particles.debris(c.x, c.y);
    if (broken) {
      sfx.crateBreak();
      const view = this.crateViews.get(c);
      if (view) {
        view.destroy({ children: true, texture: false });
        this.crateViews.delete(c);
      }
      this.crates.splice(this.crates.indexOf(c), 1);
      this.spawnPickup(c.x, c.y, this.lootRoll());
    } else {
      sfx.hit();
    }
  }

  resolveBodyCollisions() {
    const fighters = this.playerModel && this.playerModel.alive
      ? [this.playerModel, ...this.enemies]
      : [...this.enemies];

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

  resolveHits() {
    const all = [this.playerModel, ...this.enemies];
    for (const atk of all) {
      if (!atk || (atk.state !== "attack" && !atk.airKick)) continue;
      const hit = atk.getActiveHit();
      if (!hit) continue;

      const targets = atk.isPlayer ? this.enemies : [this.playerModel];
      let landed = false;
      for (const t of targets) {
        if (!t || !t.vulnerable) continue;

        // 1. Z-axis (vertical / jump height) check:
        // Ground attacks cannot hit airborne jumping targets, and airborne attacks must match height
        if (atk.airKick) {
          // Dropkick connects while kicker is within the vertical span of target
          if (atk.z < t.z - 8 * atk.scaleF || atk.z > t.z + 65 * t.scaleF) continue;
        } else if (atk.z > 6) {
          // Jumping punch/kick connects only if target is at similar airborne altitude
          if (Math.abs(t.z - atk.z) > 22 * atk.scaleF) continue;
        } else {
          // Ground attack: target must be grounded (cannot punch airborne targets jumping over)
          if (t.z > 18 * t.scaleF) continue;
        }

        // 2. Depth / Y-lane alignment check (both fighters must be on the same horizontal lane)
        const extraLane = (hit.weapon && hit.weapon.kind === "stick") ? 6 : 0;
        const maxLaneDist = (COMBAT_DEPTH_BAND + extraLane) * Math.min(atk.scaleF, t.scaleF);
        if (Math.abs(t.y - atk.y) > maxLaneDist) continue;
        
        // 3. Forward reach check (target must be in front and within strike reach)
        const tRadius = t.hurtbox ? t.hurtbox.rx : 16 * t.scaleF;
        const dx = (t.x - atk.x) * atk.facing;
        if (dx < -tRadius * 0.5 || dx > hit.range + tRadius * 0.8) continue;

        // Knockdown calculations
        let kd = hit.knockdown;
        if (!kd && atk.isPlayer) {
          if (hit.kind === "kick" && Math.random() < 0.35) kd = true;
          if (hit.kind === "hook" && Math.random() < 0.6) kd = true;
          if (hit.weapon && hit.weapon.kind === "stick" && Math.random() < 0.5) kd = true;
        } else if (!kd && !atk.isPlayer) {
          if (atk.archetype === "grappler") kd = true; // the bear hug always slams
          else if (atk.boss && Math.random() < 0.5) kd = true;
          else if (hit.kind === "kick" && Math.random() < 0.18) kd = true;
        }
        if (kd && t.boss && Math.random() < 0.6) kd = false;

        // shielders or fighters equipped with a trash lid block frontal hits
        let dmg = hit.dmg;
        let blocked = false;
        const hasShield = t.archetype === "shielder" || (t.weapon && t.weapon.def && t.weapon.def.shield);
        if (hasShield && t.state !== "down" && t.facing === -atk.facing) {
          dmg = Math.max(1, Math.round(dmg * 0.25));
          kd = false;
          blocked = true;
          if (t.isPlayer && t.weapon) {
            t.weapon.uses--;
            if (t.weapon.uses <= 0) {
              this.spawnSpark(t.x, t.y - 40 * t.scaleF, true, 0xb9c2cc);
              t.setWeapon(null);
            }
          }
        }

        atk.hitDone = true;
        landed = true;

        const killed = t.applyHit(dmg, atk.facing, blocked ? 2 : hit.kb, kd);
        const hitX = (atk.x + t.x) / 2;
        const hitY = t.y - 42 * t.scaleF;
        if (blocked) {
          this.spawnSpark(hitX, hitY, false, 0xb9c2cc);
          this.spawnPopup(t.x, t.y - 75 * t.scaleF, "ԿԼԱՆԿ!", 0xb9c2cc);
          if (sfx.clang) sfx.clang(); else sfx.hit();
          this.hitstop = 3;
        } else {
          this.spawnSpark(hitX, hitY, hit.kind !== "punch");
          this.spawnPopup(
            t.x, t.y - 75 * t.scaleF, `-${dmg}`,
            atk.isPlayer ? (hit.kind === "punch" ? 0xffe7b0 : 0xffb347) : 0xff6a5e
          );
          if (hit.kind === "kick" || hit.weapon || atk.boss) {
            if (sfx.heavyHit) sfx.heavyHit(); else sfx.hit();
          } else {
            sfx.hit();
          }
          this.hitstop = hit.kind === "punch" ? 2.5 : 4;
        }
        this.particles.puff(hitX, hitY);

        // landing hits charges the ԿԱՅԾԱԿ meter
        if (atk.isPlayer) {
          this.game.super = Math.min(100, this.game.super + (hit.kind === "punch" ? 5 : 7));
        }

        // getting floored knocks the weapon out of your hands
        if (t.isPlayer && t.state === "down" && t.weapon) {
          const w = t.weapon;
          this.spawnPickup(t.x + atk.facing * 38, t.y + 6, w.kind, { uses: w.uses, ammo: w.ammo });
          t.setWeapon(null);
        }

        if (atk.isPlayer) {
          this.game.combo++;
          this.game.comboTimer = 110;
          this.game.score += hit.kind === "kick" ? 15 : 10;
          if (hit.weapon) {
            hit.weapon.uses--;
            if (hit.weapon.uses <= 0) {
              this.spawnSpark(t.x, t.y - 40 * t.scaleF, true, 0xd9b380);
              if (hit.weapon.kind === "bottle") {
                if (sfx.glassBreak) sfx.glassBreak(); else sfx.hit();
              } else {
                if (sfx.crateBreak) sfx.crateBreak(); else sfx.hit();
              }
              atk.setWeapon(null);
            }
          }
          if (killed) this.onKill(t);
        } else if (killed) {
          this.game.shake = 12;
        }
        break;
      }

      // Check crates
      if (!landed && atk.isPlayer) {
        for (const c of this.crates) {
          const maxLaneDist = COMBAT_DEPTH_BAND * atk.scaleF;
          if (Math.abs(c.y - atk.y) > maxLaneDist) continue;
          if (atk.z > 24 * atk.scaleF) continue;
          const dx = (c.x - atk.x) * atk.facing;
          if (dx < -8 * atk.scaleF || dx > hit.range + 16 * atk.scaleF) continue;
          atk.hitDone = true;
          this.hitCrate(c, 1);
          break;
        }
      }
    }
  }

  updateCamera(dt) {
    if (this.playerModel) {
      const target = Math.max(0, Math.min(WORLD_W - W, this.playerModel.x - W / 2));
      this.game.camX += (target - this.game.camX) * Math.min(1, 0.12 * dt);
    }

    let ox = 0, oy = 0;
    if (this.game.shake > 0) {
      this.game.shake -= dt;
      ox = (Math.random() - 0.5) * this.game.shake;
      oy = (Math.random() - 0.5) * this.game.shake * 0.6;
    }

    // zoom kick on boss KOs, decaying back to 1×
    let zoom = 1;
    if (this.game.zoomPunch > 0) {
      this.game.zoomPunch -= dt;
      zoom = 1 + Math.max(0, this.game.zoomPunch) * 0.006;
    }
    // pivot-based transform: equivalent to world.x = -camX at zoom 1,
    // but scales around the center of the action when zoom kicks in
    this.world.pivot.set(this.game.camX + W / 2, 420);
    this.world.position.set(W / 2 + ox, 420 + oy);
    this.world.scale.set(zoom);

    // Scroll backgrounds
    this.bg.updateCamera(this.game.camX);
  }

  updatePickups(dt) {
    for (let i = this.pickups.length - 1; i >= 0; i--) {
      const p = this.pickups[i];
      p.update(dt);

      if (this.playerModel && this.playerModel.alive && Math.abs(this.playerModel.x - p.x) < 30 && Math.abs(this.playerModel.y - p.y) < 24) {
        if (this.applyPickup(p)) {
          p.removed = true;
          const view = this.pickupViews.get(p);
          if (view) {
            view.destroy({ children: true, texture: false });
            this.pickupViews.delete(p);
          }
          this.pickups.splice(i, 1);
        }
      }
    }
  }

  updateEffects(dt) {
    for (let i = this.effects.length - 1; i >= 0; i--) {
      const fx = this.effects[i];
      fx.life -= dt;
      fx.g.alpha = fx.life / 9;
      fx.g.scale.set(1 + (1 - fx.life / 9) * 0.8);
      if (fx.life <= 0) {
        fx.g.destroy();
        this.effects.splice(i, 1);
      }
    }
  }

  setChapterMood(ch) {
    this.grade.reset();
    if (ch === 2) {
      this.moodTint.tint = 0x101a4a;
      this.moodTint.alpha = 0.22;
      // night: desaturated, slightly darker
      this.grade.saturate(-0.22, true);
      this.grade.brightness(0.94, true);
    } else if (ch === 3) {
      this.moodTint.tint = 0xff8c42;
      this.moodTint.alpha = 0.1;
      // dawn: punchy and golden
      this.grade.saturate(0.15, true);
      this.grade.brightness(1.05, true);
    } else {
      this.moodTint.alpha = 0;
      this.grade.saturate(0.05, true);
    }
  }

  onWaveCleared() {
    const w = this.game.wave;
    const pm = this.playerModel;
    if (pm) {
      const bossWave = !!this.bossNameFor(w);
      if (bossWave) {
        // River City Ransom-style growth: beating a boss toughens you up
        pm.maxHp += 10;
        pm.hp = Math.min(pm.maxHp, pm.hp + 50);
        this.spawnPopup(pm.x, pm.y - 110 * pm.scaleF, "MAX HP +10", 0x7ec850, 18);
      } else {
        pm.hp = Math.min(pm.maxHp, pm.hp + 35);
        this.spawnPopup(pm.x, pm.y - 95 * pm.scaleF, "+35", 0x7ec850);
      }
    }
    
    const post = !this.game.endless && {
      3: STORY.post3,
      6: STORY.post6,
    }[w];

    if (!this.game.endless && w === 9) {
      this.showDialogue(STORY.ending, () => this.showVictory());
    } else if (post) {
      this.showDialogue(post, () => this.beginWave(w + 1));
    } else {
      this.beginWave(w + 1);
    }
  }

  showGameOver() {
    this.game.mode = "gameover";
    this.overlay.showGameOver(this.game.score, this.game.wave);
  }

  showVictory() {
    this.game.mode = "victory";
    this.overlay.showVictory(this.game.score);
  }

  update(dt) {
    this.frame += dt;

    let dialogueJustClosed = false;
    if (this.game.mode === "dialogue") {
      this.dialogue.update(dt);
      if (this.app.input.isPressed("Space", "Enter", "KeyJ", "KeyZ", "KeyK")) {
        this.dialogue.advance();
        dialogueJustClosed = this.game.mode !== "dialogue";
      }
    }

    // NOTE: the key that closed the dialogue is still "just pressed" this frame;
    // without this guard, Enter on the ending's last line would skip straight past victory.
    if (!dialogueJustClosed) {
      if (this.game.mode === "gameover") {
        if (this.app.input.isPressed("KeyR", "Enter")) {
          this.startGame();
        }
      } else if (this.game.mode === "victory") {
        if (this.app.input.isPressed("Enter")) {
          this.startEndless();
        } else if (this.app.input.isPressed("KeyR")) {
          this.startGame();
        }
      }
    }

    if (this.game.mode === "banner" || this.game.mode === "playing" || this.game.mode === "gameover") {
      if (this.hitstop > 0) {
        this.hitstop -= dt;
      } else {
        if (this.game.mode === "banner") {
          this.game.bannerTimer -= dt;
          if (this.game.bannerTimer <= 0) {
            this.fillSpawnQueue(this.game.wave);
            this.game.mode = "playing";
          }
        }

        // 1. Process player controls
        if (this.playerModel && this.playerModel.alive && this.game.mode === "playing") {
          const mx = (this.app.input.isDown("KeyD", "ArrowRight") ? 1 : 0) - (this.app.input.isDown("KeyA", "ArrowLeft") ? 1 : 0);
          const my = (this.app.input.isDown("KeyS", "ArrowDown") ? 1 : 0) - (this.app.input.isDown("KeyW", "ArrowUp") ? 1 : 0);
          this.playerModel.setMove(mx, my);

          if (this.app.input.isPressed("Space")) {
            this.playerModel.jump();
          } else if (this.app.input.isPressed("KeyJ", "KeyZ")) {
            const w = this.playerModel.weapon;
            if (this.playerModel.z > 0) {
              this.playerModel.tryAirKick();
            } else if (w && w.kind === "pistol") {
              if (this.playerModel.state === "idle" || this.playerModel.state === "walk") {
                this.fireBullet(this.playerModel, this.playerModel.facing);
                w.ammo--;
                if (w.ammo <= 0) this.playerModel.setWeapon(null);
              }
            } else {
              this.playerModel.tryAttack("punch");
            }
          } else if (this.app.input.isPressed("KeyK", "KeyX")) {
            if (this.playerModel.z > 0) this.playerModel.tryAirKick();
            else this.playerModel.tryAttack("kick");
          } else if (this.app.input.isPressed("KeyE")) {
            this.throwWeapon();
          } else if (this.app.input.isPressed("KeyL", "ShiftLeft", "ShiftRight")) {
            if (this.playerModel.tryRoll()) {
              this.particles.dust(this.playerModel.x, this.playerModel.y, 4);
              sfx.swing();
            }
          } else if (this.app.input.isPressed("KeyU")) {
            this.trySuper();
          }
        }

        // 2. Sync player buffs
        if (this.playerModel) {
          if (this.game.buffs.speed > 0) this.game.buffs.speed -= dt;
          if (this.game.buffs.rage > 0) this.game.buffs.rage -= dt;
          
          this.playerModel.speed = BASE_SPEED * (this.game.buffs.speed > 0 ? 1.5 : 1);
          this.playerModel.power = this.game.buffs.rage > 0 ? 2 : 1;
        }

        // 3. Spawning
        if (this.game.mode === "playing" && this.game.spawnQueue.length > 0) {
          this.game.spawnTimer -= dt;
          const aliveCount = this.enemies.filter((e) => e.alive).length;
          const aliveCap = this.game.wave >= 7 ? 5 : 4;
          if (this.game.spawnTimer <= 0 && aliveCount < aliveCap) {
            this.spawnEnemy(this.game.spawnQueue.shift());
            this.game.spawnTimer = 30;
          }
        }

        // 4. Update models
        if (this.playerModel) {
          this.playerModel.update(dt);
          if (this.playerModel.x <= 30) {
            this.playerModel.x = 30;
            if (this.playerModel.kbX < 0) {
              this.playerModel.kbX = 0;
              this.particles.dust(this.playerModel.x, this.playerModel.y, 4);
              this.game.shake = Math.max(this.game.shake, 4);
            }
          } else if (this.playerModel.x >= WORLD_W - 30) {
            this.playerModel.x = WORLD_W - 30;
            if (this.playerModel.kbX > 0) {
              this.playerModel.kbX = 0;
              this.particles.dust(this.playerModel.x, this.playerModel.y, 4);
              this.game.shake = Math.max(this.game.shake, 4);
            }
          }
          this.playerModel.y = Math.max(this.floorTop, Math.min(this.floorBottom, this.playerModel.y));
        }

        const minEnemyX = Math.max(10, this.game.camX - 35);
        const maxEnemyX = Math.min(WORLD_W - 10, this.game.camX + W + 35);

        for (const e of this.enemies) {
          e.updateAI(dt, this.playerModel, this.enemies);
          
          // Trigger gunner shot
          if (e.triggerShoot) {
            e.triggerShoot = false;
            this.fireBullet(e, e.facing);
          }

          e.update(dt);
          if (e.x < minEnemyX) {
            e.x = minEnemyX;
            if (e.kbX < 0) e.kbX = 0;
          } else if (e.x > maxEnemyX) {
            e.x = maxEnemyX;
            if (e.kbX > 0) e.kbX = 0;
          }
          e.y = Math.max(this.floorTop, Math.min(this.floorBottom, e.y));
        }

        // Apply physical 2.5D body separation
        this.resolveBodyCollisions();

        // Atmosphere & feedback driven by fighter physics
        const lampProps = this.bg?.propsList?.filter((p) => p.type === "lamp") || [];
        const LAMPS = lampProps.length > 0 ? lampProps.map((p) => p.x) : [180, 980, 1780, 2580];
        const allFighters = this.playerModel ? [this.playerModel, ...this.enemies] : this.enemies;
        for (const f of allFighters) {
          // warm pool of light when standing near a street lamp
          let nearest = 1e9;
          for (const lx of LAMPS) nearest = Math.min(nearest, Math.abs(f.x - lx));
          f.lampGlow = Math.max(0, 1 - nearest / 150);
          // landing dust (jumps, knockdowns, deaths from height)
          if (f.justLanded > 8) this.particles.dust(f.x, f.y, 6);
        }
        // running kicks up dust
        if (this.playerModel && this.playerModel.state === "walk" && this.playerModel.z === 0 && Math.floor(this.frame) % 11 === 0) {
          this.particles.dust(this.playerModel.x - this.playerModel.facing * 10, this.playerModel.y, 1);
        }
        // boss enrage at half health
        for (const e of this.enemies) {
          if (e.boss && e.alive && !e.enraged && e.hp < e.maxHp * 0.5) {
            e.enraged = true;
            e.speed += 0.45;
            e.power *= 1.3;
            this.game.shake = 10;
            this.spawnPopup(e.x, e.y - 120 * e.scaleF, "ԿԱՏԱՂԵՑ! ENRAGED!", 0xff6a5e, 18);
            sfx.hurt();
          }
        }

        if (this.game.mode === "playing") {
          this.resolveHits();
        }

        this.updateBullets(dt);
        this.updateThrows(dt);
        this.particles.update(dt);

        if (this.game.comboTimer > 0) this.game.comboTimer -= dt;
        else this.game.combo = 0;

        this.updatePickups(dt);
        this.updateEffects(dt);
        this.updatePopups(dt);

        // 5. Sync Views with Models
        if (this.playerModel && this.playerView) {
          this.playerView.updateView(dt, this.playerModel);
        }

        for (const e of this.enemies) {
          const view = this.enemyViews.get(e);
          if (view) view.updateView(dt, e);
        }

        for (const c of this.crates) {
          const view = this.crateViews.get(c);
          if (view) view.updateView(dt, c);
        }

        for (const p of this.pickups) {
          const view = this.pickupViews.get(p);
          if (view) view.updateView(dt, p);
        }

        for (const b of this.bullets) {
          const view = this.bulletViews.get(b);
          if (view) view.updateView(dt, b);
        }

        // 6. Clean up dead entities
        for (let i = this.enemies.length - 1; i >= 0; i--) {
          const e = this.enemies[i];
          if (e.removed) {
            const view = this.enemyViews.get(e);
            if (view) {
              view.destroy({ children: true, texture: false });
              this.enemyViews.delete(e);
            }
            this.enemies.splice(i, 1);
          }
        }

        // Check if wave cleared
        if (this.game.mode === "playing" && this.game.spawnQueue.length === 0 && this.enemies.length === 0 && this.playerModel && this.playerModel.alive) {
          this.onWaveCleared();
        }

        // Check player death
        if (this.playerModel && !this.playerModel.alive && this.game.mode !== "gameover") {
          this.game.deathTimer += dt;
          if (this.game.deathTimer > 70) {
            this.showGameOver();
          }
        }
      }
    }

    this.updateCamera(dt);
    const boss = this.enemies.find((e) => e.boss && e.alive);
    this.hud.updateView(this.game, this.playerModel, boss);
    this.overlay.updateView(this.frame, this.game.mode);
  }

  setFloorBounds(top, bottom, show = null) {
    if (top !== undefined && top !== null) this.floorTop = top;
    if (bottom !== undefined && bottom !== null) this.floorBottom = bottom;
    if (show !== null && show !== undefined) this.showBoundsGuide = show;

    if (this.playerModel) {
      this.playerModel.y = Math.max(this.floorTop, Math.min(this.floorBottom, this.playerModel.y));
    }
    for (const e of this.enemies) {
      e.y = Math.max(this.floorTop, Math.min(this.floorBottom, e.y));
    }
    this.updateBoundsGuide();
  }

  updateBoundsGuide() {
    if (!this.boundsGraphics) return;
    this.boundsGraphics.clear();
    if (!this.showBoundsGuide) return;

    // Draw top boundary line (curb/steps)
    this.boundsGraphics.moveTo(0, this.floorTop)
      .lineTo(WORLD_W, this.floorTop)
      .stroke({ width: 2, color: 0x4da6ff, alpha: 0.85 });

    // Draw bottom boundary line (street endline)
    this.boundsGraphics.moveTo(0, this.floorBottom)
      .lineTo(WORLD_W, this.floorBottom)
      .stroke({ width: 2, color: 0x7ec850, alpha: 0.85 });
  }

  // World Props & Assets API
  addProp(type, x, y, scale = 1.0) {
    return this.bg?.addProp(type, x, y, scale);
  }

  removeProp(id) {
    return this.bg?.removeProp(id);
  }

  updateProp(id, transforms) {
    return this.bg?.updateProp(id, transforms);
  }

  getProps() {
    return this.bg?.propsList || [];
  }

  setStreetTransform(t) {
    this.bg?.setStreetTransform(t);
  }

  setForegroundTransform(t) {
    this.bg?.setForegroundTransform(t);
  }

  setFarTransform(t) {
    this.bg?.setFarTransform(t);
  }

  setMidTransform(t) {
    this.bg?.setMidTransform(t);
  }

  setCablesTransform(t) {
    this.bg?.setCablesTransform(t);
  }

  setFencesTransform(t) {
    this.bg?.setFencesTransform(t);
  }

  setSkyTransform(t) {
    this.bg?.setSkyTransform(t);
  }

  setBuildingTransform(index, t) {
    this.bg?.setBuildingTransform(index, t);
  }

  setBuildingVisibility(index, visible) {
    this.bg?.setBuildingVisibility(index, visible);
  }

  addBuilding(texIndex, x, y, scaleX = 1.0, scaleY = 1.0) {
    return this.bg?.addBuilding(texIndex, x, y, scaleX, scaleY);
  }

  removeBuilding(index) {
    return this.bg?.removeBuilding(index);
  }
}

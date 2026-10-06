import { Container, Graphics, ColorMatrixFilter } from "pixi.js";
import { Scene } from "../core/Scene.js";
import { ParticleSystem } from "../views/ParticleSystem.js";
import { W, H, WORLD_W, BASE_SPEED, WEAPONS, STORY, CHAPTERS, chapterOf } from "../core/Constants.js";
import { sfx } from "../core/SoundManager.js?v=3";
import { rng } from "../core/Random.js";
import { GameModel } from "../models/GameModel.js";
import { FighterModel } from "../models/FighterModel.js";
import { CrateModel } from "../models/CrateModel.js";
import { PickupModel } from "../models/PickupModel.js";
import { BackgroundView } from "../views/BackgroundView.js";
import level from "../data/level.js";
import { FighterView } from "../views/FighterView.js";
import { CrateView } from "../views/CrateView.js";
import { PickupView } from "../views/PickupView.js";
import { BulletView } from "../views/BulletView.js";
import { HUDView } from "../views/HUDView.js";
import { DialogueView } from "../views/DialogueView.js";
import { OverlayView } from "../views/OverlayView.js";
import { CombatSystem } from "../systems/CombatSystem.js";
import { PopupLayer } from "../views/PopupLayer.js";

const ADVANCE_KEYS = ["Space", "Enter", "KeyJ", "KeyZ", "KeyK"];
const SKIP_HOLD_FRAMES = 45;

// kind -> [model list property, model→view map property]
const ENTITY_KINDS = {
  enemy: ["enemies", "enemyViews"],
  crate: ["crates", "crateViews"],
  pickup: ["pickups", "pickupViews"],
  bullet: ["bullets", "bulletViews"],
  throw: ["throws", "throwViews"],
};

export class GameplayScene extends Scene {
  /** @param {{ studio?: boolean }} options studio: no story or wave progression (testing studio) */
  constructor({ studio = false } = {}) {
    super();
    this.studio = studio;
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
    this.throwViews = new Map();
    this.effects = [];
    this.popupLayer = null;
    this.throws = [];   // Weapons in flight
    this.paused = false;
    this.skipHold = 0;
    this.onVisibility = () => {
      if (document.hidden) this.pause();
    };

    this.floorTop = level.floor.top;
    this.floorBottom = level.floor.bottom;

    this.combat = new CombatSystem(this, {
      spark: (x, y, big, color) => this.spawnSpark(x, y, big, color),
      popup: (x, y, text, color, size) => this.spawnPopup(x, y, text, color, size),
      sound: (name) => sfx[name](),
      particles: (kind, x, y, arg) => this.particles[kind](x, y, arg),
    });
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

    this.hud.setMuted(sfx.muted);
    document.addEventListener("visibilitychange", this.onVisibility);

    if (this.studio) this.startStudio();
    else this.startGame();
  }

  onExit() {
    delete window.__game;
    document.removeEventListener("visibilitychange", this.onVisibility);
    super.onExit();
  }

  /** Esc, or the tab losing focus, during play / banners / dialogue. */
  pause() {
    if (this.paused || !["playing", "banner", "dialogue"].includes(this.game.mode)) return;
    this.paused = true;
    this.overlay.showPause(sfx.muted);
  }

  resume() {
    this.paused = false;
    this.overlay.hide();
  }

  toggleMute() {
    sfx.setMuted(!sfx.muted);
    this.hud.setMuted(sfx.muted);
    if (this.paused) this.overlay.showPause(sfx.muted);
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
    this.throws = [];
    this.throwViews.clear();

    // Rebuild environmental props (Ladas, Lamps, Bins)
    this.bg.buildProps(this.actors);
    // Fresh particle pool (old one died with the actors layer)
    this.particles = new ParticleSystem(this.actors);
    this.popupLayer = new PopupLayer(this.actors);
  }

  spawnPlayer() {
    this.playerModel = new FighterModel({
      x: 300,
      y: 460,
      isPlayer: true,
      scale: 1.08,
      hp: 100,
      speed: BASE_SPEED,
      power: 1,
    });
    this.playerModel.label = "Davo";
    this.playerView = new FighterView("player", true, 1.08);
    this.actors.addChild(this.playerView);
  }

  startGame() {
    this.clearWorld();
    this.spawnPlayer();

    this.game.reset();
    this.overlay.hide();
    this.setChapterMood(1);

    this.showDialogue(STORY.intro, () => this.beginWave(1));
  }

  /** Empty street, player only, no waves: the studio sets up each scenario from here. */
  startStudio() {
    this.clearWorld();
    this.spawnPlayer();
    this.game.reset();
    this.game.wave = 1;
    this.hitstop = 0;
    this.frame = 0;
    this.overlay.hide();
    this.dialogue.visible = false;
    this.setChapterMood(1);
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
        speed: 1.25 + rng.next() * 0.6 + n * 0.05,
        power: 0.5 + n * 0.045,
        scale: 0.98 + rng.next() * 0.1,
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
      const x = Math.max(80, Math.min(WORLD_W - 80, this.game.camX + 100 + rng.next() * (W - 200)));
      const y = this.floorTop + 14 + rng.next() * (this.floorBottom - this.floorTop - 28);
      
      this.spawnEntity("crate", new CrateModel({ x, y }), new CrateView());
    }
  }

  spawnEnemy(cfg) {
    const fromLeft = rng.next() < 0.5;
    let x = fromLeft ? this.game.camX - 70 : this.game.camX + W + 70;
    x = Math.max(-80, Math.min(WORLD_W + 80, x));
    const y = this.floorTop + 10 + rng.next() * (this.floorBottom - this.floorTop - 20);

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
    model.label = cfg.name || cfg.archetype || (cfg.gunner ? "gunner" : cfg.paletteKey);
    model.gunner = !!cfg.gunner;
    model.archetype = cfg.archetype || null;
    model.lungeMul = cfg.lungeMul || 1;
    model.aiCool = cfg.aiCool;
    model.shootCd = 60 + rng.next() * 60;
    if (model.archetype === "shielder") {
      model.setWeapon({ kind: "lid", def: { melee: false, label: "ԿԱՓԱԿ" } });
    } else if (model.gunner) {
      model.setWeapon({ kind: "pistol", def: WEAPONS.pistol });
    }

    return this.spawnEntity("enemy", model, new FighterView(cfg.paletteKey, false, cfg.scale, cfg.name));
  }

  spawnCustomEnemy(cfg = {}, x = null, y = null) {
    if (x === null || x === undefined) {
      x = this.playerModel ? this.playerModel.x + (rng.next() < 0.5 ? -140 : 140) : this.game.camX + W / 2;
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
    model.bossName = cfg.name || (cfg.boss ? "BOSS" : null);
    model.gunner = !!cfg.gunner;
    model.dummy = !!cfg.dummy || cfg.archetype === "dummy";
    model.archetype = cfg.archetype || null;
    model.lungeMul = cfg.lungeMul || (cfg.archetype === "rusher" ? 3.2 : 1);
    model.aiCool = cfg.aiCool || (cfg.archetype === "grappler" ? 95 : 60);
    model.shootCd = 60 + rng.next() * 60;
    model.weaponScale = cfg.weaponScale || 1.0;

    if (cfg.weapon && cfg.weapon !== "none") {
      const def = WEAPONS[cfg.weapon] || { melee: true, label: cfg.weapon };
      model.setWeapon({ kind: cfg.weapon, def, scale: model.weaponScale });
    } else if (model.archetype === "shielder") {
      model.setWeapon({ kind: "lid", def: { melee: false, label: "ԿԱՓԱԿ" }, scale: model.weaponScale });
    } else if (model.gunner) {
      model.setWeapon({ kind: "pistol", def: WEAPONS.pistol, scale: model.weaponScale });
    }

    const paletteKey = cfg.paletteKey || (cfg.boss ? "boss" : cfg.gunner ? "gunner" : cfg.archetype === "shielder" ? "shielder" : "thug1");
    model.label = cfg.name || cfg.archetype || (cfg.gunner ? "gunner" : paletteKey);
    const view = new FighterView(paletteKey, false, cfg.scale || 1.0, model.bossName || "");

    if (model.weapon) {
      view.setWeaponScale(model.weaponScale);
      view.setWeaponGraphic(model.weapon);
    }

    return this.spawnEntity("enemy", model, view);
  }

  removeEnemy(enemyModel) {
    this.despawn("enemy", enemyModel);
  }

  clearAllEnemies() {
    this.despawnAll("enemy");
  }

  killAllEnemies() {
    for (const e of [...this.enemies]) {
      if (e.alive) {
        e.kill();
        this.combat.onKill(e);
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

    return this.spawnEntity("crate", new CrateModel({ x, y }), new CrateView());
  }

  removeCrate(crateModel) {
    this.despawn("crate", crateModel);
  }

  clearAllCrates() {
    this.despawnAll("crate");
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

    return this.spawnEntity("pickup", new PickupModel({ x, y, type }), new PickupView(type));
  }

  removePickup(pickupModel) {
    this.despawn("pickup", pickupModel);
  }

  clearAllPickups() {
    this.despawnAll("pickup");
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
    this.popupLayer.spawn(x, y, text, color, size);
  }

  spawnPickup(x, y, type, meta = null) {
    // keep loot reachable: clamp into the walkable strip
    x = Math.max(40, Math.min(WORLD_W - 40, x));
    y = Math.max(this.floorTop, Math.min(this.floorBottom, y));
    return this.spawnEntity("pickup", new PickupModel({ x, y, type, meta }), new PickupView(type));
  }

  spawnEntity(kind, model, view) {
    const [list, views] = ENTITY_KINDS[kind];
    this[list].push(model);
    this[views].set(model, view);
    this.actors.addChild(view);
    return model;
  }

  despawn(kind, model) {
    const [list, views] = ENTITY_KINDS[kind];
    const view = this[views].get(model);
    if (view) {
      view.destroy({ children: true });
      this[views].delete(model);
    }
    const idx = this[list].indexOf(model);
    if (idx !== -1) this[list].splice(idx, 1);
  }

  despawnAll(kind) {
    const [list] = ENTITY_KINDS[kind];
    for (const model of [...this[list]]) this.despawn(kind, model);
  }

  spawnBullet(model) {
    return this.spawnEntity("bullet", model, new BulletView());
  }

  spawnThrow(throwModel) {
    const view = new PickupView(throwModel.type);
    view.setFlying(true);
    this.spawnEntity("throw", throwModel, view);
    view.zIndex = 9998;
    return throwModel;
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
    const input = this.app.input;
    if (input.isPressed("KeyM")) this.toggleMute();
    if (input.isPressed("Escape")) {
      if (this.paused) this.resume();
      else this.pause();
    }
    if (this.paused) {
      if (input.isPressed("Enter")) this.resume();
      return;
    }

    this.frame += dt;

    let dialogueJustClosed = false;
    if (this.game.mode === "dialogue") {
      this.dialogue.update(dt);
      // hold an advance key to skip the whole conversation
      this.skipHold = input.isDown(...ADVANCE_KEYS) ? this.skipHold + dt : 0;
      this.dialogue.setSkipProgress(this.skipHold / SKIP_HOLD_FRAMES);
      if (this.skipHold >= SKIP_HOLD_FRAMES) {
        this.skipHold = 0;
        this.dialogue.skip();
        dialogueJustClosed = this.game.mode !== "dialogue";
      } else if (input.isPressed(...ADVANCE_KEYS)) {
        this.dialogue.advance();
        dialogueJustClosed = this.game.mode !== "dialogue";
      }
    }

    // NOTE: the key that closed the dialogue is still "just pressed" this frame;
    // without this guard, Enter on the ending's last line would skip straight past victory.
    if (!dialogueJustClosed) {
      if (this.game.mode === "gameover") {
        if (this.app.input.isPressed("KeyR", "Enter")) {
          if (this.studio) this.startStudio();
          else this.startGame();
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
                this.combat.fireBullet(this.playerModel, this.playerModel.facing);
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
            this.combat.throwWeapon();
          } else if (this.app.input.isPressed("KeyL", "ShiftLeft", "ShiftRight")) {
            if (this.playerModel.tryRoll()) {
              this.particles.dust(this.playerModel.x, this.playerModel.y, 4);
              sfx.swing();
            }
          } else if (this.app.input.isPressed("KeyU")) {
            this.combat.trySuper();
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

        const aiBounds = { top: this.floorTop, bottom: this.floorBottom, left: 40, right: WORLD_W - 40 };
        for (const e of this.enemies) {
          e.updateAI(dt, this.playerModel, this.enemies, aiBounds);
          
          // Trigger gunner shot
          if (e.triggerShoot) {
            e.triggerShoot = false;
            this.combat.fireBullet(e, e.facing);
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

        // Apply physical 2.5D body separation, then keep everyone on the street
        this.combat.resolveBodyCollisions();
        this.clampToStreet(minEnemyX, maxEnemyX);

        // Atmosphere & feedback driven by fighter physics
        const LAMPS = this.bg.propsList.filter((p) => p.type === "lamp").map((p) => p.x);
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
          this.combat.resolveHits();
        }

        this.combat.updateBullets(dt);
        this.combat.updateThrows(dt);
        this.particles.update(dt);

        if (this.game.comboTimer > 0) this.game.comboTimer -= dt;
        else this.game.combo = 0;

        this.combat.updatePickups(dt);
        this.updateEffects(dt);
        this.popupLayer.update(dt);

        this.syncViews(dt);

        // 6. Clean up dead entities
        for (const e of this.enemies.filter((enemy) => enemy.removed)) {
          this.despawn("enemy", e);
        }

        // Check if wave cleared
        if (!this.studio && this.game.mode === "playing" && this.game.spawnQueue.length === 0 && this.enemies.length === 0 && this.playerModel && this.playerModel.alive) {
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

  syncViews(dt) {
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

    for (const th of this.throws) {
      const view = this.throwViews.get(th);
      if (!view) continue;
      view.position.set(th.x, th.ry);
      view.icon.rotation = th.spin;
    }
  }

  clampToStreet(minEnemyX, maxEnemyX) {
    const clampY = (f) => {
      f.y = Math.max(this.floorTop, Math.min(this.floorBottom, f.y));
    };
    const p = this.playerModel;
    if (p) {
      p.x = Math.max(30, Math.min(WORLD_W - 30, p.x));
      clampY(p);
    }
    for (const e of this.enemies) {
      e.x = Math.max(minEnemyX, Math.min(maxEnemyX, e.x));
      clampY(e);
    }
  }

  setFloorBounds(top, bottom) {
    this.floorTop = top;
    this.floorBottom = bottom;
    if (this.playerModel) {
      this.playerModel.y = Math.max(this.floorTop, Math.min(this.floorBottom, this.playerModel.y));
    }
    for (const e of this.enemies) {
      e.y = Math.max(this.floorTop, Math.min(this.floorBottom, e.y));
    }
  }
}

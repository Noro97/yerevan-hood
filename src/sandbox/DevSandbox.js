/**
 * Yerevan Hood - Development Sandbox Controller
 * In-browser dev tools for real-time asset, entity, building, and game loop debugging.
 */

import { Graphics } from "pixi.js";
import { W, H, WORLD_W, FLOOR_TOP, FLOOR_BOTTOM, CHAR_SCALE, PALETTES, WEAPONS, COMBAT_DEPTH_BAND, PROJECTILE_DEPTH_BAND, SCALE_CONFIG } from "../core/Constants.js";
import { SandboxState } from "./SandboxState.js";
import { injectSandboxStyles } from "./sandboxStyles.js";
import { textureManager } from "../core/TextureManager.js";
import { GameplayScene } from "../scenes/GameplayScene.js";
import { sfx } from "../core/SoundManager.js?v=3";

const DEFAULT_BUILDING_X = [0, 311, 641, 1143, 1365, 1647, 1899, 2201, 2443, 2755];
const DEFAULT_BUILDING_SCALES = [1.1, 1.3, 1.5, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0];

export class DevSandbox {
  constructor(app) {
    this.app = app;
    this.state = new SandboxState();
    this.rootEl = null;
    this.panelEl = null;
    this.launcherEl = null;
    this.activeScene = null;
    this.fps = 60;
    this.lastFrameTime = performance.now();
    this.syncInterval = null;
    this.clickToPlaceMode = null; // 'enemy' | 'crate' | 'pickup' | 'prop'
    this.pendingPropType = null;
    this.pendingPickupType = null;

    // Real-time debug overlays
    this.debugGfx = new Graphics();
    this.debugGfx.zIndex = 999999;
    if (this.app?.pixiApp?.ticker) {
      this.app.pixiApp.ticker.add(() => this.renderDebugOverlays());
    }

    // Inject styles and build UI
    injectSandboxStyles();
    this.buildUI();
    this.bindKeyboardShortcuts();
    this.bindCanvasInteraction();

    // Start background UI synchronization loop
    this.startSyncLoop();
  }

  /**
   * Returns current active gameplay scene if present.
   */
  getScene() {
    if (this.app?.scenes?.currentScene instanceof GameplayScene) {
      return this.app.scenes.currentScene;
    }
    return null;
  }

  /**
   * Toggles the sandbox UI overlay.
   */
  toggle(open = null) {
    const isNowOpen = open === null ? !this.state.data.ui.isOpen : open;
    this.state.data.ui.isOpen = isNowOpen;
    if (this.panelEl) {
      this.panelEl.classList.toggle("hidden", !isNowOpen);
    }
    this.state.saveToStorage();
  }

  /**
   * Constructs DOM hierarchy for the dev toolbar.
   */
  buildUI() {
    this.rootEl = document.createElement("div");
    this.rootEl.id = "dev-sandbox-root";

    // Stop keyboard propagation from text inputs to game
    this.rootEl.addEventListener("keydown", (e) => {
      const tag = e.target.tagName;
      if (tag === "INPUT" || tag === "SELECT" || tag === "TEXTAREA") {
        e.stopPropagation();
      }
    });
    this.rootEl.addEventListener("keyup", (e) => {
      const tag = e.target.tagName;
      if (tag === "INPUT" || tag === "SELECT" || tag === "TEXTAREA") {
        e.stopPropagation();
      }
    });

    // 1. Floating quick launcher pill
    this.launcherEl = document.createElement("div");
    this.launcherEl.id = "dev-sandbox-launcher";
    this.launcherEl.innerHTML = `
      <span>🛠️ DEV SANDBOX</span>
      <span class="hotkey-tag">~</span>
      <span class="fps-badge" id="sb-launcher-fps">60 FPS</span>
    `;
    this.launcherEl.onclick = () => this.toggle();
    this.rootEl.appendChild(this.launcherEl);

    // 2. Main floating panel
    this.panelEl = document.createElement("div");
    this.panelEl.id = "dev-sandbox-panel";
    if (!this.state.data.ui.isOpen) {
      this.panelEl.classList.add("hidden");
    }

    // Panel Header
    const header = document.createElement("div");
    header.className = "sb-header";
    header.innerHTML = `
      <div class="sb-title-group">
        <span class="sb-icon">🛠️</span>
        <span class="sb-title">Yerevan Hood Sandbox</span>
        <span class="sb-status-pill" id="sb-mode-badge">DEV ACTIVE</span>
      </div>
      <div class="sb-header-actions">
        <button class="sb-btn-icon" id="sb-btn-pause" title="Pause/Resume Game (P)">⏸</button>
        <button class="sb-btn-icon" id="sb-btn-step" title="Step 1 Frame">⏯ 1f</button>
        <button class="sb-btn-icon" id="sb-btn-step5" title="Step 5 Frames">⏩ 5f</button>
        <button class="sb-btn-icon" id="sb-btn-close" title="Close (~)">&times;</button>
      </div>
    `;
    this.panelEl.appendChild(header);

    header.querySelector("#sb-btn-close").onclick = () => this.toggle(false);
    
    const pauseBtn = header.querySelector("#sb-btn-pause");
    pauseBtn.onclick = () => {
      this.app.paused = !this.app.paused;
      pauseBtn.textContent = this.app.paused ? "▶" : "⏸";
      pauseBtn.style.color = this.app.paused ? "#7ec850" : "#d8cfea";
    };

    const stepBtn = header.querySelector("#sb-btn-step");
    stepBtn.onclick = () => {
      this.app.paused = true;
      pauseBtn.textContent = "▶";
      this.app.stepFrame = true;
    };

    const step5Btn = header.querySelector("#sb-btn-step5");
    if (step5Btn) {
      step5Btn.onclick = () => {
        this.app.paused = true;
        pauseBtn.textContent = "▶";
        this.app.stepFramesCount = 5;
      };
    }

    // Tab Navigation
    const tabsContainer = document.createElement("div");
    tabsContainer.className = "sb-tabs";
    const tabs = [
      { id: "physics", label: "Physics & Hitboxes", icon: "🥊" },
      { id: "entities", label: "Entities & NPCs", icon: "👥" },
      { id: "assets", label: "Street & Assets", icon: "🏙️" },
      { id: "gallery", label: "Asset Gallery", icon: "🖼️" },
      { id: "visuals", label: "Visuals & FX", icon: "🎨" },
      { id: "game", label: "Game & Waves", icon: "⚡" },
      { id: "presets", label: "Presets & Config", icon: "💾" },
    ];

    tabs.forEach((tab) => {
      const btn = document.createElement("button");
      btn.className = `sb-tab ${this.state.data.ui.activeTab === tab.id ? "active" : ""}`;
      btn.dataset.tab = tab.id;
      btn.innerHTML = `${tab.icon} ${tab.label}`;
      btn.onclick = () => {
        tabsContainer.querySelectorAll(".sb-tab").forEach((t) => t.classList.remove("active"));
        btn.classList.add("active");
        this.state.data.ui.activeTab = tab.id;
        this.renderTabContent(tab.id);
      };
      tabsContainer.appendChild(btn);
    });
    this.panelEl.appendChild(tabsContainer);

    // Body container for tab content
    const body = document.createElement("div");
    body.className = "sb-body";
    body.id = "sb-body";
    this.panelEl.appendChild(body);

    // Footer with live telemetry
    const footer = document.createElement("div");
    footer.className = "sb-footer";
    footer.innerHTML = `
      <div class="sb-footer-stats">
        <span>FPS: <span class="sb-footer-stat-val" id="sb-foot-fps">60</span></span>
        <span>NPCs: <span class="sb-footer-stat-val" id="sb-foot-npcs">0</span></span>
        <span>Wave: <span class="sb-footer-stat-val" id="sb-foot-wave">1</span></span>
      </div>
      <div>
        <span>HP: <span class="sb-footer-stat-val" id="sb-foot-hp">100/100</span></span>
      </div>
    `;
    this.panelEl.appendChild(footer);

    this.rootEl.appendChild(this.panelEl);
    document.body.appendChild(this.rootEl);

    // Render active tab initial view
    this.renderTabContent(this.state.data.ui.activeTab);
  }

  /**
   * Renders tab content dynamically into the body element.
   */
  renderTabContent(tabId) {
    const body = document.getElementById("sb-body");
    if (!body) return;
    body.innerHTML = "";

    switch (tabId) {
      case "physics":
        this.renderPhysicsTab(body);
        break;
      case "gallery":
        this.renderGalleryTab(body);
        break;
      case "entities":
        this.renderEntitiesTab(body);
        break;
      case "assets":
      case "scales":
        this.renderAssetsTab(body);
        break;
      case "visuals":
        this.renderVisualsTab(body);
        break;
      case "game":
        this.renderGameTab(body);
        break;
      case "presets":
        this.renderPresetsTab(body);
        break;
    }
  }

  /* =========================================================================
   * TAB 1: ENTITIES & NPCS (SPAWNER & LIVE INSPECTOR)
   * ========================================================================= */
  renderEntitiesTab(parent) {
    // 1. Spawner Section
    const spawnerSec = document.createElement("div");
    spawnerSec.className = "sb-section";
    spawnerSec.innerHTML = `
      <div class="sb-section-title">
        <span>Spawn Entity</span>
        <span class="sb-status-pill" id="sb-placement-pill">Ready</span>
      </div>

      <div class="sb-row">
        <span class="sb-row-label">Archetype</span>
        <div class="sb-row-control">
          <select class="sb-select" id="sp-archetype" style="width: 100%;">
            <option value="thug">Standard Thug</option>
            <option value="dummy">🎯 Training Dummy (Passive Sandbag)</option>
            <option value="rusher">Rusher (Fast Lunge)</option>
            <option value="grappler">Grappler (Slammer)</option>
            <option value="shielder">Shielder (Trash Lid)</option>
            <option value="gunner">Gunner (Makarov)</option>
            <option value="boss">Boss</option>
          </select>
        </div>
      </div>

      <div class="sb-row">
        <span class="sb-row-label">Hand Weapon</span>
        <div class="sb-row-control">
          <select class="sb-select" id="sp-weapon" style="width: 100%;">
            <option value="none">None (Fists)</option>
            <option value="stick">Stick (ՓԱՅՏ)</option>
            <option value="bottle">Bottle (ՇԻՇ)</option>
            <option value="pistol">Pistol (ՄԱԿԱՐՈՎ)</option>
            <option value="lid">Trash Lid (ԿԱՓԱԿ)</option>
          </select>
        </div>
      </div>

      <div class="sb-row">
        <span class="sb-row-label">Weapon Scale</span>
        <div class="sb-row-control">
          <input type="range" class="sb-slider" id="sp-weapon-scale" min="0.4" max="2.5" step="0.05" value="1.0" />
          <span class="sb-val-pill" id="sp-weapon-scale-val">1.00x</span>
        </div>
      </div>

      <div class="sb-row">
        <span class="sb-row-label">Skin / Palette</span>
        <div class="sb-row-control">
          <select class="sb-select" id="sp-palette" style="width: 100%;">
            <option value="thug1">Thug 1 (Green/Beard)</option>
            <option value="thug2">Thug 2 (Blue/Grey)</option>
            <option value="thug3">Thug 3 (Maroon/Cap)</option>
            <option value="shielder">Shielder (Blue)</option>
            <option value="gunner">Gunner (Red)</option>
            <option value="boss">Boss (Black/Gold)</option>
            <option value="player">Davo (Player)</option>
          </select>
        </div>
      </div>

      <div class="sb-row">
        <span class="sb-row-label">Name / Boss Tag</span>
        <div class="sb-row-control">
          <input type="text" class="sb-input" id="sp-name" placeholder="Optional (e.g. GAGO)" style="width: 100%;" />
        </div>
      </div>

      <div class="sb-row">
        <span class="sb-row-label">Health (HP)</span>
        <div class="sb-row-control">
          <input type="range" class="sb-slider" id="sp-hp" min="10" max="600" value="60" />
          <span class="sb-val-pill" id="sp-hp-val">60</span>
        </div>
      </div>

      <div class="sb-row">
        <span class="sb-row-label">Scale Multiplier</span>
        <div class="sb-row-control">
          <input type="range" class="sb-slider" id="sp-scale" min="0.5" max="2.2" step="0.05" value="1.0" />
          <span class="sb-val-pill" id="sp-scale-val">1.00x</span>
        </div>
      </div>

      <div class="sb-row">
        <span class="sb-row-label">Spawn Position</span>
        <div class="sb-row-control">
          <select class="sb-select" id="sp-pos" style="width: 100%;">
            <option value="player">Near Player</option>
            <option value="center">Screen Center</option>
            <option value="left">Left Edge</option>
            <option value="right">Right Edge</option>
            <option value="click">🎯 Click Canvas to Place</option>
          </select>
        </div>
      </div>

      <div class="sb-btn-group" style="margin-top: 4px;">
        <button class="sb-btn sb-btn-primary" id="sb-btn-spawn-npc" style="flex: 2;">+ Spawn NPC</button>
        <button class="sb-btn" id="sb-btn-spawn-crate" style="flex: 1;">+ Crate</button>
        <button class="sb-btn" id="sb-btn-spawn-pickup" style="flex: 1;">+ Pickup</button>
      </div>

      <div class="sb-btn-group" style="margin-top: 4px;">
        <button class="sb-btn sb-btn-small" id="sb-quick-dummy" style="color: #ffd875;">🎯 Sandbag</button>
        <button class="sb-btn sb-btn-small" id="sb-quick-rusher">+ Rusher</button>
        <button class="sb-btn sb-btn-small" id="sb-quick-grappler">+ Grappler</button>
        <button class="sb-btn sb-btn-small" id="sb-quick-gunner">+ Gunner</button>
        <button class="sb-btn sb-btn-small" id="sb-quick-boss">+ Gago</button>
      </div>
    `;
    parent.appendChild(spawnerSec);

    // Wire spawner inputs
    const spHp = spawnerSec.querySelector("#sp-hp");
    const spHpVal = spawnerSec.querySelector("#sp-hp-val");
    spHp.oninput = () => (spHpVal.textContent = spHp.value);

    const spScale = spawnerSec.querySelector("#sp-scale");
    const spScaleVal = spawnerSec.querySelector("#sp-scale-val");
    spScale.oninput = () => (spScaleVal.textContent = parseFloat(spScale.value).toFixed(2) + "x");

    this.bindSlider(spawnerSec, "#sp-weapon-scale", "#sp-weapon-scale-val", () => {});

    // Spawn action
    spawnerSec.querySelector("#sb-btn-spawn-npc").onclick = () => {
      const posChoice = spawnerSec.querySelector("#sp-pos").value;
      if (posChoice === "click") {
        this.clickToPlaceMode = "enemy";
        spawnerSec.querySelector("#sb-placement-pill").textContent = "Click canvas...";
        spawnerSec.querySelector("#sb-placement-pill").style.color = "#ffd464";
      } else {
        this.spawnConfiguredEnemy();
      }
    };

    // Quick spawn buttons
    spawnerSec.querySelector("#sb-quick-dummy").onclick = () => {
      this.quickSpawn({ archetype: "dummy", dummy: true, paletteKey: "thug2", hp: 600, speed: 0, scale: 1.1, name: "SANDBAG" });
    };

    // Quick spawn buttons
    spawnerSec.querySelector("#sb-quick-rusher").onclick = () => {
      this.quickSpawn({ archetype: "rusher", paletteKey: "thug3", hp: 45, speed: 2.3, lungeMul: 3.2 });
    };
    spawnerSec.querySelector("#sb-quick-grappler").onclick = () => {
      this.quickSpawn({ archetype: "grappler", paletteKey: "thug1", hp: 110, speed: 1.1, scale: 1.16, power: 1.2 });
    };
    spawnerSec.querySelector("#sb-quick-gunner").onclick = () => {
      this.quickSpawn({ gunner: true, paletteKey: "gunner", hp: 40, speed: 1.5, scale: 1.0 });
    };
    spawnerSec.querySelector("#sb-quick-boss").onclick = () => {
      this.quickSpawn({ boss: true, name: "ԳԱԳՈ", paletteKey: "thug1", hp: 160, speed: 1.45, scale: 1.25, power: 1.1 });
    };

    spawnerSec.querySelector("#sb-btn-spawn-crate").onclick = () => {
      const scene = this.getScene();
      if (scene) scene.spawnCustomCrate();
    };

    spawnerSec.querySelector("#sb-btn-spawn-pickup").onclick = () => {
      const scene = this.getScene();
      const items = ["shawarma", "khorovats", "tan", "cognac", "coin", "stick", "bottle", "pistol"];
      const item = items[Math.floor(Math.random() * items.length)];
      if (scene) scene.spawnCustomPickup(item);
    };

    // 2. Active NPC Inspector List
    const inspectorSec = document.createElement("div");
    inspectorSec.className = "sb-section";
    inspectorSec.innerHTML = `
      <div class="sb-section-title">
        <span>Active NPCs (<span id="sb-inspector-count">0</span>)</span>
        <div style="display: flex; gap: 4px;">
          <button class="sb-btn sb-btn-danger sb-btn-small" id="sb-btn-nuke">💀 Kill All</button>
          <button class="sb-btn sb-btn-danger sb-btn-small" id="sb-btn-clear-all">❌ Despawn All</button>
        </div>
      </div>

      <div style="max-height: 220px; overflow-y: auto;">
        <table class="sb-entity-table">
          <thead>
            <tr>
              <th>NPC</th>
              <th>HP</th>
              <th>Pos</th>
              <th style="text-align: right;">Action</th>
            </tr>
          </thead>
          <tbody id="sb-npc-table-body">
            <tr><td colspan="4" style="text-align: center; color: #888;">No active NPCs</td></tr>
          </tbody>
        </table>
      </div>

      <div class="sb-btn-group" style="margin-top: 4px; justify-content: flex-end;">
        <button class="sb-btn sb-btn-small" id="sb-btn-clear-crates">Clear Crates</button>
        <button class="sb-btn sb-btn-small" id="sb-btn-clear-pickups">Clear Pickups</button>
      </div>
    `;
    parent.appendChild(inspectorSec);

    inspectorSec.querySelector("#sb-btn-nuke").onclick = () => {
      const scene = this.getScene();
      if (scene) scene.killAllEnemies();
    };
    inspectorSec.querySelector("#sb-btn-clear-all").onclick = () => {
      const scene = this.getScene();
      if (scene) scene.clearAllEnemies();
    };
    inspectorSec.querySelector("#sb-btn-clear-crates").onclick = () => {
      const scene = this.getScene();
      if (scene) scene.clearAllCrates();
    };
    inspectorSec.querySelector("#sb-btn-clear-pickups").onclick = () => {
      const scene = this.getScene();
      if (scene) scene.clearAllPickups();
    };

    // Initial update of inspector list
    this.updateNPCInspector();
  }

  /**
   * Helper to spawn enemy from UI form.
   */
  spawnConfiguredEnemy(x = null, y = null) {
    const scene = this.getScene();
    if (!scene) return;

    const archetype = document.getElementById("sp-archetype")?.value || "thug";
    const paletteKey = document.getElementById("sp-palette")?.value || "thug1";
    const name = document.getElementById("sp-name")?.value.trim() || null;
    const hp = parseInt(document.getElementById("sp-hp")?.value || "60", 10);
    const scale = parseFloat(document.getElementById("sp-scale")?.value || "1.0") * this.state.data.scales.enemies;
    const posChoice = document.getElementById("sp-pos")?.value || "player";
    const weapon = document.getElementById("sp-weapon")?.value || "none";
    const weaponScale = parseFloat(document.getElementById("sp-weapon-scale")?.value || "1.0");

    if (x === null || y === null) {
      if (posChoice === "player" && scene.playerModel) {
        x = scene.playerModel.x + (Math.random() < 0.5 ? -140 : 140);
        y = scene.playerModel.y;
      } else if (posChoice === "center") {
        x = scene.game.camX + W / 2;
        y = (FLOOR_TOP + FLOOR_BOTTOM) / 2;
      } else if (posChoice === "left") {
        x = scene.game.camX + 60;
        y = (FLOOR_TOP + FLOOR_BOTTOM) / 2;
      } else if (posChoice === "right") {
        x = scene.game.camX + W - 60;
        y = (FLOOR_TOP + FLOOR_BOTTOM) / 2;
      }
    }

    const cfg = {
      paletteKey,
      hp: archetype === "dummy" ? (hp || 600) : hp,
      scale,
      speed: archetype === "dummy" ? 0 : archetype === "rusher" ? 2.3 : archetype === "grappler" ? 1.1 : 1.7,
      power: archetype === "grappler" ? 1.25 : 1.0,
      archetype: archetype === "thug" ? null : archetype === "boss" ? null : archetype,
      gunner: archetype === "gunner",
      boss: archetype === "boss",
      dummy: archetype === "dummy",
      name: name || (archetype === "boss" ? "BOSS" : archetype === "dummy" ? "SANDBAG" : null),
      lungeMul: archetype === "rusher" ? 3.2 : 1,
      weapon,
      weaponScale,
    };

    scene.spawnCustomEnemy(cfg, x, y);
    this.updateNPCInspector();
  }

  quickSpawn(cfg) {
    const scene = this.getScene();
    if (!scene) return;
    const finalCfg = {
      ...cfg,
      scale: (cfg.scale || 1.0) * this.state.data.scales.enemies,
    };
    scene.spawnCustomEnemy(finalCfg);
    this.updateNPCInspector();
  }

  /**
   * Refreshes the active NPC table in the Entities tab.
   */
  updateNPCInspector() {
    const tableBody = document.getElementById("sb-npc-table-body");
    const countEl = document.getElementById("sb-inspector-count");
    if (!tableBody) return;

    const scene = this.getScene();
    if (!scene || !scene.enemies || scene.enemies.length === 0) {
      tableBody.innerHTML = `<tr><td colspan="4" style="text-align: center; color: #888; padding: 10px;">No active NPCs</td></tr>`;
      if (countEl) countEl.textContent = "0";
      return;
    }

    if (countEl) countEl.textContent = scene.enemies.length;

    let html = "";
    scene.enemies.forEach((enemy, idx) => {
      const type = enemy.boss ? "Boss" : enemy.gunner ? "Gunner" : enemy.archetype || "Thug";
      const hpPct = Math.max(0, Math.min(100, Math.round((enemy.hp / enemy.maxHp) * 100)));
      const badgeColor = enemy.boss ? "#ff6a5e" : enemy.gunner ? "#ff8844" : enemy.archetype === "grappler" ? "#7ec850" : enemy.archetype === "shielder" ? "#4da6ff" : "#ffd875";

      html += `
        <tr class="sb-entity-row" data-idx="${idx}">
          <td>
            <div style="font-weight: 700; color: ${badgeColor}; font-size: 11px;">#${idx + 1} ${enemy.bossName || type}</div>
            <div style="font-size: 9px; color: #8c7ea5;">${enemy.state}</div>
          </td>
          <td style="width: 70px;">
            <div style="font-size: 10px;">${Math.round(enemy.hp)}/${enemy.maxHp}</div>
            <div class="sb-hp-meter"><div class="sb-hp-fill" style="width: ${hpPct}%; background: ${hpPct > 40 ? "#7ec850" : "#e65040"};"></div></div>
          </td>
          <td style="font-family: monospace; font-size: 10px; color: #bbb;">
            ${Math.round(enemy.x)},${Math.round(enemy.y)}
          </td>
          <td style="text-align: right; white-space: nowrap;">
            <button class="sb-btn sb-btn-small sb-action-hit" data-idx="${idx}" title="Hit -25 HP">⚡</button>
            <button class="sb-btn sb-btn-small sb-action-heal" data-idx="${idx}" title="Heal Full">💚</button>
            <button class="sb-btn sb-btn-danger sb-btn-small sb-action-del" data-idx="${idx}" title="Remove">✕</button>
          </td>
        </tr>
      `;
    });

    tableBody.innerHTML = html;

    // Attach row button events
    tableBody.querySelectorAll(".sb-action-hit").forEach((btn) => {
      btn.onclick = () => {
        const idx = parseInt(btn.dataset.idx, 10);
        const enemy = scene.enemies[idx];
        if (enemy && enemy.alive) {
          enemy.applyHit(25, 1, 5);
          scene.spawnPopup(enemy.x, enemy.y - 70 * enemy.scaleF, "-25", 0xff6a5e);
          this.updateNPCInspector();
        }
      };
    });

    tableBody.querySelectorAll(".sb-action-heal").forEach((btn) => {
      btn.onclick = () => {
        const idx = parseInt(btn.dataset.idx, 10);
        const enemy = scene.enemies[idx];
        if (enemy) {
          enemy.hp = enemy.maxHp;
          scene.spawnPopup(enemy.x, enemy.y - 70 * enemy.scaleF, "HEAL", 0x7ec850);
          this.updateNPCInspector();
        }
      };
    });

    tableBody.querySelectorAll(".sb-action-del").forEach((btn) => {
      btn.onclick = () => {
        const idx = parseInt(btn.dataset.idx, 10);
        const enemy = scene.enemies[idx];
        if (enemy) {
          scene.removeEnemy(enemy);
          this.updateNPCInspector();
        }
      };
    });
  }

  /**
   * Refreshes the active street items (crates, pickups, weapons) table.
   */
  updateStreetItemsInspector() {
    const tableBody = document.getElementById("sb-items-table-body");
    if (!tableBody) return;
    const scene = this.getScene();
    if (!scene) return;

    const crates = scene.crates || [];
    const pickups = scene.pickups || [];
    if (crates.length === 0 && pickups.length === 0) {
      tableBody.innerHTML = `<tr><td colspan="3" style="text-align:center; color:#888; padding:8px;">No items on the street</td></tr>`;
      return;
    }

    let html = "";
    crates.forEach((c, idx) => {
      html += `
        <tr style="border-bottom: 1px solid rgba(255,255,255,0.05); padding: 3px 0;">
          <td style="color:#d4af37; font-weight:700; padding: 3px 4px;">📦 Crate</td>
          <td style="color:#bbb; font-family:monospace; padding: 3px 4px;">${Math.round(c.x)},${Math.round(c.y)}</td>
          <td style="text-align:right; padding: 3px 4px;">
            <button class="sb-btn sb-btn-danger sb-btn-small sb-del-crate" data-idx="${idx}" title="Delete">✕</button>
          </td>
        </tr>
      `;
    });

    pickups.forEach((p, idx) => {
      const icon = p.type === "shawarma" ? "🌯" : p.type === "khorovats" ? "🍖" : p.type === "tan" ? "🥛" : p.type === "cognac" ? "🍷" : p.type === "coin" ? "🪙" : p.type === "medal" ? "🎖️" : "⚔️";
      html += `
        <tr style="border-bottom: 1px solid rgba(255,255,255,0.05); padding: 3px 0;">
          <td style="color:#c9a0ff; font-weight:700; padding: 3px 4px;">${icon} ${p.type.toUpperCase()}</td>
          <td style="color:#bbb; font-family:monospace; padding: 3px 4px;">${Math.round(p.x)},${Math.round(p.y)}</td>
          <td style="text-align:right; padding: 3px 4px;">
            <button class="sb-btn sb-btn-danger sb-btn-small sb-del-pickup" data-idx="${idx}" title="Delete">✕</button>
          </td>
        </tr>
      `;
    });

    tableBody.innerHTML = html;

    tableBody.querySelectorAll(".sb-del-crate").forEach((btn) => {
      btn.onclick = () => {
        const idx = parseInt(btn.dataset.idx, 10);
        const c = scene.crates[idx];
        if (c) {
          scene.removeCrate(c);
          this.updateStreetItemsInspector();
        }
      };
    });

    tableBody.querySelectorAll(".sb-del-pickup").forEach((btn) => {
      btn.onclick = () => {
        const idx = parseInt(btn.dataset.idx, 10);
        const p = scene.pickups[idx];
        if (p) {
          scene.removePickup(p);
          this.updateStreetItemsInspector();
        }
      };
    });
  }

  /* =========================================================================
   * TAB 2: STREET & WORLD ASSETS (STREET, PROPS, BUILDINGS, FOREGROUND)
   * ========================================================================= */
  renderAssetsTab(parent) {
    const scene = this.getScene();

    // 0. Skyline, Ararat & Overhead Cables Section
    const sky = this.state.data.skyline || {
      araratScaleX: 1.0, araratScaleY: 1.0, araratX: 0, araratY: 0, araratAlpha: 1.0, araratVisible: true,
      midScaleX: 1.0, midScaleY: 1.0, midX: 0, midY: 0, midAlpha: 1.0, midVisible: true,
      cablesVisible: true, fencesVisible: true
    };
    this.state.data.skyline = sky;

    const skySec = document.createElement("div");
    skySec.className = "sb-section";
    skySec.innerHTML = `
      <div class="sb-section-title">
        <span>Skyline, Ararat & Overhead Cables</span>
        <button class="sb-btn sb-btn-small" id="sb-btn-reset-skyline">Reset</button>
      </div>

      <div style="font-weight: 700; font-size: 11px; color: #c9a0ff; margin-bottom: 4px;">Mount Ararat & TV Tower (Far Layer)</div>
      <div class="sb-row">
        <span class="sb-row-label">Ararat Scale</span>
        <div class="sb-row-control">
          <input type="range" class="sb-slider" id="sky-ararat-scale" min="0.3" max="2.8" step="0.05" value="${sky.araratScaleX}" />
          <span class="sb-val-pill" id="sky-ararat-scale-val">${sky.araratScaleX.toFixed(2)}x</span>
        </div>
      </div>

      <div class="sb-row">
        <span class="sb-row-label">Ararat X Offset</span>
        <div class="sb-row-control">
          <input type="range" class="sb-slider" id="sky-ararat-x" min="-600" max="600" step="10" value="${sky.araratX}" />
          <span class="sb-val-pill" id="sky-ararat-x-val">${sky.araratX}px</span>
        </div>
      </div>

      <div class="sb-row">
        <span class="sb-row-label">Ararat Y Offset</span>
        <div class="sb-row-control">
          <input type="range" class="sb-slider" id="sky-ararat-y" min="-180" max="180" step="5" value="${sky.araratY}" />
          <span class="sb-val-pill" id="sky-ararat-y-val">${sky.araratY}px</span>
        </div>
      </div>

      <div class="sb-row">
        <span class="sb-row-label">Ararat Visible</span>
        <div class="sb-row-control">
          <label class="sb-switch">
            <input type="checkbox" id="sky-ararat-vis" ${sky.araratVisible !== false ? "checked" : ""} />
            <span class="sb-slider-switch"></span>
          </label>
        </div>
      </div>

      <div style="font-weight: 700; font-size: 11px; color: #c9a0ff; margin-top: 8px; margin-bottom: 4px;">Distant Soviet Skyline (Mid Layer)</div>
      <div class="sb-row">
        <span class="sb-row-label">Skyline Scale</span>
        <div class="sb-row-control">
          <input type="range" class="sb-slider" id="sky-mid-scale" min="0.3" max="2.8" step="0.05" value="${sky.midScaleX}" />
          <span class="sb-val-pill" id="sky-mid-scale-val">${sky.midScaleX.toFixed(2)}x</span>
        </div>
      </div>

      <div class="sb-row">
        <span class="sb-row-label">Skyline X Offset</span>
        <div class="sb-row-control">
          <input type="range" class="sb-slider" id="sky-mid-x" min="-600" max="600" step="10" value="${sky.midX}" />
          <span class="sb-val-pill" id="sky-mid-x-val">${sky.midX}px</span>
        </div>
      </div>

      <div class="sb-row">
        <span class="sb-row-label">Skyline Y Offset</span>
        <div class="sb-row-control">
          <input type="range" class="sb-slider" id="sky-mid-y" min="-180" max="180" step="5" value="${sky.midY}" />
          <span class="sb-val-pill" id="sky-mid-y-val">${sky.midY}px</span>
        </div>
      </div>

      <div class="sb-row">
        <span class="sb-row-label">Skyline Visible</span>
        <div class="sb-row-control">
          <label class="sb-switch">
            <input type="checkbox" id="sky-mid-vis" ${sky.midVisible !== false ? "checked" : ""} />
            <span class="sb-slider-switch"></span>
          </label>
        </div>
      </div>

      <div style="font-weight: 700; font-size: 11px; color: #ff8844; margin-top: 8px; margin-bottom: 4px;">Remove / Toggle Street Elements</div>
      <div class="sb-row">
        <span class="sb-row-label">Overhead Cables & Poles</span>
        <div class="sb-row-control">
          <label class="sb-switch">
            <input type="checkbox" id="sky-cables-vis" ${sky.cablesVisible !== false ? "checked" : ""} />
            <span class="sb-slider-switch"></span>
          </label>
          <span style="font-size: 10px; color: #8c7ea5;">(Poles, wires, sneakers)</span>
        </div>
      </div>

      <div class="sb-row">
        <span class="sb-row-label">Alley Fences</span>
        <div class="sb-row-control">
          <label class="sb-switch">
            <input type="checkbox" id="sky-fences-vis" ${sky.fencesVisible !== false ? "checked" : ""} />
            <span class="sb-slider-switch"></span>
          </label>
        </div>
      </div>
    `;
    parent.appendChild(skySec);

    this.bindSlider(skySec, "#sky-ararat-scale", "#sky-ararat-scale-val", (v) => {
      sky.araratScaleX = v;
      sky.araratScaleY = v;
      this.applySkylineTransforms();
    });
    this.bindSlider(skySec, "#sky-ararat-x", "#sky-ararat-x-val", (v) => {
      sky.araratX = Math.round(v);
      this.applySkylineTransforms();
    }, "px");
    this.bindSlider(skySec, "#sky-ararat-y", "#sky-ararat-y-val", (v) => {
      sky.araratY = Math.round(v);
      this.applySkylineTransforms();
    }, "px");
    skySec.querySelector("#sky-ararat-vis").onchange = (e) => {
      sky.araratVisible = e.target.checked;
      this.applySkylineTransforms();
    };

    this.bindSlider(skySec, "#sky-mid-scale", "#sky-mid-scale-val", (v) => {
      sky.midScaleX = v;
      sky.midScaleY = v;
      this.applySkylineTransforms();
    });
    this.bindSlider(skySec, "#sky-mid-x", "#sky-mid-x-val", (v) => {
      sky.midX = Math.round(v);
      this.applySkylineTransforms();
    }, "px");
    this.bindSlider(skySec, "#sky-mid-y", "#sky-mid-y-val", (v) => {
      sky.midY = Math.round(v);
      this.applySkylineTransforms();
    }, "px");
    skySec.querySelector("#sky-mid-vis").onchange = (e) => {
      sky.midVisible = e.target.checked;
      this.applySkylineTransforms();
    };

    skySec.querySelector("#sky-cables-vis").onchange = (e) => {
      sky.cablesVisible = e.target.checked;
      this.applySkylineTransforms();
    };
    skySec.querySelector("#sky-fences-vis").onchange = (e) => {
      sky.fencesVisible = e.target.checked;
      this.applySkylineTransforms();
    };

    skySec.querySelector("#sb-btn-reset-skyline").onclick = () => {
      sky.araratScaleX = 1.0;
      sky.araratScaleY = 1.0;
      sky.araratX = 0;
      sky.araratY = 0;
      sky.araratVisible = true;
      sky.midScaleX = 1.0;
      sky.midScaleY = 1.0;
      sky.midX = 0;
      sky.midY = 0;
      sky.midVisible = true;
      sky.cablesVisible = true;
      sky.fencesVisible = true;
      this.applySkylineTransforms();
      this.renderTabContent("assets");
    };

    // 1. Street Texture & Walkable Endline Section
    const streetSec = document.createElement("div");
    streetSec.className = "sb-section";
    streetSec.innerHTML = `
      <div class="sb-section-title">
        <span>Street & Walkable Endline</span>
        <span class="sb-status-pill">Top ${this.state.data.floor.top}px · Endline ${this.state.data.floor.bottom}px</span>
      </div>

      <div class="sb-row">
        <span class="sb-row-label">Walkable Endline (Bottom)</span>
        <div class="sb-row-control">
          <input type="range" class="sb-slider" id="fl-bottom" min="450" max="540" step="1" value="${this.state.data.floor.bottom}" />
          <span class="sb-val-pill" id="fl-bottom-val">${this.state.data.floor.bottom}px</span>
        </div>
      </div>

      <div class="sb-row">
        <span class="sb-row-label">Walkable Curb (Top)</span>
        <div class="sb-row-control">
          <input type="range" class="sb-slider" id="fl-top" min="340" max="440" step="1" value="${this.state.data.floor.top}" />
          <span class="sb-val-pill" id="fl-top-val">${this.state.data.floor.top}px</span>
        </div>
      </div>

      <div class="sb-row">
        <span class="sb-row-label">Show Boundary Lines</span>
        <div class="sb-row-control">
          <label class="sb-switch">
            <input type="checkbox" id="fl-show-bounds" ${this.state.data.floor.showBounds ? "checked" : ""} />
            <span class="sb-slider-switch"></span>
          </label>
          <span style="font-size: 10px; color: #8c7ea5;">(Cyan: curb, Green: endline)</span>
        </div>
      </div>

      <div class="sb-row">
        <span class="sb-row-label">Street Texture Y</span>
        <div class="sb-row-control">
          <input type="range" class="sb-slider" id="st-pos-y" min="-120" max="120" step="1" value="${this.state.data.street.y}" />
          <span class="sb-val-pill" id="st-pos-y-val">${this.state.data.street.y}px</span>
        </div>
      </div>

      <div class="sb-row">
        <span class="sb-row-label">Street Texture X</span>
        <div class="sb-row-control">
          <input type="range" class="sb-slider" id="st-pos-x" min="-250" max="250" step="5" value="${this.state.data.street.x}" />
          <span class="sb-val-pill" id="st-pos-x-val">${this.state.data.street.x}px</span>
        </div>
      </div>

      <div class="sb-row">
        <span class="sb-row-label">Street Vertical Scale</span>
        <div class="sb-row-control">
          <input type="range" class="sb-slider" id="st-scale-y" min="0.6" max="2.0" step="0.02" value="${this.state.data.street.scaleY}" />
          <span class="sb-val-pill" id="st-scale-y-val">${this.state.data.street.scaleY.toFixed(2)}x</span>
        </div>
      </div>

      <div class="sb-btn-group" style="margin-top: 4px;">
        <button class="sb-btn sb-btn-small" id="sb-btn-reset-street">Reset Street & Floor</button>
      </div>
    `;
    parent.appendChild(streetSec);

    // Wire Street & Floor inputs
    this.bindSlider(streetSec, "#fl-bottom", "#fl-bottom-val", (v) => {
      this.state.data.floor.bottom = Math.round(v);
      this.applyFloorBounds();
    }, "px");

    this.bindSlider(streetSec, "#fl-top", "#fl-top-val", (v) => {
      this.state.data.floor.top = Math.round(v);
      this.applyFloorBounds();
    }, "px");

    const boundsCb = streetSec.querySelector("#fl-show-bounds");
    boundsCb.onchange = () => {
      this.state.data.floor.showBounds = boundsCb.checked;
      this.applyFloorBounds();
    };

    this.bindSlider(streetSec, "#st-pos-y", "#st-pos-y-val", (v) => {
      this.state.data.street.y = Math.round(v);
      this.applyStreetTransform();
    }, "px");

    this.bindSlider(streetSec, "#st-pos-x", "#st-pos-x-val", (v) => {
      this.state.data.street.x = Math.round(v);
      this.applyStreetTransform();
    }, "px");

    this.bindSlider(streetSec, "#st-scale-y", "#st-scale-y-val", (v) => {
      this.state.data.street.scaleY = v;
      this.applyStreetTransform();
    });

    streetSec.querySelector("#sb-btn-reset-street").onclick = () => {
      this.state.data.floor.top = 392;
      this.state.data.floor.bottom = 538;
      this.state.data.street.x = 0;
      this.state.data.street.y = 0;
      this.state.data.street.scaleY = 1.0;
      this.applyStreetTransform();
      this.applyFloorBounds();
      this.renderTabContent("assets");
    };

    // 2. Street Props Manager (Lamps, Car, Trash Bins)
    const propsList = this.state.data.props || [];
    let curPropId = this.state.data.ui.selectedPropId;
    let curProp = propsList.find((p) => p.id === curPropId);
    if (!curProp && propsList.length > 0) {
      curProp = propsList[0];
      curPropId = curProp.id;
      this.state.data.ui.selectedPropId = curPropId;
    }

    const propsSec = document.createElement("div");
    propsSec.className = "sb-section";

    let propOptions = propsList.map((p) => {
      const typeLabel = p.type === "lamp" ? "🏮 Lamp" : p.type === "lada" ? "🚗 Car" : "🗑️ Bin";
      return `<option value="${p.id}" ${p.id === curPropId ? "selected" : ""}>${typeLabel} (${p.id} · X:${Math.round(p.x)}, Y:${Math.round(p.y)})</option>`;
    }).join("");

    propsSec.innerHTML = `
      <div class="sb-section-title">
        <span>Street Props (${propsList.length} Active)</span>
        <span class="sb-status-pill" id="sb-prop-status-pill">${curProp ? curProp.type.toUpperCase() : "None"}</span>
      </div>

      ${curProp ? `
        <div class="sb-row">
          <span class="sb-row-label">Select Target Prop</span>
          <div class="sb-row-control">
            <select class="sb-select" id="prop-target-select" style="width: 100%;">
              ${propOptions}
            </select>
          </div>
        </div>

        <div class="sb-row">
          <span class="sb-row-label">X Position</span>
          <div class="sb-row-control">
            <input type="range" class="sb-slider" id="prop-pos-x" min="0" max="2880" step="5" value="${curProp.x}" />
            <span class="sb-val-pill" id="prop-pos-x-val">${Math.round(curProp.x)}px</span>
          </div>
        </div>

        <div class="sb-row">
          <span class="sb-row-label">Y Position</span>
          <div class="sb-row-control">
            <input type="range" class="sb-slider" id="prop-pos-y" min="350" max="540" step="2" value="${curProp.y}" />
            <span class="sb-val-pill" id="prop-pos-y-val">${Math.round(curProp.y)}px</span>
          </div>
        </div>

        <div class="sb-row">
          <span class="sb-row-label">Prop Scale</span>
          <div class="sb-row-control">
            <input type="range" class="sb-slider" id="prop-scale" min="0.4" max="3.0" step="0.05" value="${curProp.scale || 1.0}" />
            <span class="sb-val-pill" id="prop-scale-val">${(curProp.scale || 1.0).toFixed(2)}x</span>
          </div>
        </div>

        <div class="sb-btn-group" style="margin-top: 4px;">
          <button class="sb-btn sb-btn-danger sb-btn-small" id="prop-btn-remove">❌ Remove This Prop</button>
          <button class="sb-btn sb-btn-small" id="prop-btn-teleport">📍 Teleport Davo Here</button>
        </div>
      ` : `<div style="color: #888; text-align: center; padding: 6px;">No props on the street. Add one below!</div>`}

      <div style="border-top: 1px solid rgba(255, 255, 255, 0.08); margin-top: 8px; padding-top: 8px;">
        <div style="font-weight: 700; font-size: 11px; color: #c9a0ff; margin-bottom: 6px;">+ Add New Prop</div>
        <div class="sb-row">
          <span class="sb-row-label">Type to Add</span>
          <div class="sb-row-control">
            <select class="sb-select" id="prop-new-type" style="width: 100%;">
              <option value="lamp">🏮 Soviet Street Lamp</option>
              <option value="lada">🚗 Parked Lada 2101</option>
              <option value="bin">🗑️ Kond Trash Bin</option>
            </select>
          </div>
        </div>
        <div class="sb-row">
          <span class="sb-row-label">Placement</span>
          <div class="sb-row-control">
            <select class="sb-select" id="prop-new-pos" style="width: 100%;">
              <option value="player">Near Player</option>
              <option value="center">Screen Center</option>
              <option value="click">🎯 Click Canvas to Place Prop</option>
            </select>
          </div>
        </div>
        <div class="sb-btn-group" style="margin-top: 6px;">
          <button class="sb-btn sb-btn-primary" id="prop-btn-add" style="width: 100%;">+ Add Prop to Street</button>
        </div>
      </div>
    `;
    parent.appendChild(propsSec);

    // Wire target prop selection & modification
    if (curProp) {
      const propSel = propsSec.querySelector("#prop-target-select");
      if (propSel) {
        propSel.onchange = () => {
          this.state.data.ui.selectedPropId = propSel.value;
          this.renderTabContent("assets");
        };
      }

      this.bindSlider(propsSec, "#prop-pos-x", "#prop-pos-x-val", (v) => {
        curProp.x = Math.round(v);
        this.updatePropInEngine(curProp.id, { x: curProp.x });
      }, "px");

      this.bindSlider(propsSec, "#prop-pos-y", "#prop-pos-y-val", (v) => {
        curProp.y = Math.round(v);
        this.updatePropInEngine(curProp.id, { y: curProp.y });
      }, "px");

      this.bindSlider(propsSec, "#prop-scale", "#prop-scale-val", (v) => {
        curProp.scale = v;
        this.updatePropInEngine(curProp.id, { scale: v });
      });

      const remBtn = propsSec.querySelector("#prop-btn-remove");
      if (remBtn) {
        remBtn.onclick = () => {
          this.removePropInEngine(curProp.id);
          this.renderTabContent("assets");
        };
      }

      const tpBtn = propsSec.querySelector("#prop-btn-teleport");
      if (tpBtn) {
        tpBtn.onclick = () => {
          this.teleportPlayer(curProp.x);
        };
      }
    }

    // Wire add new prop
    const addBtn = propsSec.querySelector("#prop-btn-add");
    if (addBtn) {
      addBtn.onclick = () => {
        const type = propsSec.querySelector("#prop-new-type").value;
        const posChoice = propsSec.querySelector("#prop-new-pos").value;
        if (posChoice === "click") {
          this.clickToPlaceMode = "prop";
          this.pendingPropType = type;
          const statusPill = propsSec.querySelector("#sb-prop-status-pill");
          if (statusPill) {
            statusPill.textContent = "Click canvas...";
            statusPill.style.color = "#ffd464";
          }
        } else {
          this.addConfiguredProp(null, null, type, posChoice);
          this.renderTabContent("assets");
        }
      };
    }

    // 3. Street Items & Ground Objects Manager (Crates, Food, Weapons)
    const itemsSec = document.createElement("div");
    itemsSec.className = "sb-section";
    itemsSec.innerHTML = `
      <div class="sb-section-title">
        <span>Street Items & Ground Objects</span>
        <span class="sb-status-pill" id="sb-item-status-pill">Ready</span>
      </div>

      <div class="sb-row">
        <span class="sb-row-label">Item Type</span>
        <div class="sb-row-control">
          <select class="sb-select" id="sb-item-type" style="width: 100%;">
            <optgroup label="Destructible Props">
              <option value="crate">📦 Wooden Crate (Breakable)</option>
            </optgroup>
            <optgroup label="Food & Drinks (Restorative)">
              <option value="shawarma">🌯 Shawarma (+35 HP)</option>
              <option value="khorovats">🍖 Khorovats BBQ (+60 HP)</option>
              <option value="tan">🥛 Tan Matsun Drink (+15 HP)</option>
              <option value="cognac">🍷 Armenian Cognac (Super Bar)</option>
            </optgroup>
            <optgroup label="Collectibles & Score">
              <option value="coin">🪙 Bronze Coin (+50 Score)</option>
              <option value="medal">🎖️ Kond Medal (+200 Score)</option>
            </optgroup>
            <optgroup label="Weapons (Equippable)">
              <option value="stick">🪵 Heavy Wooden Stick</option>
              <option value="bottle">🍾 Broken Glass Bottle</option>
              <option value="pistol">🔫 Makarov Pistol</option>
              <option value="lid">🛡️ Trash Can Lid Shield</option>
            </optgroup>
          </select>
        </div>
      </div>

      <div class="sb-row">
        <span class="sb-row-label">Spawn Position</span>
        <div class="sb-row-control">
          <select class="sb-select" id="sb-item-pos" style="width: 100%;">
            <option value="player">Near Player (Davo)</option>
            <option value="center">Screen Center</option>
            <option value="click">🎯 Click Canvas to Place</option>
          </select>
        </div>
      </div>

      <div class="sb-btn-group" style="margin-top: 6px;">
        <button class="sb-btn sb-btn-primary" id="sb-btn-add-item" style="flex: 1;">+ Add Item to Street</button>
      </div>

      <div class="sb-btn-group" style="margin-top: 4px;">
        <button class="sb-btn sb-btn-danger sb-btn-small" id="sb-btn-clear-pickups" style="flex: 1;">Clear Pickups</button>
        <button class="sb-btn sb-btn-danger sb-btn-small" id="sb-btn-clear-crates" style="flex: 1;">Clear Crates</button>
        <button class="sb-btn sb-btn-danger sb-btn-small" id="sb-btn-clear-all-items" style="flex: 1;">Clear All</button>
      </div>

      <div style="font-weight: 700; font-size: 11px; color: #c9a0ff; margin-top: 10px; margin-bottom: 4px;">Active Street Items & Crates</div>
      <div style="max-height: 140px; overflow-y: auto; border: 1px solid rgba(255,255,255,0.08); border-radius: 4px; background: rgba(0,0,0,0.3);">
        <table style="width: 100%; font-size: 11px; border-collapse: collapse;">
          <thead>
            <tr style="color: #8c7ea5; text-align: left; border-bottom: 1px solid rgba(255,255,255,0.08);">
              <th style="padding: 4px;">Item</th>
              <th style="padding: 4px;">Pos (X, Y)</th>
              <th style="padding: 4px; text-align: right;">Action</th>
            </tr>
          </thead>
          <tbody id="sb-items-table-body"></tbody>
        </table>
      </div>
    `;
    parent.appendChild(itemsSec);

    const addItemBtn = itemsSec.querySelector("#sb-btn-add-item");
    if (addItemBtn) {
      addItemBtn.onclick = () => {
        const type = itemsSec.querySelector("#sb-item-type").value;
        const posChoice = itemsSec.querySelector("#sb-item-pos").value;
        const statusPill = itemsSec.querySelector("#sb-item-status-pill");

        if (posChoice === "click") {
          this.clickToPlaceMode = (type === "crate" ? "crate" : "pickup");
          this.pendingItemType = type;
          if (statusPill) {
            statusPill.textContent = "Click canvas...";
            statusPill.style.color = "#ffd464";
          }
        } else {
          let x = null;
          let y = null;
          if (posChoice === "player" && scene?.playerModel) {
            x = scene.playerModel.x + (scene.playerModel.facing || 1) * 60;
            y = scene.playerModel.y;
          } else if (posChoice === "center") {
            x = (scene?.game?.camX || 0) + 480;
            y = ((scene?.floorTop || 392) + (scene?.floorBottom || 538)) / 2;
          }

          if (type === "crate") {
            scene?.spawnCustomCrate(x, y);
          } else {
            scene?.spawnCustomPickup(type, x, y);
          }
          if (statusPill) {
            statusPill.textContent = "Added!";
            statusPill.style.color = "#7ec850";
            setTimeout(() => {
              if (statusPill) {
                statusPill.textContent = "Ready";
                statusPill.style.color = "#92e660";
              }
            }, 1200);
          }
          this.updateStreetItemsInspector();
        }
      };
    }

    const clearPickupsBtn = itemsSec.querySelector("#sb-btn-clear-pickups");
    if (clearPickupsBtn) {
      clearPickupsBtn.onclick = () => {
        scene?.clearAllPickups?.();
        this.updateStreetItemsInspector();
      };
    }

    const clearCratesBtn = itemsSec.querySelector("#sb-btn-clear-crates");
    if (clearCratesBtn) {
      clearCratesBtn.onclick = () => {
        scene?.clearAllCrates?.();
        this.updateStreetItemsInspector();
      };
    }

    const clearAllItemsBtn = itemsSec.querySelector("#sb-btn-clear-all-items");
    if (clearAllItemsBtn) {
      clearAllItemsBtn.onclick = () => {
        scene?.clearAllPickups?.();
        scene?.clearAllCrates?.();
        this.updateStreetItemsInspector();
      };
    }

    this.updateStreetItemsInspector();

    // 4. Buildings Dimensions & Visibility Section
    const buildingSec = document.createElement("div");
    buildingSec.className = "sb-section";
    const curB = this.state.data.ui.selectedBuilding;
    const bScaleX = curB === -1 ? this.state.data.scales.buildingsGlobal : this.state.data.scales.buildings[curB];
    const bScaleY = curB === -1 ? 1.0 : this.state.data.scales.buildingScaleY[curB];
    const bOffX = curB === -1 ? 0 : this.state.data.buildingOffsets.x[curB];
    const bOffY = curB === -1 ? 0 : this.state.data.buildingOffsets.y[curB];
    const isVisible = curB === -1 ? true : (this.state.data.buildingVisibility[curB] !== false);

    buildingSec.innerHTML = `
      <div class="sb-section-title">
        <span>Kond Tuff Buildings</span>
        <button class="sb-btn sb-btn-small" id="sb-btn-reset-buildings">Reset</button>
      </div>

      <div class="sb-row">
        <span class="sb-row-label">Target Building</span>
        <div class="sb-row-control">
          <select class="sb-select" id="sc-b-select" style="width: 100%;">
            <option value="-1" ${curB === -1 ? "selected" : ""}>All Buildings (Global)</option>
            ${Array.from({ length: 10 }, (_, i) => `<option value="${i}" ${curB === i ? "selected" : ""}>Building #${i + 1} (X: ${DEFAULT_BUILDING_X[i]}px)</option>`).join("")}
          </select>
        </div>
      </div>

      <div class="sb-row">
        <span class="sb-row-label">Building Visible</span>
        <div class="sb-row-control">
          <label class="sb-switch">
            <input type="checkbox" id="sc-b-vis" ${isVisible ? "checked" : ""} />
            <span class="sb-slider-switch"></span>
          </label>
        </div>
      </div>

      <div class="sb-row">
        <span class="sb-row-label">Scale X (Width)</span>
        <div class="sb-row-control">
          <input type="range" class="sb-slider" id="sc-b-scalex" min="0.3" max="2.8" step="0.05" value="${bScaleX}" />
          <span class="sb-val-pill" id="sc-b-scalex-val">${bScaleX.toFixed(2)}x</span>
        </div>
      </div>

      <div class="sb-row">
        <span class="sb-row-label">Scale Y (Height)</span>
        <div class="sb-row-control">
          <input type="range" class="sb-slider" id="sc-b-scaley" min="0.3" max="2.8" step="0.05" value="${bScaleY}" />
          <span class="sb-val-pill" id="sc-b-scaley-val">${bScaleY.toFixed(2)}x</span>
        </div>
      </div>

      <div class="sb-row">
        <span class="sb-row-label">X Position Offset</span>
        <div class="sb-row-control">
          <input type="range" class="sb-slider" id="sc-b-offx" min="-350" max="350" step="5" value="${bOffX}" />
          <span class="sb-val-pill" id="sc-b-offx-val">${bOffX}px</span>
        </div>
      </div>

      <div class="sb-row">
        <span class="sb-row-label">Y Baseline Offset</span>
        <div class="sb-row-control">
          <input type="range" class="sb-slider" id="sc-b-offy" min="-150" max="150" step="5" value="${bOffY}" />
          <span class="sb-val-pill" id="sc-b-offy-val">${bOffY}px</span>
        </div>
      </div>
    `;
    parent.appendChild(buildingSec);

    const bSelect = buildingSec.querySelector("#sc-b-select");
    bSelect.onchange = () => {
      this.state.data.ui.selectedBuilding = parseInt(bSelect.value, 10);
      this.renderTabContent("assets");
    };

    const bVisCb = buildingSec.querySelector("#sc-b-vis");
    bVisCb.onchange = () => {
      const idx = this.state.data.ui.selectedBuilding;
      if (idx === -1) {
        for (let i = 0; i < 10; i++) this.state.data.buildingVisibility[i] = bVisCb.checked;
      } else {
        this.state.data.buildingVisibility[idx] = bVisCb.checked;
      }
      this.applyBuildingTransforms();
    };

    this.bindSlider(buildingSec, "#sc-b-scalex", "#sc-b-scalex-val", (v) => {
      const idx = this.state.data.ui.selectedBuilding;
      if (idx === -1) {
        this.state.data.scales.buildingsGlobal = v;
      } else {
        this.state.data.scales.buildings[idx] = v;
      }
      this.applyBuildingTransforms();
    });

    this.bindSlider(buildingSec, "#sc-b-scaley", "#sc-b-scaley-val", (v) => {
      const idx = this.state.data.ui.selectedBuilding;
      if (idx === -1) {
        for (let i = 0; i < 10; i++) this.state.data.scales.buildingScaleY[i] = v;
      } else {
        this.state.data.scales.buildingScaleY[idx] = v;
      }
      this.applyBuildingTransforms();
    });

    this.bindSlider(buildingSec, "#sc-b-offx", "#sc-b-offx-val", (v) => {
      const idx = this.state.data.ui.selectedBuilding;
      if (idx !== -1) {
        this.state.data.buildingOffsets.x[idx] = v;
        this.applyBuildingTransforms();
      }
    }, "px");

    this.bindSlider(buildingSec, "#sc-b-offy", "#sc-b-offy-val", (v) => {
      const idx = this.state.data.ui.selectedBuilding;
      if (idx !== -1) {
        this.state.data.buildingOffsets.y[idx] = v;
        this.applyBuildingTransforms();
      }
    }, "px");

    buildingSec.querySelector("#sb-btn-reset-buildings").onclick = () => {
      this.state.data.scales.buildings = [...DEFAULT_BUILDING_SCALES];
      this.state.data.scales.buildingScaleY = [1, 1, 1, 1, 1, 1, 1, 1, 1, 1];
      this.state.data.scales.buildingsGlobal = 1.0;
      this.state.data.buildingOffsets.x = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
      this.state.data.buildingOffsets.y = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
      this.state.data.buildingVisibility = [true, true, true, true, true, true, true, true, true, true];
      this.applyBuildingTransforms();
      this.renderTabContent("assets");
    };

    // 4. Foregrounds Manager
    const fgSec = document.createElement("div");
    fgSec.className = "sb-section";
    fgSec.innerHTML = `
      <div class="sb-section-title">Foreground Parallax Strip</div>

      <div class="sb-row">
        <span class="sb-row-label">Strip Y Offset</span>
        <div class="sb-row-control">
          <input type="range" class="sb-slider" id="fg-pos-y" min="-120" max="120" step="2" value="${this.state.data.foreground.y}" />
          <span class="sb-val-pill" id="fg-pos-y-val">${this.state.data.foreground.y}px</span>
        </div>
      </div>

      <div class="sb-row">
        <span class="sb-row-label">Strip Scale</span>
        <div class="sb-row-control">
          <input type="range" class="sb-slider" id="fg-scale" min="0.5" max="2.5" step="0.05" value="${this.state.data.foreground.scaleY}" />
          <span class="sb-val-pill" id="fg-scale-val">${this.state.data.foreground.scaleY.toFixed(2)}x</span>
        </div>
      </div>

      <div class="sb-row">
        <span class="sb-row-label">Strip Opacity</span>
        <div class="sb-row-control">
          <input type="range" class="sb-slider" id="fg-alpha" min="0" max="1.0" step="0.05" value="${this.state.data.foreground.alpha}" />
          <span class="sb-val-pill" id="fg-alpha-val">${(this.state.data.foreground.alpha * 100).toFixed(0)}%</span>
        </div>
      </div>

      <div class="sb-row">
        <span class="sb-row-label">Strip Visible</span>
        <div class="sb-row-control">
          <label class="sb-switch">
            <input type="checkbox" id="fg-visible" ${this.state.data.foreground.visible ? "checked" : ""} />
            <span class="sb-slider-switch"></span>
          </label>
        </div>
      </div>
    `;
    parent.appendChild(fgSec);

    this.bindSlider(fgSec, "#fg-pos-y", "#fg-pos-y-val", (v) => {
      this.state.data.foreground.y = Math.round(v);
      this.applyForegroundTransform();
    }, "px");

    this.bindSlider(fgSec, "#fg-scale", "#fg-scale-val", (v) => {
      this.state.data.foreground.scaleX = v;
      this.state.data.foreground.scaleY = v;
      this.applyForegroundTransform();
    });

    this.bindSlider(fgSec, "#fg-alpha", "#fg-alpha-val", (v) => {
      this.state.data.foreground.alpha = v;
      this.applyForegroundTransform();
    }, "%", (val) => (val * 100).toFixed(0));

    const fgVis = fgSec.querySelector("#fg-visible");
    fgVis.onchange = () => {
      this.state.data.foreground.visible = fgVis.checked;
      this.applyForegroundTransform();
    };

    // 5. Character & Object Scales
    const charScaleSec = document.createElement("div");
    charScaleSec.className = "sb-section";
    charScaleSec.innerHTML = `
      <div class="sb-section-title">Character & Object Scales</div>

      <div class="sb-row">
        <span class="sb-row-label">Player (Davo) Scale</span>
        <div class="sb-row-control">
          <input type="range" class="sb-slider" id="sc-player" min="0.4" max="2.5" step="0.05" value="${this.state.data.scales.player}" />
          <span class="sb-val-pill" id="sc-player-val">${this.state.data.scales.player.toFixed(2)}x</span>
        </div>
      </div>

      <div class="sb-row">
        <span class="sb-row-label">Global Enemy Scale</span>
        <div class="sb-row-control">
          <input type="range" class="sb-slider" id="sc-enemies" min="0.4" max="2.5" step="0.05" value="${this.state.data.scales.enemies}" />
          <span class="sb-val-pill" id="sc-enemies-val">${this.state.data.scales.enemies.toFixed(2)}x</span>
        </div>
      </div>

      <div class="sb-row">
        <span class="sb-row-label">Crates Scale</span>
        <div class="sb-row-control">
          <input type="range" class="sb-slider" id="sc-crates" min="0.4" max="2.5" step="0.05" value="${this.state.data.scales.crates}" />
          <span class="sb-val-pill" id="sc-crates-val">${this.state.data.scales.crates.toFixed(2)}x</span>
        </div>
      </div>

      <div class="sb-row">
        <span class="sb-row-label">Pickups Scale</span>
        <div class="sb-row-control">
          <input type="range" class="sb-slider" id="sc-pickups" min="0.4" max="2.5" step="0.05" value="${this.state.data.scales.pickups}" />
          <span class="sb-val-pill" id="sc-pickups-val">${this.state.data.scales.pickups.toFixed(2)}x</span>
        </div>
      </div>
    `;
    parent.appendChild(charScaleSec);

    this.bindSlider(charScaleSec, "#sc-player", "#sc-player-val", (v) => {
      this.state.data.scales.player = v;
      this.applyPlayerScale(v);
    });

    this.bindSlider(charScaleSec, "#sc-enemies", "#sc-enemies-val", (v) => {
      this.state.data.scales.enemies = v;
      this.applyEnemyScales(v);
    });

    this.bindSlider(charScaleSec, "#sc-crates", "#sc-crates-val", (v) => {
      this.state.data.scales.crates = v;
      this.applyCrateScales(v);
    });

    this.bindSlider(charScaleSec, "#sc-pickups", "#sc-pickups-val", (v) => {
      this.state.data.scales.pickups = v;
      this.applyPickupScales(v);
    });
  }

  /* =========================================================================
   * TAB 3: VISUALS & TEXTURES (PALETTES, LIGHTING, COLOR GRADE)
   * ========================================================================= */
  renderVisualsTab(parent) {
    // 1. Character Skin & Weapon Switcher
    const charVisualSec = document.createElement("div");
    charVisualSec.className = "sb-section";
    charVisualSec.innerHTML = `
      <div class="sb-section-title">Character & Texture Swaps</div>

      <div class="sb-row">
        <span class="sb-row-label">Player Skin (Davo)</span>
        <div class="sb-row-control">
          <select class="sb-select" id="vis-player-skin" style="width: 100%;">
            <option value="player" ${this.state.data.visuals.playerPalette === "player" ? "selected" : ""}>Davo (Default Black/Cap)</option>
            <option value="boss" ${this.state.data.visuals.playerPalette === "boss" ? "selected" : ""}>Sev Vacho (Boss Black/Gold)</option>
            <option value="gunner" ${this.state.data.visuals.playerPalette === "gunner" ? "selected" : ""}>Gunner (Red Jacket)</option>
            <option value="shielder" ${this.state.data.visuals.playerPalette === "shielder" ? "selected" : ""}>Shielder (Blue Jacket)</option>
            <option value="thug1" ${this.state.data.visuals.playerPalette === "thug1" ? "selected" : ""}>Gago / Thug 1 (Green)</option>
            <option value="thug2" ${this.state.data.visuals.playerPalette === "thug2" ? "selected" : ""}>Thug 2 (Blue/Slate)</option>
            <option value="thug3" ${this.state.data.visuals.playerPalette === "thug3" ? "selected" : ""}>Mado / Thug 3 (Maroon)</option>
          </select>
        </div>
      </div>

      <div class="sb-row">
        <span class="sb-row-label">Equip Weapon</span>
        <div class="sb-row-control">
          <select class="sb-select" id="vis-weapon" style="width: 100%;">
            <option value="none">None (Fists)</option>
            <option value="stick" ${this.state.data.visuals.weapon === "stick" ? "selected" : ""}>Stick (ՓԱՅՏ)</option>
            <option value="bottle" ${this.state.data.visuals.weapon === "bottle" ? "selected" : ""}>Bottle (ՇԻՇ)</option>
            <option value="pistol" ${this.state.data.visuals.weapon === "pistol" ? "selected" : ""}>Makarov Pistol (ՄԱԿԱՐՈՎ)</option>
            <option value="lid" ${this.state.data.visuals.weapon === "lid" ? "selected" : ""}>Trash Lid (ԿԱՓԱԿ)</option>
          </select>
        </div>
      </div>

      <div class="sb-row">
        <span class="sb-row-label">Item in Hand Scale</span>
        <div class="sb-row-control">
          <input type="range" class="sb-slider" id="vis-weapon-scale" min="0.3" max="3.0" step="0.05" value="${this.state.data.visuals.weaponScale || 1.0}" />
          <span class="sb-val-pill" id="vis-weapon-scale-val">${(this.state.data.visuals.weaponScale || 1.0).toFixed(2)}x</span>
        </div>
      </div>

      <div class="sb-row">
        <span class="sb-row-label">Ammo / Uses</span>
        <div class="sb-row-control">
          <input type="range" class="sb-slider" id="vis-ammo" min="1" max="50" value="${this.state.data.visuals.ammo}" />
          <span class="sb-val-pill" id="vis-ammo-val">${this.state.data.visuals.ammo}</span>
        </div>
      </div>
    `;
    parent.appendChild(charVisualSec);

    const skinSelect = charVisualSec.querySelector("#vis-player-skin");
    skinSelect.onchange = () => {
      const skin = skinSelect.value;
      this.state.data.visuals.playerPalette = skin;
      this.applyPlayerPalette(skin);
    };

    const weaponSelect = charVisualSec.querySelector("#vis-weapon");
    weaponSelect.onchange = () => {
      const wKey = weaponSelect.value;
      this.state.data.visuals.weapon = wKey;
      this.applyWeapon(wKey, this.state.data.visuals.ammo, this.state.data.visuals.weaponScale || 1.0);
    };

    this.bindSlider(charVisualSec, "#vis-weapon-scale", "#vis-weapon-scale-val", (v) => {
      this.state.data.visuals.weaponScale = v;
      this.state.data.scales.handWeapon = v;
      this.applyWeapon(this.state.data.visuals.weapon, this.state.data.visuals.ammo, v);
    });

    this.bindSlider(charVisualSec, "#vis-ammo", "#vis-ammo-val", (v) => {
      this.state.data.visuals.ammo = Math.round(v);
      const wKey = this.state.data.visuals.weapon;
      if (wKey !== "none") {
        this.applyWeapon(wKey, Math.round(v), this.state.data.visuals.weaponScale || 1.0);
      }
    });

    // 2. Post-Processing & Color Grading Filter
    const filterSec = document.createElement("div");
    filterSec.className = "sb-section";
    filterSec.innerHTML = `
      <div class="sb-section-title">Color Grading & Post-Processing</div>

      <div class="sb-row">
        <span class="sb-row-label">Filter Preset</span>
        <div class="sb-row-control">
          <select class="sb-select" id="vis-filter-preset" style="width: 100%;">
            <option value="custom">Custom Values</option>
            <option value="default">Dusk (Chapter 1 Default)</option>
            <option value="night">Night Kond (Chapter 2)</option>
            <option value="dawn">Dawn Pink Tuff (Chapter 3)</option>
            <option value="noir">Yerevan Noir (B&W)</option>
            <option value="cyberpunk">Cyberpunk Neon</option>
            <option value="golden">Golden Hour</option>
          </select>
        </div>
      </div>

      <div class="sb-row">
        <span class="sb-row-label">Hue Rotation</span>
        <div class="sb-row-control">
          <input type="range" class="sb-slider" id="vis-hue" min="-180" max="180" value="${this.state.data.visuals.hue}" />
          <span class="sb-val-pill" id="vis-hue-val">${this.state.data.visuals.hue}°</span>
        </div>
      </div>

      <div class="sb-row">
        <span class="sb-row-label">Saturation</span>
        <div class="sb-row-control">
          <input type="range" class="sb-slider" id="vis-sat" min="0" max="3" step="0.05" value="${this.state.data.visuals.saturation}" />
          <span class="sb-val-pill" id="vis-sat-val">${this.state.data.visuals.saturation.toFixed(2)}x</span>
        </div>
      </div>

      <div class="sb-row">
        <span class="sb-row-label">Brightness</span>
        <div class="sb-row-control">
          <input type="range" class="sb-slider" id="vis-bright" min="0.2" max="2" step="0.05" value="${this.state.data.visuals.brightness}" />
          <span class="sb-val-pill" id="vis-bright-val">${this.state.data.visuals.brightness.toFixed(2)}x</span>
        </div>
      </div>

      <div class="sb-row">
        <span class="sb-row-label">Contrast</span>
        <div class="sb-row-control">
          <input type="range" class="sb-slider" id="vis-contrast" min="0.2" max="2.5" step="0.05" value="${this.state.data.visuals.contrast}" />
          <span class="sb-val-pill" id="vis-contrast-val">${this.state.data.visuals.contrast.toFixed(2)}x</span>
        </div>
      </div>
    `;
    parent.appendChild(filterSec);

    this.bindSlider(filterSec, "#vis-hue", "#vis-hue-val", (v) => {
      this.state.data.visuals.hue = v;
      this.applyColorGrading();
    }, "°");

    this.bindSlider(filterSec, "#vis-sat", "#vis-sat-val", (v) => {
      this.state.data.visuals.saturation = v;
      this.applyColorGrading();
    });

    this.bindSlider(filterSec, "#vis-bright", "#vis-bright-val", (v) => {
      this.state.data.visuals.brightness = v;
      this.applyColorGrading();
    });

    this.bindSlider(filterSec, "#vis-contrast", "#vis-contrast-val", (v) => {
      this.state.data.visuals.contrast = v;
      this.applyColorGrading();
    });

    // Preset switcher
    const filterPreset = filterSec.querySelector("#vis-filter-preset");
    filterPreset.onchange = () => {
      const val = filterPreset.value;
      if (val === "default") {
        this.state.data.visuals.hue = 0;
        this.state.data.visuals.saturation = 1.0;
        this.state.data.visuals.brightness = 1.0;
        this.state.data.visuals.contrast = 1.0;
      } else if (val === "night") {
        this.state.data.visuals.hue = -20;
        this.state.data.visuals.saturation = 0.7;
        this.state.data.visuals.brightness = 0.85;
        this.state.data.visuals.contrast = 1.2;
      } else if (val === "dawn") {
        this.state.data.visuals.hue = 15;
        this.state.data.visuals.saturation = 1.25;
        this.state.data.visuals.brightness = 1.05;
        this.state.data.visuals.contrast = 1.1;
      } else if (val === "noir") {
        this.state.data.visuals.hue = 0;
        this.state.data.visuals.saturation = 0.0;
        this.state.data.visuals.brightness = 0.9;
        this.state.data.visuals.contrast = 1.4;
      } else if (val === "cyberpunk") {
        this.state.data.visuals.hue = -65;
        this.state.data.visuals.saturation = 1.8;
        this.state.data.visuals.brightness = 1.05;
        this.state.data.visuals.contrast = 1.35;
      } else if (val === "golden") {
        this.state.data.visuals.hue = 25;
        this.state.data.visuals.saturation = 1.4;
        this.state.data.visuals.brightness = 1.1;
        this.state.data.visuals.contrast = 1.15;
      }
      this.applyColorGrading();
      this.renderTabContent("visuals");
    };

    // 3. Environmental Overlays & Layers
    const overlaySec = document.createElement("div");
    overlaySec.className = "sb-section";
    overlaySec.innerHTML = `
      <div class="sb-section-title">Atmosphere & Layer Toggles</div>

      <div class="sb-row">
        <span class="sb-row-label">Mood Tint Color</span>
        <div class="sb-row-control">
          <input type="color" id="vis-mood-color" value="${this.state.data.visuals.moodColor}" style="border: none; background: transparent; cursor: pointer; height: 24px; width: 40px;" />
          <input type="range" class="sb-slider" id="vis-mood-alpha" min="0" max="0.8" step="0.02" value="${this.state.data.visuals.moodAlpha}" />
          <span class="sb-val-pill" id="vis-mood-alpha-val">${(this.state.data.visuals.moodAlpha * 100).toFixed(0)}%</span>
        </div>
      </div>

      <div class="sb-row">
        <span class="sb-row-label">Vignette Frame</span>
        <div class="sb-row-control">
          <label class="sb-switch">
            <input type="checkbox" id="vis-vignette" ${this.state.data.visuals.vignette ? "checked" : ""} />
            <span class="sb-slider-switch"></span>
          </label>
        </div>
      </div>

      <div class="sb-btn-group" style="margin-top: 4px;">
        <button class="sb-btn sb-btn-small" id="sb-toggle-sky">Sky ${this.state.data.visuals.layerSky ? "✓" : "✗"}</button>
        <button class="sb-btn sb-btn-small" id="sb-toggle-far">Ararat ${this.state.data.visuals.layerFar ? "✓" : "✗"}</button>
        <button class="sb-btn sb-btn-small" id="sb-toggle-mid">Skyline ${this.state.data.visuals.layerMid ? "✓" : "✗"}</button>
        <button class="sb-btn sb-btn-small" id="sb-toggle-fore">Foreground ${this.state.data.visuals.layerFore ? "✓" : "✗"}</button>
      </div>
    `;
    parent.appendChild(overlaySec);

    const moodColorInput = overlaySec.querySelector("#vis-mood-color");
    moodColorInput.oninput = () => {
      this.state.data.visuals.moodColor = moodColorInput.value;
      this.applyAtmosphere();
    };

    this.bindSlider(overlaySec, "#vis-mood-alpha", "#vis-mood-alpha-val", (v) => {
      this.state.data.visuals.moodAlpha = v;
      this.applyAtmosphere();
    }, "%", (val) => (val * 100).toFixed(0));

    const vignetteCb = overlaySec.querySelector("#vis-vignette");
    vignetteCb.onchange = () => {
      this.state.data.visuals.vignette = vignetteCb.checked;
      this.applyAtmosphere();
    };

    // Layer toggles
    overlaySec.querySelector("#sb-toggle-sky").onclick = (e) => {
      this.state.data.visuals.layerSky = !this.state.data.visuals.layerSky;
      this.applyLayerVisibility();
      e.target.textContent = `Sky ${this.state.data.visuals.layerSky ? "✓" : "✗"}`;
    };
    overlaySec.querySelector("#sb-toggle-far").onclick = (e) => {
      this.state.data.visuals.layerFar = !this.state.data.visuals.layerFar;
      this.applyLayerVisibility();
      e.target.textContent = `Ararat ${this.state.data.visuals.layerFar ? "✓" : "✗"}`;
    };
    overlaySec.querySelector("#sb-toggle-mid").onclick = (e) => {
      this.state.data.visuals.layerMid = !this.state.data.visuals.layerMid;
      this.applyLayerVisibility();
      e.target.textContent = `Skyline ${this.state.data.visuals.layerMid ? "✓" : "✗"}`;
    };
    overlaySec.querySelector("#sb-toggle-fore").onclick = (e) => {
      this.state.data.visuals.layerFore = !this.state.data.visuals.layerFore;
      this.applyLayerVisibility();
      e.target.textContent = `Foreground ${this.state.data.visuals.layerFore ? "✓" : "✗"}`;
    };

    // 4. Synthesized Audio & SFX Audition Lab
    const sfxSec = document.createElement("div");
    sfxSec.className = "sb-section";
    sfxSec.innerHTML = `
      <div class="sb-section-title">🔊 WebAudio SFX Soundboard</div>
      <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 6px; margin-top: 8px;">
        <button class="sb-btn sb-btn-sm" id="sfx-hit">🥊 Punch Hit</button>
        <button class="sb-btn sb-btn-sm" id="sfx-heavy">💥 Heavy Impact</button>
        <button class="sb-btn sb-btn-sm" id="sfx-clang" style="border-color: #ffd060;">🛡️ Shield / Lid Clang</button>
        <button class="sb-btn sb-btn-sm" id="sfx-gunshot" style="border-color: #ff6a5e;">🔫 Makarov Gunshot</button>
        <button class="sb-btn sb-btn-sm" id="sfx-crate">📦 Crate Shatter</button>
        <button class="sb-btn sb-btn-sm" id="sfx-glass" style="border-color: #6bc9ff;">🍾 Glass Shatter</button>
        <button class="sb-btn sb-btn-sm" id="sfx-coin" style="border-color: #f7d070;">🪙 Dram Coin</button>
        <button class="sb-btn sb-btn-sm" id="sfx-super" style="border-color: #ffdc50;">⚡ ԿԱՅԾԱԿ Super</button>
        <button class="sb-btn sb-btn-sm" id="sfx-ko">💀 KO Impact</button>
        <button class="sb-btn sb-btn-sm" id="sfx-swing">💨 Attack Whoosh</button>
      </div>
    `;
    parent.appendChild(sfxSec);

    sfxSec.querySelector("#sfx-hit").onclick = () => sfx.hit();
    sfxSec.querySelector("#sfx-heavy").onclick = () => sfx.heavyHit();
    sfxSec.querySelector("#sfx-clang").onclick = () => sfx.clang();
    sfxSec.querySelector("#sfx-gunshot").onclick = () => sfx.gunshot();
    sfxSec.querySelector("#sfx-crate").onclick = () => sfx.crateBreak();
    sfxSec.querySelector("#sfx-glass").onclick = () => sfx.glassBreak();
    sfxSec.querySelector("#sfx-coin").onclick = () => sfx.coin();
    sfxSec.querySelector("#sfx-super").onclick = () => sfx.super();
    sfxSec.querySelector("#sfx-ko").onclick = () => sfx.ko();
    sfxSec.querySelector("#sfx-swing").onclick = () => sfx.swing();
  }

  /* =========================================================================
   * TAB 4: GAME & WAVES (CHEATS, WAVES, TIME SCALE, TELEPORT)
   * ========================================================================= */
  renderGameTab(parent) {
    // 1. Simulation & Time Control
    const timeSec = document.createElement("div");
    timeSec.className = "sb-section";
    timeSec.innerHTML = `
      <div class="sb-section-title">Time & Physics Simulation</div>

      <div class="sb-row">
        <span class="sb-row-label">Simulation Speed</span>
        <div class="sb-row-control">
          <input type="range" class="sb-slider" id="gm-timescale" min="0.1" max="3.0" step="0.05" value="${this.app?.timeScale || 1.0}" />
          <span class="sb-val-pill" id="gm-timescale-val">${(this.app?.timeScale || 1.0).toFixed(2)}x</span>
        </div>
      </div>

      <div class="sb-btn-group">
        <button class="sb-btn sb-btn-small" id="sb-spd-quarter">0.25x Slow-Mo</button>
        <button class="sb-btn sb-btn-small" id="sb-spd-half">0.5x</button>
        <button class="sb-btn sb-btn-small" id="sb-spd-norm">1.0x Normal</button>
        <button class="sb-btn sb-btn-small" id="sb-spd-double">2.0x Turbo</button>
      </div>
    `;
    parent.appendChild(timeSec);

    this.bindSlider(timeSec, "#gm-timescale", "#gm-timescale-val", (v) => {
      if (this.app) this.app.timeScale = v;
    });
    timeSec.querySelector("#sb-spd-quarter").onclick = () => this.setTimeScale(0.25);
    timeSec.querySelector("#sb-spd-half").onclick = () => this.setTimeScale(0.5);
    timeSec.querySelector("#sb-spd-norm").onclick = () => this.setTimeScale(1.0);
    timeSec.querySelector("#sb-spd-double").onclick = () => this.setTimeScale(2.0);

    // 2. Wave Navigation
    const waveSec = document.createElement("div");
    waveSec.className = "sb-section";
    const curWave = this.getScene()?.game?.wave || 1;
    waveSec.innerHTML = `
      <div class="sb-section-title">
        <span>Wave Controller</span>
        <span class="sb-status-pill">Active: Wave ${curWave}</span>
      </div>

      <div class="sb-row">
        <span class="sb-row-label">Jump to Wave</span>
        <div class="sb-row-control">
          <select class="sb-select" id="gm-wave-select" style="width: 100%;">
            <option value="1">Wave 1 — ԲԱԿԸ (The Yard)</option>
            <option value="2">Wave 2 — Yard Gang</option>
            <option value="3">Wave 3 — ԳԱԳՈ Gago (Boss 1)</option>
            <option value="4">Wave 4 — ՇՈՒԿԱՆ (Market & Gunners)</option>
            <option value="5">Wave 5 — Shielders</option>
            <option value="6">Wave 6 — ՄԱԴՈ Mado (Boss 2)</option>
            <option value="7">Wave 7 — ՁՈՐԸ (The Gorge)</option>
            <option value="8">Wave 8 — Heavy Brawlers</option>
            <option value="9">Wave 9 — ՍԵՎ ՎԱՉՈ Sev Vacho (Final Boss)</option>
            <option value="10">Wave 10+ — Endless Mode</option>
          </select>
        </div>
      </div>

      <div class="sb-btn-group" style="margin-top: 4px;">
        <button class="sb-btn sb-btn-primary" id="sb-btn-jump-wave" style="flex: 2;">Jump Wave</button>
        <button class="sb-btn" id="sb-btn-next-wave" style="flex: 1;">Next ⏩</button>
      </div>
    `;
    parent.appendChild(waveSec);

    waveSec.querySelector("#gm-wave-select").value = curWave <= 9 ? curWave : 10;
    waveSec.querySelector("#sb-btn-jump-wave").onclick = () => {
      const targetWave = parseInt(waveSec.querySelector("#gm-wave-select").value, 10);
      const scene = this.getScene();
      if (scene) scene.setWave(targetWave);
    };
    waveSec.querySelector("#sb-btn-next-wave").onclick = () => {
      const scene = this.getScene();
      if (scene) scene.setWave((scene.game.wave || 1) + 1);
    };

    // 3. Player Cheats & God Mode
    const cheatSec = document.createElement("div");
    cheatSec.className = "sb-section";
    cheatSec.innerHTML = `
      <div class="sb-section-title">Player Cheats & God Mode</div>

      <div class="sb-row">
        <span class="sb-row-label">God Mode (Invincible)</span>
        <div class="sb-row-control">
          <label class="sb-switch">
            <input type="checkbox" id="gm-godmode" ${this.state.data.cheats.godMode ? "checked" : ""} />
            <span class="sb-slider-switch"></span>
          </label>
        </div>
      </div>

      <div class="sb-row">
        <span class="sb-row-label">Infinite ԿԱՅԾԱԿ Super</span>
        <div class="sb-row-control">
          <label class="sb-switch">
            <input type="checkbox" id="gm-super" ${this.state.data.cheats.infiniteSuper ? "checked" : ""} />
            <span class="sb-slider-switch"></span>
          </label>
        </div>
      </div>

      <div class="sb-row">
        <span class="sb-row-label">One-Hit KO (999 Dmg)</span>
        <div class="sb-row-control">
          <label class="sb-switch">
            <input type="checkbox" id="gm-onehit" ${this.state.data.cheats.oneHitKO ? "checked" : ""} />
            <span class="sb-slider-switch"></span>
          </label>
        </div>
      </div>

      <div class="sb-btn-group" style="margin-top: 4px;">
        <button class="sb-btn sb-btn-small" id="sb-btn-full-heal">💚 Full Heal</button>
        <button class="sb-btn sb-btn-small" id="sb-btn-super-blast">⚡ Fill Super (100%)</button>
        <button class="sb-btn sb-btn-small" id="sb-btn-buff-speed">⚡ Tan Speed</button>
        <button class="sb-btn sb-btn-small" id="sb-btn-buff-rage">🍷 Cognac Rage</button>
      </div>
    `;
    parent.appendChild(cheatSec);

    cheatSec.querySelector("#gm-godmode").onchange = (e) => {
      this.state.data.cheats.godMode = e.target.checked;
    };
    cheatSec.querySelector("#gm-super").onchange = (e) => {
      this.state.data.cheats.infiniteSuper = e.target.checked;
    };
    cheatSec.querySelector("#gm-onehit").onchange = (e) => {
      this.state.data.cheats.oneHitKO = e.target.checked;
    };

    cheatSec.querySelector("#sb-btn-full-heal").onclick = () => {
      const scene = this.getScene();
      if (scene?.playerModel) {
        scene.playerModel.hp = scene.playerModel.maxHp;
        scene.spawnPopup(scene.playerModel.x, scene.playerModel.y - 70, "FULL HEAL!", 0x7ec850);
      }
    };
    cheatSec.querySelector("#sb-btn-super-blast").onclick = () => {
      const scene = this.getScene();
      if (scene?.game) {
        scene.game.super = 100;
      }
    };
    cheatSec.querySelector("#sb-btn-buff-speed").onclick = () => {
      const scene = this.getScene();
      if (scene?.game) {
        scene.game.buffs.speed = 450;
        scene.spawnPopup(scene.playerModel.x, scene.playerModel.y - 70, "SPEED UP!", 0xc8e8ff);
      }
    };
    cheatSec.querySelector("#sb-btn-buff-rage").onclick = () => {
      const scene = this.getScene();
      if (scene?.game) {
        scene.game.buffs.rage = 400;
        scene.spawnPopup(scene.playerModel.x, scene.playerModel.y - 70, "RAGE 2X!", 0xffc36b);
      }
    };

    // 4. Fast Travel / Teleport
    const teleSec = document.createElement("div");
    teleSec.className = "sb-section";
    teleSec.innerHTML = `
      <div class="sb-section-title">Fast Travel & Camera</div>
      <div class="sb-btn-group">
        <button class="sb-btn sb-btn-small" id="sb-tp-yard">📍 Yard (X=300)</button>
        <button class="sb-btn sb-btn-small" id="sb-tp-market">📍 Market (X=1300)</button>
        <button class="sb-btn sb-btn-small" id="sb-tp-gorge">📍 Gorge (X=2300)</button>
      </div>
    `;
    parent.appendChild(teleSec);

    teleSec.querySelector("#sb-tp-yard").onclick = () => this.teleportPlayer(300);
    teleSec.querySelector("#sb-tp-market").onclick = () => this.teleportPlayer(1300);
    teleSec.querySelector("#sb-tp-gorge").onclick = () => this.teleportPlayer(2300);
  }

  /* =========================================================================
   * TAB 5: PRESETS & PERSISTENCE
   * ========================================================================= */
  renderPresetsTab(parent) {
    const sec = document.createElement("div");
    sec.className = "sb-section";
    sec.innerHTML = `
      <div class="sb-section-title">Saved Configurations</div>
      <p style="margin: 0; color: #a99bbd;">Your sandbox settings auto-save to browser localStorage and persist across reloads.</p>

      <div class="sb-btn-group" style="margin-top: 8px;">
        <button class="sb-btn sb-btn-primary" id="sb-btn-save-now">💾 Save Config Now</button>
        <button class="sb-btn" id="sb-btn-reset-all">🔄 Reset All to Defaults</button>
      </div>

      <div class="sb-section-title" style="margin-top: 14px;">Developer Presets</div>
      <div class="sb-btn-group">
        <button class="sb-btn sb-btn-small" id="sb-pre-default">Production Default</button>
        <button class="sb-btn sb-btn-small" id="sb-pre-boss">Boss Battle Arena</button>
        <button class="sb-btn sb-btn-small" id="sb-pre-gunner">Gunner Gauntlet</button>
        <button class="sb-btn sb-btn-small" id="sb-pre-micro">Micro Brawler</button>
        <button class="sb-btn sb-btn-small" id="sb-pre-noir">Night Kond Noir</button>
      </div>

      <div class="sb-section-title" style="margin-top: 14px;">Export / Import JSON</div>
      <textarea class="sb-input" id="sb-json-io" rows="4" style="width: 100%; font-family: monospace; font-size: 10px; resize: vertical;"></textarea>

      <div class="sb-btn-group" style="margin-top: 6px;">
        <button class="sb-btn sb-btn-small" id="sb-btn-export">📋 Export JSON</button>
        <button class="sb-btn sb-btn-small" id="sb-btn-import">📥 Import JSON</button>
      </div>
    `;
    parent.appendChild(sec);

    sec.querySelector("#sb-btn-save-now").onclick = () => {
      this.state.saveToStorage();
      alert("Dev Sandbox configuration saved to localStorage!");
    };
    sec.querySelector("#sb-btn-reset-all").onclick = () => {
      if (confirm("Reset all sandbox scales, visuals, and cheats to production defaults?")) {
        this.state.resetToDefaults();
        this.applyAllState();
        this.renderTabContent(this.state.data.ui.activeTab);
      }
    };

    // Presets
    const applyPre = (pName) => {
      this.state.applyPreset(pName);
      this.applyAllState();
      this.renderTabContent(this.state.data.ui.activeTab);
    };
    sec.querySelector("#sb-pre-default").onclick = () => applyPre("default");
    sec.querySelector("#sb-pre-boss").onclick = () => applyPre("boss_arena");
    sec.querySelector("#sb-pre-gunner").onclick = () => applyPre("gunner_gauntlet");
    sec.querySelector("#sb-pre-micro").onclick = () => applyPre("micro_brawler");
    sec.querySelector("#sb-pre-noir").onclick = () => applyPre("night_kond_noir");

    // Export/Import
    const jsonArea = sec.querySelector("#sb-json-io");
    jsonArea.value = this.state.exportJSON();

    sec.querySelector("#sb-btn-export").onclick = () => {
      jsonArea.value = this.state.exportJSON();
      navigator.clipboard?.writeText(jsonArea.value);
      alert("Configuration JSON copied to clipboard!");
    };

    sec.querySelector("#sb-btn-import").onclick = () => {
      const ok = this.state.importJSON(jsonArea.value);
      if (ok) {
        this.applyAllState();
        this.renderTabContent(this.state.data.ui.activeTab);
        alert("Configuration JSON loaded successfully!");
      } else {
        alert("Invalid JSON configuration.");
      }
    };
  }

  /* =========================================================================
   * REAL-TIME ENGINE APPLIERS
   * ========================================================================= */
  applyAllState() {
    this.applyPlayerScale(this.state.data.scales.player);
    this.applyEnemyScales(this.state.data.scales.enemies);
    this.applyBuildingTransforms();
    this.applySkylineTransforms();
    this.applyStreetTransform();
    this.applyFloorBounds();
    this.applyForegroundTransform();
    this.applyProps();
    this.applyCrateScales(this.state.data.scales.crates);
    this.applyPickupScales(this.state.data.scales.pickups);
    this.applyPlayerPalette(this.state.data.visuals.playerPalette);
    this.applyWeapon(this.state.data.visuals.weapon, this.state.data.visuals.ammo, this.state.data.visuals.weaponScale);
    this.applyColorGrading();
    this.applyAtmosphere();
    this.applyLayerVisibility();
  }

  applySkylineTransforms() {
    const scene = this.getScene();
    if (!scene) return;
    const sky = this.state.data.skyline;
    if (!sky) return;

    scene.setFarTransform({
      scaleX: sky.araratScaleX,
      scaleY: sky.araratScaleY,
      x: sky.araratX,
      y: sky.araratY,
      alpha: sky.araratAlpha,
      visible: sky.araratVisible,
    });

    scene.setMidTransform({
      scaleX: sky.midScaleX,
      scaleY: sky.midScaleY,
      x: sky.midX,
      y: sky.midY,
      alpha: sky.midAlpha,
      visible: sky.midVisible,
    });

    scene.setCablesTransform({
      visible: sky.cablesVisible,
    });

    scene.setFencesTransform({
      visible: sky.fencesVisible,
    });
  }

  applyPlayerScale(mult) {
    const scene = this.getScene();
    if (scene?.playerModel && scene?.playerView) {
      scene.playerModel.scaleF = (scene.playerView.baseScale || 1.08) * CHAR_SCALE * mult;
      if (scene.playerView.setScaleMultiplier) {
        scene.playerView.setScaleMultiplier(mult);
      }
    }
  }

  applyEnemyScales(mult) {
    const scene = this.getScene();
    if (!scene?.enemies) return;
    for (const enemy of scene.enemies) {
      const view = scene.enemyViews.get(enemy);
      if (view?.setScaleMultiplier) {
        view.setScaleMultiplier(mult);
        enemy.scaleF = (view.baseScale || 1.0) * CHAR_SCALE * mult;
      }
    }
  }

  applyStreetTransform() {
    const scene = this.getScene();
    if (!scene) return;
    scene.setStreetTransform(this.state.data.street);
  }

  applyFloorBounds() {
    const scene = this.getScene();
    if (!scene) return;
    scene.setFloorBounds(
      this.state.data.floor.top,
      this.state.data.floor.bottom,
      this.state.data.floor.showBounds
    );
  }

  applyForegroundTransform() {
    const scene = this.getScene();
    if (!scene) return;
    scene.setForegroundTransform(this.state.data.foreground);
  }

  applyProps() {
    const scene = this.getScene();
    if (!scene?.bg || !scene.actors) return;
    scene.bg.customPropsConfig = this.state.data.props;
    scene.bg.buildProps(scene.actors);
  }

  updatePropInEngine(id, transforms) {
    const scene = this.getScene();
    if (scene) {
      scene.updateProp(id, transforms);
    }
  }

  removePropInEngine(id) {
    const idx = this.state.data.props.findIndex((p) => p.id === id);
    if (idx !== -1) {
      this.state.data.props.splice(idx, 1);
    }
    if (this.state.data.ui.selectedPropId === id) {
      this.state.data.ui.selectedPropId = this.state.data.props[0]?.id || null;
    }
    const scene = this.getScene();
    if (scene) {
      scene.removeProp(id);
    }
  }

  addConfiguredProp(x, y, type, posChoice = "center") {
    const scene = this.getScene();
    let spawnX = x;
    let spawnY = y;

    if (spawnX === null || spawnX === undefined) {
      if (posChoice === "player" && scene?.playerModel) {
        spawnX = scene.playerModel.x + 80;
        spawnY = scene.playerModel.y;
      } else {
        spawnX = (scene?.game?.camX || 0) + W / 2;
        spawnY = 430;
      }
    }

    if (spawnY === null || spawnY === undefined) {
      spawnY = 430;
    }

    const floorTop = scene?.floorTop || 392;
    const floorBottom = scene?.floorBottom || 538;
    spawnY = Math.max(floorTop, Math.min(floorBottom, spawnY));

    const id = `${type}_${Date.now()}`;
    const scale = 1.0;
    const newProp = { id, type, x: Math.round(spawnX), y: Math.round(spawnY), scale };

    this.state.data.props.push(newProp);
    this.state.data.ui.selectedPropId = id;

    if (scene?.bg) {
      scene.bg.createPropSprite(newProp);
    }
    return newProp;
  }

  applyBuildingTransforms() {
    const scene = this.getScene();
    if (!scene?.bg?.buildings) return;

    const bSprites = scene.bg.buildings;
    const scales = this.state.data.scales.buildings;
    const scalesY = this.state.data.scales.buildingScaleY;
    const globalM = this.state.data.scales.buildingsGlobal;
    const offX = this.state.data.buildingOffsets.x;
    const offY = this.state.data.buildingOffsets.y;
    const vis = this.state.data.buildingVisibility || [];

    for (let i = 0; i < bSprites.length; i++) {
      const s = bSprites[i];
      const sx = (scales[i] || 1.0) * globalM;
      const sy = (scalesY[i] || 1.0) * globalM;
      s.scale.set(sx, sy);
      s.x = (DEFAULT_BUILDING_X[i] || 0) + (offX[i] || 0);
      s.y = 398 + (offY[i] || 0);
      if (vis[i] !== undefined) {
        s.visible = vis[i];
      }
    }
  }

  applyPropsScales() {
    const scene = this.getScene();
    if (!scene?.actors?.children) return;

    const tex = textureManager.textures?.props;
    if (!tex) return;

    for (const child of scene.actors.children) {
      if (child.texture === tex.lada) {
        child.scale.set(this.state.data.scales.propsLada);
      } else if (child.texture === tex.lamp) {
        child.scale.set(this.state.data.scales.propsLamps);
      } else if (child.texture === tex.bin) {
        child.scale.set(this.state.data.scales.propsBins);
      }
    }
  }

  applyCrateScales(mult) {
    const scene = this.getScene();
    if (!scene?.crates) return;
    for (const c of scene.crates) {
      const view = scene.crateViews.get(c);
      if (view) view.scale.set(CHAR_SCALE * mult);
    }
  }

  applyPickupScales(mult) {
    const scene = this.getScene();
    if (!scene?.pickups) return;
    for (const p of scene.pickups) {
      const view = scene.pickupViews.get(p);
      if (view) view.scale.set(CHAR_SCALE * mult);
    }
  }

  applyPlayerPalette(skinKey) {
    const scene = this.getScene();
    if (scene?.playerView?.setPalette) {
      scene.playerView.setPalette(skinKey);
    }
  }

  applyWeapon(kind, usesOrAmmo, scale = null) {
    const scene = this.getScene();
    if (!scene?.playerModel) return;

    if (scale === null || scale === undefined) {
      scale = this.state.data.visuals.weaponScale || 1.0;
    }

    if (kind === "none") {
      scene.playerModel.setWeapon(null);
      if (scene.playerView) {
        scene.playerView.setWeaponGraphic(null);
      }
      return;
    }

    const def = WEAPONS[kind] || { melee: true, range: 50, dmg: 15, kb: 5 };
    const weaponObj = {
      kind,
      def,
      uses: def.uses || usesOrAmmo,
      ammo: def.ammo !== undefined ? usesOrAmmo : undefined,
      scale,
    };
    scene.playerModel.setWeapon(weaponObj);
    if (scene.playerView) {
      scene.playerView.setWeaponScale(scale);
      scene.playerView.setWeaponGraphic(weaponObj);
    }
  }

  applyColorGrading() {
    const scene = this.getScene();
    if (!scene?.grade) return;

    const f = scene.grade;
    const v = this.state.data.visuals;
    f.reset();
    if (v.hue !== 0) f.hue(v.hue, false);
    if (v.saturation !== 1.0) f.saturate(v.saturation, true);
    if (v.brightness !== 1.0) f.brightness(v.brightness, true);
    if (v.contrast !== 1.0) f.contrast(v.contrast, true);
  }

  applyAtmosphere() {
    const scene = this.getScene();
    if (!scene) return;

    // Mood overlay
    if (scene.moodTint) {
      const hex = parseInt(this.state.data.visuals.moodColor.replace("#", ""), 16);
      scene.moodTint.clear().rect(0, 0, W, H).fill(hex);
      scene.moodTint.alpha = this.state.data.visuals.moodAlpha;
    }

    // Vignette
    if (scene.vignette) {
      scene.vignette.visible = this.state.data.visuals.vignette;
    }
  }

  applyLayerVisibility() {
    const scene = this.getScene();
    if (!scene?.bg) return;

    const v = this.state.data.visuals;
    if (scene.bg.sky) scene.bg.sky.visible = v.layerSky;
    if (scene.bg.far) scene.bg.far.visible = v.layerFar;
    if (scene.bg.mid) scene.bg.mid.visible = v.layerMid;
    if (scene.bg.scenery) scene.bg.scenery.visible = v.layerScenery;
    if (scene.bg.fore) scene.bg.fore.visible = v.layerFore;
  }

  teleportPlayer(x) {
    const scene = this.getScene();
    if (scene?.playerModel) {
      scene.playerModel.x = x;
      scene.playerModel.vx = 0;
      scene.playerModel.vy = 0;
    }
  }

  setTimeScale(spd) {
    if (this.app) {
      this.app.timeScale = spd;
      const slider = document.getElementById("gm-timescale");
      const val = document.getElementById("gm-timescale-val");
      if (slider) slider.value = spd;
      if (val) val.textContent = spd.toFixed(2) + "x";
    }
  }

  /* =========================================================================
   * EVENT BINDINGS & INPUTS
   * ========================================================================= */
  bindKeyboardShortcuts() {
    window.addEventListener("keydown", (e) => {
      // Toggle sandbox on backquote / tilde key
      if (e.code === "Backquote") {
        e.preventDefault();
        this.toggle();
      }
      // Quick pause on 'P' key when not focused in input
      if (e.code === "KeyP" && !["INPUT", "SELECT", "TEXTAREA"].includes(document.activeElement?.tagName)) {
        if (this.app) {
          this.app.paused = !this.app.paused;
          const pauseBtn = document.getElementById("sb-btn-pause");
          if (pauseBtn) {
            pauseBtn.textContent = this.app.paused ? "▶" : "⏸";
            pauseBtn.style.color = this.app.paused ? "#7ec850" : "#d8cfea";
          }
        }
      }
    });
  }

  bindCanvasInteraction() {
    // Click on game canvas to place entities if in click-to-place mode
    const canvas = this.app?.pixiApp?.canvas;
    if (!canvas) return;

    canvas.addEventListener("click", (e) => {
      if (!this.clickToPlaceMode) return;

      const rect = canvas.getBoundingClientRect();
      const scaleX = W / rect.width;
      const scaleY = H / rect.height;
      const canvasX = (e.clientX - rect.left) * scaleX;
      const canvasY = (e.clientY - rect.top) * scaleY;

      const scene = this.getScene();
      if (!scene) return;

      const floorTop = scene.floorTop || FLOOR_TOP;
      const floorBottom = scene.floorBottom || FLOOR_BOTTOM;
      const worldX = scene.game.camX + canvasX;
      const worldY = Math.max(floorTop, Math.min(floorBottom, canvasY));

      if (this.clickToPlaceMode === "enemy") {
        this.spawnConfiguredEnemy(worldX, worldY);
      } else if (this.clickToPlaceMode === "crate") {
        scene.spawnCustomCrate(worldX, worldY);
      } else if (this.clickToPlaceMode === "pickup") {
        scene.spawnCustomPickup(this.pendingItemType || "shawarma", worldX, worldY);
      } else if (this.clickToPlaceMode === "prop") {
        this.addConfiguredProp(worldX, worldY, this.pendingPropType || "lamp");
        this.renderTabContent("assets");
      }

      this.clickToPlaceMode = null;
      this.pendingPropType = null;
      this.pendingItemType = null;
      const pill = document.getElementById("sb-placement-pill");
      if (pill) {
        pill.textContent = "Spawned!";
        pill.style.color = "#7ec850";
        setTimeout(() => {
          if (pill) {
            pill.textContent = "Ready";
            pill.style.color = "#92e660";
          }
        }, 1200);
      }
      const propPill = document.getElementById("sb-prop-status-pill");
      if (propPill) {
        propPill.textContent = "Placed!";
        propPill.style.color = "#7ec850";
      }
      const itemPill = document.getElementById("sb-item-status-pill");
      if (itemPill) {
        itemPill.textContent = "Placed!";
        itemPill.style.color = "#7ec850";
        setTimeout(() => {
          if (itemPill) {
            itemPill.textContent = "Ready";
            itemPill.style.color = "#92e660";
          }
        }, 1200);
      }
      if (this.state.data.ui.activeTab === "assets") {
        this.updateStreetItemsInspector();
      }
    });
  }

  bindSlider(root, sel, valSel, onValChange, suffix = "x", formatFn = null) {
    const input = root.querySelector(sel);
    const label = root.querySelector(valSel);
    if (!input || !label) return;

    input.oninput = () => {
      const v = parseFloat(input.value);
      label.textContent = formatFn ? formatFn(v) + suffix : (suffix === "x" ? v.toFixed(2) + "x" : v + suffix);
      onValChange(v);
    };
  }

  /* =========================================================================
   * SYNCHRONIZATION LOOP (TELEMETRY & CHEATS ENFORCEMENT)
   * ========================================================================= */
  startSyncLoop() {
    let frameCounter = 0;
    let fpsTime = performance.now();

    this.syncInterval = setInterval(() => {
      const scene = this.getScene();
      if (scene && this.activeScene !== scene) {
        this.activeScene = scene;
        this.applyAllState();
      }
      
      // Calculate FPS
      frameCounter++;
      const now = performance.now();
      if (now - fpsTime >= 500) {
        this.fps = Math.round((frameCounter * 1000) / (now - fpsTime));
        frameCounter = 0;
        fpsTime = now;
      }

      // Update Header & Footer Badges
      const launchFps = document.getElementById("sb-launcher-fps");
      const footFps = document.getElementById("sb-foot-fps");
      if (launchFps) launchFps.textContent = `${this.fps} FPS`;
      if (footFps) footFps.textContent = this.fps;

      if (scene) {
        const footNpcs = document.getElementById("sb-foot-npcs");
        const footWave = document.getElementById("sb-foot-wave");
        const footHp = document.getElementById("sb-foot-hp");
        const modeBadge = document.getElementById("sb-mode-badge");

        if (footNpcs) footNpcs.textContent = scene.enemies ? scene.enemies.length : 0;
        if (footWave) footWave.textContent = scene.game?.wave || 1;
        if (footHp && scene.playerModel) {
          footHp.textContent = `${Math.round(scene.playerModel.hp)}/${scene.playerModel.maxHp}`;
        }
        if (modeBadge) {
          modeBadge.textContent = scene.game?.mode?.toUpperCase() || "PLAYING";
        }

        // Apply active cheats in real-time
        if (this.state.data.cheats.godMode && scene.playerModel) {
          scene.playerModel.invul = 60;
          if (scene.playerModel.hp < scene.playerModel.maxHp) {
            scene.playerModel.hp = scene.playerModel.maxHp;
          }
        }
        if (this.state.data.cheats.infiniteSuper && scene.game) {
          scene.game.super = 100;
        }
        if (this.state.data.cheats.oneHitKO && scene.playerModel) {
          scene.playerModel.power = 999;
        }

        // Periodically refresh NPC inspector table if entities tab is active
        if (this.state.data.ui.isOpen && this.state.data.ui.activeTab === "entities") {
          this.updateNPCInspector();
        }
        // Periodically refresh street items table if assets tab is active
        if (this.state.data.ui.isOpen && this.state.data.ui.activeTab === "assets") {
          this.updateStreetItemsInspector();
        }
        // Periodically refresh physics telemetry if physics tab is active
        if (this.state.data.ui.isOpen && this.state.data.ui.activeTab === "physics") {
          this.updatePhysicsTelemetry();
        }
      }
    }, 200);
  }

  /* =========================================================================
   * TAB 0: PHYSICS & HITBOX OVERLAYS & TESTING ARENA
   * ========================================================================= */
  renderPhysicsTab(parent) {
    const dbg = this.state.data.debug || {};
    const sec = document.createElement("div");
    sec.className = "sb-section";
    sec.innerHTML = `
      <div class="sb-section-title">🥊 Real-Time Physics & Hitbox Overlays</div>
      <p style="font-size: 11px; color: #a59cb8; margin-bottom: 12px;">
        Inspect combat hitboxes, hurtboxes, 2.5D lane depth tolerance, and physics vectors live on canvas.
      </p>

      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 14px;">
        <label class="sb-toggle-label" style="display:flex; align-items:center; gap:8px; cursor:pointer;">
          <input type="checkbox" id="dbg-hitboxes" ${dbg.hitboxes ? "checked" : ""} />
          <span style="color: #ff6a5e; font-weight:600; font-size:12px;">🟥 Attack Hitboxes</span>
        </label>
        <label class="sb-toggle-label" style="display:flex; align-items:center; gap:8px; cursor:pointer;">
          <input type="checkbox" id="dbg-hurtboxes" ${dbg.hurtboxes ? "checked" : ""} />
          <span style="color: #7ec850; font-weight:600; font-size:12px;">🟩 Target Hurtboxes</span>
        </label>
        <label class="sb-toggle-label" style="display:flex; align-items:center; gap:8px; cursor:pointer;">
          <input type="checkbox" id="dbg-depth" ${dbg.depthBand ? "checked" : ""} />
          <span style="color: #ffd464; font-weight:600; font-size:12px;">🟨 Y-Depth Combat Lane</span>
        </label>
        <label class="sb-toggle-label" style="display:flex; align-items:center; gap:8px; cursor:pointer;">
          <input type="checkbox" id="dbg-vectors" ${dbg.vectors ? "checked" : ""} />
          <span style="color: #5ac8fa; font-weight:600; font-size:12px;">🟦 Velocity Vectors</span>
        </label>
        <label class="sb-toggle-label" style="display:flex; align-items:center; gap:8px; cursor:pointer;">
          <input type="checkbox" id="dbg-separation" ${dbg.separation ? "checked" : ""} />
          <span style="color: #007aff; font-weight:600; font-size:12px;">🔵 2.5D Body Push Rings</span>
        </label>
        <label class="sb-toggle-label" style="display:flex; align-items:center; gap:8px; cursor:pointer;">
          <input type="checkbox" id="dbg-projectiles" ${dbg.projectiles ? "checked" : ""} />
          <span style="color: #af52de; font-weight:600; font-size:12px;">🟣 Swept Projectile Rays</span>
        </label>
      </div>

      <div class="sb-section-title" style="margin-top:16px;">⏱️ Frame Stepper & Simulation Speed</div>
      <div style="display: flex; gap: 8px; margin-bottom: 14px; align-items: center; flex-wrap: wrap;">
        <button class="sb-btn" id="sb-step-1f" style="padding: 6px 12px;">⏯️ Step +1 Frame</button>
        <button class="sb-btn" id="sb-step-5f" style="padding: 6px 12px;">⏩ Step +5 Frames</button>
        <span style="font-size:11px; color:#888;">Speed:</span>
        <button class="sb-btn ${this.app?.timeScale === 0.25 ? "sb-btn-active" : ""}" id="sb-speed-25" style="padding: 4px 8px; font-size:11px;">0.25x</button>
        <button class="sb-btn ${this.app?.timeScale === 0.50 ? "sb-btn-active" : ""}" id="sb-speed-50" style="padding: 4px 8px; font-size:11px;">0.5x</button>
        <button class="sb-btn ${(!this.app?.timeScale || this.app?.timeScale === 1.0) ? "sb-btn-active" : ""}" id="sb-speed-100" style="padding: 4px 8px; font-size:11px;">1.0x</button>
      </div>

      <div class="sb-section-title" style="margin-top:16px;">🥋 Combat Testing Dummy Lab</div>
      <div style="display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 12px;">
        <button class="sb-btn" id="sb-spawn-passive-dummy">🥊 Spawn Passive Dummy</button>
        <button class="sb-btn" id="sb-spawn-jumping-dummy">🦘 Spawn Jumping Dummy</button>
        <button class="sb-btn" id="sb-spawn-shielder-dummy">🛡️ Spawn Guarding Shielder</button>
        <button class="sb-btn" id="sb-clear-dummies" style="background: rgba(180,40,40,0.3); border-color:#e65040;">🗑️ Clear Dummies</button>
      </div>

      <div class="sb-section-title" style="margin-top:16px;">📊 Live Combat Telemetry</div>
      <div id="sb-live-combat-telemetry" style="font-family: monospace; font-size: 11px; background: rgba(0,0,0,0.35); padding: 10px; border-radius: 6px; border: 1px solid rgba(255,255,255,0.08); line-height: 1.6;">
        Loading live player telemetry...
      </div>
    `;
    parent.appendChild(sec);

    // Bind toggles
    const bindToggle = (id, key) => {
      const cb = sec.querySelector(`#${id}`);
      if (cb) {
        cb.onchange = (e) => {
          this.state.data.debug[key] = e.target.checked;
          this.state.saveToStorage();
        };
      }
    };
    bindToggle("dbg-hitboxes", "hitboxes");
    bindToggle("dbg-hurtboxes", "hurtboxes");
    bindToggle("dbg-depth", "depthBand");
    bindToggle("dbg-vectors", "vectors");
    bindToggle("dbg-separation", "separation");
    bindToggle("dbg-projectiles", "projectiles");

    // Stepper buttons
    sec.querySelector("#sb-step-1f").onclick = () => {
      this.app.paused = true;
      this.app.stepFrame = true;
    };
    sec.querySelector("#sb-step-5f").onclick = () => {
      this.app.paused = true;
      this.app.stepFramesCount = 5;
    };
    sec.querySelector("#sb-speed-25").onclick = () => { this.app.timeScale = 0.25; this.renderTabContent("physics"); };
    sec.querySelector("#sb-speed-50").onclick = () => { this.app.timeScale = 0.50; this.renderTabContent("physics"); };
    sec.querySelector("#sb-speed-100").onclick = () => { this.app.timeScale = 1.00; this.renderTabContent("physics"); };

    // Dummies
    sec.querySelector("#sb-spawn-passive-dummy").onclick = () => this.spawnCombatDummy("passive");
    sec.querySelector("#sb-spawn-jumping-dummy").onclick = () => this.spawnCombatDummy("jumping");
    sec.querySelector("#sb-spawn-shielder-dummy").onclick = () => this.spawnCombatDummy("shielder");
    sec.querySelector("#sb-clear-dummies").onclick = () => this.clearCombatDummies();

    this.updatePhysicsTelemetry();
  }

  spawnCombatDummy(type) {
    const scene = this.getScene();
    if (!scene || !scene.playerModel) return;
    const pm = scene.playerModel;
    const spawnX = Math.min(WORLD_W - 60, pm.x + pm.facing * 75);
    const spawnY = pm.y;

    let palette = "thug1";
    let archetype = "dummy";
    let hp = 100;

    if (type === "shielder") {
      palette = "shielder";
      archetype = "shielder";
      hp = 120;
    } else if (type === "jumping") {
      palette = "thug2";
      archetype = "jumping_dummy";
    }

    const enemy = scene.spawnEnemy({
      x: spawnX,
      y: spawnY,
      palette,
      archetype,
      scale: 1.0,
      hp,
      power: 0.5,
      speed: 0,
      name: type.toUpperCase() + " DUMMY",
    });

    if (enemy) {
      enemy.dummy = true;
      if (type === "jumping") {
        const jumpInt = setInterval(() => {
          if (!enemy.alive) {
            clearInterval(jumpInt);
          } else if (enemy.z === 0) {
            enemy.jump();
          }
        }, 1100);
      }
    }
  }

  clearCombatDummies() {
    const scene = this.getScene();
    if (!scene) return;
    for (let i = scene.enemies.length - 1; i >= 0; i--) {
      const e = scene.enemies[i];
      if (e.dummy || e.archetype?.includes("dummy")) {
        e.removed = true;
      }
    }
  }

  updatePhysicsTelemetry() {
    const el = document.getElementById("sb-live-combat-telemetry");
    if (!el) return;
    const scene = this.getScene();
    if (!scene || !scene.playerModel) {
      el.textContent = "No active player";
      return;
    }
    const pm = scene.playerModel;
    const activeHit = pm.getActiveHit();
    el.innerHTML = `
      <div><strong>Player:</strong> Pos: (${Math.round(pm.x)}, ${Math.round(pm.y)}, z:${Math.round(pm.z)}) | Vel: (${pm.vx.toFixed(2)}, ${pm.vy.toFixed(2)}) | kbX: ${pm.kbX.toFixed(2)}</div>
      <div><strong>State:</strong> <span style="color:#7ec850;">${pm.state}</span> | Facing: ${pm.facing > 0 ? "RIGHT →" : "LEFT ←"} | Invul: ${Math.round(pm.invul)}f</div>
      <div><strong>Attack:</strong> ${pm.attackKind || "none"} (${Math.round(pm.attackTimer)}f) | Active Hit: ${activeHit ? `<span style="color:#ff6a5e; font-weight:bold;">YES (range: ${Math.round(activeHit.range)}, dmg: ${activeHit.dmg})</span>` : '<span style="color:#888;">NO</span>'}</div>
      <div><strong>Weapon:</strong> ${pm.weapon ? `${pm.weapon.kind} (uses: ${pm.weapon.uses ?? pm.weapon.ammo ?? "inf"})` : "none"} | Super: ${Math.round(scene.game.super)}%</div>
      <div><strong>Enemies in Depth Lane:</strong> ${scene.enemies.filter(e => Math.abs(e.y - pm.y) <= COMBAT_DEPTH_BAND * pm.scaleF).length} / ${scene.enemies.length} alive</div>
    `;
  }

  /* =========================================================================
   * TAB 6: IN-ENGINE ASSET GALLERY
   * ========================================================================= */
  renderGalleryTab(parent) {
    const sec = document.createElement("div");
    sec.className = "sb-section";
    const manifest = textureManager.manifest || {};
    const keys = Object.keys(manifest);

    sec.innerHTML = `
      <div class="sb-section-title">🖼️ In-Engine Asset Gallery & Sizing Checker</div>
      <p style="font-size: 11px; color: #a59cb8; margin-bottom: 12px;">
        Visual audit of all ${keys.length} loaded textures with pixel dimensions, canonical anchors, and in-game scale.
      </p>

      <div style="display: flex; gap: 6px; margin-bottom: 12px; flex-wrap: wrap;" id="gallery-filters">
        <button class="sb-btn sb-btn-active" data-filter="all">All (${keys.length})</button>
        <button class="sb-btn" data-filter="characters">Characters</button>
        <button class="sb-btn" data-filter="props">Props</button>
        <button class="sb-btn" data-filter="pickups">Pickups</button>
        <button class="sb-btn" data-filter="weapons">Weapons</button>
        <button class="sb-btn" data-filter="buildings">Buildings</button>
        <button class="sb-btn" data-filter="portraits">Portraits</button>
        <button class="sb-btn" data-filter="environment">Environment</button>
      </div>

      <div id="gallery-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(130px, 1fr)); gap: 8px; max-height: 480px; overflow-y: auto; padding: 4px;">
      </div>
    `;
    parent.appendChild(sec);

    const grid = sec.querySelector("#gallery-grid");
    const renderItems = (filter) => {
      grid.innerHTML = "";
      const filtered = keys.filter(k => filter === "all" || k.startsWith(filter));
      filtered.forEach(k => {
        const item = manifest[k];
        const card = document.createElement("div");
        card.style.cssText = "background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); border-radius: 6px; padding: 6px; text-align: center;";
        card.innerHTML = `
          <div style="height: 64px; display:flex; align-items:center; justify-content:center; background: rgba(0,0,0,0.3); border-radius: 4px; margin-bottom: 4px;">
            <img src="./${item.png}" style="max-height: 58px; max-width: 100px; object-fit: contain; image-rendering: pixelated;" />
          </div>
          <div style="font-size: 10px; font-weight: 600; color: #d8cfea; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${k.split("/").pop()}</div>
          <div style="font-size: 9px; color: #8c82a0; font-family: monospace;">${item.width}×${item.height}</div>
          <div style="font-size: 8px; color: #ffd464; font-family: monospace;">anc: ${Number(item.anchorX).toFixed(2)}, ${Number(item.anchorY).toFixed(2)}</div>
        `;
        grid.appendChild(card);
      });
    };

    renderItems("all");

    sec.querySelectorAll("#gallery-filters button").forEach(b => {
      b.onclick = () => {
        sec.querySelectorAll("#gallery-filters button").forEach(x => x.classList.remove("sb-btn-active"));
        b.classList.add("sb-btn-active");
        renderItems(b.dataset.filter);
      };
    });
  }

  /* =========================================================================
   * REAL-TIME CANVAS DEBUG OVERLAYS (RENDER TICKER)
   * ========================================================================= */
  renderDebugOverlays() {
    const scene = this.getScene();
    if (!scene || !scene.actors) return;

    // NOTE: GameplayScene.clearWorld() destroys every child of `actors`, including this overlay.
    if (this.debugGfx.destroyed) {
      this.debugGfx = new Graphics();
      this.debugGfx.zIndex = 999999;
    }
    if (this.debugGfx.parent !== scene.actors) {
      scene.actors.addChild(this.debugGfx);
    }

    this.debugGfx.clear();
    const dbg = this.state.data.debug;
    if (!dbg) return;

    const pm = scene.playerModel;
    const all = pm && pm.alive ? [pm, ...scene.enemies] : [...scene.enemies];

    // 1. Depth Lane Band (Yellow)
    if (dbg.depthBand && pm && pm.alive) {
      const topLane = pm.y - COMBAT_DEPTH_BAND * pm.scaleF;
      const botLane = pm.y + COMBAT_DEPTH_BAND * pm.scaleF;
      this.debugGfx.moveTo(0, topLane).lineTo(WORLD_W, topLane).stroke({ width: 1.5, color: 0xffd700, alpha: 0.65 });
      this.debugGfx.moveTo(0, botLane).lineTo(WORLD_W, botLane).stroke({ width: 1.5, color: 0xffd700, alpha: 0.65 });
    }

    // 2. Target Hurtboxes & Ground Contact Ellipses (Green)
    if (dbg.hurtboxes) {
      for (const f of all) {
        if (!f || !f.alive) continue;
        const hb = f.hurtbox || { rx: 16 * f.scaleF, ry: 9 * f.scaleF, h: 88 * f.scaleF };
        // Ground ellipse
        this.debugGfx.ellipse(f.x, f.y, hb.rx, hb.ry).fill({ color: 0x34c759, alpha: 0.2 }).stroke({ width: 1.5, color: 0x34c759, alpha: 0.8 });
        // Body vertical box
        const topY = f.y - f.z - hb.h;
        this.debugGfx.rect(f.x - hb.rx, topY, hb.rx * 2, hb.h).fill({ color: 0x34c759, alpha: 0.12 }).stroke({ width: 1.5, color: 0x34c759, alpha: 0.8 });
      }
    }

    // 3. Attack Hitboxes (Red)
    if (dbg.hitboxes) {
      for (const f of all) {
        if (!f || (f.state !== "attack" && !f.airKick)) continue;
        const hit = f.getActiveHit();
        if (!hit) continue;

        const maxLane = COMBAT_DEPTH_BAND * f.scaleF;
        const hitX = f.facing > 0 ? f.x : f.x - hit.range;
        const hitY = f.y - maxLane;
        const hitW = hit.range;
        const hitH = maxLane * 2;

        this.debugGfx.rect(hitX, hitY, hitW, hitH).fill({ color: 0xff3b30, alpha: 0.35 }).stroke({ width: 2, color: 0xff3b30, alpha: 0.95 });
        this.debugGfx.moveTo(f.x, f.y).lineTo(f.x + f.facing * hit.range, f.y).stroke({ width: 2.5, color: 0xff453a, alpha: 1.0 });
      }
    }

    // 4. Velocity and Knockback Vectors (Cyan/Orange)
    if (dbg.vectors) {
      for (const f of all) {
        if (!f || !f.alive) continue;
        if (Math.hypot(f.vx, f.vy) > 0.05) {
          this.debugGfx.moveTo(f.x, f.y).lineTo(f.x + f.vx * 12, f.y + f.vy * 12).stroke({ width: 2, color: 0x5ac8fa, alpha: 0.9 });
        }
        if (Math.abs(f.kbX) > 0.2) {
          this.debugGfx.moveTo(f.x, f.y - 20).lineTo(f.x + f.kbX * 8, f.y - 20).stroke({ width: 2.5, color: 0xff9500, alpha: 0.95 });
        }
      }
    }

    // 5. Body Separation Rings (Blue)
    if (dbg.separation) {
      for (const f of all) {
        if (!f || !f.alive) continue;
        const r = 18 * f.scaleF;
        this.debugGfx.ellipse(f.x, f.y, r, r * 0.5).stroke({ width: 1, color: 0x007aff, alpha: 0.6 });
      }
    }

    // 6. Projectiles & Swept Segments (Magenta / Green)
    if (dbg.projectiles) {
      for (const b of scene.bullets) {
        this.debugGfx.moveTo(b.prevX, b.gy).lineTo(b.x, b.gy).stroke({ width: 3, color: 0xaf52de, alpha: 0.9 });
        this.debugGfx.rect(Math.min(b.prevX, b.x) - 10, b.gy - PROJECTILE_DEPTH_BAND, Math.abs(b.x - b.prevX) + 20, PROJECTILE_DEPTH_BAND * 2)
          .stroke({ width: 1, color: 0xaf52de, alpha: 0.5 });
      }
      for (const th of scene.throws) {
        const px = th.prevX !== undefined ? th.prevX : th.x;
        this.debugGfx.moveTo(px, th.gy).lineTo(th.x, th.gy).stroke({ width: 3, color: 0x30d158, alpha: 0.9 });
        this.debugGfx.rect(Math.min(px, th.x) - 12, th.gy - PROJECTILE_DEPTH_BAND, Math.abs(th.x - px) + 24, PROJECTILE_DEPTH_BAND * 2)
          .stroke({ width: 1, color: 0x30d158, alpha: 0.5 });
      }
    }
  }

  destroy() {
    if (this.syncInterval) clearInterval(this.syncInterval);
    if (this.debugGfx) this.debugGfx.destroy();
    if (this.rootEl) this.rootEl.remove();
  }
}

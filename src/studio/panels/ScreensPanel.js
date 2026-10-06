import { h } from "../dom.js";
import { STORY } from "../../core/Constants.js";
import { WEAPONS } from "../../data/combat.js";
import { sfx } from "../../core/SoundManager.js";

const SOUNDS = ["swing", "hit", "heavyHit", "clang", "gunshot", "crateBreak", "glassBreak", "coin", "pickup", "super", "hurt", "ko", "wave"];

/** Preview every HUD / overlay / dialogue state without playing up to it. */
export class ScreensPanel {
  constructor(studio) {
    this.studio = studio;
    const scene = () => studio.scene;
    const player = () => studio.scene.playerModel;
    const story = h("select", {}, Object.keys(STORY).map((k) => h("option", { value: k }, `${k} (${STORY[k].length})`)));
    const wave = h("input", { type: "number", value: 3, min: 1, max: 30, class: "short" });
    const act = (fn) => () => {
      fn();
      studio.redraw();
    };
    const closeOverlays = () => {
      const s = scene();
      if (s.paused) s.resume();
      s.overlay.hide();
      s.dialogue.visible = false;
      s.game.mode = "playing";
    };

    this.el = h("div", { class: "panel screens" },
      h("h3", {}, "Story & overlays"),
      h("div", { class: "row" }, story,
        h("button", { onClick: act(() => scene().showDialogue(STORY[story.value], () => (scene().game.mode = "playing"))) }, "Play dialogue")),
      h("div", { class: "row" }, "Wave", wave,
        h("button", { title: "Shows the banner; its enemies spawn when it ends", onClick: act(() => scene().setBanner(Number(wave.value))) }, "Banner")),
      h("div", { class: "row wrap" },
        h("button", { onClick: act(() => scene().showGameOver()) }, "Game over"),
        h("button", { onClick: act(() => scene().showVictory()) }, "Victory"),
        h("button", { onClick: act(() => scene().pause()) }, "Pause"),
        h("button", { onClick: act(() => scene().toggleMute()) }, "Toggle mute"),
        h("button", { onClick: act(closeOverlays) }, "Close all")),

      h("h3", {}, "HUD states"),
      h("div", { class: "row wrap" },
        h("button", { onClick: act(() => (player().hp = Math.round(player().maxHp * 0.2))) }, "Low HP"),
        h("button", { onClick: act(() => Object.assign(scene().game.buffs, { speed: 600, rage: 480 })) }, "Both buffs"),
        h("button", { onClick: act(() => Object.assign(scene().game, { combo: 12, comboTimer: 110 })) }, "Combo ×12"),
        h("button", { onClick: act(() => (scene().game.super = 100)) }, "Super ready"),
        h("button", { onClick: act(() => player().setWeapon({ kind: "pistol", def: WEAPONS.pistol, ammo: 4 })) }, "Pistol readout"),
        h("button", { onClick: act(() => player().setWeapon({ kind: "stick", def: WEAPONS.stick, uses: 3 })) }, "Stick readout"),
        h("button", {
          onClick: act(() => studio.select(scene().spawnCustomEnemy({ boss: true, name: "ՍԵՎ ՎԱՉՈ", paletteKey: "boss", hp: 280, scale: 1.34, archetype: "dummy" }))),
        }, "Boss bar")),

      h("h3", {}, "Popups"),
      h("div", { class: "row wrap" },
        h("button", {
          onClick: act(() => {
            const p = player();
            const y = p.y - 95 * p.scaleF;
            const s = scene();
            s.spawnPopup(p.x + 40, y, "-9", 0xffe7b0);
            s.spawnPopup(p.x + 40, y, "-14", 0xffb347);
            s.spawnPopup(p.x + 40, y, "-4 ԿԼԱՆԿ!", 0xb9c2cc, 13);
            s.spawnPopup(p.x, y - 20, "+30", 0x7ec850);
            s.spawnPopup(p.x - 40, y, "-9", 0xff6a5e);
          }),
        }, "Sample popups (stacked)")),
      h("h3", {}, "Sound board"),
      h("div", { class: "row wrap" }, SOUNDS.map((name) => h("button", { onClick: () => sfx[name]() }, name))),
      h("div", { class: "row" }, "volume",
        h("input", { type: "range", min: 0, max: 1, step: 0.05, value: sfx.volume, onInput: (e) => sfx.setVolume(Number(e.target.value)) })),
      h("p", { class: "muted" }, "Previews change the live scene; use Reset to get back to a clean street."));
  }
}

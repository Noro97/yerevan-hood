import { h } from "../dom.js";
import { OVERLAY_LAYERS } from "../OverlayRenderer.js";

export class ViewPanel {
  constructor(studio) {
    const layers = studio.overlays.layers;
    const scene = () => studio.scene;
    const toggle = (label, hint, checked, onChange) =>
      h("label", { class: "check", title: hint }, h("input", { type: "checkbox", checked, onChange: (e) => onChange(e.target.checked) }), label);

    this.el = h("div", { class: "panel view" },
      h("h3", {}, "Debug overlays"),
      Object.entries(OVERLAY_LAYERS).map(([key, { label, hint }]) =>
        toggle(label, hint, layers[key], (on) => (layers[key] = on))),
      h("h3", {}, "Scene layers"),
      toggle("HUD", "health, score, combo, banners", true, (on) => (scene().hud.visible = on)),
      toggle("Foreground strip", "out-of-focus strip drawn over the street", true, (on) => (scene().bg.fore.visible = on)),
      toggle("Vignette & mood tint", "screen-edge darkening and chapter tint", true, (on) => {
        scene().vignette.visible = on;
        scene().moodTint.visible = on;
      }),
      h("h3", {}, "Legend"),
      h("ul", { class: "legend" },
        h("li", {}, h("i", { style: { background: "#30d158" } }), "hurtbox (grey: can't be hit)"),
        h("li", {}, h("i", { style: { background: "#ff453a" } }), "active hit + its depth band"),
        h("li", {}, h("i", { style: { background: "#ffd60a" } }), "player's melee lane"),
        h("li", {}, h("i", { style: { background: "#bf5af2" } }), "bullet sweep"),
        h("li", {}, h("i", { style: { background: "#64d2ff" } }), "thrown weapon sweep"),
        h("li", {}, h("i", { style: { background: "#5ac8fa" } }), "selected fighter + reach ticks (punch / kick / hook)")));
  }
}

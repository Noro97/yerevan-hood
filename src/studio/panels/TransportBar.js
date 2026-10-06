import { h } from "../dom.js";

const SPEEDS = [0.1, 0.25, 0.5, 1, 2, 4, 8];

export class TransportBar {
  constructor(studio) {
    this.studio = studio;
    this.playBtn = h("button", { class: "primary", title: "Play / pause (P)", onClick: () => studio.setPlaying(!studio.playing) }, "▶ Play");
    this.frameEl = h("span", { class: "mono frame" }, "f 0");
    this.modeEl = h("span", { class: "mode" });
    this.statsEl = h("span", { class: "mono stats" });
    const speed = h("select", { title: "Simulation speed", onChange: (e) => studio.setSpeed(Number(e.target.value)) },
      SPEEDS.map((s) => h("option", { value: s, selected: s === 1 }, `${s}×`)));
    const god = h("input", { type: "checkbox", onChange: (e) => (studio.runner.god = e.target.checked) });
    this.godBox = god;

    this.el = h("div", { class: "transport" },
      h("strong", { class: "brand" }, "ԵՐԵՎԱՆ HOOD · Studio"),
      h("div", { class: "group" },
        this.playBtn,
        h("button", { title: "Step 1 frame (N)", onClick: () => studio.stepFrames(1) }, "⏭ 1"),
        h("button", { title: "Step 10 frames (Shift+N)", onClick: () => studio.stepFrames(10) }, "⏭ 10"),
        speed,
        this.frameEl),
      h("div", { class: "group" },
        h("button", { title: "Re-run the current setup", onClick: () => studio.reset() }, "↺ Reset"),
        h("button", { title: "Empty street with one dummy", onClick: () => studio.freePlay() }, "Free play"),
        h("label", { class: "check", title: "Player HP stays full" }, god, "God mode")),
      this.modeEl,
      this.statsEl,
      h("span", { class: "hint" }, "click a fighter to inspect · P play · N step · Esc deselect"));
  }

  refresh() {
    const s = this.studio;
    this.playBtn.textContent = s.playing ? "⏸ Pause" : "▶ Play";
    this.playBtn.classList.toggle("active", s.playing);
    this.godBox.checked = s.runner.god;
    this.modeEl.textContent = s.watching ? `Watching · ${s.watching.title}` : s.current?.title ?? "";
    this.modeEl.classList.toggle("watching", !!s.watching);
  }

  tick() {
    const s = this.studio;
    const p = s.scene.playerModel;
    this.frameEl.textContent = `f ${s.runner.frame}`;
    const g = s.scene.game;
    this.statsEl.textContent = `${g.mode} · HP ${Math.max(0, Math.round(p?.hp ?? 0))} · enemies ${s.scene.enemies.length} · combo ${g.combo} · super ${Math.round(g.super)}`;
  }
}

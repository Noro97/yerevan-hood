import { h, downloadJSON } from "../dom.js";
import { stateDigest } from "../digest.js";

/**
 * Records free-play keyboard input per frame from a seeded reset, replays it exactly, and turns
 * it into a scenario snippet — the shortest path from "I just saw a bug" to a regression test.
 */
export class RecordPanel {
  constructor(studio) {
    this.studio = studio;
    this.recording = null;
    this.take = null;
    this.status = h("div", { class: "muted" }, "Nothing recorded yet.");
    this.recBtn = h("button", { class: "primary", onClick: () => (this.recording ? this.stop() : this.start()) }, "● Record");
    this.snippet = h("textarea", { class: "mono snippet", rows: 10, readOnly: true, placeholder: "Scenario snippet appears here." });
    const file = h("input", { type: "file", accept: "application/json", onChange: (e) => this.load(e.target.files[0]) });

    this.el = h("div", { class: "panel record" },
      h("p", { class: "muted" }, "Record resets the current setup with its seed, then captures every key you press until Stop. Replay feeds the same keys frame by frame and checks the final state is identical."),
      h("div", { class: "row wrap" },
        this.recBtn,
        h("button", { onClick: () => this.replay() }, "▶ Replay"),
        h("button", { onClick: () => this.take && downloadJSON("recording.json", this.take) }, "Export"),
        h("label", { class: "check" }, "Load", file)),
      this.status,
      h("div", { class: "row" }, h("button", { onClick: () => this.toSnippet() }, "Make scenario snippet")),
      this.snippet);
  }

  start() {
    const base = this.studio.current;
    this.studio.reset(base);
    this.recording = { base: base.id, seed: base.seed ?? 1, inputs: [] };
    this.recBtn.textContent = "■ Stop";
    this.status.textContent = `Recording from "${base.title}" — play with the keyboard (click the canvas first).`;
    this.studio.app.pixiApp.canvas.focus?.();
    this.studio.setPlaying(true);
  }

  /** Called by the studio before each free-play frame. */
  capture(input) {
    this.recording.inputs.push([[...input.keys], [...input.justPressed], this.studio.runner.god]);
  }

  stop() {
    this.studio.setPlaying(false);
    this.take = { ...this.recording, frames: this.recording.inputs.length, digest: stateDigest(this.studio.scene) };
    this.recording = null;
    this.recBtn.textContent = "● Record";
    this.status.textContent = `Recorded ${this.take.frames} frames from "${this.take.base}".`;
  }

  scenario() {
    const take = this.take;
    return {
      id: "recording",
      title: `Replay of a ${take.frames}-frame recording`,
      seed: take.seed,
      base: take.base,
      frames: take.frames,
      input: (f, s) => {
        s.god(!!take.inputs[f]?.[2]);
        return { hold: take.inputs[f]?.[0] ?? [], press: take.inputs[f]?.[1] ?? [] };
      },
      check: (t, s) => t.ok(stateDigest(s.scene) === take.digest, "final state identical to the recording"),
    };
  }

  replay() {
    if (!this.take) return;
    const off = this.studio.on("result", (r) => {
      if (r.id !== "recording") return;
      off();
      this.status.textContent = r.pass ? "✓ replay identical to the recording" : "✗ replay diverged";
    });
    this.status.textContent = "replaying…";
    this.studio.watch(this.scenario());
  }

  async load(file) {
    if (!file) return;
    try {
      this.take = JSON.parse(await file.text());
      this.status.textContent = `Loaded ${this.take.frames} frames from "${this.take.base}".`;
    } catch (err) {
      this.status.textContent = `not a recording: ${err.message}`;
    }
  }

  /** Converts the take into the scenario DSL: presses as `at`, held keys as `from..to` ranges. */
  toSnippet() {
    if (!this.take) return;
    const steps = [];
    const open = new Map();
    this.take.inputs.forEach(([keys, presses], f) => {
      if (presses.length) steps.push(`{ at: ${f}, press: ${JSON.stringify(presses)} }`);
      for (const k of keys) if (!open.has(k)) open.set(k, f);
      for (const [k, from] of open) {
        if (!keys.includes(k)) {
          steps.push(`{ from: ${from}, to: ${f - 1}, hold: ["${k}"] }`);
          open.delete(k);
        }
      }
    });
    for (const [k, from] of open) steps.push(`{ from: ${from}, to: ${this.take.frames - 1}, hold: ["${k}"] }`);

    this.snippet.value = [
      "  {",
      `    id: "recorded.${Date.now().toString(36)}",`,
      '    group: "Recorded",',
      `    title: "Recorded play (${this.take.frames} frames)",`,
      `    seed: ${this.take.seed},`,
      `    base: "${this.take.base}",`,
      `    frames: ${this.take.frames},`,
      ...(this.take.inputs.some((i) => i[2]) ? ["    god: true,"] : []),
      "    input: [",
      ...steps.map((st) => `      ${st},`),
      "    ],",
      "    check(t, s) {",
      "      // TODO: assert what this recording should prove, e.g. t.equal(s.player.hp, 100, \"no damage taken\");",
      "    },",
      "  },",
    ].join("\n");
    this.snippet.select();
  }
}

import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";
import { openGame } from "../browser.mjs";
import { playAndTrace } from "../bot.mjs";

/** Each run is a seeded bot playthrough; its state digest must match the recorded golden. */
const RUNS = [
  { id: "seed1234-from-start", seed: 1234, frames: 7200 },
  { id: "seed77-wave6", seed: 77, wave: 6, hp: 400, frames: 6000 },
  { id: "seed9-wave9", seed: 9, wave: 9, hp: 600, frames: 12000 },
];

export const name = "golden traces: seeded bot runs are unchanged (UPDATE_GOLDEN=1 to re-record)";

export async function run({ browser, baseUrl }) {
  const notes = [];
  for (const cfg of RUNS) {
    const { page, errors } = await openGame(browser, baseUrl, { seed: cfg.seed });
    await page.evaluate(({ wave, hp }) => {
      const scene = window.__hood.app.scenes.currentScene;
      if (hp) scene.playerModel.hp = scene.playerModel.maxHp = hp;
      if (wave) {
        scene.dialogue.visible = false;
        scene.setWave(wave);
      }
    }, cfg);
    const trace = await page.evaluate(playAndTrace, { frames: cfg.frames, sampleEvery: 60 });
    await page.close();
    assert.deepEqual(errors, [], `${cfg.id}: page errors during the run`);

    const file = new URL(`../golden/trace-${cfg.id}.json`, import.meta.url);
    if (process.env.UPDATE_GOLDEN) {
      await writeFile(file, JSON.stringify(trace, null, 1) + "\n");
      notes.push(`${cfg.id} recorded ${JSON.stringify(trace.summary)}`);
      continue;
    }
    const golden = JSON.parse(await readFile(file, "utf8"));
    const at = golden.samples.findIndex((s, i) => s !== trace.samples[i]);
    assert.equal(at, -1, `${cfg.id} diverges at sample ${at}:\n  golden ${golden.samples[at]}\n  actual ${trace.samples[at]}`);
    assert.deepEqual(trace.summary, golden.summary, `${cfg.id} summary`);
    notes.push(`${cfg.id} ok`);
  }
  return notes.join("; ");
}

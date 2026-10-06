import assert from "node:assert/strict";

export const name = "studio tools: balance, level, recorder, rig";

export async function run({ browser, baseUrl }) {
  const page = await browser.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  await page.goto(`${baseUrl}/studio.html`, { waitUntil: "load" });
  await page.waitForFunction(() => window.__studio?.ready, { timeout: 30000 });

  const r = await page.evaluate(() => {
    const st = window.__studio.studio;
    const out = {};
    const punch = st.scenarios.find((s) => s.id === "melee.punch");

    // balance: a live edit changes the rules, reset restores them
    st.balance.edit("ATTACKS.punch.dmg", 30);
    out.editedDmg = st.runner.runSync(punch) && st.runner.events.find((e) => e.type === "hit")?.dmg;
    out.changedLabel = st.balance.count.textContent;
    st.balance.resetAll();
    out.resetDmg = st.runner.runSync(punch) && st.runner.events.find((e) => e.type === "hit")?.dmg;

    // level: edits reach the sprites, revert restores the file's values
    st.freePlay();
    const lp = st.levelPanel;
    const prop = st.scene.bg.level.props[0];
    const x0 = prop.x;
    prop.x = x0 + 77;
    lp.apply();
    out.propMoved = st.scene.bg.propsList[0].sprite.x === x0 + 77;
    lp.revert();
    out.propReverted = st.scene.bg.propsList[0].sprite.x === x0;

    // recorder: scripted take → exact replay, both directly and through the scenario snippet
    st.setPlaying(false);
    const rec = st.recorder;
    rec.start();
    st.setPlaying(false);
    for (let f = 0; f < 240; f++) {
      const keys = new Set(f < 60 ? ["KeyD"] : f < 90 ? ["KeyS"] : []);
      const pressed = new Set(f % 20 === 5 && f > 60 ? ["KeyJ"] : f === 150 ? ["Space"] : []);
      for (const k of pressed) keys.add(k);
      st.app.input.keys = keys;
      st.app.input.justPressed = pressed;
      st.advance();
    }
    rec.stop();
    out.frames = rec.take.frames;
    out.directReplay = st.runner.runSync(rec.scenario()).pass;
    rec.toSnippet();
    const code = rec.snippet.value.trim().replace(/,$/, "");
    const snippet = new Function(`return (${code});`)();
    snippet.check = rec.scenario().check;
    out.snippetReplay = st.runner.runSync(snippet).pass;
    out.snippetSteps = snippet.input.length;

    // rig: a kick pose extends the front leg forward
    st.rig.open();
    st.rig.setPlaying(false);
    st.rig.setPose("kick");
    st.rig.setFrame(12);
    out.kickLeg = st.scene.playerView.frontLeg.rotation;
    out.rigFighters = st.rig.models.length;
    return out;
  });
  await page.close();

  assert.deepEqual(errors, [], "page errors");
  assert.equal(r.editedDmg, 30, "edited punch damage applies");
  assert.match(r.changedLabel, /1 changed/);
  assert.equal(r.resetDmg, 9, "reset restores the default");
  assert.ok(r.propMoved && r.propReverted, "level edit and revert");
  assert.equal(r.frames, 240);
  assert.ok(r.directReplay, "recording replays identically");
  assert.ok(r.snippetReplay, `scenario snippet (${r.snippetSteps} steps) replays identically`);
  assert.ok(r.kickLeg < -1, `kick pose extends the leg (rotation ${r.kickLeg})`);
  assert.equal(r.rigFighters, 7);
  return `recording ${r.frames} f → snippet ${r.snippetSteps} steps, both replays identical`;
}

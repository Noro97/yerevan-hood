import assert from "node:assert/strict";

export const name = "texture loading: a missing file is named on the loading screen";

export async function run({ browser, baseUrl }) {
  const page = await browser.newPage();
  const blocked = ["characters/thug2_arm.png", "pickups/medal.png"];
  await page.setRequestInterception(true);
  page.on("request", (req) => {
    if (blocked.some((b) => req.url().endsWith(b))) req.respond({ status: 404, body: "" });
    else req.continue();
  });
  await page.goto(`${baseUrl}/?test`, { waitUntil: "load" });
  await page.waitForFunction(() => document.getElementById("loading")?.classList.contains("error"), { timeout: 30000 });
  const state = await page.evaluate(() => ({
    message: document.getElementById("loading").textContent,
    canvas: !!document.querySelector("#game canvas"),
    started: !!window.__hood,
  }));
  await page.close();

  assert.match(state.message, /Missing or broken textures \(2\)/);
  for (const key of ["characters/thug2_arm", "pickups/medal"]) assert.ok(state.message.includes(key), `names ${key}`);
  assert.equal(state.started, false, "the game does not start half-loaded");
  return state.message;
}

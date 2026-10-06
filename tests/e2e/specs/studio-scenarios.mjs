import assert from "node:assert/strict";

export const name = "studio scenarios: no failures, known bugs still failing";

export async function run({ browser, baseUrl }) {
  const page = await browser.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  await page.goto(`${baseUrl}/studio.html`, { waitUntil: "load" });
  await page.waitForFunction(() => window.__studio?.ready, { timeout: 30000 });
  const results = await page.evaluate(() => window.__studio.runAll());
  await page.close();

  assert.deepEqual(errors, [], "page errors");
  const lines = (status) => results.filter((r) => r.status === status)
    .map((r) => `  ${r.id}: ${r.results.filter((c) => !c.pass).map((c) => `${c.message} (${c.detail})`).join("; ")}`);
  const failed = lines("fail");
  const fixed = results.filter((r) => r.status === "unexpected-pass").map((r) => `  ${r.id}`);
  assert.equal(failed.length, 0, `failing scenarios:\n${failed.join("\n")}`);
  assert.equal(fixed.length, 0, `known bugs now pass — remove their knownBug marker:\n${fixed.join("\n")}`);
  const count = (s) => results.filter((r) => r.status === s).length;
  return `${count("pass")} pass, ${count("known-bug")} known bugs (expected to fail)`;
}

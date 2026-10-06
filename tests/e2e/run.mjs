import { readdir } from "node:fs/promises";
import { startServer } from "./server.mjs";
import { launchBrowser } from "./browser.mjs";

const only = process.argv[2];
const specDir = new URL("./specs/", import.meta.url);
const files = (await readdir(specDir)).filter((f) => f.endsWith(".mjs") && (!only || f.includes(only))).sort();

const server = await startServer();
const browser = await launchBrowser();
let failed = 0;
try {
  for (const file of files) {
    const spec = await import(new URL(file, specDir));
    const t0 = performance.now();
    try {
      const note = await spec.run({ browser, baseUrl: server.url });
      console.log(`ok   ${spec.name} (${Math.round(performance.now() - t0)} ms)${note ? ` — ${note}` : ""}`);
    } catch (err) {
      failed++;
      console.log(`FAIL ${spec.name}\n${String(err.stack ?? err).replace(/^/gm, "     ")}`);
    }
  }
} finally {
  await browser.close();
  await server.close();
}
console.log(`\n${files.length - failed}/${files.length} e2e specs passed`);
process.exitCode = failed ? 1 : 0;

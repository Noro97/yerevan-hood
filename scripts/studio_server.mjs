#!/usr/bin/env node
// Local server for the game and the studio: static files, plus POST /__studio/save/<name> so the
// studio can write its data files (balance / items / level). Listens on 127.0.0.1 only.
//
//   npm run studio            → http://127.0.0.1:8124/studio.html
import { createServer } from "node:http";
import { readFile, stat, writeFile } from "node:fs/promises";
import { extname, join, normalize, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(fileURLToPath(new URL("..", import.meta.url)));
const TYPES = {
  ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".json": "application/json",
  ".png": "image/png", ".jpg": "image/jpeg", ".ico": "image/x-icon", ".css": "text/css",
};
const SAVE_TARGETS = {
  balance: "src/data/tuning/balance.js",
  items: "src/data/tuning/items.js",
  level: "src/data/level.js",
};
const MAX_BODY = 512 * 1024;

/** Keeps the target file's leading comment block, replaces the exported data. */
async function writeDataModule(file, data) {
  const current = await readFile(file, "utf8").catch(() => "");
  const header = current.split("\n").filter((line, i, lines) => lines.slice(0, i + 1).every((l) => l.startsWith("//"))).join("\n");
  await writeFile(file, `${header ? `${header}\n` : ""}export default ${JSON.stringify(data, null, 2)};\n`);
}

function readBody(req) {
  return new Promise((ok, fail) => {
    let size = 0;
    const chunks = [];
    req.on("data", (c) => {
      size += c.length;
      if (size > MAX_BODY) fail(new Error("body too large"));
      else chunks.push(c);
    });
    req.on("end", () => ok(Buffer.concat(chunks).toString("utf8")));
    req.on("error", fail);
  });
}

async function handleSave(req, res, name) {
  const target = SAVE_TARGETS[name];
  // NOTE: checking Host blocks DNS-rebinding pages from reaching this local endpoint.
  const host = (req.headers.host ?? "").split(":")[0];
  if (!target || !["127.0.0.1", "localhost"].includes(host)) {
    res.writeHead(403).end("forbidden");
    return;
  }
  try {
    const data = JSON.parse(await readBody(req));
    if (!data || typeof data !== "object" || Array.isArray(data)) throw new Error("expected a JSON object");
    await writeDataModule(join(ROOT, target), data);
    res.writeHead(200, { "Content-Type": "application/json" }).end(JSON.stringify({ ok: true, file: target }));
  } catch (err) {
    res.writeHead(400).end(String(err.message ?? err));
  }
}

async function handleStatic(req, res) {
  const path = normalize(decodeURIComponent(new URL(req.url, "http://x").pathname));
  let file = join(ROOT, path);
  if (!file.startsWith(ROOT)) {
    res.writeHead(403).end();
    return;
  }
  try {
    if ((await stat(file)).isDirectory()) file = join(file, "index.html");
    const body = await readFile(file);
    res.writeHead(200, { "Content-Type": TYPES[extname(file)] ?? "application/octet-stream", "Cache-Control": "no-store" });
    res.end(body);
  } catch {
    res.writeHead(404).end();
  }
}

/** Starts the server; resolves to { url, close }. `allowSave` enables the studio save endpoint. */
export function startServer({ port = 0, allowSave = false } = {}) {
  const server = createServer((req, res) => {
    const url = new URL(req.url, "http://x");
    if (allowSave && url.pathname === "/__studio/ping") {
      res.writeHead(200, { "Content-Type": "application/json" }).end('{"ok":true}');
    } else if (allowSave && req.method === "POST" && url.pathname.startsWith("/__studio/save/")) {
      handleSave(req, res, url.pathname.slice("/__studio/save/".length));
    } else {
      handleStatic(req, res);
    }
  });
  return new Promise((ok) => {
    server.listen(port, "127.0.0.1", () => {
      ok({ url: `http://127.0.0.1:${server.address().port}`, close: () => new Promise((done) => server.close(done)) });
    });
  });
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const { url } = await startServer({ port: Number(process.env.PORT ?? 8124), allowSave: true });
  console.log(`Yerevan Hood dev server: ${url}/  ·  studio: ${url}/studio.html  (saves enabled)`);
}

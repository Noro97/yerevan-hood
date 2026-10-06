import { downloadJSON } from "./dom.js";

let available = null;

/** True when the page is served by scripts/studio_server.mjs, which can write studio data files. */
export async function canSave() {
  if (available === null) {
    try {
      available = (await fetch("/__studio/ping", { cache: "no-store" })).ok;
    } catch {
      available = false;
    }
  }
  return available;
}

/** Writes src/data/… via the studio server, or downloads the JSON when the server isn't there. */
export async function persist(name, data) {
  if (await canSave()) {
    const res = await fetch(`/__studio/save/${name}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error(await res.text());
    return `saved ${(await res.json()).file}`;
  }
  downloadJSON(`${name}.json`, data);
  return `downloaded ${name}.json (run "npm run studio" to save into the repo)`;
}

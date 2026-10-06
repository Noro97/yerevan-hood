import { GameApp } from "./core/GameApp.js";
import { TitleScene } from "./scenes/TitleScene.js";

const app = new GameApp();
await app.init();
app.start(new TitleScene());

const params = new URLSearchParams(location.search);
// ?test is used by the automated suite: dev host, but no sandbox mutating the scene.
const isDev =
  (["localhost", "127.0.0.1"].includes(location.hostname) || params.has("dev")) && !params.has("test");

if (isDev) {
  const { DevSandbox } = await import("./sandbox/DevSandbox.js");
  window.__sandbox = new DevSandbox(app);
}

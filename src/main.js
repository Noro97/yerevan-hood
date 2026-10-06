import { GameApp } from "./core/GameApp.js";
import { TitleScene } from "./scenes/TitleScene.js";

const app = new GameApp();
await app.init();
app.start(new TitleScene());

const isDev =
  ["localhost", "127.0.0.1"].includes(location.hostname) ||
  new URLSearchParams(location.search).has("dev");

if (isDev) {
  const { DevSandbox } = await import("./sandbox/DevSandbox.js");
  window.__sandbox = new DevSandbox(app);
}

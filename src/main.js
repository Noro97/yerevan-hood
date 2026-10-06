import { GameApp } from "./core/GameApp.js";
import { TitleScene } from "./scenes/TitleScene.js";

try {
  const app = new GameApp();
  await app.init();
  app.start(new TitleScene());
  // The automated suite (tests/e2e) drives the game through this handle.
  if (new URLSearchParams(location.search).has("test")) window.__hood = { app };
} catch (err) {
  console.error(err);
  const loading = document.getElementById("loading");
  if (loading) {
    loading.textContent = `Couldn't start the game — ${err.message}`;
    loading.classList.add("error");
  }
}

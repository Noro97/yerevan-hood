import { GameApp } from "./core/GameApp.js";
import { TitleScene } from "./scenes/TitleScene.js";

const app = new GameApp();
await app.init();
app.start(new TitleScene());

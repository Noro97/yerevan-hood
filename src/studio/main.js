import { GameApp } from "../core/GameApp.js";
import { GameplayScene } from "../scenes/GameplayScene.js";
import { Studio } from "./Studio.js";

const app = new GameApp();
await app.init();
const scene = new GameplayScene({ studio: true });
app.start(scene);

window.__studio = new Studio(app, scene, document.getElementById("studio")).api();

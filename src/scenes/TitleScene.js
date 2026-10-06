import { Scene } from "../core/Scene.js";
import { BackgroundView } from "../views/BackgroundView.js";
import { OverlayView } from "../views/OverlayView.js";
import { GameplayScene } from "./GameplayScene.js";

export class TitleScene extends Scene {
  constructor() {
    super();
    this.app = null;
    this.frame = 0;
  }

  onEnter(app) {
    this.app = app;
    this.frame = 0;

    this.bg = new BackgroundView();
    this.addChild(this.bg.sky, this.bg.far, this.bg.mid, this.bg.scenery, this.bg.fore);

    this.overlay = new OverlayView();
    this.overlay.showTitle();
    this.addChild(this.overlay);

    this.app.input.onAnyKeyPress = () => {
      this.startGame();
    };
  }

  onExit() {
    if (this.app?.input) {
      this.app.input.onAnyKeyPress = null;
    }
    super.onExit();
  }

  update(dt) {
    this.frame += dt;
    this.overlay.updateView(this.frame, "title");
  }

  startGame() {
    this.app.scenes.switchScene(new GameplayScene());
  }
}

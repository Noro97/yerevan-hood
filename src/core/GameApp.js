import { Application } from "pixi.js";
import { W, H } from "./Constants.js";
import { InputManager } from "./InputManager.js";
import { SceneManager } from "./SceneManager.js";
import { textureManager } from "./TextureManager.js";

export class GameApp {
  constructor() {
    this.pixiApp = new Application();
    this.input = null;
    this.scenes = null;
    this.timeScale = 1.0;
    this.paused = false;
    this.stepFrame = false;
    this.stepFramesCount = 0;
    // When true every tick advances exactly one frame (dt = timeScale), independent of
    // display refresh rate — required for deterministic replays.
    this.fixedStep = false;
  }

  /** Runs `frames` simulation frames synchronously at dt = 1 (tests, studio frame stepping). */
  step(frames = 1) {
    for (let i = 0; i < frames; i++) {
      this.scenes.update(1);
      this.input.update();
    }
  }

  async init() {
    // Initialize the PixiJS application
    await this.pixiApp.init({
      width: W,
      height: H,
      background: "#241a38",
      antialias: true,
    });

    // Bake all textures once on startup
    await textureManager.init(this.pixiApp.renderer);

    // Remove the HTML loading placeholder and append the canvas
    document.getElementById("loading")?.remove();
    document.getElementById("game")?.appendChild(this.pixiApp.canvas);

    // Instantiate core systems
    this.input = new InputManager();
    this.scenes = new SceneManager(this);
    window.__app = this.pixiApp; // debug handle

    // Set up the main ticker loop
    this.pixiApp.ticker.add((tk) => {
      let dt = this.fixedStep ? 1 : Math.min(tk.deltaTime, 2.5);

      if (this.paused) {
        if (this.stepFramesCount > 0) {
          this.stepFramesCount--;
          dt = 1.0;
        } else if (this.stepFrame) {
          this.stepFrame = false;
          dt = 1.0;
        } else {
          dt = 0;
        }
      } else {
        dt *= this.timeScale;
      }
      
      // Update scene (controller)
      if (dt > 0) {
        this.scenes.update(dt);
      }
      
      // Clear input buffers at the end of the frame
      this.input.update();
    });
  }

  /**
   * Switches to the initial scene.
   * @param {Scene} scene - The scene to start the application with.
   */
  start(scene) {
    this.scenes.switchScene(scene);
  }
}

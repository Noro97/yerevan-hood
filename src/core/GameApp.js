import { Application } from "pixi.js";
import { W, H } from "./Constants.js";
import { InputManager } from "./InputManager.js";
import { SceneManager } from "./SceneManager.js";

export class GameApp {
  constructor() {
    this.pixiApp = new Application();
    this.input = null;
    this.scenes = null;
  }

  async init() {
    // Initialize the PixiJS application
    await this.pixiApp.init({
      width: W,
      height: H,
      background: "#241a38",
      antialias: true,
    });

    // Remove the HTML loading placeholder and append the canvas
    document.getElementById("loading")?.remove();
    document.getElementById("game")?.appendChild(this.pixiApp.canvas);

    // Instantiate core systems
    this.input = new InputManager();
    this.scenes = new SceneManager(this);
    window.__app = this.pixiApp; // debug handle

    // Set up the main ticker loop
    this.pixiApp.ticker.add((tk) => {
      const dt = Math.min(tk.deltaTime, 2.5);
      
      // Update scene (controller)
      this.scenes.update(dt);
      
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

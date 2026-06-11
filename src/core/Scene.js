import { Container } from "pixi.js";

export class Scene extends Container {
  constructor() {
    super();
  }

  /**
   * Called when this scene is activated by the SceneManager.
   * @param {GameApp} app - Reference to the main GameApp instance.
   */
  onEnter(app) {
    // Override in subclasses
  }

  /**
   * Called when this scene is being removed by the SceneManager.
   * Use this to clear references, destroy child elements, and detach custom listeners.
   */
  onExit() {
    // Clean up all children container elements recursively to prevent leaks
    this.destroy({ children: true });
  }

  /**
   * Called on every frame tick from the main loop.
   * @param {number} dt - delta time
   */
  update(dt) {
    // Override in subclasses
  }
}

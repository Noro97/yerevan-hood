export class SceneManager {
  /**
   * @param {GameApp} gameApp - Reference to the main GameApp instance.
   */
  constructor(gameApp) {
    this.gameApp = gameApp;
    this.currentScene = null;
  }

  /**
   * Deactivates the current scene and transitions to a new one.
   * @param {Scene} newScene - Instance of the scene to load.
   */
  switchScene(newScene) {
    if (this.currentScene) {
      this.currentScene.onExit();
      this.gameApp.pixiApp.stage.removeChild(this.currentScene);
      this.currentScene = null;
    }

    this.currentScene = newScene;
    this.gameApp.pixiApp.stage.addChild(this.currentScene);
    this.currentScene.onEnter(this.gameApp);
  }

  /**
   * Delegated update called by the main loop tick.
   * @param {number} dt - delta time
   */
  update(dt) {
    if (this.currentScene) {
      this.currentScene.update(dt);
    }
  }
}

export class InputManager {
  constructor() {
    this.keys = new Set();
    this.justPressed = new Set();

    this.onKeyDown = (e) => {
      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space"].includes(e.code)) {
        e.preventDefault();
      }
      if (!this.keys.has(e.code)) {
        this.justPressed.add(e.code);
      }
      this.keys.add(e.code);

      // Trigger global handlers if bound (e.g., to skip title or restart screens)
      if (this.onAnyKeyPress) {
        this.onAnyKeyPress(e.code);
      }
    };

    this.onKeyUp = (e) => {
      this.keys.delete(e.code);
    };

    this.onBlur = () => {
      this.keys.clear();
      this.justPressed.clear();
    };

    window.addEventListener("keydown", this.onKeyDown);
    window.addEventListener("keyup", this.onKeyUp);
    window.addEventListener("blur", this.onBlur);

    this.onAnyKeyPress = null;
  }

  isDown(...codes) {
    return codes.some((code) => this.keys.has(code));
  }

  isPressed(...codes) {
    return codes.some((code) => this.justPressed.has(code));
  }

  update() {
    this.justPressed.clear();
  }

  destroy() {
    window.removeEventListener("keydown", this.onKeyDown);
    window.removeEventListener("keyup", this.onKeyUp);
    window.removeEventListener("blur", this.onBlur);
  }
}

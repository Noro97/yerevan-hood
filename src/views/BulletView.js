import { Container, Graphics } from "pixi.js";

export class BulletView extends Container {
  constructor() {
    super();
    const g = new Graphics();
    
    // Tiny bright bullet trail
    g.roundRect(-6, -1.5, 12, 3, 1.5).fill(0xffe28a);
    
    this.addChild(g);
  }

  updateView(dt, model) {
    this.x = model.x;
    this.y = model.ry;
    this.zIndex = model.gy + 10; // Slightly higher depth sorting than characters
  }
}

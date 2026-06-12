export class GameModel {
  constructor() {
    this.mode = "title"; // title | dialogue | banner | playing | gameover | victory
    this.wave = 0;
    this.score = 0;
    this.combo = 0;
    this.comboTimer = 0;
    
    this.buffs = {
      speed: 0,
      rage: 0,
    };
    
    this.spawnQueue = [];
    this.spawnTimer = 0;
    this.camX = 0;
    this.shake = 0;
    this.zoomPunch = 0; // camera zoom kick on boss KOs
    this.super = 0;     // ԿԱՅԾԱԿ meter, 0..100
    this.bannerTimer = 0;
    this.deathTimer = 0;
    this.endless = false;
  }

  reset() {
    this.mode = "playing";
    this.wave = 0;
    this.score = 0;
    this.combo = 0;
    this.comboTimer = 0;
    this.buffs.speed = 0;
    this.buffs.rage = 0;
    this.spawnQueue = [];
    this.spawnTimer = 0;
    this.camX = 0;
    this.shake = 0;
    this.zoomPunch = 0;
    this.super = 0;
    this.bannerTimer = 0;
    this.deathTimer = 0;
    this.endless = false;
  }
}

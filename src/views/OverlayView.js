import { Container, Graphics, Text } from "pixi.js";
import { W, H, ARM_FONT } from "../core/Constants.js";

function makeText(text, size, fill, weight = "700") {
  return new Text({
    text,
    style: {
      fontFamily: ARM_FONT,
      fontSize: size,
      fill,
      fontWeight: weight,
      stroke: { color: 0x120d1d, width: Math.max(2, size / 8) },
      letterSpacing: 1,
    },
  });
}

export class OverlayView extends Container {
  constructor() {
    super();
    this.visible = true;

    this.dim = new Graphics();
    this.dim.rect(0, 0, W, H).fill({ color: 0x0c0815, alpha: 0.66 });
    this.addChild(this.dim);

    this.titleBig = makeText("ԵՐԵՎԱՆ HOOD", 64, 0xffd98a, "900");
    this.titleBig.anchor.set(0.5);
    this.titleBig.position.set(W / 2, 170);

    this.titleSub = makeText("ԿՈՆԴ · KOND STREET BRAWLER", 20, 0xc9a0ff);
    this.titleSub.anchor.set(0.5);
    this.titleSub.position.set(W / 2, 225);

    this.titlePrompt = makeText("PRESS ANY KEY", 22, 0xffffff);
    this.titlePrompt.anchor.set(0.5);
    this.titlePrompt.position.set(W / 2, 330);

    this.titleInfo = makeText("Վերադարձրու պապիկի մեդալը · Bring grandpa's medal home", 14, 0xbbaecc, "400");
    this.titleInfo.anchor.set(0.5);
    this.titleInfo.position.set(W / 2, 380);

    this.addChild(this.titleBig, this.titleSub, this.titlePrompt, this.titleInfo);
  }

  showTitle() {
    this.visible = true;
    this.titleBig.text = "ԵՐԵՎԱՆ HOOD";
    this.titleSub.text = "ԿՈՆԴ · KOND STREET BRAWLER";
    this.titlePrompt.text = "PRESS ANY KEY";
    this.titleInfo.text = "Վերադարձրու պապիկի մեդալը · Bring grandpa's medal home";
  }

  showGameOver(score, wave) {
    this.visible = true;
    this.titleBig.text = "GAME OVER";
    this.titleSub.text = `ԽԱՂՆ ԱՎԱՐՏՎԵՑ · ՀԱՇԻՎ ${score}`;
    this.titlePrompt.text = "R / ENTER — RESTART";
    this.titleInfo.text = `Հասար ալիք ${wave} · You reached wave ${wave}`;
    
    this.titleBig.position.set(W / 2, 170);
    this.titlePrompt.alpha = 1;
  }

  showVictory(score) {
    this.visible = true;
    this.titleBig.text = "ՀԱՂԹԱՆԱԿ";
    this.titleSub.text = `VICTORY · ՀԱՇԻՎ ${score}`;
    this.titlePrompt.text = "ENTER — ENDLESS MODE · R — RESTART";
    this.titleInfo.text = "Մեդալը տանն է, թաղը՝ ազատ · The medal is home, the hood is free";
    
    this.titleBig.position.set(W / 2, 170);
    this.titlePrompt.alpha = 1;
  }

  showPause(muted) {
    this.visible = true;
    this.titleBig.text = "ԴԱԴԱՐ";
    this.titleSub.text = "PAUSED";
    this.titlePrompt.text = "ESC / ENTER — CONTINUE";
    this.titleInfo.text = `M — ${muted ? "ձայնը միացնել · sound on" : "ձայնը անջատել · sound off"}`;
    this.titleBig.position.set(W / 2, 170);
    this.titlePrompt.alpha = 1;
  }

  hide() {
    this.visible = false;
  }

  updateView(frame, mode) {
    if (!this.visible) return;

    if (mode === "title") {
      this.titleBig.y = 170 + Math.sin(frame * 0.04) * 6;
      this.titlePrompt.alpha = 0.6 + Math.sin(frame * 0.12) * 0.4;
    }
  }
}

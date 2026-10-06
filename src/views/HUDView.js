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

export class HUDView extends Container {
  constructor() {
    super();

    this.hudName = makeText("ԴԱՎՈ · DAVO", 15, 0xffd98a);
    this.hudName.position.set(18, 12);

    this.hudBarBg = new Graphics();
    this.hudBarBg.roundRect(18, 36, 204, 16, 6).fill({ color: 0x000000, alpha: 0.6 });
    this.hudBarBg.roundRect(18, 36, 204, 16, 6).stroke({ width: 2, color: 0xffd98a });

    this.hudBarFg = new Graphics();

    this.hudWeapon = makeText("", 13, 0xe8cf9e);
    this.hudWeapon.position.set(18, 58);

    this.superBg = new Graphics();
    this.superBg.roundRect(18, 80, 124, 9, 4).fill({ color: 0x000000, alpha: 0.6 });
    this.superBg.roundRect(18, 80, 124, 9, 4).stroke({ width: 1.5, color: 0xffe14a });
    this.superFg = new Graphics();
    this.superLabel = makeText("ԿԱՅԾԱԿ · U", 10, 0xffe14a);
    this.superLabel.position.set(148, 78);

    this.hudBuffs = makeText("", 13, 0x9fd8ff);
    this.hudBuffs.position.set(18, 94);

    this.hudScore = makeText("0", 22, 0xffffff);
    this.hudScore.anchor.set(1, 0);
    this.hudScore.position.set(W - 18, 12);

    this.hudWave = makeText("", 14, 0xc9a0ff);
    this.hudWave.anchor.set(1, 0);
    this.hudWave.position.set(W - 18, 40);

    this.hudMuted = makeText("ՁԱՅՆԸ ԱՆՋԱՏՎԱԾ · M", 11, 0xbbaecc, "400");
    this.hudMuted.anchor.set(1, 0);
    this.hudMuted.position.set(W - 18, 60);
    this.hudMuted.visible = false;

    this.hudCombo = makeText("", 26, 0xffb347, "900");
    this.hudCombo.anchor.set(0.5);
    this.hudCombo.position.set(W / 2, 70);
    this.hudCombo.visible = false;

    this.hudHint = makeText("←→↑↓/WASD · J/Z հարված (J·J·J) · K/X ոտք · SPACE թռիչք · E նետիր · L/Shift գլորվիր · U ԿԱՅԾԱԿ · Esc դադար · M ձայն", 11, 0xbbaecc, "400");
    this.hudHint.anchor.set(0.5, 1);
    this.hudHint.position.set(W / 2, H - 8);

    this.bossName = makeText("", 13, 0xff6a5e, "900");
    this.bossName.anchor.set(0.5);
    this.bossName.position.set(W / 2, 90);
    this.bossName.visible = false;
    this.bossBarBg = new Graphics();
    this.bossBarBg.roundRect(W / 2 - 160, 102, 320, 10, 4).fill({ color: 0x000000, alpha: 0.6 });
    this.bossBarBg.roundRect(W / 2 - 160, 102, 320, 10, 4).stroke({ width: 1.5, color: 0xff6a5e });
    this.bossBarBg.visible = false;
    this.bossBarFg = new Graphics();

    // Ghost bar state: trails behind the real HP to visualize recent damage
    this.ghost = 1;
    this.tick = 0;

    this.banner = makeText("", 44, 0xffd98a, "900");
    this.banner.anchor.set(0.5);
    this.banner.position.set(W / 2, H / 2 - 70);
    this.banner.visible = false;

    this.bannerSub = makeText("", 20, 0xc9a0ff);
    this.bannerSub.anchor.set(0.5);
    this.bannerSub.position.set(W / 2, H / 2 - 28);
    this.bannerSub.visible = false;

    this.addChild(
      this.hudName,
      this.hudBarBg,
      this.hudBarFg,
      this.hudWeapon,
      this.superBg,
      this.superFg,
      this.superLabel,
      this.hudBuffs,
      this.hudScore,
      this.hudWave,
      this.hudMuted,
      this.hudCombo,
      this.hudHint,
      this.banner,
      this.bannerSub,
      this.bossName,
      this.bossBarBg,
      this.bossBarFg
    );
  }

  updateView(gameModel, playerModel, bossModel = null) {
    this.tick++;

    const hpRatio = playerModel ? Math.max(0, playerModel.hp) / playerModel.maxHp : 0;
    // heals snap up fast, damage drains away slowly
    this.ghost += (hpRatio - this.ghost) * (hpRatio > this.ghost ? 0.5 : 0.045);
    this.hudBarFg.clear();
    if (this.ghost > hpRatio + 0.002) {
      this.hudBarFg.roundRect(21, 39, 198 * this.ghost, 10, 4).fill({ color: 0xfff0c0, alpha: 0.5 });
    }
    if (hpRatio > 0) {
      // low-HP heartbeat pulse
      let fill = hpRatio > 0.35 ? 0x7ec850 : 0xe65040;
      if (hpRatio <= 0.3 && Math.sin(this.tick * 0.25) > 0.2) fill = 0xff8a6a;
      this.hudBarFg.roundRect(21, 39, 198 * hpRatio, 10, 4).fill(fill);
    }

    if (bossModel) {
      this.bossName.text = bossModel.bossName || "BOSS";
      this.bossName.visible = true;
      this.bossBarBg.visible = true;
      this.bossBarFg.clear();
      const br = Math.max(0, bossModel.hp) / bossModel.maxHp;
      if (br > 0) {
        this.bossBarFg.roundRect(W / 2 - 158, 104, 316 * br, 6, 3).fill(0xff6a5e);
      }
    } else {
      this.bossName.visible = false;
      this.bossBarBg.visible = false;
      this.bossBarFg.clear();
    }

    this.hudScore.text = String(gameModel.score);
    this.hudWave.text = gameModel.wave > 0 ? `ԱԼԻՔ ${gameModel.wave}` : "";

    const w = playerModel?.weapon;
    this.hudWeapon.text = !w ? ""
      : w.def.melee ? `${w.def.label} ×${w.uses} · E՝ նետիր`
        : `${w.def.label} ×${w.ammo} · J՝ կրակիր · E՝ նետիր`;

    this.superFg.clear();
    const sup = Math.max(0, Math.min(100, gameModel.super || 0));
    if (sup > 0) {
      const full = sup >= 100;
      const flash = full && Math.sin(this.tick * 0.3) > 0;
      this.superFg.roundRect(20, 82, 120 * (sup / 100), 5, 2).fill(flash ? 0xfff7c0 : 0xffe14a);
    }
    this.superLabel.alpha = sup >= 100 ? 0.7 + Math.sin(this.tick * 0.3) * 0.3 : 0.45;

    const parts = [];
    if (gameModel.buffs.speed > 0) {
      parts.push(`ԹԱՆ · SPEED ${Math.ceil(gameModel.buffs.speed / 60)}s`);
    }
    if (gameModel.buffs.rage > 0) {
      parts.push(`ԿՈՆՅԱԿ · RAGE ${Math.ceil(gameModel.buffs.rage / 60)}s`);
    }
    this.hudBuffs.text = parts.join("  ·  ");

    if (gameModel.comboTimer > 0 && gameModel.combo >= 2) {
      this.hudCombo.text = `x${gameModel.combo} COMBO!`;
      this.hudCombo.alpha = Math.min(1, gameModel.comboTimer / 30);
      this.hudCombo.visible = true;
    } else {
      this.hudCombo.visible = false;
    }

    if (gameModel.mode === "banner") {
      this.banner.alpha = Math.min(1, gameModel.bannerTimer / 25);
      this.bannerSub.alpha = this.banner.alpha;
      this.banner.visible = true;
      this.bannerSub.visible = true;
    } else {
      this.banner.visible = false;
      this.bannerSub.visible = false;
    }
  }

  setMuted(muted) {
    this.hudMuted.visible = muted;
  }

  showBannerText(title, subTitle, isBoss = false) {
    this.banner.text = title;
    this.banner.style.fill = isBoss ? 0xff6a5e : 0xffd98a;
    this.bannerSub.text = subTitle;
  }
}

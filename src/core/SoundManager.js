const MUTE_KEY = "yerevan-hood.muted";

export class SoundManager {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.muted = false;
    this.volume = 1;
    try {
      this.muted = localStorage.getItem(MUTE_KEY) === "1";
    } catch {
      // storage unavailable (private mode, sandboxed iframe): start unmuted
    }
  }

  setVolume(volume) {
    this.volume = volume;
    if (this.master) this.master.gain.value = this.muted ? 0 : volume;
  }

  setMuted(muted) {
    this.muted = muted;
    if (this.master) this.master.gain.value = muted ? 0 : this.volume;
    try {
      localStorage.setItem(MUTE_KEY, muted ? "1" : "0");
    } catch {
      // not persisted; the toggle still applies to this session
    }
  }

  ac() {
    try {
      if (!this.ctx) {
        this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        this.master = this.ctx.createGain();
        this.master.gain.value = this.muted ? 0 : this.volume;
        this.master.connect(this.ctx.destination);
      }
      if (this.ctx.state === "suspended") {
        this.ctx.resume();
      }
    } catch {
      this.ctx = null;
    }
    return this.ctx;
  }

  unlock() {
    this.ac();
  }

  blip(f0, f1, dur, type = "square", vol = 0.15) {
    const a = this.ac();
    if (!a) return;
    const o = a.createOscillator();
    const g = a.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f0, a.currentTime);
    o.frequency.exponentialRampToValueAtTime(Math.max(f1, 1), a.currentTime + dur);
    g.gain.setValueAtTime(vol, a.currentTime);
    g.gain.exponentialRampToValueAtTime(0.0001, a.currentTime + dur);
    o.connect(g).connect(this.master);
    o.start();
    o.stop(a.currentTime + dur + 0.02);
  }

  noise(dur, vol = 0.1, freq = 1000) {
    const a = this.ac();
    if (!a) return;
    const len = Math.floor(a.sampleRate * dur);
    const buf = a.createBuffer(1, len, a.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    const src = a.createBufferSource();
    src.buffer = buf;
    const filt = a.createBiquadFilter();
    filt.type = "bandpass";
    filt.frequency.value = freq;
    const g = a.createGain();
    g.gain.setValueAtTime(vol, a.currentTime);
    g.gain.exponentialRampToValueAtTime(0.0001, a.currentTime + dur);
    src.connect(filt).connect(g).connect(this.master);
    src.start();
  }

  swing() {
    this.noise(0.07, 0.09, 1400);
  }

  hit() {
    this.blip(220, 80, 0.09, "square", 0.18);
    this.noise(0.05, 0.14, 700);
  }

  heavyHit() {
    this.blip(130, 35, 0.18, "sawtooth", 0.28);
    this.noise(0.12, 0.22, 450);
  }

  clang() {
    const a = this.ac();
    if (!a) return;
    const now = a.currentTime;

    // Dual ringing metallic tones
    for (const freq of [840, 1420]) {
      const osc = a.createOscillator();
      const gain = a.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, now);
      osc.frequency.exponentialRampToValueAtTime(freq * 0.92, now + 0.22);
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.22);
      osc.connect(gain).connect(this.master);
      osc.start(now);
      osc.stop(now + 0.24);
    }
    // High-frequency metallic scrape transient
    this.noise(0.06, 0.15, 3200);
  }

  gunshot() {
    const a = this.ac();
    if (!a) return;
    const now = a.currentTime;

    // Sub kick punch
    const osc = a.createOscillator();
    const gain = a.createGain();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(170, now);
    osc.frequency.exponentialRampToValueAtTime(30, now + 0.24);
    gain.gain.setValueAtTime(0.35, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.24);
    osc.connect(gain).connect(this.master);
    osc.start(now);
    osc.stop(now + 0.26);

    // Explosive crackle noise
    this.noise(0.18, 0.28, 1800);
  }

  crateBreak() {
    this.blip(140, 45, 0.16, "triangle", 0.2);
    this.noise(0.14, 0.24, 600);
    this.noise(0.08, 0.16, 1200);
  }

  glassBreak() {
    const a = this.ac();
    if (!a) return;
    const now = a.currentTime;
    for (const freq of [2200, 3400, 4100]) {
      const osc = a.createOscillator();
      const gain = a.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, now);
      osc.frequency.exponentialRampToValueAtTime(freq * 0.7, now + 0.18);
      gain.gain.setValueAtTime(0.14, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.18);
      osc.connect(gain).connect(this.master);
      osc.start(now);
      osc.stop(now + 0.2);
    }
    this.noise(0.12, 0.18, 3800);
  }

  coin() {
    const a = this.ac();
    if (!a) return;
    const now = a.currentTime;
    // B5 (987Hz) then E6 (1318Hz) arcade chime
    const tones = [{ f: 987, t: 0, d: 0.09 }, { f: 1318, t: 0.08, d: 0.24 }];
    for (const tone of tones) {
      const osc = a.createOscillator();
      const gain = a.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(tone.f, now + tone.t);
      gain.gain.setValueAtTime(0.18, now + tone.t);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + tone.t + tone.d);
      osc.connect(gain).connect(this.master);
      osc.start(now + tone.t);
      osc.stop(now + tone.t + tone.d + 0.02);
    }
  }

  super() {
    this.blip(120, 480, 0.35, "sawtooth", 0.25);
    this.blip(300, 60, 0.45, "triangle", 0.3);
    this.noise(0.35, 0.25, 800);
  }

  hurt() {
    this.blip(170, 70, 0.16, "sawtooth", 0.14);
  }

  ko() {
    this.blip(320, 40, 0.45, "triangle", 0.22);
    this.noise(0.2, 0.12, 300);
  }

  pickup() {
    this.blip(440, 990, 0.14, "sine", 0.16);
  }

  wave() {
    this.blip(330, 660, 0.25, "triangle", 0.13);
  }
}

export const sfx = new SoundManager();

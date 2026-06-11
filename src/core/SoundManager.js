export class SoundManager {
  constructor() {
    this.ctx = null;
  }

  ac() {
    try {
      if (!this.ctx) {
        this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      }
      if (this.ctx.state === "suspended") {
        this.ctx.resume();
      }
    } catch (e) {
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
    o.connect(g).connect(a.destination);
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
    src.connect(filt).connect(g).connect(a.destination);
    src.start();
  }

  swing() {
    this.noise(0.07, 0.09, 1400);
  }

  hit() {
    this.blip(220, 80, 0.09, "square", 0.18);
    this.noise(0.05, 0.14, 700);
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

// Singleton export
export const sfx = new SoundManager();

/* Tiny WebAudio blip engine — no files, everything is synthesised. */

const Sfx = {
  ctx: null,
  master: null,
  muted: false,

  ensure() {
    if (this.ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.22;
    this.master.connect(this.ctx.destination);
  },

  resume() {
    this.ensure();
    if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
  },

  toggle() {
    this.muted = !this.muted;
    return this.muted;
  },

  tone({ freq = 300, to = null, dur = 0.1, type = 'square', gain = 0.5, delay = 0 }) {
    if (this.muted) return;
    this.ensure();
    if (!this.ctx) return;
    const t0 = this.ctx.currentTime + delay;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (to) osc.frequency.exponentialRampToValueAtTime(Math.max(20, to), t0 + dur);
    g.gain.setValueAtTime(0, t0);
    g.gain.linearRampToValueAtTime(gain, t0 + 0.006);
    g.gain.exponentialRampToValueAtTime(0.0008, t0 + dur);
    osc.connect(g);
    g.connect(this.master);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  },

  noise({ dur = 0.18, gain = 0.4, delay = 0 }) {
    if (this.muted) return;
    this.ensure();
    if (!this.ctx) return;
    const t0 = this.ctx.currentTime + delay;
    const frames = Math.floor(this.ctx.sampleRate * dur);
    const buf = this.ctx.createBuffer(1, frames, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < frames; i++) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / frames);
    }
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const g = this.ctx.createGain();
    g.gain.value = gain;
    src.connect(g);
    g.connect(this.master);
    src.start(t0);
  },

  play(name) {
    switch (name) {
      case 'shot': this.tone({ freq: 420, to: 180, dur: 0.07, gain: 0.16 }); break;
      case 'super_shot': this.tone({ freq: 700, to: 260, dur: 0.07, type: 'sawtooth', gain: 0.16 }); break;
      case 'super': this.tone({ freq: 180, to: 700, dur: 0.3, type: 'sawtooth', gain: 0.3 }); break;
      case 'hit': this.tone({ freq: 240, to: 120, dur: 0.06, gain: 0.12 }); break;
      case 'gem': this.tone({ freq: 760, to: 1180, dur: 0.12, type: 'triangle', gain: 0.28 }); break;
      case 'death': this.noise({ dur: 0.35, gain: 0.35 }); this.tone({ freq: 200, to: 60, dur: 0.35, gain: 0.25 }); break;
      case 'crate': this.noise({ dur: 0.16, gain: 0.28 }); break;
      case 'charged': this.tone({ freq: 520, to: 900, dur: 0.18, type: 'triangle', gain: 0.3 }); break;
      case 'tick': this.tone({ freq: 880, dur: 0.07, type: 'triangle', gain: 0.25 }); break;
      case 'win': [523, 659, 784, 1046].forEach((f, i) => this.tone({ freq: f, dur: 0.24, type: 'triangle', gain: 0.3, delay: i * 0.13 })); break;
      case 'lose': [523, 415, 330, 262].forEach((f, i) => this.tone({ freq: f, dur: 0.28, type: 'triangle', gain: 0.3, delay: i * 0.15 })); break;
    }
  },
};

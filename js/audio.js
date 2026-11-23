// ============================================================
// VOLT RUSH — audio.js
// All sound is synthesized with the Web Audio API:
// oscillators, noise buffers and a procedural ambient music loop.
// ============================================================

class AudioEngine {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.sfxGain = null;
    this.musicGain = null;
    this.enabled = true;
    this.musicEnabled = true;
    this.musicTimer = null;
    this.musicStep = 0;
    this.nextChordTime = 0;
    this.noiseBuf = null;
    this.started = false;
  }

  // Must be called from a user gesture.
  init() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume();
      return;
    }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.9;
    this.master.connect(this.ctx.destination);

    this.sfxGain = this.ctx.createGain();
    this.sfxGain.gain.value = 0.85;
    this.sfxGain.connect(this.master);

    this.musicGain = this.ctx.createGain();
    this.musicGain.gain.value = this.musicEnabled ? 0.22 : 0;
    this.musicGain.connect(this.master);

    // white noise buffer for percussion / crashes
    const len = this.ctx.sampleRate * 1.2;
    this.noiseBuf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = this.noiseBuf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;

    if (this.musicEnabled) this.startMusic();
  }

  setSound(on) { this.enabled = on; }
  setMusic(on) {
    this.musicEnabled = on;
    if (!this.ctx) return;
    this.musicGain.gain.setTargetAtTime(on ? 0.22 : 0, this.ctx.currentTime, 0.15);
    if (on && !this.musicTimer) this.startMusic();
  }

  // ---- helpers -------------------------------------------------------
  env(gainNode, t0, attack, decay, peak) {
    const g = gainNode.gain;
    g.cancelScheduledValues(t0);
    g.setValueAtTime(0.0001, t0);
    g.exponentialRampToValueAtTime(Math.max(0.0002, peak), t0 + attack);
    g.exponentialRampToValueAtTime(0.0001, t0 + attack + decay);
  }

  tone({ type = 'sine', from = 440, to = null, dur = 0.2, vol = 0.4, delay = 0, curve = 'exp' }) {
    if (!this.ctx || !this.enabled) return;
    const t0 = this.ctx.currentTime + delay;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(from, t0);
    if (to !== null) {
      if (curve === 'exp') osc.frequency.exponentialRampToValueAtTime(Math.max(1, to), t0 + dur);
      else osc.frequency.linearRampToValueAtTime(to, t0 + dur);
    }
    this.env(g, t0, 0.012, dur, vol);
    osc.connect(g);
    g.connect(this.sfxGain);
    osc.start(t0);
    osc.stop(t0 + dur + 0.08);
  }

  noise({ dur = 0.3, vol = 0.4, delay = 0, filterFrom = 4000, filterTo = 300, type = 'lowpass' }) {
    if (!this.ctx || !this.enabled || !this.noiseBuf) return;
    const t0 = this.ctx.currentTime + delay;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuf;
    src.loop = true;
    const f = this.ctx.createBiquadFilter();
    f.type = type;
    f.frequency.setValueAtTime(filterFrom, t0);
    f.frequency.exponentialRampToValueAtTime(Math.max(40, filterTo), t0 + dur);
    const g = this.ctx.createGain();
    this.env(g, t0, 0.008, dur, vol);
    src.connect(f); f.connect(g); g.connect(this.sfxGain);
    src.start(t0);
    src.stop(t0 + dur + 0.05);
  }

  // ---- sound effects -------------------------------------------------
  play(name) {
    if (!this.ctx || !this.enabled) return;
    switch (name) {
      case 'coin':
        this.tone({ type: 'square', from: 988, dur: 0.07, vol: 0.18 });
        this.tone({ type: 'square', from: 1319, dur: 0.12, vol: 0.2, delay: 0.06 });
        break;
      case 'coinBig':
        this.tone({ type: 'square', from: 784, dur: 0.07, vol: 0.2 });
        this.tone({ type: 'square', from: 1047, dur: 0.08, vol: 0.2, delay: 0.07 });
        this.tone({ type: 'square', from: 1568, dur: 0.16, vol: 0.2, delay: 0.14 });
        break;
      case 'jump':
        this.tone({ type: 'triangle', from: 340, to: 760, dur: 0.18, vol: 0.3 });
        break;
      case 'superjump':
        this.tone({ type: 'sawtooth', from: 260, to: 1200, dur: 0.35, vol: 0.22 });
        this.tone({ type: 'triangle', from: 520, to: 1800, dur: 0.3, vol: 0.18, delay: 0.05 });
        break;
      case 'slide':
        this.noise({ dur: 0.32, vol: 0.3, filterFrom: 5200, filterTo: 420, type: 'bandpass' });
        break;
      case 'lane':
        this.tone({ type: 'sine', from: 620, to: 880, dur: 0.09, vol: 0.14 });
        break;
      case 'power':
        [523, 659, 784, 1047].forEach((f, i) =>
          this.tone({ type: 'triangle', from: f, dur: 0.22, vol: 0.24, delay: i * 0.06 }));
        break;
      case 'shieldHit':
        this.tone({ type: 'sine', from: 1200, to: 300, dur: 0.35, vol: 0.35 });
        this.noise({ dur: 0.25, vol: 0.25, filterFrom: 6000, filterTo: 500 });
        break;
      case 'crash':
        this.noise({ dur: 0.7, vol: 0.7, filterFrom: 7000, filterTo: 90 });
        this.tone({ type: 'sawtooth', from: 220, to: 55, dur: 0.6, vol: 0.45 });
        this.tone({ type: 'square', from: 140, to: 40, dur: 0.8, vol: 0.3, delay: 0.05 });
        break;
      case 'ui':
        this.tone({ type: 'square', from: 880, dur: 0.06, vol: 0.14 });
        break;
      case 'select':
        this.tone({ type: 'triangle', from: 660, dur: 0.08, vol: 0.2 });
        this.tone({ type: 'triangle', from: 990, dur: 0.12, vol: 0.2, delay: 0.06 });
        break;
      case 'buy':
        [523, 784, 1047, 1319].forEach((f, i) =>
          this.tone({ type: 'square', from: f, dur: 0.16, vol: 0.2, delay: i * 0.07 }));
        break;
      case 'error':
        this.tone({ type: 'square', from: 220, to: 150, dur: 0.25, vol: 0.25 });
        break;
      case 'mission':
        [659, 784, 988, 1319, 1568].forEach((f, i) =>
          this.tone({ type: 'triangle', from: f, dur: 0.3, vol: 0.26, delay: i * 0.09 }));
        break;
      case 'gameover':
        [523, 440, 349, 262].forEach((f, i) =>
          this.tone({ type: 'sawtooth', from: f, dur: 0.34, vol: 0.22, delay: i * 0.16 }));
        break;
      case 'best':
        [784, 988, 1175, 1568].forEach((f, i) =>
          this.tone({ type: 'square', from: f, dur: 0.3, vol: 0.2, delay: i * 0.11 }));
        break;
      case 'jetpack':
        this.noise({ dur: 0.5, vol: 0.25, filterFrom: 900, filterTo: 2600, type: 'bandpass' });
        break;
      case 'magnet':
        this.tone({ type: 'sine', from: 200, to: 900, dur: 0.4, vol: 0.28 });
        break;
      default:
        break;
    }
  }

  // ---- procedural music: original ambient loop -----------------------
  // A slow pad progression (Am9 -> Fmaj7 -> Cmaj7 -> G6) with a soft
  // bass pulse and sparse bell arpeggio, scheduled with a look-ahead.
  startMusic() {
    if (!this.ctx || this.musicTimer) return;
    this.nextChordTime = this.ctx.currentTime + 0.1;
    this.musicStep = 0;
    this.musicTimer = setInterval(() => this.scheduleMusic(), 40);
  }

  stopMusic() {
    if (this.musicTimer) {
      clearInterval(this.musicTimer);
      this.musicTimer = null;
    }
  }

  musicNote(freq, time, dur, vol, type = 'triangle') {
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    const filt = this.ctx.createBiquadFilter();
    filt.type = 'lowpass';
    filt.frequency.value = 2200;
    osc.type = type;
    osc.frequency.value = freq;
    g.gain.setValueAtTime(0.0001, time);
    g.gain.exponentialRampToValueAtTime(vol, time + Math.min(1.2, dur * 0.35));
    g.gain.exponentialRampToValueAtTime(0.0001, time + dur);
    osc.connect(filt); filt.connect(g); g.connect(this.musicGain);
    osc.start(time);
    osc.stop(time + dur + 0.1);
  }

  scheduleMusic() {
    if (!this.ctx || !this.musicEnabled) return;
    const BPM = 74;
    const beat = 60 / BPM;
    const chordLen = beat * 8; // one chord every 2 bars
    const chords = [
      [220.00, 261.63, 329.63, 493.88], // Am9  (A C E B)
      [174.61, 261.63, 329.63, 440.00], // Fmaj7 (F C E A)
      [261.63, 329.63, 392.00, 493.88], // Cmaj7 (C E G B)
      [196.00, 246.94, 293.66, 392.00], // G6   (G B D G)
    ];
    const roots = [110.00, 87.31, 130.81, 98.00];
    while (this.nextChordTime < this.ctx.currentTime + 0.3) {
      const idx = this.musicStep % chords.length;
      const chord = chords[idx];
      const t = this.nextChordTime;
      // pad
      chord.forEach((f) => {
        this.musicNote(f, t, chordLen * 0.98, 0.075, 'triangle');
        this.musicNote(f * 1.004, t, chordLen * 0.98, 0.05, 'sine');
      });
      // bass pulse on beats 1 and 5
      this.musicNote(roots[idx], t, beat * 3.4, 0.14, 'sine');
      this.musicNote(roots[idx], t + beat * 4, beat * 3.4, 0.12, 'sine');
      // sparse bell arpeggio
      const arp = [0, 2, 1, 3, 2];
      for (let b = 0; b < 8; b += 2) {
        const n = chord[arp[(this.musicStep * 3 + b) % arp.length]];
        this.musicNote(n * 2, t + b * beat, beat * 1.8, 0.05, 'sine');
      }
      this.nextChordTime += chordLen;
      this.musicStep++;
    }
  }
}

export const audio = new AudioEngine();

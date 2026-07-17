import { sound } from './audio.js';

const STORAGE_KEY = 'namchon-tetris-music-off';

// Note frequencies (Hz).
const N = {
  A4: 440.0, B4: 493.88, C5: 523.25, D5: 587.33, E5: 659.25,
  F5: 698.46, G5: 783.99, A5: 880.0,
  E2: 82.41, A2: 110.0, B2: 123.47, C3: 130.81, D3: 146.83,
  E3: 164.81, A3: 220.0, B3: 246.94, C4: 261.63, D4: 293.66,
};

// Korobeiniki (classic Tetris theme, public-domain folk tune).
// Each entry: [frequency or null for rest, length in eighth notes].
const MELODY = [
  [N.E5, 2], [N.B4, 1], [N.C5, 1], [N.D5, 2], [N.C5, 1], [N.B4, 1],
  [N.A4, 2], [N.A4, 1], [N.C5, 1], [N.E5, 2], [N.D5, 1], [N.C5, 1],
  [N.B4, 2], [N.B4, 1], [N.C5, 1], [N.D5, 2], [N.E5, 2],
  [N.C5, 2], [N.A4, 2], [N.A4, 2], [null, 2],
  [null, 1], [N.D5, 2], [N.F5, 1], [N.A5, 2], [N.G5, 1], [N.F5, 1],
  [N.E5, 3], [N.C5, 1], [N.E5, 2], [N.D5, 1], [N.C5, 1],
  [N.B4, 2], [N.B4, 1], [N.C5, 1], [N.D5, 2], [N.E5, 2],
  [N.C5, 2], [N.A4, 2], [N.A4, 2], [null, 2],
];

// One bass root per bar (8 eighths), following the tune's chords.
const BASS_ROOTS = [N.E2, N.A2, N.B2, N.A2, N.D3, N.C3, N.B2, N.A2];

const BASE_EIGHTH_SEC = 0.185;
const LOOKAHEAD_SEC = 0.15;
const TICK_MS = 50;

class MusicPlayer {
  constructor() {
    this.enabled = localStorage.getItem(STORAGE_KEY) !== '1';
    this.timer = null;
    this.getLevel = () => 1;

    this.melodyIndex = 0;
    this.bassStep = 0;
    this.melodyTime = 0;
    this.bassTime = 0;
  }

  get playing() {
    return this.timer !== null;
  }

  eighthSec() {
    // Speed up slightly with level, capped so it stays musical.
    const speed = Math.min(1 + (this.getLevel() - 1) * 0.04, 1.35);
    return BASE_EIGHTH_SEC / speed;
  }

  toggle() {
    this.enabled = !this.enabled;
    localStorage.setItem(STORAGE_KEY, this.enabled ? '0' : '1');
    if (!this.enabled) this.stop();
    return this.enabled;
  }

  start() {
    if (!this.enabled || this.playing) return;
    const ctx = sound.ctx;
    if (!ctx) return;

    const t0 = ctx.currentTime + 0.05;
    this.melodyIndex = 0;
    this.bassStep = 0;
    this.melodyTime = t0;
    this.bassTime = t0;

    this.timer = setInterval(() => this.schedule(), TICK_MS);
  }

  stop() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  schedule() {
    const ctx = sound.ctx;
    if (!ctx) return;

    // After tab throttling/backgrounding, jump forward instead of
    // cramming all the missed notes into one burst.
    if (this.melodyTime < ctx.currentTime - 0.1) {
      this.melodyTime = ctx.currentTime + 0.05;
      this.bassTime = ctx.currentTime + 0.05;
    }

    const horizon = ctx.currentTime + LOOKAHEAD_SEC;
    const eighth = this.eighthSec();

    while (this.melodyTime < horizon) {
      const [freq, len] = MELODY[this.melodyIndex];
      const duration = len * eighth;
      if (freq) this.note(freq, this.melodyTime, duration * 0.92, 'square', 0.035);
      this.melodyTime += duration;
      this.melodyIndex = (this.melodyIndex + 1) % MELODY.length;
    }

    // Bass: root/octave pulse on every quarter note (2 eighths).
    while (this.bassTime < horizon) {
      const bar = Math.floor(this.bassStep / 4) % BASS_ROOTS.length;
      const root = BASS_ROOTS[bar];
      const freq = this.bassStep % 2 === 0 ? root : root * 2;
      this.note(freq, this.bassTime, eighth * 1.6, 'triangle', 0.05);
      this.bassTime += eighth * 2;
      this.bassStep += 1;
    }
  }

  note(freq, when, duration, type, volume) {
    const ctx = sound.ctx;
    if (sound.muted || !ctx) return;
    if (ctx.state !== 'running') ctx.resume();

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, when);

    gain.gain.setValueAtTime(0.0001, when);
    gain.gain.exponentialRampToValueAtTime(volume, when + 0.015);
    gain.gain.setValueAtTime(volume, when + Math.max(0.02, duration - 0.05));
    gain.gain.exponentialRampToValueAtTime(0.0001, when + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(when);
    osc.stop(when + duration + 0.02);
  }
}

export const music = new MusicPlayer();

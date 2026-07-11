const STORAGE_KEY = 'namchon-tetris-muted';

class SoundManager {
  constructor() {
    this.ctx = null;
    this.muted = localStorage.getItem(STORAGE_KEY) === '1';
    this.unlocked = false;

    // Ask iOS Safari to treat us like a media app so the silent (ringer)
    // switch does not mute Web Audio output.
    try {
      if (navigator.audioSession) {
        navigator.audioSession.type = 'playback';
      }
    } catch {
      // Older browsers: ignore.
    }
  }

  // Must be called from inside a user gesture (touch/click/key) at least once.
  unlock() {
    if (!this.ctx) {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return;
      this.ctx = new Ctx();
    }

    if (this.ctx.state === 'suspended' || this.ctx.state === 'interrupted') {
      this.ctx.resume();
    }

    if (!this.unlocked) {
      // Play a tiny silent buffer synchronously inside the gesture —
      // required by iOS Safari to actually enable audio output.
      try {
        const buffer = this.ctx.createBuffer(1, 1, 22050);
        const source = this.ctx.createBufferSource();
        source.buffer = buffer;
        source.connect(this.ctx.destination);
        source.start(0);
        this.unlocked = true;
      } catch {
        // Retry on the next gesture.
      }
    }
  }

  ready() {
    if (this.muted || !this.ctx) return false;
    // iOS can re-suspend the context (e.g. after backgrounding);
    // kick a resume and still schedule — queued sounds play once running.
    if (this.ctx.state !== 'running') {
      this.ctx.resume();
    }
    return true;
  }

  toggleMute() {
    this.muted = !this.muted;
    localStorage.setItem(STORAGE_KEY, this.muted ? '1' : '0');
    if (!this.muted) this.unlock();
    return this.muted;
  }

  tone({ freq = 440, duration = 0.08, type = 'square', volume = 0.16, delay = 0, slideTo = null }) {
    if (!this.ready()) return;

    const t0 = this.ctx.currentTime + delay;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (slideTo) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(1, slideTo), t0 + duration);
    }

    gain.gain.setValueAtTime(volume, t0);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(t0);
    osc.stop(t0 + duration + 0.02);
  }

  noise({ duration = 0.15, volume = 0.2, delay = 0 }) {
    if (!this.ready()) return;

    const t0 = this.ctx.currentTime + delay;
    const length = Math.floor(this.ctx.sampleRate * duration);
    const buffer = this.ctx.createBuffer(1, length, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i += 1) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / length);
    }

    const source = this.ctx.createBufferSource();
    const gain = this.ctx.createGain();
    source.buffer = buffer;
    gain.gain.setValueAtTime(volume, t0);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
    source.connect(gain);
    gain.connect(this.ctx.destination);
    source.start(t0);
  }

  move() {
    this.tone({ freq: 240, duration: 0.045, type: 'square', volume: 0.08 });
  }

  rotate() {
    this.tone({ freq: 420, duration: 0.06, type: 'triangle', volume: 0.12 });
  }

  softDrop() {
    this.tone({ freq: 180, duration: 0.03, type: 'square', volume: 0.05 });
  }

  hardDrop() {
    this.tone({ freq: 520, duration: 0.09, type: 'sawtooth', volume: 0.1, slideTo: 90 });
    this.noise({ duration: 0.1, volume: 0.14, delay: 0.03 });
  }

  lock() {
    this.tone({ freq: 140, duration: 0.06, type: 'square', volume: 0.09 });
  }

  lineClear(count) {
    const base = [523, 659, 784]; // C5 E5 G5
    base.forEach((freq, i) => {
      this.tone({ freq, duration: 0.09, type: 'square', volume: 0.14, delay: i * 0.055 });
    });
    if (count >= 4) {
      // Tetris! extra sparkle
      [1047, 1319, 1568].forEach((freq, i) => {
        this.tone({ freq, duration: 0.12, type: 'triangle', volume: 0.15, delay: 0.18 + i * 0.06 });
      });
    }
  }

  levelUp() {
    [392, 523, 659, 784].forEach((freq, i) => {
      this.tone({ freq, duration: 0.12, type: 'triangle', volume: 0.16, delay: i * 0.09 });
    });
  }

  gameOver() {
    [523, 440, 349, 262, 196].forEach((freq, i) => {
      this.tone({ freq, duration: 0.2, type: 'sawtooth', volume: 0.13, delay: i * 0.16 });
    });
  }

  pause() {
    this.tone({ freq: 330, duration: 0.08, type: 'triangle', volume: 0.1 });
    this.tone({ freq: 262, duration: 0.1, type: 'triangle', volume: 0.1, delay: 0.09 });
  }
}

export const sound = new SoundManager();

// Visual effects drawn on top of the board canvas each animation frame.

function now() {
  return performance.now();
}

const FIREWORK_COLORS = [
  '#ff4d6d', '#ffd166', '#06d6a0', '#4cc9f0', '#c77dff', '#ffffff', '#ff9f1c',
];

export class EffectsManager {
  constructor() {
    this.particles = [];
    this.rowFlashes = [];
    this.popups = [];
    this.shakeUntil = 0;
    this.shakeStrength = 0;
    this.levelFlashUntil = 0;
    this.rockets = [];
    this.sparks = [];
    this.fireworksUntil = 0;
    this.nextLaunchAt = 0;
  }

  get active() {
    const t = now();
    return (
      this.particles.length > 0 ||
      this.rowFlashes.length > 0 ||
      this.popups.length > 0 ||
      this.rockets.length > 0 ||
      this.sparks.length > 0 ||
      t < this.shakeUntil ||
      t < this.levelFlashUntil ||
      t < this.fireworksUntil
    );
  }

  get celebrating() {
    return now() < this.fireworksUntil || this.rockets.length > 0 || this.sparks.length > 0;
  }

  burstRows(rows, cols, colorsByRow) {
    const t = now();
    for (const row of rows) {
      this.rowFlashes.push({ row, start: t, duration: 260 });

      for (let col = 0; col < cols; col += 1) {
        const color = colorsByRow[row]?.[col] || '#ffffff';
        const count = 3;
        for (let i = 0; i < count; i += 1) {
          this.particles.push({
            row: row + 0.5,
            col: col + 0.5,
            vx: (Math.random() - 0.5) * 14,
            vy: -Math.random() * 10 - 3,
            size: Math.random() * 0.28 + 0.12,
            color,
            start: t,
            duration: 550 + Math.random() * 350,
          });
        }
      }
    }
  }

  scorePopup(text, row, col) {
    this.popups.push({ text, row, col, start: now(), duration: 800 });
  }

  shake(strength = 5, duration = 220) {
    this.shakeUntil = now() + duration;
    this.shakeStrength = strength;
  }

  levelFlash() {
    this.levelFlashUntil = now() + 500;
  }

  startFireworks(duration = 5200) {
    const t = now();
    this.fireworksUntil = t + duration;
    this.nextLaunchAt = t;
    this.rockets = [];
    this.sparks = [];
  }

  stopFireworks() {
    this.fireworksUntil = 0;
    this.rockets = [];
    this.sparks = [];
  }

  reset() {
    this.particles = [];
    this.rowFlashes = [];
    this.popups = [];
    this.shakeUntil = 0;
    this.levelFlashUntil = 0;
    this.stopFireworks();
  }

  launchRocket(width, height) {
    const color = FIREWORK_COLORS[Math.floor(Math.random() * FIREWORK_COLORS.length)];
    this.rockets.push({
      x: width * (0.12 + Math.random() * 0.76),
      y: height + 8,
      tx: width * (0.18 + Math.random() * 0.64),
      ty: height * (0.12 + Math.random() * 0.38),
      color,
      start: now(),
      duration: 420 + Math.random() * 280,
    });
  }

  explode(x, y, color) {
    const count = 42 + Math.floor(Math.random() * 28);
    const t = now();
    for (let i = 0; i < count; i += 1) {
      const angle = (Math.PI * 2 * i) / count + Math.random() * 0.2;
      const speed = 80 + Math.random() * 220;
      this.sparks.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color: Math.random() > 0.25 ? color : '#ffffff',
        start: t,
        duration: 700 + Math.random() * 700,
        size: 1.6 + Math.random() * 2.4,
      });
    }
  }

  shakeOffset() {
    const t = now();
    if (t >= this.shakeUntil) return { x: 0, y: 0 };
    const remain = (this.shakeUntil - t) / 220;
    const s = this.shakeStrength * remain;
    return {
      x: (Math.random() - 0.5) * 2 * s,
      y: (Math.random() - 0.5) * 2 * s,
    };
  }

  // Draw effects. cellW/cellH are board cell pixel sizes.
  draw(ctx, cellW, cellH, boardWidth, boardHeight) {
    const t = now();

    this.rowFlashes = this.rowFlashes.filter((flash) => t - flash.start < flash.duration);
    for (const flash of this.rowFlashes) {
      const progress = (t - flash.start) / flash.duration;
      ctx.fillStyle = `rgba(255, 255, 255, ${0.65 * (1 - progress)})`;
      ctx.fillRect(0, flash.row * cellH, boardWidth, cellH);
    }

    this.particles = this.particles.filter((p) => t - p.start < p.duration);
    for (const p of this.particles) {
      const age = (t - p.start) / 1000;
      const progress = (t - p.start) / p.duration;
      const x = (p.col + p.vx * age) * cellW;
      const y = (p.row + p.vy * age + 22 * age * age) * cellH;
      const size = p.size * cellW * (1 - progress * 0.5);

      ctx.globalAlpha = 1 - progress;
      ctx.fillStyle = p.color;
      ctx.fillRect(x - size / 2, y - size / 2, size, size);
    }
    ctx.globalAlpha = 1;

    this.popups = this.popups.filter((popup) => t - popup.start < popup.duration);
    for (const popup of this.popups) {
      const progress = (t - popup.start) / popup.duration;
      const x = popup.col * cellW;
      const y = (popup.row - progress * 1.6) * cellH;

      ctx.globalAlpha = 1 - progress * progress;
      ctx.font = `800 ${Math.max(14, cellW * 0.9)}px -apple-system, sans-serif`;
      ctx.textAlign = 'center';
      ctx.lineWidth = 3;
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.6)';
      ctx.strokeText(popup.text, x, y);
      ctx.fillStyle = '#ffe25a';
      ctx.fillText(popup.text, x, y);
    }
    ctx.globalAlpha = 1;

    if (t < this.levelFlashUntil) {
      const progress = 1 - (this.levelFlashUntil - t) / 500;
      ctx.fillStyle = `rgba(120, 220, 255, ${0.22 * (1 - progress)})`;
      ctx.fillRect(0, 0, boardWidth, boardHeight);
    }
  }

  /** Full-screen celebration fireworks (pixel coordinates). */
  drawFireworks(ctx, width, height) {
    const t = now();

    if (t < this.fireworksUntil && t >= this.nextLaunchAt) {
      const burstCount = 1 + (Math.random() > 0.55 ? 1 : 0);
      for (let i = 0; i < burstCount; i += 1) {
        this.launchRocket(width, height);
      }
      this.nextLaunchAt = t + 180 + Math.random() * 220;
    }

    this.rockets = this.rockets.filter((rocket) => {
      const progress = Math.min(1, (t - rocket.start) / rocket.duration);
      const eased = 1 - (1 - progress) ** 2;
      const x = rocket.x + (rocket.tx - rocket.x) * eased;
      const y = rocket.y + (rocket.ty - rocket.y) * eased;

      ctx.globalAlpha = 1;
      ctx.fillStyle = rocket.color;
      ctx.beginPath();
      ctx.arc(x, y, 2.4, 0, Math.PI * 2);
      ctx.fill();

      ctx.globalAlpha = 0.35;
      ctx.beginPath();
      ctx.arc(x, y + 10, 1.6, 0, Math.PI * 2);
      ctx.fill();

      if (progress >= 1) {
        this.explode(rocket.tx, rocket.ty, rocket.color);
        return false;
      }
      return true;
    });

    this.sparks = this.sparks.filter((spark) => t - spark.start < spark.duration);
    for (const spark of this.sparks) {
      const age = (t - spark.start) / 1000;
      const progress = (t - spark.start) / spark.duration;
      const x = spark.x + spark.vx * age;
      const y = spark.y + spark.vy * age + 140 * age * age;

      ctx.globalAlpha = 1 - progress * progress;
      ctx.fillStyle = spark.color;
      ctx.beginPath();
      ctx.arc(x, y, spark.size * (1 - progress * 0.4), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
}

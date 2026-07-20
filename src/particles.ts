/**
 * One lightweight 2D canvas, theme-aware:
 *   1. ambient: a per-theme drift — confetti · petals · balloons · bubbles · sparkles
 *   2. burst(): a celebration burst (confetti · hearts · stars) on unlock / finale
 *
 * One rAF loop, pooled particles, DPR-capped. No 3D engine — 60fps on a phone.
 */

import type { AmbientStyle, BurstShape } from "./themes.ts";

type Shape = AmbientStyle | BurstShape;

interface P {
  shape: Shape;
  x: number; y: number;
  vx: number; vy: number;
  size: number;
  rot: number; vr: number;
  life: number;   // 1 → 0 for burst kinds
  decay: number;  // 0 for ambient
  tw: number;     // twinkle phase
  color: string;
}

export interface FieldOpts {
  colors: string[];
  ambient: AmbientStyle;
  burst: BurstShape;
  reduced: boolean;
}

export class ParticleField {
  private ctx: CanvasRenderingContext2D;
  private w = 0; private h = 0; private dpr = 1;
  private ps: P[] = [];
  private last = 0; private raf = 0;

  constructor(private canvas: HTMLCanvasElement, private opts: FieldOpts) {
    this.ctx = canvas.getContext("2d", { alpha: true })!;
    this.resize();
    requestAnimationFrame(this.resize); // cold-load 0×0 guard
    window.addEventListener("resize", this.resize, { passive: true });
    window.addEventListener("load", this.resize, { passive: true });
  }

  private pick(): string {
    const c = this.opts.colors;
    return c[(Math.random() * c.length) | 0];
  }

  private resize = () => {
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.w = window.innerWidth || document.documentElement.clientWidth || 360;
    this.h = window.innerHeight || document.documentElement.clientHeight || 640;
    this.canvas.width = Math.floor(this.w * this.dpr);
    this.canvas.height = Math.floor(this.h * this.dpr);
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    this.seed();
  };

  private seed() {
    this.ps = this.ps.filter((p) => p.decay > 0); // keep in-flight bursts
    const area = this.w * this.h;
    const style = this.opts.ambient;
    const density =
      style === "sparkle" ? 26000 :
      style === "balloon" ? 120000 :
      style === "bubble" ? 46000 :
      36000;
    const count = Math.min(style === "balloon" ? 9 : 40, Math.round(area / density));
    for (let i = 0; i < count; i++) this.ps.push(this.makeAmbient(true));
  }

  private makeAmbient(spread: boolean): P {
    const style = this.opts.ambient;
    const rises = style === "balloon" || style === "bubble" || style === "sparkle";
    const startY = spread
      ? Math.random() * this.h
      : rises ? this.h + 30 : -30;
    let size: number, vy: number, vx: number;
    switch (style) {
      case "balloon":
        size = 24 + Math.random() * 16; vy = -(12 + Math.random() * 16); vx = (Math.random() - 0.5) * 6; break;
      case "bubble":
        size = 6 + Math.random() * 16; vy = -(22 + Math.random() * 34); vx = (Math.random() - 0.5) * 10; break;
      case "sparkle":
        size = 3 + Math.random() * 5; vy = (Math.random() - 0.5) * 8; vx = (Math.random() - 0.5) * 8; break;
      case "petal":
        size = 6 + Math.random() * 7; vy = 18 + Math.random() * 26; vx = (Math.random() - 0.5) * 22; break;
      default: // confetti
        size = 5 + Math.random() * 6; vy = 34 + Math.random() * 46; vx = (Math.random() - 0.5) * 30;
    }
    return {
      shape: style,
      x: Math.random() * this.w,
      y: startY,
      vx, vy, size,
      rot: Math.random() * Math.PI * 2,
      vr: (Math.random() - 0.5) * (style === "confetti" ? 5 : 2),
      life: 1, decay: 0,
      tw: Math.random() * Math.PI * 2,
      color: this.pick(),
    };
  }

  /** Celebration burst from a CSS-pixel point. */
  burst(cx = this.w / 2, cy = this.h / 2, amount = 44) {
    if (this.opts.reduced) return;
    const shape = this.opts.burst;
    for (let i = 0; i < amount; i++) {
      const a = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 1.5;
      const speed = Math.pow(Math.random(), 0.55) * 320 + 90;
      this.ps.push({
        shape,
        x: cx + (Math.random() - 0.5) * 26,
        y: cy + (Math.random() - 0.5) * 14,
        vx: Math.cos(a) * speed,
        vy: Math.sin(a) * speed,
        size: shape === "heart" ? Math.random() * 7 + 5 : shape === "star" ? Math.random() * 5 + 4 : Math.random() * 5 + 4,
        rot: Math.random() * Math.PI * 2,
        vr: (Math.random() - 0.5) * 8,
        life: 1,
        decay: Math.random() * 0.4 + 0.32,
        tw: 0,
        color: this.pick(),
      });
    }
  }

  start() {
    this.last = performance.now();
    const loop = (t: number) => {
      const dt = Math.min((t - this.last) / 1000, 0.05);
      this.last = t;
      this.draw(dt, t / 1000);
      this.raf = requestAnimationFrame(loop);
    };
    this.raf = requestAnimationFrame(loop);
  }

  stop() {
    cancelAnimationFrame(this.raf);
    window.removeEventListener("resize", this.resize);
    window.removeEventListener("load", this.resize);
  }

  private draw(dt: number, time: number) {
    const { ctx } = this;
    ctx.clearRect(0, 0, this.w, this.h);

    for (let i = this.ps.length - 1; i >= 0; i--) {
      const p = this.ps[i];

      if (p.decay) {
        p.life -= p.decay * dt;
        if (p.life <= 0) { this.ps.splice(i, 1); continue; }
        p.vy += 220 * dt; // gravity on bursts
        p.vx *= 0.985; p.vy *= 0.985;
      } else if (p.shape === "confetti" || p.shape === "petal") {
        p.vx += Math.sin(time * 1.4 + p.tw) * 6 * dt; // sway
      }

      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.rot += p.vr * dt;

      // ambient recycle
      if (!p.decay) {
        const rises = p.shape === "balloon" || p.shape === "bubble";
        if (rises && p.y < -60) { Object.assign(p, this.makeAmbient(false)); continue; }
        if (!rises && p.shape !== "sparkle" && p.y > this.h + 40) { Object.assign(p, this.makeAmbient(false)); continue; }
        if (p.shape === "sparkle") { // wrap
          if (p.x < -10) p.x = this.w + 10; else if (p.x > this.w + 10) p.x = -10;
          if (p.y < -10) p.y = this.h + 10; else if (p.y > this.h + 10) p.y = -10;
        }
      }

      ctx.save();
      ctx.translate(p.x, p.y);

      switch (p.shape) {
        case "confetti": {
          ctx.rotate(p.rot);
          ctx.globalAlpha = p.decay ? Math.min(1, p.life * 1.4) : 0.85;
          ctx.fillStyle = p.color;
          ctx.fillRect(-p.size / 2, -p.size / 3, p.size, p.size * 0.66);
          break;
        }
        case "petal": {
          ctx.rotate(p.rot);
          ctx.globalAlpha = 0.8;
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.ellipse(0, 0, p.size, p.size * 0.5, 0, 0, Math.PI * 2);
          ctx.fill();
          break;
        }
        case "balloon": {
          ctx.globalAlpha = 0.9;
          // string
          ctx.strokeStyle = p.color;
          ctx.globalAlpha = 0.35;
          ctx.beginPath();
          ctx.moveTo(0, p.size * 0.9);
          ctx.lineTo(Math.sin(time + p.tw) * 4, p.size * 2.1);
          ctx.stroke();
          // body
          ctx.globalAlpha = 0.9;
          const g = ctx.createRadialGradient(-p.size * 0.3, -p.size * 0.4, p.size * 0.1, 0, 0, p.size);
          g.addColorStop(0, "rgba(255,255,255,0.7)");
          g.addColorStop(0.3, p.color);
          g.addColorStop(1, p.color);
          ctx.fillStyle = g;
          ctx.beginPath();
          ctx.ellipse(0, 0, p.size * 0.8, p.size, 0, 0, Math.PI * 2);
          ctx.fill();
          break;
        }
        case "bubble": {
          ctx.globalAlpha = 0.5;
          ctx.strokeStyle = p.color;
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.arc(0, 0, p.size, 0, Math.PI * 2);
          ctx.stroke();
          ctx.globalAlpha = 0.7;
          ctx.fillStyle = "rgba(255,255,255,0.8)";
          ctx.beginPath();
          ctx.arc(-p.size * 0.35, -p.size * 0.35, Math.max(1, p.size * 0.18), 0, Math.PI * 2);
          ctx.fill();
          break;
        }
        case "star": {
          const tw = p.decay ? Math.min(1, p.life * 1.4) : 0.4 + Math.abs(Math.sin(time * 2 + p.tw)) * 0.6;
          ctx.globalAlpha = tw;
          ctx.globalCompositeOperation = "lighter";
          ctx.fillStyle = p.color;
          this.starPath(ctx, p.size);
          ctx.fill();
          ctx.globalCompositeOperation = "source-over";
          break;
        }
        case "sparkle": {
          const tw = 0.3 + Math.abs(Math.sin(time * 2.2 + p.tw)) * 0.7;
          ctx.globalAlpha = tw;
          ctx.fillStyle = p.color;
          this.starPath(ctx, p.size);
          ctx.fill();
          break;
        }
        case "heart": {
          ctx.globalAlpha = Math.min(1, p.life * 1.3);
          ctx.rotate(p.rot);
          ctx.fillStyle = p.color;
          this.heartPath(ctx, p.size);
          ctx.fill();
          break;
        }
      }
      ctx.restore();
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = "source-over";
  }

  private heartPath(ctx: CanvasRenderingContext2D, s: number) {
    ctx.beginPath();
    ctx.moveTo(0, s * 0.35);
    ctx.bezierCurveTo(s, -s * 0.45, s * 0.55, -s * 1.1, 0, -s * 0.35);
    ctx.bezierCurveTo(-s * 0.55, -s * 1.1, -s, -s * 0.45, 0, s * 0.35);
    ctx.closePath();
  }

  /** 4-point sparkle / star. */
  private starPath(ctx: CanvasRenderingContext2D, s: number) {
    ctx.beginPath();
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2 - Math.PI / 2;
      const lx = Math.cos(a) * s;
      const ly = Math.sin(a) * s;
      const mx = Math.cos(a + Math.PI / 4) * s * 0.32;
      const my = Math.sin(a + Math.PI / 4) * s * 0.32;
      if (i === 0) ctx.moveTo(lx, ly);
      else ctx.lineTo(lx, ly);
      ctx.lineTo(mx, my);
    }
    ctx.closePath();
  }
}

/**
 * One lightweight 2D canvas, two jobs:
 *   1. ambient: slow-rising rose embers + soft drifting bokeh on the dark scene
 *   2. burst(): a celebration burst of hearts + sparks (unlock, finale)
 *
 * One rAF loop, pooled particles, DPR-capped. No 3D engine — 60fps on a phone.
 */

type Kind = "ember" | "bokeh" | "heart" | "spark";

interface P {
  kind: Kind;
  x: number; y: number;
  vx: number; vy: number;
  size: number;
  rot: number; vr: number;
  life: number;   // 1 → 0 for burst kinds; ambient recycle
  decay: number;  // 0 for ambient
  tw: number;     // twinkle phase
  light: boolean;
}

export class ParticleField {
  private ctx: CanvasRenderingContext2D;
  private w = 0; private h = 0; private dpr = 1;
  private ps: P[] = [];
  private last = 0; private raf = 0;
  private reduced: boolean;
  private rose: string; private roseLight: string; private gold: string;

  constructor(
    private canvas: HTMLCanvasElement,
    opts: { rose: string; roseLight: string; gold: string; reduced: boolean }
  ) {
    this.ctx = canvas.getContext("2d", { alpha: true })!;
    this.rose = opts.rose;
    this.roseLight = opts.roseLight;
    this.gold = opts.gold;
    this.reduced = opts.reduced;
    this.resize();
    requestAnimationFrame(this.resize); // cold-load 0×0 guard
    window.addEventListener("resize", this.resize, { passive: true });
    window.addEventListener("load", this.resize, { passive: true });
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
    const embers = Math.min(26, Math.round((this.w * this.h) / 26000));
    const bokeh = Math.min(10, Math.round((this.w * this.h) / 90000));
    this.ps = this.ps.filter((p) => p.decay > 0); // keep in-flight bursts
    for (let i = 0; i < embers; i++) this.ps.push(this.makeAmbient("ember", true));
    for (let i = 0; i < bokeh; i++) this.ps.push(this.makeAmbient("bokeh", true));
  }

  private makeAmbient(kind: Kind, spread: boolean): P {
    const ember = kind === "ember";
    return {
      kind,
      x: Math.random() * this.w,
      y: spread ? Math.random() * this.h : this.h + 12,
      vx: (Math.random() - 0.5) * (ember ? 6 : 3),
      vy: ember ? -(Math.random() * 16 + 8) : -(Math.random() * 4 + 2),
      size: ember ? Math.random() * 1.8 + 0.8 : Math.random() * 26 + 14,
      rot: 0, vr: 0,
      life: 1, decay: 0,
      tw: Math.random() * Math.PI * 2,
      light: Math.random() > 0.6,
    };
  }

  /** Celebration burst of hearts + sparks from a CSS-pixel point. */
  burst(cx = this.w / 2, cy = this.h / 2, amount = 44) {
    if (this.reduced) return;
    for (let i = 0; i < amount; i++) {
      const heart = i % 3 === 0;
      const a = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 1.4;
      const speed = Math.pow(Math.random(), 0.55) * (heart ? 240 : 340) + 80;
      this.ps.push({
        kind: heart ? "heart" : "spark",
        x: cx + (Math.random() - 0.5) * 24,
        y: cy + (Math.random() - 0.5) * 12,
        vx: Math.cos(a) * speed,
        vy: Math.sin(a) * speed,
        size: heart ? Math.random() * 7 + 5 : Math.random() * 2.2 + 1,
        rot: Math.random() * Math.PI * 2,
        vr: (Math.random() - 0.5) * 6,
        life: 1,
        decay: Math.random() * 0.45 + (heart ? 0.28 : 0.5),
        tw: 0,
        light: Math.random() > 0.4,
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
        p.vy += (p.kind === "heart" ? 150 : 220) * dt; // gravity pulls bursts down
        p.vx *= 0.985; p.vy *= 0.985;
      }

      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.rot += p.vr * dt;

      // ambient recycle off the top
      if (!p.decay && p.y < -30) { Object.assign(p, this.makeAmbient(p.kind, false)); continue; }

      ctx.save();
      ctx.translate(p.x, p.y);

      if (p.kind === "ember") {
        const a = 0.35 + Math.sin(time * 1.6 + p.tw) * 0.25;
        ctx.globalAlpha = Math.max(0.08, a);
        ctx.fillStyle = p.light ? this.roseLight : this.rose;
        ctx.beginPath();
        ctx.arc(0, 0, p.size, 0, Math.PI * 2);
        ctx.fill();
      } else if (p.kind === "bokeh") {
        const a = 0.05 + Math.sin(time * 0.8 + p.tw) * 0.03;
        ctx.globalAlpha = Math.max(0.02, a);
        const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, p.size);
        grad.addColorStop(0, this.rose);
        grad.addColorStop(1, "transparent");
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(0, 0, p.size, 0, Math.PI * 2);
        ctx.fill();
      } else if (p.kind === "heart") {
        ctx.globalAlpha = Math.min(1, p.life * 1.3);
        ctx.rotate(p.rot);
        ctx.fillStyle = p.light ? this.roseLight : this.rose;
        this.heartPath(ctx, p.size);
        ctx.fill();
      } else {
        // spark — additive glow
        ctx.globalCompositeOperation = "lighter";
        ctx.globalAlpha = Math.min(1, p.life * 1.4);
        ctx.fillStyle = p.light ? this.gold : this.roseLight;
        ctx.beginPath();
        ctx.arc(0, 0, p.size * (0.5 + p.life), 0, Math.PI * 2);
        ctx.fill();
        ctx.globalCompositeOperation = "source-over";
      }
      ctx.restore();
    }
    ctx.globalAlpha = 1;
  }

  private heartPath(ctx: CanvasRenderingContext2D, s: number) {
    ctx.beginPath();
    ctx.moveTo(0, s * 0.35);
    ctx.bezierCurveTo(s, -s * 0.45, s * 0.55, -s * 1.1, 0, -s * 0.35);
    ctx.bezierCurveTo(-s * 0.55, -s * 1.1, -s, -s * 0.45, 0, s * 0.35);
    ctx.closePath();
  }
}

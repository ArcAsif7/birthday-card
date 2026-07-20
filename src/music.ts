/**
 * MusicBox — a soft, original music-box loop synthesized live with WebAudio.
 * Zero audio assets, zero licensing risk, ~2KB of code.
 *
 * A gentle 16-step pentatonic melody (triangle notes through a lowpass +
 * ping-pong-ish delay) that reads as "jewellery-box lullaby". Starts only on
 * a user gesture (autoplay policy) — main.ts calls start() on the first tap;
 * the corner button toggles it.
 */
export class MusicBox {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private timer = 0;
  private on = false;
  private step = 0;

  /** A-minor music-box melody, one bar of 16 gentle eighths. */
  private readonly seq = [
    440.0, 523.25, 659.25, 880.0, 659.25, 523.25, 493.88, 587.33,
    440.0, 523.25, 659.25, 783.99, 659.25, 587.33, 523.25, 493.88,
  ];
  private readonly VOL = 0.055;

  /** Must be called from inside a user gesture. Idempotent. */
  start() {
    if (this.ctx) {
      this.setOn(true);
      return;
    }
    const AC: typeof AudioContext | undefined =
      window.AudioContext || (window as any).webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();

    this.master = this.ctx.createGain();
    this.master.gain.value = this.VOL;

    // dreamy space: lowpass + feedback delay
    const lp = this.ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = 2600;
    const delay = this.ctx.createDelay(1);
    delay.delayTime.value = 0.29;
    const fb = this.ctx.createGain();
    fb.gain.value = 0.3;

    this.master.connect(lp);
    lp.connect(this.ctx.destination);
    this.master.connect(delay);
    delay.connect(fb);
    fb.connect(delay);
    delay.connect(lp);

    this.on = true;
    this.timer = window.setInterval(() => this.tick(), 262);
  }

  private tick() {
    if (!this.ctx || !this.master || !this.on) return;
    const f = this.seq[this.step % this.seq.length];
    this.step++;
    // breathe: occasionally rest at the bar's end so it never feels mechanical
    if (this.step % 16 === 15 && Math.random() < 0.5) return;

    const t = this.ctx.currentTime;
    const note = (freq: number, vol: number) => {
      const o = this.ctx!.createOscillator();
      o.type = "triangle";
      o.frequency.value = freq;
      const g = this.ctx!.createGain();
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(vol, t + 0.012); // music-box "pluck"
      g.gain.exponentialRampToValueAtTime(0.0001, t + 1.6);
      o.connect(g);
      g.connect(this.master!);
      o.start(t);
      o.stop(t + 1.7);
    };
    note(f, 1);
    if (this.step % 4 === 0) note(f / 2, 0.35); // soft low shimmer under the beat
  }

  /** Returns the new state (true = playing). */
  toggle(): boolean {
    if (!this.ctx) {
      this.start();
      return this.on;
    }
    this.setOn(!this.on);
    return this.on;
  }

  private setOn(v: boolean) {
    this.on = v;
    if (this.ctx && this.master) {
      void this.ctx.resume();
      this.master.gain.linearRampToValueAtTime(v ? this.VOL : 0, this.ctx.currentTime + 0.25);
    }
  }

  get playing() {
    return this.on;
  }

  destroy() {
    clearInterval(this.timer);
    void this.ctx?.close();
    this.ctx = null;
  }
}

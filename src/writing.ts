/**
 * ============================================================================
 *  THE MAGIC WRITING  — the hero moment.
 * ============================================================================
 *
 *  Goal: the greeting appears as if an invisible calligraphy pen is writing it,
 *  left-to-right, with a bright light tracing the pen tip, then a gold shimmer
 *  sweeps across once it's done.
 *
 *  Why a clip/mask reveal rather than SVG stroke-dashing:
 *  The greeting is CLIENT-CONFIGURABLE (any name / any language via URL params).
 *  A true stroke-dasharray needs a single-stroke skeleton path per glyph, which
 *  only exists for hand-authored fixed text. To keep personalisation working for
 *  ANY string we reveal a connected SCRIPT face (Great Vibes) behind a soft-edged
 *  wipe, and — critically — ride a glowing PEN TIP on the leading edge with a
 *  slight hand-drawn bob. Because the script is connected, ink emerging under a
 *  moving pen reads as genuine handwriting, not a fade-in.
 *
 *  Everything here is driven by two normalised inputs so the GSAP timeline owns
 *  all timing (see timeline.ts):
 *     setWrite(p)    p: 0→1   how much of the line is written
 *     setShimmer(p)  p: 0→1   position of the one-shot gold shine sweep
 *
 *  ---- TUNING QUICK REFERENCE ----------------------------------------------
 *    FEATHER  : softness of the ink's leading edge (SVG px). Bigger = wetter.
 *    BOB_AMP  : how much the pen tip rises/dips as it writes (SVG px).
 *    BOB_FREQ : how many rise/dips across the whole word.
 *    SHINE_BAND: width of the shimmer highlight (SVG px).
 *  --------------------------------------------------------------------------
 */

const SVGNS = "http://www.w3.org/2000/svg";

const FONT_SIZE = 96; // SVG user units; CSS scales the whole SVG to fit the card
const PAD_X = 40; // breathing room L/R so descenders/flourishes aren't clipped
const PAD_Y = 44;
const FEATHER = 26; // leading-edge softness
const BOB_AMP = 7;
const BOB_FREQ = 2.4;
const SHINE_BAND = 150;

export interface WritingOpts {
  greeting: string;
  gold: string;
  brightGold: string;
  scriptFont: string;
  reduced: boolean;
}

export class Writing {
  readonly svg: SVGSVGElement;
  private revealRect: SVGRectElement;
  private feather: SVGLinearGradientElement;
  private pen: SVGGElement;
  private shine: SVGTextElement;
  private shineGrad: SVGLinearGradientElement;
  private textW = 600;
  private baseY = 0;
  private startX = 0;

  constructor(opts: WritingOpts) {
    const uid = Math.random().toString(36).slice(2, 8);

    this.svg = document.createElementNS(SVGNS, "svg");
    this.svg.setAttribute("class", "writing");
    this.svg.setAttribute("role", "img");
    this.svg.setAttribute("aria-label", opts.greeting);

    const defs = document.createElementNS(SVGNS, "defs");

    // --- feathered reveal mask -------------------------------------------------
    // A white rect whose width = written amount; its right ~FEATHER px fade to
    // transparent so ink doesn't pop in as a hard block. userSpaceOnUse lets us
    // pin the fade band to the moving leading edge each frame.
    this.feather = grad(uid + "-feather", [
      { off: 0, col: "#fff", op: 1 },
      { off: 0.55, col: "#fff", op: 1 },
      { off: 1, col: "#fff", op: 0 },
    ]);
    const mask = document.createElementNS(SVGNS, "mask");
    mask.id = uid + "-mask";
    this.revealRect = document.createElementNS(SVGNS, "rect");
    this.revealRect.setAttribute("x", "0");
    this.revealRect.setAttribute("y", "0");
    this.revealRect.setAttribute("width", "0");
    this.revealRect.setAttribute("height", "100%");
    this.revealRect.setAttribute("fill", `url(#${uid}-feather)`);
    mask.appendChild(this.revealRect);

    // --- ink gradient (subtle vertical warmth in the strokes) ------------------
    const inkGrad = grad(
      uid + "-ink",
      [
        { off: 0, col: opts.brightGold, op: 1 },
        { off: 1, col: opts.gold, op: 1 },
      ],
      "vertical"
    );

    // --- pen-tip glow ----------------------------------------------------------
    const glow = document.createElementNS(SVGNS, "radialGradient");
    glow.id = uid + "-glow";
    glow.innerHTML = `
      <stop offset="0%" stop-color="#ffffff" stop-opacity="1"/>
      <stop offset="35%" stop-color="${opts.brightGold}" stop-opacity="0.9"/>
      <stop offset="100%" stop-color="${opts.brightGold}" stop-opacity="0"/>`;

    // --- wet-ink glow: a soft gold bloom around the strokes so fresh ink reads
    //     as luminous rather than flat-filled. Cheap single-blur filter. ---------
    const inkGlow = document.createElementNS(SVGNS, "filter");
    inkGlow.id = uid + "-inkglow";
    inkGlow.setAttribute("x", "-15%");
    inkGlow.setAttribute("y", "-40%");
    inkGlow.setAttribute("width", "130%");
    inkGlow.setAttribute("height", "180%");
    inkGlow.innerHTML = `
      <feGaussianBlur in="SourceAlpha" stdDeviation="1.6" result="blur"/>
      <feFlood flood-color="${opts.brightGold}" flood-opacity="0.35"/>
      <feComposite in2="blur" operator="in" result="glow"/>
      <feMerge><feMergeNode in="glow"/><feMergeNode in="SourceGraphic"/></feMerge>`;

    // --- shimmer sweep gradient ------------------------------------------------
    this.shineGrad = grad(
      uid + "-shine",
      [
        { off: 0, col: opts.brightGold, op: 0 },
        { off: 0.5, col: "#ffffff", op: 1 },
        { off: 1, col: opts.brightGold, op: 0 },
      ],
      "userspace"
    );

    defs.append(this.feather, mask, inkGrad, glow, inkGlow, this.shineGrad);

    // --- the greeting text (revealed through the mask) -------------------------
    const text = document.createElementNS(SVGNS, "text");
    text.textContent = opts.greeting;
    text.setAttribute("x", String(PAD_X));
    text.setAttribute("y", "0"); // set after measuring
    text.setAttribute("font-family", opts.scriptFont);
    text.setAttribute("font-size", String(FONT_SIZE));
    text.setAttribute("fill", `url(#${uid}-ink)`);
    text.setAttribute("mask", `url(#${uid}-mask)`);
    text.setAttribute("filter", `url(#${uid}-inkglow)`);

    // --- shimmer overlay: same glyphs, bright moving band, drawn once ----------
    this.shine = document.createElementNS(SVGNS, "text");
    this.shine.textContent = opts.greeting;
    this.shine.setAttribute("x", String(PAD_X));
    this.shine.setAttribute("y", "0");
    this.shine.setAttribute("font-family", opts.scriptFont);
    this.shine.setAttribute("font-size", String(FONT_SIZE));
    this.shine.setAttribute("fill", `url(#${uid}-shine)`);
    this.shine.setAttribute("opacity", "0");
    this.shine.setAttribute("aria-hidden", "true");

    // --- pen tip: soft glow blob + an angled calligraphy NIB + a hot core -------
    // The nib is a slim diamond tilted like a held pen, so the leading edge reads
    // as a physical tool laying ink, not just a travelling light.
    this.pen = document.createElementNS(SVGNS, "g");
    this.pen.setAttribute("opacity", "0");
    const blob = document.createElementNS(SVGNS, "circle");
    blob.setAttribute("r", "24");
    blob.setAttribute("fill", `url(#${uid}-glow)`);
    const nib = document.createElementNS(SVGNS, "path");
    // diamond nib, long axis tilted ~ -32° (pen slant of a right-handed hand)
    nib.setAttribute("d", "M0,-13 L4.5,0 L0,13 L-4.5,0 Z");
    nib.setAttribute("transform", "rotate(-32)");
    nib.setAttribute("fill", opts.brightGold);
    const core = document.createElementNS(SVGNS, "circle");
    core.setAttribute("r", "2.4");
    core.setAttribute("fill", "#fff");
    this.pen.append(blob, nib, core);

    this.svg.append(defs, text, this.shine, this.pen);

    // inkGrad is referenced by url() from the text fill; keep the ref alive.
    void inkGrad;
  }

  /**
   * Wait for the script font, then measure the glyphs and lock the viewBox.
   * Must run before the timeline drives setWrite — otherwise the bbox is wrong
   * and the pen tip drifts off the letters.
   */
  async ready(): Promise<this> {
    try {
      const fam = this.svg.querySelector("text")?.getAttribute("font-family") ?? "";
      const family = fam.match(/'([^']+)'/)?.[1] ?? fam.split(",")[0];
      // Explicitly kick the script font download, then wait for all pending fonts,
      // so getBBox measures the real glyph metrics (not a fallback face).
      await (document as any).fonts?.load?.(`${FONT_SIZE}px "${family}"`);
      await (document as any).fonts?.ready;
    } catch {
      /* fonts API absent — fall back to nominal sizing */
    }
    // Temporarily attach off-screen if not in DOM so getBBox works.
    const detached = !this.svg.isConnected;
    if (detached) {
      this.svg.style.position = "absolute";
      this.svg.style.visibility = "hidden";
      document.body.appendChild(this.svg);
    }

    const textEl = this.svg.querySelector("text")!;
    const box = textEl.getBBox();
    this.textW = box.width;
    this.baseY = -box.y + PAD_Y; // baseline so the ascender sits PAD_Y from top
    this.startX = PAD_X;

    const vbW = box.width + PAD_X * 2;
    const vbH = box.height + PAD_Y * 2;
    this.svg.setAttribute("viewBox", `0 0 ${vbW} ${vbH}`);
    this.svg.setAttribute("width", String(vbW));
    this.svg.setAttribute("height", String(vbH));

    // place both text baselines
    textEl.setAttribute("y", String(this.baseY));
    this.shine.setAttribute("y", String(this.baseY));

    if (detached) {
      this.svg.remove();
      this.svg.style.position = "";
      this.svg.style.visibility = "";
    }

    // start fully hidden
    this.setWrite(0);
    return this;
  }

  /** p: 0 (blank) → 1 (fully written). Moves the mask edge + pen tip together. */
  setWrite(p: number) {
    const edge = this.startX + Math.max(0, Math.min(1, p)) * (this.textW + FEATHER * 0.5);
    this.revealRect.setAttribute("width", String(edge));

    // pin the feather fade band to the leading edge
    this.feather.setAttribute("gradientUnits", "userSpaceOnUse");
    this.feather.setAttribute("x1", String(edge - FEATHER));
    this.feather.setAttribute("y1", "0");
    this.feather.setAttribute("x2", String(edge));
    this.feather.setAttribute("y2", "0");

    // pen tip rides the edge with a gentle hand-guided bob
    const bob = Math.sin(p * Math.PI * BOB_FREQ) * BOB_AMP;
    const penY = this.baseY - FONT_SIZE * 0.28 + bob; // ~mid x-height of the script
    this.pen.setAttribute("transform", `translate(${edge}, ${penY})`);
    // pen fades in at the very start and out at the very end
    const penOpacity = p <= 0 || p >= 1 ? 0 : Math.min(1, p * 12, (1 - p) * 12);
    this.pen.setAttribute("opacity", String(penOpacity));
  }

  /** p: 0→1 sweeps the one-shot gold shine across the finished glyphs. */
  setShimmer(p: number) {
    if (p <= 0 || p >= 1) {
      this.shine.setAttribute("opacity", "0");
      return;
    }
    this.shine.setAttribute("opacity", "1");
    const span = this.textW + PAD_X * 2 + SHINE_BAND;
    const center = -SHINE_BAND + p * span;
    this.shineGrad.setAttribute("gradientUnits", "userSpaceOnUse");
    this.shineGrad.setAttribute("x1", String(center - SHINE_BAND / 2));
    this.shineGrad.setAttribute("y1", "0");
    this.shineGrad.setAttribute("x2", String(center + SHINE_BAND / 2));
    this.shineGrad.setAttribute("y2", "0");
  }

  /** Reduced-motion / skip: show the whole greeting instantly, no pen, no shine. */
  showInstant() {
    this.setWrite(1);
    this.pen.setAttribute("opacity", "0");
    this.shine.setAttribute("opacity", "0");
  }

  /** Centre of the leading edge in CSS pixels — used to aim the particle burst. */
  penClientPoint(): { x: number; y: number } {
    const r = this.svg.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  }
}

/* -------------------------------------------------------------------------- */

type Stop = { off: number; col: string; op: number };

function grad(
  id: string,
  stops: Stop[],
  dir: "horizontal" | "vertical" | "userspace" = "horizontal"
): SVGLinearGradientElement {
  const g = document.createElementNS(SVGNS, "linearGradient");
  g.id = id;
  if (dir === "vertical") {
    g.setAttribute("x1", "0");
    g.setAttribute("y1", "0");
    g.setAttribute("x2", "0");
    g.setAttribute("y2", "1");
  } else if (dir === "horizontal") {
    g.setAttribute("x1", "0");
    g.setAttribute("y1", "0");
    g.setAttribute("x2", "1");
    g.setAttribute("y2", "0");
  }
  for (const s of stops) {
    const stop = document.createElementNS(SVGNS, "stop");
    stop.setAttribute("offset", String(s.off));
    stop.setAttribute("stop-color", s.col);
    stop.setAttribute("stop-opacity", String(s.op));
    g.appendChild(stop);
  }
  return g;
}

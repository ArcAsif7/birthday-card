import type { CardContent } from "./config.ts";
import { fill, type Theme, type MotifKind } from "./themes.ts";

const SVGNS = "http://www.w3.org/2000/svg";

export interface SceneRefs {
  root: HTMLElement;
  canvas: HTMLCanvasElement;
  scenes: Record<SceneName, HTMLElement>;
  // lock
  lockDots: HTMLElement[];
  lockError: HTMLElement;
  keypad: HTMLElement;
  // loading
  loadBarFill: HTMLElement;
  // intro
  introBear: SVGSVGElement;
  startBtn: HTMLButtonElement;
  // counter
  countNums: { years: HTMLElement; months: HTMLElement; days: HTMLElement };
  countLive: HTMLElement;
  countNext: HTMLButtonElement;
  // memories
  memNext: HTMLButtonElement;
  // message
  letterBody: HTMLElement;
  letterSig: HTMLElement;
  msgNext: HTMLButtonElement;
  // finale
  finaleSlot: HTMLElement;
  finaleFrom: HTMLElement;
  replyBtn: HTMLAnchorElement;
  replay: HTMLButtonElement;
  musicBtn: HTMLButtonElement;
}

export type SceneName = "lock" | "loading" | "intro" | "counter" | "memories" | "message" | "finale";

export function buildScenes(root: HTMLElement, c: CardContent, theme: Theme): SceneRefs {
  const copy = theme.copy;
  const toSafe = escapeHtml(c.to);
  const t = (tpl: string) => fill(tpl, c.to);      // plain text
  const th = (tpl: string) => fill(tpl, toSafe);   // innerHTML-safe
  root.innerHTML = "";

  const canvas = document.createElement("canvas");
  canvas.className = "field-canvas";
  canvas.setAttribute("aria-hidden", "true");
  root.appendChild(canvas);

  const scene = (name: SceneName, label: string) => {
    const s = el("section", "scene");
    s.dataset.scene = name;
    s.setAttribute("aria-label", label);
    root.appendChild(s);
    return s;
  };

  /* ---------------------------------------------------------------- lock -- */
  const lock = scene("lock", "Locked gift");
  const avatar = el("div", "lock-avatar");
  avatar.innerHTML = heartLockSvg();
  const lockWord = el("div", "lock-word");
  lockWord.textContent = t(copy.lockWord);
  const hint = el("div", "lock-hint");
  hint.textContent = c.hint;
  const dots = el("div", "lock-dots");
  const lockDots: HTMLElement[] = [];
  for (let i = 0; i < 4; i++) {
    const d = el("span", "lock-dot");
    dots.appendChild(d);
    lockDots.push(d);
  }
  const lockError = el("div", "lock-error");
  lockError.textContent = "wrong passkey — try again ♡";
  lockError.setAttribute("role", "status");
  const keypad = el("div", "keypad");
  keypad.setAttribute("role", "group");
  keypad.setAttribute("aria-label", "Passkey keypad");
  const layout = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "⌫"];
  for (const k of layout) {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "key" + (k === "" ? " key--ghost" : "");
    b.textContent = k;
    b.dataset.key = k === "⌫" ? "back" : k;
    if (k === "⌫") b.setAttribute("aria-label", "Delete digit");
    if (k === "") b.tabIndex = -1;
    keypad.appendChild(b);
  }
  lock.append(avatar, lockWord, hint, dots, lockError, keypad);

  /* ------------------------------------------------------------- loading -- */
  const loading = scene("loading", "Loading");
  const loadBear = mkMotif(theme.motif);
  loadBear.classList.add("load-bear");
  const loadTitle = el("div", "sub");
  loadTitle.textContent = "Loading something special…";
  const loadTag = el("div", "eyebrow");
  loadTag.textContent = "just for you";
  const bar = el("div", "load-bar");
  const barFill = document.createElement("i");
  bar.appendChild(barFill);
  loading.append(loadBear, loadTitle, bar, loadTag);

  /* --------------------------------------------------------------- intro -- */
  const intro = scene("intro", "It's your special day");
  const introTitle = el("h1", "title");
  introTitle.innerHTML = th(copy.introTitle);
  const ring = el("div", "ring");
  const introBear = mkMotif(theme.motif);
  introBear.classList.add("bear");
  ring.appendChild(introBear);
  const introSub = el("p", "sub");
  introSub.textContent = t(copy.introSub);
  const startBtn = btn("Start");
  intro.append(introTitle, ring, introSub, startBtn);

  /* ------------------------------------------------------------- counter -- */
  const counter = scene("counter", "Your journey so far");
  const countTitle = el("h2", "title");
  countTitle.innerHTML = th(copy.counterTitle);
  const countSub = el("p", "sub");
  countSub.textContent = t(copy.counterSub);
  const row = el("div", "count-row");
  const cell = (label: string) => {
    const w = el("div", "count-cell");
    const n = el("div", "count-num");
    n.textContent = "0";
    const l = el("div", "count-label");
    l.textContent = label;
    w.append(n, l);
    row.appendChild(w);
    return n;
  };
  const years = cell("years");
  const months = cell("months");
  const days = cell("days");
  const countLive = el("div", "count-live");
  countLive.setAttribute("aria-live", "off");
  const countNext = btn("Next");
  counter.append(countTitle, countSub, row, countLive, countNext);

  /* ------------------------------------------------------------ memories -- */
  const memories = scene("memories", "Special memories");
  const memTitle = el("h2", "title");
  memTitle.textContent = t(copy.memTitle);
  const memSub = el("p", "sub");
  memSub.textContent = t(copy.memSub);
  const track = el("div", "mem-track");
  const sources = c.imgs.length ? c.imgs : [null, null, null];
  sources.forEach((src, i) => {
    const card = el("div", "mem-card");
    if (src) {
      const img = document.createElement("img");
      img.src = src;
      img.alt = `Memory ${i + 1}`;
      img.loading = "lazy";
      card.appendChild(img);
    } else {
      const ph = el("div", "ph");
      ph.innerHTML = `${heartSvg()}<span>a memory lives here</span>`;
      card.appendChild(ph);
    }
    track.appendChild(card);
  });
  const memNext = btn("Message ♡");
  memories.append(memTitle, memSub, track, memNext);

  /* ------------------------------------------------------------- message -- */
  const message = scene("message", "A message for you");
  const msgTitle = el("h2", "title");
  msgTitle.innerHTML = th(copy.msgTitle);
  const panel = el("div", "letter-panel");
  const letterBody = el("p", "letter-body");
  const letterSig = el("div", "letter-sig");
  letterSig.textContent = `— ${c.from}`;
  panel.append(letterBody, letterSig);
  const msgNext = btn("One more thing…");
  message.append(msgTitle, panel, msgNext);

  /* -------------------------------------------------------------- finale -- */
  const finale = scene("finale", c.greeting);
  const finaleTag = el("div", "eyebrow");
  finaleTag.textContent = t(copy.finaleEyebrow);
  const finaleSlot = el("div", "finale-slot");
  finaleSlot.style.width = "100%";
  finaleSlot.style.display = "grid";
  finaleSlot.style.placeItems = "center";
  const finaleFrom = el("p", "finale-from");
  finaleFrom.innerHTML = `from <b>${escapeHtml(c.from)}</b>`;
  const replyBtn = document.createElement("a");
  replyBtn.className = "btn btn--reply";
  replyBtn.textContent = "Reply with love ♡";
  replyBtn.target = "_blank";
  replyBtn.rel = "noopener";
  finale.append(finaleTag, finaleSlot, finaleFrom, replyBtn);

  const replay = document.createElement("button");
  replay.className = "replay";
  replay.type = "button";
  replay.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
    stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/></svg><span>Replay</span>`;
  root.appendChild(replay);

  const musicBtn = document.createElement("button");
  musicBtn.className = "music-btn";
  musicBtn.type = "button";
  musicBtn.setAttribute("aria-label", "Toggle music");
  musicBtn.innerHTML = musicIcon();
  root.appendChild(musicBtn);

  return {
    root,
    canvas,
    scenes: { lock, loading, intro, counter, memories, message, finale },
    lockDots,
    lockError,
    keypad,
    loadBarFill: barFill,
    introBear,
    startBtn,
    countNums: { years, months, days },
    countLive,
    countNext,
    memNext,
    letterBody,
    letterSig,
    msgNext,
    finaleSlot,
    finaleFrom,
    replyBtn,
    replay,
    musicBtn,
  };
}

/* -------------------------------------------------------------------------- */

function el(tag: string, cls: string): HTMLElement {
  const n = document.createElement(tag);
  n.className = cls;
  return n;
}

function btn(label: string): HTMLButtonElement {
  const b = document.createElement("button");
  b.type = "button";
  b.className = "btn";
  b.textContent = label;
  return b;
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (ch) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch] as string)
  );
}

/**
 * Original cute bear, drawn in code (no copyrighted characters).
 * mode "sleep": closed eyes + zzz.  bearWake() opens the eyes + smiles.
 */
/**
 * Occasion motif dispatcher. Every motif is original code-drawn SVG, coloured
 * with CSS variables so it adapts to whichever palette is active. Each root
 * group carries .motif-body so the intro "breathing" idle targets any motif.
 */
export function mkMotif(kind: MotifKind): SVGSVGElement {
  switch (kind) {
    case "hearts": return mkHearts();
    case "tulips": return mkTulips();
    case "crown": return mkCrown();
    case "crescent": return mkCrescent();
    default: return mkBear("sleep");
  }
}

function baseSvg(): SVGSVGElement {
  const svg = document.createElementNS(SVGNS, "svg");
  svg.setAttribute("viewBox", "0 0 120 120");
  svg.setAttribute("aria-hidden", "true");
  return svg;
}

/** Couples — two interlocked hearts, one solid, one outlined, plus sparkles. */
function mkHearts(): SVGSVGElement {
  const svg = baseSvg();
  svg.innerHTML = `
    <g class="motif-body">
      <path d="M48 88 C26 72 18 60 18 48 a13 13 0 0 1 23 -8 l7 7 7 -7 a13 13 0 0 1 23 8 c0 12 -8 24 -30 40 z"
            fill="var(--accent)" opacity="0.95"/>
      <path d="M76 96 C58 82 51 72 51 62 a11 11 0 0 1 19.5 -6.8 l5.5 5.5 5.5 -5.5 A11 11 0 0 1 101 62 c0 10 -7 20 -25 34 z"
            fill="none" stroke="var(--gold)" stroke-width="3"/>
      <circle cx="30" cy="26" r="2.4" fill="var(--accent-soft)"/>
      <circle cx="92" cy="34" r="1.8" fill="var(--gold)"/>
      <circle cx="102" cy="22" r="2.6" fill="var(--accent-soft)"/>
      <path d="M18 20 l2 5 5 2 -5 2 -2 5 -2 -5 -5 -2 5 -2 z" fill="var(--gold)" opacity="0.9"/>
    </g>`;
  return svg;
}

/** Mother's Day — a trio of tulips tied with a ribbon. */
function mkTulips(): SVGSVGElement {
  const svg = baseSvg();
  const tulip = (x: number, y: number, r: number, s: number) => `
    <g transform="translate(${x} ${y}) rotate(${r}) scale(${s})">
      <path d="M0 26 C -1.5 12, -1.5 6, 0 0" stroke="var(--gold)" stroke-width="2.6" fill="none" stroke-linecap="round"/>
      <path d="M-9 -14 C -9 -26, 9 -26, 9 -14 C 9 -4, 5 2, 0 4 C -5 2, -9 -4, -9 -14 z" fill="var(--accent)"/>
      <path d="M-4 -22 C -1 -16, 1 -16, 4 -22 L 4 -10 C 1 -6, -1 -6, -4 -10 z" fill="var(--accent-soft)" opacity="0.9"/>
      <path d="M0 14 C 8 12, 12 8, 14 2" stroke="var(--gold)" stroke-width="2" fill="none" stroke-linecap="round" opacity="0.8"/>
    </g>`;
  svg.innerHTML = `
    <g class="motif-body">
      ${tulip(38, 74, -14, 0.92)}
      ${tulip(60, 68, 0, 1.1)}
      ${tulip(82, 74, 14, 0.92)}
      <path d="M46 84 q14 8 28 0 q-6 12 -14 12 q-8 0 -14 -12 z" fill="var(--title)" opacity="0.85"/>
      <circle cx="60" cy="88" r="3.4" fill="var(--gold)"/>
      <circle cx="26" cy="34" r="2" fill="var(--accent-soft)"/>
      <circle cx="96" cy="28" r="2.4" fill="var(--gold)" opacity="0.85"/>
    </g>`;
  return svg;
}

/** Father's Day — a royal crown with gem points. */
function mkCrown(): SVGSVGElement {
  const svg = baseSvg();
  svg.innerHTML = `
    <g class="motif-body">
      <path d="M24 82 L18 42 L40 58 L60 30 L80 58 L102 42 L96 82 z"
            fill="var(--accent)" stroke="var(--accent-soft)" stroke-width="2" stroke-linejoin="round"/>
      <rect x="24" y="82" width="72" height="10" rx="4" fill="var(--accent)" stroke="var(--accent-soft)" stroke-width="2"/>
      <circle cx="18" cy="40" r="4.4" fill="var(--accent-soft)"/>
      <circle cx="60" cy="27" r="5" fill="var(--accent-soft)"/>
      <circle cx="102" cy="40" r="4.4" fill="var(--accent-soft)"/>
      <circle cx="46" cy="72" r="3.4" fill="var(--bg, #0b1830)" opacity="0.55"/>
      <circle cx="60" cy="74" r="4" fill="var(--bg, #0b1830)" opacity="0.55"/>
      <circle cx="74" cy="72" r="3.4" fill="var(--bg, #0b1830)" opacity="0.55"/>
      <path d="M30 16 l2.2 5.4 5.4 2.2 -5.4 2.2 -2.2 5.4 -2.2 -5.4 -5.4 -2.2 5.4 -2.2 z" fill="var(--accent-soft)" opacity="0.9"/>
    </g>`;
  return svg;
}

/** Eid — crescent moon cradling a star, with a hanging lantern. */
function mkCrescent(): SVGSVGElement {
  const svg = baseSvg();
  svg.innerHTML = `
    <g class="motif-body">
      <path d="M74 16 A42 42 0 1 0 74 104 A33 42 0 1 1 74 16 Z" fill="var(--accent)"/>
      <path d="M44 52 l4.4 8.9 9.8 1.4 -7.1 6.9 1.7 9.8 -8.8 -4.6 -8.8 4.6 1.7 -9.8 -7.1 -6.9 9.8 -1.4 z"
            fill="var(--accent-soft)"/>
      <g transform="translate(92 30)">
        <line x1="0" y1="-14" x2="0" y2="-6" stroke="var(--gold)" stroke-width="2"/>
        <path d="M-7 -6 h14 l-2 6 h-10 z" fill="var(--gold)"/>
        <path d="M-6 0 C -8 10, 8 10, 6 0 z" fill="var(--accent-soft)"/>
        <path d="M-3 10 h6 l-1.4 4 h-3.2 z" fill="var(--gold)"/>
      </g>
      <circle cx="20" cy="24" r="2" fill="var(--accent-soft)"/>
      <circle cx="30" cy="98" r="2.4" fill="var(--gold)" opacity="0.8"/>
    </g>`;
  return svg;
}

export function mkBear(mode: "sleep" | "awake"): SVGSVGElement {
  const svg = document.createElementNS(SVGNS, "svg");
  svg.setAttribute("viewBox", "0 0 120 120");
  svg.setAttribute("aria-hidden", "true");
  const sleep = mode === "sleep";
  svg.innerHTML = `
    <g class="bear-body motif-body">
      <!-- ears -->
      <circle cx="34" cy="34" r="13" fill="#f7f2f3"/>
      <circle cx="86" cy="34" r="13" fill="#f7f2f3"/>
      <circle cx="34" cy="34" r="6.5" fill="#e75a7c" opacity="0.55"/>
      <circle cx="86" cy="34" r="6.5" fill="#e75a7c" opacity="0.55"/>
      <!-- head -->
      <circle cx="60" cy="62" r="34" fill="#f7f2f3"/>
      <!-- muzzle -->
      <ellipse cx="60" cy="72" rx="14" ry="10" fill="#fff"/>
      <ellipse cx="60" cy="68" rx="4.6" ry="3.6" fill="#3a2228"/>
      <!-- blush -->
      <ellipse cx="38" cy="66" rx="6" ry="4" fill="#e75a7c" opacity="0.4"/>
      <ellipse cx="82" cy="66" rx="6" ry="4" fill="#e75a7c" opacity="0.4"/>
      <!-- eyes -->
      <g class="bear-eyes-closed" ${sleep ? "" : 'style="display:none"'}>
        <path d="M42 56 q5 5 10 0" stroke="#3a2228" stroke-width="2.4" fill="none" stroke-linecap="round"/>
        <path d="M68 56 q5 5 10 0" stroke="#3a2228" stroke-width="2.4" fill="none" stroke-linecap="round"/>
      </g>
      <g class="bear-eyes-open" ${sleep ? 'style="display:none"' : ""}>
        <circle cx="47" cy="56" r="3.6" fill="#3a2228"/>
        <circle cx="73" cy="56" r="3.6" fill="#3a2228"/>
        <circle cx="48.4" cy="54.8" r="1.2" fill="#fff"/>
        <circle cx="74.4" cy="54.8" r="1.2" fill="#fff"/>
      </g>
      <!-- smile (awake) -->
      <path class="bear-smile" d="M53 78 q7 6 14 0" stroke="#3a2228" stroke-width="2.2" fill="none"
            stroke-linecap="round" ${sleep ? 'style="display:none"' : ""}/>
      <!-- bow tie -->
      <path d="M52 96 l-9 -6 v12 z" fill="#e75a7c"/>
      <path d="M68 96 l9 -6 v12 z" fill="#e75a7c"/>
      <circle cx="60" cy="96" r="4" fill="#ffb3c1"/>
    </g>
    <g class="bear-zzz" ${sleep ? "" : 'style="display:none"'} fill="#ffb3c1" font-family="Outfit, sans-serif" font-weight="600">
      <text x="92" y="26" font-size="13">z</text>
      <text x="100" y="16" font-size="9" opacity="0.7">z</text>
      <text x="86" y="14" font-size="7" opacity="0.5">z</text>
    </g>`;
  return svg;
}

/** Flip a sleeping bear to awake (eyes open, smile, zzz gone). */
export function bearWake(svg: SVGSVGElement) {
  (svg.querySelector(".bear-eyes-closed") as SVGElement | null)?.style.setProperty("display", "none");
  (svg.querySelector(".bear-zzz") as SVGElement | null)?.style.setProperty("display", "none");
  (svg.querySelector(".bear-eyes-open") as SVGElement | null)?.style.removeProperty("display");
  (svg.querySelector(".bear-smile") as SVGElement | null)?.style.removeProperty("display");
}

export function musicIcon(): string {
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
    stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <path d="M9 18V6l10-2v12"/><circle cx="6.5" cy="18" r="2.5"/><circle cx="16.5" cy="16" r="2.5"/>
    <line class="mute-line" x1="3" y1="3" x2="21" y2="21" style="display:none"/></svg>`;
}

function heartLockSvg(): string {
  return `<svg viewBox="0 0 48 48" aria-hidden="true">
    <path d="M24 40 C10 30 6 22 6 16 a8 8 0 0 1 14 -5 l4 4 4 -4 a8 8 0 0 1 14 5 c0 6 -4 14 -18 24 z"
          fill="none" stroke="#e75a7c" stroke-width="2.4"/>
    <rect x="18" y="20" width="12" height="10" rx="2.4" fill="#e75a7c"/>
    <path d="M20 20 v-3 a4 4 0 0 1 8 0 v3" stroke="#e75a7c" stroke-width="2.2" fill="none"/>
    <circle cx="24" cy="25" r="1.6" fill="#070203"/>
  </svg>`;
}

function heartSvg(): string {
  return `<svg viewBox="0 0 48 48" aria-hidden="true">
    <path d="M24 40 C10 30 6 22 6 16 a8 8 0 0 1 14 -5 l4 4 4 -4 a8 8 0 0 1 14 5 c0 6 -4 14 -18 24 z"
          fill="none" stroke="currentColor" stroke-width="2"/>
  </svg>`;
}

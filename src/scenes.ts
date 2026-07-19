import type { CardContent } from "./config.ts";

const SVGNS = "http://www.w3.org/2000/svg";

export interface SceneRefs {
  root: HTMLElement;
  canvas: HTMLCanvasElement;
  scenes: Record<SceneName, HTMLElement>;
  // lock
  lockDots: HTMLElement[];
  keypad: HTMLElement;
  // loading
  loadBarFill: HTMLElement;
  // intro
  introBear: SVGSVGElement;
  startBtn: HTMLButtonElement;
  // counter
  countNums: { years: HTMLElement; months: HTMLElement; days: HTMLElement };
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
  replay: HTMLButtonElement;
}

export type SceneName = "lock" | "loading" | "intro" | "counter" | "memories" | "message" | "finale";

export function buildScenes(root: HTMLElement, c: CardContent): SceneRefs {
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
  lockWord.textContent = "Locked";
  const hint = el("div", "lock-hint");
  hint.textContent = c.hint;
  const dots = el("div", "lock-dots");
  const lockDots: HTMLElement[] = [];
  for (let i = 0; i < 4; i++) {
    const d = el("span", "lock-dot");
    dots.appendChild(d);
    lockDots.push(d);
  }
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
  lock.append(avatar, lockWord, hint, dots, keypad);

  /* ------------------------------------------------------------- loading -- */
  const loading = scene("loading", "Loading");
  const loadBear = mkBear("sleep");
  loadBear.classList.add("load-bear");
  const loadTitle = el("div", "sub");
  loadTitle.textContent = "Loading something special…";
  const loadTag = el("div", "eyebrow");
  loadTag.textContent = "just for you";
  const bar = el("div", "load-bar");
  const fill = document.createElement("i");
  bar.appendChild(fill);
  loading.append(loadBear, loadTitle, bar, loadTag);

  /* --------------------------------------------------------------- intro -- */
  const intro = scene("intro", "It's your special day");
  const introTitle = el("h1", "title");
  introTitle.innerHTML = `It's Your <em>Special</em> Day`;
  const ring = el("div", "ring");
  const introBear = mkBear("sleep");
  introBear.classList.add("bear");
  ring.appendChild(introBear);
  const introSub = el("p", "sub");
  introSub.textContent = "I made something special for you…";
  const startBtn = btn("Start");
  intro.append(introTitle, ring, introSub, startBtn);

  /* ------------------------------------------------------------- counter -- */
  const counter = scene("counter", "Your journey so far");
  const countTitle = el("h2", "title");
  countTitle.innerHTML = `Happy Birthday <em>${escapeHtml(c.to)}</em>`;
  const countSub = el("p", "sub");
  countSub.textContent = "You have completed";
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
  const countNext = btn("Next");
  counter.append(countTitle, countSub, row, countNext);

  /* ------------------------------------------------------------ memories -- */
  const memories = scene("memories", "Special memories");
  const memTitle = el("h2", "title");
  memTitle.textContent = "Special Memories";
  const memSub = el("p", "sub");
  memSub.textContent = "swipe for more ✦";
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
  msgTitle.innerHTML = `For <em>${escapeHtml(c.to)}</em>`;
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
  finaleTag.textContent = "with all my heart";
  const finaleSlot = el("div", "finale-slot");
  finaleSlot.style.width = "100%";
  finaleSlot.style.display = "grid";
  finaleSlot.style.placeItems = "center";
  const finaleFrom = el("p", "finale-from");
  finaleFrom.innerHTML = `from <b>${escapeHtml(c.from)}</b>`;
  finale.append(finaleTag, finaleSlot, finaleFrom);

  const replay = document.createElement("button");
  replay.className = "replay";
  replay.type = "button";
  replay.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
    stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/></svg><span>Replay</span>`;
  root.appendChild(replay);

  return {
    root,
    canvas,
    scenes: { lock, loading, intro, counter, memories, message, finale },
    lockDots,
    keypad,
    loadBarFill: fill,
    introBear,
    startBtn,
    countNums: { years, months, days },
    countNext,
    memNext,
    letterBody,
    letterSig,
    msgNext,
    finaleSlot,
    finaleFrom,
    replay,
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
export function mkBear(mode: "sleep" | "awake"): SVGSVGElement {
  const svg = document.createElementNS(SVGNS, "svg");
  svg.setAttribute("viewBox", "0 0 120 120");
  svg.setAttribute("aria-hidden", "true");
  const sleep = mode === "sleep";
  svg.innerHTML = `
    <g class="bear-body">
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

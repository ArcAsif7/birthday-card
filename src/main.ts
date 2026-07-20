import "./styles.css";
import gsap from "gsap";
import { resolveContent, ageParts } from "./config.ts";
import { buildScenes, bearWake, type SceneName } from "./scenes.ts";
import { Writing } from "./writing.ts";
import { ParticleField } from "./particles.ts";
import { resolveTheme, fill } from "./themes.ts";

/**
 * Scene flow (each step optional pieces skip cleanly):
 *
 *   lock ──▶ loading ──▶ intro ──▶ counter ──▶ memories ──▶ message ──▶ finale
 *   (only if      (2.4s)   (Start)   (only if     (swipe)     (typed)     (magic
 *    ?key/dob)                        ?dob)                                writing)
 *
 * All transitions are GSAP; the scenes are stacked fixed layers faded via a
 * CSS opacity transition on `.is-active`, with children staggered in by GSAP.
 */
async function init() {
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduced) document.documentElement.classList.add("reduced");

  // Occasion theme via ?theme=birthday|love|mom|dad|eid (+ palette variants).
  const theme = resolveTheme();
  document.documentElement.dataset.theme = theme.palette ?? theme.id;

  const content = resolveContent();
  // Occasion defaults: when no explicit greeting/message params, use the theme copy.
  const q = new URLSearchParams(window.location.search);
  if (!q.get("g") && !q.get("greeting")) content.greeting = fill(theme.copy.greeting, content.to);
  if (!q.get("msg") && !q.get("message")) content.message = fill(theme.copy.message, content.to);
  // Occasion demo photos: unless the link pins ?imgs/?pics, use the theme's set.
  if (!q.get("imgs") && q.get("pics") == null && theme.defaultPics) content.imgs = theme.defaultPics;
  document.title = fill(theme.copy.docTitle, content.to);

  const app = document.getElementById("app")!;
  const refs = buildScenes(app, content, theme);

  // scene containers get a CSS fade; children are staggered per-entry
  for (const s of Object.values(refs.scenes)) s.style.transition = "opacity 0.55s ease";

  const field = new ParticleField(refs.canvas, {
    colors: theme.colors,
    ambient: theme.ambient,
    burst: theme.burst,
    reduced,
  });
  field.start();

  // ------------------------------------------------------------------ writing
  // Ink + pen glow track the active theme's palette so the greeting reads on
  // any background (dark ink on the bright themes, gold on amethyst).
  const css = getComputedStyle(document.documentElement);
  const cssVar = (name: string, fallback: string) => css.getPropertyValue(name).trim() || fallback;
  const writing = new Writing({
    greeting: content.greeting,
    gold: cssVar("--title", "#c23a56"),       // stroke base ink
    brightGold: cssVar("--accent", "#e0567a"), // pen glow / shimmer
    scriptFont: "'Great Vibes', cursive",
    reduced,
  });
  await writing.ready();
  writing.svg.classList.add("finale-writing");
  refs.finaleSlot.appendChild(writing.svg);

  // ------------------------------------------------------------------- order
  const order: SceneName[] = ["lock", "loading", "intro", "counter", "memories", "message", "finale"];
  const enabled = (n: SceneName) =>
    n === "lock" ? content.key != null : n === "counter" ? content.dob != null : true;
  const flow = order.filter(enabled);

  let current: SceneName | null = null;
  let memTimer = 0; // auto-slide interval for the memories carousel

  function goto(name: SceneName) {
    if (memTimer && name !== "memories") {
      clearInterval(memTimer);
      memTimer = 0;
    }
    if (current) refs.scenes[current].classList.remove("is-active");
    current = name;
    const elScene = refs.scenes[name];
    elScene.classList.add("is-active");
    if (!reduced) {
      // decorative layers (balloons) are excluded from the entry stagger
      const kids = Array.from(elScene.children).filter((k) => !k.classList.contains("balloons"));
      gsap.fromTo(
        kids,
        { opacity: 0, y: 22 },
        { opacity: 1, y: 0, duration: 0.7, stagger: 0.09, ease: "power3.out", delay: 0.12, overwrite: "auto" }
      );
    }
    onEnter[name]?.();
  }

  const next = () => {
    const i = flow.indexOf(current as SceneName);
    if (i >= 0 && i < flow.length - 1) goto(flow[i + 1]);
  };

  /* ------------------------------------------------------------------ lock */
  let entered = "";
  const renderDots = () =>
    refs.lockDots.forEach((d, i) => d.classList.toggle("on", i < entered.length));

  const tryKey = () => {
    if (entered.length < 4) return;
    if (entered === content.key) {
      const r = refs.scenes.lock.querySelector(".lock-avatar")!.getBoundingClientRect();
      field.burst(r.left + r.width / 2, r.top + r.height / 2, 50);
      entered = "";
      setTimeout(() => { renderDots(); next(); }, 350);
    } else {
      // wrong → shake + visible feedback + clear
      gsap.fromTo(
        refs.lockDots[0].parentElement,
        { x: 0 },
        { x: 10, duration: 0.06, repeat: 5, yoyo: true, ease: "power1.inOut", clearProps: "x" }
      );
      gsap.fromTo(refs.lockError, { opacity: 0 }, { opacity: 1, duration: 0.3 });
      entered = "";
      setTimeout(renderDots, 320);
    }
  };

  const pressKey = (k: string) => {
    gsap.to(refs.lockError, { opacity: 0, duration: 0.2 });
    if (k === "back") entered = entered.slice(0, -1);
    else if (/^\d$/.test(k) && entered.length < 4) entered += k;
    renderDots();
    if (entered.length === 4) setTimeout(tryKey, 160);
  };

  refs.keypad.addEventListener("click", (e) => {
    const b = (e.target as HTMLElement).closest<HTMLElement>("[data-key]");
    if (b?.dataset.key) pressKey(b.dataset.key);
  });
  window.addEventListener("keydown", (e) => {
    if (current !== "lock") return;
    if (/^\d$/.test(e.key)) pressKey(e.key);
    if (e.key === "Backspace") pressKey("back");
  });

  /** Start an idle loop once per element (survives replays without stacking). */
  const idle = (el: Element | null, make: (el: Element) => void) => {
    if (reduced || !el || (el as HTMLElement).dataset.idle) return;
    (el as HTMLElement).dataset.idle = "1";
    make(el);
  };

  /* ------------------------------------------------------------ per-scene */
  const onEnter: Partial<Record<SceneName, () => void>> = {
    loading() {
      // sleeping bear gently bobs while the bar fills
      idle(refs.scenes.loading.querySelector(".load-bear"), (b) =>
        gsap.to(b, { y: -6, duration: 1.4, yoyo: true, repeat: -1, ease: "sine.inOut" })
      );
      gsap.fromTo(
        refs.loadBarFill,
        { width: "0%" },
        { width: "100%", duration: reduced ? 0.1 : 2.4, ease: "power1.inOut", onComplete: next }
      );
    },

    intro() {
      // bear breathes softly inside its slowly-spinning halo (CSS spins the ring)
      idle(refs.introBear.querySelector(".motif-body"), (b) =>
        gsap.to(b, {
          scale: 1.03, transformOrigin: "50% 62%", duration: 1.7,
          yoyo: true, repeat: -1, ease: "sine.inOut",
        })
      );
    },

    counter() {
      if (!content.dob) return;
      const parts = ageParts(content.dob);
      const spin = (elNum: HTMLElement, target: number, delay: number) => {
        const proxy = { v: 0 };
        gsap.to(proxy, {
          v: target,
          duration: reduced ? 0 : 1.6,
          delay: reduced ? 0 : delay,
          ease: "power2.out",
          onUpdate: () => (elNum.textContent = String(Math.round(proxy.v))),
          onComplete: () => {
            if (reduced) return;
            // landing pop + a small heart-spark puff under each number
            gsap.fromTo(elNum, { scale: 1.22 }, { scale: 1, duration: 0.45, ease: "back.out(2.5)" });
            const r = elNum.getBoundingClientRect();
            field.burst(r.left + r.width / 2, r.top + r.height / 2, 12);
          },
        });
      };
      spin(refs.countNums.years, parts.years, 0.3);
      spin(refs.countNums.months, parts.months, 0.5);
      spin(refs.countNums.days, parts.days, 0.7);
    },

    memories() {
      // Auto-sliding carousel: glides to the next photo every ~2.6s, loops back,
      // and hands control to the user the moment they touch it.
      if (reduced) return;
      const track = refs.scenes.memories.querySelector<HTMLElement>(".mem-track");
      if (!track) return;
      if (memTimer) clearInterval(memTimer);
      const cards = Array.from(track.querySelectorAll<HTMLElement>(".mem-card"));
      if (cards.length < 2) return;
      track.style.scrollSnapType = "none"; // snap fights programmatic glides
      let idx = 0;
      memTimer = window.setInterval(() => {
        idx = (idx + 1) % cards.length;
        const card = cards[idx];
        const target = card.offsetLeft - (track.clientWidth - card.clientWidth) / 2;
        gsap.to(track, { scrollLeft: Math.max(0, target), duration: 0.85, ease: "power2.inOut" });
      }, 2600);
      track.addEventListener(
        "pointerdown",
        () => {
          if (memTimer) clearInterval(memTimer);
          memTimer = 0;
          gsap.killTweensOf(track);
          track.style.scrollSnapType = ""; // restore finger-snap for manual swiping
        },
        { once: true }
      );
    },

    message() {
      const msg = content.message;
      refs.letterBody.textContent = "";
      const caret = document.createElement("span");
      caret.className = "caret";
      refs.letterBody.appendChild(caret);
      gsap.set(refs.letterSig, { opacity: 0 });

      if (reduced) {
        refs.letterBody.textContent = msg;
        gsap.set(refs.letterSig, { opacity: 1 });
        return;
      }
      const proxy = { i: 0 };
      gsap.to(proxy, {
        i: msg.length,
        duration: Math.min(7, Math.max(2.5, msg.length * 0.045)),
        delay: 0.6,
        ease: "none",
        onUpdate: () => {
          refs.letterBody.textContent = msg.slice(0, Math.round(proxy.i));
          refs.letterBody.appendChild(caret);
        },
        onComplete: () => {
          caret.remove();
          gsap.to(refs.letterSig, { opacity: 1, y: 0, duration: 0.7 });
        },
      });
    },

    finale() {
      writing.setWrite(0);
      gsap.set(refs.finaleFrom, { opacity: 0, y: 12 });
      gsap.set(refs.replay, { opacity: 0 });
      refs.replay.classList.remove("is-on");

      // rising balloons layer (created once, loops forever behind the text)
      if (!reduced && !refs.scenes.finale.querySelector(".balloons")) {
        const layer = document.createElement("div");
        layer.className = "balloons";
        layer.setAttribute("aria-hidden", "true");
        refs.scenes.finale.prepend(layer);
        for (let i = 0; i < 6; i++) {
          const b = document.createElement("i");
          b.className = "balloon";
          b.style.left = `${6 + i * 16 + Math.random() * 5}%`;
          b.style.opacity = String(0.35 + Math.random() * 0.3);
          const s = 0.7 + Math.random() * 0.55;
          b.style.transform = `scale(${s})`;
          layer.appendChild(b);
          gsap.fromTo(
            b,
            { y: "105vh" },
            { y: "-35vh", duration: 10 + Math.random() * 6, delay: i * 1.1, repeat: -1, ease: "none" }
          );
          gsap.to(b, { x: 26, duration: 2 + Math.random() * 1.5, yoyo: true, repeat: -1, ease: "sine.inOut" });
        }
      }

      const slotRect = () => refs.finaleSlot.getBoundingClientRect();

      if (reduced) {
        writing.showInstant();
        gsap.set(refs.finaleFrom, { opacity: 1, y: 0 });
        gsap.set(refs.replay, { opacity: 1 });
        refs.replay.classList.add("is-on");
        return;
      }

      const r = slotRect();
      field.burst(r.left + r.width / 2, r.top + r.height / 2, 40);

      const writeProxy = { p: 0 };
      const shineProxy = { s: 0 };
      const tl = gsap.timeline();
      tl.to(writeProxy, {
        p: 1, duration: 2.4, delay: 0.5, ease: "power1.inOut",
        onUpdate: () => writing.setWrite(writeProxy.p),
      });
      tl.to(shineProxy, {
        s: 1, duration: 0.9, ease: "power2.inOut",
        onUpdate: () => writing.setShimmer(shineProxy.s),
        onComplete: () => writing.setShimmer(0),
      }, "-=0.2");
      tl.add(() => {
        const r2 = slotRect();
        field.burst(r2.left + r2.width / 2, r2.top + r2.height * 0.4, 54);
      }, "-=0.5");
      tl.to(refs.finaleFrom, { opacity: 1, y: 0, duration: 0.8 }, "-=0.3");
      tl.to(refs.replay, {
        opacity: 1, duration: 0.6,
        onComplete: () => refs.replay.classList.add("is-on"),
      }, "-=0.2");
    },
  };

  /* ------------------------------------------------------------- controls */
  refs.startBtn.addEventListener("click", () => {
    bearWake(refs.introBear);
    gsap.fromTo(refs.introBear, { scale: 0.92 }, { scale: 1, duration: 0.4, ease: "back.out(3)" });
    setTimeout(next, reduced ? 0 : 450);
  });
  refs.countNext.addEventListener("click", next);
  refs.memNext.addEventListener("click", next);
  refs.msgNext.addEventListener("click", next);
  refs.replay.addEventListener("click", () => goto("intro"));

  /* --------------------------------------------------------------- launch */
  goto(flow[0]);

  if (import.meta.env.DEV) {
    (window as any).__card = { refs, content, goto, next, writing, field, flow, gsap };
  }
}

init();

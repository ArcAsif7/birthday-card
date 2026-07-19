import "./styles.css";
import gsap from "gsap";
import { resolveContent, ageParts } from "./config.ts";
import { buildScenes, bearWake, type SceneName } from "./scenes.ts";
import { Writing } from "./writing.ts";
import { ParticleField } from "./particles.ts";

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

  const content = resolveContent();
  document.title = `A gift for ${content.to} ♡`;

  const app = document.getElementById("app")!;
  const refs = buildScenes(app, content);

  // scene containers get a CSS fade; children are staggered per-entry
  for (const s of Object.values(refs.scenes)) s.style.transition = "opacity 0.55s ease";

  const field = new ParticleField(refs.canvas, {
    rose: "#e75a7c",
    roseLight: "#ffb3c1",
    gold: "#e9c982",
    reduced,
  });
  field.start();

  // ------------------------------------------------------------------ writing
  const writing = new Writing({
    greeting: content.greeting,
    gold: "#ffb3c1",        // stroke base ink
    brightGold: "#ffe0e6",  // pen glow / shimmer
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

  function goto(name: SceneName) {
    if (current) refs.scenes[current].classList.remove("is-active");
    current = name;
    const elScene = refs.scenes[name];
    elScene.classList.add("is-active");
    if (!reduced) {
      gsap.fromTo(
        Array.from(elScene.children),
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
      // wrong → shake + clear
      gsap.fromTo(
        refs.lockDots[0].parentElement,
        { x: 0 },
        { x: 10, duration: 0.06, repeat: 5, yoyo: true, ease: "power1.inOut", clearProps: "x" }
      );
      entered = "";
      setTimeout(renderDots, 320);
    }
  };

  const pressKey = (k: string) => {
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

  /* ------------------------------------------------------------ per-scene */
  const onEnter: Partial<Record<SceneName, () => void>> = {
    loading() {
      gsap.fromTo(
        refs.loadBarFill,
        { width: "0%" },
        { width: "100%", duration: reduced ? 0.1 : 2.4, ease: "power1.inOut", onComplete: next }
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
        });
      };
      spin(refs.countNums.years, parts.years, 0.3);
      spin(refs.countNums.months, parts.months, 0.45);
      spin(refs.countNums.days, parts.days, 0.6);
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

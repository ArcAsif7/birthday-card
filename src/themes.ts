/**
 * Theme registry — two layers in one:
 *
 *   PALETTE  (CSS)  [data-theme="…"] blocks in styles.css swap every colour token.
 *   OCCASION (JS)   copy + motif + particle behaviour for the occasion.
 *
 * A theme picks a palette via `palette` (defaults to its own id) so occasion
 * themes can reuse palette blocks and palette-only themes can share occasion
 * copy. Pick with ?theme=<id>. Default: "birthday" (cream palette).
 *
 *   Occasions:  birthday · love · mom · dad · eid
 *   Palette-only variants (birthday copy): cream · sunset · sky · aqua · amethyst
 */

export type AmbientStyle = "confetti" | "petal" | "balloon" | "bubble" | "sparkle";
export type BurstShape = "confetti" | "heart" | "star";
export type MotifKind = "bear" | "hearts" | "tulips" | "crown" | "crescent";

/** All strings may contain {to}; it is replaced with the escaped recipient name. */
export interface OccasionCopy {
  docTitle: string;
  lockWord: string;
  introTitle: string; // innerHTML — may contain <em>
  introSub: string;
  counterTitle: string; // innerHTML — may contain <em>
  counterSub: string;
  memTitle: string;
  memSub: string;
  msgTitle: string; // innerHTML — may contain <em>
  finaleEyebrow: string;
  greeting: string; // default written greeting when ?g absent
  message: string; // default letter when ?msg absent
}

export interface Theme {
  id: string;
  label: string;
  /** CSS palette block to activate; defaults to `id`. */
  palette?: string;
  ambient: AmbientStyle;
  burst: BurstShape;
  /** Canvas particle colours (bright, matching the CSS palette). */
  colors: string[];
  motif: MotifKind;
  copy: OccasionCopy;
}

/* ------------------------------------------------------------------ copy -- */

const BIRTHDAY: OccasionCopy = {
  docTitle: "A gift for {to} ♡",
  lockWord: "Locked",
  introTitle: "It's Your <em>Special</em> Day",
  introSub: "I made something special for you…",
  counterTitle: "Happy Birthday <em>{to}</em>",
  counterSub: "You have completed",
  memTitle: "Special Memories",
  memSub: "swipe for more ✦",
  msgTitle: "For <em>{to}</em>",
  finaleEyebrow: "with all my heart",
  greeting: "Happy Birthday {to}",
  message:
    "On your special day, I just want you to know how much light you bring into my life. Stay you, always.",
};

const LOVE: OccasionCopy = {
  docTitle: "For {to}, with love ♡",
  lockWord: "For Us",
  introTitle: "You & Me, <em>Always</em>",
  introSub: "I made a little something for us…",
  counterTitle: "Us, <em>{to}</em> — every day counted",
  counterSub: "We have been us for",
  memTitle: "Our Story",
  memSub: "swipe through us ✦",
  msgTitle: "To <em>{to}</em>",
  finaleEyebrow: "with all my love",
  greeting: "I Love You {to}",
  message:
    "Of all the places in the world, my favourite is anywhere next to you. Thank you for being mine.",
};

const MOM: OccasionCopy = {
  docTitle: "For Mama ♡",
  lockWord: "For Mama",
  introTitle: "For the Queen of <em>Our Hearts</em>",
  introSub: "A little something for the best mom in the world…",
  counterTitle: "Dearest <em>{to}</em>",
  counterSub: "You've been our whole world for",
  memTitle: "Moments With You",
  memSub: "swipe for more ✦",
  msgTitle: "For <em>{to}</em>",
  finaleEyebrow: "for everything you do",
  greeting: "Happy Mother's Day",
  message:
    "For every sacrifice we saw, and the thousand we didn't — thank you, Mama. Everything good in us began with you.",
};

const DAD: OccasionCopy = {
  docTitle: "For Baba ♡",
  lockWord: "For Baba",
  introTitle: "For My First <em>Hero</em>",
  introSub: "A small salute to the greatest man I know…",
  counterTitle: "Dear <em>{to}</em>",
  counterSub: "You've had our backs for",
  memTitle: "Lessons & Laughter",
  memSub: "swipe for more ✦",
  msgTitle: "For <em>{to}</em>",
  finaleEyebrow: "with respect & love",
  greeting: "Happy Father's Day",
  message:
    "You taught us how to stand, and stood behind us every time we tried. Everything we are is built on you.",
};

const EID: OccasionCopy = {
  docTitle: "Eid Mubarak, {to} ♡",
  lockWord: "Eid Gift",
  introTitle: "Eid <em>Mubarak</em>",
  introSub: "A little Eidi, made just for you…",
  counterTitle: "Dear <em>{to}</em>",
  counterSub: "Blessed to know you for",
  memTitle: "Sweet Memories",
  memSub: "swipe for more ✦",
  msgTitle: "For <em>{to}</em>",
  finaleEyebrow: "khair mubarak",
  greeting: "Eid Mubarak {to}",
  message:
    "May this Eid bring your home peace, your heart joy, and your life barakah — today and always.",
};

/* ---------------------------------------------------------------- themes -- */

export const THEMES: Record<string, Theme> = {
  /* ---- the five occasion cards ---- */
  birthday: {
    id: "birthday", label: "Birthday — Confetti Cream", palette: "cream",
    ambient: "confetti", burst: "confetti",
    colors: ["#e0567a", "#cf9f3f", "#4bb3a6", "#f0894a", "#7b6cd9"],
    motif: "bear", copy: BIRTHDAY,
  },
  love: {
    id: "love", label: "Couples — Velvet Rouge",
    ambient: "petal", burst: "heart",
    colors: ["#ff5f8f", "#ffc2d4", "#e9c982", "#ff8fb3"],
    motif: "hearts", copy: LOVE,
  },
  mom: {
    id: "mom", label: "Mother's Day — Rose Gold",
    ambient: "petal", burst: "heart",
    colors: ["#d96e8f", "#f0b6c5", "#c99a4e", "#ffffff"],
    motif: "tulips", copy: MOM,
  },
  dad: {
    id: "dad", label: "Father's Day — Midnight Royale",
    ambient: "sparkle", burst: "star",
    colors: ["#e3c47a", "#f0dca6", "#9ad0ff", "#ffffff"],
    motif: "crown", copy: DAD,
  },
  eid: {
    id: "eid", label: "Eid — Emerald & Gold",
    ambient: "sparkle", burst: "star",
    colors: ["#e8cd82", "#f3dfa5", "#7fd8b8", "#ffffff"],
    motif: "crescent", copy: EID,
  },

  /* ---- palette-only birthday variants (kept for per-client colour choice) ---- */
  cream: {
    id: "cream", label: "Confetti Cream",
    ambient: "confetti", burst: "confetti",
    colors: ["#e0567a", "#cf9f3f", "#4bb3a6", "#f0894a", "#7b6cd9"],
    motif: "bear", copy: BIRTHDAY,
  },
  sunset: {
    id: "sunset", label: "Sunset Coral",
    ambient: "petal", burst: "heart",
    colors: ["#ef5d7a", "#ffb38a", "#f6c250", "#ffd0b0"],
    motif: "bear", copy: BIRTHDAY,
  },
  sky: {
    id: "sky", label: "Sky Balloons",
    ambient: "balloon", burst: "confetti",
    colors: ["#ff9ec2", "#ffd18a", "#9ad0ff", "#a7e6b8", "#c9b0ff"],
    motif: "bear", copy: BIRTHDAY,
  },
  aqua: {
    id: "aqua", label: "Aqua Mint",
    ambient: "bubble", burst: "star",
    colors: ["#14b39a", "#7fe0cf", "#ffffff", "#d8b24a"],
    motif: "bear", copy: BIRTHDAY,
  },
  amethyst: {
    id: "amethyst", label: "Royal Amethyst",
    ambient: "sparkle", burst: "star",
    colors: ["#ffd76a", "#e0c9ff", "#ffffff", "#b98cff"],
    motif: "bear", copy: BIRTHDAY,
  },
};

export const THEME_ORDER = ["birthday", "love", "mom", "dad", "eid"] as const;

export function resolveTheme(search: string = window.location.search): Theme {
  const id = new URLSearchParams(search).get("theme")?.trim().toLowerCase() ?? "";
  return THEMES[id] ?? THEMES.birthday;
}

/** Substitute {to} into a copy string. Caller escapes `to` when using innerHTML. */
export function fill(template: string, to: string): string {
  return template.split("{to}").join(to);
}

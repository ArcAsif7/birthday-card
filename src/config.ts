/**
 * The single source of card content. One build serves every customer:
 *   - URL params take priority  → generate a unique link per recipient, no code edits.
 *   - CONFIG below is the fallback when a param is absent.
 *
 * Example link:
 *   ?to=Ayesha&from=Ali&dob=2006-03-14&key=1403&msg=You%20mean%20the%20world&g=Happy%20Birthday%20Ayesha
 *
 * Params:
 *   to    recipient name
 *   from  sender name
 *   g     the final written greeting  (default: "Happy Birthday <to>")
 *   msg   the letter message (typed out)
 *   dob   birth date YYYY-MM-DD → drives the age counter (omit → counter skipped)
 *   key   4-digit passkey (omit → derived from dob as DDMM; no dob either → lock skipped)
 *   hint  passkey hint line shown under LOCKED
 *   imgs  comma-separated image URLs for the memories carousel (omit → placeholders)
 */
export const CONFIG = {
  to: "",
  from: "",
  greeting: "",
  message: "",
  dob: "",   // "YYYY-MM-DD"
  key: "",   // "1403"
  hint: "",
  imgs: "",  // "https://…,https://…"
} as const;

export interface CardContent {
  to: string;
  from: string;
  greeting: string;
  message: string;
  dob: Date | null;
  key: string | null; // null → skip the lock scene
  hint: string;
  imgs: string[];
}

function param(params: URLSearchParams, key: string): string | undefined {
  const raw = params.get(key);
  if (raw == null) return undefined;
  const trimmed = raw.trim();
  return trimmed.length ? trimmed : undefined;
}

function parseDob(s: string | undefined): Date | null {
  if (!s) return null;
  const m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (!m) return null;
  const d = new Date(+m[1], +m[2] - 1, +m[3]);
  return isNaN(d.getTime()) ? null : d;
}

/** Resolve final content: URL param → CONFIG → sensible default. Pure & testable. */
export function resolveContent(search: string = window.location.search): CardContent {
  const p = new URLSearchParams(search);
  const pick = (k: string, cfg: string, fb: string) => param(p, k) ?? (cfg.length ? cfg : fb);

  const to = pick("to", CONFIG.to, "My Dear");
  const dob = parseDob(param(p, "dob") ?? (CONFIG.dob || undefined));

  // Passkey: explicit ?key= wins; else derive DDMM from dob; else no lock scene.
  let key: string | null = param(p, "key") ?? (CONFIG.key || "");
  if (!key && dob) {
    key = String(dob.getDate()).padStart(2, "0") + String(dob.getMonth() + 1).padStart(2, "0");
  }
  if (!key || !/^\d{4}$/.test(key)) key = null;

  // Photos: ?imgs=url1,url2 (absolute or site-relative), or ?pics=N which loads
  // the repo-hosted pics/1.webp … pics/N.webp (drop files in public/pics/).
  const imgsRaw = param(p, "imgs") ?? (CONFIG.imgs || "");
  let imgs = imgsRaw
    ? imgsRaw.split(",").map((s) => s.trim()).filter((s) => /^(https?:\/\/|[\w./-]+\.(webp|jpe?g|png|gif))/i.test(s)).slice(0, 8)
    : [];
  // Default: the 5 repo-hosted photos (public/pics/1-5.webp). ?pics=N overrides
  // the count; ?pics=0 forces the placeholder hearts; ?imgs=… always wins.
  const picsParam = parseInt(param(p, "pics") ?? "", 10);
  const picsN = isNaN(picsParam) ? 5 : picsParam;
  if (!imgs.length && picsN >= 1) {
    imgs = Array.from({ length: Math.min(picsN, 8) }, (_, i) => `pics/${i + 1}.webp`);
  }

  return {
    to,
    from: pick("from", CONFIG.from, "Someone who loves you"),
    greeting: param(p, "g") ?? param(p, "greeting") ?? (CONFIG.greeting || `Happy Birthday ${to}`),
    message:
      param(p, "msg") ?? param(p, "message") ??
      (CONFIG.message ||
        "On your special day, I just want you to know how much light you bring into my life. Stay you, always."),
    dob,
    key,
    hint: pick("hint", CONFIG.hint, dob ? "Hint · your birth date (DDMM)" : "Hint · ask the sender"),
    imgs,
  };
}

/** Completed years / months / days since dob. */
export function ageParts(dob: Date, now = new Date()): { years: number; months: number; days: number } {
  let years = now.getFullYear() - dob.getFullYear();
  let months = now.getMonth() - dob.getMonth();
  let days = now.getDate() - dob.getDate();
  if (days < 0) {
    months--;
    days += new Date(now.getFullYear(), now.getMonth(), 0).getDate();
  }
  if (months < 0) {
    years--;
    months += 12;
  }
  return { years: Math.max(0, years), months: Math.max(0, months), days: Math.max(0, days) };
}

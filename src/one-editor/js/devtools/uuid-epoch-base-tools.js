// Developer number helpers: UUID v4, epoch ⇄ date (seconds / milliseconds, UTC / local), hex · dec · bin, and the hover description of a number or timestamp. Pure.
const DevNum = (() => {
  const MS_MIN = 946684800000, MS_MAX = 4102444800000;
  const pad = (n, w = 2) => String(n).padStart(w, "0");
  const lang = () => typeof I18n !== "undefined" && I18n.lang || "en";

  function uuid() {
    if (globalThis.crypto?.randomUUID) return crypto.randomUUID();
    const b = crypto.getRandomValues(new Uint8Array(16));
    b[6] = (b[6] & 0x0f) | 0x40;
    b[8] = (b[8] & 0x3f) | 0x80;
    const h = [...b].map(x => x.toString(16).padStart(2, "0")).join("");
    return [h.slice(0, 8), h.slice(8, 12), h.slice(12, 16), h.slice(16, 20), h.slice(20)].join("-");
  }

  // 10 digits (+ fraction) = seconds, 13 digits = milliseconds; a hover only trusts years 2000–2099, an explicit selection (any) takes 9–10 digit seconds of any year.
  function epochMs(s, any = false) {
    if (!(any ? /^\d{9,10}(?:\.\d{1,6})?$|^\d{13}$/ : /^\d{10}(?:\.\d{1,6})?$|^\d{13}$/).test(s)) return null;
    const ms = /^\d{13}$/.test(s) ? +s : Math.round(+s * 1000);
    return any || (ms >= MS_MIN && ms < MS_MAX) ? ms : null;
  }

  const okMs = ms => Number.isFinite(ms) && Math.abs(ms) <= 8.64e15;
  const iso = ms => new Date(ms).toISOString().replace(".000Z", "Z");
  function localIso(ms) {
    const d = new Date(ms), o = -d.getTimezoneOffset(), a = Math.abs(o);
    const frac = d.getMilliseconds() ? "." + pad(d.getMilliseconds(), 3) : "";
    return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()) + "T" + pad(d.getHours()) + ":" + pad(d.getMinutes()) + ":" + pad(d.getSeconds()) + frac
      + (o < 0 ? "-" : "+") + pad(Math.floor(a / 60)) + ":" + pad(a % 60);
  }
  function ago(ms, now = Date.now()) {
    const s = (ms - now) / 1000, a = Math.abs(s);
    const [n, unit] = a < 60 ? [s, "second"] : a < 3600 ? [s / 60, "minute"] : a < 86400 ? [s / 3600, "hour"] : a < 2592000 ? [s / 86400, "day"] : a < 31536000 ? [s / 2592000, "month"] : [s / 31536000, "year"];
    return new Intl.RelativeTimeFormat(lang(), { numeric: "auto" }).format(Math.round(n), unit);
  }

  // "2026-11-20 09:30[:15[.250]][Z|+07:00]" → ms; no zone ⇒ UTC when utc, else this machine's time zone.
  function parseDate(s, utc = true) {
    const m = /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2})(?::(\d{2})(?:\.(\d{1,9}))?)?)?\s*(Z|[+-]\d{2}:?\d{2})?$/i.exec(String(s).trim());
    const z = m && m[8] && /([+-])(\d{2}):?(\d{2})/.exec(m[8]);
    if (!m || +m[1] < 1000 || +(m[4] || 0) > 23 || +(m[5] || 0) > 59 || +(m[6] || 0) > 59 || (z && (+z[2] > 14 || +z[3] > 59))) return null;
    const parts = [+m[1], +m[2] - 1, +m[3], +(m[4] || 0), +(m[5] || 0), +(m[6] || 0), +((m[7] || "0") + "00").slice(0, 3)];
    const day = new Date(Date.UTC(...parts));
    if (day.getUTCMonth() !== parts[1] || day.getUTCDate() !== parts[2]) return null;
    let ms = m[8] || utc ? day.getTime() : new Date(...parts).getTime();
    if (z) ms -= (z[1] === "-" ? -1 : 1) * (+z[2] * 60 + +z[3]) * 60000;
    return okMs(ms) ? ms : null;
  }

  // Epoch → ISO date (UTC "Z" or local offset); ISO date → epoch (seconds, or ms when it has milliseconds).
  function toggleEpoch(text, utc = true) {
    const t = text.trim(), ms = epochMs(t, true);
    if (ms != null) return text.replace(t, utc ? iso(ms) : localIso(ms));
    const back = parseDate(t, utc);
    if (back == null) throw new Error(T("Không phải epoch (10 / 13 chữ số, năm 2000–2099) hay ngày giờ ISO: “{s}”.", { s: t.slice(0, 40) }));
    return text.replace(t, String(back % 1000 ? back : back / 1000));
  }

  // Integers only: not inside identifiers, decimals or versions (v1.2.3, 1.5).
  const INT = /(?<![\w.])(?:0x[\da-f]+|0b[01]+|\d+)(?!\w|\.\d)/gi;
  const big = tok => BigInt(tok.toLowerCase());
  const fmt = (n, base) => { const neg = n < 0n, a = neg ? -n : n, s = base === "hex" ? "0x" + a.toString(16).toUpperCase() : base === "bin" ? "0b" + a.toString(2) : a.toString(); return (neg ? "-" : "") + s; };
  // Every integer (decimal, 0x…, 0b…) in the text → the target base.
  function convertBase(text, base) {
    let n = 0;
    const out = text.replace(INT, tok => { n++; return fmt(big(tok), base); });
    if (!n) throw new Error(T("Không có số nguyên nào để đổi."));
    return out;
  }

  // Hover lines for a token → { title, rows: [[label, value]] } or null when nothing is worth converting.
  function describe(tok, now = Date.now()) {
    const ms = epochMs(tok) ?? (/^\d{4}-\d{2}-\d{2}/.test(tok) ? parseDate(tok, true) : null);
    if (ms != null) {
      const rows = [["UTC", iso(ms)], [T("Giờ máy"), localIso(ms)], [T("Tương đối"), ago(ms, now)]];
      if (!epochMs(tok)) rows.unshift([T("Epoch giây"), String(Math.floor(ms / 1000))], [T("Epoch mili giây"), String(ms)]);
      return { title: epochMs(tok) ? (tok.length === 13 ? T("Epoch mili giây") : T("Epoch giây")) : T("Ngày giờ (không ghi múi giờ = UTC)"), rows };
    }
    if (!/^(?:0x[\da-f]+|0b[01]+|\d{2,})$/i.test(tok)) return null;
    const n = big(tok), own = /^0x/i.test(tok) ? "hex" : /^0b/i.test(tok) ? "bin" : "dec";
    const rows = ["dec", "hex", "bin"].filter(b => b !== own && (b !== "bin" || n < 2n ** 64n)).map(b => [b, fmt(n, b)]);
    return own === "dec" && n < 10n ? null : { title: T("Số"), rows };
  }

  return { uuid, epochMs, iso, localIso, ago, parseDate, toggleEpoch, convertBase, describe };
})();

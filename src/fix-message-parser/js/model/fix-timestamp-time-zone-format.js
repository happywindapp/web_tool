// FIX UTCTimestamp "YYYYMMDD-HH:MM:SS(.fff)" shown in UTC, Vietnam time (UTC+7) or the browser's zone; fraction digits kept as sent.
const FixTime = (() => {
  const RE = /^(\d{4})(\d{2})(\d{2})-(\d{2}):(\d{2}):(\d{2})(\.\d+)?$/;
  const pad = n => String(n).padStart(2, "0");
  const ZONE = { utc: "UTC", vn: "UTC+7" };

  // → { date: "YYYY-MM-DD", time: "HH:MM:SS.fff", zone } or null when the value is not a timestamp.
  function convert(value, tz) {
    const m = RE.exec(value || "");
    if (!m) return null;
    const [, y, mo, d, h, mi, s, frac = ""] = m;
    let t = new Date(Date.UTC(+y, +mo - 1, +d, +h, +mi, +s));
    if (isNaN(t)) return null;
    if (tz === "vn") t = new Date(t.getTime() + 7 * 3600e3);
    const local = tz === "local";
    const part = k => local ? t[`get${k}`]() : t[`getUTC${k}`]();
    const off = -t.getTimezoneOffset();
    const zone = ZONE[tz] || `UTC${off >= 0 ? "+" : "-"}${pad(Math.floor(Math.abs(off) / 60))}${Math.abs(off) % 60 ? ":" + pad(Math.abs(off) % 60) : ""}`;
    return {
      date: `${part("FullYear")}-${pad(part("Month") + 1)}-${pad(part("Date"))}`,
      time: `${pad(part("Hours"))}:${pad(part("Minutes"))}:${pad(part("Seconds"))}${frac}`,
      zone,
    };
  }

  const short = (value, tz) => { const c = convert(value, tz); return c ? c.time : value; };
  const full = (value, tz) => { const c = convert(value, tz); return c ? `${c.date} ${c.time} (${c.zone})` : ""; };

  return { convert, short, full };
})();

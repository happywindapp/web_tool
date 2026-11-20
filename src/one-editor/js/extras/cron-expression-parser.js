// Cron, pure: Unix 5 fields (+ command) / @macros, Quartz 6–7 fields (seconds first, ? L W #, 1 = Sunday); next run times in local time.
const Cron = (() => {
  const MONTHS = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"], DAYS = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
  const MACROS = { "@yearly": "0 0 1 1 *", "@annually": "0 0 1 1 *", "@monthly": "0 0 1 * *", "@weekly": "0 0 * * 0", "@daily": "0 0 * * *", "@midnight": "0 0 * * *", "@hourly": "0 * * * *" };
  const FIELD_NAMES = { sec: "Giây", min: "Phút", hour: "Giờ", dom: "Ngày trong tháng", mon: "Tháng", dow: "Thứ trong tuần", year: "Năm" };
  const RANGE = { sec: [0, 59], min: [0, 59], hour: [0, 23], dom: [1, 31], mon: [1, 12], year: [1970, 2099] };
  const bad = (field, raw, why) => new Error(T("Trường {field} “{raw}” không hợp lệ: {why}", { field: T(FIELD_NAMES[field]), raw, why }));

  // One item "a", "a-b", "*", "?", with an optional "/step" → the values it allows.
  function values(field, item, lo, hi, name) {
    const m = /^(\*|\?|[A-Z0-9]+)(?:-([A-Z0-9]+))?(?:\/(\d+))?$/i.exec(item);
    if (!m) throw bad(field, item, T("cú pháp lạ"));
    const num = s => { const v = name(s.toUpperCase()); if (!Number.isInteger(v) || v < lo || v > hi) throw bad(field, item, T("ngoài khoảng {lo}–{hi}", { lo, hi })); return v; };
    const all = m[1] === "*" || m[1] === "?", step = m[3] === undefined ? 1 : +m[3];
    if (!step) throw bad(field, item, T("bước phải ≥ 1"));
    const a = all ? lo : num(m[1]), b = m[2] !== undefined ? num(m[2]) : all || m[3] !== undefined ? hi : a;
    const out = [];
    if (a <= b) for (let v = a; v <= b; v += step) out.push(v);
    else for (let k = 0, v = a; v <= b + hi - lo + 1; v += step, k++) out.push(v > hi ? v - (hi - lo + 1) : v);
    return out;
  }

  const plain = s => /^\d+$/.test(s) ? +s : NaN;
  function numeric(field, raw, name = plain) {
    const [lo, hi] = RANGE[field];
    return { raw, any: raw === "*" || raw === "?", set: new Set(raw.split(",").flatMap(it => values(field, it, lo, hi, name))) };
  }

  function dom(raw, quartz) {
    const f = { raw, any: raw === "*" || raw === "?", set: new Set(), last: -1, near: [], lastWeekday: false, star: raw.startsWith("*") };
    for (const it of raw.split(",")) {
      let m;
      if (quartz && (m = /^L(?:-(\d+))?$/i.exec(it))) f.last = +(m[1] || 0);
      else if (quartz && /^LW$/i.test(it)) f.lastWeekday = true;
      else if (quartz && (m = /^(\d+)W$/i.exec(it)) && +m[1] >= 1 && +m[1] <= 31) f.near.push(+m[1]);
      else values("dom", it, 1, 31, plain).forEach(v => f.set.add(v));
    }
    return f;
  }

  // Day of week kept as 0 = Sunday … 6 = Saturday; Unix accepts 7 for Sunday, Quartz counts 1 = Sunday … 7 = Saturday.
  function dow(raw, quartz) {
    const f = { raw, any: raw === "*" || raw === "?", set: new Set(), lastOf: new Set(), nth: [], star: raw.startsWith("*") };
    const name = s => { const k = DAYS.indexOf(s); if (k >= 0) return quartz ? k + 1 : k; return plain(s); };
    const norm = v => quartz ? v - 1 : v % 7;
    const [lo, hi] = quartz ? [1, 7] : [0, 7];
    if (quartz && /(?:^|[,-])0(?:$|[,-/#L])/i.test(raw)) throw bad("dow", raw, T("Quartz đếm 1 = Chủ nhật … 7 = Thứ bảy (0 chỉ có ở Unix / Spring)"));
    for (const it of raw.split(",")) {
      let m;
      if (quartz && (m = /^([A-Z0-9]+)L$/i.exec(it))) f.lastOf.add(norm(values("dow", m[1], lo, hi, name)[0]));
      else if (quartz && (m = /^([A-Z0-9]+)#([1-5])$/i.exec(it))) f.nth.push({ d: norm(values("dow", m[1], lo, hi, name)[0]), k: +m[2] });
      else if (quartz && /^L$/i.test(it)) f.set.add(6);
      else values("dow", it, lo, hi, name).forEach(v => f.set.add(norm(v)));
    }
    return f;
  }

  // → { kind: "unix" | "quartz", f: { sec?, min, hour, dom, mon, dow, year? }, expr, command } or { kind: "reboot" }.
  function parse(line) {
    let expr = line.trim();
    const lower = expr.split(/\s+/)[0].toLowerCase();
    if (lower === "@reboot") return { kind: "reboot", expr, command: expr.slice(7).trim() };
    if (lower.startsWith("@")) {
      if (!MACROS[lower]) throw new Error(T("Không biết macro “{m}” (có: {list}).", { m: lower, list: Object.keys(MACROS).concat("@reboot").join(" ") }));
      return { ...parse(MACROS[lower] + " " + expr.slice(lower.length)), macro: lower };
    }
    const tok = expr.split(/\s+/);
    if (tok.length < 5) throw new Error(T("Cron cần 5 trường (Unix) hoặc 6–7 trường (Quartz), dòng này có {n}.", { n: tok.length }));
    // 6–7 fields that all look like cron fields are Quartz; otherwise the 6th token starts a crontab command.
    const field = s => /^[\d*?,\-/LW#]+$/i.test(s), dowOk = s => /^(?:[\d*?,\-/L#]|SUN|MON|TUE|WED|THU|FRI|SAT)+$/i.test(s), year = s => /^[\d*,\-/]+$/.test(s);
    const monthOk = s => /^(?:[\d*?,\-/]|JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)+$/i.test(s);
    if ((tok.length === 6 || tok.length === 7) && tok.slice(0, 4).every(field) && monthOk(tok[4]) && dowOk(tok[5]) && (!tok[6] || year(tok[6]))) return quartz(tok);
    const monName = s => { const k = MONTHS.indexOf(s); return k >= 0 ? k + 1 : plain(s); };
    const f = { min: numeric("min", tok[0]), hour: numeric("hour", tok[1]), dom: dom(tok[2], false), mon: numeric("mon", tok[3], monName), dow: dow(tok[4], false) };
    return { kind: "unix", f, expr: tok.slice(0, 5).join(" "), command: tok.slice(5).join(" ") };
  }

  function quartz(tok) {
    const monName = s => { const k = MONTHS.indexOf(s); return k >= 0 ? k + 1 : plain(s); };
    const f = { sec: numeric("sec", tok[0]), min: numeric("min", tok[1]), hour: numeric("hour", tok[2]), dom: dom(tok[3], true), mon: numeric("mon", tok[4], monName), dow: dow(tok[5], true) };
    if (tok[6]) f.year = numeric("year", tok[6]);
    if (!f.dom.any && !f.dow.any) throw new Error(T("Quartz: “ngày trong tháng” hoặc “thứ trong tuần” phải là ? (không đặt cả hai)."));
    return { kind: "quartz", f, expr: tok.join(" "), command: "" };
  }

  const lastDay = (y, m) => new Date(y, m + 1, 0).getDate();
  function nearWeekday(y, m, day) {
    const n = Math.min(day, lastDay(y, m)), wd = new Date(y, m, n).getDay();
    if (wd === 6) return n > 1 ? n - 1 : n + 2;
    if (wd === 0) return n < lastDay(y, m) ? n + 1 : n - 2;
    return n;
  }

  // Unix (Vixie): when both day fields are restricted (neither starts with *), a day matching either one runs.
  function dayMatches(p, y, m, d) {
    const { dom: a, dow: b } = p.f, last = lastDay(y, m), wd = new Date(y, m, d).getDay();
    const domHit = a.set.has(d) || (a.last >= 0 && d === last - a.last) || a.near.some(n => nearWeekday(y, m, n) === d) || (a.lastWeekday && d === nearWeekday(y, m, last));
    const dowHit = b.set.has(wd) || (b.lastOf.has(wd) && d + 7 > last) || b.nth.some(x => x.d === wd && Math.ceil(d / 7) === x.k);
    if (p.kind === "unix") return a.star || b.star ? domHit && dowHit : domHit || dowHit;
    return (a.any || domHit) && (b.any || dowHit);
  }

  // Next n run times strictly after `from` (local time; times skipped by a DST jump are left out). Gives up after 30 years.
  function next(p, from = new Date(), n = 10) {
    if (p.kind === "reboot") return [];
    const out = [], f = p.f, sorted = s => [...s].sort((x, y) => x - y);
    const H = sorted(f.hour.set), M = sorted(f.min.set), S = f.sec ? sorted(f.sec.set) : [0];
    const day = new Date(from.getFullYear(), from.getMonth(), from.getDate());
    for (let i = 0; i < 366 * 30 && out.length < n; i++, day.setDate(day.getDate() + 1)) {
      const y = day.getFullYear(), m = day.getMonth(), d = day.getDate();
      if (f.year && !f.year.set.has(y)) { if (y > Math.max(...f.year.set)) break; continue; }
      if (!f.mon.set.has(m + 1) || !dayMatches(p, y, m, d)) continue;
      for (const h of H) for (const mi of M) for (const s of S) {
        if (out.length >= n) return out;
        const t = new Date(y, m, d, h, mi, s);
        if (t > from && t.getHours() === h && t.getMinutes() === mi) out.push(t);
      }
    }
    return out;
  }

  return { parse, next, FIELD_NAMES, DAYS };
})();

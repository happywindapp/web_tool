// Cron in words (UI language) + the next 10 runs, as a Markdown report: one section per cron line of the tab (# lines are comments).
const CronExplain = (() => {
  const pad = n => String(n).padStart(2, "0");
  const fmt = (lang, o) => new Intl.DateTimeFormat(lang === "vi" ? "vi-VN" : "en-US", o);
  const dayName = d => fmt(I18n.lang, { weekday: "long" }).format(new Date(2026, 0, 4 + d));
  const monthName = m => fmt(I18n.lang, { month: "long" }).format(new Date(2026, m - 1, 1));
  const ORD = ["đầu tiên", "thứ hai", "thứ ba", "thứ tư", "thứ năm"];

  // [1,2,3,5] → "1–3, 5" (via label); Monday-first order for weekdays.
  function ranges(list, label = String) {
    const out = [];
    for (let i = 0; i < list.length; i++) {
      let j = i;
      while (j + 1 < list.length && list[j + 1] === list[j] + 1) j++;
      out.push(j - i >= 2 ? label(list[i]) + "–" + label(list[j]) : j > i ? label(list[i]) + ", " + label(list[j]) : label(list[i]));
      i = j;
    }
    return out.join(", ");
  }
  const sorted = s => [...s].sort((a, b) => a - b);

  // A time field: "*", "*/n", "a/n", "a-b/n" read as steps, anything else as a list of values.
  function timeField(f, unit) {
    const step = /^(\*|\d+)(?:-(\d+))?\/(\d+)$/.exec(f.raw), n = step && +step[3];
    if (f.any) return unit === "sec" ? T("mỗi giây") : unit === "min" ? T("mỗi phút") : T("mỗi giờ");
    if (step && step[1] === "*") return unit === "sec" ? T("mỗi {n} giây", { n }) : unit === "min" ? T("mỗi {n} phút", { n }) : T("mỗi {n} giờ", { n });
    if (step && !step[2]) return unit === "sec" ? T("mỗi {n} giây từ giây {a}", { n, a: step[1] }) : unit === "min" ? T("mỗi {n} phút từ phút {a}", { n, a: step[1] }) : T("mỗi {n} giờ từ {a}:00", { n, a: pad(step[1]) });
    const list = ranges(sorted(f.set));
    return unit === "sec" ? T("giây {list}", { list }) : unit === "min" ? T("phút {list}", { list }) : T("trong giờ {list}", { list });
  }

  function dayPart(p) {
    const { dom, dow, mon, year } = p.f, parts = [];
    const d = [];
    if (!dom.any) {
      if (dom.set.size) d.push(T("ngày {list} của tháng", { list: ranges(sorted(dom.set)) }));
      if (dom.last === 0) d.push(T("ngày cuối tháng"));
      if (dom.last > 0) d.push(T("{n} ngày trước ngày cuối tháng", { n: dom.last }));
      dom.near.forEach(n => d.push(T("ngày làm việc gần ngày {n} nhất", { n })));
      if (dom.lastWeekday) d.push(T("ngày làm việc cuối cùng của tháng"));
    }
    const w = [];
    if (!dow.any) {
      if (dow.set.size) w.push(T("vào {list}", { list: ranges(sorted([...dow.set].map(x => (x + 6) % 7)), x => dayName((x + 1) % 7)) }));
      dow.lastOf.forEach(x => w.push(T("{day} cuối cùng của tháng", { day: dayName(x) })));
      dow.nth.forEach(x => w.push(T("{day} {ord} của tháng", { day: dayName(x.d), ord: T(ORD[x.k - 1]) })));
    }
    const both = d.length && w.length;
    if (both && p.kind === "unix" && !dom.star && !dow.star) parts.push(T("{a} hoặc {b}", { a: d.join(", "), b: w.join(", ") }));
    else parts.push(...d, ...w);
    if (!parts.length) parts.push(T("mỗi ngày"));
    if (!mon.any) parts.push(T("trong {list}", { list: ranges(sorted(mon.set), monthName) }));
    if (year && !year.any) parts.push(T("năm {list}", { list: ranges(sorted(year.set)) }));
    return parts;
  }

  // The sentence: "At 09:30, 13:30" when minute (+ second) is one value and hours are a short list; else per-field phrases.
  function sentence(p) {
    if (p.kind === "reboot") return T("Chạy một lần khi máy khởi động (không có lịch).");
    const { sec, min, hour } = p.f, one = f => f.set.size === 1 && !/[*/-]/.test(f.raw);
    const parts = [];
    if (one(min) && (!sec || one(sec)) && !hour.any && hour.set.size <= 8 && !/\//.test(hour.raw)) {
      const m = [...min.set][0], s = sec ? [...sec.set][0] : 0;
      parts.push(T("lúc {times}", { times: sorted(hour.set).map(h => pad(h) + ":" + pad(m) + (s ? ":" + pad(s) : "")).join(", ") }));
    } else {
      if (sec && !(one(sec) && [...sec.set][0] === 0)) parts.push(timeField(sec, "sec"));
      if (!(sec && sec.any && min.any)) parts.push(timeField(min, "min"));
      if (!hour.any || !min.any) parts.push(hour.any ? T("mỗi giờ") : /-/.test(hour.raw) && !/[,/]/.test(hour.raw)
        ? T("từ {a}:00 đến {b}:59", { a: pad(Math.min(...hour.set)), b: pad(Math.max(...hour.set)) }) : timeField(hour, "hour"));
    }
    const s = [...parts, ...dayPart(p)].join(", ");
    return s.charAt(0).toLocaleUpperCase() + s.slice(1) + ".";
  }

  function rows(p) {
    const keys = p.kind === "quartz" ? ["sec", "min", "hour", "dom", "mon", "dow", "year"] : ["min", "hour", "dom", "mon", "dow"];
    return keys.filter(k => p.f[k]).map(k => "| " + T(Cron.FIELD_NAMES[k]) + " | `" + p.f[k].raw + "` |");
  }

  const stamp = t => t.getFullYear() + "-" + pad(t.getMonth() + 1) + "-" + pad(t.getDate()) + " " + fmt(I18n.lang, { weekday: "short" }).format(t) + " " + pad(t.getHours()) + ":" + pad(t.getMinutes()) + (t.getSeconds() ? ":" + pad(t.getSeconds()) : "");
  const utc = t => t.toISOString().replace(/\.000Z$/, "Z").replace("T", " ");
  function zone(now) {
    const o = -now.getTimezoneOffset(), z = Intl.DateTimeFormat().resolvedOptions().timeZone || "";
    return (z ? z + " " : "") + "(UTC" + (o < 0 ? "−" : "+") + pad(Math.floor(Math.abs(o) / 60)) + ":" + pad(Math.abs(o) % 60) + ")";
  }

  // → { text (Markdown), errors: [{ line, message }] }.
  function report(text, now = new Date()) {
    const out = [], errors = [];
    text.split(/\r?\n/).forEach((raw, i) => {
      const line = raw.trim();
      if (!line || line.startsWith("#") || /^[A-Z_][A-Z0-9_]*\s*=/i.test(line)) return;
      out.push("## `" + line.replace(/`/g, "'") + "`", "");
      let p;
      try { p = Cron.parse(line); } catch (e) { errors.push({ line: i + 1, message: e.message }); out.push("> ✖ " + e.message, ""); return; }
      out.push("**" + sentence(p) + "**", "");
      const kind = p.kind === "quartz" ? T("Quartz ({n} trường, giây đứng đầu, 1 = Chủ nhật)", { n: p.f.year ? 7 : 6 }) : p.kind === "reboot" ? "@reboot" : T("Unix (5 trường)") + (p.macro ? " · " + p.macro : "");
      out.push("- " + T("Kiểu: {kind}", { kind }) + (p.command ? " · " + T("lệnh: `{cmd}`", { cmd: p.command.replace(/`/g, "'") }) : ""), "");
      if (p.kind === "quartz" && /\d/.test(p.f.dow.raw)) out.push("> ⚠ " + T("Thứ trong tuần dạng số: Quartz đếm 1 = Chủ nhật; Spring / robfig đếm 0 = Chủ nhật, 1 = Thứ hai — kiểm lại đúng thư viện của bạn."), "");
      if (p.kind === "reboot") return;
      out.push("| " + T("Trường") + " | " + T("Giá trị") + " |", "|---|---|", ...rows(p), "");
      const runs = Cron.next(p, now, 10);
      if (!runs.length) { out.push("> " + T("Không có lần chạy nào trong 30 năm tới."), ""); return; }
      out.push("| # | " + T("Giờ máy") + " | UTC |", "|---:|---|---|", ...runs.map((t, k) => "| " + (k + 1) + " | " + stamp(t) + " | " + utc(t) + " |"), "");
    });
    if (!out.length) out.push(T("Chưa có biểu thức cron — mỗi dòng 1 biểu thức, vd `*/15 9-17 * * 1-5`."), "");
    const head = ["# " + T("Giải thích cron"), "", T("Giờ máy: {zone} · tính từ {now}", { zone: zone(now), now: stamp(now) }), ""];
    return { text: head.concat(out).join("\n"), errors };
  }

  return { report, sentence };
})();

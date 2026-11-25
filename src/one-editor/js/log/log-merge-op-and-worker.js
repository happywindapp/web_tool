// "log-merge" op: several log tabs → one timeline (Blob Worker: parse, sort, filter, histogram), the merged text in the result tab (first rows), the pane pages through the rest.
// Worker side (stringified): load parses the sources once; view filters + buckets; rows / text read the merged order.
function logMergeWorkerHandlers() {
  const P = LogMerge, DAY = 86400000;
  let srcs = [], m = null, kept = null, rowStart = null, owner = "";
  const letter = k => String.fromCharCode(65 + k);

  function rowAt(r) {
    let lo = 0, hi = kept.length - 1;
    while (lo < hi) { const mid = (lo + hi + 1) >> 1; if (rowStart[mid] <= r) lo = mid; else hi = mid - 1; }
    return lo;
  }

  return {
    // d.sources: [{ text, fmt, off }]; time-only sources take the day of the earliest dated one.
    load(d) {
      srcs = d.sources.map(s => P.parseSource(s.text, { fmt: s.fmt, off: s.off }));
      let day = Infinity;
      srcs.forEach(s => { if (!s.dateless) for (let i = 0; i < s.ts.length; i++) if (isFinite(s.ts[i])) { day = Math.min(day, s.ts[i]); break; } });
      const day0 = isFinite(day) ? Math.floor(day / DAY) * DAY : 0;
      if (isFinite(day)) srcs = srcs.map((s, k) => s.dateless && s.hits ? P.parseSource(d.sources[k].text, { fmt: d.sources[k].fmt, off: d.sources[k].off, day0: Math.floor(day / DAY) * DAY }) : s);
      m = P.merge(srcs);
      kept = null;
      return { day0, sources: srcs.map(s => ({ fmt: s.fmt, hits: s.hits, lines: s.lines.length, dateless: s.dateless, rolls: s.rolls })), groups: m.gSrc.length };
    },
    // d: { filter: { q, regex, cs, link }, unit } → counts + histogram (bucket → first row).
    view(d) {
      const keep = P.filter(srcs, m, d.filter);
      owner = d.owner;
      let n = 0;
      for (let g = 0; g < keep.length; g++) n += keep[g];
      kept = new Uint32Array(n); rowStart = new Float64Array(n + 1);
      for (let g = 0, k = 0; g < keep.length; g++) if (keep[g]) { kept[k] = g; rowStart[k + 1] = rowStart[k] + m.gEnd[g] - m.gStart[g]; k++; }
      const h = P.histogram(m, keep, d.unit), at = new Map();
      kept.forEach((g, k) => at.set(g, k));
      const row = Array.from(h.first, g => g < 0 ? -1 : rowStart[at.get(g)]);
      let err = 0, warn = 0;
      for (const g of kept) { if (m.gLvl[g] === 2) err++; else if (m.gLvl[g] === 1) warn++; }
      return { rows: rowStart[n], groups: n, total: m.gSrc.length, err, warn, hist: { size: h.size, t0: h.t0, n: Array.from(h.n), err: Array.from(h.err), warn: Array.from(h.warn), row } };
    },
    // d: { start, n } → [{ s, line, ts, head, lvl, text }].
    rows(d) {
      if (!kept || d.owner !== owner) throw new Error("no result");
      const out = [], total = kept.length ? rowStart[kept.length] : 0;
      for (let r = Math.max(0, d.start); r < Math.min(total, d.start + d.n);) {
        const k = rowAt(r), g = kept[k], s = srcs[m.gSrc[g]];
        for (let i = m.gStart[g] + (r - rowStart[k]); i < m.gEnd[g] && r < d.start + d.n; i++, r++)
          out.push({ s: m.gSrc[g], line: i + 1, ts: m.gTs[g], head: i === m.gStart[g], lvl: m.gLvl[g], text: s.lines[i].length > 2000 ? s.lines[i].slice(0, 2000) + "…" : s.lines[i] });
      }
      return out;
    },
    // Merged text with "[A] " source prefixes, the first d.max lines.
    text(d) {
      if (!kept || d.owner !== owner) throw new Error("no result");
      const out = [];
      for (const g of kept || []) {
        const s = srcs[m.gSrc[g]], pre = "[" + letter(m.gSrc[g]) + "] ";
        for (let i = m.gStart[g]; i < m.gEnd[g] && out.length < d.max; i++) out.push(pre + s.lines[i]);
        if (out.length >= d.max) break;
      }
      return out.join("\n") + (out.length ? "\n" : "");
    },
  };
}

const LogMergeOp = (() => {
  const TEXT_ROWS = 20000, MAX_SOURCES = 8, TIMEOUT = 300000;
  let worker = null, loaded = "", busyN = 0, lastLoad = null, chain = Promise.resolve();
  const FMTS = new Set(LogMerge.AUTO.map(x => "@" + x.id));
  const busyFns = new Set();
  const w = () => worker ??= BlobWorker.create({ libs: [], code: () => "const LogMerge = (" + logMergePureFactory + ")();\nconst HANDLERS = (" + logMergeWorkerHandlers + ")();" });
  const str = (v, n) => typeof v === "string" ? v.slice(0, n) : "";
  const clean = o => ({ sources: (Array.isArray(o?.sources) ? o.sources : []).slice(0, MAX_SOURCES).filter(x => x && typeof x.n === "string").map(x => ({ n: x.n.slice(0, 200), fmt: x.fmt?.[0] === "@" && !FMTS.has(x.fmt) ? "" : str(x.fmt, 60), off: str(x.off, 20) })),
    q: str(o?.q, 2000), regex: o?.regex === true, cs: o?.cs === true, link: o?.link !== false, unit: ["s", "m"].includes(o?.unit) ? o.unit : "auto" });
  const opts = srcId => PowerUi.opts(srcId, "log-merge", clean, () => clean({}));
  const setBusy = d => { busyN += d; busyFns.forEach(f => f(busyN > 0)); };
  const textOf = d => d.state ? d.state.doc : d.text;

  // Open text tabs that can be a source (no panes, hex, folders); newest first so a link's tabs win over same-named older ones.
  function candidates() {
    const seen = new Set(), out = [];
    for (const g of Views.groups.slice(0, Views.count)) for (const id of g.tabs) {
      const d = Docs.get(id);
      if (d && !seen.has(id) && !d.hex && !d.big && !PreviewPane.isPane(d) && !Docs.isList(d) && d.kind !== "clone") { seen.add(id); out.push(d); }
    }
    const age = new Map(Docs.list().map((d, i) => [d.id, i]));
    return out.sort((a, b) => age.get(b.id) - age.get(a.id));
  }

  // Sources: the run tab first, then the picked names (else every other Log / FIX tab); missing: picked names with no usable tab, cut: over MAX_SOURCES.
  function sources(src, o) {
    const all = candidates().filter(d => d !== src), list = [src], missing = [];
    if (o.sources.length) for (const s of o.sources) { const d = all.find(x => x.name === s.n && !list.includes(x)); if (d) list.push(d); else if (s.n !== src.name) missing.push(s.n); }
    else list.push(...all.filter(d => ["Log", "FIX"].includes(Docs.effectiveLang(d))));
    return Object.assign(list.slice(0, MAX_SOURCES), { missing, cut: list.slice(MAX_SOURCES).map(d => d.name) });
  }
  const settingOf = (o, d) => o.sources.find(s => s.n === d.name) || { n: d.name, fmt: "", off: "" };

  // One merge at a time: the worker holds a single loaded set.
  const run = (t, c) => (chain = chain.then(() => runOne(c), () => runOne(c)));
  async function runOne(c) {
    const src = Docs.get(c.id), o = opts(c.id), list = sources(src, o), conf = list.map(d => settingOf(o, d));
    const offs = conf.map(s => LogMerge.offset(s.off || "0"));
    const badOff = conf.findIndex((s, i) => isNaN(offs[i]));
    if (badOff >= 0) throw Object.assign(new Error(T("Lệch giờ “{v}” của {name} không đọc được — dạng +7h, -150ms, 2s.", { v: conf[badOff].off, name: list[badOff].name })), { warn: true });
    for (const s of conf) if (s.fmt && s.fmt[0] !== "@") try { LogMerge.compile(s.fmt); } catch { throw Object.assign(new Error(T("Định dạng giờ “{f}” cần ít nhất HH và mm (vd yyyy-MM-dd HH:mm:ss.SSS).", { f: s.fmt })), { warn: true }); }
    if (o.q && o.regex) try { new RegExp(o.q); } catch (e) { throw Object.assign(new Error(T("Regex lỗi: {msg}", { msg: e.message })), { warn: true }); }
    setBusy(1);
    try {
      const sig = w().epoch + "|" + list.map((d, i) => d.id + ":" + (d.state ? d.state.doc.length : d.text.length) + ":" + conf[i].fmt + ":" + offs[i]).join("|");
      if (!w().alive || sig !== loaded || list.some(d => d.lmDoc !== textOf(d))) {
        loaded = "";
        const docs = list.map(textOf), r = await w().call("load", { sources: list.map((d, i) => ({ text: Docs.text(d), fmt: conf[i].fmt, off: offs[i] })) }, { timeout: TIMEOUT });
        list.forEach((d, i) => { d.lmDoc = docs[i]; });
        loaded = w().epoch + sig.slice(sig.indexOf("|"));
        lastLoad = r;
      }
      const v = await w().call("view", { owner: c.id, filter: { q: o.q, regex: o.regex, cs: o.cs, link: o.link }, unit: o.unit }, { timeout: TIMEOUT });
      const text = await w().call("text", { owner: c.id, max: TEXT_ROWS }, { timeout: TIMEOUT });
      const notes = [T("Gộp {n} nguồn · {rows} dòng · {err} ERROR · {warn} WARN.", { n: list.length, rows: I18n.num(v.rows), err: I18n.num(v.err), warn: I18n.num(v.warn) })];
      if (v.rows > TEXT_ROWS) notes.push(T("Tab kết quả giữ {n} dòng đầu — ⧉ Mở thành tab để lấy đủ.", { n: I18n.num(TEXT_ROWS) }));
      const st = lastLoad?.sources || [], noTime = list.filter((d, i) => st[i] && !st[i].hits).map(d => d.name), dateless = list.filter((d, i) => st[i]?.dateless && st[i].hits).map(d => d.name);
      if (dateless.length) notes.push(lastLoad.day0 ? T("{list} chỉ có giờ — lấy ngày {d} của nguồn có ngày; giờ lùi quá 12 h tính sang ngày sau.", { list: dateless.join(", "), d: new Date(lastLoad.day0).toISOString().slice(0, 10) })
        : T("{list} chỉ có giờ và không nguồn nào có ngày — mốc ngày 1970-01-01.", { list: dateless.join(", ") }));
      const warns = [];
      if (list.missing.length) warns.push(T("Không dùng được làm nguồn: {list} (tab đã đóng, file lớn / nhị phân hoặc không mở được).", { list: list.missing.join(", ") }));
      if (list.cut.length) warns.push(T("Chỉ gộp {n} nguồn đầu — bỏ: {list}.", { n: MAX_SOURCES, list: list.cut.join(", ") }));
      if (noTime.length) warns.push(T("Không nhận được giờ ở: {list} — chọn định dạng tay.", { list: noTime.join(", ") }));
      const error = warns.length ? Object.assign(new Error(warns.join(" ")), { warn: true }) : null;
      return { text, notes, error, view: { kind: "logmerge", srcId: c.id, o, v, sources: list.map((d, i) => ({ id: d.id, name: d.name, ...settingOf(o, d), stat: st[i] || null })), all: candidates().map(d => ({ id: d.id, name: d.name })) } };
    } finally { setBusy(-1); }
  }

  function set(srcId, o) {
    if (busyN) { StatusBar.msg(T("Đang gộp log — chờ xong hoặc bấm ■ Dừng."), "warn"); return; }
    PowerUi.saveOpts(srcId, "log-merge", clean(o));
    const src = Docs.get(srcId);
    if (src) OutputLink.run(src, "log-merge");
  }
  function stop() { worker?.stop(); loaded = ""; }
  const NO_RESULT = () => T("Kết quả gộp này không còn trong bộ nhớ (đã gộp tab khác hoặc đã dừng) — bấm ▶ Gộp lại.");
  const rows = (srcId, start, n) => w().call("rows", { owner: srcId, start, n }, { timeout: TIMEOUT }).catch(e => { throw e.message === "no result" || e.stopped ? new Error(NO_RESULT()) : e; });

  async function openTab(srcId) {
    setBusy(1);
    try {
      const text = await w().call("text", { owner: srcId, max: 5000000 }, { timeout: TIMEOUT }), src = Docs.get(srcId);
      const doc = Docs.create({ kind: "temp", name: (src ? src.name.replace(/\.[^.]*$/, "") : "logs") + "-merged.log", lang: "Log", text });
      Views.open(doc, Views.focused, true);
    } catch (e) { StatusBar.msg(e.stopped ? T("Đã dừng.") : e.message === "no result" ? NO_RESULT() : e.message, e.stopped || e.message === "no result" ? "warn" : "bad"); }
    finally { setBusy(-1); }
  }

  async function share(srcId) {
    const src = Docs.get(srcId);
    if (!src) { StatusBar.msg(T("Tab nguồn của kết quả này đã đóng."), "warn"); return; }
    const o = opts(srcId), list = sources(src, o);
    await PowerUi.shareLink({ v: 1, views: [list.map(d => ({ n: d.name, l: d.lang || "", t: Docs.text(d) })), []], run: "log-merge", opts: { ...o, sources: list.map(d => settingOf(o, d)) } },
      n => T("🔗 Đã chép link gộp log ({n} ký tự) — mở link là gộp lại các nguồn.", { n }));
  }

  return { run, set, stop, opts, rows, openTab, share, candidates, onBusy: f => { busyFns.add(f); return () => busyFns.delete(f); }, get busy() { return busyN > 0; } };
})();

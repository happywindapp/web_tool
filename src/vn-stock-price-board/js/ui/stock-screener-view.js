// "Bộ lọc" tab: whole-market screener (exchange, sector, market cap, P/E, P/B, ROE, dividend yield, % change, traded value) with presets.
const ScreenView = (() => {
  const INPUTS = [["mcapMin", "Vốn hoá ≥ (tỷ)"], ["peMin", "P/E từ"], ["peMax", "P/E đến"], ["pbMax", "P/B ≤"], ["roeMin", "ROE ≥ (%)"], ["dyMin", "Cổ tức ≥ (%)"],
    ["pctMin", "% hôm nay từ"], ["pctMax", "% hôm nay đến"], ["valueMin", "GTGD ≥ (tỷ)"]];
  const COLS = [["sym", "Mã"], ["ex", "Sàn"], ["price", "Giá"], ["pct", "%"], ["value", "GTGD (tỷ)"], ["mcap", "Vốn hoá (tỷ)"], ["pe", "P/E"], ["pb", "P/B"], ["roe", "ROE %"], ["dy", "Cổ tức %"]];
  const MAX_ROWS = 300;
  const clean = raw => {
    const c = {}, src = raw && typeof raw.c === "object" ? raw.c : {};
    for (const k of Mkt.FIELDS) c[k] = Number.isFinite(parseFloat(src[k])) ? String(parseFloat(src[k])) : "";
    c.ex = ["HOSE", "HNX", "UPCOM"].includes(src.ex) ? src.ex : "";
    c.sector = /^\d{4}$/.test(src.sector || "") ? src.sector : "";
    const sk = COLS.some(x => x[0] === raw?.sort?.key) ? raw.sort.key : "mcap";
    return { c, sort: { key: sk, dir: raw?.sort?.dir === 1 ? 1 : -1 } };
  };
  let st = clean(Prefs.get("scr", { c: Mkt.PRESETS.value.c })), last = [];
  const e = s => Dom.esc(s ?? "");
  const save = () => Prefs.set("scr", st);

  function form(lang) {
    const sec = Market.sectors(), opt = (v, l, cur) => `<option value="${e(v)}"${v === cur ? " selected" : ""}>${e(l)}</option>`;
    const sectors = sec ? sec.levels[2].map(s => [s.code, lang === "en" && s.en ? s.en : s.vi]).sort((a, b) => a[1].localeCompare(b[1])) : [];
    return `<div class="cbar"><select data-scr="preset"><option value="">${e(T("Bộ lọc mẫu…"))}</option>${Object.entries(Mkt.PRESETS).map(([k, p]) => opt(k, T(p.label), "")).join("")}</select>`
      + `<select data-scr="ex">${opt("", T("Mọi sàn"), st.c.ex)}${["HOSE", "HNX", "UPCOM"].map(x => opt(x, x, st.c.ex)).join("")}</select>`
      + `<select data-scr="sector">${opt("", T("Mọi ngành"), st.c.sector)}${sectors.map(([c, n]) => opt(c, n, st.c.sector)).join("")}</select>`
      + `<button data-scr="reset">${e(T("Xoá điều kiện"))}</button></div>`
      + `<div class="scr-form">${INPUTS.map(([k, l]) => `<label>${e(T(l))}<input type="number" step="any" data-scr-f="${k}" value="${e(st.c[k])}"></label>`).join("")}</div>`
      + `<div id="scrResults"></div>`;
  }

  // quotes: the market tab's live quotes; ratios may still be loading (then ratio criteria match nothing yet).
  function results(quotes) {
    if (quotes) last = quotes;
    const sec = Market.sectors(), r = Market.ratios(), p = Market.progress();
    const rows = last.map(q => Mkt.row(q, r?.get(q.sym), sec?.of.get(q.sym)?.[2] || ""));
    const { key, dir } = st.sort, val = x => x[key] ?? (dir > 0 ? Infinity : -Infinity);
    const hit = Mkt.screen(rows, st.c).sort((a, b) => (key === "sym" || key === "ex" ? String(a[key]).localeCompare(String(b[key])) : val(a) - val(b)) * dir);
    const f = (v, d = 2) => v == null ? "—" : Fmt.en(v, d);
    const head = COLS.map(([k, l]) => `<th data-sort="${k}">${e(T(l))}${k === key ? (dir > 0 ? " ▲" : " ▼") : ""}</th>`).join("") + "<th>★</th>";
    const body = hit.slice(0, MAX_ROWS).map(x => `<tr data-sym="${e(x.sym)}"><td><b>${e(x.sym)}</b></td><td>${e(x.ex)}</td><td>${Fmt.price(x.price)}</td>`
      + `<td class="${x.pct > 0 ? "up" : x.pct < 0 ? "down" : "ref"}">${Fmt.signed(x.pct)}%</td><td>${f(x.value, 1)}</td><td>${f(x.mcap, 0)}</td><td>${f(x.pe)}</td><td>${f(x.pb)}</td>`
      + `<td>${f(x.roe, 1)}</td><td>${f(x.dy, 1)}</td><td><button class="star${Watch.has(x.sym) ? " on" : ""}" data-scr="star">${Watch.has(x.sym) ? "★" : "☆"}</button></td></tr>`).join("");
    const el = $("scrResults");
    if (!el) return hit;
    el.innerHTML = (p ? `<p class="mk-progress">${e(T("Đang tải chỉ số toàn thị trường {d}/{n}…", { d: p.done, n: p.total }))}</p>` : "")
      + `<div class="cbar"><b>${e(T("{n} mã khớp", { n: hit.length }))}</b>${hit.length > MAX_ROWS ? ` <span class="muted">${e(T("(hiện {m} mã đầu)", { m: MAX_ROWS }))}</span>` : ""}`
      + `<button data-scr="addAll"${hit.length ? "" : " disabled"}>${e(T("★ Thêm tất cả vào danh mục"))}</button><button data-scr="csv"${hit.length ? "" : " disabled"}>⬇ CSV</button></div>`
      + `<div class="fscroll"><table class="dtable num scr">${`<thead><tr>${head}</tr></thead>`}<tbody>${body}</tbody></table></div>`;
    return hit;
  }

  function csv(hit) {
    const cell = v => v == null ? "" : /[",\n]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : String(v);
    const lines = [COLS.map(([, l]) => cell(T(l))).join(","), ...hit.map(x => COLS.map(([k]) => cell(typeof x[k] === "number" ? +x[k].toFixed(4) : x[k])).join(","))];
    Dom.download(String.fromCharCode(0xfeff) + lines.join("\r\n"), `${T("bo-loc")}-${QuoteModel.vnDate()}.csv`, "text/csv;charset=utf-8");
  }

  // Returns "form" (rebuild form + results), "results", or false.
  function act(el, ev) {
    const a = el.dataset.scr, f = el.dataset.scrF;
    if (f && ev === "change") { st.c[f] = Number.isFinite(parseFloat(el.value)) ? String(parseFloat(el.value)) : ""; save(); return "results"; }
    if (ev === "change" && (a === "ex" || a === "sector")) { st.c[a] = el.value; st = clean(st); save(); return "results"; }
    if (ev === "change" && a === "preset" && Mkt.PRESETS[el.value]) { st = clean({ c: { ...Mkt.PRESETS[el.value].c, ex: st.c.ex, sector: st.c.sector }, sort: st.sort }); save(); return "form"; }
    if (ev !== "click") return false;
    if (a === "reset") { st = clean({ sort: st.sort }); save(); return "form"; }
    if (a === "addAll") { const syms = results().map(x => x.sym).slice(0, 300); if (!confirm(T("Thêm {n} mã vào danh mục ★?", { n: syms.length }))) return false; const n = Watch.add(syms).length; Controls.say("good", "✔ Đã thêm {n} mã vào danh mục.", { n }); return "results"; }
    if (a === "csv") { csv(results()); return false; }
    if (a === "star") { Watch.toggle(el.closest("tr").dataset.sym); return "results"; }
    const th = el.closest("th[data-sort]");
    if (th) { const k = th.dataset.sort; st.sort = { key: k, dir: st.sort.key === k ? -st.sort.dir : k === "sym" || k === "ex" ? 1 : -1 }; save(); return "results"; }
    return false;
  }

  return { form, results, act, get: () => JSON.parse(JSON.stringify(st)), set: raw => { st = clean(raw); save(); } };
})();

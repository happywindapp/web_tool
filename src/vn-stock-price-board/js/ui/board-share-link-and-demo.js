// 🔗 share link (#pako: payload = tab + watchlist + options + sort + selected symbol), ?data= / ?demo= / ?tab= intake, demo dropdown.
const ShareDemo = (() => {
  const SORT_KEYS = new Set(BoardCols.COLS.map(c => c.sort).filter(Boolean));

  async function copyLink(payload, say) {
    let url;
    try { url = location.href.split(/[?#]/)[0] + "#" + await ShareCodec.encode(payload); }
    catch { say("bad", "Trình duyệt không hỗ trợ nén link (cần Chrome/Edge/Firefox/Safari mới)."); return; }
    const ok = await Dom.copy(url);
    if (!ok) { prompt(T("Chép link này:"), url); return; }
    say("good", location.protocol === "file:" ? "✔ Đã chép link ({n} ký tự) — mở bằng file:// nên link chỉ dùng được trên máy này." : "✔ Đã chép link ({n} ký tự).", { n: Fmt.en(url.length) });
  }

  // Untrusted payload → only known fields with the right types.
  function sanitize(p, tabs) {
    if (!p || typeof p !== "object") return null;
    const out = {};
    if (typeof p.tab === "string" && Board.validTab(p.tab)) out.tab = p.tab;
    if (Array.isArray(p.watch)) out.watch = WatchParse.clean(p.watch);
    if (p.opts && typeof p.opts === "object") out.opts = p.opts;
    if (p.sort && SORT_KEYS.has(p.sort.key) && (p.sort.dir === 1 || p.sort.dir === -1)) out.sort = { key: p.sort.key, dir: p.sort.dir };
    if (WatchParse.isSymbol(p.sym)) out.sym = p.sym;
    if (p.chart && typeof p.chart === "object") out.chart = p.chart;
    if (typeof p.dtab === "string" && DetailTabs.IDS.has(p.dtab)) out.dtab = p.dtab;
    if (p.fin && typeof p.fin === "object") out.fin = p.fin;
    return out;
  }

  const fromText = text => { const r = WatchParse.parse(text); return { tab: "watch", watch: r.symbols, bad: r.bad }; };

  // Reads hash / query once, then strips them so F5 does not re-apply. Returns { tab?, watch?, opts?, sort?, sym?, bad? } or { error }.
  async function readIncoming(tabs) {
    const q = new URLSearchParams(location.search), hash = location.hash.slice(1);
    let res = null;
    try {
      if (hash) res = sanitize(await ShareCodec.decode(decodeURIComponent(hash)), tabs) || { error: true };
      else if (q.has("data")) { const d = q.get("data"); res = sanitize(await ShareCodec.decode(d), tabs) || fromText(d); }
      else if (q.has("demo")) res = Object.hasOwn(DEMOS, q.get("demo")) ? fromText(DEMOS[q.get("demo")].text) : { error: true };
      if (q.has("tab") && Board.validTab(q.get("tab"))) (res ||= {}).tab ||= q.get("tab");
    } catch { res = { error: true }; }
    if (hash || q.has("data") || q.has("demo") || q.has("tab")) history.replaceState(null, "", location.pathname);
    return res;
  }


  return { copyLink, readIncoming, fromText };
})();

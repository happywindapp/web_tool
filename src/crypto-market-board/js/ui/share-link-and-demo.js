// 🔗 share link (#pako: payload = tab + watchlist + options + sort + coin + detail tab + chart; never holdings), ?data= / ?demo= / ?tab= intake, demo picker.
const ShareDemo = (() => {
  const SORT_KEYS = new Set(Object.keys(BoardCols.C));

  async function copyLink(payload, say) {
    let url;
    try { url = location.href.split(/[?#]/)[0] + "#" + await ShareCodec.encode(payload); }
    catch { say("bad", "Trình duyệt không hỗ trợ nén link (cần Chrome/Edge/Firefox/Safari mới)."); return; }
    const ok = await Dom.copy(url);
    if (!ok) { prompt(T("Chép link này:"), url); return; }
    say("good", location.protocol === "file:" ? "✔ Đã chép link ({n} ký tự) — mở bằng file:// nên link chỉ dùng được trên máy này." : "✔ Đã chép link ({n} ký tự).", { n: Fmt.en(url.length) });
  }

  // Untrusted payload → only known fields with the right types (opts / chart are re-validated by their owners).
  function sanitize(p) {
    if (!p || typeof p !== "object" || Array.isArray(p)) return null;
    const out = {};
    if (typeof p.tab === "string" && Board.TAB_IDS.has(p.tab)) out.tab = p.tab;
    if (Array.isArray(p.watch)) out.watch = CoinParse.clean(p.watch);
    if (p.opts && typeof p.opts === "object") out.opts = p.opts;
    if (p.sort && SORT_KEYS.has(p.sort.key) && (p.sort.dir === 1 || p.sort.dir === -1)) out.sort = { key: p.sort.key, dir: p.sort.dir };
    if (CoinParse.isSymbol(p.sym)) out.sym = p.sym;
    if (typeof p.dtab === "string" && DetailTabs.IDS.has(p.dtab)) out.dtab = p.dtab;
    if (p.chart && typeof p.chart === "object") out.chart = p.chart;
    return out;
  }

  const fromText = text => { const r = CoinParse.parse(text); return { tab: "watch", watch: r.symbols, bad: r.bad }; };
  function demo(key) {
    if (!Object.hasOwn(DEMOS, key)) return { error: true };
    const d = DEMOS[key], r = fromText(d.text);
    return { ...r, tab: d.tab, sym: d.sym || r.watch[0], dtab: d.dtab };
  }

  // Reads hash / query once, then strips them so F5 does not re-apply.
  async function readIncoming() {
    const q = new URLSearchParams(location.search), hash = location.hash.slice(1);
    let res = null;
    try {
      if (hash) res = sanitize(await ShareCodec.decode(decodeURIComponent(hash))) || { error: true };
      else if (q.has("data")) { const d = q.get("data"); res = sanitize(await ShareCodec.decode(d)) || fromText(d); }
      else if (q.has("demo")) res = demo(q.get("demo"));
      if (q.has("tab") && Board.TAB_IDS.has(q.get("tab")) && !(res && res.error)) (res ||= {}).tab = q.get("tab");
    } catch { res = { error: true }; }
    if (hash || q.has("data") || q.has("demo") || q.has("tab")) history.replaceState(null, "", location.pathname);
    return res;
  }

  return { copyLink, readIncoming, demo, fromText };
})();

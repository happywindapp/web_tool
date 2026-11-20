// Example sentences with human translations from Tatoeba (api.tatoeba.org, CC BY 2.0 FR, ADR #22). Only the looked-up term is sent, and only on click.
const TrExamples = (() => {
  const BASE = "https://api.tatoeba.org/v1/sentences", MAX = 3;
  const ISO3 = { vi: "vie", en: "eng", zh: "cmn", "zh-Hant": "cmn", ja: "jpn", ko: "kor", fr: "fra", de: "deu", es: "spa", pt: "por", it: "ita", ru: "rus", th: "tha", id: "ind" };
  const cache = new Map();
  const str = v => typeof v === "string" ? v.trim() : "";

  // Exact-phrase search for sentences in `from` that have a translation in `to`; "" for a language Tatoeba codes do not cover.
  const url = (term, from, to) => {
    const q = str(term).replace(/["\\]/g, " ").trim();
    return q && ISO3[from] && ISO3[to] ? BASE + "?" + new URLSearchParams({ lang: ISO3[from], q: '"' + q + '"', "trans:lang": ISO3[to], showtrans: "matching", sort: "relevance", limit: "6" }) : "";
  };

  // API JSON → [{ text, tr }] (≤ 3, approved only, direct translation first), text only.
  function parse(json) {
    const out = [];
    for (const s of json && Array.isArray(json.data) ? json.data : []) {
      if (!s || typeof s !== "object" || s.is_unapproved === true || !str(s.text)) continue;
      const trs = (Array.isArray(s.translations) ? s.translations.flat() : []).filter(t => t && typeof t === "object" && str(t.text) && t.is_unapproved !== true);
      const tr = trs.find(t => t.is_direct === true) || trs[0];
      if (tr) out.push({ text: str(s.text), tr: str(tr.text) });
      if (out.length >= MAX) break;
    }
    return out;
  }

  async function search(term, from, to) {
    const u = url(term, from, to);
    if (!u) return null;
    if (cache.has(u)) return cache.get(u);
    let r;
    try { r = await fetch(u, { credentials: "omit", referrerPolicy: "no-referrer" }); }
    catch { throw new Error(T("Không kết nối được Tatoeba (api.tatoeba.org) — mất mạng hoặc bị chặn.")); }
    if (!r.ok) throw new Error(T("Tatoeba báo lỗi HTTP {code}.", { code: r.status }));
    let j;
    try { j = await r.json(); } catch { throw new Error(T("Tatoeba trả về dữ liệu lạ.")); }
    const v = parse(j);
    cache.set(u, v);
    return v;
  }

  return { url, parse, search };
})();

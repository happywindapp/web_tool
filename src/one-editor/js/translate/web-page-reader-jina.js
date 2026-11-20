// Translate a web page (ADR #22): a tab holding one http(s) URL ⇒ Jina Reader (r.jina.ai) returns the page as Markdown. Only the URL is sent, after a confirm.
const WebPage = (() => {
  const BASE = "https://r.jina.ai/", CACHE_MAX = 20, TIMEOUT_MS = 60000, cache = new Map();
  const KEEP = /(!\[|\]\((?:[^()\s]|\([^()\s]*\))*(?:\s+"[^"]*")?\)|`[^`\n]+`|<https?:\/\/[^>\s]+>|https?:\/\/[^\s)\]]+|\s*\|\s*|\[|\])/;
  let consent = false;
  const err = (msg, extra) => Object.assign(new Error(msg), extra);

  // The whole tab is one http(s) URL (no user:password@) ⇒ that URL without its #fragment, else "".
  function urlOf(text) {
    const t = String(text).length > 2100 ? "" : String(text).trim();
    if (!/^https?:\/\/[^\s/]+\.[^\s]*$/i.test(t)) return "";
    try { const u = new URL(t); u.hash = ""; return u.username || u.password ? "" : u.href; } catch { return ""; }
  }

  // Jina JSON → { title, url, lang, md }; the title becomes a heading when the content has none.
  function parse(j) {
    const d = j && j.data;
    if (!d || typeof d.content !== "string") throw err(T("Jina Reader không lấy được trang: {msg}", { msg: String(j?.readableMessage || j?.message || j?.code || "?").slice(0, 200) }));
    const title = String(d.title || "").replace(/\s+/g, " ").trim(), md = d.content.trim();
    return { title, url: urlOf(String(d.url || "")), lang: TrLang.normalize(String(d.metadata?.lang || "")), md: title && !/^#{1,2}\s/.test(md) ? "# " + title + "\n\n" + md : md };
  }

  // TrChunk.plan, then link targets, image markers, inline code, bare URLs, table pipes and the spaces around pieces are kept out of what the translator sees.
  function plan(md, max) {
    const out = [], keep = t => { if (t) out.push({ t, tr: false }); };
    for (const s of TrChunk.plan(md, max)) {
      if (!s.tr) { out.push(s); continue; }
      s.t.split(KEEP).forEach((p, i) => {
        const m = /^(\s*)([\s\S]*?)(\s*)$/.exec(p);
        if (i % 2 || !/\p{L}/u.test(p)) return keep(p);
        keep(m[1]); out.push({ t: m[2], tr: true }); keep(m[3]);
      });
    }
    return out;
  }
  const plain = md => TrChunk.units(plan(md, 4000)).join(" ");

  // Long page: the first pieces that fit `budget` chars are translated, the rest stays as is → { segs, done, total }.
  function cap(segs, budget) {
    let used = 0, done = 0, total = 0, over = false;
    const out = segs.map(s => {
      if (!s.tr) return s;
      total++;
      if (!over && used + s.t.length <= budget) { used += s.t.length; done++; return s; }
      over = true;
      return { t: s.t, tr: false };
    });
    return { segs: out, done, total };
  }
  // A translated piece goes back into Markdown: one line, and no character that would start a link, image, code, table cell or HTML.
  const esc = s => String(s).replace(/\s*[\r\n]+\s*/g, " ").replace(/[\\`[\]<>|]/g, "\\$&");

  function ask(url) {
    return consent ||= confirm(T("Gửi địa chỉ trang tới Jina Reader (r.jina.ai) để lấy nội dung rồi dịch?\n\n{url}\n\n• Chỉ gửi địa chỉ (URL); Jina tải trang từ máy chủ của họ nên trang nội bộ / cần đăng nhập không đọc được.\n• Đừng gửi URL có token / mật khẩu.\n• Chỉ hỏi 1 lần cho tới khi đóng trang.", { url }));
  }

  async function get(url, headers) {
    let r;
    try { r = await fetch(BASE + url, { headers: { Accept: "application/json", ...headers }, credentials: "omit", referrerPolicy: "no-referrer", signal: AbortSignal.timeout(TIMEOUT_MS) }); }
    catch (e) { throw err(e?.name === "TimeoutError" ? T("Jina Reader không trả lời sau {s} giây — thử lại sau.", { s: TIMEOUT_MS / 1000 }) : T("Không kết nối được Jina Reader (r.jina.ai) — mất mạng hoặc bị chặn.")); }
    if (r.status === 429) throw err(T("Jina Reader: gửi quá nhiều yêu cầu — chờ 1 phút rồi thử lại."), { warn: true });
    try { return await r.json(); } catch { throw err(T("Jina Reader trả về dữ liệu lạ (HTTP {status}).", { status: r.status })); }
  }

  // The article only (no menus / ads, ~6× less text on news sites); a page without <main> / <article> gets a 422 ⇒ the whole page.
  const MAIN = { "X-Target-Selector": "main, article, [role=main]", "X-Remove-Selector": "nav, header, footer, aside, form, iframe, [class*=ad-feedback], [class*=advert], [id*=advert]" };
  async function fetchPage(url) {
    let j = await get(url, MAIN);
    if (typeof j?.data?.content !== "string" || !j.data.content.trim()) j = await get(url, {});
    return parse(j);
  }
  // Cached as a promise, so a second ▶ while loading does not send again; a failure is forgotten.
  function load(url) {
    if (cache.has(url)) return cache.get(url);
    if (!ask(url)) return Promise.reject(err(T("Chưa dịch — chưa đồng ý gửi địa chỉ trang tới Jina Reader, không có gì được gửi đi."), { warn: true }));
    const p = fetchPage(url).catch(e => { cache.delete(url); throw e; });
    cache.set(url, p);
    if (cache.size > CACHE_MAX) cache.delete(cache.keys().next().value);
    return p;
  }

  const GOOGLE = { zh: "zh-CN", "zh-Hant": "zh-TW" };
  const googleUrl = (url, to) => "https://translate.google.com/translate?" + new URLSearchParams({ sl: "auto", tl: GOOGLE[to] || to || "vi", u: url });

  return { urlOf, parse, plan, plain, cap, esc, load, agreed: () => consent, googleUrl };
})();

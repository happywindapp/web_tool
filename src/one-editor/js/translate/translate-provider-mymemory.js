// MyMemory (api.mymemory.translated.net, ADR #22): text goes in the query string, ~500 bytes per request, ~5,000 chars/day anonymous. Only used after the user agrees.
const MyMemory = (() => {
  const BASE = "https://api.mymemory.translated.net/get", MAX_BYTES = 450, MAX_CHARS = 5000;
  const CODE = { zh: "zh-CN", "zh-Hant": "zh-TW" };
  const code = c => CODE[c] || c;
  const url = (q, from, to) => BASE + "?" + new URLSearchParams({ q, langpair: code(from) + "|" + code(to) });
  const decode = s => String(s).replace(/&(#\d+|#x[0-9a-f]+|quot|amp|lt|gt|apos);/gi, (m, e) => {
    const k = e.toLowerCase();
    if (k[0] === "#") { const n = k[1] === "x" ? parseInt(k.slice(2), 16) : +k.slice(1); return n > 0 && n < 0x110000 ? String.fromCodePoint(n) : m; }
    return { quot: '"', amp: "&", lt: "<", gt: ">", apos: "'" }[k];
  });
  const err = (msg, extra) => Object.assign(new Error(msg), extra);
  const quota = () => err(T("MyMemory: đã hết quota miễn phí hôm nay (~5.000 ký tự / ngày) — thử lại ngày mai hoặc dùng Chrome / Edge có bộ dịch trên máy."), { quota: true });

  // Response JSON → translated text; quota / errors throw with a clear message.
  function parse(j) {
    if (!j || typeof j !== "object") throw err(T("MyMemory trả về dữ liệu lạ."));
    const text = j.responseData && typeof j.responseData.translatedText === "string" ? j.responseData.translatedText : "";
    if (j.quotaFinished === true || /MYMEMORY WARNING/i.test(text)) throw quota();
    if (String(j.responseStatus) !== "200") throw err(T("MyMemory báo lỗi: {msg}", { msg: String(j.responseDetails || j.responseStatus).slice(0, 200) }));
    return decode(text);
  }

  // Characters sent today (kept on this device only) — shown so the user sees the daily quota coming.
  const today = () => new Date().toISOString().slice(0, 10);
  const used = () => { const u = Prefs.get("tr.mm", null); return u && u.d === today() ? +u.n || 0 : 0; };
  const addUsed = n => Prefs.set("tr.mm", { d: today(), n: used() + n });

  async function one(q, from, to) {
    let r;
    try { r = await fetch(url(q, from, to), { credentials: "omit", referrerPolicy: "no-referrer" }); }
    catch { throw err(T("Không kết nối được MyMemory — mất mạng hoặc bị chặn.")); }
    if (r.status === 429) throw quota();
    let j;
    try { j = await r.json(); } catch { throw err(T("MyMemory trả về dữ liệu lạ.")); }
    const out = parse(j);
    addUsed(q.length);
    return out;
  }

  return { one, parse, url, decode, used, MAX_BYTES, MAX_CHARS };
})();

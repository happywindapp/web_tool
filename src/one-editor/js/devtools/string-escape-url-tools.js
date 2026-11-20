// JSON string escape / unescape, and URL parsing (parts + query parameters, decoded, "+" = space). Pure — nothing is sent anywhere.
const StrTools = (() => {
  const jsonEscape = t => JSON.stringify(t).slice(1, -1);

  // Accepts the inside of a JSON string, or a whole "quoted" literal; raw quotes and control characters are escaped first so pasted text still decodes.
  function jsonUnescape(t) {
    const s = t.trim(), body = /^"[\s\S]*"$/.test(s) && s.length > 1 ? s.slice(1, -1) : t;
    const safe = body.replace(/(\\*)"/g, (m, bs) => bs.length % 2 ? m : bs + "\\\"").replace(/\p{Cc}/gu, c => JSON.stringify(c).slice(1, -1));
    try { return JSON.parse("\"" + safe + "\""); } catch (e) { throw new Error(T("Chuỗi escape lỗi: {msg}", { msg: e.message })); }
  }

  const plain = s => { try { return decodeURIComponent(s); } catch { return s; } };
  const dec = s => plain(s.replace(/\+/g, " "));

  // Full URL, "…?a=1&b=2#x", or a bare "a=1&b=2" → { url: { protocol, … } | null, params: [[key, value]] }.
  function parseUrl(text) {
    const s = (String(text).split(/\r?\n/).map(l => l.trim()).find(Boolean) || "");
    let url = null, query = s, hash = "";
    if (/^[a-z][\w+.-]*:\/\//i.test(s)) {
      try {
        const u = new URL(s);
        url = { protocol: u.protocol.replace(/:$/, ""), host: u.hostname, port: u.port, path: plain(u.pathname), hash: plain(u.hash.slice(1)) };
        if (u.username) url.user = plain(u.username);
        query = u.search.slice(1);
      } catch { throw new Error(T("URL không hợp lệ: “{s}”.", { s: s.slice(0, 80) })); }
    } else {
      const h = s.indexOf("#");
      if (h >= 0) { hash = s.slice(h + 1); query = s.slice(0, h); }
      if (query.includes("?")) query = query.slice(query.indexOf("?") + 1);
      else if (!query.includes("=")) throw new Error(T("Không thấy URL hay query string (a=1&b=2) ở dòng đầu của tab."));
    }
    const params = query.split("&").filter(Boolean).map(kv => { const i = kv.indexOf("="); return i < 0 ? [dec(kv), ""] : [dec(kv.slice(0, i)), dec(kv.slice(i + 1))]; });
    if (!url && hash) url = { hash: plain(hash) };
    return { url, params };
  }

  // Repeated keys become arrays, so the JSON keeps every value.
  function queryObject(params) {
    const o = Object.create(null);
    for (const [k, v] of params) o[k] = Object.hasOwn(o, k) ? [].concat(o[k], v) : v;
    return o;
  }

  return { jsonEscape, jsonUnescape, parseUrl, queryObject };
})();

// Recipe operations (CyberChef style): each takes text or bytes (Uint8Array) and returns text or bytes; reuses LineOps / StrTools / Jwt / DevNum. No eval.
const RecipeOps = (() => {
  const MAX_OUT = 50 * 1024 * 1024;
  const enc = new TextEncoder();
  const bytes = v => typeof v === "string" ? enc.encode(v) : v;
  function text(v) {
    if (typeof v === "string") return v;
    try { return new TextDecoder("utf-8", { fatal: true }).decode(v); } catch { throw new Error(T("Dữ liệu nhị phân, không phải văn bản UTF-8 — thêm bước “Gunzip” / “Sang Hex” trước.")); }
  }
  const b64 = u => { let s = ""; for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode(...u.subarray(i, i + 0x8000)); return btoa(s); };
  function unb64(t) {
    const s = t.replace(/\s+/g, "").replace(/-/g, "+").replace(/_/g, "/");
    if (!/^[A-Za-z0-9+/]*={0,2}$/.test(s) || s.replace(/=+$/, "").length % 4 === 1) throw new Error(T("Không phải Base64 hợp lệ."));
    const bin = atob(s.padEnd(s.length + (4 - s.length % 4) % 4, "="));
    return Uint8Array.from(bin, c => c.charCodeAt(0));
  }
  function unhex(t) {
    const s = t.replace(/0x|\\x|[\s:,-]/gi, "");
    if (!/^(?:[0-9a-f]{2})*$/i.test(s)) throw new Error(T("Không phải chuỗi hex hợp lệ (cần số chẵn ký tự 0-9 a-f)."));
    return Uint8Array.from(s.match(/../g) || [], h => parseInt(h, 16));
  }

  // Through CompressionStream / DecompressionStream, stopping past 50 MB (zip bomb).
  async function stream(v, fmt, inflate) {
    const s = new Blob([bytes(v)]).stream().pipeThrough(inflate ? new DecompressionStream(fmt) : new CompressionStream(fmt)), r = s.getReader(), parts = [];
    let n = 0;
    try {
      for (;;) {
        const { done, value } = await r.read();
        if (done) break;
        n += value.length;
        if (n > MAX_OUT) { r.cancel().catch(() => {}); throw Object.assign(new Error(T("Kết quả vượt {mb} MB — dừng (chống zip bomb).", { mb: MAX_OUT / 1048576 })), { mine: true }); }
        parts.push(value);
      }
    } catch (e) { if (e.mine) throw e; throw new Error(T("Không giải nén được ({fmt}): dữ liệu không đúng định dạng.", { fmt })); }
    const out = new Uint8Array(n);
    let at = 0;
    for (const p of parts) { out.set(p, at); at += p.length; }
    return out;
  }

  const HEX = Array.from({ length: 256 }, (x, i) => i.toString(16).padStart(2, "0"));
  function toHex(u, sep) {
    if (u.length > MAX_OUT / 3) throw new Error(T("Quá lớn để đổi sang hex (> {mb} MB).", { mb: Math.floor(MAX_OUT / 3 / 1048576) }));
    const out = new Array(u.length);
    for (let i = 0; i < u.length; i++) out[i] = HEX[u[i]];
    return out.join(sep);
  }
  async function hash(v, alg) {
    const d = await crypto.subtle.digest(alg, bytes(v));
    return [...new Uint8Array(d)].map(b => b.toString(16).padStart(2, "0")).join("");
  }
  const lines = (v, fn) => { const t = text(v), nl = t.endsWith("\n"); return fn(t.replace(/\n$/, "").split("\n")).join("\n") + (nl ? "\n" : ""); };
  const unesc = s => s.replace(/\\(n|t|\\)/g, (a, c) => c === "n" ? "\n" : c === "t" ? "\t" : "\\");
  function regex(src, flags) { try { return new RegExp(src, flags); } catch (e) { throw new Error(T("Regex lỗi: {msg}", { msg: e.message })); } }
  const json = (v, indent) => { const r = JsonTool.parse(text(v)); if (!r.ast) throw new Error(T("Chưa có JSON.")); return JsonTool.stringify(r.ast, indent) + (indent ? "\n" : ""); };

  // args: [{ k, label, type: "text" | "check" | "select", def, options? }].
  const OPS = {
    b64dec: { label: "Từ Base64", group: "Mã hoá", run: v => unb64(text(v)) },
    b64enc: { label: "Sang Base64", group: "Mã hoá", run: v => b64(bytes(v)) },
    b64url: { label: "Sang Base64URL", group: "Mã hoá", run: v => b64(bytes(v)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "") },
    hexdec: { label: "Từ Hex", group: "Mã hoá", run: v => unhex(text(v)) },
    hexenc: { label: "Sang Hex", group: "Mã hoá", args: [{ k: "sep", label: "Ngăn cách", type: "text", def: " " }], run: (v, a) => toHex(bytes(v), a.sep ?? "") },
    urldec: { label: "URL decode", group: "Mã hoá", run: v => LineOps.text("urlDec", text(v)) },
    urlenc: { label: "URL encode", group: "Mã hoá", run: v => LineOps.text("urlEnc", text(v)) },
    htmldec: { label: "HTML entity decode", group: "Mã hoá", run: v => LineOps.text("htmlDec", text(v)) },
    htmlenc: { label: "HTML entity encode", group: "Mã hoá", run: v => LineOps.text("htmlEnc", text(v)) },
    gunzip: { label: "Gunzip", group: "Nén", run: v => stream(v, "gzip", true) },
    inflate: { label: "Inflate (zlib)", group: "Nén", run: v => stream(v, "deflate", true) },
    inflateRaw: { label: "Inflate (raw deflate)", group: "Nén", run: v => stream(v, "deflate-raw", true) },
    gzip: { label: "Gzip", group: "Nén", run: v => stream(v, "gzip", false) },
    deflate: { label: "Deflate (zlib)", group: "Nén", run: v => stream(v, "deflate", false) },
    json: { label: "JSON format", group: "Dữ liệu", run: v => json(v, "  ") },
    jsonMin: { label: "JSON gọn 1 dòng", group: "Dữ liệu", run: v => json(v, "") },
    jsonEsc: { label: "JSON escape", group: "Dữ liệu", run: v => StrTools.jsonEscape(text(v)) },
    jsonUnesc: { label: "JSON unescape", group: "Dữ liệu", run: v => StrTools.jsonUnescape(text(v)) },
    jwt: { label: "JWT decode (không kiểm chữ ký)", group: "Dữ liệu", run: v => DevReport.jwt(text(v)).text },
    x509: { label: "Chứng chỉ X.509 → chi tiết", group: "Dữ liệu", run: v => X509Op.recipe(v) },
    protobuf: { label: "Protobuf thô → cây field", group: "Dữ liệu", run: v => ProtoOp.recipe(v) },
    epoch: { label: "Epoch → ISO (UTC)", group: "Dữ liệu", run: v => text(v).replace(/\b\d{10}(?:\d{3})?\b/g, m => { const ms = DevNum.epochMs(m); return ms ? DevNum.iso(ms) : m; }) },
    hash: { label: "Hash", group: "Dữ liệu", args: [{ k: "alg", label: "Thuật toán", type: "select", def: "SHA-256", options: ["SHA-1", "SHA-256", "SHA-384", "SHA-512"] }], run: (v, a) => hash(v, a.alg) },
    replace: { label: "Thay (regex)", group: "Văn bản", args: [{ k: "find", label: "Tìm", type: "text", def: "" }, { k: "repl", label: "Thay bằng", type: "text", def: "" }, { k: "flags", label: "Cờ", type: "text", def: "g" }],
      run: (v, a) => a.find ? text(v).replace(regex(a.find, a.flags || ""), unesc(a.repl || "")) : text(v) },
    filter: { label: "Lọc dòng (regex)", group: "Văn bản", args: [{ k: "find", label: "Regex", type: "text", def: "" }, { k: "invert", label: "Loại", type: "check", def: false }],
      run: (v, a) => { const re = regex(a.find || "", "i"); return lines(v, l => l.filter(s => re.test(s) !== !!a.invert)); } },
    sort: { label: "Sắp xếp dòng", group: "Văn bản", run: v => lines(v, l => LineOps.lines("sortAsc", l)) },
    unique: { label: "Bỏ dòng trùng", group: "Văn bản", run: v => lines(v, l => LineOps.lines("unique", l)) },
    upper: { label: "CHỮ HOA", group: "Văn bản", run: v => text(v).toLocaleUpperCase() },
    lower: { label: "chữ thường", group: "Văn bản", run: v => text(v).toLocaleLowerCase() },
    trim: { label: "Bỏ khoảng trắng đầu / cuối", group: "Văn bản", run: v => text(v).trim() },
  };

  return { OPS, text, bytes, MAX_OUT };
})();

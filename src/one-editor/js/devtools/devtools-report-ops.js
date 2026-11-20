// ▶ ops "jwt" and "url-parts": the result tab's text is JSON (download / copy / share / find), its pane (PvReport) shows tables built from that JSON — also after F5.
const DevReport = (() => {
  const view = (op, data) => ({ kind: "report", op, data });
  const json = o => JSON.stringify(o, null, 2) + "\n";

  // Header / payload go through the tolerant AST, which keeps raw numbers: a 19-digit id stays exact in the text and the code blocks.
  const ast = s => JsonTool.parse(s).ast;
  const pick = (n, k) => n && n.t === "obj" ? n.items.find(it => it.k === k)?.v : null;
  function jwtData(text) {
    const a = ast(text), code = k => pick(a, k) ? JsonTool.stringify(pick(a, k), "  ") : "";
    return { ...JSON.parse(text), code: { header: code("header"), payload: code("payload") } };
  }

  function jwt(text) {
    const o = Jwt.decode(text), NL = String.fromCharCode(10);
    const out = "{" + NL + '  "header": ' + JsonTool.stringify(ast(o.raw.header), "  ", 1) + "," + NL + '  "payload": ' + JsonTool.stringify(ast(o.raw.payload), "  ", 1) + "," + NL
      + '  "signature": ' + JSON.stringify(o.signature) + NL + "}" + NL;
    return { text: out, view: view("jwt", jwtData(out)), notes: [T("JWT chỉ được giải mã trên máy — chữ ký KHÔNG được kiểm.")] };
  }

  function url(text) {
    const r = StrTools.parseUrl(text), o = r.url ? { url: r.url, query: StrTools.queryObject(r.params) } : { query: StrTools.queryObject(r.params) };
    return { text: json(o), view: view("url-parts", { ...o, params: r.params }) };
  }

  // After F5 the pane is rebuilt from the saved JSON text (no re-run, the source may be gone).
  function restore(doc) {
    try { const t = Docs.text(doc); return view(doc.link.op, doc.link.op === "jwt" ? jwtData(t) : JSON.parse(t)); }
    catch { return { kind: "report", empty: true }; }
  }

  const row = (c, s = "") => ({ c, s }), NL = String.fromCharCode(10);
  const STATE = { exp: { bad: "✖ Đã hết hạn", good: "✔ Còn hạn" }, nbf: { bad: "✖ Chưa có hiệu lực", good: "✔ Đã có hiệu lực" } };

  // Sections are built when drawn, so they follow the UI language: { title, warn, sections: [{ title, rows?: [{ c: cells, s: state }], code? }] }.
  function build(r, now = Date.now()) {
    const d = r.data || {};
    if (r.op === "jwt") {
      const h = d.header || {}, claims = Jwt.claims(d.payload, now);
      return {
        title: T("JWT · {alg} · chữ ký chưa kiểm", { alg: h.alg || "?" }),
        warn: T("Chỉ giải mã — chữ ký KHÔNG được kiểm (không có khoá). Đừng tin payload khi server chưa verify; đừng để token thật trong ghi chú / link chia sẻ."),
        sections: [
          { title: T("Thời hạn"), rows: claims.map(c => row([c.k, String(c.v), c.utc + NL + c.local, c.rel + (STATE[c.k] ? " · " + T(STATE[c.k][c.state]) : "")], c.state)) },
          { title: "Header", code: d.code?.header || JSON.stringify(h, null, 2) },
          { title: "Payload", code: d.code?.payload || JSON.stringify(d.payload, null, 2) },
          { title: T("Chữ ký"), rows: [row(["alg", String(h.alg ?? "")]), row([T("Độ dài"), T("{n} byte", { n: d.signature?.bytes ?? 0 })]), row([T("Đã kiểm"), T("Không — cần khoá bí mật / khoá công khai ở server")], "bad")] },
        ],
      };
    }
    const params = Array.isArray(d.params) ? d.params : Object.entries(d.query || {}).flatMap(([k, v]) => [].concat(v).map(x => [k, String(x)]));
    const u = d.url || {};
    return {
      title: T("URL · {n} tham số", { n: params.length }),
      sections: [
        { title: T("Thành phần"), rows: ["protocol", "user", "host", "port", "path", "hash"].filter(k => u[k]).map(k => row([k, String(u[k])])) },
        { title: T("Tham số query"), head: ["#", T("Khoá"), T("Giá trị")], rows: params.map(([k, v], i) => row([String(i + 1), k, v])) },
      ],
    };
  }

  return { jwt, url, restore, build };
})();

// "curl-convert" op: a curl command → code for the picked target (fetch by default), a .http request → curl; pane: method, URL, query, headers, body with secrets masked. Never sends the request.
const CurlOp = (() => {
  const OP = "curl-convert";
  const NAMES = { fetch: "fetch", axios: "axios", go: "Go net/http", csharp: "C# HttpClient", python: "Python requests", powershell: "PowerShell", http: ".http", curl: "curl" };
  const DEF = () => ({ target: "fetch" });
  const clean = o => ({ target: CurlConv.TARGETS.includes(o?.target) ? o.target : "fetch" });
  const opts = srcId => PowerUi.opts(srcId, OP, clean, DEF);
  const ERR = { noCurl: "Không thấy lệnh curl — tab cần bắt đầu bằng “curl …” (hoặc 1 request .http: GET https://…).", noUrl: "Lệnh curl không có URL.", noHttp: "Không thấy dòng request .http (METHOD URL)." };
  const NOTE = {
    noScheme: "URL thiếu http(s):// — đã thêm http://.", fileBody: "Body đọc từ file “{v}” — code sinh ra chỉ ghi tên file, không đọc nội dung.",
    proxy: "Có proxy {v} — code sinh ra không mang theo, tự cấu hình.", insecure: "-k (bỏ kiểm chứng chỉ TLS) — code sinh ra vẫn kiểm chứng chỉ.",
    clientCert: "Có chứng chỉ client (-E / --cert / --key) — code sinh ra không mang theo, tự cấu hình.", badJson: "Body khai báo JSON nhưng không phải JSON hợp lệ — giữ nguyên văn.",
    moreRequests: "File .http có nhiều request (###) — chỉ đổi request đầu.", extraUrl: "Bỏ qua URL thừa “{v}” — chỉ đổi URL đầu.", cookieFile: "-b “{v}” là file cookie — bỏ qua.",
  };
  const noteText = n => T(NOTE[n.code] || n.code, { v: n.v || "" });
  const hasSecret = req => req.headers.some(([k]) => CurlConv.SECRET.test(k)) || req.query.some(([k]) => CurlConv.SECRET.test(k));

  function run(t, c) {
    const http = CurlConv.isHttp(t);
    let req;
    try { req = http ? CurlConv.parseHttp(t) : CurlConv.parse(t); } catch (e) { throw Object.assign(new Error(T(ERR[e.code] || e.message)), { warn: true }); }
    const o = opts(c.id), target = http ? "curl" : o.target;
    PowerTools.state(c.id, OP).lang = CurlConv.LANG[target];
    const notes = [T("{method} {url} → {target} — không gửi request.", { method: req.method, url: req.base, target: NAMES[target] }), ...req.notes.map(noteText)];
    return { text: CurlGen.gen(req, target).replace(/\n?$/, "\n"), notes, view: { kind: "curl", srcId: c.id, req, http, target, o } };
  }

  function set(srcId, o) {
    PowerUi.saveOpts(srcId, OP, clean(o));
    const src = Docs.get(srcId);
    if (src) OutputLink.run(src, OP, true);
  }

  async function share(srcId, secret) {
    const src = Docs.get(srcId);
    if (!src) { StatusBar.msg(T("Tab nguồn của kết quả này đã đóng."), "warn"); return; }
    await PowerUi.shareLink({ v: 1, views: [[{ n: src.name, l: src.lang || "", t: Docs.text(src) }], []], run: OP, opts: opts(srcId) },
      n => T("🔗 Đã chép link cURL ({n} ký tự) — mở link là đổi lại.", { n }) + (secret ? " " + T("Link chứa nguyên văn token / cookie — xoá trước khi gửi người khác.") : ""));
  }

  return { run, set, share, NAMES, hasSecret, noteText };
})();

const PvCurl = {
  create(p) {
    const { mk, button } = PowerUi;
    const target = mk("select", "cu-target"), eye = button("", () => { v.reveal = !v.reveal; if (v.last) render(); });
    const link = button("", () => v.last && CurlOp.share(v.last.srcId, CurlOp.hasSecret(v.last.req)));
    const v = { el: mk("div", "pv-curl"), tools: [target, eye, link], last: null, reveal: false };
    target.onchange = () => v.last && CurlOp.set(v.last.srcId, { target: target.value });
    const masked = (k, val) => CurlConv.SECRET.test(k) && !v.reveal;
    const cell = (k, val) => mk("td", masked(k, val) ? "cu-mask" : "", masked(k, val) ? "••••" : val);

    function table(title, rows) {
      if (!rows.length) return [];
      const tb = mk("table", "rx-tab cu-tab"), head = mk("tr");
      [T("Tên"), T("Giá trị")].forEach(x => head.append(mk("th", "", x)));
      tb.append(head);
      for (const [k, val] of rows) { const tr = mk("tr"); tr.append(mk("td", "", k), cell(k, val)); tb.append(tr); }
      return [mk("h4", "cu-head", title + " (" + rows.length + ")"), tb];
    }

    function render() {
      const d = v.last, r = d.req, secret = CurlOp.hasSecret(r);
      p.type.textContent = d.http ? T(".http → curl") : T("cURL → {target}", { target: CurlOp.NAMES[d.target] });
      eye.hidden = !secret;
      eye.textContent = v.reveal ? T("🙈 Ẩn secret") : T("👁 Hiện secret");
      target.disabled = d.http;
      target.title = d.http ? T("Tab .http luôn đổi sang curl") : T("Ngôn ngữ / thư viện của code sinh ra");
      const url = r.base + (r.query.length ? "?" + r.query.map(([k, val]) => k + (val !== "" ? "=" + (masked(k, val) ? "••••" : val) : "")).join("&") : "");
      const parts = [mk("div", "cu-line", null)];
      parts[0].append(mk("span", "cu-method cu-m-" + r.method.toLowerCase(), r.method), mk("span", "cu-url", url));
      if (r.notes.length) { const ul = mk("ul", "cu-notes"); r.notes.forEach(n => ul.append(mk("li", "", "⚠ " + CurlOp.noteText(n)))); parts.push(ul); }
      parts.push(...table(T("Query"), r.query), ...table(T("Header"), r.headers), ...table(T("Form"), r.form.map(([k, val, f]) => [k, (f ? "@" : "") + val])));
      if (r.body !== null && r.body !== undefined) parts.push(mk("h4", "cu-head", T("Body") + (r.bodyKind ? " · " + r.bodyKind : "")), mk("pre", "cu-body", r.pretty ?? r.body));
      parts.push(mk("div", "rp-none", T("Chỉ đổi văn bản — One Editor không bao giờ gửi request này.")));
      v.el.replaceChildren(...parts);
    }

    v.labels = () => {
      target.replaceChildren(...CurlConv.TARGETS.map(k => new Option(CurlOp.NAMES[k], k)));
      if (v.last) target.value = v.last.o.target;
      link.textContent = T("🔗 Link"); link.title = T("Chép link chia sẻ: lệnh curl + đích đã chọn");
      eye.title = T("Hiện / ẩn giá trị Authorization, Cookie, token… trong pane");
      if (v.last) render();
    };
    v.show = d => { v.last = d; if (document.activeElement !== target) target.value = d.o.target; render(); return true; };
    return v;
  },
};

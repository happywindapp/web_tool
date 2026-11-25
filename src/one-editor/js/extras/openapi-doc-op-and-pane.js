// "openapi-doc" op: an OpenAPI 3.x / Swagger 2.0 tab (YAML / JSON) → Markdown endpoint list; pane: text filter, tags, endpoints drawn on first open (params, request body, responses as schema trees). No "Try it out".
const OpenApiOp = (() => {
  const OP = "openapi-doc", MAX = 5 * 1048576;
  const DEF = () => ({ q: "" });
  const clean = o => ({ q: typeof o?.q === "string" ? o.q.slice(0, 200) : "" });
  const opts = srcId => PowerUi.opts(srcId, OP, clean, DEF);
  const NOTE = { external: "$ref ngoài file “{v}” — không giải.", missing: "$ref “{v}” không trỏ tới đâu.", depth: "Schema lồng quá {v} tầng — cắt.", budget: "Spec quá lớn (quá {v} nút schema) — cắt bớt.", opsCut: "Chỉ hiện {v} endpoint đầu." };
  const noteText = n => T(NOTE[n.code] || n.code, { v: typeof n.v === "number" ? I18n.num(n.v) : n.v });
  const warn = (msg, line = 0) => Object.assign(new Error(msg), { warn: true, line });

  function parse(t) {
    if (t.length > MAX) throw warn(T("Spec quá {mb} MB — Tài liệu API chỉ đọc tối đa {mb} MB.", { mb: MAX / 1048576 }));
    const json = /^\s*\{/.test(t);
    try { return json ? JSON.parse(t) : jsyaml.load(t); }
    catch (e) { throw warn(T("Spec không đọc được ({fmt}): {msg}", { fmt: json ? "JSON" : "YAML", msg: e.reason || e.message }), e.mark ? e.mark.line + 1 : 0); }
  }

  function run(t, c) {
    let doc;
    try { doc = OpenApiDoc.build(parse(t)); } catch (e) { if (e.code === "notSpec") throw warn(T("Không phải OpenAPI 3.x / Swagger 2.0 — cần khoá openapi: 3.x hoặc swagger: \"2.0\" ở gốc.")); throw e; }
    const o = opts(c.id), notes = [T("{n} endpoint · {g} nhóm.", { n: I18n.num(doc.count), g: doc.groups.length }), ...doc.notes.map(noteText)];
    return { text: OpenApiDoc.markdown(doc) + "\n", notes, view: { kind: "openapi", srcId: c.id, doc, o } };
  }

  async function share(srcId) {
    const src = Docs.get(srcId);
    if (!src) { StatusBar.msg(T("Tab nguồn của kết quả này đã đóng."), "warn"); return; }
    await PowerUi.shareLink({ v: 1, views: [[{ n: src.name, l: src.lang || "", t: Docs.text(src) }], []], run: OP, opts: opts(srcId) }, n => T("🔗 Đã chép link Tài liệu API ({n} ký tự) — mở link là dựng lại + giữ ô lọc.", { n }));
  }

  return { run, share, noteText, save: (srcId, q) => PowerUi.saveOpts(srcId, OP, clean({ q })) };
})();

const PvOpenApi = {
  create(p) {
    const { mk, button } = PowerUi;
    const q = mk("input", "dq-input oa-q", null, { type: "search", spellcheck: false, autocomplete: "off" }), link = button("", () => v.last && OpenApiOp.share(v.last.srcId));
    const v = { el: mk("div", "pv-openapi"), tools: [q, link], last: null };
    const MAX_LI = 3000;
    q.oninput = Dom.debounce(() => { if (!v.last) return; v.last.o = { q: q.value }; OpenApiOp.save(v.last.srcId, q.value); render(); }, 200);

    function schema(t, budget) {
      const ul = mk("ul", "oa-tree");
      for (const k of t.kids || []) {
        if (budget.n++ > MAX_LI) { ul.append(mk("li", "rp-none", "…")); budget.cut = true; break; }
        const li = mk("li", k.deprecated ? "oa-dep" : "");
        li.append(mk("span", "oa-key", k.key), mk("span", "oa-type", " " + OpenApiDoc.typeText(k)));
        if (k.required) li.append(mk("span", "oa-req", " *"));
        if (k.enum) li.append(mk("span", "oa-enum", " " + k.enum.join(" | ")));
        if (k.missing) li.append(mk("span", "x5-warn", " " + T("(không tìm thấy)")));
        if (k.desc) li.append(mk("span", "oa-desc", " — " + k.desc));
        if (k.kids && !k.circular) li.append(schema(k, budget));
        ul.append(li);
      }
      return ul;
    }
    const top = (t, budget) => { const box = mk("div", "oa-schema"); box.append(mk("span", "oa-type", OpenApiDoc.typeText(t))); if (t.kids && !t.circular) box.append(schema(t, budget)); return box; };
    const content = (list, budget) => list.flatMap(c => [mk("div", "oa-ct", c.type), ...(c.tree ? [top(c.tree, budget)] : [])]);

    function detail(e) {
      const parts = [], budget = { n: 0, cut: false };
      if (e.desc) parts.push(mk("div", "oa-desc", e.desc));
      if (e.params.length) {
        const tb = mk("table", "rx-tab oa-params"), head = mk("tr");
        [T("Tên"), T("Ở"), T("Kiểu"), T("Bắt buộc"), T("Mô tả")].forEach(x => head.append(mk("th", "", x)));
        tb.append(head);
        for (const x of e.params) { const tr = mk("tr", x.deprecated ? "oa-dep" : ""); [x.name, x.in, x.tree ? OpenApiDoc.typeText(x.tree) : "", x.required ? "✓" : "", x.desc].forEach(s => tr.append(mk("td", "", s))); tb.append(tr); }
        parts.push(mk("h5", "", T("Tham số")), tb);
      }
      if (e.body) parts.push(mk("h5", "", T("Request body") + (e.body.required ? " *" : "")), ...(e.body.desc ? [mk("div", "oa-desc", e.body.desc)] : []), ...content(e.body.content, budget));
      if (e.responses.length) {
        parts.push(mk("h5", "", T("Responses")));
        for (const r of e.responses) parts.push(mk("div", "oa-code oa-c" + String(r.code)[0], r.code + (r.desc ? " — " + r.desc : "")), ...content(r.content, budget));
      }
      if (budget.cut) parts.push(mk("div", "rp-none", T("Cây schema dài — pane chỉ vẽ {n} dòng đầu.", { n: I18n.num(MAX_LI) })));
      return parts;
    }

    function endpoint(e) {
      const box = mk("details", "oa-op" + (e.deprecated ? " oa-dep" : "")), sum = mk("summary");
      sum.append(mk("span", "oa-m oa-" + e.method.toLowerCase(), e.method), mk("span", "oa-path", e.path), mk("span", "oa-sum", e.summary));
      box.append(sum);
      box.addEventListener("toggle", () => { if (box.open && box.childElementCount === 1) box.append(...detail(e)); });
      return box;
    }

    function render() {
      const d = v.last, doc = d.doc, groups = OpenApiDoc.filter(doc, d.o.q), shown = groups.reduce((n, g) => n + g.ops.length, 0);
      p.type.textContent = T("Tài liệu API · {n} endpoint", { n: I18n.num(doc.count) }) + (d.o.q.trim() ? " · " + T("lọc còn {n}", { n: I18n.num(shown) }) : "");
      const head = mk("div", "oa-info");
      head.append(mk("strong", "", (doc.title || "API") + (doc.version ? " " + doc.version : "")), ...doc.servers.map(s => mk("div", "oa-server", s)));
      const notes = doc.notes.map(n => mk("div", "x5-warn", "⚠ " + OpenApiOp.noteText(n)));
      const list = groups.map(g => { const det = mk("details", "oa-tag"); det.open = groups.length <= 8 || !!d.o.q.trim(); const s = mk("summary", "", (g.tag || T("(không tag)")) + " · " + g.ops.length); det.append(s); if (g.desc) det.append(mk("div", "oa-desc", g.desc)); PowerUi.appendSliced(det, g.ops, endpoint, det); return det; });
      v.el.replaceChildren(head, ...notes, ...(list.length ? list : [mk("div", "rp-none", T("Không có endpoint nào khớp."))]), mk("div", "rp-none", T("Chỉ xem tài liệu — không gửi request.")));
    }

    v.labels = () => { q.placeholder = T("Lọc method / path / summary / tag"); q.title = T("Lọc endpoint (chuỗi thường, không regex)"); link.textContent = T("🔗 Link"); link.title = T("Chép link chia sẻ: spec + ô lọc"); if (v.last) render(); };
    v.show = d => { v.last = d; if (document.activeElement !== q) q.value = d.o.q; render(); return true; };
    return v;
  },
};

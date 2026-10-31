// Subset of the Structurizr DSL (no !include, scripts, deployment or dynamic views): statements → { model, views, styles, errors, warnings }. Messages are Vietnamese T() keys.
const StructurizrParser = (() => {
  const LEVELS = { person: "person", softwaresystem: "softwareSystem", container: "container", component: "component" };
  const PARENT = { person: null, softwareSystem: null, container: "softwareSystem", component: "container" };
  const BASE_TAG = { person: "Person", softwareSystem: "Software System", container: "Container", component: "Component" };
  const VIEW_KINDS = { systemlandscape: "systemLandscape", systemcontext: "systemContext", container: "container", component: "component" };
  const SKIPPED = /^(?:configuration|properties|perspectives|docs|adrs|terminology|branding|animation|users|scope|visibility)$/;
  const UNSUPPORTED_VIEW = /^(?:deployment|dynamic|filtered|custom|image)$/;

  const stripBlockComments = src => src.replace(/\/\*[\s\S]*?\*\//g, m => m.replace(/[^\n]/g, " "));

  function tokenize(text) {
    const toks = [], re = /"((?:[^"\\]|\\.)*)"?|-\/?>|[^\s{}"]*[!=]=[^\s{}"]*|[{}=]|[^\s{}="]+/g;
    let m;
    while ((m = re.exec(text))) {
      if (m[1] === undefined && (m[0].startsWith("//") || (m[0].startsWith("#") && !toks.length))) break;
      toks.push(m[1] !== undefined ? { v: m[1].replace(/\\(.)/g, "$1"), q: true } : { v: m[0], q: false });
    }
    return toks;
  }

  // One statement per line; a trailing backslash continues the line.
  function statements(src) {
    const out = [], lines = stripBlockComments(src).split("\n");
    for (let i = 0; i < lines.length; i++) {
      const line = i + 1;
      let text = lines[i];
      while (/\\\s*$/.test(text) && i + 1 < lines.length) text = text.replace(/\\\s*$/, " ") + lines[++i];
      const toks = tokenize(text);
      if (!toks.length) continue;
      // Split "x }" so a block end is always a statement of its own.
      const close = toks.length > 1 && !toks.at(-1).q && toks.at(-1).v === "}";
      if (close) { out.push({ line, toks: toks.slice(0, -1) }); out.push({ line, toks: [toks.at(-1)] }); }
      else out.push({ line, toks });
    }
    return out;
  }

  function parse(src) {
    const st = statements(src), errors = [], warnings = [];
    const ws = { name: "", description: "", elements: [], relationships: [], views: [], styles: { element: {}, relationship: {} }, errors, warnings };
    const byId = new Map(), pendingRels = [], warned = new Set();
    let i = 0, seq = 0;
    const isEnd = s => !s.toks[0].q && s.toks[0].v === "}";
    const opens = s => !s.toks.at(-1).q && s.toks.at(-1).v === "{";
    const words = s => (opens(s) ? s.toks.slice(0, -1) : s.toks).map(t => t.v);
    const warnOnce = (msg, args, line) => { const k = msg + JSON.stringify(args); if (!warned.has(k)) { warned.add(k); warnings.push({ line, msg, args }); } };

    function block(fn, startLine) {
      while (i < st.length) {
        const s = st[i++];
        if (isEnd(s)) return;
        fn(s);
      }
      errors.push({ line: startLine, msg: "Khối mở ở dòng {line} chưa có dấu }", args: { line: startLine } });
    }
    const skip = s => { if (opens(s)) block(x => skip(x), s.line); };

    const tagList = v => (v || "").split(",").map(t => t.trim()).filter(Boolean);

    function addElement(kind, id, name, parent, line) {
      const el = { uid: `n${seq++}`, kind, id, name, description: "", technology: "", tags: ["Element", BASE_TAG[kind]], parent, line };
      ws.elements.push(el);
      if (id) {
        if (!byId.has(id)) byId.set(id, el);
        const scoped = parent?.path ? `${parent.path}.${id}` : id;
        el.path = scoped;
        byId.set(scoped, el);
      }
      return el;
    }

    function elementBody(s, el) {
      const w = words(s), kw = w[0].toLowerCase();
      if (kw === "description") el.description = w[1] ?? "";
      else if (kw === "technology") el.technology = w[1] ?? "";
      else if (kw === "tags" || kw === "tag") w.slice(1).forEach(t => el.tags.push(...tagList(t)));
      else if (kw === "url" || kw.startsWith("!")) skip(s);
      else if (SKIPPED.test(kw)) skip(s);
      else modelStatement(s, el);
    }

    function addRel(s, w, arrow, parent) {
      const rel = { line: s.line, from: arrow ? w[arrow - 1] : "this", to: w[arrow + 1], description: w[arrow + 2] ?? "", technology: w[arrow + 3] ?? "", tags: ["Relationship", ...tagList(w[arrow + 4])], scope: parent };
      pendingRels.push(rel);
      if (opens(s)) block(x => {
        const y = words(x), k = y[0].toLowerCase();
        if (k === "tags" || k === "tag") y.slice(1).forEach(t => rel.tags.push(...tagList(t)));
        else if (k === "description") rel.description = y[1] ?? "";
        else if (k === "technology") rel.technology = y[1] ?? "";
        else skip(x);
      }, s.line);
    }

    function modelStatement(s, parent) {
      let w = words(s), id = null;
      if (w[1] === "=" && !s.toks[0].q) { id = w[0]; w = w.slice(2); }
      const kw = (w[0] || "").toLowerCase(), arrow = w.indexOf("->");
      if (w.includes("-/>")) { warnOnce("Bỏ qua cú pháp -/> (xoá quan hệ)", {}, s.line); return skip(s); }
      if (arrow >= 0) return addRel(s, w, arrow, parent);
      if (kw === "group") return opens(s) ? block(x => modelStatement(x, parent), s.line) : undefined;
      const kind = LEVELS[kw];
      if (kind) {
        if ((PARENT[kind] ?? null) !== (parent?.kind ?? null)) errors.push({ line: s.line, msg: "“{kw}” không được đặt ở đây", args: { kw: w[0] } });
        if (!w[1]) { errors.push({ line: s.line, msg: "“{kw}” thiếu tên", args: { kw: w[0] } }); return skip(s); }
        const el = addElement(kind, id, w[1], parent, s.line), hasTech = kind === "container" || kind === "component";
        el.description = w[2] ?? "";
        if (hasTech) el.technology = w[3] ?? "";
        el.tags.push(...tagList(w[hasTech ? 4 : 3]));
        if (opens(s)) block(x => elementBody(x, el), s.line);
        return;
      }
      if (/^deployment/.test(kw) || /instance$/.test(kw)) { warnOnce("Chưa hỗ trợ deployment — đã bỏ qua", {}, s.line); return skip(s); }
      if (kw === "!identifiers" || kw.startsWith("!") || SKIPPED.test(kw)) { if (kw !== "!identifiers") warnOnce("Bỏ qua “{kw}”", { kw: w[0] }, s.line); return skip(s); }
      warnOnce("Bỏ qua “{kw}”", { kw: w[0] }, s.line);
      skip(s);
    }

    function findElement(ref, scope) {
      if (ref === "this") return scope;
      for (let p = scope; p; p = p.parent) { const hit = p.path && byId.get(`${p.path}.${ref}`); if (hit) return hit; }
      return byId.get(ref);
    }

    function viewStatement(s, kw) {
      const kind = VIEW_KINDS[kw], w = words(s), hasScope = kind !== "systemLandscape";
      const view = { kind, line: s.line, scopeRef: hasScope ? w[1] : null, key: w[hasScope ? 2 : 1] ?? "", description: w[hasScope ? 3 : 2] ?? "", title: "", include: [], exclude: [], direction: "tb" };
      ws.views.push(view);
      if (opens(s)) block(x => {
        const y = words(x), k = y[0].toLowerCase();
        if (k === "include") view.include.push(...y.slice(1).map(v => ({ v, line: x.line })));
        else if (k === "exclude") view.exclude.push(...y.slice(1).map(v => ({ v, line: x.line })));
        else if (k === "autolayout") view.direction = (y[1] || "tb").toLowerCase();
        else if (k === "title") view.title = y[1] ?? "";
        else if (k === "description") view.description = y[1] ?? "";
        else skip(x);
      }, s.line);
    }

    function stylesBlock(s) {
      block(x => {
        const y = words(x), k = y[0].toLowerCase(), bag = k === "element" ? ws.styles.element : k === "relationship" ? ws.styles.relationship : null;
        if (!bag || !y[1]) { warnOnce("Bỏ qua “{kw}”", { kw: y[0] }, x.line); return skip(x); }
        const style = bag[y[1]] ??= {};
        if (opens(x)) block(p => { const q = words(p); style[q[0].toLowerCase()] = q[1] ?? ""; }, x.line);
      }, s.line);
    }

    function viewsBlock(s) {
      block(x => {
        const kw = words(x)[0].toLowerCase();
        if (VIEW_KINDS[kw]) viewStatement(x, kw);
        else if (kw === "styles") stylesBlock(x);
        else if (kw === "theme" || kw === "themes") { warnOnce("Bỏ qua theme ngoài (tool không gọi mạng)", {}, x.line); skip(x); }
        else if (UNSUPPORTED_VIEW.test(kw)) { warnOnce("Chưa hỗ trợ view “{kw}” — đã bỏ qua", { kw }, x.line); skip(x); }
        else skip(x);
      }, s.line);
    }

    function workspaceBody(s) {
      const w = words(s), kw = w[0].toLowerCase();
      if (kw === "model") block(x => modelStatement(x, null), s.line);
      else if (kw === "views") viewsBlock(s);
      else if (kw === "name") ws.name = w[1] ?? "";
      else if (kw === "description") ws.description = w[1] ?? "";
      else if (kw.startsWith("!") || SKIPPED.test(kw)) skip(s);
      else { warnOnce("Bỏ qua “{kw}”", { kw: w[0] }, s.line); skip(s); }
    }

    const head = st[i++];
    if (!head || head.toks[0].v.toLowerCase() !== "workspace") {
      errors.push({ line: head?.line ?? 1, msg: "DSL phải bắt đầu bằng “workspace {”", args: {} });
      return ws;
    }
    const hw = words(head);
    if ((hw[1] || "").toLowerCase() === "extends") { errors.push({ line: head.line, msg: "Chưa hỗ trợ “workspace extends”", args: {} }); return ws; }
    ws.name = hw[1] ?? ""; ws.description = hw[2] ?? "";
    if (!opens(head)) { errors.push({ line: head.line, msg: "“workspace” thiếu dấu {", args: {} }); return ws; }
    block(workspaceBody, head.line);
    if (i < st.length) errors.push({ line: st[i].line, msg: "Thừa nội dung sau dấu } đóng workspace", args: {} });

    for (const r of pendingRels) {
      const a = findElement(r.from, r.scope), b = findElement(r.to, r.scope);
      if (!a || !b) { errors.push({ line: r.line, msg: "Không tìm thấy phần tử “{id}”", args: { id: a ? r.to : r.from } }); continue; }
      ws.relationships.push({ from: a, to: b, description: r.description, technology: r.technology, tags: r.tags });
    }
    for (const v of ws.views) if (v.scopeRef) {
      v.scope = findElement(v.scopeRef, null);
      if (!v.scope) errors.push({ line: v.line, msg: "Không tìm thấy phần tử “{id}”", args: { id: v.scopeRef } });
    }
    ws.find = id => findElement(id, null);
    return ws;
  }

  return { parse };
})();
if (typeof module !== "undefined") module.exports = { StructurizrParser };

// XML / HTML: tolerant tokenizer + tree builder that repairs structure, and a pretty printer.
const MarkupTool = (() => {
  const VOID = new Set("area base br col embed hr img input link meta param source track wbr".split(" "));
  const RAW = new Set(["script", "style", "textarea", "title", "pre"]);
  const OPTIONAL_END = new Set("p li dt dd tr td th option optgroup thead tbody tfoot colgroup html head body caption rt rp".split(" "));
  const P_CLOSERS = new Set("address article aside blockquote details div dl fieldset figure footer form h1 h2 h3 h4 h5 h6 header hr main nav ol p pre section table ul".split(" "));
  const AUTO_CLOSE = { li: ["li"], dt: ["dt", "dd"], dd: ["dt", "dd"], tr: ["tr", "td", "th"], td: ["td", "th"], th: ["td", "th"],
                       option: ["option"], optgroup: ["optgroup", "option"], thead: ["tbody", "tfoot"], tbody: ["thead", "tbody", "tfoot", "tr", "td", "th"], tfoot: ["thead", "tbody"] };
  const INLINE = new Set("a abbr b bdi bdo br cite code data dfn em i img input kbd label mark q s samp small span strong sub sup time u var wbr button select textarea".split(" "));
  const BARE_AMP = /&(?![A-Za-z][\w.-]*;|#\d+;|#x[0-9a-fA-F]+;)/, BARE_AMP_ALL = new RegExp(BARE_AMP.source, "g");
  const lineCol = TextUtil.lineCol;

  function build(text, html) {
    const s = TextUtil.stripBom(text);
    const fixes = [];
    const fix = (msg, at) => fixes.push({ ...lineCol(s, at), msg });
    const norm = n => html ? n.toLowerCase() : n;
    const root = { name: "#root", children: [] }, stack = [root];
    const top = () => stack[stack.length - 1];
    const add = n => top().children.push(n);
    // HTML tolerates a bare "&" (browsers render it as-is), so only XML gets it escaped — and always reported.
    const escText = (t, at) => {
      if (html || !BARE_AMP.test(t)) return t;
      fix(T('Ký tự "&" chưa được thoát → &amp;'), at);
      return t.replace(BARE_AMP_ALL, "&amp;");
    };
    const closeTo = (idx, at, reason) => {
      while (stack.length - 1 > idx) {
        const n = stack.pop();
        if (!(html && OPTIONAL_END.has(n.name))) fix(T("Thẻ <{name}> chưa được đóng → tự đóng", n) + reason(), n.at);
      }
    };
    let i = 0;
    while (i < s.length) {
      const at = i;
      if (s[i] !== "<" || !/[A-Za-z_!?\/:]/.test(s[i + 1] || "")) {
        let j = s.indexOf("<", i + 1);
        while (j >= 0 && !/[A-Za-z_!?\/:]/.test(s[j + 1] || "")) j = s.indexOf("<", j + 1);
        const raw = s.slice(i, j < 0 ? s.length : j);
        if (/<(?![A-Za-z_!?\/:])/.test(raw)) fix(T('Ký tự "<" đứng riêng → &lt;'), at);
        add({ text: escText(raw.replace(/<(?![A-Za-z_!?\/:])/g, "&lt;"), at) });
        i = j < 0 ? s.length : j;
        continue;
      }
      const grab = (endTok, label) => {
        const e = s.indexOf(endTok, i);
        if (e < 0) { fix(T("{label} chưa đóng đến cuối file → tự đóng", { label: T(label) }), at); i = s.length; return s.slice(at) + endTok; }
        i = e + endTok.length; return s.slice(at, i);
      };
      if (s.startsWith("<!--", i)) { add({ comment: grab("-->", "Chú thích <!--") }); continue; }
      if (s.startsWith("<![CDATA[", i)) { add({ cdata: grab("]]>", "Khối CDATA") }); continue; }
      if (s.startsWith("<?", i)) { add({ pi: grab("?>", "Khai báo <?") }); continue; }
      if (s[i + 1] === "!") {
        let depth = 0, j = i + 2;
        for (; j < s.length; j++) { if (s[j] === "[") depth++; else if (s[j] === "]") depth--; else if (s[j] === ">" && depth <= 0) break; }
        add({ doctype: s.slice(i, Math.min(j + 1, s.length)) }); i = j + 1; continue;
      }
      if (s[i + 1] === "/") {
        const m = s.slice(i).match(/^<\/\s*([^\s>\/<]*)\s*(>?)/);
        i += m[0].length;
        if (!m[2]) fix(T('Thẻ đóng </{name}> thiếu dấu ">" → tự thêm', { name: m[1] }), at);
        const name = norm(m[1]);
        let idx = -1;
        for (let k = stack.length - 1; k > 0; k--) if (stack[k].name === name) { idx = k; break; }
        if (idx < 0) { fix(html && VOID.has(name) ? T("Thẻ </{name}> không cần thiết (thẻ rỗng) → bỏ", { name }) : T("Thẻ đóng </{name}> thừa, không có thẻ mở tương ứng → bỏ", { name: m[1] }), at); continue; }
        closeTo(idx, at, () => T(" (gặp </{name}>)", { name: m[1] }));
        stack.pop();
        continue;
      }
      const nm = s.slice(i + 1).match(/^[^\s>\/<"'=]+/)[0];
      const name = norm(nm);
      i += 1 + nm.length;
      const attrs = [];
      let self = false, closed = false;
      while (i < s.length) {
        while (/\s/.test(s[i] || "")) i++;
        if (s[i] === ">") { i++; closed = true; break; }
        if (s.startsWith("/>", i)) { i += 2; self = closed = true; break; }
        if (s[i] === "<") break;
        if (s[i] === "/") { i++; continue; }
        const an = (s.slice(i).match(/^[^\s"'>\/=<]+/) || [s[i]])[0];
        const aAt = i;
        i += an.length;
        while (/\s/.test(s[i] || "")) i++;
        let v = null;
        if (s[i] === "=") {
          i++; while (/\s/.test(s[i] || "")) i++;
          const qc = s[i];
          if (qc === '"' || qc === "'") {
            const e = s.indexOf(qc, i + 1), gt = s.indexOf(">", i + 1);
            if (e < 0 || (gt >= 0 && s.slice(i + 1, e).includes("\n") && gt < e)) { fix(T("Giá trị thuộc tính {an} thiếu dấu đóng nháy → tự đóng", { an }), aAt); const stop = gt < 0 ? s.length : gt; v = s.slice(i + 1, stop); i = stop; }
            else { v = s.slice(i + 1, e); i = e + 1; }
          } else {
            const m = s.slice(i).match(/^[^\s>]*/)[0];
            v = m.replace(/\/$/, ""); i += v.length;
            if (!html) fix(T("Giá trị thuộc tính {an}={v} chưa đặt trong nháy → thêm nháy", { an, v }), aAt);
          }
          if (/</.test(v) && !html) fix(T('Thuộc tính {an} chứa ký tự "<" → &lt;', { an }), aAt);
          v = escText(html ? v : v.replace(/</g, "&lt;"), aAt);
        } else if (!html) { fix(T('Thuộc tính {an} không có giá trị → {an}="{an}"', { an }), aAt); v = an; }
        if (attrs.some(a => a.n === an)) { fix(T("Thuộc tính {an} bị trùng trong <{nm}> → bỏ bản sau", { an, nm }), aAt); continue; }
        attrs.push({ n: html ? an.toLowerCase() : an, v });
      }
      if (!closed) fix(T('Thẻ <{nm}> thiếu dấu ">" → tự thêm', { nm }), at);
      if (html) {
        if (name === "p" || AUTO_CLOSE[name] || P_CLOSERS.has(name)) {
          const closes = name === "p" || P_CLOSERS.has(name) ? ["p", ...(AUTO_CLOSE[name] || [])] : AUTO_CLOSE[name];
          if (closes.includes(top().name)) stack.pop();
        }
        if (self && !VOID.has(name)) fix(T("<{name}/> không hợp lệ trong HTML → <{name}></{name}>", { name }), at);
        if (VOID.has(name)) self = true;
      }
      const node = { name, attrs, children: [], self, at };
      add(node);
      if (self) continue;
      if (html && RAW.has(name) && name !== "pre") {
        const re = new RegExp(`</\\s*${name}\\s*>`, "i"), rest = s.slice(i), m = rest.match(re);
        node.raw = m ? rest.slice(0, m.index) : rest;
        if (!m) fix(T("Thẻ <{name}> chưa đóng → tự đóng ở cuối file", { name }), at);
        i += m ? m.index + m[0].length : rest.length;
        continue;
      }
      stack.push(node);
    }
    closeTo(0, s.length, () => T(" (hết file)"));
    if (!html) {
      const els = root.children.filter(n => n.name), stray = root.children.filter(n => n.text && n.text.trim());
      if (els.length !== 1 || stray.length) {
        fix(!els.length ? T("Không có phần tử XML nào → bọc nội dung trong <root>") : stray.length ? T("XML phải có đúng 1 phần tử gốc (đang có {n} và có chữ nằm ngoài) → bọc trong <root>", { n: els.length })
          : T("XML phải có đúng 1 phần tử gốc (đang có {n}) → bọc trong <root>", { n: els.length }), 0);
        const head = root.children.filter(n => n.pi || n.doctype);
        root.children = [...head, { name: "root", attrs: [], children: root.children.filter(n => !n.pi && !n.doctype) }];
      }
    }
    return { root, fixes };
  }

  const attrsOf = n => n.attrs.map(a => a.v === null ? " " + a.n : ` ${a.n}="${a.v.replace(/"/g, "&quot;")}"`).join("");

  function serialize(root, indent, html) {
    const out = [];
    const inlineStr = (n, keep) => {
      if (n.text !== undefined) return keep ? n.text : n.text.replace(/\s*\n\s*/g, " ");
      if (n.comment || n.cdata || n.pi || n.doctype) return n.comment || n.cdata || n.pi || n.doctype;
      const open = `<${n.name}${attrsOf(n)}`;
      if (n.self) return html && VOID.has(n.name) ? open + ">" : html ? `${open}></${n.name}>` : open + "/>";
      const body = n.raw !== undefined ? n.raw : n.children.map(c => inlineStr(c, keep)).join("");
      return `${open}>${body}</${n.name}>`;
    };
    const walk = (n, lvl) => {
      const pad = indent.repeat(lvl);
      if (n.text !== undefined) { const t = n.text.trim(); if (t) out.push(pad + t.replace(/\s*\n\s*/g, " ")); return; }
      if (n.comment || n.cdata || n.pi || n.doctype) { out.push(pad + (n.comment || n.cdata || n.pi || n.doctype)); return; }
      const open = `<${n.name}${attrsOf(n)}`;
      if (n.self) { out.push(pad + inlineStr(n)); return; }
      if (n.raw !== undefined) {
        const body = n.raw.replace(/^\s*\n/, "").replace(/\s+$/, "");
        if (!body.includes("\n") || n.name === "textarea") { out.push(`${pad}${open}>${n.name === "textarea" ? n.raw : body.trim()}</${n.name}>`); return; }
        const lines = body.split("\n"), cut = Math.min(...lines.filter(l => l.trim()).map(l => l.match(/^\s*/)[0].length));
        out.push(pad + open + ">", ...lines.map(l => l.trim() ? pad + indent + l.slice(cut) : ""), `${pad}</${n.name}>`);
        return;
      }
      const hasText = n.children.some(k => k.text !== undefined && k.text.trim());
      const kids = hasText ? n.children : n.children.filter(k => k.text === undefined);
      if (!kids.length) { out.push(pad + (html ? `${open}></${n.name}>` : open + "/>")); return; }
      const mixed = kids.some(k => k.text !== undefined && k.text.trim()) || (html && n.name === "pre");
      const allInline = kids.every(k => k.text !== undefined || (html && INLINE.has(k.name)));
      if (html && n.name === "pre") { out.push(pad + open + ">" + n.children.map(c => inlineStr(c, true)).join("").replace(/^\n/, "") + `</${n.name}>`); return; }
      if (kids.length === 1 && kids[0].text !== undefined) { out.push(`${pad}${open}>${html ? kids[0].text.trim().replace(/\s*\n\s*/g, " ") : kids[0].text.replace(/^[ \t]*\n\s*/, "").replace(/\s*\n[ \t]*$/, "")}</${n.name}>`); return; }
      if (mixed && (allInline || !html)) { out.push(`${pad}${open}>${kids.map(k => inlineStr(k)).join("").trim()}</${n.name}>`); return; }
      out.push(pad + open + ">");
      kids.forEach(k => walk(k, lvl + 1));
      out.push(`${pad}</${n.name}>`);
    };
    root.children.forEach(n => walk(n, 0));
    return out.join("\n");
  }

  const minify = (root, html) => root.children.map(function m(n) {
    if (n.text !== undefined) return n.text.trim() ? n.text.replace(/\s+/g, " ") : "";
    if (n.comment) return "";
    if (n.cdata || n.pi || n.doctype) return n.cdata || n.pi || n.doctype;
    const open = `<${n.name}${attrsOf(n)}`;
    if (n.self) return html && VOID.has(n.name) ? open + ">" : html ? `${open}></${n.name}>` : open + "/>";
    return `${open}>${n.raw !== undefined ? n.raw : n.children.map(m).join("")}</${n.name}>`;
  }).join("");

  function checkXml(text) {
    const doc = new DOMParser().parseFromString(TextUtil.stripBom(text), "application/xml");
    const err = doc.getElementsByTagName("parsererror")[0];
    if (!err) return null;
    const msg = err.textContent.replace(/\s+/g, " ").replace(/^This page contains the following errors:/, "").replace(/Below is a rendering.*$/, "").trim();
    const m = msg.match(/line (\d+) at column (\d+)/) || msg.match(/Line Number (\d+), Column (\d+)/);
    return { line: m ? +m[1] : 1, col: m ? +m[2] : 1, msg };
  }

  function stats(root) {
    let elements = 0, depth = 0;
    const walk = (n, d) => { if (n.name && n.name !== "#root") { elements++; depth = Math.max(depth, d); } (n.children || []).forEach(c => walk(c, d + 1)); };
    walk(root, 0);
    return { elements, depth };
  }

  return { build, serialize, minify, checkXml, stats };
})();

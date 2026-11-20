// Tree pane: JSON / XML nodes as nested <details> built on first open (big files stay fast); click a node ⇒ its source line, ⧉ copies its JSONPath / XPath.
const PvTree = {
  create(p) {
    const mk = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
    const btn = fn => Object.assign(mk("button"), { type: "button", onclick: fn });
    const open = btn(() => all(true)), shut = btn(() => all(false)), copy = btn(copyPath), PAGE = 2000;
    const v = { el: mk("div", "pv-tree"), tools: [open, shut, copy], last: null, sel: null };

    const short = s => s.length > 120 ? s.slice(0, 120) + "…" : s;
    function jsonNode(n, key, path) {
      const label = key === undefined ? "$" : typeof key === "number" ? "[" + key + "]" : key;
      if (n.t !== "obj" && n.t !== "arr") return leaf([mk("span", "tk", label), ": ", mk("span", "tv-" + n.t, short(n.t === "str" ? JSON.stringify(n.v) : n.t === "num" ? n.raw : n.v))], n.at, () => JsonPath.pathText(path));
      const sum = n.t === "obj" ? T("{n} khóa", { n: n.items.length }) : T("{n} phần tử", { n: n.items.length });
      return branch([mk("span", "tk", label), " ", mk("span", "tm", (n.t === "obj" ? "{ " : "[ ") + sum + (n.t === "obj" ? " }" : " ]"))], n.at, () => JsonPath.pathText(path),
        () => JsonPath.kids(n).map(([k, c]) => () => jsonNode(c, k, [...path, k])));
    }
    function markupNode(n, parent, path) {
      if (!n.name) return leaf([mk("span", n.text !== undefined ? "tv-str" : "tm", short((n.text ?? n.comment ?? n.cdata).trim()))], n.at, () => path + "/text()");
      const p = path + "/" + DataTree.xstep(parent, n), head = [mk("span", "tk", "<" + n.name)];
      for (const a of n.attrs.slice(0, 6)) head.push(" ", mk("span", "ta", a.n), a.v === null ? "" : "=" + JSON.stringify(short(a.v)));
      head.push(mk("span", "tk", ">"));
      const kids = DataTree.mkids(n);
      if (n.raw !== undefined) return n.raw.trim() ? branch(head, n.at, () => p, () => [() => leaf([mk("span", "tv-str", short(n.raw.trim()))], n.at, () => p + "/text()")]) : leaf(head, n.at, () => p);
      return kids.length ? branch(head, n.at, () => p, () => kids.map(c => () => markupNode(c, n, p))) : leaf(head, n.at, () => p);
    }

    function row(parts, at, path) {
      const s = mk("span", "tn");
      s.append(...parts);
      s.onclick = () => pick(s, at, path);
      return s;
    }
    const leaf = (parts, at, path) => { const d = mk("div", "tleaf"); d.append(row(parts, at, path)); return d; };
    // Children are built the first time the node opens, PAGE at a time (children() returns makers, not nodes).
    function branch(parts, at, path, children) {
      const d = mk("details"), sum = mk("summary");
      sum.append(row(parts, at, path));
      d.append(sum);
      d.key = path();
      d.fill = () => {
        if (d.filled) return;
        d.filled = true;
        const list = children(), more = from => { d.append(...list.slice(from, from + PAGE).map(make => make())); if (list.length > from + PAGE) { const b = btn(() => { b.remove(); more(from + PAGE); }); b.className = "tmore"; b.textContent = T("… thêm {n} nút", { n: Math.min(PAGE, list.length - from - PAGE) }); d.append(b); } };
        more(0);
      };
      d.addEventListener("toggle", () => { if (d.open) d.fill(); });
      return d;
    }

    function pick(s, at, path) {
      v.sel?.classList.remove("on");
      v.sel = s; s.classList.add("on"); v.selPath = path;
      const src = Docs.get(v.last.srcId);
      if (src && at !== undefined) { Views.revealLine(src, v.last.line(at)); PhoneLayout.show(Views.where(src.id) + 1); }
    }
    async function copyPath() {
      if (!v.selPath) { StatusBar.msg(T("Chọn một nút trong cây trước."), "warn"); return; }
      const path = v.selPath(), ok = await Dom.copy(path);
      StatusBar.msg(ok ? T("✔ Đã chép đường dẫn {path}", { path }) : T("Không chép được — trình duyệt chặn clipboard."), ok ? "good" : "bad");
    }
    // Opens (or closes) every node already built, one level deeper per click when opening.
    function all(on) { v.el.querySelectorAll("details").forEach(d => { d.open = on; }); }

    v.labels = () => {
      open.textContent = T("⊞ Mở"); open.title = T("Mở các nút đã dựng (bấm tiếp để mở sâu hơn)");
      shut.textContent = T("⊟ Gập"); shut.title = T("Gập mọi nút");
      copy.textContent = T("⧉ Đường dẫn"); copy.title = T("Chép JSONPath / XPath của nút đang chọn");
      if (v.last) p.type.textContent = v.last.fmt === "json" ? T("Cây JSON — bấm nút để tới dòng nguồn") : T("Cây {fmt} — bấm nút để tới dòng nguồn", { fmt: v.last.fmt.toUpperCase() });
    };
    v.show = d => {
      if (d.empty) { v.last = null; v.el.replaceChildren(); return false; }
      // A live re-run keeps the nodes that were open.
      const was = v.last ? new Set([...v.el.querySelectorAll("details[open]")].map(x => x.key)) : null;
      v.last = d; v.sel = null; v.selPath = null;
      const top = d.fmt === "json" ? [jsonNode(d.root, undefined, [])] : DataTree.mkids(d.root).map(c => markupNode(c, d.root, ""));
      v.el.replaceChildren(...top);
      const reopen = list => list.forEach(t => { if (t.tagName === "DETAILS" && (!was || was.has(t.key))) { t.fill(); t.open = true; if (was) reopen([...t.children]); } });
      reopen(top);
      v.labels();
      return true;
    };
    return v;
  },
};

// Explorer "Open in a new browser tab": a page of our origin, so HTML runs only in a sandboxed frame (its scripts cannot read One Editor storage), SVG only as <img>, folders as a clickable listing.
const BrowserTab = (() => {
  const IMG = { png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", gif: "image/gif", webp: "image/webp", bmp: "image/bmp", ico: "image/x-icon", avif: "image/avif", svg: "image/svg+xml" };
  const DIRECT = { pdf: "application/pdf" }, TEXT_MAX = 20 << 20;
  const extOf = name => (name.match(/\.([^.]+)$/) || [])[1]?.toLowerCase() || "";
  // "html" | "image" | "direct" | "text" | "binary" — binary = a NUL byte in the first 8 KB.
  function kindOf(name, head) {
    const ext = extOf(name);
    if (ext === "html" || ext === "htm") return "html";
    if (IMG[ext]) return "image";
    if (DIRECT[ext]) return "direct";
    return head && head.includes(0) ? "binary" : "text";
  }

  const CSS = "body{margin:0;font:14px/1.5 system-ui,sans-serif;background:#fff;color:#1e293b}pre{margin:0;padding:12px 16px;font:13px/1.5 Consolas,monospace;white-space:pre-wrap;word-break:break-word}"
    + "iframe{position:fixed;inset:0;width:100%;height:100%;border:0}.img{display:flex;justify-content:center;padding:16px}.img img{max-width:100%}"
    + "h1{font-size:16px;margin:0;padding:12px 16px;background:#164e63;color:#fff;word-break:break-all}ul{list-style:none;margin:0;padding:8px 0}li a{display:block;padding:6px 16px;color:#0e7490;text-decoration:none}li a:hover{background:#ecfeff}";

  // about:blank of our origin, opened before any await so the click still counts as the user gesture.
  function blank(host, title) {
    const w = host.open("", "_blank");
    if (!w) { StatusBar.msg(T("Trình duyệt chặn cửa sổ mới — cho phép pop-up cho trang này rồi thử lại."), "bad"); return null; }
    // A page linked from the opened file must not be able to navigate One Editor (reverse tabnabbing).
    w.opener = null;
    const d = w.document;
    d.title = title;
    d.head.append(Object.assign(d.createElement("style"), { textContent: CSS }));
    return w;
  }
  const make = (w, tag, props) => Object.assign(w.document.createElement(tag), props);
  const fail = (w, e) => { w.document.body.replaceChildren(make(w, "pre", { textContent: T("Không đọc được: {msg}", { msg: e.message }) })); };

  async function file(node, host = window) {
    const w = blank(host, node.name);
    if (!w) return;
    try {
      const { file: f } = await node.read(), head = new Uint8Array(await f.slice(0, 8192).arrayBuffer()), body = w.document.body;
      let kind = kindOf(node.name, head);
      if (kind === "html" && f.size > TEXT_MAX) kind = "text";
      if (kind === "html") {
        const fr = make(w, "iframe", { title: node.name });
        fr.setAttribute("sandbox", "allow-scripts allow-modals allow-forms");
        fr.srcdoc = PvHtml.wrap(await f.text());
        body.append(fr);
      } else if (kind === "image") {
        const url = URL.createObjectURL(new Blob([f], { type: IMG[extOf(node.name)] })), box = make(w, "div", { className: "img" });
        box.append(make(w, "img", { src: url, alt: node.name, onload: () => URL.revokeObjectURL(url) }));
        body.append(box);
      } else if (kind === "text") {
        if (f.size > TEXT_MAX) body.append(make(w, "h1", { textContent: T("Chỉ hiện {mb} MB đầu của file {size} MB.", { mb: TEXT_MAX >> 20, size: Math.ceil(f.size / 1048576) }) }));
        body.append(make(w, "pre", { textContent: await f.slice(0, TEXT_MAX).text() }));
      } else {
        if (kind === "binary") body.append(make(w, "pre", { textContent: T("Trình duyệt không hiển thị được “{name}” — file được tải xuống.", { name: node.name }) }));
        const url = URL.createObjectURL(new Blob([f], { type: DIRECT[extOf(node.name)] || "application/octet-stream" }));
        w.location.replace(url);
        setTimeout(() => URL.revokeObjectURL(url), 60000);
      }
    } catch (e) { fail(w, e); }
  }

  async function listing(w, node) {
    const d = w.document, ul = make(w, "ul");
    d.title = node.name + "/";
    d.body.replaceChildren(make(w, "h1", { textContent: node.path + "/" }), ul);
    const link = (text, run) => { const li = make(w, "li"), a = make(w, "a", { href: "#", textContent: text }); a.onclick = e => { e.preventDefault(); run(); }; li.append(a); ul.append(li); };
    if (node.parent) link("📁 ..", () => listing(w, node.parent));
    try {
      const kids = [...await node.list()].sort((a, b) => (b.dir - a.dir) || a.name.localeCompare(b.name));
      for (const c of kids) link((c.dir ? "📁 " : "📄 ") + c.name, () => c.dir ? listing(w, c) : file(c, w));
    } catch (e) { fail(w, e); }
  }

  function open(node) {
    if (!node.dir) return file(node);
    const w = blank(window, node.name + "/");
    if (w) listing(w, node);
  }

  return { open, kindOf };
})();

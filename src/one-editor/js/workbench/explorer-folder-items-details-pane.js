// Details pane like Windows Alt+Shift+P, in the place of the preview pane: name, type, size, date, path, Git, colour tag; text files ≤ 1 MB add lines / encoding / line ends, images their size in pixels; several items their total.
const FolderDetails = (() => {
  const TEXT_MAX = 1048576, CLOUD_MAX = 2 * 1048576, IMG_MAX = 50 * 1048576;
  const RASTER = /\.(png|jpe?g|gif|webp|bmp|ico|avif)$/i, SVG = /\.svg$/i, { el, btn } = FolderRows;

  // Empty values are skipped; the returned cell is filled in later by the async reads.
  function facts(body) {
    const dl = el("dl", "fi-pvfacts");
    body.append(dl);
    return (label, value) => {
      if (value == null || value === "") return null;
      const dd = el("dd");
      dd.append(value);
      dl.append(el("dt", "", label), dd);
      return dd;
    };
  }
  function tagCell(node) {
    const c = Tags.of(node);
    if (!c) return null;
    const f = document.createDocumentFragment();
    f.append(Tags.dot(node), " " + Tags.name(c));
    return f;
  }

  // h: { frame(node) → body element, live() → still the shown item }.
  function show(t, node, nodes, h) {
    const body = h.frame(node), put = facts(body);
    if (nodes.length > 1) { many(t, nodes, put); return; }
    if (!node) { body.append(el("p", "fi-empty", T("Chọn 1 mục để xem chi tiết."))); return; }
    const s = t.stats.get(node), lang = node.dir ? "" : LangDetect.byName(node.name);
    put(T("Tên"), node.name);
    put(T("Kiểu"), FolderFmt.typeOf(node) + (lang ? " · " + lang : ""));
    const size = node.dir ? put(T("Kích thước"), DirSize.text(node) || btn("fi-pvbtn", T("Tính dung lượng (Space)"), () => DirSize.measure([node]))) : put(T("Kích thước"), s ? FolderFmt.size(s.size) : "…");
    const mod = node.dir ? null : put(T("Ngày sửa"), s ? FolderFmt.date(s.mod) : "…");
    put(T("Đường dẫn"), LocalRoot.known(node) || node.path);
    put("Git", GitStatus.label(node));
    put(T("Nhãn"), tagCell(node));
    if (node.dir) { put(T("Chứa"), node.children ? T("{n} mục", { n: node.children.length }) : ""); return; }
    file(node, put, h.live, size, mod).catch(e => { if (h.live()) put(T("Lỗi"), e.message); });
  }

  async function file(node, put, live, size, mod) {
    if (node.remote && (node.size ?? Infinity) > CLOUD_MAX) { size.textContent = FolderFmt.size(node.size); return; }
    const { file: f } = await node.read();
    if (!live()) return;
    size.textContent = FolderFmt.size(f.size);
    if (mod) mod.textContent = FolderFmt.date(f.lastModified || null);
    if ((RASTER.test(node.name) || SVG.test(node.name)) && f.size <= IMG_MAX) {
      const { w, h } = await pixels(SVG.test(node.name) ? new Blob([f], { type: "image/svg+xml" }) : f);
      if (live() && w) put(T("Kích thước ảnh"), w + " × " + h + " px");
    }
    if (FindCore.binaryName(node.name) || f.size > TEXT_MAX || RASTER.test(node.name)) return;
    const r = await LocalFs.readText(f);
    if (!live() || r.binary) return;
    put(T("Tổng số dòng"), ((r.text.match(/\n/g) || []).length + 1).toLocaleString(I18n.lang));
    put(T("Bảng mã"), Encoding.label(r.enc) + (r.bom ? " BOM" : ""));
    put(T("Kiểu xuống dòng"), r.eolMixed ? T("Hỗn hợp") : Encoding.EOL_NAME[r.eol]);
  }

  // An <img> outside the page is not decoded for display, unlike createImageBitmap (a 12,000 px image ≈ 576 MB). A broken image ⇒ 0.
  function pixels(blob) {
    const url = URL.createObjectURL(blob), img = new Image();
    return new Promise(ok => {
      img.onload = () => ok({ w: img.naturalWidth, h: img.naturalHeight });
      img.onerror = () => ok({ w: 0, h: 0 });
      img.src = url;
    }).finally(() => URL.revokeObjectURL(url));
  }

  function many(t, nodes, put) {
    const files = nodes.filter(n => !n.dir), dirs = nodes.length - files.length;
    const sizes = [...files.map(n => t.stats.get(n)?.size), ...nodes.filter(n => n.dir).map(n => DirSize.get(n)?.size)], known = sizes.filter(s => s != null);
    put(T("Đã chọn"), T("{files} file, {dirs} folder", { files: files.length, dirs }));
    put(T("Kích thước"), known.length ? FolderFmt.size(known.reduce((a, b) => a + b, 0)) + (known.length < sizes.length ? " " + T("(chưa tính mục không rõ cỡ)") : "") : "");
    const tags = new Set(nodes.map(n => Tags.of(n)));
    if (tags.size === 1) put(T("Nhãn"), tagCell(nodes[0]));
  }

  return { show };
})();

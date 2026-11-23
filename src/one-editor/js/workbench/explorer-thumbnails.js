// Image thumbnails in the folder tab's big / medium icon and tile views: read when the row scrolls near (IntersectionObserver), large images scaled down with createImageBitmap, ≤ 300 blob URLs kept; SVG only through <img>.
const Thumbs = (() => {
  const IMG = /\.(png|jpe?g|gif|webp|bmp|avif|svg)$/i, MODES = new Set(["xl", "lg", "md", "tiles"]);
  const MAX = 20 * 1048576, CLOUD_MAX = 2 * 1048576, DIRECT = 262144, WIDTH = 192, KEEP = 300, PAR = 4;
  const cache = new Map(), waiting = [];
  let running = 0;

  function keep(node, entry) {
    const old = cache.get(node);
    if (old && old.url !== entry.url) URL.revokeObjectURL(old.url);
    cache.delete(node);
    cache.set(node, entry);
    for (const [n, e] of cache) { if (cache.size <= KEEP) break; URL.revokeObjectURL(e.url); cache.delete(n); }
  }

  function put(r, url) {
    const ico = r.querySelector(".fi-ico");
    if (!ico || !r.isConnected) return;
    const img = document.createElement("img");
    Object.assign(img, { className: "fi-thumb", alt: "", src: url, decoding: "async" });
    ico.replaceChildren(img);
    ico.classList.add("has-thumb");
  }

  // → blob URL of a small picture of the file, or null (too big, unreadable).
  async function make(node) {
    if (node.remote && (node.size ?? Infinity) > CLOUD_MAX) return null;
    const { file } = await node.read();
    if (file.size > MAX) return null;
    if (/\.svg$/i.test(node.name)) return { url: URL.createObjectURL(file.type === "image/svg+xml" ? file : new Blob([file], { type: "image/svg+xml" })), sig: file.lastModified };
    if (file.size <= DIRECT) return { url: URL.createObjectURL(file), sig: file.lastModified };
    const bmp = await createImageBitmap(file, { resizeWidth: WIDTH, resizeQuality: "medium" });
    const c = Object.assign(document.createElement("canvas"), { width: bmp.width, height: bmp.height });
    c.getContext("2d").drawImage(bmp, 0, 0);
    bmp.close();
    const blob = await new Promise(ok => c.toBlob(ok, "image/png"));
    return blob ? { url: URL.createObjectURL(blob), sig: file.lastModified } : null;
  }

  async function pump() {
    // Newest first: after a fast scroll the rows in sight load before the ones scrolled past.
    while (running < PAR && waiting.length) {
      const [r, node, io] = waiting.pop();
      io.unobserve(r);
      if (!r.isConnected) continue;
      running++;
      make(node).then(e => { if (e) { keep(node, e); put(r, e.url); } }, () => {}).finally(() => { running--; pump(); });
    }
  }

  // After each paint of a folder tab: image rows load their thumbnail when they come near the visible part of the list.
  function watch(t, pairs) {
    t.thumbIO?.disconnect();
    t.thumbIO = null;
    if (!FolderView.flag("thumbs") || !MODES.has(FolderView.mode())) return;
    const io = t.thumbIO = new IntersectionObserver(es => {
      for (const e of es) {
        const i = waiting.findIndex(w => w[0] === e.target);
        if (e.isIntersecting) { if (i < 0) waiting.push([e.target, FolderRows.nodeOf(e.target), io]); } else if (i >= 0) waiting.splice(i, 1);
      }
      pump();
    }, { root: t.ui.list, rootMargin: "300px" });
    for (const [n, r] of pairs) {
      if (n.dir || !IMG.test(n.name)) continue;
      const c = cache.get(n), mod = t.stats.get(n)?.mod;
      if (c && (mod == null || mod === c.sig)) put(r, c.url); else io.observe(r);
    }
  }

  return { watch };
})();

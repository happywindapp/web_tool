// Explorer "Open in a new One Editor window": the handle travels through IndexedDB (shared by every One Editor page), and that page opens only it without touching the main window's saved session.
const NewWindow = (() => {
  const KEY = "handoff", MAX_AGE = 120000;
  const id = new URLSearchParams(location.search).get("open") || "";
  const active = /^[\w-]{8,64}$/.test(id);
  const fresh = x => x && typeof x.id === "string" && Date.now() - x.at < MAX_AGE;
  const listOf = async () => { const v = await NotesDb.getMeta(KEY); return Array.isArray(v) ? v.filter(fresh) : []; };

  async function open(node) {
    if (!node.handle) return;
    if (!NotesDb.ok) { StatusBar.msg(T("Cần IndexedDB để chuyển folder / file sang cửa sổ mới — trình duyệt đang chặn lưu trữ."), "bad"); return; }
    const key = crypto.randomUUID(), url = new URL(location.href);
    url.search = "?open=" + key;
    url.hash = "";
    try { await NotesDb.putMeta(KEY, [...await listOf(), { id: key, handle: node.handle, dir: !!node.dir, at: Date.now() }]); }
    catch (e) { StatusBar.msg(T("Không mở được “{name}”: {msg}", { name: node.name, msg: e.message }), "bad"); return; }
    if (!window.open(url.href, "_blank")) StatusBar.msg(T("Trình duyệt chặn cửa sổ mới — cho phép pop-up cho trang này rồi thử lại."), "bad");
  }

  // Asking for permission needs a click, so a refusal leaves a clickable status message.
  async function adopt(h, dir, ask = false) {
    const opts = { mode: "read" };
    let perm = await h.queryPermission(opts).catch(() => "denied");
    if (perm !== "granted" && ask) perm = await h.requestPermission(opts).catch(() => "denied");
    if (perm !== "granted") { StatusBar.msg(T("Bấm vào đây để mở “{name}” (trình duyệt cần bạn cho phép).", { name: h.name }), "warn", () => adopt(h, dir, true), T("Bấm để cho phép đọc")); return; }
    try {
      if (dir) { Explorer.setRoot(LocalFs.fromHandle(h)); StatusBar.msg(T("Đã mở folder “{name}”.", { name: h.name }), "good"); }
      else await FileOpen.openMany([{ file: await h.getFile(), handle: h }], 0);
    } catch (e) { StatusBar.msg(T("Không mở được “{name}”: {msg}", { name: h.name, msg: e.message }), "bad"); }
  }

  async function take() {
    history.replaceState(null, "", location.pathname + location.hash);
    let all = [];
    try { all = await listOf(); await NotesDb.putMeta(KEY, all.filter(x => x.id !== id)); } catch { /* storage blocked: nothing to take */ }
    const e = all.find(x => x.id === id);
    if (!e || typeof e.handle?.queryPermission !== "function") { StatusBar.msg(T("Link cửa sổ mới đã hết hạn — mở lại từ menu Explorer của cửa sổ chính."), "warn"); return; }
    await adopt(e.handle, e.dir);
  }

  return { open, take, get active() { return active; } };
})();

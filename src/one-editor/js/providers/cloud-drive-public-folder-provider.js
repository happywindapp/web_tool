// Public Google Drive / personal OneDrive folders in the Explorer (ADR #23): Drive API v3 with the user's API key (read-only); OneDrive through its anonymous "badger" token (read, save, create).
const CloudDrive = (() => {
  const GD = "https://www.googleapis.com/drive/v3/files", OD = "https://api.onedrive.com/v1.0/", MAX_BYTES = 50 * 1024 * 1024, MAX_ENTRIES = 5000;
  const GFOLDER = "application/vnd.google-apps.folder", OD_APP = "5cbed6ac-a083-4e14-b191-b4ba07653de2";
  // Google Docs / Sheets have no bytes of their own: opened as exported text.
  const GEXPORT = { "application/vnd.google-apps.document": ["text/plain", ".txt"], "application/vnd.google-apps.spreadsheet": ["text/csv", ".csv"] };
  const OPTS = { credentials: "omit" };
  const err = msg => new Error(msg);
  const sort = list => list.sort((a, b) => (b.dir - a.dir) || a.name.localeCompare(b.name));
  const tooBig = size => Number(size) > MAX_BYTES && err(T("File lớn hơn 50 MB — tải về máy rồi mở."));
  const asFile = async (r, name, mod) => ({ file: new File([await r.blob()], name, { lastModified: Date.parse(mod) || Date.now() }), handle: null });
  let badger = null;
  const redeemed = new Set();

  // → { kind: "gdrive", id } | { kind: "onedrive", url } | { kind: "odpage" } | { kind: "business" } | null
  function parse(link) {
    let u;
    try { u = new URL(String(link).trim()); } catch { return null; }
    if (u.protocol !== "https:") return null;
    const host = u.hostname.toLowerCase(), qid = u.searchParams.get("id") || "";
    if (host === "drive.google.com") {
      const id = (/\/folders\/([\w-]{10,})/.exec(u.pathname) || [])[1] || (/^\/(open|embeddedfolderview|folderview)$/.test(u.pathname) && /^[\w-]{10,}$/.test(qid) ? qid : "");
      return id ? { kind: "gdrive", id } : null;
    }
    // onedrive.live.com without authkey / redeem / resid is the address bar of a page being viewed: it has no share token.
    if (host === "onedrive.live.com" && !["authkey", "redeem", "resid"].some(k => u.searchParams.has(k))) return { kind: "odpage" };
    if (host === "1drv.ms" || host === "onedrive.live.com") { u.hash = ""; return { kind: "onedrive", url: u.href }; }
    return host.endsWith(".sharepoint.com") ? { kind: "business" } : null;
  }

  // OneDrive share id = "u!" + base64url of the UTF-8 link.
  function shareId(url) {
    let s = "";
    for (const b of new TextEncoder().encode(url)) s += String.fromCharCode(b);
    return "u!" + btoa(s).replace(/=+$/, "").replace(/\//g, "_").replace(/\+/g, "-");
  }

  const keyOf = () => String(Prefs.get("gdriveKey", "") || "");
  // null = cancelled; "" clears the stored key.
  function askKey() {
    const k = prompt(T("Google Drive cần API key (miễn phí, không cần billing): Google Cloud Console → bật “Google Drive API” → Credentials → Create API key (nên giới hạn key cho Drive API + domain của bạn). Key chỉ lưu trong trình duyệt này. Dán key:"), keyOf());
    if (k == null) return null;
    Prefs.set("gdriveKey", k.trim());
    return k.trim();
  }

  function gErr(status, j) {
    const m = String(j?.error?.message || status).slice(0, 200);
    if (/API key not valid|API_KEY_INVALID/i.test(m)) return err(T("API key Google không hợp lệ — Command Palette → “Google Drive: đổi / xoá API key…”."));
    if (status === 404) return err(T("Không thấy — folder / file chưa chia sẻ “Anyone with the link” hoặc link sai."));
    return err(T("Google Drive báo lỗi {code}: {msg}", { code: status, msg: m }));
  }
  async function gFetch(path, params) {
    const r = await fetch(GD + path + "?" + new URLSearchParams({ ...params, key: keyOf() }), OPTS);
    if (!r.ok) throw gErr(r.status, await r.json().catch(() => ({})));
    return r;
  }

  function gNode(f, parentPath, parent) {
    const ex = GEXPORT[f.mimeType], name = ex ? f.name + ex[1] : f.name, path = parentPath ? parentPath + "/" + name : name;
    if (f.mimeType !== GFOLDER) return { name, path, dir: false, remote: "gdrive", parent, size: f.size == null ? null : Number(f.size), modified: f.modifiedTime || null, read: () => gRead(f, name, ex) };
    const node = { name, path, dir: true, children: null, remote: "gdrive", parent, list: async () => {
      const out = [];
      let pageToken = "";
      do {
        const p = { q: "'" + f.id + "' in parents and trashed = false", fields: "nextPageToken,files(id,name,mimeType,size,modifiedTime)", pageSize: "1000", supportsAllDrives: "true", includeItemsFromAllDrives: "true" };
        const j = await (await gFetch("", pageToken ? { ...p, pageToken } : p)).json();
        (j.files || []).forEach(c => out.push(gNode(c, path, node)));
        pageToken = j.nextPageToken || "";
      } while (pageToken && out.length < MAX_ENTRIES);
      return sort(out.slice(0, MAX_ENTRIES));
    } };
    return node;
  }

  async function gRead(f, name, ex) {
    const big = tooBig(f.size);
    if (big) throw big;
    if (!ex && f.mimeType.startsWith("application/vnd.google-apps.")) throw err(T("Loại file Google này không mở dạng text được."));
    return { remote: { kind: "gdrive" }, ...await asFile(await gFetch("/" + f.id + (ex ? "/export" : ""), ex ? { mimeType: ex[0] } : { alt: "media", supportsAllDrives: "true" }), name, f.modifiedTime) };
  }

  async function gRoot(id, ask) {
    if (!keyOf() && !(ask && askKey())) return null;
    const f = await (await gFetch("/" + id, { fields: "id,name,mimeType", supportsAllDrives: "true" })).json();
    if (f.mimeType !== GFOLDER) throw err(T("Link này là file, không phải folder."));
    return gNode(f, "", null);
  }

  async function odToken() {
    if (badger) return badger;
    const r = await fetch("https://api-badgerp.svc.ms/v1.0/token", { ...OPTS, method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ appId: OD_APP }) });
    const j = await r.json().catch(() => ({}));
    if (!r.ok || !j.token) throw err(T("Không lấy được quyền đọc OneDrive ẩn danh (HTTP {code}).", { code: r.status }));
    redeemed.clear();
    return badger = j.token;
  }
  // The token only ever goes to api.onedrive.com (nextLink comes from the response). A new token reaches items only after it has opened the share link (sid) once.
  async function odFetch(url, sid, init = {}, retry = true) {
    if (!url.startsWith(OD)) throw err(T("OneDrive trả link lạ — dừng đọc."));
    const headers = { Authorization: "Badger " + await odToken(), Prefer: "autoredeem" }, viaShare = url.startsWith(OD + "shares/");
    if (sid && !viaShare && !redeemed.has(sid) && (await fetch(OD + "shares/" + sid + "/driveItem?$select=id", { ...OPTS, headers })).ok) redeemed.add(sid);
    const r = await fetch(url, { ...OPTS, ...init, headers: { ...init.headers, ...headers } });
    if (r.status === 401 && retry) { badger = null; return odFetch(url, sid, init, false); }
    if (r.ok && sid && viaShare) redeemed.add(sid);
    return r;
  }
  async function odJson(url, sid) {
    const r = await odFetch(url, sid), j = await r.json().catch(() => ({}));
    if (r.ok) return j;
    if ([400, 403, 404].includes(r.status) || j?.error?.code === "generalException") throw err(T("Không đọc được — link OneDrive chưa chia sẻ công khai, đã hết hạn hoặc là OneDrive công ty."));
    throw err(T("OneDrive báo lỗi {code}: {msg}", { code: r.status, msg: String(j?.error?.message || r.statusText).slice(0, 200) }));
  }
  // Personal item ids are "<driveId>!<n>": the fallback when a shared drive root has no parentReference.
  const odItem = it => OD + "drives/" + encodeURIComponent(it.parentReference?.driveId || String(it.id).split("!")[0]) + "/items/" + encodeURIComponent(it.id);

  async function odChildren(j, path, node, sid) {
    const out = [];
    for (;;) {
      (j.value || j.children || []).forEach(c => out.push(odNode(c, path, node, sid)));
      const next = j["@odata.nextLink"] || j["children@odata.nextLink"];
      if (!next || out.length >= MAX_ENTRIES) break;
      j = await odJson(next, sid);
    }
    return sort(out.slice(0, MAX_ENTRIES));
  }

  // od: the item's API address (create in it); webUrl: where rename / delete happen, since the anonymous token gets 403 on PATCH / DELETE.
  function odNode(it, parentPath, parent, sid, first = null) {
    const path = parentPath ? parentPath + "/" + it.name : it.name, od = { url: odItem(it), sid }, webUrl = /^https:\/\/onedrive\.live\.com[/?]/.test(it.webUrl || "") ? it.webUrl : null;
    if (!it.folder) return { name: it.name, path, dir: false, remote: "onedrive", od, webUrl, parent, size: it.size ?? null, modified: it.lastModifiedDateTime || null, read: () => odRead(it, sid) };
    const node = { name: it.name, path, dir: true, children: null, remote: "onedrive", od, webUrl, parent, list: async () => {
      // The root comes with its children ($expand) once; refreshes list it like any folder.
      const j = first || await odJson(odItem(it) + "/children?$top=1000", sid);
      first = null;
      return odChildren(j, path, node, sid);
    } };
    return node;
  }

  // downloadUrl from the listing expires after a while ⇒ on failure ask for a fresh one once. `remote` is where Save writes back (eTag = the version read).
  async function odRead(it, sid) {
    const big = tooBig(it.size);
    if (big) throw big;
    let url = it["@content.downloadUrl"], r = url ? await fetch(url, OPTS).catch(() => null) : null, eTag = it.eTag;
    if (!r || !r.ok) {
      const fresh = await odJson(odItem(it), sid);
      url = fresh["@content.downloadUrl"];
      eTag = fresh.eTag;
      if (!url) throw err(T("OneDrive không cho tải file này."));
      r = await fetch(url, OPTS);
      if (!r.ok) throw err(T("OneDrive báo lỗi {code}: {msg}", { code: r.status, msg: r.statusText }));
    }
    return { ...await asFile(r, it.name, it.lastModifiedDateTime), remote: { kind: "onedrive", url: odItem(it), sid, eTag } };
  }

  async function odRoot(url) {
    const sid = shareId(url), j = await odJson(OD + "shares/" + sid + "/driveItem?$expand=children", sid);
    if (!j.folder) throw err(T("Link này là file, không phải folder."));
    return odNode(j, "", null, sid, j);
  }

  // OneDrive tab → its file (If-Match: the version read, so an edit made elsewhere is not overwritten silently) → the new remote.
  async function save(doc, data) {
    const rm = doc.remote, put = eTag => odFetch(rm.url + "/content", rm.sid, { method: "PUT", body: data, headers: { "Content-Type": "application/octet-stream", ...(eTag ? { "If-Match": eTag } : {}) } });
    if (rm?.kind !== "onedrive" || typeof rm.url !== "string" || !rm.url.startsWith(OD + "drives/")) throw err(T("Tab này không gắn với file OneDrive."));
    let r = await put(rm.eTag);
    if (r.status === 412) {
      if (!confirm(T("“{name}” đã bị sửa trên OneDrive sau khi bạn mở. Ghi đè bằng bản của bạn?", { name: doc.name }))) throw err(T("chưa ghi — file trên OneDrive đã đổi; mở lại file từ Explorer để lấy bản mới."));
      r = await put(null);
    }
    const j = await r.json().catch(() => ({}));
    if (r.status === 403) throw err(T("link OneDrive chỉ cho xem — dùng Lưu thành (Ctrl+Shift+S) để lưu bản sao trên máy."));
    if (!r.ok) throw err(T("OneDrive báo lỗi {code}: {msg}", { code: r.status, msg: String(j?.error?.message || r.statusText).slice(0, 200) }));
    return { ...rm, eTag: j.eTag || null };
  }

  // New empty file / folder in a OneDrive folder node → its node; an existing name fails instead of being replaced.
  async function create(dir, name, folder) {
    if (dir?.remote !== "onedrive" || !dir.od) throw err(T("Chỉ tạo được trong folder OneDrive."));
    const { url, sid } = dir.od, J = { "Content-Type": "application/json" };
    const r = folder
      ? await odFetch(url + "/children", sid, { method: "POST", headers: J, body: JSON.stringify({ name, folder: {}, "@microsoft.graph.conflictBehavior": "fail" }) })
      : await odFetch(url + ":/" + encodeURIComponent(name) + ":/content?@microsoft.graph.conflictBehavior=fail", sid, { method: "PUT", headers: { "Content-Type": "application/octet-stream" }, body: "" });
    const j = await r.json().catch(() => ({}));
    if (r.status === 409) throw err(T("Đã có “{name}” trong folder này.", { name }));
    if (r.status === 403) throw err(T("link OneDrive chỉ cho xem — không tạo được."));
    if (!r.ok) throw err(T("OneDrive báo lỗi {code}: {msg}", { code: r.status, msg: String(j?.error?.message || r.statusText).slice(0, 200) }));
    return odNode(j, dir.path, dir, sid);
  }

  // → root node with its first listing (null = cancelled / no key and ask = false), shaped like LocalFs nodes plus `remote` + `link`.
  async function open(link, ask = true) {
    const node = await rootOf(String(link).trim(), ask);
    if (!node) return null;
    node.link = String(link).trim();
    node.children = await node.list();
    return node;
  }

  async function rootOf(link, ask) {
    const p = parse(link);
    if (!p) throw err(T("Không nhận ra link — dán link folder Google Drive (drive.google.com/drive/folders/…) hoặc OneDrive (1drv.ms / onedrive.live.com)."));
    if (p.kind === "business") throw err(T("OneDrive công ty / SharePoint cần đăng nhập — chưa hỗ trợ."));
    if (p.kind === "odpage") throw err(T("Đây là địa chỉ trang OneDrive đang xem, không phải link chia sẻ — trong OneDrive chọn folder → Chia sẻ (Share) → Sao chép liên kết (link dạng 1drv.ms/f/…) rồi dán vào."));
    return p.kind === "gdrive" ? gRoot(p.id, ask) : odRoot(p.url);
  }

  return { parse, shareId, open, askKey, save, create };
})();

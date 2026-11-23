// Folder tab columns like Windows Explorer: type text, size rounded up to KB, short date, file stat and the sort order (folders first, numeric-aware names).
const FolderFmt = (() => {
  const extOf = n => (/\.([^.]+)$/.exec(n.name) || [])[1];
  const typeOf = n => n.dir ? T("Folder") : extOf(n) ? T("File {ext}", { ext: extOf(n).toUpperCase() }) : T("File");
  const size = b => b == null ? "" : b < 1048576 ? Math.ceil(b / 1024).toLocaleString(I18n.lang) + " KB" : b < 1073741824 ? (b / 1048576).toFixed(1) + " MB" : (b / 1073741824).toFixed(1) + " GB";
  const date = t => t ? new Date(t).toLocaleString(I18n.lang, { dateStyle: "short", timeStyle: "short" }) : "";
  // Cloud entries carry size / date from the listing; never download a file just to stat it.
  async function stat(n) {
    if (n.remote) return { size: n.size ?? null, mod: n.modified ? Date.parse(n.modified) : null };
    const f = n.handle ? await n.handle.getFile() : (await n.read()).file;
    return { size: f.size, mod: f.lastModified };
  }
  const cmpName = (a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: "base" });
  // stats: Map node → { size, mod } (missing ⇒ sorts as smallest / oldest); a folder sorts by the size calculated on request; dirOf: the Folder column of the flat view.
  function order(list, key, asc, stats, dirOf = null) {
    const val = n => key === "type" ? typeOf(n) : key === "dir" ? dirOf?.(n) ?? "" : key === "size" ? (n.dir ? DirSize.get(n)?.size : stats.get(n)?.size) ?? -1 : stats.get(n)?.mod ?? 0;
    const by = (a, b) => key === "name" ? cmpName(a, b) : (val(a) > val(b)) - (val(a) < val(b)) || cmpName(a, b);
    return [...list].sort((a, b) => (b.dir - a.dir) || (asc ? by(a, b) : -by(a, b)));
  }
  return { typeOf, size, date, stat, order };
})();

// Git status of one repo folder via isomorphic-git (read-only): per file c clean · m modified · a added · d deleted · u untracked; a folder shows its strongest child; not listed ⇒ i (ignored).
const GitStatusModel = (() => {
  const MAX_PACK_BYTES = 300 * 1024 * 1024;
  const RANK = { u: 1, c: 2, m: 3 };

  // statusMatrix row [path, head, workdir, stage] → code (null: gone from both disk and index).
  function code([, h, w, s]) {
    if (h === 0 && s === 0) return w === 0 ? null : "u";
    if (h === 0) return w === 0 ? "d" : "a";
    if (w === 0 || s === 0) return "d";
    return w === 1 && s === 1 ? "c" : "m";
  }

  function build(rows) {
    const files = new Map(), dirs = new Map();
    for (const row of rows) {
      const c = code(row);
      if (!c) continue;
      files.set(row[0], c);
      const up = c === "a" || c === "d" ? "m" : c, segs = row[0].split("/");
      for (let k = segs.length - 1; k >= 0; k--) {
        const d = segs.slice(0, k).join("/"), was = dirs.get(d);
        if (!was || RANK[up] > RANK[was]) dirs.set(d, up);
      }
    }
    return { files, dirs };
  }

  // rel: path inside the repo ("" = the repo folder); .git and what is inside it get no state.
  function lookup(result, rel, dir) {
    if (rel === ".git" || rel.startsWith(".git/")) return null;
    return (dir ? result.dirs.get(rel) : result.files.get(rel)) || "i";
  }

  // Huge packs are refused: isomorphic-git reads a whole packfile into memory.
  async function packBytes(fs) {
    let total = 0;
    try { for (const n of await fs.readdir("/.git/objects/pack")) if (n.endsWith(".pack")) total += (await fs.lstat("/.git/objects/pack/" + n)).size; }
    catch { /* no packs yet */ }
    return total;
  }

  async function indexStats(git, fs, cache) {
    const out = new Map();
    await git.walk({ fs, dir: "/", cache, trees: [git.STAGE()], map: async (p, [e]) => { if (e && p !== "." && await e.type() === "blob") out.set(p, await e.stat()); } });
    return out;
  }

  // handle: the folder holding .git → { files, dirs, ms }; throws with .code "EBIGPACK" past MAX_PACK_BYTES.
  async function scan(git, handle, cache = {}) {
    const t0 = Date.now(), fs = GitHandleFs.create(handle);
    if (await packBytes(fs) > MAX_PACK_BYTES) throw Object.assign(new Error("pack > " + MAX_PACK_BYTES), { code: "EBIGPACK" });
    fs.setIndex(await indexStats(git, fs, cache));
    const rows = await git.statusMatrix({ fs, dir: "/", cache, refresh: false });
    const branch = await git.currentBranch({ fs, dir: "/", fullname: false }).catch(() => null);
    const oid = branch ? "" : await git.resolveRef({ fs, dir: "/", ref: "HEAD" }).catch(() => "");
    return { ...build(rows), branch, oid, ms: Date.now() - t0 };
  }

  return { code, build, lookup, scan, packBytes, MAX_PACK_BYTES };
})();

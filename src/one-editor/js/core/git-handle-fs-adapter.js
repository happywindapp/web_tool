// Read-only promise fs for isomorphic-git over a FileSystemDirectoryHandle ("/" = the handle); writes fail with EROFS.
const GitHandleFs = (() => {
  const fail = (code, p) => Object.assign(new Error(code + ": " + p), { code });
  const parts = p => String(p).split("/").filter(s => s && s !== ".");
  const msOf = e => e.mtimeSeconds * 1000 + Math.floor(e.mtimeNanoseconds / 1e6);
  const BASE = { size: 0, dev: 0, ino: 0, uid: 0, gid: 0, mtimeMs: 0, ctimeMs: 0 };
  const stat = (dir, fields) => ({ ...BASE, mode: dir ? 0o40000 : 0o100644, ...fields, isFile: () => !dir, isDirectory: () => dir, isSymbolicLink: () => false });

  function create(root) {
    const dirs = new Map([["", root]]), kids = new Map();
    let index = new Map();

    async function dirAt(list) {
      const key = list.join("/");
      if (dirs.has(key)) return dirs.get(key);
      const parent = await dirAt(list.slice(0, -1));
      let h = kids.get(list.slice(0, -1).join("/"))?.get(list.at(-1));
      if (!h) {
        try { h = await parent.getDirectoryHandle(list.at(-1)); }
        catch (e) { throw fail(e.name === "TypeMismatchError" ? "ENOTDIR" : "ENOENT", key); }
      }
      if (h.kind !== "directory") throw fail("ENOTDIR", key);
      dirs.set(key, h);
      return h;
    }

    async function entry(p) {
      const list = parts(p);
      if (!list.length) return root;
      const parent = await dirAt(list.slice(0, -1)), name = list.at(-1);
      const known = kids.get(list.slice(0, -1).join("/"));
      if (known) { if (known.has(name)) return known.get(name); throw fail("ENOENT", p); }
      try { return await parent.getFileHandle(name); }
      catch (e) { if (e.name !== "TypeMismatchError") throw fail("ENOENT", p); }
      return dirAt(list);
    }

    // Same size + mtime (ms) as the index ⇒ its stat is reused, so the file is not hashed (git's stat cache, at ms precision).
    async function lstat(p) {
      const h = await entry(p);
      if (h.kind === "directory") return stat(true, {});
      const f = await h.getFile(), e = index.get(parts(p).join("/"));
      return e && e.size === f.size && msOf(e) === f.lastModified ? stat(false, e) : stat(false, { size: f.size, mtimeMs: f.lastModified, ctimeMs: f.lastModified });
    }

    async function readFile(p, opts) {
      const h = await entry(p);
      if (h.kind === "directory") throw fail("EISDIR", p);
      const bytes = new Uint8Array(await (await h.getFile()).arrayBuffer()), enc = typeof opts === "string" ? opts : opts?.encoding;
      return enc ? new TextDecoder().decode(bytes) : bytes;
    }

    async function readdir(p) {
      const h = await entry(p);
      if (h.kind !== "directory") throw fail("ENOTDIR", p);
      const map = new Map();
      for await (const c of h.values()) map.set(c.name, c);
      kids.set(parts(p).join("/"), map);
      return [...map.keys()];
    }

    const readOnly = async p => { throw fail("EROFS", p); };
    return {
      readFile, readdir, lstat, stat: lstat, readlink: async p => { throw fail("ENOENT", p); },
      writeFile: readOnly, mkdir: readOnly, rmdir: readOnly, unlink: readOnly, symlink: readOnly,
      setIndex(map) { index = map; },
    };
  }

  return { create };
})();

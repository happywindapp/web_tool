// Reads a file's bytes at HEAD from a repo folder handle (isomorphic-git, read-only: resolveRef + readBlob, nothing written to .git).
const GitHead = (() => {
  const MAX = 5 * 1024 * 1024;

  // rel: path inside the repo → Uint8Array; throws .code "ENOTINHEAD" when HEAD has no such file, "EBIG" past 5 MB, "EBIGPACK" past the pack guard.
  async function read(handle, rel) {
    await VendorPaths.load("isoGit");
    const fs = GitHandleFs.create(handle);
    if (await GitStatusModel.packBytes(fs) > GitStatusModel.MAX_PACK_BYTES) throw Object.assign(new Error("pack"), { code: "EBIGPACK" });
    const oid = await git.resolveRef({ fs, dir: "/", ref: "HEAD" });
    let blob;
    try { ({ blob } = await git.readBlob({ fs, dir: "/", oid, filepath: rel })); }
    catch (e) { throw Object.assign(e, { code: e.code === "NotFoundError" ? "ENOTINHEAD" : e.code }); }
    if (blob.length > MAX) throw Object.assign(new Error("big"), { code: "EBIG" });
    return blob;
  }

  return { read, MAX };
})();

// Run: node --test src/one-editor/tests/git-status-overlay.test.js — isomorphic-git (vendored UMD, no Node Buffer) over mock directory handles on a temp repo made with the git CLI.
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const vm = require("node:vm");
const crypto = require("node:crypto");
const { execFileSync } = require("node:child_process");

const ROOT = path.join(__dirname, "..");
const ctx = vm.createContext({ console, TextEncoder, TextDecoder, Uint8Array, ArrayBuffer, DataView, Date, Error, Map, Set, Promise, setTimeout, clearTimeout, queueMicrotask, crypto: globalThis.crypto });
ctx.self = ctx;
vm.runInContext(fs.readFileSync(path.join(ROOT, "../../tools/vendor/isomorphic-git-1.44.11/isomorphic-git-with-buffer.min.js"), "utf8"), ctx);
for (const f of ["js/core/git-handle-fs-adapter.js", "js/core/git-status-matrix-model.js"]) vm.runInContext(fs.readFileSync(path.join(ROOT, f), "utf8"), ctx);
vm.runInContext("globalThis.GitHandleFs = GitHandleFs; globalThis.GitStatusModel = GitStatusModel;", ctx);
const { git, GitStatusModel } = ctx;

const read = new Set();
const domErr = name => Object.assign(new Error(name), { name });
function statOf(p) { try { return fs.statSync(p); } catch { throw domErr("NotFoundError"); } }
function fileHandle(abs, name) {
  return { kind: "file", name, async getFile() {
    const st = statOf(abs);
    return { size: st.size, lastModified: Math.floor(st.mtimeMs), arrayBuffer: async () => { read.add(abs); const b = fs.readFileSync(abs); return b.buffer.slice(b.byteOffset, b.byteOffset + b.length); } };
  } };
}
function dirHandle(abs, name = path.basename(abs)) {
  const child = (n, wantDir) => { const p = path.join(abs, n), st = statOf(p); if (st.isDirectory() !== wantDir) throw domErr("TypeMismatchError"); return wantDir ? dirHandle(p, n) : fileHandle(p, n); };
  return { kind: "directory", name,
    getDirectoryHandle: async n => child(n, true),
    getFileHandle: async n => child(n, false),
    async *values() { for (const d of fs.readdirSync(abs, { withFileTypes: true })) yield d.isDirectory() ? dirHandle(path.join(abs, d.name), d.name) : fileHandle(path.join(abs, d.name), d.name); } };
}

const sh = (cwd, ...args) => execFileSync("git", args, { cwd, stdio: ["ignore", "pipe", "pipe"] }).toString();
function put(dir, rel, text, old = true) {
  const p = path.join(dir, rel);
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, text);
  // Past mtimes: git does not smudge "racily clean" entries, so clean files must match by stat alone.
  if (old) { const t = new Date(Date.now() - 3600e3); fs.utimesSync(p, t, t); }
}
function makeRepo() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "one-editor-git-"));
  sh(dir, "init", "-q");
  for (const [k, v] of [["user.name", "Test"], ["user.email", "test@example.com"], ["core.autocrlf", "false"], ["commit.gpgsign", "false"]]) sh(dir, "config", k, v);
  for (const f of ["clean.txt", "mod.txt", "del.txt", "staged.txt", "src/a.js", "src/b.js"]) put(dir, f, "line of " + f + "\n");
  put(dir, ".gitignore", "build/\n");
  sh(dir, "add", "-A");
  sh(dir, "commit", "-q", "-m", "init");
  put(dir, "mod.txt", "changed\n", false);
  put(dir, "src/b.js", "changed\n", false);
  fs.unlinkSync(path.join(dir, "del.txt"));
  put(dir, "staged.txt", "staged change\n", false);
  put(dir, "added.txt", "new and added\n");
  sh(dir, "add", "staged.txt", "added.txt");
  put(dir, "new.txt", "untracked\n");
  put(dir, "newdir/x.txt", "untracked\n");
  put(dir, "build/out.bin", "ignored\n");
  return dir;
}
const sha = p => crypto.createHash("sha1").update(fs.readFileSync(p)).digest("hex");

test("the vendored bundle defines git without a global Buffer", () => {
  assert.equal(typeof git.statusMatrix, "function");
  assert.equal(typeof ctx.Buffer, "undefined");
});

test("code maps statusMatrix rows like TortoiseGit overlays", () => {
  const c = r => GitStatusModel.code(["f", ...r]);
  assert.deepEqual([[1, 1, 1], [1, 2, 1], [1, 2, 2], [1, 1, 3], [0, 2, 0], [0, 2, 2], [0, 2, 3], [1, 0, 1], [1, 1, 0], [0, 0, 3], [0, 0, 0]].map(c), ["c", "m", "m", "m", "u", "a", "a", "d", "d", "d", null]);
});

test("folders take the strongest child: modified > clean > untracked", () => {
  const r = GitStatusModel.build([["a/x", 1, 1, 1], ["a/y", 0, 2, 0], ["b/n", 0, 2, 0], ["c/k/z", 0, 2, 2]]);
  assert.equal(r.dirs.get("a"), "c");
  assert.equal(r.dirs.get("b"), "u");
  assert.equal(r.dirs.get("c"), "m");
  assert.equal(r.dirs.get("c/k"), "m");
  assert.equal(r.dirs.get(""), "m");
  assert.equal(GitStatusModel.lookup(r, "zz", true), "i");
  assert.equal(GitStatusModel.lookup(r, ".git/HEAD", false), null);
});

test("scan of a temp repo: states match git status, clean files are not read, the index is untouched", async t => {
  try { sh(os.tmpdir(), "--version"); } catch { t.skip("git CLI not found"); return; }
  const dir = makeRepo(), idx = path.join(dir, ".git", "index"), before = sha(idx);
  try {
    read.clear();
    const r = await GitStatusModel.scan(git, dirHandle(dir), {});
    const want = { "clean.txt": "c", "src/a.js": "c", "mod.txt": "m", "src/b.js": "m", "staged.txt": "m", "added.txt": "a", "del.txt": "d", "new.txt": "u", "newdir/x.txt": "u" };
    for (const [f, c] of Object.entries(want)) assert.equal(GitStatusModel.lookup(r, f, false), c, f);
    assert.equal(GitStatusModel.lookup(r, "build/out.bin", false), "i");
    assert.equal(GitStatusModel.lookup(r, "build", true), "i");
    assert.equal(GitStatusModel.lookup(r, "src", true), "m");
    assert.equal(GitStatusModel.lookup(r, "newdir", true), "u");
    assert.equal(GitStatusModel.lookup(r, "", true), "m");
    assert.ok(![...read].some(p => /[\\/](clean\.txt|a\.js)$/.test(p)), "clean files were hashed: " + [...read].join(", "));
    assert.equal(sha(idx), before);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test("a repo with no commit yet: everything staged is added, the rest untracked", async t => {
  try { sh(os.tmpdir(), "--version"); } catch { t.skip("git CLI not found"); return; }
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "one-editor-git-"));
  try {
    sh(dir, "init", "-q");
    put(dir, "a.txt", "a\n");
    put(dir, "b.txt", "b\n");
    const bare = await GitStatusModel.scan(git, dirHandle(dir), {});
    assert.equal(GitStatusModel.lookup(bare, "a.txt", false), "u", "no .git/index yet");
    sh(dir, "add", "a.txt");
    const r = await GitStatusModel.scan(git, dirHandle(dir), {});
    assert.equal(GitStatusModel.lookup(r, "a.txt", false), "a");
    assert.equal(GitStatusModel.lookup(r, "b.txt", false), "u");
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

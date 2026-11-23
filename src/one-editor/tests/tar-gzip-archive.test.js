// Run: node --test src/one-editor/tests/tar-gzip-archive.test.js — phase 11d tar / gzip (Tar): round trip, PAX long / Vietnamese names, links skipped, plain .gz, and interop with the system tar (Windows tar.exe / GNU tar).
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const vm = require("node:vm");
const { execFileSync } = require("node:child_process");

const T = (s, p) => p ? s.replace(/\{(\w+)\}/g, (m, k) => k in p ? String(p[k]) : m) : s;
const ctx = vm.createContext({ T, Blob, Response, CompressionStream, DecompressionStream, TextEncoder, TextDecoder, Uint8Array, DataView, ArrayBuffer, Date, Error, String, Math, Number, parseInt });
vm.runInContext(fs.readFileSync(path.join(__dirname, "../js/core/tar-gzip-archive-pure.js"), "utf8") + "\n;globalThis.Tar = Tar;", ctx);
const { Tar } = ctx;
const enc = new TextEncoder();
const text = b => new TextDecoder().decode(b);
const LONG = "src/" + "very-long-folder-name/".repeat(5) + "deep-file.txt";
const VN = "tài liệu/ghi chú tiếng Việt.md";
const SAMPLE = [
  { name: "docs/" },
  { name: "docs/readme.txt", data: enc.encode("Hello tar\n".repeat(100)) },
  { name: "docs/empty.txt", data: new Uint8Array(0) },
  { name: LONG, data: enc.encode("deep") },
  { name: VN, data: enc.encode("Xin chào") },
  { name: "bin.dat", data: Uint8Array.from({ length: 1500 }, (_, i) => (i * 37) & 255), date: new Date(Date.UTC(2025, 0, 2, 3, 4, 5)) },
];
const plain = v => JSON.parse(JSON.stringify(v));

test("create → read keeps names (PAX for long / non-ASCII), folders, empty and binary files, dates", async () => {
  const bytes = Tar.create(SAMPLE);
  assert.equal(bytes.length % 10240, 0, "padded to a 10 KB record");
  const items = Tar.read(bytes);
  assert.deepEqual(plain(items.map(i => [i.name, i.dir, i.skip])), SAMPLE.map(s => [s.name, s.name.endsWith("/"), false]));
  assert.equal(text(await items[1].bytes()), "Hello tar\n".repeat(100));
  assert.equal((await items[2].bytes()).length, 0);
  assert.equal(text(await items[3].bytes()), "deep");
  assert.equal(text(await items[4].bytes()), "Xin chào");
  assert.deepEqual([...await items[5].bytes()], [...SAMPLE[5].data]);
  assert.equal(items[5].date.getTime(), SAMPLE[5].date.getTime());
});

test("gzip: open() of a .tar.gz lists the tar; a plain .gz is one file without .gz", async () => {
  const tgz = await Tar.gzip(Tar.create(SAMPLE));
  assert.ok(Tar.isGzip(tgz));
  const a = await Tar.open(tgz, "pack.tar.gz");
  assert.equal(a.kind, "tar");
  assert.equal(a.items.length, SAMPLE.length);
  const gz = await Tar.gzip(enc.encode("one line\n"));
  const b = await Tar.open(gz, "notes.txt.gz");
  assert.deepEqual(plain(b.items.map(i => [i.name, i.dir])), [["notes.txt", false]]);
  assert.equal(text(await b.items[0].bytes()), "one line\n");
  assert.equal((await Tar.open(Tar.create(SAMPLE), "x.tar")).kind, "tar");
});

test("garbage, a broken checksum and truncated data are refused", async () => {
  await assert.rejects(Tar.open(enc.encode("not an archive at all"), "a.tar"), /tar \/ gzip/);
  const bytes = Tar.create([{ name: "a.txt", data: enc.encode("hello") }]);
  bytes[0] ^= 1;
  assert.throws(() => Tar.read(bytes), /tar hợp lệ/);
  const cut = Tar.create([{ name: "a.txt", data: new Uint8Array(4000) }]).subarray(0, 1024);
  assert.throws(() => Tar.read(cut), /thiếu dữ liệu/);
  await assert.rejects(Tar.gunzip(Uint8Array.of(0x1f, 0x8b, 8, 0, 0, 0)), /gzip bị hỏng/);
});

// A hand-made header: symlinks / hard links come back as skip, "../" names are left for the caller to clean.
function rawHeader(name, type, linkname = "") {
  const h = new Uint8Array(512), put = (s, at) => h.set(enc.encode(s), at), o = (n, w) => n.toString(8).padStart(w - 1, "0") + "\0";
  put(name, 0); put(o(0o644, 8), 100); put(o(0, 8), 108); put(o(0, 8), 116); put(o(0, 12), 124); put(o(0, 12), 136); put(type, 156); put(linkname, 157); put("ustar\x0000", 257);
  let s = 0; for (let i = 0; i < 512; i++) s += i >= 148 && i < 156 ? 32 : h[i];
  put(o(s, 7) + " ", 148);
  return h;
}
test("a negative ustar size or a NaN PAX size is refused instead of looping", () => {
  const neg = rawHeader("neg.txt", "0");
  neg.set(enc.encode("-0001000\0\0\0\0"), 124);
  let s = 0; for (let i = 0; i < 512; i++) s += i >= 148 && i < 156 ? 32 : neg[i];
  neg.set(enc.encode(s.toString(8).padStart(6, "0") + "\0 "), 148);
  assert.throws(() => Tar.read(new Uint8Array([...neg, ...new Uint8Array(1024)])), /tar hợp lệ/);
  const rec = enc.encode("12 size=abc\n"), pax = rawHeader("PaxHeader/x", "x");
  pax.set(enc.encode("00000000014\0"), 124);
  s = 0; for (let i = 0; i < 512; i++) s += i >= 148 && i < 156 ? 32 : pax[i];
  pax.set(enc.encode(s.toString(8).padStart(6, "0") + "\0 "), 148);
  const body = new Uint8Array(512); body.set(rec);
  assert.throws(() => Tar.read(new Uint8Array([...pax, ...body, ...rawHeader("x.txt", "0"), ...new Uint8Array(1024)])), /tar hợp lệ/);
});

test("links and special entries are listed as skip; ../ names are kept raw", () => {
  const parts = [rawHeader("link-to-passwd", "2", "/etc/passwd"), rawHeader("hard", "1", "a.txt"), rawHeader("fifo", "6"), rawHeader("../evil.txt", "0"), new Uint8Array(1024)];
  const buf = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  parts.reduce((at, p) => { buf.set(p, at); return at + p.length; }, 0);
  assert.deepEqual(plain(Tar.read(buf).map(i => [i.name, i.skip])), [["link-to-passwd", true], ["hard", true], ["fifo", true], ["../evil.txt", false]]);
});

// System tars: Windows tar.exe (bsdtar — cannot handle Vietnamese names even in archives it makes itself ⇒ ASCII sample) and GNU tar (Git) with the full sample.
const runs = bin => { try { return execFileSync(bin, ["--version"]).toString(); } catch { return ""; } };
const TARS = [[path.join(process.env.SystemRoot || "C:/Windows", "System32", "tar.exe"), true], ["tar", false]].filter(([bin, ascii]) => { const v = runs(bin); return ascii ? /bsdtar/.test(v) : /GNU tar/.test(v); });
for (const [SYS, ascii] of TARS) test(`interop (${path.basename(SYS)}${ascii ? ", ASCII names" : ""}): it lists and extracts a .tar.gz from Tar; Tar reads one made by tar -czf`, async () => {
  // Relative paths from cwd: GNU tar reads "C:..." as host:file.
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "tar-test-")), sample = SAMPLE.filter(s => !ascii || s.name !== VN), run = args => execFileSync(SYS, args, { cwd: dir, env: { ...process.env, LC_ALL: "C.UTF-8" } }).toString("utf8");
  try {
    fs.writeFileSync(path.join(dir, "ours.tar.gz"), await Tar.gzip(Tar.create(sample)));
    const listed = run(["-tzf", "ours.tar.gz"]).split(/\r?\n/).filter(Boolean).map(s => s.replace(/\/$/, ""));
    for (const s of sample) assert.ok(listed.includes(s.name.replace(/\/$/, "")), "tar -t lists " + s.name + " — got " + listed.join(", "));
    fs.mkdirSync(path.join(dir, "out"));
    run(["-xzf", "ours.tar.gz", "-C", "out"]);
    const out = path.join(dir, "out");
    assert.equal(fs.readFileSync(path.join(out, "docs/readme.txt"), "utf8"), "Hello tar\n".repeat(100));
    assert.equal(fs.readFileSync(path.join(out, LONG), "utf8"), "deep");
    assert.equal(fs.readFileSync(path.join(out, "bin.dat")).length, 1500);
    if (!ascii) assert.equal(fs.readFileSync(path.join(out, VN), "utf8"), "Xin chào");
    // Theirs → ours
    const src = path.join(dir, "src");
    fs.mkdirSync(path.join(src, "sub/inner"), { recursive: true });
    fs.writeFileSync(path.join(src, "sub/inner/a.txt"), "made by tar\n");
    fs.writeFileSync(path.join(src, "b.bin"), Buffer.from([0, 1, 2, 255]));
    run(["-czf", "theirs.tgz", "-C", "src", "sub", "b.bin"]);
    const { kind, items } = await Tar.open(new Uint8Array(fs.readFileSync(path.join(dir, "theirs.tgz"))), "theirs.tgz");
    assert.equal(kind, "tar");
    const byName = Object.fromEntries(items.map(i => [i.name.replace(/^\.\//, "").replace(/\/$/, ""), i]));
    assert.ok(byName["sub"]?.dir && byName["sub/inner"]?.dir, Object.keys(byName).join(", "));
    assert.equal(text(await byName["sub/inner/a.txt"].bytes()), "made by tar\n");
    assert.deepEqual([...await byName["b.bin"].bytes()], [0, 1, 2, 255]);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

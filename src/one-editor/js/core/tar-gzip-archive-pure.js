// tar (ustar + PAX for long / non-ASCII names) write / read and gzip through the browser's own streams (no library); links and special entries are listed as skip.
const Tar = (() => {
  const enc = new TextEncoder(), dec = new TextDecoder(), BLOCK = 512, RECORD = 10240, MAX = 8 ** 11 - 1;
  const pipe = async (bytes, stream) => new Uint8Array(await new Response(new Blob([bytes]).stream().pipeThrough(stream)).arrayBuffer());
  const gzip = bytes => pipe(bytes, new CompressionStream("gzip"));
  const gunzip = bytes => pipe(bytes, new DecompressionStream("gzip")).catch(() => { throw new Error(T("File gzip bị hỏng.")); });
  const isGzip = b => b[0] === 0x1f && b[1] === 0x8b;
  const octal = (n, width) => n.toString(8).padStart(width - 1, "0") + "\0";
  const field = (b, at, len) => { const s = b.subarray(at, at + len), z = s.indexOf(0); return dec.decode(z < 0 ? s : s.subarray(0, z)); };

  // Sum of the header with the checksum field as spaces (some old writers summed signed bytes).
  function sums(h) {
    let u = 0, s = 0;
    for (let i = 0; i < BLOCK; i++) { const c = i >= 148 && i < 156 ? 32 : h[i]; u += c; s += c > 127 ? c - 256 : c; }
    return [u, s];
  }
  function header(name, size, mtime, type, mode) {
    const h = new Uint8Array(BLOCK), put = (s, at) => h.set(enc.encode(s), at);
    put(name, 0); put(octal(mode, 8), 100); put(octal(0, 8), 108); put(octal(0, 8), 116);
    put(octal(size, 12), 124); put(octal(Math.max(0, Math.floor(mtime / 1000)), 12), 136); put(type, 156); put("ustar\x0000", 257);
    put(octal(sums(h)[0], 7) + " ", 148);
    return h;
  }
  // "len key=value\n", len counting the whole record in UTF-8 bytes.
  function paxRecord(key, value) {
    const body = " " + key + "=" + value + "\n", n = enc.encode(body).length;
    let len = n + String(n).length;
    if (String(len).length !== String(n).length) len = n + String(len).length;
    return enc.encode(len + body);
  }
  const ascii100 = s => (/^[\x20-\x7e]*$/.test(s) && s.length <= 100 ? s : null);
  const pad = n => (BLOCK - (n % BLOCK)) % BLOCK;

  // entries: [{ name ("a/b.txt", folders end with "/"), data?: Uint8Array, date?: Date }] → tar bytes.
  function create(entries) {
    const parts = [];
    let total = 0;
    const push = b => { parts.push(b); total += b.length; };
    for (const e of entries) {
      const dir = e.name.endsWith("/"), data = dir ? new Uint8Array(0) : e.data || new Uint8Array(0), mtime = (e.date || new Date()).getTime();
      if (data.length > MAX) throw new Error(T("“{name}” lớn hơn 8 GB — tar này chưa hỗ trợ.", { name: e.name }));
      let name = ascii100(e.name);
      if (name === null) {
        const pax = paxRecord("path", e.name), safe = e.name.replace(/[^\x20-\x7e]/g, "_").slice(-90);
        push(header("PaxHeader/" + safe.slice(-90), pax.length, mtime, "x", 0o644)); push(pax); push(new Uint8Array(pad(pax.length)));
        name = safe.slice(-100);
      }
      push(header(name, data.length, mtime, dir ? "5" : "0", dir ? 0o755 : 0o644));
      if (data.length) { push(data); push(new Uint8Array(pad(data.length))); }
    }
    push(new Uint8Array(BLOCK * 2));
    push(new Uint8Array((RECORD - (total % RECORD)) % RECORD));
    const out = new Uint8Array(total);
    let at = 0;
    for (const p of parts) { out.set(p, at); at += p.length; }
    return out;
  }

  function size(h) {
    if (h[124] & 0x80) { let n = 0; for (let i = 125; i < 136; i++) n = n * 256 + h[i]; return n; }
    return parseInt(field(h, 124, 12).trim() || "0", 8);
  }
  const valid = h => { const want = parseInt(field(h, 148, 8).trim(), 8); return Number.isFinite(want) && sums(h).includes(want); };
  const isTar = b => b.length >= BLOCK && valid(b.subarray(0, BLOCK));
  function pax(data) {
    const out = {}, text = dec.decode(data);
    for (const m of text.matchAll(/(\d+) ([^=\n]+)=([^\n]*)\n/g)) out[m[2]] = m[3];
    return out;
  }

  // tar bytes → [{ name, dir, date, size, skip (link / device), bytes: () => Promise<Uint8Array> }].
  function read(b) {
    const out = [], bad = () => new Error(T("Không phải file tar hợp lệ."));
    let p = 0, next = {};
    while (p + BLOCK <= b.length) {
      const h = b.subarray(p, p + BLOCK);
      if (h.every(x => x === 0)) break;
      if (!valid(h)) throw bad();
      const type = String.fromCharCode(h[156] || 48), len = next.size ?? size(h), start = p + BLOCK;
      // A negative / NaN size would stall or rewind the walk.
      if (!Number.isSafeInteger(len) || len < 0) throw bad();
      if (start + len > b.length) throw new Error(T("File tar bị hỏng (thiếu dữ liệu)."));
      const data = b.subarray(start, start + len);
      p = start + len + pad(len);
      if (type === "x") { next = { ...next, ...pax(data) }; if (next.size != null) next.size = +next.size; continue; }
      if (type === "L") { next.path = field(data, 0, data.length); continue; }
      if (type === "g" || type === "K") continue;
      const prefix = field(h, 257, 6) === "ustar" ? field(h, 345, 155) : "";
      const name = next.path ?? (prefix ? prefix + "/" : "") + field(h, 0, 100), mtime = next.mtime != null ? +next.mtime : parseInt(field(h, 136, 12).trim() || "0", 8);
      next = {};
      const dir = type === "5" || (type === "0" && name.endsWith("/") && !len);
      out.push({ name, dir, date: new Date(mtime * 1000), size: len, skip: !dir && !/^[07]$/.test(type), bytes: async () => data.slice() });
    }
    return out;
  }

  // Bytes of a .tar / .tar.gz / .tgz / .gz → { kind: "tar" | "gz", items }; a plain .gz is one file named without ".gz".
  async function open(bytes, name) {
    if (isGzip(bytes)) {
      const raw = await gunzip(bytes);
      if (isTar(raw)) return { kind: "tar", items: read(raw) };
      const file = name.replace(/\.gz$/i, "") || "file";
      return { kind: "gz", items: [{ name: file === name ? name + ".out" : file, dir: false, date: new Date(), size: raw.length, skip: false, bytes: async () => raw }] };
    }
    if (isTar(bytes)) return { kind: "tar", items: read(bytes) };
    throw new Error(T("Không phải file tar / gzip hợp lệ."));
  }

  return { create, read, open, gzip, gunzip, isTar, isGzip };
})();

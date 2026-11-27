// Checksum, pure (node test; also runs in the hash worker as "(" + fileChecksumPureFactory + ")()"): SHA-1 / SHA-256 / SHA-512 fed chunk by chunk, sha256sum / BSD sum files (parse / format), hash typed or pasted by the user.
function fileChecksumPureFactory() {
  const ALGS = ["SHA-1", "SHA-256", "SHA-512"], HEX_LEN = { "SHA-1": 40, "SHA-256": 64, "SHA-512": 128 };
  const EXT = { "SHA-1": ".sha1", "SHA-256": ".sha256", "SHA-512": ".sha512" };
  const PRIMES = [];
  for (let n = 2; PRIMES.length < 80; n++) if (PRIMES.every(p => n % p)) PRIMES.push(n);
  // floor(n^(1/k)) by Newton from above; the SHA-2 constants come from it instead of 240 typed hex words.
  function iroot(n, k) {
    let x = 1n << BigInt(Math.ceil(n.toString(2).length / Number(k)) + 1);
    for (;;) { const y = ((k - 1n) * x + n / x ** (k - 1n)) / k; if (y >= x) return x; x = y; }
  }
  const M64 = (1n << 64n) - 1n;
  const frac64 = (p, k) => iroot(BigInt(p) << (64n * k), k) & M64;
  let K64 = null;
  function consts() {
    if (K64) return K64;
    const split = list => { const a = new Int32Array(list.length * 2); list.forEach((v, i) => { a[2 * i] = Number(v >> 32n) | 0; a[2 * i + 1] = Number(v & 0xffffffffn) | 0; }); return a; };
    const K = PRIMES.map(p => frac64(p, 3n)), H = PRIMES.slice(0, 8).map(p => frac64(p, 2n));
    K64 = { K: split(K), H: split(H) };
    K64.K32 = Int32Array.from({ length: 64 }, (_, i) => K64.K[2 * i]);
    K64.H32 = Int32Array.from({ length: 8 }, (_, i) => K64.H[2 * i]);
    return K64;
  }

  const rd = (b, o) => (b[o] << 24) | (b[o + 1] << 16) | (b[o + 2] << 8) | b[o + 3];
  const hex = words => Array.from(words, w => (w >>> 0).toString(16).padStart(8, "0")).join("");

  function sha1Core() {
    const H = Int32Array.of(0x67452301, 0xefcdab89 | 0, 0x98badcfe | 0, 0x10325476, 0xc3d2e1f0 | 0), W = new Int32Array(80);
    return { size: 64, H, out: 5, block(b, o) {
      for (let i = 0; i < 16; i++) W[i] = rd(b, o + 4 * i);
      for (let i = 16; i < 80; i++) { const x = W[i - 3] ^ W[i - 8] ^ W[i - 14] ^ W[i - 16]; W[i] = (x << 1) | (x >>> 31); }
      let a = H[0], bb = H[1], c = H[2], d = H[3], e = H[4];
      for (let i = 0; i < 80; i++) {
        const f = i < 20 ? (bb & c) | (~bb & d) : i < 40 ? bb ^ c ^ d : i < 60 ? (bb & c) | (bb & d) | (c & d) : bb ^ c ^ d;
        const k = i < 20 ? 0x5a827999 : i < 40 ? 0x6ed9eba1 : i < 60 ? 0x8f1bbcdc | 0 : 0xca62c1d6 | 0;
        const t = (((a << 5) | (a >>> 27)) + f + e + k + W[i]) | 0;
        e = d; d = c; c = (bb << 30) | (bb >>> 2); bb = a; a = t;
      }
      H[0] = (H[0] + a) | 0; H[1] = (H[1] + bb) | 0; H[2] = (H[2] + c) | 0; H[3] = (H[3] + d) | 0; H[4] = (H[4] + e) | 0;
    } };
  }

  function sha256Core() {
    const { K32, H32 } = consts(), H = Int32Array.from(H32), W = new Int32Array(64);
    const r = (x, n) => (x >>> n) | (x << (32 - n));
    return { size: 64, H, out: 8, block(b, o) {
      for (let i = 0; i < 16; i++) W[i] = rd(b, o + 4 * i);
      for (let i = 16; i < 64; i++) {
        const x = W[i - 15], y = W[i - 2];
        W[i] = (W[i - 16] + (r(x, 7) ^ r(x, 18) ^ (x >>> 3)) + W[i - 7] + (r(y, 17) ^ r(y, 19) ^ (y >>> 10))) | 0;
      }
      let a = H[0], bb = H[1], c = H[2], d = H[3], e = H[4], f = H[5], g = H[6], h = H[7];
      for (let i = 0; i < 64; i++) {
        const t1 = (h + (((e >>> 6) | (e << 26)) ^ ((e >>> 11) | (e << 21)) ^ ((e >>> 25) | (e << 7))) + ((e & f) ^ (~e & g)) + K32[i] + W[i]) | 0;
        const t2 = ((((a >>> 2) | (a << 30)) ^ ((a >>> 13) | (a << 19)) ^ ((a >>> 22) | (a << 10))) + ((a & bb) ^ (a & c) ^ (bb & c))) | 0;
        h = g; g = f; f = e; e = (d + t1) | 0; d = c; c = bb; bb = a; a = (t1 + t2) | 0;
      }
      H[0] = (H[0] + a) | 0; H[1] = (H[1] + bb) | 0; H[2] = (H[2] + c) | 0; H[3] = (H[3] + d) | 0; H[4] = (H[4] + e) | 0; H[5] = (H[5] + f) | 0; H[6] = (H[6] + g) | 0; H[7] = (H[7] + h) | 0;
    } };
  }

  // 64-bit words as (hi, lo) Int32 pairs; sums of lo halves carry through a float (exact below 2^53).
  function sha512Core() {
    const { K } = consts(), H = Int32Array.from(consts().H), W = new Int32Array(160), S = new Int32Array(16), C = 0x100000000;
    return { size: 128, H, out: 16, block(b, o) {
      for (let i = 0; i < 32; i++) W[i] = rd(b, o + 4 * i);
      for (let i = 16; i < 80; i++) {
        let xh = W[2 * (i - 15)], xl = W[2 * (i - 15) + 1];
        const s0h = ((xh >>> 1) | (xl << 31)) ^ ((xh >>> 8) | (xl << 24)) ^ (xh >>> 7);
        const s0l = ((xl >>> 1) | (xh << 31)) ^ ((xl >>> 8) | (xh << 24)) ^ ((xl >>> 7) | (xh << 25));
        xh = W[2 * (i - 2)]; xl = W[2 * (i - 2) + 1];
        const s1h = ((xh >>> 19) | (xl << 13)) ^ ((xl >>> 29) | (xh << 3)) ^ (xh >>> 6);
        const s1l = ((xl >>> 19) | (xh << 13)) ^ ((xh >>> 29) | (xl << 3)) ^ ((xl >>> 6) | (xh << 26));
        const lo = (s0l >>> 0) + (s1l >>> 0) + (W[2 * (i - 7) + 1] >>> 0) + (W[2 * (i - 16) + 1] >>> 0);
        W[2 * i] = (s0h + s1h + W[2 * (i - 7)] + W[2 * (i - 16)] + ((lo / C) | 0)) | 0;
        W[2 * i + 1] = lo | 0;
      }
      let ah = H[0], al = H[1], bh = H[2], bl = H[3], ch = H[4], cl = H[5], dh = H[6], dl = H[7], eh = H[8], el = H[9], fh = H[10], fl = H[11], gh = H[12], gl = H[13], hh = H[14], hl = H[15];
      for (let i = 0; i < 160; i += 2) {
        const S1h = ((eh >>> 14) | (el << 18)) ^ ((eh >>> 18) | (el << 14)) ^ ((el >>> 9) | (eh << 23));
        const S1l = ((el >>> 14) | (eh << 18)) ^ ((el >>> 18) | (eh << 14)) ^ ((eh >>> 9) | (el << 23));
        const t1l = (hl >>> 0) + (S1l >>> 0) + (((el & fl) ^ (~el & gl)) >>> 0) + (K[i + 1] >>> 0) + (W[i + 1] >>> 0);
        const t1h = (hh + S1h + ((eh & fh) ^ (~eh & gh)) + K[i] + W[i] + ((t1l / C) | 0)) | 0;
        const S0h = ((ah >>> 28) | (al << 4)) ^ ((al >>> 2) | (ah << 30)) ^ ((al >>> 7) | (ah << 25));
        const S0l = ((al >>> 28) | (ah << 4)) ^ ((ah >>> 2) | (al << 30)) ^ ((ah >>> 7) | (al << 25));
        const t2l = (S0l >>> 0) + ((((al & bl) ^ (al & cl) ^ (bl & cl))) >>> 0);
        const t2h = (S0h + ((ah & bh) ^ (ah & ch) ^ (bh & ch)) + ((t2l / C) | 0)) | 0;
        const t1 = t1l >>> 0, t2 = t2l >>> 0, e2 = (dl >>> 0) + t1, a2 = t1 + t2;
        hh = gh; hl = gl; gh = fh; gl = fl; fh = eh; fl = el;
        eh = (dh + t1h + ((e2 / C) | 0)) | 0; el = e2 | 0;
        dh = ch; dl = cl; ch = bh; cl = bl; bh = ah; bl = al;
        ah = (t1h + t2h + ((a2 / C) | 0)) | 0; al = a2 | 0;
      }
      S[0] = ah; S[1] = al; S[2] = bh; S[3] = bl; S[4] = ch; S[5] = cl; S[6] = dh; S[7] = dl; S[8] = eh; S[9] = el; S[10] = fh; S[11] = fl; S[12] = gh; S[13] = gl; S[14] = hh; S[15] = hl;
      for (let i = 0; i < 16; i += 2) {
        const lo = (H[i + 1] >>> 0) + (S[i + 1] >>> 0);
        H[i] = (H[i] + S[i] + ((lo / C) | 0)) | 0; H[i + 1] = lo | 0;
      }
    } };
  }

  const CORES = { "SHA-1": sha1Core, "SHA-256": sha256Core, "SHA-512": sha512Core };
  // create(alg) → { update(Uint8Array), hex() }: Merkle–Damgård padding with the bit length big-endian at the end.
  function create(alg) {
    if (!CORES[alg]) throw new Error("unknown hash: " + alg);
    const core = CORES[alg](), n = core.size, buf = new Uint8Array(n);
    let used = 0, len = 0;
    function update(u8) {
      let i = 0;
      len += u8.length;
      if (used) { const k = Math.min(n - used, u8.length); buf.set(u8.subarray(0, k), used); used += k; i = k; if (used < n) return; core.block(buf, 0); used = 0; }
      for (; i + n <= u8.length; i += n) core.block(u8, i);
      if (i < u8.length) { buf.set(u8.subarray(i), 0); used = u8.length - i; }
    }
    function hexOut() {
      const bits = len * 8, tail = new Uint8Array((used + 1 + n / 8 > n ? 2 : 1) * n);
      tail.set(buf.subarray(0, used));
      tail[used] = 0x80;
      const e = tail.length, hi = Math.floor(bits / 0x100000000), lo = bits >>> 0;
      tail[e - 8] = hi >>> 24; tail[e - 7] = hi >>> 16; tail[e - 6] = hi >>> 8; tail[e - 5] = hi;
      tail[e - 4] = lo >>> 24; tail[e - 3] = lo >>> 16; tail[e - 2] = lo >>> 8; tail[e - 1] = lo;
      for (let o = 0; o < e; o += n) core.block(tail, o);
      return hex(core.H.subarray(0, core.out));
    }
    return { update, hex: hexOut };
  }

  const algOfLen = len => ALGS.find(a => HEX_LEN[a] === len) || "";
  const algOfName = name => { const m = /(?:\.|^)(sha(?:1|256|512))(?:sums?)?$/i.exec(String(name || "")); return m ? "SHA-" + m[1].slice(3) : ""; };

  // GNU "hash  name" / "hash *name" (a leading "\" escapes \\ and \n in the name) and BSD "SHA256 (name) = hash"; "#" lines and blanks skipped.
  function parse(text) {
    const entries = [], bad = [];
    String(text).split(/\r?\n/).forEach((raw, k) => {
      const line = raw.replace(/^﻿/, "");
      if (!line.trim() || /^\s*[#;]/.test(line)) return;
      let m = /^\s*(\\?)([0-9a-fA-F]{40}|[0-9a-fA-F]{64}|[0-9a-fA-F]{128}) [ *](.+)$/.exec(line), hash = "", name = "";
      if (m) { hash = m[2]; name = m[1] ? m[3].replace(/\\(\\|n)/g, (_, c) => (c === "n" ? "\n" : "\\")) : m[3]; }
      else if ((m = /^\s*SHA-?(1|256|512)\s*\((.+)\)\s*=\s*([0-9a-fA-F]+)\s*$/i.exec(line)) && HEX_LEN["SHA-" + m[1]] === m[3].length) { hash = m[3]; name = m[2]; }
      if (!hash) { bad.push(k + 1); return; }
      entries.push({ line: k + 1, hash: hash.toLowerCase(), name: name.replace(/^\.\//, ""), alg: algOfLen(hash.length) });
    });
    return { entries, bad };
  }

  function format(rows) {
    return rows.map(r => { const esc = /[\\\n]/.test(r.name); return (esc ? "\\" : "") + r.hash + "  " + (esc ? r.name.replace(/\\/g, "\\\\").replace(/\n/g, "\\n") : r.name); }).join("\n") + (rows.length ? "\n" : "");
  }

  // What the user pasted: a bare hash, "hash  name", "SHA256 (x) = hash", spaced / colon groups; → lowercase hex or "".
  function cleanHash(s) {
    const t = String(s || "").trim(), one = parse(t).entries[0];
    if (one) return one.hash;
    const h = t.replace(/[\s:-]/g, "").toLowerCase();
    return /^[0-9a-f]+$/.test(h) && algOfLen(h.length) ? h : "";
  }

  return { ALGS, HEX_LEN, EXT, create, parse, format, cleanHash, algOfLen, algOfName };
}
const ShaSum = fileChecksumPureFactory();

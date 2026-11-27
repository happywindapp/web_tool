// Encoders + small dev tools (pure, bytes = Uint8Array): Base32 (RFC 4648) · Base58 (Bitcoin) · Ascii85 · Z85 · HMAC (WebCrypto) · UUID v7 / ULID make + time · CIDR IPv4 / IPv6 · chmod octal ⇄ rwx.
const EncPlus = (() => {
  const bad = msg => { throw new Error(msg); };
  const tr = (s, p) => typeof T === "function" ? T(s, p) : s.replace(/\{(\w+)\}/g, (m, k) => p?.[k] ?? m);

  const B32 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  function b32enc(u) {
    let out = "", bits = 0, val = 0;
    for (const b of u) { val = (val << 8) | b; bits += 8; while (bits >= 5) { out += B32[(val >>> (bits - 5)) & 31]; bits -= 5; } }
    if (bits) out += B32[(val << (5 - bits)) & 31];
    return out + "=".repeat((8 - out.length % 8) % 8);
  }
  function b32dec(s) {
    const t = s.replace(/[\s=]+/g, "").toUpperCase(), out = [];
    let bits = 0, val = 0;
    for (const c of t) { const i = B32.indexOf(c); if (i < 0) bad(tr("Ký tự “{c}” không thuộc Base32.", { c })); val = ((val << 5) | i) & 0xfff; bits += 5; if (bits >= 8) { out.push((val >>> (bits - 8)) & 255); bits -= 8; } }
    return Uint8Array.from(out);
  }

  const B58 = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
  function b58enc(u) {
    let zeros = 0;
    while (zeros < u.length && !u[zeros]) zeros++;
    let n = 0n;
    for (const b of u) n = n * 256n + BigInt(b);
    let out = "";
    while (n > 0n) { out = B58[Number(n % 58n)] + out; n /= 58n; }
    return "1".repeat(zeros) + out;
  }
  function b58dec(s) {
    const t = s.trim();
    let zeros = 0;
    while (zeros < t.length && t[zeros] === "1") zeros++;
    let n = 0n;
    for (const c of t.slice(zeros)) { const i = B58.indexOf(c); if (i < 0) bad(tr("Ký tự “{c}” không thuộc Base58.", { c })); n = n * 58n + BigInt(i); }
    const out = [];
    while (n > 0n) { out.unshift(Number(n % 256n)); n /= 256n; }
    return Uint8Array.from([...new Array(zeros).fill(0), ...out]);
  }

  const Z85 = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ.-:+=^!/*?&<>()[]{}@%$#";
  // Ascii85 (Adobe, "z" for 4 zero bytes, no <~ ~> added) and Z85 (ZeroMQ, input length a multiple of 4).
  function a85enc(u, z85 = false) {
    if (z85 && u.length % 4) bad(tr("Z85 cần số byte chia hết cho 4 (đang có {n}).", { n: u.length }));
    let out = "";
    for (let i = 0; i < u.length; i += 4) {
      const n = Math.min(4, u.length - i);
      let v = 0;
      for (let k = 0; k < 4; k++) v = v * 256 + (k < n ? u[i + k] : 0);
      if (!z85 && n === 4 && v === 0) { out += "z"; continue; }
      const d = [];
      for (let k = 0; k < 5; k++) { d.unshift(v % 85); v = Math.floor(v / 85); }
      out += d.slice(0, n + 1).map(x => z85 ? Z85[x] : String.fromCharCode(x + 33)).join("");
    }
    return out;
  }
  function a85dec(s, z85 = false) {
    let t = s.replace(/\s+/g, "");
    if (!z85) t = t.replace(/^<~/, "").replace(/~>$/, "").replace(/z/g, "!!!!!");
    if (z85 && t.length % 5) bad(tr("Z85 cần số ký tự chia hết cho 5 (đang có {n}).", { n: t.length }));
    const out = [];
    for (let i = 0; i < t.length; i += 5) {
      const n = Math.min(5, t.length - i);
      if (n === 1) bad(tr("Ascii85 thiếu ký tự ở cuối."));
      let v = 0;
      for (let k = 0; k < 5; k++) {
        const c = k < n ? t[i + k] : "u", x = z85 ? Z85.indexOf(c) : c.charCodeAt(0) - 33;
        if (x < 0 || x > 84) bad(tr("Ký tự “{c}” không thuộc {alpha}.", { c, alpha: z85 ? "Z85" : "Ascii85" }));
        v = v * 85 + x;
      }
      if (v > 0xffffffff) bad(tr("Nhóm 5 ký tự vượt 32 bit — không phải {alpha}.", { alpha: z85 ? "Z85" : "Ascii85" }));
      for (let k = 0; k < n - 1; k++) out.push(Math.floor(v / 256 ** (3 - k)) % 256);
    }
    return Uint8Array.from(out);
  }

  // HMAC: key as text (UTF-8) / hex / base64 → hex or base64 of the MAC.
  async function hmac(u, key, { alg = "SHA-256", keyFmt = "text", out = "hex" } = {}) {
    if (!key) bad(tr("Nhập khoá HMAC (không lưu, không đi theo link)."));
    let k;
    if (keyFmt === "hex") { const h = key.replace(/\s+/g, ""); if (!/^(?:[0-9a-f]{2})+$/i.test(h)) bad(tr("Khoá hex không hợp lệ.")); k = Uint8Array.from(h.match(/../g), x => parseInt(x, 16)); }
    else if (keyFmt === "base64") { try { k = Uint8Array.from(atob(key.replace(/\s+/g, "").replace(/-/g, "+").replace(/_/g, "/")), c => c.charCodeAt(0)); } catch { bad(tr("Khoá Base64 không hợp lệ.")); } }
    else k = new TextEncoder().encode(key);
    const ck = await crypto.subtle.importKey("raw", k, { name: "HMAC", hash: alg }, false, ["sign"]);
    const mac = new Uint8Array(await crypto.subtle.sign("HMAC", ck, u));
    return out === "base64" ? btoa(String.fromCharCode(...mac)) : [...mac].map(b => b.toString(16).padStart(2, "0")).join("");
  }

  // UUID v7: 48-bit Unix ms + version 7 + variant 10 + random. ULID: 10 Crockford chars of time + 16 random.
  const hex = u => [...u].map(b => b.toString(16).padStart(2, "0")).join("");
  function uuid7(ms = Date.now(), rnd = crypto.getRandomValues(new Uint8Array(10))) {
    const b = new Uint8Array(16);
    let t = ms;
    for (let i = 5; i >= 0; i--) { b[i] = t % 256; t = Math.floor(t / 256); }
    b.set(rnd, 6);
    b[6] = (b[6] & 0x0f) | 0x70;
    b[8] = (b[8] & 0x3f) | 0x80;
    const h = hex(b);
    return [h.slice(0, 8), h.slice(8, 12), h.slice(12, 16), h.slice(16, 20), h.slice(20)].join("-");
  }
  const CROCK = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
  function ulid(ms = Date.now(), rnd = crypto.getRandomValues(new Uint8Array(16))) {
    let t = ms, head = "";
    for (let i = 0; i < 10; i++) { head = CROCK[t % 32] + head; t = Math.floor(t / 32); }
    return head + [...rnd].map(b => CROCK[b & 31]).join("");
  }
  // → { kind: "UUID v7" | "ULID" | "UUID v1" | "UUID v6", ms } or null.
  function idTime(s) {
    const t = s.trim();
    if (/^[0-9a-f]{8}-?[0-9a-f]{4}-?7[0-9a-f]{3}-?[89ab][0-9a-f]{3}-?[0-9a-f]{12}$/i.test(t)) return { kind: "UUID v7", ms: parseInt(t.replace(/-/g, "").slice(0, 12), 16) };
    if (/^[0-7][0-9A-HJKMNP-TV-Z]{25}$/i.test(t)) { let ms = 0; for (const c of t.slice(0, 10).toUpperCase()) ms = ms * 32 + CROCK.indexOf(c); return { kind: "ULID", ms }; }
    return null;
  }

  // IPv4 / IPv6 CIDR → { v, network, broadcast?, mask?, wildcard?, first, last, hosts (BigInt), prefix }.
  const v4 = s => { const p = s.split("."); if (p.length !== 4 || !p.every(x => /^\d{1,3}$/.test(x) && +x <= 255)) return null; return p.reduce((a, x) => a * 256n + BigInt(x), 0n); };
  const v4s = n => [24n, 16n, 8n, 0n].map(k => String((n >> k) & 255n)).join(".");
  function v6(s) {
    const h = s.split("::");
    if (h.length > 2) return null;
    const part = x => x ? x.split(":") : [];
    let a = part(h[0]), b = part(h[1] ?? "");
    const tail = (b.length ? b : a)[(b.length ? b : a).length - 1];
    if (tail && tail.includes(".")) { const n = v4(tail); if (n === null) return null; const arr = b.length ? b : a; arr.splice(-1, 1, ((n >> 16n) & 0xffffn).toString(16), (n & 0xffffn).toString(16)); }
    if (h.length === 1 && a.length !== 8) return null;
    if (h.length === 2 && a.length + b.length > 7) return null;
    const all = [...a, ...new Array(8 - a.length - b.length).fill("0"), ...b];
    if (!all.every(x => /^[0-9a-f]{1,4}$/i.test(x))) return null;
    return all.reduce((acc, x) => (acc << 16n) + BigInt(parseInt(x, 16)), 0n);
  }
  function v6s(n) {
    const g = [];
    for (let k = 112n; k >= 0n; k -= 16n) g.push(Number((n >> k) & 0xffffn));
    let best = -1, len = 0;
    for (let i = 0; i < 8;) { if (g[i]) { i++; continue; } let j = i; while (j < 8 && !g[j]) j++; if (j - i > len && j - i > 1) { best = i; len = j - i; } i = j; }
    const hx = g.map(x => x.toString(16));
    return best < 0 ? hx.join(":") : hx.slice(0, best).join(":") + "::" + hx.slice(best + len).join(":");
  }
  function cidr(s) {
    const m = /^\s*([0-9a-f.:]+)\s*\/\s*(\d{1,3})\s*$/i.exec(s);
    if (!m) bad(tr("Nhập dạng địa chỉ/prefix, vd 10.0.0.0/22 hoặc 2001:db8::/48."));
    const isV6 = m[1].includes(":"), bits = isV6 ? 128n : 32n, p = BigInt(+m[2]);
    if (p > bits) bad(tr("Prefix /{p} vượt {max}.", { p: m[2], max: String(bits) }));
    const ip = isV6 ? v6(m[1]) : v4(m[1]);
    if (ip === null) bad(tr("Địa chỉ “{ip}” không hợp lệ.", { ip: m[1] }));
    const all = (1n << bits) - 1n, mask = p ? (all << (bits - p)) & all : 0n, net = ip & mask, end = net | (all ^ mask), size = 1n << (bits - p), fmt = isV6 ? v6s : v4s;
    if (isV6) return { v: 6, prefix: Number(p), network: fmt(net), first: fmt(net), last: fmt(end), hosts: size, host: ip !== net };
    const usable = p >= 31n ? size : size - 2n;
    return { v: 4, prefix: Number(p), network: fmt(net), broadcast: fmt(end), mask: fmt(mask), wildcard: fmt(all ^ mask), first: fmt(p >= 31n ? net : net + 1n), last: fmt(p >= 31n ? end : end - 1n), hosts: usable, host: ip !== net };
  }

  // One line: "10.0.0.0/22 · mạng … · broadcast … · mask … · host a – b (n)".
  function cidrText(s) {
    const r = cidr(s), num = x => typeof I18n !== "undefined" ? I18n.num(x) : String(x), parts = [s.trim(), tr("mạng {ip}", { ip: r.network })];
    if (r.v === 4) parts.push(tr("broadcast {ip}", { ip: r.broadcast }), tr("mask {ip}", { ip: r.mask }), tr("host {a} – {b} ({n})", { a: r.first, b: r.last, n: num(r.hosts) }));
    else parts.push(tr("dải {a} – {b}", { a: r.first, b: r.last }), tr("{n} địa chỉ", { n: r.hosts > 10n ** 15n ? "2^" + (128 - r.prefix) : num(r.hosts) }));
    return parts.join(" · ");
  }

  // chmod: "755" / "0755" / "4755" ⇄ "rwxr-xr-x" (a leading file-type char like "-" or "d" is allowed and dropped).
  function chmod(s) {
    const t = s.trim();
    if (/^[0-7]{3,4}$/.test(t)) {
      const d = t.padStart(4, "0").split("").map(Number), sp = d[0], out = [];
      for (let i = 1; i <= 3; i++) {
        const x = d[i], special = sp & (4 >> (i - 1));
        out.push(x & 4 ? "r" : "-", x & 2 ? "w" : "-", special ? (i === 3 ? (x & 1 ? "t" : "T") : (x & 1 ? "s" : "S")) : x & 1 ? "x" : "-");
      }
      return { octal: t.padStart(4, "0").replace(/^0(?=\d{3}$)/, ""), symbolic: out.join("") };
    }
    const m = /^[-dlbcps]?([r-][w-][xsS-][r-][w-][xsS-][r-][w-][xtT-])$/.exec(t);
    if (!m) bad(tr("Nhập quyền dạng 755 / 0644 / 4755 hoặc rwxr-x---."));
    const r = m[1];
    let sp = 0, digits = "";
    for (let i = 0; i < 3; i++) {
      const [a, b, c] = r.slice(i * 3, i * 3 + 3);
      if (/[sStT]/.test(c)) sp |= 4 >> i;
      digits += (a === "r" ? 4 : 0) + (b === "w" ? 2 : 0) + (/[xst]/.test(c) ? 1 : 0);
    }
    return { octal: (sp ? sp : "") + digits, symbolic: r };
  }

  return { b32enc, b32dec, b58enc, b58dec, a85enc, a85dec, hmac, uuid7, ulid, idTime, cidr, cidrText, chmod, v6, v6s };
})();

// Pure (node test): PEM / DER base64 → X.509 certificate fields via a small DER reader (no pkijs); private keys are recognised and never decoded.
const X509 = (() => {
  const OID = {
    "2.5.4.3": "CN", "2.5.4.6": "C", "2.5.4.7": "L", "2.5.4.8": "ST", "2.5.4.9": "street", "2.5.4.10": "O", "2.5.4.11": "OU", "2.5.4.5": "serialNumber", "2.5.4.4": "SN", "2.5.4.42": "GN", "2.5.4.12": "title",
    "2.5.4.97": "organizationIdentifier", "1.2.840.113549.1.9.1": "E", "0.9.2342.19200300.100.1.25": "DC", "0.9.2342.19200300.100.1.1": "UID",
    "1.2.840.113549.1.1.1": "RSA", "1.2.840.10045.2.1": "EC", "1.3.101.112": "Ed25519", "1.3.101.113": "Ed448", "1.3.101.110": "X25519", "1.2.840.10040.4.1": "DSA",
    "1.2.840.10045.3.1.7": "P-256", "1.3.132.0.34": "P-384", "1.3.132.0.35": "P-521", "1.3.132.0.10": "secp256k1",
    "1.2.840.113549.1.1.4": "md5WithRSA", "1.2.840.113549.1.1.5": "sha1WithRSA", "1.2.840.113549.1.1.11": "sha256WithRSA", "1.2.840.113549.1.1.12": "sha384WithRSA", "1.2.840.113549.1.1.13": "sha512WithRSA",
    "1.2.840.113549.1.1.10": "RSASSA-PSS", "1.2.840.10045.4.1": "ecdsa-with-SHA1", "1.2.840.10045.4.3.2": "ecdsa-with-SHA256", "1.2.840.10045.4.3.3": "ecdsa-with-SHA384", "1.2.840.10045.4.3.4": "ecdsa-with-SHA512",
    "1.3.6.1.5.5.7.3.1": "serverAuth", "1.3.6.1.5.5.7.3.2": "clientAuth", "1.3.6.1.5.5.7.3.3": "codeSigning", "1.3.6.1.5.5.7.3.4": "emailProtection", "1.3.6.1.5.5.7.3.8": "timeStamping", "1.3.6.1.5.5.7.3.9": "OCSPSigning",
    "2.5.29.17": "subjectAltName", "2.5.29.19": "basicConstraints", "2.5.29.15": "keyUsage", "2.5.29.37": "extKeyUsage", "2.5.29.14": "subjectKeyIdentifier", "2.5.29.35": "authorityKeyIdentifier",
    "2.5.29.31": "cRLDistributionPoints", "2.5.29.32": "certificatePolicies", "1.3.6.1.5.5.7.1.1": "authorityInfoAccess", "1.3.6.1.4.1.11129.2.4.2": "ctPrecertificateSCTs",
  };
  const KU = ["digitalSignature", "nonRepudiation", "keyEncipherment", "dataEncipherment", "keyAgreement", "keyCertSign", "cRLSign", "encipherOnly", "decipherOnly"];
  const CERT = /^(?:X509 |TRUSTED )?CERTIFICATE$/;
  const fail = code => { throw Object.assign(new Error(code), { code }); };
  const hex = (u, sep = "") => Array.from(u, b => b.toString(16).padStart(2, "0")).join(sep);

  // One TLV at pos → { tag, cons, start (content), end }; DER only (definite lengths ≤ 4 bytes).
  function tlv(u, pos, end = u.length) {
    if (pos + 2 > end) fail("truncated");
    const tag = u[pos];
    let len = u[pos + 1], at = pos + 2;
    if ((tag & 0x1f) === 0x1f) fail("tag");
    if (len & 0x80) {
      const n = len & 0x7f;
      if (!n || n > 4 || at + n > end) fail("length");
      len = 0;
      for (let i = 0; i < n; i++) len = len * 256 + u[at++];
    }
    if (at + len > end) fail("truncated");
    return { tag, cons: !!(tag & 0x20), start: at, end: at + len, from: pos };
  }
  function kids(u, n) { const out = []; for (let p = n.start; p < n.end;) { const k = tlv(u, p, n.end); out.push(k); p = k.end; } return out; }
  const body = (u, n) => u.subarray(n.start, n.end);
  function oid(u, n) {
    const b = body(u, n), parts = [];
    let v = 0;
    for (const x of b) { v = v * 128 + (x & 0x7f); if (!(x & 0x80)) { parts.push(v); v = 0; } }
    if (!parts.length) return "";
    const f = parts[0] < 80 ? Math.floor(parts[0] / 40) : 2;
    return [f, parts[0] - f * 40, ...parts.slice(1)].join(".");
  }
  function str(u, n) {
    const b = body(u, n);
    if (n.tag === 0x1e) { let s = ""; for (let i = 0; i + 1 < b.length; i += 2) s += String.fromCharCode(b[i] << 8 | b[i + 1]); return s; }
    if (n.tag === 0x14) return String.fromCharCode(...b);
    return new TextDecoder().decode(b);
  }
  function time(u, n) {
    const s = str(u, n), m = n.tag === 0x17 ? /^(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})?Z$/.exec(s) : /^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})?(?:\.\d+)?Z$/.exec(s);
    if (!m) return null;
    const y = n.tag === 0x17 ? (+m[1] < 50 ? 2000 : 1900) + +m[1] : +m[1];
    return Date.UTC(y, +m[2] - 1, +m[3], +m[4], +m[5], +(m[6] || 0));
  }
  const name = (u, n) => kids(u, n).flatMap(set => kids(u, set).map(atv => { const [k, v] = kids(u, atv); const id = oid(u, k); return [OID[id] || id, str(u, v)]; }));
  const nameText = list => list.map(([k, v]) => k + "=" + v).join(", ");
  function alg(u, n) { const [k, p] = kids(u, n); const id = oid(u, k); return { oid: id, name: OID[id] || id, param: p && p.tag === 0x06 ? oid(u, p) : "" }; }
  function intBits(b) { let i = 0; while (i < b.length - 1 && b[i] === 0) i++; return b.length - i ? (b.length - i - 1) * 8 + (32 - Math.clz32(b[i])) : 0; }

  function spki(u, n) {
    const [a, bits] = kids(u, n), al = alg(u, a), key = { alg: al.name, bits: 0, curve: "" };
    if (al.name === "RSA") { const seq = tlv(u, bits.start + 1, bits.end); key.bits = intBits(body(u, kids(u, seq)[0])); }
    else if (al.name === "EC") { key.curve = OID[al.param] || al.param; key.bits = { "P-256": 256, "P-384": 384, "P-521": 521, secp256k1: 256 }[key.curve] || 0; }
    else if (al.name === "Ed25519" || al.name === "X25519") key.bits = 256;
    else if (al.name === "Ed448") key.bits = 456;
    return key;
  }

  function general(u, n) {
    const t = n.tag & 0x1f, b = body(u, n);
    if (t === 2) return "DNS:" + str(u, n);
    if (t === 1) return "email:" + str(u, n);
    if (t === 6) return "URI:" + str(u, n);
    if (t === 7) return "IP:" + (b.length === 4 ? b.join(".") : b.length === 16 ? hex(b).match(/.{4}/g).join(":") : hex(b));
    if (t === 4) return "DirName:" + nameText(name(u, kids(u, n)[0]));
    return "other[" + t + "]";
  }

  function ext(u, n, out) {
    const ks = kids(u, n), id = oid(u, ks[0]), critical = ks.length > 2 && ks[1].tag === 0x01 && u[ks[1].start] !== 0, val = tlv(u, ks[ks.length - 1].start, ks[ks.length - 1].end), key = OID[id] || id;
    out.extensions.push({ oid: id, name: key, critical });
    if (key === "subjectAltName") out.san = kids(u, val).map(g => general(u, g));
    else if (key === "basicConstraints") { const k = kids(u, val), ca = k[0]?.tag === 0x01 && u[k[0].start] !== 0, pl = k.find(x => x.tag === 0x02); out.basic = { ca, pathLen: pl ? Number(BigInt("0x" + hex(body(u, pl)))) : null, critical }; }
    else if (key === "keyUsage") { const b = body(u, val), list = []; for (let i = 0; i < KU.length; i++) if ((b[1 + (i >> 3)] ?? 0) & (0x80 >> (i & 7))) list.push(KU[i]); out.keyUsage = list; }
    else if (key === "extKeyUsage") out.eku = kids(u, val).map(k => { const o = oid(u, k); return OID[o] || o; });
  }

  // DER bytes of one certificate → fields; throws { code } on a non-certificate.
  function decode(u, now = Date.now()) {
    const cert = tlv(u, 0);
    if (cert.tag !== 0x30 || cert.end !== u.length) fail("notCert");
    const [tbs, sigAlg] = kids(u, cert);
    if (!tbs || tbs.tag !== 0x30 || !sigAlg) fail("notCert");
    let f = kids(u, tbs), version = 1;
    if (f[0]?.tag === 0xa0) { version = u[kids(u, f[0])[0].start] + 1; f = f.slice(1); }
    if (f.length < 6 || f[0].tag !== 0x02) fail("notCert");
    const [serial, , issuer, validity, subject, pk] = f, [nb, na] = kids(u, validity), notBefore = time(u, nb), notAfter = time(u, na);
    const out = { version, serial: hex(body(u, serial), ":").toUpperCase(), issuer: name(u, issuer), subject: name(u, subject), notBefore, notAfter,
      daysLeft: notAfter == null ? null : Math.floor((notAfter - now) / 864e5), expired: notAfter != null && notAfter < now, notYet: notBefore != null && notBefore > now,
      key: spki(u, pk), sigAlg: alg(u, sigAlg).name, san: [], basic: null, keyUsage: [], eku: [], extensions: [] };
    const exts = f.find(x => x.tag === 0xa3);
    if (exts) for (const e of kids(u, kids(u, exts)[0])) { try { ext(u, e, out); } catch { out.extensions.push({ oid: "?", name: "?", critical: false, bad: true }); } }
    out.selfSigned = nameText(out.subject) === nameText(out.issuer);
    return out;
  }

  // Text → blocks [{ type, der?: Uint8Array, line }]: PEM blocks (a chain), else the whole text as DER base64 / hex.
  function blocks(text) {
    const out = [], re = /-----BEGIN ([A-Z0-9 ]+)-----([\s\S]*?)-----END \1-----/g;
    let m;
    while ((m = re.exec(text)) && out.length < 50) {
      const type = m[1], line = text.slice(0, m.index).split("\n").length;
      if (/PRIVATE KEY/.test(type)) { out.push({ type, line, private: true }); continue; }
      out.push({ type, line, der: CERT.test(type) ? unb64(m[2]) : null });
    }
    if (!out.length) {
      const t = text.trim();
      if (/^[0-9a-f\s:]+$/i.test(t) && t.replace(/[\s:]/g, "").length % 2 === 0) out.push({ type: "DER", line: 1, der: Uint8Array.from(t.replace(/[\s:]/g, "").match(/../g) || [], h => parseInt(h, 16)) });
      else if (/^[A-Za-z0-9+/=\s_-]{20,}$/.test(t)) out.push({ type: "DER", line: 1, der: unb64(t) });
    }
    return out;
  }
  function unb64(s) { try { const bin = atob(s.replace(/[\s]/g, "").replace(/-/g, "+").replace(/_/g, "/")); return Uint8Array.from(bin, c => c.charCodeAt(0)); } catch { return null; } }

  return { decode, blocks, nameText, hex, OID };
})();

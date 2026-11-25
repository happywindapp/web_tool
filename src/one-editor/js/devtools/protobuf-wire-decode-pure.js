// Pure (node test): raw Protobuf bytes (hex / base64) → field tree without a .proto: varint (+ zigzag), fixed32/64, length-delimited tried as message / UTF-8 / packed varints / bytes.
const ProtoWire = (() => {
  const MAX_BYTES = 1048576, MAX_DEPTH = 16, MAX_NODES = 20000;
  const WIRE = ["varint", "fixed64", "len", "group-start", "group-end", "fixed32"];
  const hex = u => Array.from(u, b => b.toString(16).padStart(2, "0")).join(" ");

  // Text → Uint8Array: hex (spaces / colons / 0x allowed) or base64 / base64url; null when neither.
  function bytesOf(text) {
    const t = text.replace(/^\s*(?:#|\/\/).*$/gm, "").trim(), h =t.replace(/0x|\\x|[\s:,]/gi, "");
    if (h && /^[0-9a-f]+$/i.test(h) && h.length % 2 === 0) return { kind: "hex", u: Uint8Array.from(h.match(/../g), x => parseInt(x, 16)) };
    const b = t.replace(/\s+/g, "").replace(/-/g, "+").replace(/_/g, "/");
    if (b && /^[A-Za-z0-9+/]+={0,2}$/.test(b) && b.replace(/=+$/, "").length % 4 !== 1) {
      try { const bin = atob(b.padEnd(b.length + (4 - b.length % 4) % 4, "=")); return { kind: "base64", u: Uint8Array.from(bin, c => c.charCodeAt(0)) }; } catch { /* not base64 */ }
    }
    return null;
  }

  function varint(u, p, end) {
    let v = 0n, shift = 0n;
    for (let i = 0; i < 10; i++) {
      if (p >= end) return null;
      const b = u[p++];
      v |= BigInt(b & 0x7f) << shift;
      if (!(b & 0x80)) return { v, p };
      shift += 7n;
    }
    return null;
  }
  const zigzag = v => (v >> 1n) ^ -(v & 1n);
  const signed64 = v => BigInt.asIntN(64, v);
  function printable(s) { let bad = 0; for (const c of s) { const n = c.codePointAt(0); if (n < 9 || (n > 13 && n < 32) || n === 0xfffd) bad++; } return bad === 0; }

  // Bytes → [nodes] or null when they do not parse as a message; budget.n counts nodes across the whole tree.
  function message(u, from, end, depth, budget, endGroup) {
    const out = [];
    let p = from;
    while (p < end) {
      if (++budget.n > MAX_NODES) { budget.cut = true; return out; }
      const key = varint(u, p, end);
      if (!key || key.v >> 3n === 0n || key.v >> 3n > 536870911n) return null;
      const no = Number(key.v >> 3n), wire = Number(key.v & 7n), at = p;
      p = key.p;
      if (wire === 0) { const r = varint(u, p, end); if (!r) return null; p = r.p; out.push({ no, wire: "varint", at, v: r.v.toString(), s: signed64(r.v) < 0n ? signed64(r.v).toString() : undefined, zz: zigzag(r.v).toString() }); }
      else if (wire === 1 || wire === 5) {
        const n = wire === 1 ? 8 : 4;
        if (p + n > end) return null;
        const dv = new DataView(u.buffer, u.byteOffset + p, n);
        out.push(wire === 1 ? { no, wire: "fixed64", at, v: dv.getBigUint64(0, true).toString(), s: dv.getBigInt64(0, true).toString(), f: dv.getFloat64(0, true) }
          : { no, wire: "fixed32", at, v: String(dv.getUint32(0, true)), s: String(dv.getInt32(0, true)), f: dv.getFloat32(0, true) });
        p += n;
      } else if (wire === 2) {
        const len = varint(u, p, end);
        if (!len || len.v > BigInt(end - len.p)) return null;
        p = len.p;
        const stop = p + Number(len.v);
        out.push({ no, wire: "len", at, len: stop - p, ...lenValue(u, p, stop, depth, budget) });
        p = stop;
      } else if (wire === 3) {
        if (depth >= MAX_DEPTH) return null;
        const g = { p: 0 }, kids = message(u, p, end, depth + 1, budget, { no, g });
        if (!kids || !g.p) return null;
        out.push({ no, wire: "group", at, kids });
        p = g.p;
      } else if (wire === 4) { if (!endGroup || endGroup.no !== no) return null; endGroup.g.p = p; return out; }
      else return null;
    }
    return endGroup ? null : out;
  }

  // A length-delimited value: an embedded message, a UTF-8 string, packed varints, or raw bytes (all candidates kept for the reader).
  function lenValue(u, p, stop, depth, budget) {
    const b = u.subarray(p, stop);
    let str = null;
    try { str = new TextDecoder("utf-8", { fatal: true }).decode(b); } catch { /* not UTF-8 */ }
    const text = str !== null && printable(str) ? str : null;
    const kids = depth < MAX_DEPTH && b.length ? message(u, p, stop, depth + 1, budget) : null;
    const r = { hex: hex(b.subarray(0, 256)) + (b.length > 256 ? " …" : "") };
    if (kids && kids.length && !(text !== null && text.length && !looksNested(kids, b.length))) r.kids = kids;
    if (text !== null) r.text = text;
    if (!r.kids && text === null) { const pk = packed(b); if (pk) r.packed = pk; }
    return r;
  }
  // Short printable text often also parses as a message; keep the message only when its fields look plausible.
  const looksNested = (kids, n) => n > 2 && kids.every(k => k.no < 1000);
  function packed(b) {
    const out = [];
    for (let p = 0; p < b.length && out.length < 200;) { const r = varint(b, p, b.length); if (!r) return null; out.push(r.v.toString()); p = r.p; }
    return out.length > 1 ? out : null;
  }

  function decode(text) {
    const src = bytesOf(text);
    if (!src) throw Object.assign(new Error("notBytes"), { code: "notBytes" });
    if (src.u.length > MAX_BYTES) throw Object.assign(new Error("tooBig"), { code: "tooBig" });
    const budget = { n: 0, cut: false }, fields = message(src.u, 0, src.u.length, 0, budget);
    if (!fields) throw Object.assign(new Error("notProto"), { code: "notProto", bytes: src.u.length });
    return { kind: src.kind, bytes: src.u.length, fields, cut: budget.cut };
  }

  // Tree → indented text lines: "2 [len 4] "ACME"".
  function text(fields, ind = "") {
    const out = [];
    for (const f of fields) {
      const head = ind + f.no + " [" + (f.wire === "len" ? "len " + f.len : f.wire) + "] ";
      if (f.wire === "varint") out.push(head + f.v + (f.s ? " · int64 " + f.s : "") + (f.zz !== f.v ? " · zigzag " + f.zz : ""));
      else if (f.wire === "fixed32" || f.wire === "fixed64") out.push(head + f.v + (f.s !== f.v ? " · int " + f.s : "") + " · " + (f.wire === "fixed32" ? "float " : "double ") + f.f);
      else if (f.wire === "group") { out.push(head.trimEnd()); out.push(...text(f.kids, ind + "  ")); }
      else if (f.kids) { out.push(head + "message" + (f.text != null ? " (or " + JSON.stringify(f.text.slice(0, 60)) + ")" : "")); out.push(...text(f.kids, ind + "  ")); }
      else if (f.text != null) out.push(head + JSON.stringify(f.text));
      else out.push(head + "bytes " + f.hex + (f.packed ? " · packed varints? " + f.packed.join(", ") : ""));
    }
    return out;
  }

  return { decode, text, bytesOf, WIRE, MAX_BYTES };
})();

// Encodings: detect (BOM → UTF-8 fatal → 1258/1252 guess), decode, encode byte-exact (UTF-8, UTF-16 LE/BE, single-byte Windows code pages); multi-byte legacy code pages are read-only.
const Encoding = (() => {
  const WRITABLE = ["utf-8", "utf-16le", "utf-16be", "windows-1252", "windows-1258", "windows-1250", "windows-1251", "windows-1254"];
  const READ_ONLY = ["shift_jis", "gbk", "big5", "euc-kr"];
  const LABEL = { "utf-8": "UTF-8", "utf-16le": "UTF-16 LE", "utf-16be": "UTF-16 BE" };
  const label = enc => LABEL[enc] || enc;
  const tables = {}, REPLACEMENT = String.fromCharCode(0xfffd);

  function bomOf(b) {
    if (b[0] === 0xef && b[1] === 0xbb && b[2] === 0xbf) return { enc: "utf-8", len: 3 };
    if (b[0] === 0xff && b[1] === 0xfe) return { enc: "utf-16le", len: 2 };
    if (b[0] === 0xfe && b[1] === 0xff) return { enc: "utf-16be", len: 2 };
    return null;
  }

  // UTF-16 without BOM: mostly-ASCII text has a zero in every other byte (odd positions = LE, even = BE).
  function utf16Guess(b) {
    const pairs = Math.floor(Math.min(b.length, 8192) / 2);
    if (pairs < 2) return null;
    let even = 0, odd = 0;
    for (let i = 0; i < pairs * 2; i += 2) { if (!b[i]) even++; if (!b[i + 1]) odd++; }
    if (odd / pairs > 0.3 && even / pairs < 0.05) return "utf-16le";
    if (even / pairs > 0.3 && odd / pairs < 0.05) return "utf-16be";
    return null;
  }

  // Not UTF-8: Windows-1258 when decoding it yields Vietnamese combining tone marks, else Windows-1252.
  function detect(bytes) {
    const bom = bomOf(bytes);
    if (bom) return { enc: bom.enc, bom: true, guessed: false };
    const u16 = utf16Guess(bytes);
    if (u16) return { enc: u16, bom: false, guessed: true };
    try { new TextDecoder("utf-8", { fatal: true }).decode(bytes); return { enc: "utf-8", bom: false, guessed: false }; } catch { /* not UTF-8 */ }
    const vi = (new TextDecoder("windows-1258").decode(bytes).match(/[a-zA-ZăâêôơưĂÂÊÔƠƯ]\p{Mn}/gu) || []).length;
    return { enc: vi ? "windows-1258" : "windows-1252", bom: false, guessed: true };
  }

  // → { text, bom } (BOM removed from text).
  function decode(bytes, enc) {
    const bom = bomOf(bytes), has = !!bom && bom.enc === enc;
    return { text: new TextDecoder(enc).decode(has ? bytes.subarray(bom.len) : bytes), bom: has };
  }

  // char → byte for a single-byte code page, built by decoding all 256 bytes.
  function table(enc) {
    if (tables[enc]) return tables[enc];
    const map = new Map(), dec = new TextDecoder(enc);
    for (let b = 0; b < 256; b++) { const c = dec.decode(new Uint8Array([b])); if (c !== REPLACEMENT && !map.has(c)) map.set(c, b); }
    return (tables[enc] = map);
  }

  // Precomposed letters missing from the code page (1258 "ế") → base letter + combining marks, as Windows-1258 stores them.
  function bytesOf(ch, map) {
    if (map.has(ch)) return [map.get(ch)];
    const [base, ...marks] = [...ch.normalize("NFD")];
    for (let i = -1; i < marks.length; i++) {
      const head = i < 0 ? base : (base + marks[i]).normalize("NFC"), rest = marks.filter((m, k) => k !== i);
      if (map.has(head) && rest.every(m => map.has(m))) return [map.get(head), ...rest.map(m => map.get(m))];
    }
    return null;
  }

  // Throws an Error with .line/.col at the first character the encoding cannot hold (never writes "?").
  function encode(text, enc, bom = false) {
    if (enc === "utf-8") { const b = new TextEncoder().encode(text); return bom ? concat([0xef, 0xbb, 0xbf], b) : b; }
    if (enc === "utf-16le" || enc === "utf-16be") {
      const le = enc === "utf-16le", out = new Uint8Array((text.length + (bom ? 1 : 0)) * 2);
      let o = 0;
      const put = u => { out[o++] = le ? u & 255 : u >> 8; out[o++] = le ? u >> 8 : u & 255; };
      if (bom) put(0xfeff);
      for (let i = 0; i < text.length; i++) put(text.charCodeAt(i));
      return out;
    }
    if (!WRITABLE.includes(enc)) throw new Error(T("Không ghi được bảng mã {enc} — chỉ đọc.", { enc }));
    const map = table(enc), out = [];
    let line = 1, col = 1;
    for (const ch of text) {
      const b = bytesOf(ch, map);
      if (!b) throw Object.assign(new Error(T("Ký tự “{ch}” (dòng {line}, cột {col}) không có trong {enc} — chọn UTF-8 hoặc sửa ký tự đó.", { ch, line, col, enc })), { line, col });
      out.push(...b);
      if (ch === "\n") { line++; col = 1; } else col++;
    }
    return new Uint8Array(out);
  }

  const concat = (a, b) => { const r = new Uint8Array(a.length + b.length); r.set(a); r.set(b, a.length); return r; };

  // CRLF / LF / CR counts → dominant EOL + mixed flag.
  function eolOf(text) {
    const crlf = (text.match(/\r\n/g) || []).length, cr = (text.match(/\r(?!\n)/g) || []).length, lf = (text.match(/(^|[^\r])\n/g) || []).length;
    const top = Math.max(crlf, cr, lf);
    const mixed = [crlf, cr, lf].filter(Boolean).length > 1;
    // Mixed: one code per line break ("w" CRLF, "n" LF, "r" CR) so each line keeps its own on save.
    const codes = mixed ? text.match(/\r\n|\r|\n/g).map(m => m === "\n" ? "n" : m === "\r" ? "r" : "w").join("") : null;
    return { eol: !top || top === lf ? "\n" : top === crlf ? "\r\n" : "\r", mixed, counts: { crlf, lf, cr }, codes };
  }

  const EOL_NAME = { "\r\n": "CRLF", "\n": "LF", "\r": "CR" };
  return { detect, decode, encode, eolOf, label, WRITABLE, READ_ONLY, EOL_NAME, writable: enc => WRITABLE.includes(enc) };
})();

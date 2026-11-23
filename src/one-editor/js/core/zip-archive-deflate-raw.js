// ZIP write / read with the browser's own deflate-raw streams (no library): UTF-8 names, stored or deflate; ZIP64 and encrypted entries are refused.
const Zip = (() => {
  const CRC = new Uint32Array(256).map((_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
  const crc32 = bytes => { let c = ~0; for (let i = 0; i < bytes.length; i++) c = CRC[(c ^ bytes[i]) & 255] ^ (c >>> 8); return ~c >>> 0; };
  const pipe = async (bytes, stream) => new Uint8Array(await new Response(new Blob([bytes]).stream().pipeThrough(stream)).arrayBuffer());
  const LIMIT = 0xFFFFFFFF;

  function dosTime(d) {
    const y = Math.max(1980, d.getFullYear());
    return { time: (d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1), date: ((y - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate() };
  }
  const fromDos = (date, time) => new Date(1980 + (date >> 9), ((date >> 5) & 15) - 1, date & 31, time >> 11, (time >> 5) & 63, (time & 31) * 2);

  // entries: [{ name ("a/b.txt", folders end with "/"), data?: Uint8Array, date?: Date }] → Blob.
  async function create(entries) {
    const enc = new TextEncoder(), parts = [], central = [];
    let offset = 0;
    for (const e of entries) {
      const name = enc.encode(e.name), raw = e.data || new Uint8Array(0), dir = e.name.endsWith("/");
      if (raw.length >= LIMIT) throw new Error(T("“{name}” lớn hơn 4 GB — ZIP này chưa hỗ trợ.", { name: e.name }));
      const deflated = dir || !raw.length ? raw : await pipe(raw, new CompressionStream("deflate-raw")), packed = deflated.length < raw.length ? deflated : raw;
      const method = packed === raw ? 0 : 8, { time, date } = dosTime(e.date || new Date()), crc = dir ? 0 : crc32(raw);
      const head = new DataView(new ArrayBuffer(30));
      [[0, 0x04034b50, 4], [4, 20, 2], [6, 0x800, 2], [8, method, 2], [10, time, 2], [12, date, 2], [14, crc, 4], [18, packed.length, 4], [22, raw.length, 4], [26, name.length, 2]]
        .forEach(([at, v, n]) => n === 4 ? head.setUint32(at, v, true) : head.setUint16(at, v, true));
      const cd = new DataView(new ArrayBuffer(46));
      [[0, 0x02014b50, 4], [4, 20, 2], [6, 20, 2], [8, 0x800, 2], [10, method, 2], [12, time, 2], [14, date, 2], [16, crc, 4], [20, packed.length, 4], [24, raw.length, 4], [28, name.length, 2], [38, dir ? 16 : 0, 4], [42, offset, 4]]
        .forEach(([at, v, n]) => n === 4 ? cd.setUint32(at, v, true) : cd.setUint16(at, v, true));
      parts.push(head, name, packed);
      central.push(cd, name);
      offset += 30 + name.length + packed.length;
      if (offset >= LIMIT) throw new Error(T("ZIP lớn hơn 4 GB — chưa hỗ trợ."));
    }
    const size = central.reduce((s, p) => s + p.byteLength, 0), end = new DataView(new ArrayBuffer(22));
    [[0, 0x06054b50, 4], [8, entries.length, 2], [10, entries.length, 2], [12, size, 4], [16, offset, 4]]
      .forEach(([at, v, n]) => n === 4 ? end.setUint32(at, v, true) : end.setUint16(at, v, true));
    return new Blob([...parts, ...central, end], { type: "application/zip" });
  }

  // Blob → [{ name, dir, date, size, bytes: () => Promise<Uint8Array> }] from the central directory.
  async function read(blob) {
    const buf = new Uint8Array(await blob.arrayBuffer()), v = new DataView(buf.buffer), bad = () => new Error(T("Không phải file ZIP hợp lệ."));
    let eocd = -1;
    for (let i = buf.length - 22; i >= Math.max(0, buf.length - 65557); i--) if (v.getUint32(i, true) === 0x06054b50) { eocd = i; break; }
    if (eocd < 0) throw bad();
    const count = v.getUint16(eocd + 10, true), start = v.getUint32(eocd + 16, true);
    if (count === 0xFFFF || start === LIMIT) throw new Error(T("ZIP64 chưa hỗ trợ."));
    const dec = new TextDecoder(), out = [];
    for (let k = 0, p = start; k < count; k++) {
      if (p + 46 > buf.length || v.getUint32(p, true) !== 0x02014b50) throw bad();
      const flags = v.getUint16(p + 8, true), method = v.getUint16(p + 10, true), crc = v.getUint32(p + 16, true), csize = v.getUint32(p + 20, true), size = v.getUint32(p + 24, true);
      const nlen = v.getUint16(p + 28, true), xlen = v.getUint16(p + 30, true), clen = v.getUint16(p + 32, true), local = v.getUint32(p + 42, true);
      const name = dec.decode(buf.subarray(p + 46, p + 46 + nlen)), date = fromDos(v.getUint16(p + 14, true), v.getUint16(p + 12, true));
      p += 46 + nlen + xlen + clen;
      if (flags & 1) throw new Error(T("“{name}” được mã hoá bằng mật khẩu — chưa hỗ trợ.", { name }));
      if (csize === LIMIT || size === LIMIT) throw new Error(T("ZIP64 chưa hỗ trợ."));
      const bytes = async () => {
        if (v.getUint32(local, true) !== 0x04034b50) throw bad();
        const at = local + 30 + v.getUint16(local + 26, true) + v.getUint16(local + 28, true), packed = buf.subarray(at, at + csize);
        const raw = method === 0 ? packed.slice() : method === 8 ? await pipe(packed, new DecompressionStream("deflate-raw")).catch(() => { throw new Error(T("“{name}” bị hỏng.", { name })); }) : null;
        if (!raw) throw new Error(T("“{name}” dùng kiểu nén chưa hỗ trợ.", { name }));
        if (crc32(raw) !== crc) throw new Error(T("“{name}” bị hỏng (sai CRC).", { name }));
        return raw;
      };
      out.push({ name, dir: name.endsWith("/"), date, size, bytes });
    }
    return out;
  }

  return { create, read, crc32 };
})();

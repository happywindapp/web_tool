// Read-only hex view of binary files: "offset  8 bytes  8 bytes  |ascii|" per 16 bytes; only the first LIMIT bytes are shown.
const HexDump = (() => {
  const LIMIT = 1024 * 1024;
  const hexes = bytes => [...bytes].map(b => b.toString(16).padStart(2, "0"));

  // bytes: Uint8Array (the head of the file); total: whole file size, to say what was left out.
  function format(bytes, total = bytes.length) {
    const rows = [];
    for (let o = 0; o < bytes.length; o += 16) {
      const chunk = bytes.subarray(o, o + 16), h = hexes(chunk);
      const ascii = String.fromCharCode(...[...chunk].map(b => b >= 32 && b < 127 ? b : 46));
      rows.push(o.toString(16).padStart(8, "0") + "  " + h.slice(0, 8).join(" ").padEnd(23) + "  " + h.slice(8).join(" ").padEnd(23) + "  |" + ascii + "|");
    }
    if (total > bytes.length) rows.push(T("… chỉ hiện {shown} byte đầu trong tổng {total} byte.", { shown: bytes.length, total }));
    return rows.join("\n") + "\n";
  }

  async function ofFile(file, limit = LIMIT) {
    return format(new Uint8Array(await file.slice(0, limit).arrayBuffer()), file.size);
  }

  return { format, ofFile, LIMIT };
})();

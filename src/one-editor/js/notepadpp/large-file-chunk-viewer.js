// Files over 50 MB: a read-only tab showing one ~4 MB chunk at a time (Blob.slice, cut at a line break), next / previous / go to chunk, and a chunk-by-chunk search with progress.
const BigFile = (() => {
  const CHUNK = 4 * 1024 * 1024, MAX_HITS = 1000;
  const mb = n => (n / 1048576).toFixed(1);

  // Bytes [start, start+CHUNK) cut after the last "\n" (whole lines, no split UTF-8 character) → { text, end }.
  async function read(file, start) {
    const bytes = new Uint8Array(await file.slice(start, Math.min(file.size, start + CHUNK)).arrayBuffer());
    let cut = bytes.length;
    if (start + bytes.length < file.size) { const nl = bytes.lastIndexOf(10); if (nl >= 0) cut = nl + 1; }
    return { text: new TextDecoder("utf-8").decode(bytes.subarray(0, cut)).replace(/\r\n?/g, "\n"), end: start + cut };
  }

  const title = (big, file) => T("{name} [{a}–{b} / {total} MB, chỉ đọc]", { name: file.name, a: mb(big.start), b: mb(big.end), total: mb(file.size) });

  // handle (when the browser gave one) lets the tab come back after F5 at the same chunk.
  async function open(file, gi, handle = null) {
    const r = await read(file, 0);
    const doc = Docs.create({ kind: "temp", name: file.name, text: r.text, readOnly: true, handle, lang: LangDetect.byName(file.name) || LangDetect.PLAIN });
    doc.big = { file, start: 0, end: r.end, starts: [0] };
    doc.name = title(doc.big, file);
    Views.open(doc, gi);
    StatusBar.msg(T("“{name}” lớn hơn 50 MB — xem chỉ đọc theo đoạn ~4 MB. Lệnh “File lớn: đoạn kế / trước / tìm” trong Palette.", { name: file.name }), "warn");
    return doc;
  }

  // After F5: FileOpen.reload hands over the file again; the tab shows the chunk it was on.
  async function attach(doc, file) {
    const start = doc.bigStart > 0 && doc.bigStart < file.size ? doc.bigStart : 0, r = await read(file, start);
    Object.assign(doc, { stale: false, text: r.text, state: null, readOnly: true, big: { file, start, end: r.end, starts: [start] } });
    const gi = Views.where(doc.id);
    if (gi >= 0 && Views.groups[gi].active === doc.id) { Views.groups[gi].active = null; Views.activate(gi, doc.id, false); }
    Docs.rename(doc, title(doc.big, file));
  }

  // Chunk before b.start: from history, else ~CHUNK bytes back, aligned after a line break.
  async function prevStart(b) {
    const k = b.starts.indexOf(b.start);
    if (k > 0) return b.starts[k - 1];
    if (!b.start) return -1;
    let p = Math.max(0, b.start - CHUNK);
    if (p) { const nl = new Uint8Array(await b.file.slice(p, b.start).arrayBuffer()).indexOf(10); p = nl >= 0 ? p + nl + 1 : p; }
    b.starts.unshift(p);
    return p;
  }

  const active = () => { const d = Views.activeDoc(); if (d && d.big) return d; StatusBar.msg(T("Tab đang mở không phải file lớn."), "warn"); return null; };

  async function show(doc, start) {
    const b = doc.big, r = await read(b.file, start);
    b.start = start; b.end = r.end;
    if (!b.starts.includes(start)) { b.starts.push(start); b.starts.sort((x, y) => x - y); }
    Views.replaceText(doc, r.text);
    Docs.rename(doc, title(b, b.file));
  }

  async function move(dir) {
    const doc = active();
    if (!doc) return;
    const b = doc.big, prev = dir < 0 ? await prevStart(b) : -1;
    if (dir > 0 && b.end < b.file.size) await show(doc, b.end);
    else if (prev >= 0) await show(doc, prev);
    else StatusBar.msg(T(dir > 0 ? "Đã ở đoạn cuối." : "Đã ở đoạn đầu."));
  }

  // Scans every chunk; hits list chunk start + global line number, opened as a report tab.
  async function search() {
    const doc = active();
    if (!doc) return;
    const q = prompt(T("Tìm trong toàn bộ file (phân biệt hoa / thường):"), "");
    if (!q) return;
    const b = doc.big, hits = [];
    let pos = 0, line = 1;
    while (pos < b.file.size && hits.length < MAX_HITS) {
      const r = await read(b.file, pos), rows = r.text.split("\n");
      rows.forEach((row, i) => { if (row.includes(q) && hits.length < MAX_HITS) hits.push(T("dòng {line} · đoạn {mb} MB: {text}", { line: line + i, mb: mb(pos), text: row.slice(0, 200) })); });
      line += rows.length - 1;
      pos = r.end;
      StatusBar.msg(T("Đang tìm… {p}%", { p: Math.round(pos * 100 / b.file.size) }));
    }
    const out = Docs.create({ kind: "temp", name: T("Tìm “{q}” trong {name}", { q, name: b.file.name }), lang: LangDetect.PLAIN, text: hits.join("\n") + "\n" });
    Views.open(out, Views.other(Views.where(doc.id)), false);
    StatusBar.msg(T("Tìm thấy {n} dòng{more}.", { n: hits.length, more: hits.length >= MAX_HITS ? " " + T("(dừng ở 1000)") : "" }), hits.length ? "good" : "warn");
  }

  async function goTo() {
    const doc = active();
    if (!doc) return;
    const v = parseFloat(prompt(T("Tới vị trí (MB, 0–{max}):", { max: mb(doc.big.file.size) }), "0"));
    if (!(v >= 0)) return;
    const target = Math.min(Math.floor(v * 1048576), doc.big.file.size - 1);
    const head = new Uint8Array(await doc.big.file.slice(target, Math.min(doc.big.file.size, target + 65536)).arrayBuffer()), nl = target ? head.indexOf(10) : -1;
    await show(doc, target && nl >= 0 ? target + nl + 1 : target);
  }

  return { open, attach, move, search, goTo, read };
})();

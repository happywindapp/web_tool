// Value ⇄ table: array of objects → header + rows (nested → "a.b" columns or JSON text), and rows → objects back.
const TableShape = (() => {
  const asJson = v => JsonTool.stringify(Val.toAst(v), "");

  // Descend single-key wrappers ({ "data": [...] }) only when they lead to an array of rows; otherwise keep the key names.
  function pickRows(v, notes) {
    const path = [];
    let cur = v;
    while (Val.isObj(cur) && Object.keys(cur).length === 1 && !Val.isScalar(cur[Object.keys(cur)[0]])) { const k = Object.keys(cur)[0]; path.push(k); cur = cur[k]; }
    if (Val.isObj(cur)) {
      const arrs = Object.keys(cur).filter(k => Array.isArray(cur[k]) && cur[k].some(Val.isObj));
      if (arrs.length === 1) { path.push(arrs[0]); cur = cur[arrs[0]]; }
    }
    if (!Array.isArray(cur)) return [v];
    if (path.length) notes.push(`Dùng mảng tại "${path.join(".")}" làm các hàng`);
    return cur;
  }

  // A literal "a.b" key and a flattened a → b land on the same column; the later one gets a suffix instead of overwriting.
  function flatInto(row, key, v, flatten, notes) {
    if (flatten && Val.isObj(v) && Object.keys(v).length) {
      for (const k of Object.keys(v)) flatInto(row, key + "." + k, v[k], flatten, notes);
      return;
    }
    let k = key;
    for (let i = 2; row.has(k); i++) k = `${key}_${i}`;
    if (k !== key) notes.add(`Cột "${key}" bị trùng sau khi làm phẳng → đổi thành "${k}"`);
    row.set(k, Val.isScalar(v) ? v : asJson(v));
  }

  function toTable(value, { flatten = true } = {}) {
    const notes = [], items = pickRows(value, notes), clash = new Set();
    if (items.length && items.every(Array.isArray)) {
      return { header: null, rows: items.map(r => r.map(c => Val.isScalar(c) ? c : asJson(c))), notes };
    }
    const cols = [], seen = new Set();
    const maps = items.map(it => {
      const m = new Map();
      if (Val.isObj(it)) for (const k of Object.keys(it)) flatInto(m, k, it[k], flatten, clash);
      else m.set("value", Val.isScalar(it) ? it : asJson(it));
      for (const k of m.keys()) if (!seen.has(k)) { seen.add(k); cols.push(k); }
      return m;
    });
    return { header: cols, rows: maps.map(m => cols.map(c => m.has(c) ? m.get(c) : null)), notes: [...notes, ...clash] };
  }

  function setPath(o, parts, v) {
    let cur = o;
    for (const p of parts.slice(0, -1)) {
      if (!Object.hasOwn(cur, p) || !Val.isObj(cur[p])) Val.put(cur, p, {});
      cur = cur[p];
    }
    Val.put(cur, parts[parts.length - 1], v);
  }

  function fromTable(rows, { header = true, infer = true, unflatten = true } = {}) {
    const conv = s => infer ? Val.infer(s) : s;
    if (!header) return { value: rows.map(r => r.map(conv)), notes: [] };
    const [head = [], ...body] = rows, notes = [];
    const width = body.reduce((w, r) => Math.max(w, r.length), head.length);
    const taken = new Set();
    if (head.some(h => h !== h.trim())) notes.push("Bỏ khoảng trắng đầu/cuối ở tên cột");
    const names = Array.from({ length: width }, (_, i) => {
      const base = (head[i] || "").trim() || `col${i + 1}`;
      let n = base;
      for (let k = 2; taken.has(n); k++) n = `${base}_${k}`;
      if (n !== base) notes.push(`Tiêu đề "${base}" bị trùng → đổi thành "${n}"`);
      taken.add(n);
      return n;
    });
    // "a.b" next to a column "a" (or "a.b.c" next to "a.b") would overwrite each other when nested → keep those flat.
    const nestable = n => {
      if (!unflatten || !n.includes(".") || n.startsWith(".") || n.endsWith(".")) return false;
      const parts = n.split(".");
      for (let i = 1; i < parts.length; i++) if (taken.has(parts.slice(0, i).join("."))) { notes.push(`Cột "${n}" trùng tiền tố với cột khác → giữ nguyên tên, không tách thành object lồng`); return false; }
      return true;
    };
    const nested = names.map(nestable);
    const value = body.map(r => {
      const o = {};
      names.forEach((n, i) => {
        const v = conv(r[i] ?? "");
        if (nested[i]) setPath(o, n.split("."), v); else Val.put(o, n, v);
      });
      return o;
    });
    return { value, notes };
  }

  return { toTable, fromTable };
})();

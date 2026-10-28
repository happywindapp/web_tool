// JSON: strict check + tolerant parser that repairs common syntax errors, AST keeps raw numbers & duplicate keys.
const JsonTool = (() => {
  const lineCol = TextUtil.lineCol;

  function check(text) {
    try { JSON.parse(text); return null; }
    catch (e) {
      const m = e.message.match(/line (\d+) column (\d+)/) || null;
      const p = e.message.match(/position (\d+)/);
      const lc = m ? { line: +m[1], col: +m[2] } : p ? lineCol(text, +p[1]) : { line: 1, col: 1 };
      return { ...lc, msg: e.message };
    }
  }

  function parse(text) {
    const s = TextUtil.stripBom(text);
    let i = 0;
    const fixes = [];
    const fix = (msg, at = i) => fixes.push({ ...lineCol(s, at), msg });
    const ws = () => {
      for (;;) {
        while (i < s.length && /\s/.test(s[i])) i++;
        if (s.startsWith("//", i) || s[i] === "#") { fix("Bỏ chú thích (JSON không cho phép chú thích)"); while (i < s.length && s[i] !== "\n") i++; }
        else if (s.startsWith("/*", i)) { fix("Bỏ chú thích /* */"); const e = s.indexOf("*/", i + 2); i = e < 0 ? s.length : e + 2; }
        else return;
      }
    };
    const isKeyStart = c => c === '"' || c === "'" || /[A-Za-z_$À-￿]/.test(c || "");
    const isValStart = c => c !== undefined && /["'{[\-+.\dA-Za-z_$]/.test(c);

    function str() {
      const q = s[i], start = i;
      if (q === "'") fix("Chuỗi dùng nháy đơn → đổi sang nháy kép");
      i++;
      let out = "";
      while (i < s.length) {
        const c = s[i];
        if (c === q) { i++; return out; }
        if (c === "\n" || c === "\r") { fix("Chuỗi thiếu dấu đóng nháy → tự đóng ở cuối dòng", start); return out; }
        if (c === "\\") {
          const n = s[i + 1];
          const map = { n: "\n", t: "\t", r: "\r", b: "\b", f: "\f", "/": "/", "\\": "\\", '"': '"', "'": "'" };
          if (n === "u" && /^[0-9a-fA-F]{4}$/.test(s.substr(i + 2, 4))) { out += String.fromCharCode(parseInt(s.substr(i + 2, 4), 16)); i += 6; continue; }
          if (n in map) { out += map[n]; i += 2; continue; }
          fix(`Ký tự thoát không hợp lệ "\\${n}" → giữ nguyên dấu \\`); out += "\\"; i++; continue;
        }
        if (c === "\t") fix("Ký tự Tab trong chuỗi → thay bằng \\t");
        out += c; i++;
      }
      fix("Chuỗi chưa đóng đến cuối file → tự đóng", start);
      return out;
    }

    function word() {
      const m = s.slice(i).match(/^[A-Za-z_$À-￿][\w$\-À-￿]*/);
      i += m[0].length;
      return m[0];
    }

    function num() {
      const m = s.slice(i).match(/^[+\-]?(0[xX][0-9a-fA-F]+|\d*\.?\d*(?:[eE][+\-]?\d+)?)/);
      let raw = m[0];
      i += raw.length;
      const orig = raw;
      if (/^[+\-]?0[xX]/.test(raw)) raw = String(parseInt(raw, 16));
      raw = raw.replace(/^\+/, "").replace(/^(-?)\./, "$10.").replace(/\.(?=$|[eE])/, "").replace(/^(-?)0+(?=\d)/, "$1");
      if (!/^-?\d/.test(raw)) { fix(`Số không hợp lệ "${orig}" → null`); return { t: "lit", v: "null" }; }
      if (raw !== orig) fix(`Số "${orig}" sai định dạng JSON → "${raw}"`);
      return { t: "num", raw };
    }

    function value(depth) {
      ws();
      const c = s[i];
      if (c === undefined) { fix("Thiếu giá trị ở cuối file → null"); return { t: "lit", v: "null" }; }
      if (c === "{") return obj(depth);
      if (c === "[") return arr(depth);
      if (c === '"' || c === "'") return { t: "str", v: str() };
      if (/[\d\-+.]/.test(c)) return num();
      if (/[A-Za-z_$À-￿]/.test(c)) {
        const at = i, w = word();
        const lit = { true: "true", false: "false", null: "null", True: "true", False: "false", None: "null",
                      undefined: "null", NaN: "null", Infinity: "null", TRUE: "true", FALSE: "false", NULL: "null" }[w];
        if (lit) { if (lit !== w) fix(`"${w}" không có trong JSON → ${lit}`, at); return { t: "lit", v: lit }; }
        fix(`Giá trị "${w}" chưa đặt trong nháy kép → chuyển thành chuỗi`, at);
        return { t: "str", v: w };
      }
      fix(`Ký tự không hợp lệ "${c}" → bỏ qua`); i++;
      return value(depth);
    }

    function container(open, close, depth, readItem) {
      const start = i;
      i++;
      const items = [];
      let needComma = false;
      for (;;) {
        ws();
        const c = s[i];
        if (c === undefined) { fix(`Thiếu dấu "${close}" để đóng "${open}" mở ở đây → tự thêm`, start); return items; }
        if (c === close) { i++; return items; }
        if (c === "}" || c === "]") { fix(`Dấu "${c}" không khớp với "${open}" → đổi thành "${close}"`); i++; return items; }
        if (c === ",") {
          if (!needComma) fix("Dấu phẩy thừa → bỏ");
          i++; ws();
          if (s[i] === close) fix("Dấu phẩy thừa trước dấu đóng → bỏ", i - 1);
          needComma = false; continue;
        }
        if (needComma) {
          if ((open === "{" && isKeyStart(c)) || (open === "[" && isValStart(c))) fix("Thiếu dấu phẩy giữa hai phần tử → tự thêm");
          else { fix(`Ký tự không hợp lệ "${c}" → bỏ qua`); i++; continue; }
        }
        const it = readItem();
        if (it !== null) { items.push(it); needComma = true; }
      }
    }

    function obj(depth) {
      const items = container("{", "}", depth, () => {
        let k;
        const at = i;
        if (s[i] === '"' || s[i] === "'") k = str();
        else if (/[A-Za-z_$À-￿\d]/.test(s[i])) { k = s.slice(i).match(/^[^\s:=,{}\[\]"']+/)[0]; i += k.length; fix(`Tên khóa ${k} chưa đặt trong nháy kép → thêm nháy`, at); }
        else { fix(`Ký tự không hợp lệ "${s[i]}" → bỏ qua`); i++; return null; }
        ws();
        if (s[i] === ":") i++;
        else if (s[i] === "=") { fix('Dùng "=" thay cho ":" → sửa'); i++; }
        else fix(`Thiếu dấu ":" sau khóa "${k}" → tự thêm`);
        return { k, v: value(depth + 1) };
      });
      const seen = new Set();
      for (const it of items) if (it) { if (seen.has(it.k)) fixes.push({ line: 0, col: 0, msg: `Khóa "${it.k}" bị trùng (giữ nguyên cả hai, nên kiểm tra lại)` }); seen.add(it.k); }
      return { t: "obj", items: items.filter(Boolean) };
    }
    const arr = depth => ({ t: "arr", items: container("[", "]", depth, () => value(depth + 1)) });

    ws();
    if (i >= s.length) throw new Error("Nội dung trống");
    const roots = [value(0)];
    for (ws(); i < s.length; ws()) {
      if (s[i] === ",") { i++; continue; }
      if (!isValStart(s[i])) { fix(`Nội dung thừa sau giá trị gốc "${s.slice(i, i + 20)}…" → bỏ`); break; }
      roots.push(value(0));
    }
    if (roots.length > 1) fix(`Có ${roots.length} giá trị gốc liền nhau (kiểu NDJSON) → gộp thành một mảng`, 0);
    return { ast: roots.length > 1 ? { t: "arr", items: roots } : roots[0], fixes };
  }

  const q = v => JSON.stringify(v);
  function stringify(n, indent, lvl = 0) {
    const pad = indent ? "\n" + indent.repeat(lvl + 1) : "", end = indent ? "\n" + indent.repeat(lvl) : "", sep = indent ? ": " : ":";
    if (n.t === "str") return q(n.v);
    if (n.t === "num") return n.raw;
    if (n.t === "lit") return n.v;
    if (!n.items.length) return n.t === "obj" ? "{}" : "[]";
    const parts = n.items.map(it => n.t === "obj" ? pad + q(it.k) + sep + stringify(it.v, indent, lvl + 1) : pad + stringify(it, indent, lvl + 1));
    return (n.t === "obj" ? "{" : "[") + parts.join(",") + end + (n.t === "obj" ? "}" : "]");
  }

  return { check, parse, stringify };
})();

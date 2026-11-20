// Regex tester, pure: JavaScript RegExp (ECMAScript) matches with numbered + named groups and their offsets, replace preview, token-by-token explanation.
const RegexCore = (() => {
  const MAX = 5000;
  function compile(pattern, flags) {
    if (!/^[dgimsuyv]*$/.test(flags) || new Set(flags).size !== flags.length) throw new Error(T("Cờ không hợp lệ “{f}” — dùng g i m s u v y d, mỗi cờ 1 lần.", { f: flags }));
    try { return new RegExp(pattern, flags.includes("d") ? flags : flags + "d"); } catch (e) { throw new Error(T("Regex lỗi: {msg}", { msg: e.message })); }
  }

  // Names of the capturing groups in order ("" = unnamed), skipping escapes and [classes].
  function groupNames(src) {
    const out = [];
    for (let i = 0, cls = false; i < src.length; i++) {
      const c = src[i];
      if (c === "\\") { i++; continue; }
      if (cls) { cls = c !== "]"; continue; }
      if (c === "[") { cls = true; continue; }
      if (c !== "(") continue;
      const m = /^\(\?<([A-Za-z_$][\w$]*)>/.exec(src.slice(i, i + 80));
      if (m) out.push(m[1]); else if (src[i + 1] !== "?") out.push("");
    }
    return out;
  }

  // → { list: [{ at, end, text, groups: [{ n, name, at, text }] }], more }; without g / y only the first match (as JS does).
  function matches(text, re, limit = MAX) {
    const names = groupNames(re.source), list = [], all = re.global || re.sticky;
    re.lastIndex = 0;
    for (let m; (m = re.exec(text));) {
      const groups = [];
      for (let n = 1; n < m.length; n++) groups.push({ n, name: names[n - 1] || "", at: m.indices[n] ? m.indices[n][0] : -1, text: m[n] ?? null });
      list.push({ at: m.index, end: m.index + m[0].length, text: m[0], groups });
      if (!all || list.length >= limit) break;
      if (m[0] === "") re.lastIndex += re.unicode || re.unicodeSets ? (text.codePointAt(re.lastIndex) > 0xffff ? 2 : 1) : 1;
    }
    return { list, more: all && list.length >= limit && re.exec(text) !== null };
  }

  const unesc = s => s.replace(/\\(n|t|\\)/g, (a, c) => c === "n" ? "\n" : c === "t" ? "\t" : "\\");
  function replace(text, re, repl) { re.lastIndex = 0; return text.replace(re, unesc(repl)); }

  const ESC = { d: "chữ số 0–9", D: "không phải chữ số", w: "chữ cái Latin / số / _", W: "không phải \\w", s: "khoảng trắng", S: "không phải khoảng trắng", b: "biên từ", B: "không phải biên từ",
    n: "xuống dòng (LF)", r: "CR", t: "Tab", f: "form feed", v: "vertical tab", 0: "ký tự NUL" };
  const QUANT = { "*": "0 lần trở lên", "+": "1 lần trở lên", "?": "0 hoặc 1 lần" };
  // → [{ tok, desc }]; consecutive plain characters become one literal token.
  function explain(pattern) {
    const out = [];
    let group = 0, lit = "";
    const push = (tok, desc) => { if (lit) { out.push({ tok: lit, desc: T("chuỗi “{s}”", { s: lit }) }); lit = ""; } if (tok) out.push({ tok, desc }); };
    for (let i = 0; i < pattern.length;) {
      const rest = pattern.slice(i), c = pattern[i];
      let m;
      if (c === "\\") {
        if ((m = /^\\([pP])\{([^}]*)\}/.exec(rest))) push(m[0], T(m[1] === "p" ? "ký tự có thuộc tính Unicode {p} (cần cờ u / v)" : "ký tự KHÔNG có thuộc tính Unicode {p}", { p: m[2] }));
        else if ((m = /^\\k<([^>]+)>/.exec(rest))) push(m[0], T("lặp lại đúng nội dung nhóm “{name}”", { name: m[1] }));
        else if ((m = /^\\([1-9]\d*)/.exec(rest))) push(m[0], T("lặp lại đúng nội dung nhóm {n}", { n: m[1] }));
        else if ((m = /^\\(x[0-9a-f]{2}|u[0-9a-f]{4}|u\{[0-9a-f]+\}|c[a-z])/i.exec(rest))) push(m[0], T("ký tự mã {code}", { code: m[1] }));
        else if (ESC[rest[1]]) { m = [rest.slice(0, 2)]; push(m[0], T(ESC[rest[1]])); }
        else { m = [rest.slice(0, 2)]; lit += rest[1] ?? ""; }
      } else if (c === "[") {
        m = /^\[(?:\\.|[^\]\\])*\]/.exec(rest) || [rest];
        push(m[0], m[0][1] === "^" ? T("1 ký tự KHÔNG thuộc tập {set}", { set: m[0] }) : T("1 ký tự thuộc tập {set}", { set: m[0] }));
      } else if (c === "(") {
        m = /^\((\?(?::|=|!|<=|<!|<([A-Za-z_$][\w$]*)>|[imsx-]+:)?)?/.exec(rest);
        const k = m[1] || "";
        push(m[0], k === "?:" ? T("nhóm không bắt") : k === "?=" ? T("nhìn trước: phía sau phải khớp") : k === "?!" ? T("nhìn trước phủ định: phía sau không được khớp")
          : k === "?<=" ? T("nhìn sau: phía trước phải khớp") : k === "?<!" ? T("nhìn sau phủ định: phía trước không được khớp")
          : m[2] ? T("nhóm bắt {n} tên “{name}”", { n: ++group, name: m[2] }) : k ? T("nhóm đổi cờ {f}", { f: k.slice(1, -1) }) : T("nhóm bắt {n}", { n: ++group }));
      } else if (c === ")") { m = [")"]; push(")", T("đóng nhóm")); }
      else if ((m = /^(\*|\+|\?|\{\d+(?:,\d*)?\})(\?)?/.exec(rest))) {
        const q = m[1], lazy = m[2] ? " " + T("(lười — ngắn nhất có thể)") : "";
        const r = /\{(\d+)(,?)(\d*)\}/.exec(q);
        push(m[0], (QUANT[q] ? T(QUANT[q]) : !r[2] ? T("đúng {n} lần", { n: r[1] }) : r[3] ? T("{a} đến {b} lần", { a: r[1], b: r[3] }) : T("{a} lần trở lên", { a: r[1] })) + lazy);
      } else if (c === "^") { m = ["^"]; push("^", T("đầu chuỗi (đầu dòng nếu có cờ m)")); }
      else if (c === "$") { m = ["$"]; push("$", T("cuối chuỗi (cuối dòng nếu có cờ m)")); }
      else if (c === ".") { m = ["."]; push(".", T("1 ký tự bất kỳ trừ xuống dòng (kể cả xuống dòng nếu có cờ s)")); }
      else if (c === "|") { m = ["|"]; push("|", T("hoặc")); }
      else { m = [c]; lit += c; }
      i += m[0].length || 1;
    }
    push();
    return out;
  }

  const FLAGS = { g: "tìm tất cả (không chỉ lần đầu)", i: "không phân biệt hoa / thường", m: "^ $ theo từng dòng", s: ". khớp cả xuống dòng", u: "Unicode (\\p{…}, ký tự ngoài BMP)", v: "Unicode sets (u mở rộng)", y: "dính: chỉ khớp ngay tại lastIndex", d: "trả vị trí từng nhóm" };
  return { compile, matches, replace, explain, FLAGS, MAX };
})();

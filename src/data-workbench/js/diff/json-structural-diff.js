// JSON structural compare on the value model: key order ignored, arrays by index → list of added/removed/changed paths.
const JsonDiff = (() => {
  const digits = raw => raw.replace(/[eE].*$/, "").replace(/[-.]/g, "").replace(/^0+/, "").replace(/0+$/, "").length;
  function same(a, b) {
    if (Val.isNum(a) && Val.isNum(b)) return a.raw === b.raw || (Number(a.raw) === Number(b.raw) && digits(a.raw) <= 15 && digits(b.raw) <= 15);
    return a === b;
  }
  const keyPath = (p, k) => /^[A-Za-z_$][\w$]*$/.test(k) ? `${p}.${k}` : `${p}[${JSON.stringify(k)}]`;
  const show = v => {
    const t = Val.isScalar(v) ? JsonTool.stringify(Val.toAst(v), "") : Array.isArray(v) ? `[${T("{n} phần tử", { n: v.length })}]` : `{${T("{n} khóa", { n: Object.keys(v).length })}}`;
    return t.length > 80 ? t.slice(0, 77) + "…" : t;
  };

  function compare(a, b, max = 500) {
    const out = [];
    (function walk(x, y, path) {
      if (out.length >= max) return;
      if (Array.isArray(x) && Array.isArray(y)) {
        for (let i = 0; i < Math.max(x.length, y.length); i++) {
          if (i >= x.length) out.push({ type: "add", path: `${path}[${i}]`, b: y[i] });
          else if (i >= y.length) out.push({ type: "del", path: `${path}[${i}]`, a: x[i] });
          else walk(x[i], y[i], `${path}[${i}]`);
        }
      } else if (Val.isObj(x) && Val.isObj(y)) {
        for (const k of Object.keys(x)) {
          if (!Object.hasOwn(y, k)) out.push({ type: "del", path: keyPath(path, k), a: x[k] });
          else walk(x[k], y[k], keyPath(path, k));
        }
        for (const k of Object.keys(y)) if (!Object.hasOwn(x, k)) out.push({ type: "add", path: keyPath(path, k), b: y[k] });
      } else if (!(Val.isScalar(x) && Val.isScalar(y) && same(x, y))) out.push({ type: "chg", path, a: x, b: y });
    })(a, b, "$");
    return out.slice(0, max);
  }

  const describe = d => d.type === "add" ? T("+ {path} thêm mới: {v}", { path: d.path, v: show(d.b) })
    : d.type === "del" ? T("− {path} bị xoá (giá trị cũ: {v})", { path: d.path, v: show(d.a) }) : `~ ${d.path}: ${show(d.a)} → ${show(d.b)}`;

  return { compare, describe };
})();

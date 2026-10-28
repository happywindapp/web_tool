// XML ⇄ value: attributes → "@name", text beside child elements → "#text", repeated tags → array (parse via tolerant MarkupTool).
const XmlMap = (() => {
  const ENT = { lt: "<", gt: ">", amp: "&", quot: '"', apos: "'" };
  const NAME_OK = /^[A-Za-z_À-￿][\w.\-À-￿]*$/;

  function decode(s) {
    return s.replace(/&(#x[0-9a-fA-F]+|#\d+|[A-Za-z]+);/g, (m, e) => {
      if (e[0] !== "#") return ENT[e] ?? m;
      try { return String.fromCodePoint(e[1] === "x" ? parseInt(e.slice(2), 16) : +e.slice(1)); } catch { return m; }
    });
  }
  const escT = s => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const escA = s => escT(s).replace(/"/g, "&quot;");

  function fromXml(text, { attrPrefix = "@", infer = true } = {}) {
    const { root, fixes } = MarkupTool.build(text, false);
    const conv = s => infer ? Val.infer(s) : s;
    function el(n) {
      const o = {};
      let txt = "";
      for (const a of n.attrs) Val.put(o, attrPrefix + a.n, conv(decode(a.v ?? "")));
      for (const c of n.children) {
        if (c.text !== undefined) txt += decode(c.text);
        else if (c.cdata) txt += c.cdata.slice(9, -3);
        else if (c.name) {
          const v = el(c);
          if (!Object.hasOwn(o, c.name)) Val.put(o, c.name, v);
          else if (Array.isArray(o[c.name])) o[c.name].push(v);
          else Val.put(o, c.name, [o[c.name], v]);
        }
      }
      const t = txt.trim();
      if (!Object.keys(o).length) return conv(t);
      if (t) Val.put(o, "#text", conv(t));
      return o;
    }
    const value = {};
    for (const c of root.children.filter(c => c.name)) Val.put(value, c.name, el(c));
    return { value, fixes };
  }

  function toXml(value, { root = "root", item = "item", attrPrefix = "@", indent = "  " } = {}) {
    const notes = new Set(), out = ['<?xml version="1.0" encoding="UTF-8"?>'];
    const nm = k => {
      if (NAME_OK.test(k)) return k;
      let f = k.replace(/[^\w.\-À-￿]/g, "_");
      if (!/^[A-Za-z_À-￿]/.test(f)) f = "_" + f;
      notes.add(`Tên "${k}" không hợp lệ trong XML → "${f}"`);
      return f;
    };
    function node(name, v, lvl) {
      const pad = indent.repeat(lvl);
      if (Array.isArray(v)) {
        v.forEach(x => {
          if (!Array.isArray(x)) return node(name, x, lvl);
          notes.add(`Mảng lồng mảng ở <${name}> → mỗi mảng con bọc trong <${name}>, phần tử là <${item}>`);
          node(name, { [item]: x }, lvl);
        });
        return;
      }
      if (!Val.isObj(v)) { const t = Val.text(v); out.push(t === "" ? `${pad}<${name}/>` : `${pad}<${name}>${escT(t)}</${name}>`); return; }
      const attrs = [], kids = [];
      let txt = "";
      for (const k of Object.keys(v)) {
        if (attrPrefix && k.startsWith(attrPrefix) && k.length > attrPrefix.length && Val.isScalar(v[k])) attrs.push(` ${nm(k.slice(attrPrefix.length))}="${escA(Val.text(v[k]))}"`);
        else if (k === "#text") txt = Val.text(v[k]);
        else kids.push(k);
      }
      const open = `${pad}<${name}${attrs.join("")}`;
      if (!kids.length) { out.push(txt === "" ? open + "/>" : `${open}>${escT(txt)}</${name}>`); return; }
      out.push(open + ">");
      if (txt) out.push(pad + indent + escT(txt));
      kids.forEach(k => node(nm(k), v[k], lvl + 1));
      out.push(`${pad}</${name}>`);
    }
    const keys = Val.isObj(value) ? Object.keys(value) : [];
    if (keys.length === 1 && !Array.isArray(value[keys[0]])) node(nm(keys[0]), value[keys[0]], 0);
    else if (Array.isArray(value)) { out.push(`<${nm(root)}>`); value.forEach(x => node(nm(item), x, 1)); out.push(`</${nm(root)}>`); }
    else node(nm(root), value, 0);
    return { text: out.join("\n"), notes: [...notes] };
  }

  return { fromXml, toXml };
})();

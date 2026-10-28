// Custom dictionary CSV "tag,name,type,value,meaning,flags": firm tag names/types, extra value meanings, flags sensitive (anonymize) / link (order chains).
const FixCustom = (() => {
  const SAMPLE = [
    "tag,name,type,value,meaning,flags",
    "9876,DeskCode,STRING,,,",
    "9877,AlgoStrategy,CHAR,T,TWAP,",
    "9877,AlgoStrategy,CHAR,V,VWAP,",
    "9878,ParentOrderID,STRING,,,link",
    "9879,ClientName,STRING,,,sensitive",
  ].join("\n");

  const cells = line => {
    const out = [];
    let cur = "", quoted = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (quoted) { if (c === '"' && line[i + 1] === '"') { cur += '"'; i++; } else if (c === '"') quoted = false; else cur += c; }
      else if (c === '"') quoted = true;
      else if (c === ",") { out.push(cur); cur = ""; }
      else cur += c;
    }
    out.push(cur);
    return out.map(s => s.trim());
  };

  // → { fields: Map<tag, {tag, name, type, enums: Map, sensitive, link}>, errors: [{line, text}] }
  function parse(text) {
    const fields = new Map(), errors = [];
    String(text || "").split(/\r?\n/).forEach((line, i) => {
      if (!line.trim() || line.trim().startsWith("#")) return;
      const [tag, name = "", type = "", value = "", meaning = "", flags = ""] = cells(line);
      if (/^tag$/i.test(tag)) return;
      if (!/^\d{1,6}$/.test(tag)) { errors.push({ line: i + 1, text: line.slice(0, 40) }); return; }
      const f = fields.get(tag) || { tag, name: "", type: "", enums: new Map(), sensitive: false, link: false };
      if (name) f.name = name;
      if (type) f.type = type.toUpperCase();
      if (value !== "") f.enums.set(value, meaning);
      if (/sensitive/i.test(flags)) f.sensitive = true;
      if (/link/i.test(flags)) f.link = true;
      fields.set(tag, f);
    });
    return { fields, errors };
  }

  const tags = (custom, flag) => custom ? [...custom.fields.values()].filter(f => f[flag]).map(f => f.tag) : [];

  return { parse, tags, SAMPLE };
})();

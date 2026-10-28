// FIX dictionaries: FIX 4.4 std, exchange-server (venue) overlay on top, FIX 5.0SP2 names as fallback for unknown tags; parsed lazily per dialect.
const FixDict = (() => {
  const cache = {};
  const rows = text => text.split("\n").filter(Boolean).map(l => l.split("|"));
  const enums = s => s ? new Map(s.split(";").map(p => { const i = p.indexOf("="); return [p.slice(0, i), p.slice(i + 1)]; })) : null;
  const splitCamel = n => n.replace(/([a-z0-9])([A-Z])/g, "$1 $2").replace(/([A-Z]+)([A-Z][a-z])/g, "$1 $2");

  function build(dialect) {
    const fields = new Map(), msgs = new Map(), groups = new Map();
    for (const [tag, name, type] of rows(FixDataSp2.fields)) fields.set(tag, { tag, name, type, enums: null, fix50: true });
    for (const d of dialect === "venue" ? [FixDataStd, FixDataVenue] : [FixDataStd]) {
      for (const [tag, name, type, en] of rows(d.fields)) fields.set(tag, { tag, name, type, enums: enums(en) });
      for (const [type, name, cat, req] of rows(d.messages)) msgs.set(type, { name, cat, req: req ? req.split(",") : [] });
      for (const [tag, list] of rows(d.groups)) groups.set(tag, list.split(","));
    }
    // The user's custom dictionary (FixCustom.parse) goes on top of every dialect.
    if (custom) for (const c of custom.fields.values()) {
      const base = fields.get(c.tag) || { tag: c.tag, name: `Tag${c.tag}`, type: "STRING", enums: null };
      const en = c.enums.size ? new Map([...(base.enums || []), ...c.enums]) : base.enums;
      fields.set(c.tag, { ...base, name: c.name || base.name, type: c.type || base.type, enums: en, fix50: false, custom: true });
    }
    const top = dialect === "venue" ? FixDataVenue : FixDataStd;
    return {
      dialect, fields, msgs, groups,
      header: new Set([...FixDataStd.header.split(","), ...FixDataVenue.header.split(","), "122"]),
      trailer: new Set(top.trailer.split(",")),
      headerReq: top.headerReq.split(","),
    };
  }

  let custom = null;
  const setCustom = c => { custom = c && c.fields.size ? c : null; for (const k of Object.keys(cache)) delete cache[k]; };
  const get = dialect => cache[dialect] ||= build(dialect === "venue" ? "venue" : "fix44");
  const field = (d, tag) => d.fields.get(tag) || null;
  const name = (d, tag) => (d.fields.get(tag) || {}).name || "";
  const msgName = (d, type) => (d.msgs.get(type) || {}).name || "";

  // MULTIPLEVALUESTRING holds space-separated codes.
  function meaning(d, tag, value) {
    const f = d.fields.get(tag);
    if (!f || !f.enums) return "";
    if (f.enums.has(value)) return f.enums.get(value);
    if (f.type === "MULTIPLEVALUESTRING" && value.includes(" ")) return value.split(" ").map(v => f.enums.get(v) || v).join(", ");
    return "";
  }

  return { get, setCustom, field, name, msgName, meaning, splitCamel };
})();

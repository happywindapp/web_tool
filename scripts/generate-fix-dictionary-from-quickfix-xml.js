// QuickFIX XML (FIX44 std + venue fork + FIX50SP2) → compact JS dictionary modules.
// node scripts/generate-fix-dictionary-from-quickfix-xml.js <quickfix-spec-dir> <venue-FIX44.xml> <out-dir> <venue-name>   (venue-name in enum names → "Venue")
const fs = require("fs"), path = require("path");
const [specDir, venueFile, outDir, venueName] = process.argv.slice(2);
if (!venueName) throw new Error("missing <venue-name>: the exchange name used in the venue XML, replaced by a neutral word");

function parse(file) {
  const xml = fs.readFileSync(file, "utf8").replace(/<!--[\s\S]*?-->/g, "");
  const tagRe = /<(\/?)(\w+)([^>]*?)(\/?)>/g;
  const attrs = s => Object.fromEntries([...s.matchAll(/(\w+)=['"]([^'"]*)['"]/g)].map(m => [m[1], m[2]]));
  const root = { kind: "root", items: [] }, stack = [root];
  const spec = { header: null, trailer: null, messages: [], components: {}, fields: {} };
  let curField = null, m;
  while ((m = tagRe.exec(xml))) {
    const [, close, tag, a, self] = m, at = attrs(a), top = stack[stack.length - 1];
    if (close) { if (["header", "trailer", "message", "component", "group"].includes(tag) && top.tag === tag) stack.pop(); if (tag === "field") curField = null; continue; }
    if (tag === "field" && at.number) {
      curField = spec.fields[at.number] = { num: at.number, name: at.name, type: at.type, values: [] };
      if (self) curField = null;
      continue;
    }
    if (tag === "value" && curField) { curField.values.push([at.enum, at.description || ""]); continue; }
    if (tag === "field" && at.name) { top.items.push({ kind: "field", name: at.name, req: at.required === "Y" }); continue; }
    if (["header", "trailer", "message", "component", "group"].includes(tag)) {
      const node = { tag, kind: tag, name: at.name, type: at.msgtype, cat: at.msgcat, req: at.required === "Y", items: [] };
      const inDefs = stack.length === 1;
      if (tag === "header") spec.header = node;
      else if (tag === "trailer") spec.trailer = node;
      else if (tag === "message") spec.messages.push(node);
      else if (tag === "component" && inDefs) spec.components[at.name] = node;
      else top.items.push(node);
      if (!self) stack.push(node);
    }
  }
  spec.byName = Object.fromEntries(Object.values(spec.fields).map(f => [f.name, f.num]));
  return spec;
}

function analyse(spec) {
  const groups = new Map();
  const num = n => spec.byName[n];
  // Direct member tags of a group: components are inlined, nested groups contribute their count tag.
  const members = (items, seen = new Set()) => items.flatMap(it => {
    if (it.kind === "field") return num(it.name) ? [num(it.name)] : [];
    if (it.kind === "group") return num(it.name) ? [num(it.name)] : [];
    if (it.kind === "component") { const c = spec.components[it.name]; return c && !seen.has(it.name) ? members(c.items, new Set([...seen, it.name])) : []; }
    return [];
  });
  const walk = (items, seen = new Set()) => items.forEach(it => {
    if (it.kind === "group") {
      const t = num(it.name); if (!t) return;
      const list = groups.get(t) || [];
      for (const x of members(it.items)) if (!list.includes(x)) list.push(x);
      groups.set(t, list);
      walk(it.items, seen);
    } else if (it.kind === "component") {
      const c = spec.components[it.name];
      if (c && !seen.has(it.name)) walk(c.items, new Set([...seen, it.name]));
    }
  });
  const required = (items, seen = new Set()) => items.flatMap(it => {
    if (!it.req) return [];
    if (it.kind === "field" || it.kind === "group") return num(it.name) ? [num(it.name)] : [];
    if (it.kind === "component") { const c = spec.components[it.name]; return c && !seen.has(it.name) ? required(c.items, new Set([...seen, it.name])) : []; }
    return [];
  });
  walk(spec.header.items); walk(spec.trailer.items);
  spec.messages.forEach(msg => walk(msg.items));
  const msgs = new Map();
  for (const msg of spec.messages) {
    const prev = msgs.get(msg.type);
    const req = [...new Set(required(msg.items))];
    msgs.set(msg.type, prev ? { ...prev, name: prev.name + " / " + msg.name } : { name: msg.name, cat: msg.cat, req });
  }
  return {
    groups, msgs,
    header: members(spec.header.items), headerReq: required(spec.header.items),
    trailer: members(spec.trailer.items),
  };
}

const clean = s => s.replace(/[|;=`\\\n]/g, " ").trim();
const pretty = d => { const s = d.replace(/_/g, " ").toLowerCase().trim(); return s ? s[0].toUpperCase() + s.slice(1) : s; };
const fieldLine = (f, withEnums = true) => [f.num, f.name, f.type].join("|") + (withEnums && f.values.length ? "|" + f.values.map(([e, d]) => `${clean(e)}=${clean(pretty(d))}`).join(";") : "");
const msgLine = (t, m) => `${t}|${m.name}|${m.cat}|${m.req.join(",")}`;
const groupLine = (t, list) => `${t}|${list.join(",")}`;
const byNum = (a, b) => Number(a) - Number(b);

function emit(constName, comment, obj) {
  const body = Object.entries(obj).map(([k, v]) => `  ${k}: ${Array.isArray(v) ? JSON.stringify(v.join(",")) : "`" + v + "`"},`).join("\n");
  return `${comment}\nconst ${constName} = {\n${body}\n};\n`;
}

const std = parse(path.join(specDir, "FIX44.xml")), stdA = analyse(std);
const venue = parse(venueFile), venueA = analyse(venue);
const sp2 = parse(path.join(specDir, "FIX50SP2.xml"));
const fixt = parse(path.join(specDir, "FIXT11.xml"));

// SP2 descriptions are word-separated (PARTIALLY_FILLED vs Partial); MsgType reads best as the message name.
const splitCamel = n => n.replace(/([a-z0-9])([A-Z])/g, "$1 $2").replace(/([A-Z]+)([A-Z][a-z])/g, "$1 $2");
const betterEnums = (spec, msgs) => Object.values(spec.fields).forEach(f => {
  const s = sp2.fields[f.num];
  f.values = f.values.map(([e, d]) => {
    if (f.num === "35" && msgs.has(e)) return [e, splitCamel(msgs.get(e).name).toUpperCase().replace(/ /g, "_")];
    const hit = s && s.name === f.name && s.values.find(v => v[0] === e);
    return [e, hit && hit[1].length >= d.length ? hit[1] : d];
  });
});
betterEnums(std, stdA.msgs); betterEnums(venue, venueA.msgs);
venue.fields["449"].type = "STRING"; // The venue spec reuses tag 449 as CoPartyID but kept the UTCDATEONLY type of the std field.
venueA.msgs.get("8").req = venueA.msgs.get("8").req.filter(t => t !== "6"); // Venue ExecutionReports on the wire never carry AvgPx(6).
const stdFields = Object.values(std.fields).sort((a, b) => byNum(a.num, b.num));
const stdOut = {
  fields: stdFields.map(f => fieldLine(f)).join("\n"),
  messages: [...stdA.msgs].map(([t, m]) => msgLine(t, m)).join("\n"),
  groups: [...stdA.groups].sort((a, b) => byNum(a[0], b[0])).map(([t, l]) => groupLine(t, l)).join("\n"),
  header: stdA.header, headerReq: stdA.headerReq, trailer: stdA.trailer,
};

const venueFieldsDiff = Object.values(venue.fields).filter(f => !std.fields[f.num] || fieldLine(f) !== fieldLine(std.fields[f.num])).sort((a, b) => byNum(a.num, b.num));
const venueMsgsDiff = [...venueA.msgs].filter(([t, m]) => { const s = stdA.msgs.get(t); return !s || msgLine(t, s) !== msgLine(t, m); });
const venueGroupsDiff = [...venueA.groups].filter(([t, l]) => { const s = stdA.groups.get(t); return !s || s.join() !== l.join(); });
const venueRe = venueName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const neutral = s => s.replace(new RegExp(venueRe + "(?=\\w)", "gi"), "Venue ").replace(new RegExp(venueRe, "gi"), "Venue");
const venueOut = {
  fields: neutral(venueFieldsDiff.map(f => fieldLine(f)).join("\n")),
  messages: venueMsgsDiff.map(([t, m]) => msgLine(t, m)).join("\n"),
  groups: venueGroupsDiff.map(([t, l]) => groupLine(t, l)).join("\n"),
  header: venueA.header, headerReq: venueA.headerReq, trailer: venueA.trailer,
};

const extra = [...Object.values(sp2.fields), ...Object.values(fixt.fields)].filter(f => !std.fields[f.num]);
const seen = new Set();
const extraOut = { fields: extra.filter(f => !seen.has(f.num) && seen.add(f.num)).sort((a, b) => byNum(a.num, b.num)).map(f => fieldLine(f, false)).join("\n") };

fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, "fix44-standard-dictionary-data.js"),
  emit("FixDataStd", "// GENERATED from QuickFIX spec/FIX44.xml — this product includes software developed by quickfixengine.org (http://www.quickfixengine.org/), QuickFIX License 1.0. field: tag|Name|TYPE|enum=Desc;… · message: type|Name|cat|required tags · group: countTag|member tags.", stdOut));
fs.writeFileSync(path.join(outDir, "venue-fix44-dialect-overlay-data.js"),
  emit("FixDataVenue", "// GENERATED: venue FIX 4.4 dialect (the venue's QuickFIX XML) — only entries that differ from FixDataStd, same line format.", venueOut));
fs.writeFileSync(path.join(outDir, "fix50sp2-extra-field-names-data.js"),
  emit("FixDataSp2", "// GENERATED from QuickFIX spec/FIX50SP2.xml + FIXT11.xml — names/types of tags that FIX 4.4 does not define (no enums).", extraOut));

console.log({ std: stdFields.length, stdMsgs: stdA.msgs.size, stdGroups: stdA.groups.size, venueFields: venueFieldsDiff.length, venueMsgs: venueMsgsDiff.length, venueGroups: venueGroupsDiff.length, extra: seen.size, venueHeaderReq: venueA.headerReq });
console.log("venue field diffs:", venueFieldsDiff.map(f => `${f.num}=${f.name}${std.fields[f.num] ? " (std " + std.fields[f.num].name + ")" : ""}`).join(", "));
console.log("venue msg diffs:", venueMsgsDiff.map(([t, m]) => `${t}=${m.name}`).join(", "));

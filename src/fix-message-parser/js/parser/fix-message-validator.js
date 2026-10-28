// One extracted message × dictionary → fields tagged with section/group depth + issues {level, key, params, tag}; key is the Vietnamese text for T().
const FixCheck = (() => {
  const INT = /^-?\d+$/, NUM = /^-?(\d+\.?\d*|\.\d+)$/, DATE = /^\d{8}$/;
  const TYPES = {
    INT, SEQNUM: INT, LENGTH: INT, NUMINGROUP: INT, DAYOFMONTH: INT,
    QTY: NUM, PRICE: NUM, AMT: NUM, FLOAT: NUM, PRICEOFFSET: NUM, PERCENTAGE: NUM,
    UTCTIMESTAMP: /^\d{8}-\d{2}:\d{2}:\d{2}(\.\d{1,9})?$/, UTCTIMEONLY: /^\d{2}:\d{2}:\d{2}(\.\d{1,9})?$/,
    UTCDATEONLY: DATE, UTCDATE: DATE, LOCALMKTDATE: DATE, BOOLEAN: /^[YN]$/,
  };
  const RANK = { error: 3, warn: 2, info: 1, ok: 0 };

  function analyse(item, dict) {
    const issues = [];
    const add = (level, key, params = {}, tag = null) => issues.push({ level, key, params, tag });
    const fields = item.delim ? FixCodec.split(item.raw, item.delim) : [];
    if (!item.delim) add("error", "Không xác định được dấu phân cách giữa các tag");

    fields.forEach((f, i) => { f.i = i; });
    const tags = fields.map(f => f.tag);
    // A fragment (no BeginString at all) gets one finding instead of every header/trailer rule failing.
    const fragment = fields.length > 0 && !tags.includes("8");
    if (fragment) add("error", "Mẩu message không có header/trailer (thiếu 8=FIX…) — không kiểm BodyLength/CheckSum");
    else if (fields.length) {
      if (tags[0] !== "8") add("error", "Tag 8 (BeginString) phải đứng đầu", {}, "8");
      if (tags[1] !== "9") add("error", "Tag 9 (BodyLength) phải đứng thứ 2", {}, "9");
      if (tags[2] !== "35") add("error", "Tag 35 (MsgType) phải đứng thứ 3", {}, "35");
      if (tags[tags.length - 1] !== "10") add("error", "Thiếu tag 10 (CheckSum) ở cuối — message bị cắt?", {}, "10");
      else {
        const v = FixCodec.verify(fields);
        if (v.bodyLength.declared !== null && Number(v.bodyLength.declared) !== Number(v.bodyLength.actual))
          add("error", "BodyLength sai: khai báo {declared}, thực tế {actual}", v.bodyLength, "9");
        if (v.checkSum.declared !== v.checkSum.actual) add("error", "CheckSum sai: khai báo {declared}, tính được {actual}", v.checkSum, "10");
      }
    }

    const type = (fields.find(f => f.tag === "35") || {}).value || "";
    const msgDef = dict.msgs.get(type);
    if (type && !msgDef) add("warn", "MsgType “{type}” không có trong từ điển", { type }, "35");

    // Venue values documented only in its spec (error codes, per-message value lists) are not "unknown".
    const view = { type, get: t => (fields.find(x => x.tag === t) || {}).value || "" };
    const venueKnows = f => dict.dialect === "venue" && !!(f.tag === "373" ? FixKnow.venueError(f.value) : FixKnow.venueValue(view, f.tag, f.value));

    // Repeating groups: a count tag opens a scope of known members; its first member starts each entry.
    const stack = [], seen = new Map();
    let bodyStarted = false;
    const close = () => { const g = stack.pop(); if (g.entries !== g.n) add("warn", "Nhóm {tag} khai báo {n} phần tử nhưng có {m}", { tag: g.tag, n: g.n, m: g.entries }, g.tag); };
    for (const f of fields) {
      if (f.tag === null) { f.section = "bad"; add("error", "Mẩu không phải tag=value: “{text}”", { text: f.value.slice(0, 40) }); continue; }
      while (stack.length && !stack[stack.length - 1].members.has(f.tag)) close();
      const g = stack[stack.length - 1];
      // Members are merged from every message using the group, so a repeated member also starts a new entry.
      const opens = !!g && (g.entries === 0 || f.tag === g.first || g.seen.has(f.tag));
      if (opens) { g.entries++; g.seen = new Set(); }
      if (g) g.seen.add(f.tag);
      f.depth = stack.length;
      f.entry = g ? g.entries : 0;
      f.first = opens;

      const isHead = dict.header.has(stack.length ? stack[0].tag : f.tag), isTrail = dict.trailer.has(f.tag) && !stack.length;
      f.section = isTrail ? "trailer" : isHead ? "header" : "body";
      if (isHead && bodyStarted) add("warn", "Tag header {tag} nằm sau phần thân", { tag: f.tag }, f.tag);
      if (f.section === "body") bodyStarted = true;

      const scope = stack.map(s => `${s.tag}#${s.entries}`).join("/") + "/" + f.tag;
      if (seen.has(scope)) add("warn", "Tag {tag} lặp lại ngoài repeating group", { tag: f.tag }, f.tag);
      seen.set(scope, true);

      const def = dict.fields.get(f.tag);
      if (!def) add("info", "Tag {tag} không có trong từ điển", { tag: f.tag }, f.tag);
      else if (f.value === "") add("info", "Tag {tag} có giá trị rỗng", { tag: f.tag }, f.tag);
      else if (TYPES[def.type] && !TYPES[def.type].test(f.value)) add("warn", "Tag {tag}: giá trị “{value}” không đúng kiểu {type}", { tag: f.tag, value: f.value, type: def.type }, f.tag);
      else if (def.enums && f.tag !== "35" && !FixDict.meaning(dict, f.tag, f.value) && !venueKnows(f)) add("info", "Tag {tag}: giá trị “{value}” không có trong từ điển", { tag: f.tag, value: f.value }, f.tag);

      const members = def && dict.groups.get(f.tag);
      if (members && INT.test(f.value) && +f.value > 0) stack.push({ tag: f.tag, members: new Set(members), first: members[0], n: +f.value, entries: 0, seen: new Set() });
    }
    while (stack.length) close();

    const present = new Set(tags);
    for (const t of dict.headerReq) if (fields.length && !fragment && !present.has(t)) add("error", "Thiếu tag header bắt buộc {tag} ({name})", { tag: t, name: FixDict.name(dict, t) }, t);
    if (msgDef) for (const t of msgDef.req) if (!present.has(t)) add("warn", "Thiếu tag bắt buộc {tag} ({name}) của {msg}", { tag: t, name: FixDict.name(dict, t), msg: msgDef.name }, t);

    const worst = (tag) => issues.filter(x => x.tag === tag).reduce((a, x) => RANK[x.level] > RANK[a] ? x.level : a, "ok");
    fields.forEach(f => { f.level = f.tag === null ? "error" : worst(f.tag); });
    const level = issues.reduce((a, x) => RANK[x.level] > RANK[a] ? x.level : a, "ok");
    const get = tag => { const f = fields.find(x => x.tag === tag); return f ? f.value : ""; };
    const all = tag => fields.filter(x => x.tag === tag).map(x => x.value);
    return { ...item, fields, issues, type, level, get, all };
  }

  return { analyse, RANK };
})();

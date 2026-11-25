// Pure (node test): SWIFT MT (ISO 15022) text → messages: blocks {1:}…{5:}, block 4 fields (tag, qualifier, value, sequence path) + structure checks (16R/16S balance, mandatory MT540–548 tags).
const SwiftMt = (() => {
  const FIELD = /^:(\d{2}[A-Z]?):(.*)$/;
  const GENERIC = /^:([A-Z0-9]{4})\/([A-Z0-9]{0,8})\/([\s\S]*)$/;
  // MT540–548 (simplified from the SWIFT SR rules, the parts a back office checks first): [sequence, field number, qualifier].
  const SETTLE = (date, qty) => [["GENL", "20", "SEME"], ["GENL", "23", null], ["TRADDET", "98", date], ["TRADDET", "35", null], ["FIAC", "36", qty], ["FIAC", "97", "SAFE"], ["SETDET", "22", "SETR"]];
  const RULES = { 540: SETTLE("SETT", "SETT"), 541: SETTLE("SETT", "SETT"), 542: SETTLE("SETT", "SETT"), 543: SETTLE("SETT", "SETT"),
    544: SETTLE("ESET", "ESTT"), 545: SETTLE("ESET", "ESTT"), 546: SETTLE("ESET", "ESTT"), 547: SETTLE("ESET", "ESTT"),
    548: [["GENL", "20", "SEME"], ["GENL", "23", null], ["LINK", "20", null], ["STAT", "25", null]] };

  // Balanced {…} from i (text[i] === "{") → end index after "}" or -1, never past limit (the next message); block 4 ends at "\n-}" (its text may hold braces).
  function blockEnd(text, i, limit) {
    if (text.startsWith("{4:", i)) { const e = text.indexOf("\n-}", i); return e < 0 || e + 3 > limit ? -1 : e + 3; }
    let depth = 0;
    for (let k = i; k < limit; k++) { if (text[k] === "{") depth++; else if (text[k] === "}" && --depth === 0) return k + 1; }
    return -1;
  }

  const lineAt = (starts, pos) => { let lo = 0, hi = starts.length - 1; while (lo < hi) { const mid = (lo + hi + 1) >> 1; if (starts[mid] <= pos) lo = mid; else hi = mid - 1; } return lo + 1; };

  function header(b1, b2) {
    const h = {};
    const m1 = /^([FAL])(\d{2})([A-Z0-9]{12})(\d{4})?(\d{6})?/.exec(b1 || "");
    if (b1 != null && !m1) h.bad1 = true;
    if (b2 != null && !/^([IO])(\d{3})/.test(b2)) h.bad2 = true;
    if (m1) Object.assign(h, { app: m1[1], service: m1[2], sender: m1[3], session: m1[4] || "", seq: m1[5] || "" });
    const m2 = /^([IO])(\d{3})/.exec(b2 || "");
    if (m2) {
      h.io = m2[1]; h.mt = m2[2];
      if (m2[1] === "I") { const r = /^I\d{3}([A-Z0-9]{12})([SUN])?/.exec(b2); if (r) Object.assign(h, { receiver: r[1], priority: r[2] || "" }); }
      else { const r = /^O\d{3}(\d{4})(\d{6})([A-Z0-9]{12})/.exec(b2); if (r) Object.assign(h, { inTime: r[1], inDate: r[2], receiver: h.sender, sender: r[3] }); }
    }
    return h;
  }

  // Block 4 body → fields with the 16R path; errors: { line, code, … }.
  function fields(body, firstLine, errors) {
    const out = [], stack = [];
    let cur = null;
    body.split(/\r?\n/).forEach((l, k) => {
      const line = firstLine + k, m = FIELD.exec(l);
      if (!m) {
        if (/^:[0-9A-Za-z]{2,4}:/.test(l)) errors.push({ line, code: "badField", text: l.slice(0, 40) });
        else if (cur && l !== "" && l !== "-") cur.value += "\n" + l;
        return;
      }
      const [, tag, rest] = m, g = GENERIC.exec(rest);
      cur = { tag, num: tag.slice(0, 2), qual: g ? g[1] : "", dss: g ? g[2] : "", value: g ? g[3] : rest, line, path: stack.join("/") };
      if (tag === "16R") { stack.push(rest.trim()); cur.path = stack.join("/"); }
      else if (tag === "16S") {
        const name = rest.trim();
        if (!stack.length) errors.push({ line, code: "extra16S", name });
        else if (stack[stack.length - 1] !== name) { errors.push({ line, code: "mismatch16S", name, open: stack[stack.length - 1] }); const at = stack.lastIndexOf(name); if (at >= 0) stack.length = at; }
        else stack.pop();
      }
      out.push(cur);
    });
    for (const name of stack.reverse()) errors.push({ line: firstLine, code: "unclosed16R", name });
    return out;
  }

  // Missing [sequence, number, qualifier] of MT540–548 → errors.
  function mandatory(mt, list, line, errors) {
    for (const [seq, num, qual] of RULES[mt] || []) {
      if (!list.some(f => f.tag === "16R" && f.value.trim() === seq)) { if (!errors.some(e => e.code === "noSeq" && e.seq === seq)) errors.push({ line, code: "noSeq", seq }); continue; }
      const ok = list.some(f => f.num === num && f.tag !== "16R" && f.tag !== "16S" && (!qual || f.qual === qual) && f.path.split("/").includes(seq));
      if (!ok) errors.push({ line, code: "noField", seq, field: num + (qual ? "::" + qual : "") });
    }
  }

  // → { messages: [{ line, header, blocks: { "1": text, … }, fields, errors }], errors (outside messages) }.
  function parse(text) {
    const starts = [0];
    for (let i = text.indexOf("\n"); i >= 0; i = text.indexOf("\n", i + 1)) starts.push(i + 1);
    const messages = [], errors = [];
    let i = text.indexOf("{1:");
    if (i < 0) return { messages, errors: [{ line: 1, code: "noBlock1" }] };
    while (i >= 0) {
      const msg = { line: lineAt(starts, i), blocks: {}, fields: [], errors: [] };
      const next = text.indexOf("{1:", i + 3), limit = next < 0 ? text.length : next;
      let k = i;
      while (k < text.length && text[k] === "{" && /^\{[1-5S]:/.test(text.slice(k, k + 3))) {
        const id = text[k + 1], end = blockEnd(text, k, limit);
        if (end < 0) { msg.errors.push({ line: lineAt(starts, k), code: id === "4" ? "noEnd4" : "openBlock", block: id }); k = limit; break; }
        msg.blocks[id] = text.slice(k + 3, id === "4" ? end - 2 : end - 1);
        if (id === "4") msg.fields = fields(msg.blocks[id].replace(/^\r?\n/, ""), lineAt(starts, k) + (/^\{4:\r?\n/.test(text.slice(k, k + 5)) ? 1 : 0), msg.errors);
        k = end;
        while (k < text.length && /[\r\n]/.test(text[k])) k++;
        if (text.startsWith("{1:", k)) break;
      }
      msg.header = header(msg.blocks["1"], msg.blocks["2"]);
      if (msg.header.bad1) msg.errors.push({ line: msg.line, code: "badBlock1" });
      if (msg.header.bad2) msg.errors.push({ line: msg.line, code: "badBlock2" });
      if (!msg.blocks["2"]) msg.errors.push({ line: msg.line, code: "noBlock2" });
      if (!("4" in msg.blocks) && !msg.errors.some(e => e.code === "noEnd4")) msg.errors.push({ line: msg.line, code: "noBlock4" });
      if (msg.header.mt) mandatory(+msg.header.mt, msg.fields, msg.line, msg.errors);
      messages.push(msg);
      i = text.indexOf("{1:", Math.max(k, i + 3));
    }
    return { messages, errors };
  }

  return { parse, header, RULES };
})();

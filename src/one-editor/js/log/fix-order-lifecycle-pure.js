// Pure (node test): FIX messages + their chain roots (FixChain.link) → order lifecycles (time · 35 · 150 · 39 · price · qty · side), odd status changes flagged, Mermaid sequenceDiagram.
// msgs: [{ line, type, get(tag), all(tag) }]; names: { msg(type), exec(v), status(v), side(v) } → display names (missing ⇒ the raw code).
const FixLifecycle = (() => {
  const ORDER_TYPES = new Set(["D", "G", "F", "8", "9", "AB", "AC", "E", "H"]);
  const REQUEST = new Set(["D", "G", "F", "AB", "AC"]);
  const TERMINAL = new Set(["2", "3", "4", "8", "C"]);
  const MAX_DIAGRAM = 300;
  const num = v => v === "" || v == null || !isFinite(+v) ? null : +v;

  function row(m, i) {
    const g = t => m.get(t) || "";
    return { i, line: m.line, type: m.type, time: g("60") || g("52"), from: g("49"), to: g("56"), exec: g("150"), status: g("39"), clOrdId: g("11"), orig: g("41"), orderId: g("37"),
      symbol: g("55"), side: g("54"), price: g("44"), qty: g("38"), lastPx: g("31"), lastQty: g("32"), cum: g("14"), leaves: g("151"), text: g("58"), warn: [] };
  }

  // Status rules over one order's rows in log order: a status after a terminal one, Partial → New, CumQty down / over OrderQty, Leaves + Cum ≠ Qty, a request after the order is done.
  function check(rows) {
    let status = "", cum = null, qty = null, done = "";
    for (const r of rows) {
      if (r.qty && (REQUEST.has(r.type) || r.type === "8")) qty = num(r.qty) ?? qty;
      if (REQUEST.has(r.type) && r.type !== "AB" && done) r.warn.push({ code: "afterDone", status: done });
      if (r.type !== "8") continue;
      const st = r.status, c = num(r.cum), l = num(r.leaves);
      if (st && status && st !== status) {
        if (TERMINAL.has(status) && !TERMINAL.has(st) && r.exec !== "D" && r.exec !== "I") r.warn.push({ code: "afterTerminal", from: status, to: st });
        else if (status === "1" && (st === "0" || st === "A")) r.warn.push({ code: "regress", from: status, to: st });
      }
      if (c !== null && cum !== null && c < cum && r.exec !== "H" && r.exec !== "G") r.warn.push({ code: "cumDown", from: cum, to: c });
      if (c !== null && qty !== null && c > qty) r.warn.push({ code: "overfill", cum: c, qty });
      if (c !== null && l !== null && qty !== null && !TERMINAL.has(st) && st !== "6" && Math.abs(c + l - qty) > 1e-9) r.warn.push({ code: "leaves", cum: c, leaves: l, qty });
      if (r.exec === "F" && !num(r.lastQty)) r.warn.push({ code: "tradeNoQty" });
      if (st) status = st;
      if (TERMINAL.has(st)) done = st;
      else if (st === "0" || st === "1" || st === "5" || st === "A" || st === "E" || st === "6") done = "";
      if (c !== null) cum = c;
    }
    return rows;
  }

  // → [{ root, key, symbol, side, status, rows, warns }] in order of first message; only chains with order messages.
  function build(msgs, root) {
    const by = new Map();
    msgs.forEach((m, i) => {
      if (!ORDER_TYPES.has(m.type) && m.type !== "3" && m.type !== "j") return;
      const r = root[i];
      if (!by.has(r)) by.set(r, []);
      by.get(r).push(row(m, i));
    });
    const out = [];
    for (const [r, rows] of by) {
      if (!rows.some(x => ORDER_TYPES.has(x.type))) continue;
      check(rows);
      const first = rows.find(x => x.clOrdId) || rows[0], last = [...rows].reverse().find(x => x.status);
      out.push({ root: r, key: first.clOrdId || first.orderId || "#" + first.line, symbol: (rows.find(x => x.symbol) || {}).symbol || "", side: (rows.find(x => x.side) || {}).side || "",
        status: last ? last.status : "", rows, warns: rows.reduce((n, x) => n + x.warn.length, 0) });
    }
    return out;
  }

  const md = s => String(s ?? "").replace(/\|/g, "\\|").replace(/[\r\n]+/g, " ");
  const named = (fn, v) => v ? (fn && fn(v) ? v + " " + fn(v) : v) : "";

  // Markdown report: one table per order. heads: translated column titles; warnText(w) → a sentence.
  function markdown(orders, names, heads, warnText, title) {
    const out = ["# " + title, ""];
    for (const o of orders) {
      out.push("## " + md(o.key) + (o.symbol ? " · " + md(o.symbol) : "") + (o.side ? " · " + md(named(names.side, o.side)) : "") + (o.status ? " · 39=" + md(named(names.status, o.status)) : ""), "");
      out.push("| " + heads.join(" | ") + " |", "|" + heads.map(() => "---").join("|") + "|");
      for (const r of o.rows) out.push("| " + [r.line, r.time, r.from + " → " + r.to, named(names.msg, r.type), named(names.exec, r.exec), named(names.status, r.status), r.clOrdId, r.orig,
        r.lastPx || r.price, r.lastQty ? r.lastQty + " / " + r.qty : r.qty, r.cum, r.leaves, r.warn.map(warnText).join("; ")].map(md).join(" | ") + " |");
      out.push("");
    }
    return out.join("\n");
  }

  // Mermaid sequenceDiagram of the orders' messages (log order), cut at max messages. → { text, shown, total }.
  function mermaid(orders, names, max = MAX_DIAGRAM) {
    const rows = orders.flatMap(o => o.rows).sort((a, b) => a.i - b.i), parts = new Map(), lines = [];
    const id = name => { const k = name || "?"; if (!parts.has(k)) parts.set(k, "P" + (parts.size + 1)); return parts.get(k); };
    const clean = s => String(s).replace(/[;#\r\n]+/g, " ").replace(/\s+/g, " ").trim();
    const shown = rows.slice(0, max);
    for (const r of shown) {
      const label = [named(names.msg, r.type), r.clOrdId && "11=" + r.clOrdId, r.orig && "41=" + r.orig, r.status && "39=" + named(names.status, r.status),
        r.lastQty ? r.lastQty + "@" + r.lastPx : r.qty && r.qty + (r.price ? "@" + r.price : "")].filter(Boolean).join(" ");
      lines.push("  " + id(r.from) + (r.type === "8" || r.type === "9" || r.type === "3" || r.type === "j" ? "-->>" : "->>") + id(r.to) + ": " + clean(label));
      if (r.warn.length) lines.push("  Note over " + id(r.to) + ": ⚠ " + clean(r.warn.map(w => w.code).join(", ")));
    }
    const head = ["sequenceDiagram", ...[...parts].map(([name, p]) => "  participant " + p + " as " + clean(name).replace(/[:]/g, " "))];
    return { text: head.concat(lines).join("\n") + "\n", shown: shown.length, total: rows.length };
  }

  return { build, check, markdown, mermaid, ORDER_TYPES, TERMINAL, MAX_DIAGRAM };
})();

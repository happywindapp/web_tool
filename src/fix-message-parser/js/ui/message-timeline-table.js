// Message timeline: filters (text / tag=value terms, MsgType, session & broadcast, errors, notes, picked chain/family, column filters), ordered columns, rows, CSV export.
const Timeline = (() => {
  const MAX_ROWS = 3000;
  const ADMIN = new Set(["0", "1", "2", "4", "5", "A"]), BROADCAST = new Set(["h", "f"]), REJECT = new Set(["3", "j", "9"]);
  const ICON = { error: "✖", warn: "⚠", info: "ℹ", ok: "✔" };
  const COLS = [
    { id: "n", label: "#" }, { id: "time", label: "Giờ" }, { id: "dir", label: "Gửi → Nhận" }, { id: "type", label: "Loại" },
    { id: "55", label: "Symbol" }, { id: "54", label: "Side" }, { id: "11", label: "ClOrdID" }, { id: "41", label: "OrigClOrdID" },
    { id: "37", label: "OrderID" }, { id: "st", label: "Trạng thái" }, { id: "qty", label: "SL" }, { id: "px", label: "Giá" },
    { id: "58", label: "Text" }, { id: "lv", label: "Kiểm tra" },
  ];
  const first = (m, tags) => { for (const t of tags) { const v = m.get(t); if (v) return v; } return ""; };
  const mean = (d, m, t) => TagInfo.text(d, m, t);

  function status(d, m) {
    const pair = (a, b) => [mean(d, m, a), mean(d, m, b)].filter(Boolean).join(" / ");
    if (m.get("150")) return pair("150", "39");
    if (m.get("373")) { const t = TagInfo.text(d, m, "373"); return t === m.get("373") ? t : `${m.get("373")} ${t}`; }
    if (m.get("380")) return mean(d, m, "380");
    if (m.get("434")) return pair("434", "102");
    return mean(d, m, "537") || mean(d, m, "340");
  }

  // Plain value of one column (used by the table, column filters and the CSV export).
  function cell(id, m, i, ctx) {
    const d = ctx.dict;
    switch (id) {
      case "n": return String(i + 1);
      case "time": return FixTime.short(m.get("52"), ctx.tz);
      case "dir": return m.get("49") || m.get("56") ? `${m.get("49")} → ${m.get("56")}` : "";
      case "type": return `${FixDict.msgName(d, m.type) || "?"} (${m.type})`;
      case "54": return TagInfo.text(d, m, "54", true);
      case "st": return status(d, m);
      case "qty": return first(m, ["38", "32"]);
      case "px": return first(m, ["44", "640", "31"]);
      case "lv": return m.level === "ok" ? ICON.ok : `${ICON[m.level]} ${m.issues.filter(x => x.level === m.level).length}`;
      default: return m.get(id);
    }
  }

  const purpose = (d, m) => [d.dialect === "venue" ? (FixKnow.venuePurpose(m) || {}).purpose : "", FixKnow.msgDoc(m.type)].filter(Boolean).join("\n\n");

  // Built-in + extra (custom) columns, in the user's dragged order when there is one.
  function columns(ctx) {
    const list = [...COLS.slice(0, -1), ...ctx.cols.map(t => ({ id: t, label: `${FixDict.name(ctx.dict, t) || t} (${t})`, extra: true })), COLS[COLS.length - 1]];
    if (!ctx.layout) return list;
    const at = id => { const k = ctx.layout.indexOf(id); return k < 0 ? 1e6 + list.findIndex(c => c.id === id) : k; };
    return list.sort((a, b) => at(a.id) - at(b.id));
  }

  // Space-separated terms, all must match; "tag=value" compares that tag (contains, case-insensitive), other terms search the raw line.
  function visible(msgs, f, ctx) {
    const terms = f.q.trim().toLowerCase().split(/\s+/).filter(Boolean).map(t => { const m = /^(\d+)=(.*)$/.exec(t); return m ? { tag: m[1], v: m[2] } : { v: t }; });
    const cols = ColView.active();
    const out = [];
    msgs.forEach((m, i) => {
      if (f.only && !f.only.has(i)) return;
      if (f.type && m.type !== f.type) return;
      if (f.hideAdmin && ADMIN.has(m.type) && f.type !== m.type) return;
      if (f.hideBc && BROADCAST.has(m.type) && f.type !== m.type) return;
      if (f.onlyBad && m.level !== "error" && m.level !== "warn") return;
      if (f.onlyNotes && !Notes.get(i)) return;
      if (cols && !ColView.match(id => cell(id, m, i, ctx), () => FixTime.stamp(m.get("52"), ctx.tz))) return;
      const hay = (m.prefix + " " + m.raw).toLowerCase();
      if (terms.every(t => t.tag ? m.all(t.tag).some(v => v.toLowerCase().includes(t.v)) : hay.includes(t.v))) out.push(i);
    });
    return out;
  }

  const numCell = i => { const n = Notes.get(i); return Dom.esc(String(i + 1)) + (n ? ` <span class="anno-mark" title="${Dom.esc(n)}">📝</span>` : ""); };
  const head = c => c.extra ? c.label : T(c.label);

  function render(table, msgs, vis, sel, ctx) {
    const cols = columns(ctx), esc = Dom.esc;
    const thead = `<thead><tr>${cols.map(c => `<th draggable="true" data-col="${esc(c.id)}" title="${esc(T("{col} — bấm để lọc, kéo để đổi chỗ", { col: head(c) }))}">${esc(head(c))}</th>`).join("")}</tr></thead>`;
    const rows = vis.slice(0, MAX_ROWS).map(i => {
      const m = msgs[i];
      const cls = [i === sel ? "sel" : "", ADMIN.has(m.type) || BROADCAST.has(m.type) ? "admin" : "", ctx.inbound(m) ? "in" : "", Notes.get(i) ? "noted" : ""].join(" ").trim();
      const tcls = REJECT.has(m.type) ? "t-rej" : m.type === "8" ? "t-er" : "t-app";
      return `<tr data-i="${i}" class="${cls}">${cols.map(c => {
        const v = cell(c.id, m, i, ctx);
        const k = c.id === "lv" ? `lv-${m.level}` : c.id === "type" ? tcls : c.id === "dir" ? "dir" : "";
        const tip = c.id === "time" ? FixTime.full(m.get("52"), ctx.tz) || v : c.id === "type" ? purpose(ctx.dict, m) || v : v;
        return `<td class="${k}" data-col="${esc(c.id)}" title="${esc(tip)}">${c.id === "n" ? numCell(i) : esc(v)}</td>`;
      }).join("")}</tr>`;
    }).join("");
    const more = vis.length > MAX_ROWS ? `<tr><td class="more" colspan="${cols.length}">${esc(T("Chỉ hiện {n} message đầu — lọc để thu hẹp.", { n: I18n.num(MAX_ROWS) }))}</td></tr>` : "";
    table.innerHTML = thead + `<tbody>${rows}${more}</tbody>`;
  }

  // Excel keeps values exactly as on the wire: leading zeros, long ids, trailing decimals and times are written as ="…" text.
  function csv(msgs, vis, ctx) {
    const cols = [...columns(ctx).filter(c => c.id !== "lv"), { id: "note", label: "Ghi chú" }, { id: "issues", label: "Lỗi/cảnh báo" }, { id: "raw", label: "Raw" }];
    // Values from untrusted logs starting with = + - @ would run as Excel formulas.
    const q = v => {
      if (TextUtil.excelExact(v)) return `"=""${v}"""`;
      const s = /^[=+\-@\t\r]/.test(v) && !/^-?\d/.test(v) ? "'" + v : v;
      return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const val = (c, m, i) => c.id === "raw" ? m.raw : c.id === "note" ? Notes.get(i)
      : c.id === "issues" ? m.issues.filter(x => x.level !== "info").map(x => T(x.key, x.params)).join("; ") : cell(c.id, m, i, ctx);
    return "﻿" + [cols.map(c => q(head(c))).join(","), ...vis.map(i => cols.map(c => q(val(c, msgs[i], i))).join(","))].join("\r\n");
  }

  return { visible, render, csv, columns, numCell, ADMIN };
})();

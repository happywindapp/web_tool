// Detail of one message: header line, actions, issue list (click → flash the tag row), tag table with groups/sections, coloured raw.
const Detail = (() => {
  const ICON = { error: "✖", warn: "⚠", info: "ℹ" };
  let shown = null;

  function rows(m, ctx) {
    const esc = Dom.esc, d = ctx.dict;
    let list = m.fields.filter(f => !(ctx.hideHdr && (f.section === "header" || f.section === "trailer")));
    if (ctx.order === "tag") list = [...list].sort((a, b) => (+a.tag || 0) - (+b.tag || 0));
    if (ctx.order === "name") list = [...list].sort((a, b) => FixDict.name(d, a.tag || "").localeCompare(FixDict.name(d, b.tag || "")));
    const flat = ctx.order === "tag" || ctx.order === "name";
    return list.map(f => {
      if (f.tag === null) return `<tr class="lv-error" data-i="${f.i}"><td class="tg">?</td><td colspan="3" class="v">${esc(f.value)}</td></tr>`;
      const def = FixDict.field(d, f.tag);
      const name = def ? (def.fix50 ? `<span class="x50" title="${esc(T("Tag của FIX 5.0, không có trong FIX 4.4"))}">${esc(def.name)}</span>` : esc(def.name)) : `<span class="x50">${esc(T("(không rõ)"))}</span>`;
      const indent = flat ? 0 : f.depth * 14;
      const gi = !flat && f.first ? `<span class="gi">#${f.entry}</span>` : "";
      const cls = [f.section === "header" || f.section === "trailer" ? "sec" : "", f.level !== "ok" && f.level !== "info" ? `lv-${f.level}` : ""].join(" ").trim();
      return `<tr class="${cls}" data-tag="${f.tag}" data-i="${f.i}"><td class="tg">${f.tag}</td>` +
        `<td style="padding-left:${6 + indent}px">${gi}${name}</td><td class="v">${esc(f.value)}</td><td class="mn">${TagInfo.cell(d, m, f, ctx.tz)}</td></tr>`;
    }).join("");
  }

  const raw = m => m.fields.map(f => f.tag === null ? `<span class="bad">${Dom.esc(f.value)}</span>`
    : `<span class="tn">${f.tag}</span>=<span class="av">${Dom.esc(f.value)}</span>`).join('<span class="d">|</span>');

  function render(el, m, ctx) {
    const esc = Dom.esc;
    shown = m ? { m, ctx } : null;
    if (!m) { el.innerHTML = `<div class="empty">${esc(T("Chọn 1 dòng trong bảng để xem từng tag."))}</div>`; return; }
    const d = ctx.dict, name = FixDict.msgName(d, m.type) || "?";
    const hp = d.dialect === "venue" ? FixKnow.venuePurpose(m) : null, fp = FixKnow.msgDoc(m.type);
    const purpose = (hp && hp.purpose ? `<div>${esc(hp.purpose)}</div>` : "") + (fp ? `<div class="muted">${esc(FixKnow.firstSentence(fp))}</div>` : "");
    const v = m.delim ? FixCodec.verify(m.fields) : null;
    const resign = v && v.checkSum.declared !== null && (v.checkSum.declared !== v.checkSum.actual || v.bodyLength.declared !== v.bodyLength.actual);
    const issues = m.issues.map((x, k) => `<li class="${x.level}" data-k="${k}" ${x.tag ? `data-tag="${x.tag}"` : ""}>${ICON[x.level]} ${esc(T(x.key, x.params))}</li>`).join("");
    el.innerHTML =
      `<div class="dhead"><b>${esc(name)}</b><code>35=${esc(m.type)}</code><span class="muted">#${ctx.index + 1} · ${esc(T("dòng {n}", { n: m.line }))} · ${esc(T("dấu phân cách {d}", { d: FixLog.label(m.delim) || "?" }))}</span>` +
      `<span class="muted">${esc(FixTime.full(m.get("52"), ctx.tz))}</span></div>` +
      (purpose ? `<div class="purpose">${purpose}</div>` : "") +
      (m.prefix ? `<div class="prefix">${esc(m.prefix)}</div>` : "") +
      `<div class="dacts">` +
        (ctx.chainSize > 1 ? `<button data-act="chain">⛓ ${esc(T("Theo chuỗi lệnh ({n} message)", { n: ctx.chainSize }))}</button>` : "") +
        `<button data-act="pipe">${esc(T("Chép (|)"))}</button><button data-act="soh">${esc(T("Chép (SOH)"))}</button><button data-act="json">${esc(T("Chép JSON"))}</button>` +
        (resign ? `<button data-act="fix" title="${esc(T("Tính lại BodyLength (9) và CheckSum (10) rồi chép"))}">${esc(T("Chép bản sửa 9/10"))}</button>` : "") +
      `</div>` +
      `<textarea class="anno" rows="2" placeholder="${esc(T("📝 Ghi chú cho message này — đi kèm link chia sẻ, phân tích đã lưu và file xuất"))}">${esc(ctx.note || "")}</textarea>` +
      (issues ? `<ul class="issues">${issues}</ul>` : `<div class="good">✔ ${esc(T("Không có lỗi theo từ điển {dict}.", { dict: ctx.dictLabel }))}</div>`) +
      `<div class="hint muted">${esc(T("Rê chuột vào từng dòng để xem giải thích chi tiết (FIX 4.4 + spec {venue}).", { venue: FixKnow.venue() }))}</div>` +
      `<table class="fields"><thead><tr><th>Tag</th><th>${esc(T("Tên"))}</th><th>${esc(T("Giá trị"))}</th><th>${esc(T("Ý nghĩa"))}</th></tr></thead><tbody>${rows(m, ctx)}</tbody></table>` +
      `<pre class="raw">${raw(m)}</pre>`;
  }

  function json(m, d, tz, note) {
    return {
      line: m.line, msgType: m.type, name: FixDict.msgName(d, m.type), note: note || undefined,
      fields: m.fields.map(f => ({ tag: f.tag, name: f.tag ? FixDict.name(d, f.tag) : null, value: f.value, meaning: f.tag ? (TagInfo.value(d, m, f, tz) || {}).main : undefined })),
      issues: m.issues.map(x => ({ level: x.level, message: T(x.key, x.params) })),
    };
  }

  function flash(el, tag) {
    const row = el.querySelector(`table.fields tr[data-tag="${CSS.escape(tag)}"]`);
    if (!row) return;
    row.scrollIntoView({ block: "center" });
    row.classList.add("flash");
    setTimeout(() => row.classList.remove("flash"), 1200);
  }

  // Tooltip of a tag row of the message currently shown.
  function tip(tr) {
    if (!shown) return "";
    const f = shown.m.fields[+tr.dataset.i];
    return f && f.tag !== null ? TagInfo.tooltip(shown.ctx.dict, shown.m, f, shown.ctx.tz) : "";
  }

  return { render, json, flash, tip };
})();

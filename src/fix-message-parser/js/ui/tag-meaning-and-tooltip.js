// Meaning cell + hover tooltip of one tag: value meaning (venue error code / FIX enum / venue value list), short description, full FIX + venue notes.
const TagInfo = (() => {
  const NUMERIC = new Set(["QTY", "PRICE", "AMT", "FLOAT", "PRICEOFFSET"]);
  const same = (a, b) => a.toLowerCase().replace(/[^a-z0-9]/g, "") === b.toLowerCase().replace(/[^a-z0-9]/g, "");
  let tip = null;

  // → { main, extra } or null; with the venue dialect the spec wording wins (549=1 is "đặt lệnh thỏa thuận thông thường", not FIX "Cross AON").
  function value(d, m, f, tz) {
    const venue = d.dialect === "venue";
    if (venue && f.tag === "373") { const e = FixKnow.venueError(f.value); if (e) return { main: e, extra: "" }; }
    const en = FixDict.meaning(d, f.tag, f.value), hv = venue ? FixKnow.venueValue(m, f.tag, f.value) : "";
    if (hv) return { main: hv, extra: en && !hv.toLowerCase().includes(en.toLowerCase()) ? en : "" };
    if (en) return { main: en, extra: "" };
    const def = FixDict.field(d, f.tag);
    if (!def) return null;
    if (def.type === "UTCTIMESTAMP" && tz !== "utc") return { main: FixTime.full(f.value, tz), extra: "" };
    if (NUMERIC.has(def.type) && /^-?\d{4,}(\.\d+)?$/.test(f.value)) return { main: Number(f.value).toLocaleString(I18n.lang, { maximumFractionDigits: 20 }), extra: "" };
    return null;
  }

  function describe(d, m, tag) {
    if (d.dialect === "venue") { const n = FixKnow.venueNote(m, tag); if (n && n.own && n.lines[0]) return n.lines[0]; }
    return FixKnow.firstSentence(FixKnow.fieldDoc(tag));
  }

  function cell(d, m, f, tz) {
    const esc = Dom.esc, v = value(d, m, f, tz);
    if (v) return esc(v.main) + (v.extra ? ` <span class="hv">· FIX: ${esc(v.extra)}</span>` : "");
    const s = describe(d, m, f.tag);
    return s ? `<span class="desc">${esc(s)}</span>` : "";
  }

  // Short text for the timeline; plain=true keeps the FIX enum name so a column reads the same for every message (Side).
  function text(d, m, tag, plain = false) {
    const v = m.get(tag);
    if (!v) return "";
    if (plain) return FixDict.meaning(d, tag, v) || v;
    const r = value(d, m, { tag, value: v }, "utc");
    return r ? r.main : v;
  }

  function tooltip(d, m, f, tz) {
    const esc = Dom.esc, def = FixDict.field(d, f.tag), v = value(d, m, f, tz);
    const note = d.dialect === "venue" ? FixKnow.venueNote(m, f.tag) : null, msg = FixDict.msgName(d, m.type);
    const req = f.section === "header" || f.section === "trailer" ? T(f.section === "header" ? "Header" : "Trailer")
      : note && note.own ? T(note.req === "Y" ? "Bắt buộc trong {msg}" : "Tuỳ chọn trong {msg}", { msg })
      : d.msgs.get(m.type) ? T(d.msgs.get(m.type).req.includes(f.tag) ? "Bắt buộc trong {msg}" : "Tuỳ chọn trong {msg}", { msg }) : "";
    const en = FixDict.meaning(d, f.tag, f.value), code = FixKnow.codeDoc(f.tag, f.value), doc = FixKnow.fieldDoc(f.tag);
    const enLine = en || code ? `<div class="tt-c">${esc(f.value)} = ${esc(en || f.value)}${code && !same(code, en) ? " — " + esc(code) : ""}</div>` : "";
    const sec = (title, body) => `<div class="tt-sec"><div class="tt-k">${esc(title)}</div>${body}</div>`;
    return `<div class="tt-h"><span class="tn">${esc(f.tag)}</span> <b>${esc(def ? def.name : T("(không rõ)"))}</b>` +
      (def ? ` <span class="muted">${esc(def.type)}${def.fix50 ? " · FIX 5.0" : ""}${def.custom ? " · " + T("từ điển riêng") : ""}</span>` : "") + (req ? ` <span class="tt-req">${esc(req)}</span>` : "") + `</div>` +
      `<div class="tt-v"><code>${esc(f.value === "" ? T("(rỗng)") : f.value)}</code>${v ? ` → ${esc(v.main)}${v.extra ? ` · FIX: ${esc(v.extra)}` : ""}` : ""}</div>` +
      (doc || enLine ? sec(T("Mô tả FIX 4.4"), esc(doc) + enLine) : "") +
      (note ? sec(T(note.own ? "Spec {venue} v1.15 — {msg}" : "Spec {venue} v1.15 — theo bảng của {msg}", { venue: FixKnow.venue(), msg: FixKnow.msgTitle(note.key) }),
        note.lines.map(esc).join("<br>")) : "") +
      (!doc && !note ? `<div class="muted">${esc(T("Không có mô tả cho tag này trong từ điển."))}</div>` : "");
  }

  // Follows the mouse over elements matching selector; resolve(el) → tooltip HTML or "".
  function bind(container, resolve, selector = "tr[data-tag]") {
    if (!tip) { tip = Object.assign(document.body.appendChild(document.createElement("div")), { className: "tip", hidden: true }); tip.dataset.i18nSkip = ""; }
    const place = e => {
      const w = tip.offsetWidth, h = tip.offsetHeight;
      tip.style.left = Math.max(4, Math.min(e.clientX + 14, innerWidth - w - 8)) + "px";
      tip.style.top = (e.clientY + 16 + h > innerHeight ? Math.max(4, e.clientY - h - 10) : e.clientY + 16) + "px";
    };
    let cur = null;
    container.addEventListener("mousemove", e => {
      const tr = e.target.closest(selector);
      if (!tr) { tip.hidden = true; cur = null; return; }
      if (tr !== cur) { cur = tr; const html = resolve(tr); tip.innerHTML = html; tip.hidden = !html; }
      if (!tip.hidden) place(e);
    });
    container.addEventListener("mouseleave", () => { tip.hidden = true; cur = null; });
    container.addEventListener("scroll", () => { tip.hidden = true; cur = null; });
  }

  return { value, cell, text, tooltip, bind };
})();

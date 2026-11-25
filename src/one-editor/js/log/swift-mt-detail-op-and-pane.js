// "swift-detail" op: a SWIFT MT tab → JSON of every message (blocks, fields, errors); pane: per message header, structure errors (16R/16S, mandatory MT540–548 tags) and the field table — click ⇒ source line.
const SwiftOp = (() => {
  const ERR = {
    noBlock1: "Không thấy block {1:} — message SWIFT MT bắt đầu bằng {1:F01…}.", noBlock2: "Thiếu block {2:} (loại message + người nhận).", noBlock4: "Thiếu block {4:} (nội dung).",
    noEnd4: "Block {4:} không có dòng kết thúc “-}”.", openBlock: "Block {{block}:} không đóng ngoặc }.", extra16S: ":16S:{name} không có :16R: mở tương ứng.",
    mismatch16S: ":16S:{name} đóng sai khối — đang mở :16R:{open}.", unclosed16R: ":16R:{name} chưa đóng bằng :16S:{name}.",
    noSeq: "MT{mt} thiếu khối bắt buộc {seq}.", noField: "MT{mt} thiếu {field} trong khối {seq}.",
    badBlock1: "Block {1:} sai dạng — cần F01 + BIC 12 ký tự (chữ hoa).", badBlock2: "Block {2:} sai dạng — cần I/O + mã MT 3 số.", badField: "Dòng “{text}” giống tag nhưng sai dạng (:NNa: chữ hoa) — không đọc thành field.",
  };
  const errText = (e, mt) => T(ERR[e.code] || e.code, { ...e, mt: mt || "?" });

  function run(t, c) {
    const r = SwiftMt.parse(t), msgs = r.messages;
    if (!msgs.length) throw Object.assign(new Error(errText(r.errors[0])), { warn: true });
    const errs = msgs.reduce((n, m) => n + m.errors.length, 0);
    const json = msgs.map(m => ({ line: m.line, mt: m.header.mt || "", name: SwiftDict.MT[m.header.mt] || "", sender: m.header.sender || "", receiver: m.header.receiver || "",
      errors: m.errors.map(e => ({ line: e.line, msg: errText(e, m.header.mt) })), fields: m.fields.map(f => ({ line: f.line, seq: f.path, tag: f.tag, qual: f.qual || undefined, value: f.value })) }));
    const notes = [T("{n} message SWIFT · {e} lỗi cấu trúc.", { n: I18n.num(msgs.length), e: I18n.num(errs) }), T("Kiểm cấu trúc rút gọn (16R/16S, tag bắt buộc MT540–548) — không thay validator SWIFT đầy đủ.")];
    const first = msgs.flatMap(m => m.errors.map(e => ({ e, mt: m.header.mt })))[0];
    const error = first ? Object.assign(new Error(errText(first.e, first.mt)), { line: first.e.line, warn: true }) : null;
    return { text: JSON.stringify(json, null, 2) + "\n", notes, error, view: { kind: "swift", srcId: c.id, msgs } };
  }

  async function share(srcId) {
    const src = Docs.get(srcId);
    if (!src) { StatusBar.msg(T("Tab nguồn của kết quả này đã đóng."), "warn"); return; }
    await PowerUi.shareLink({ v: 1, views: [[{ n: src.name, l: src.lang || "", t: Docs.text(src) }], []], run: "swift-detail" }, n => T("🔗 Đã chép link SWIFT MT ({n} ký tự) — mở link là kiểm lại.", { n }));
  }

  return { run, share, errText };
})();

const PvSwift = {
  create(p) {
    const { mk, button } = PowerUi;
    const link = button("", () => v.last && SwiftOp.share(v.last.srcId));
    const v = { el: mk("div", "pv-swift"), tools: [link], last: null };
    const jump = (d, line) => { const src = Docs.get(d.srcId); if (src) { Views.revealLine(src, line); PhoneLayout.show(Views.where(src.id) + 1); } };
    const clickable = (el, d, line) => { el.tabIndex = 0; el.onclick = () => jump(d, line); el.onkeydown = e => { if (e.key === "Enter") jump(d, line); }; return el; };

    function message(m, d) {
      const h = m.header, parts = [mk("h4", "sw-head" + (m.errors.length ? " fl-bad" : ""), "MT" + (h.mt || "?") + (SwiftDict.MT[h.mt] ? " — " + SwiftDict.MT[h.mt] : "") + (h.sender ? " · " + h.sender + " → " + (h.receiver || "?") : ""))];
      if (m.errors.length) {
        const ul = mk("ul", "sw-errs");
        m.errors.forEach(e => ul.append(clickable(mk("li", "rx-bad", T("Dòng {n}", { n: e.line }) + ": " + SwiftOp.errText(e, h.mt)), d, e.line)));
        parts.push(ul);
      } else parts.push(SwiftMt.RULES[+h.mt] ? mk("div", "sw-ok", T("✔ Cấu trúc ổn (16R/16S cân, đủ tag bắt buộc đã kiểm).")) : mk("div", "rp-none", T("16R/16S cân — chưa có luật tag bắt buộc cho MT{mt}.", { mt: h.mt || "?" })));
      const tb = mk("table", "rx-tab sw-tab"), head = mk("tr");
      [T("Dòng"), T("Khối"), "Tag", "Qualifier", T("Tên"), T("Giá trị")].forEach(x => head.append(mk("th", "", x)));
      tb.append(head);
      for (const f of m.fields.slice(0, 3000)) {
        const seq = f.tag === "16R" || f.tag === "16S", name = seq ? SwiftDict.seqName(f.value) : SwiftDict.TAGS[f.tag] || "";
        const tr = clickable(mk("tr", seq ? "sw-seqrow" : ""), d, f.line), val = SwiftDict.codeOf(f.tag, f.value) || f.value;
        [f.line, f.path, ":" + f.tag + ":", f.qual ? f.qual + (SwiftDict.QUALS[f.qual] ? " — " + SwiftDict.QUALS[f.qual] : "") : "", name, val.length > 300 ? val.slice(0, 300) + "…" : val].forEach(x => tr.append(mk("td", "", String(x))));
        tb.append(tr);
      }
      parts.push(tb);
      if (m.fields.length > 3000) parts.push(mk("div", "rp-none", T("Bảng hiện {n} field đầu — đủ trong text JSON của tab.", { n: I18n.num(3000) })));
      return parts;
    }

    function render() {
      const d = v.last, errs = d.msgs.reduce((n, m) => n + m.errors.length, 0);
      p.type.textContent = T("Chi tiết SWIFT MT · {n} message · {e} lỗi", { n: I18n.num(d.msgs.length), e: I18n.num(errs) });
      v.el.replaceChildren(...d.msgs.slice(0, 200).flatMap(m => message(m, d)), ...(d.msgs.length > 200 ? [mk("div", "rp-none", T("Pane hiện {n} message đầu — đủ trong text JSON của tab.", { n: I18n.num(200) }))] : []));
    }

    v.labels = () => { link.textContent = T("🔗 Link"); link.title = T("Chép link chia sẻ: message SWIFT + kiểm lại khi mở"); if (v.last) render(); };
    v.show = d => { v.last = d; render(); return true; };
    return v;
  },
};

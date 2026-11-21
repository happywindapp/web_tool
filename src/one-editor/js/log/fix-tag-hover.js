// FIX tabs: hover a tag=value ⇒ tag name, type, group and the meaning of the value, from the FIX Parser dictionary (tools/one-editor-extras.js, loaded on first hover); open the tab in FIX Parser.
const FixHover = (() => {
  let dict = null, ext = null;
  const load = () => dict ??= VendorPaths.load("extras").then(() => FixDict.get("fix44")).catch(e => { dict = null; throw e; });

  // A dictionary + tag + value → { title, rows } (pure once the dictionary is there).
  function describe(d, tag, value) {
    const f = FixDict.field(d, tag), group = d.header.has(tag) ? T("header") : d.trailer.has(tag) ? T("trailer") : T("body");
    const mean = tag === "35" ? FixDict.splitCamel(FixDict.msgName(d, value)) : FixDict.meaning(d, tag, value);
    const rows = [[T("Tên"), f ? FixDict.splitCamel(f.name) + " (" + f.name + ")" : T("Không có trong từ điển FIX 4.4 / 5.0SP2")], [T("Kiểu"), f ? f.type : "?"], [T("Nhóm"), group]];
    rows.push([T("Giá trị"), value + (mean ? " → " + mean : "")]);
    return { title: "FIX " + tag + (f ? " · " + f.name : ""), rows };
  }

  function extension() {
    return ext ??= CM.view.hoverTooltip(async (view, pos) => {
      const g = Views.groups.find(x => x.view === view), doc = g && Docs.get(g.active);
      if (!doc || Docs.effectiveLang(doc) !== "FIX") return null;
      const line = view.state.doc.lineAt(pos), off = pos - line.from;
      if (line.length > 20000) return null;
      const m = [...line.text.matchAll(LogFixMarks.FIX)].find(x => x.index + x[1].length <= off && off <= x.index + x[0].length);
      if (!m) return null;
      let info;
      try { info = describe(await load(), m[2], m[3]); }
      catch (e) { info = { title: "FIX " + m[2], rows: [["", T("Không nạp được từ điển FIX ({file}).", { file: e.message })]] }; }
      const from = line.from + m.index + m[1].length;
      return { pos: from, end: from + m[0].length - m[1].length, above: true, create: () => ({ dom: NumHover.render(info) }) };
    }, { hoverTime: 300 });
  }

  // FIX Parser reads { text, sel } from the #pako: hash; sel = the message under the cursor.
  async function openInParser(doc) {
    const v = Views.activeView(), st = v.state, before = st.doc.sliceString(0, st.doc.lineAt(st.selection.main.head).to);
    const sel = Math.max(0, (before.match(/(?:^|[^\d])8=FIXT?\.\d\.\d/g) || []).length - 1);
    const url = new URL("fix-message-parser.html", location.href);
    url.hash = await ShareCodec.encode({ text: Docs.text(doc), sel });
    if (url.href.length > 2e6) { StatusBar.msg(T("Tab quá lớn để mở qua link (> 2 MB sau khi nén) — lưu file rồi mở trong FIX Parser."), "warn"); return; }
    window.open(url.href, "_blank", "noopener");
    StatusBar.msg(T("Đã mở “{name}” trong FIX Parser (tab mới; dữ liệu nằm sau dấu #, không gửi đi đâu).", { name: doc.name }), "good");
  }

  return { describe, extension, openInParser, load };
})();

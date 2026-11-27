// Phase 2b commands (encoding, EOL, line ops, column, MIME / hash, macro, large files). Ctrl+Shift+R reloads the browser, hence Alt+Shift+R / P for macros.
function registerNotepadppCommands(C, hasDoc) {
  const E = EncodingActions, N = NppActions;
  const label = s => () => T(E.PICK) + ": " + T(s.text, s.p);

  for (const enc of [...Encoding.WRITABLE, ...Encoding.READ_ONLY]) C("reopen-" + enc, label({ text: "mở lại với {enc}", p: { enc: Encoding.label(enc) } }), null, () => E.reopen(enc), hasDoc);
  for (const enc of Encoding.WRITABLE) C("saveas-" + enc, label({ text: "lưu với {enc}", p: { enc: Encoding.label(enc) } }), null, () => E.saveWith(enc), hasDoc);
  C("bom", label({ text: "thêm / bỏ BOM" }), null, E.toggleBom, hasDoc);
  for (const eol of ["\r\n", "\n", "\r"]) C("eol-" + Encoding.EOL_NAME[eol], label({ text: "xuống dòng kiểu {eol}", p: { eol: Encoding.EOL_NAME[eol] } }), null, () => E.setEol(eol), hasDoc);
  C("hidden", "Hiện / ẩn ký tự ẩn (dấu cách, Tab, xuống dòng)", null, E.toggleHidden);

  const LINES = [["sortAsc", "Dòng: sắp xếp A → Z"], ["sortDesc", "Dòng: sắp xếp Z → A"], ["sortCi", "Dòng: sắp xếp bỏ qua hoa / thường"], ["sortNum", "Dòng: sắp xếp theo số"],
    ["sortLen", "Dòng: sắp xếp theo độ dài"], ["unique", "Dòng: bỏ dòng trùng"], ["uniqueCi", "Dòng: bỏ dòng trùng (bỏ qua hoa / thường)"], ["removeEmpty", "Dòng: bỏ dòng trống"],
    ["reverse", "Dòng: đảo thứ tự"], ["join", "Dòng: nối thành 1 dòng"], ["trimEnd", "Dòng: xoá khoảng trắng cuối dòng"], ["trimStart", "Dòng: xoá khoảng trắng đầu dòng"],
    ["tabsToSpaces", "Thụt lề: Tab → dấu cách"], ["spacesToTabs", "Thụt lề: dấu cách → Tab"]];
  for (const [id, text] of LINES) C("line-" + id, text, null, () => N.lines(id, 4), hasDoc);
  C("line-split", "Dòng: tách tại dấu phân cách…", null, N.splitBy, hasDoc);
  const run = id => () => CM.commands[id](Views.activeView());
  C("line-dup", "Dòng: nhân đôi (Shift+Alt+↓)", null, run("copyLineDown"), hasDoc);
  C("line-up", "Dòng: chuyển lên (Alt+↑)", null, run("moveLineUp"), hasDoc);
  C("line-down", "Dòng: chuyển xuống (Alt+↓)", null, run("moveLineDown"), hasDoc);
  C("cursorAbove", "Cột: thêm con trỏ dòng trên", "Ctrl+Alt+ArrowUp", run("addCursorAbove"), hasDoc);
  C("cursorBelow", "Cột: thêm con trỏ dòng dưới", "Ctrl+Alt+ArrowDown", run("addCursorBelow"), hasDoc);
  C("colNumbers", "Cột: chèn số tăng dần…", null, N.numbers, hasDoc);

  const TEXT = [["upper", "Chữ: HOA"], ["lower", "Chữ: thường"], ["title", "Chữ: Viết Hoa Đầu Từ"], ["camel", "Chữ: camelCase"], ["pascal", "Chữ: PascalCase"],
    ["snake", "Chữ: snake_case"], ["kebab", "Chữ: kebab-case"], ["constant", "Chữ: CONSTANT_CASE"], ["dot", "Chữ: dot.case"], ["b64enc", "MIME: mã hoá Base64"], ["b64dec", "MIME: giải mã Base64"], ["urlEnc", "MIME: URL encode"],
    ["urlDec", "MIME: URL decode"], ["htmlEnc", "MIME: mã hoá HTML entity"], ["htmlDec", "MIME: giải mã HTML entity"]];
  for (const [id, text] of TEXT) C("text-" + id, text, null, () => N.text(id), hasDoc);
  for (const alg of ["SHA-1", "SHA-256", "SHA-512"]) C("hash-" + alg, () => T("Hash {alg} của vùng chọn (hoặc cả tab)", { alg }), null, () => N.hash(alg), hasDoc);

  const S = TokenStyles;
  for (let s = 1; s <= S.N; s++) {
    const p = () => ({ s, color: S.colorName(s) });
    C("styleAll" + s, () => T("Tô màu {s} ({color}): mọi chỗ của token", p()), "Ctrl+k " + s, () => S.styleAll(s), hasDoc);
    C("styleOne" + s, () => T("Tô màu {s} ({color}): chỉ token này", p()), null, () => S.styleOne(s), hasDoc);
    C("styleClear" + s, () => T("Tô màu: xoá màu {s} ({color})", p()), null, () => S.clearStyle(s), hasDoc);
  }
  C("styleClearAll", "Tô màu: xoá mọi màu", "Ctrl+k 0", () => S.clearStyle(0), hasDoc);
  C("styleNext", "Tô màu: tới chỗ tô kế tiếp", null, () => S.jump(1), hasDoc);
  C("stylePrev", "Tô màu: tới chỗ tô trước", null, () => S.jump(-1), hasDoc);
  C("styleCopy", "Tô màu: chép chữ đã tô", null, S.copyStyled, hasDoc);

  C("macroRecord", "Macro: bắt đầu / dừng ghi", "Alt+Shift+r", Macro.toggle, hasDoc);
  C("macroPlay", "Macro: phát lại 1 lần", "Alt+Shift+p", () => Macro.play(1), hasDoc);
  C("macroPlayN", "Macro: phát lại N lần…", null, Macro.playN, hasDoc);
  C("macroPlayEnd", "Macro: phát tới cuối tab", null, () => Macro.play("end"), hasDoc);
  C("macroSave", "Macro: lưu với tên…", null, Macro.save);
  C("macroRun", "Macro: chạy macro đã lưu…", null, Macro.runSaved, hasDoc);

  const big = () => !!(Views.activeDoc() && Views.activeDoc().big);
  C("bigNext", "File lớn: đoạn kế", null, () => BigFile.move(1), big);
  C("bigPrev", "File lớn: đoạn trước", null, () => BigFile.move(-1), big);
  C("bigGo", "File lớn: tới vị trí (MB)…", null, BigFile.goTo, big);
  C("bigFind", "File lớn: tìm trong toàn bộ file…", null, BigFile.search, big);
}

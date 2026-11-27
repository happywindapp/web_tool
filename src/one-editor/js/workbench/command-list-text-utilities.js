// Phase 15a: case styles + text & list tools + encoders in the Palette and the selection menu; the tools run in the lazy bundle (TextToolDlg, EncActions).
const TextUtilCmds = (() => {
  const CASES = ["upper", "lower", "title", "camel", "pascal", "snake", "kebab", "constant", "dot"].map(id => "text-" + id);
  const TOOLS = [["wrap-lines", "⟦⟧ Bọc / nối dòng… (SQL IN · VALUES · JSON array)"], ["extract", "🔗 Trích URL / email / IPv4 / IPv6…"], ["slug-lines", "Slug (bỏ dấu tiếng Việt)…"],
    ["number-words", "🔢 Số → chữ (tiếng Việt / English)…"], ["word-freq", "Tần suất từ…"]];
  const dialog = id => PowerTools.use(() => TextToolDlg.open(id));

  function tokens() {
    const doc = Views.activeDoc(), sel = SelectionActions.text(Views.activeView());
    if (!doc) return;
    const t = sel || Docs.text(doc);
    StatusBar.msg(T("~{n} token ({what}, {chars} ký tự) — ước lượng, không phải số đếm của tokenizer.", { n: I18n.num(TokenEst.count(t)), what: T(sel ? "vùng chọn" : "cả tab"), chars: I18n.num(t.length) }));
  }

  // Selection menu: a second menu at the same point, rows = the Palette commands.
  function nodes(x, y) {
    const sub = (head, ids) => () => {
      const all = Commands.all(), rows = ids.map(id => all.find(c => c.id === id)).filter(Boolean).map(TabMenu.item);
      TabMenu.show([Object.assign(document.createElement("div"), { className: "menu-head", textContent: T(head) }), ...rows], x, y);
    };
    return [TabMenu.entry(T("Aa Đổi kiểu chữ ▸"), "", sub("Đổi kiểu chữ (mỗi lần 1 Ctrl+Z)", CASES)),
      TabMenu.entry(T("≡ Văn bản & danh sách ▸"), "", sub("Văn bản & danh sách", [...TOOLS.map(([id]) => "tt-" + id), "op-html-to-text", "tokens"]))];
  }

  function register(C, doc, hasDoc) {
    for (const [id, l] of TOOLS) C("tt-" + id, l, null, () => dialog(id), hasDoc);
    C("op-html-to-text", () => T(OutputOps.get("html-to-text").label) + " ⇢", null, () => SelectionActions.text(Views.activeView()) ? SelectionActions.runOn("html-to-text") : OutputLink.run(doc(), "html-to-text"), hasDoc);
    C("tokens", "Đếm token ước lượng (vùng chọn hoặc cả tab)", null, tokens, hasDoc);
    const enc = (fn, a) => () => PowerTools.use(() => EncActions[fn](a));
    for (const [k, name] of [["b32", "Base32"], ["b58", "Base58"], ["a85", "Ascii85"], ["z85", "Z85"]]) {
      C("enc-" + k, () => T("Mã hoá: {name} (vùng chọn hoặc cả tab)", { name }), null, enc("map", k + "enc"), hasDoc);
      C("dec-" + k, () => T("Giải mã: {name} (vùng chọn hoặc cả tab)", { name }), null, enc("map", k + "dec"), hasDoc);
    }
    C("hmac", "HMAC (SHA-1 / 256 / 512) của tab — nhập khoá trên pane Recipe", null, enc("hmac", doc), hasDoc);
    C("uuid7", "Chèn UUID v7 (theo thời gian)", null, enc("insert", "uuid7"), hasDoc);
    C("ulid", "Chèn ULID", null, enc("insert", "ulid"), hasDoc);
    C("idTime", "UUID v7 / ULID → thời điểm (vùng chọn hoặc dòng)", null, enc("describe", "idTime"), hasDoc);
    C("cidr", "CIDR → mạng, broadcast, mask, dải host (vùng chọn hoặc dòng)", null, enc("describe", "cidr"), hasDoc);
    C("chmod", "chmod: 755 ⇄ rwxr-xr-x (vùng chọn hoặc dòng)", null, enc("describe", "chmod"), hasDoc);
  }

  return { nodes, register, tokens };
})();

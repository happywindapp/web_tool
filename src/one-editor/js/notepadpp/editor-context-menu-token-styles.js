// Notepad++-style editor right-click menu (cut / copy / paste / select all + token styles) and the toolbar 🖍 menu (styles only); touch long-press and Shift+right-click keep the browser menu.
const EditorMenu = (() => {
  let touch = false;
  const S = TokenStyles, el = (tag, cls, text) => Object.assign(document.createElement(tag), { className: cls, textContent: text || "" });
  const sep = () => el("hr", "menu-sep");

  // One row: label + a swatch per colour (+ "all" for clear).
  function swatchRow(label, title, run, all) {
    const row = el("div", "npp-style-row");
    row.setAttribute("role", "group");
    row.append(el("span", "", T(label)));
    for (let s = 1; s <= S.N; s++) {
      const b = el("button", "npp-sw", String(s));
      Object.assign(b, { type: "button", title: T(title, { s, color: S.colorName(s) }) });
      b.dataset.s = s;
      b.setAttribute("role", "menuitem");
      b.onclick = () => { TabMenu.close(); run(s); };
      row.append(b);
    }
    if (all) {
      const b = el("button", "npp-sw all", T("hết"));
      Object.assign(b, { type: "button", title: T("Xoá mọi màu đã tô") });
      b.setAttribute("role", "menuitem");
      b.onclick = () => { TabMenu.close(); all(); };
      row.append(b);
    }
    return row;
  }

  const key = id => { const c = Commands.all().find(x => x.id === id); return c ? Commands.keyLabel(c) : ""; };
  const styleNodes = () => [
    swatchRow("Tô mọi chỗ", "Tô mọi chỗ của token bằng màu {s} ({color})", S.styleAll),
    swatchRow("Tô 1 token", "Chỉ tô token đang chọn / dưới con trỏ bằng màu {s} ({color})", S.styleOne),
    swatchRow("Xoá màu", "Xoá màu {s} ({color}) khỏi cả tab", S.clearStyle, () => S.clearStyle(0)),
    sep(),
    TabMenu.entry(T("Tới chỗ tô kế tiếp"), key("styleNext"), () => S.jump(1)),
    TabMenu.entry(T("Tới chỗ tô trước"), key("stylePrev"), () => S.jump(-1)),
    TabMenu.entry(T("Chép chữ đã tô"), key("styleCopy"), S.copyStyled),
  ];

  // Cut / copy go through the browser so CodeMirror's own handlers run (empty selection = the whole line).
  function clip(v, what) {
    v.focus();
    if (what !== "paste") { document.execCommand(what); return; }
    if (!navigator.clipboard || !navigator.clipboard.readText) { StatusBar.msg(T("Trình duyệt không cho đọc clipboard — dùng Ctrl+V."), "warn"); return; }
    navigator.clipboard.readText().then(t => v.dispatch(v.state.replaceSelection(t), { userEvent: "input.paste", scrollIntoView: true }), () => StatusBar.msg(T("Trình duyệt không cho đọc clipboard — dùng Ctrl+V."), "warn"));
  }

  function editNodes(v) {
    const ro = v.state.readOnly, nodes = [];
    if (!ro) nodes.push(TabMenu.entry(T("Cắt"), "Ctrl+X", () => clip(v, "cut")));
    nodes.push(TabMenu.entry(T("Chép"), "Ctrl+C", () => clip(v, "copy")));
    if (!ro) nodes.push(TabMenu.entry(T("Dán"), "Ctrl+V", () => clip(v, "paste")));
    nodes.push(TabMenu.entry(T("Chọn hết"), "Ctrl+A", () => { v.focus(); CM.commands.selectAll(v); }), sep());
    return nodes;
  }

  function onContextMenu(e) {
    if (touch || e.shiftKey) return;
    const g = Views.groups.find(x => x.view && x.view.scrollDOM.contains(e.target));
    if (!g || !Docs.get(g.active)) return;
    e.preventDefault();
    Views.focus(g.i);
    const v = g.view, st = v.state;
    let x = e.clientX, y = e.clientY;
    // Right-click outside the selection moves the cursor there, so the token is the word clicked.
    const pos = x || y ? v.posAtCoords({ x, y }) : null;
    if (pos !== null && !st.selection.ranges.some(r => pos >= r.from && pos <= r.to)) v.dispatch({ selection: { anchor: pos } });
    if (!x && !y) { const c = v.coordsAtPos(st.selection.main.head); if (c) { x = c.left; y = c.bottom; } }
    const mark = TabMenu.entry("🔖 " + T("Bookmark: bật / tắt ở dòng này"), key("bookmark"), () => BookmarkList.toggle(Docs.get(g.active)));
    TabMenu.show([...editNodes(v), mark, sep(), ...SelectionActions.nodes(v, x, y), ...styleNodes()], x, y);
  }

  function openFromButton(btn) {
    if (!Views.activeDoc()) { StatusBar.msg(T("Chưa có tab nào đang mở."), "warn"); return; }
    const r = btn.getBoundingClientRect();
    TabMenu.show(styleNodes(), r.left, r.bottom + 2);
  }

  function init() {
    document.addEventListener("pointerdown", e => { touch = e.pointerType === "touch"; }, true);
    document.addEventListener("contextmenu", onContextMenu);
  }

  return { init, openFromButton };
})();

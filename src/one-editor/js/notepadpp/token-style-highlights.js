// Notepad++ token styles: 6 colours over every occurrence (Style all) or just the token (Style one), clear, jump, copy; marks follow edits and live in the tab's editor state (not saved).
const TokenStyles = (() => {
  const N = 6, MAX = 50000, COLORS = ["xanh ngọc", "cam", "vàng", "tím", "xanh lá", "hồng"];
  let field = null, ext = null, add = null, clear = null, marks = null;
  const isWord = c => /[\p{L}\p{N}_]/u.test(c || "");

  // Start offsets of non-overlapping `token` matches (case-sensitive); whole = no letter / digit / _ right before or after (pure).
  function occurrences(text, token, whole = false, max = MAX) {
    const out = [];
    if (!token) return out;
    for (let i = text.indexOf(token); i >= 0 && out.length < max;) {
      const ok = !whole || (!isWord(text[i - 1]) && !isWord(text[i + token.length]));
      if (ok) out.push(i);
      i = text.indexOf(token, i + (ok ? token.length : 1));
    }
    return out;
  }

  // Built on first use: CodeMirror is only loaded at boot. Prec.low makes a mark the outer span (lower precedence wraps), so syntax / log colours inside do not split it.
  function extension() {
    if (ext) return ext;
    const { StateField, StateEffect } = CM.state, { Decoration, EditorView } = CM.view;
    add = StateEffect.define({ map: (v, m) => ({ style: v.style, ranges: v.ranges.map(([a, b]) => [m.mapPos(a), m.mapPos(b)]) }) });
    clear = StateEffect.define();
    marks = Array.from({ length: N }, (_, i) => Decoration.mark({ class: "cm-npp-style cm-npp-s" + (i + 1), style: i + 1 }));
    field = StateField.define({
      create: () => Decoration.none,
      update(set, tr) {
        set = set.map(tr.changes);
        for (const e of tr.effects) {
          if (e.is(clear)) set = e.value ? set.update({ filter: (f, t, d) => d.spec.style !== e.value }) : Decoration.none;
          else if (e.is(add)) {
            // Styling a range again replaces its colour instead of stacking a second mark.
            const ranges = e.value.ranges.filter(([a, b]) => b > a), keys = new Set(ranges.map(([a, b]) => a + ":" + b));
            set = set.update({ filter: (f, t) => !keys.has(f + ":" + t), add: ranges.map(([a, b]) => marks[e.value.style - 1].range(a, b)), sort: true });
          }
        }
        return set;
      },
      provide: f => EditorView.decorations.from(f),
    });
    return ext = CM.state.Prec.low(field);
  }

  const colorName = s => T(COLORS[s - 1]);
  const activeView = () => (Views.activeDoc() && Views.activeView()) || (StatusBar.msg(T("Chưa có tab nào đang mở."), "warn"), null);
  // Selected text (exact match) or the word under the cursor (whole word); null when neither.
  function tokenOf(st) {
    const r = st.selection.main;
    if (!r.empty) return { text: st.sliceDoc(r.from, r.to), whole: false, from: r.from };
    const w = st.wordAt(r.head);
    return w ? { text: st.sliceDoc(w.from, w.to), whole: true, from: w.from } : null;
  }
  const noToken = () => StatusBar.msg(T("Bôi đen chữ cần tô (hoặc đặt con trỏ trong 1 từ) rồi chọn màu."), "warn");
  const short = s => s.length > 40 ? s.slice(0, 40) + "…" : s;

  // tok: { text, whole } to style a given string (demos); default = the token at the cursor.
  function styleAll(s, v = activeView(), tok = v && tokenOf(v.state)) {
    if (!v) return;
    if (!tok || !tok.text) { noToken(); return; }
    const at = occurrences(v.state.doc.toString(), tok.text, tok.whole);
    v.dispatch({ effects: add.of({ style: s, ranges: at.map(i => [i, i + tok.text.length]) }) });
    StatusBar.msg(T("Đã tô {n} chỗ “{tok}” bằng màu {s} ({color}).", { n: I18n.num(at.length), tok: short(tok.text), s, color: colorName(s) }) + (at.length >= MAX ? " " + T("(dừng ở {max} chỗ)", { max: I18n.num(MAX) }) : ""), at.length ? "good" : "warn");
  }

  // Every non-empty selection range (multi-cursor too), or the word under the cursor.
  function styleOne(s) {
    const v = activeView();
    if (!v) return;
    const st = v.state, picked = st.selection.ranges.filter(r => !r.empty).map(r => [r.from, r.to]);
    const w = picked.length ? null : st.wordAt(st.selection.main.head), ranges = picked.length ? picked : w ? [[w.from, w.to]] : [];
    if (!ranges.length) { noToken(); return; }
    v.dispatch({ effects: add.of({ style: s, ranges }) });
    StatusBar.msg(T("Đã tô {n} vùng bằng màu {s} ({color}).", { n: ranges.length, s, color: colorName(s) }), "good");
  }

  // [from, to, style] of every mark in document order.
  function ranges(st, s = 0) {
    const out = [], set = field && st.field(field, false);
    if (set) set.between(0, st.doc.length, (f, t, d) => { if (t > f && (!s || d.spec.style === s)) out.push([f, t, d.spec.style]); });
    return out;
  }

  // s = 0 clears every colour.
  function clearStyle(s) {
    const v = activeView();
    if (!v) return;
    const n = ranges(v.state, s).length;
    v.dispatch({ effects: clear.of(s) });
    StatusBar.msg(s ? T("Đã xoá màu {s} ({color}) — {n} chỗ.", { s, color: colorName(s), n: I18n.num(n) }) : T("Đã xoá mọi màu — {n} chỗ.", { n: I18n.num(n) }), "good");
  }

  // Next / previous styled range after / before the selection, wrapping around.
  function jump(dir) {
    const v = activeView();
    if (!v) return;
    const rs = ranges(v.state), r = v.state.selection.main;
    if (!rs.length) { StatusBar.msg(T("Tab này chưa có chữ nào được tô màu."), "warn"); return; }
    const to = dir > 0 ? rs.find(([f]) => f > r.from) ?? rs[0] : [...rs].reverse().find(([f]) => f < r.from) ?? rs[rs.length - 1];
    v.dispatch({ selection: { anchor: to[0], head: to[1] }, effects: CM.view.EditorView.scrollIntoView(to[0], { y: "center" }) });
    v.focus();
  }

  function copyStyled() {
    const v = activeView();
    if (!v) return;
    const rs = ranges(v.state);
    if (!rs.length) { StatusBar.msg(T("Tab này chưa có chữ nào được tô màu."), "warn"); return; }
    Dom.copy(rs.map(([f, t]) => v.state.sliceDoc(f, t)).join("\n"));
    StatusBar.msg(T("Đã chép {n} đoạn đã tô màu (mỗi đoạn 1 dòng).", { n: I18n.num(rs.length) }), "good");
  }

  // Notepad++ Ctrl+F3 / Ctrl+Shift+F3: select the next / previous occurrence of the token, wrapping around.
  function findNext(v, dir) {
    const st = v.state, tok = tokenOf(st);
    if (!tok || !tok.text) return false;
    const at = occurrences(st.doc.toString(), tok.text, tok.whole);
    const i = dir > 0 ? at.find(p => p > tok.from) ?? at[0] : [...at].reverse().find(p => p < tok.from) ?? at[at.length - 1];
    if (i !== undefined) v.dispatch({ selection: { anchor: i, head: i + tok.text.length }, scrollIntoView: true, userEvent: "select.search" });
    return true;
  }

  return { N, extension, occurrences, ranges, colorName, styleAll, styleOne, clearStyle, jump, copyStyled, findNext };
})();

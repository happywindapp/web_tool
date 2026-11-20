// "code-image" op + pane: the selected lines (or the whole tab) as an SVG built from the syntax tree (no DOM capture); theme / background / frame / numbers / padding; download PNG / SVG, copy PNG.
const CodeImageOp = (() => {
  const MAX_LINES = 300, MAX_COLS = 200;
  const DEF = () => ({ theme: "one-dark", bg: "teal", frame: true, numbers: true, pad: 32 });
  const clean = o => ({ theme: o?.theme === "editor" || Object.hasOwn(CodeImage.THEMES, o?.theme) ? o.theme : "one-dark", bg: Object.hasOwn(CodeImage.BACKGROUNDS, o?.bg) ? o.bg : "teal",
    frame: o?.frame !== false, numbers: o?.numbers !== false, pad: [16, 32, 64].includes(o?.pad) ? o.pad : 32 });
  const opts = srcId => PowerUi.opts(srcId, "code-image", clean, DEF);
  let canvas = null;
  const charW = size => { canvas ??= document.createElement("canvas"); const g = canvas.getContext("2d"); g.font = size + "px Consolas, 'Cascadia Mono', 'Courier New', monospace"; return g.measureText("M").width; };

  // Highlight ranges of [from, to): the editor's own colours, or lezer classes mapped by a preset theme.
  function ranges(state, from, to, o) {
    if (o.theme === "editor") return ExportActions.ranges(state, from, to, CmSetup.isDark()).map(r => {
      const css = r.style || "", get = k => (new RegExp("(?:^|;)" + k + ":([^;]+)").exec(css) || [])[1];
      return { from: r.from, to: r.to, s: [get("color"), /bold|[6-9]00/.test(get("font-weight") || ""), get("font-style") === "italic"] };
    });
    const L = CM.language, H = CM.lezerHighlight, th = CodeImage.THEMES[o.theme], out = [];
    if (!H.classHighlighter) return out;
    const tree = L.ensureSyntaxTree(state, to, 1000) || L.syntaxTree(state);
    H.highlightTree(tree, H.classHighlighter, (f, t, cls) => { const s = CodeImage.style(th, cls); if (s) out.push({ from: f - from, to: t - from, s }); }, from, to);
    return out;
  }

  // The language pack may still be loading (demo, fresh tab): wait for it, else the image has no colours.
  async function run(t, c) {
    const src = Docs.get(c.id), o = opts(c.id);
    if (!src) throw new Error(T("Tab nguồn của kết quả này đã đóng."));
    Docs.ensureState(src);
    if (src.langApplied !== Docs.effectiveLang(src)) await LangLoader.apply(src);
    const state = Docs.ensureState(src);
    // Lines of the last manual run stay while typing (a live re-run must not jump to the whole tab when the selection moves).
    const keep = PowerTools.state(c.id, "code-image"), sel = state.selection.main, n = state.doc.lines;
    if (!c.quiet || !keep.lines) {
      let b = sel.empty ? n : state.doc.lineAt(sel.to).number;
      const a = sel.empty ? 1 : state.doc.lineAt(sel.from).number;
      if (!sel.empty && b > a && sel.to === state.doc.line(b).from) b--;
      keep.lines = { a, b, all: sel.empty };
    }
    const a = state.doc.line(Math.min(keep.lines.a, n)), b = state.doc.line(keep.lines.all ? n : Math.min(keep.lines.b, n));
    const notes = [];
    let last = b.number;
    if (last - a.number + 1 > MAX_LINES) { last = a.number + MAX_LINES - 1; notes.push(T("Chỉ lấy {n} dòng đầu.", { n: MAX_LINES })); }
    const from = a.from, to = state.doc.line(last).to, text = state.sliceDoc(from, to), rs = to - from > 2e6 ? [] : ranges(state, from, to, o), tabN = state.tabSize || 4;
    const lines = [];
    let at = 0, ri = 0;
    for (const raw of text.split("\n")) {
      const end = at + raw.length, parts = [];
      let pos = at;
      while (ri < rs.length && rs[ri].to <= at) ri++;
      for (let k = ri; k < rs.length && rs[k].from < end; k++) {
        const r = rs[k], f = Math.max(r.from, at), e = Math.min(r.to, end);
        if (f > pos) parts.push({ t: text.slice(pos, f) });
        if (e > f) parts.push({ t: text.slice(f, e), c: r.s[0], b: r.s[1], i: r.s[2] });
        pos = Math.max(pos, e);
      }
      if (end > pos) parts.push({ t: text.slice(pos, end) });
      // Tab stops and display width (CJK = 2) per character; cut at MAX_COLS without splitting a surrogate pair.
      let cols = 0;
      lines.push(parts.map(p => {
        let s = "";
        for (const ch of p.t) {
          if (cols >= MAX_COLS) { if (!s.endsWith("…") && cols === MAX_COLS) { s += "…"; cols++; } break; }
          const add = ch === "\t" ? " ".repeat(tabN - cols % tabN) : ch;
          s += add; cols += ch === "\t" ? add.length : MdTable.width(ch);
        }
        return { ...p, t: s };
      }));
      at = end + 1;
    }
    while (lines.length > 1 && !lines[lines.length - 1].some(p => p.t.trim())) lines.pop();
    const dark = CmSetup.isDark(), edTheme = { bg: dark ? "#282c34" : "#ffffff", fg: dark ? "#abb2bf" : "#1f2328", gutter: dark ? "#636d83" : "#8c959f" };
    const r = CodeImage.svg(lines, { theme: o.theme === "editor" ? edTheme : CodeImage.THEMES[o.theme], bg: CodeImage.BACKGROUNDS[o.bg], frame: o.frame, numbers: o.numbers, pad: o.pad,
      title: OutputOps.baseName(src.name) + (/\.[^.]+$/.exec(src.name)?.[0] || ""), first: a.number, size: 14, charW: charW(14), width: MdTable.width, id: "ci" + Math.random().toString(36).slice(2, 8) });
    return { text: r.svg, notes, view: { kind: "code-image", srcId: c.id, o, svg: r.svg, w: r.w, h: r.h, lines: lines.length, first: a.number } };
  }

  function set(srcId, o) { PowerUi.saveOpts(srcId, "code-image", clean(o)); const s = Docs.get(srcId); if (s) OutputLink.run(s, "code-image", true); }
  return { run, set, opts };
})();

const PvCodeImage = {
  create(p) {
    const { mk, button } = PowerUi;
    const sel = (cls, list) => { const s = mk("select", cls); list.forEach(([v, l]) => s.append(mk("option", "", l, { value: v }))); return s; };
    const theme = sel("ci-theme", []), bg = sel("ci-bg", []), pad = sel("ci-pad", [[16, "16 px"], [32, "32 px"], [64, "64 px"]]);
    const chk = () => { const l = mk("label", "chk"), c = mk("input", "", null, { type: "checkbox" }), t = mk("span"); l.append(c, t); return { l, c, t }; };
    const frame = chk(), nums = chk(), png = button("", () => exportPng()), svgBtn = button("", () => exportSvg()), copy = button("", () => copyPng());
    const box = mk("div", "ci-box"), v = { el: mk("div", "pv-codeimg"), tools: [theme, bg, frame.l, nums.l, pad, png, svgBtn, copy], last: null, svg: null, bg: "transparent" };
    v.el.append(box);
    const send = () => { if (v.last) CodeImageOp.set(v.last.srcId, { theme: theme.value, bg: bg.value, frame: frame.c.checked, numbers: nums.c.checked, pad: +pad.value }); };
    [theme, bg, pad, frame.c, nums.c].forEach(x => { x.onchange = send; });
    const name = () => OutputOps.baseName(Docs.get(v.last?.srcId)?.name || "code") + "-code";

    // 2× unless the canvas would pass ~16 M pixels (iOS Safari limit).
    const scale = () => v.last && v.last.w * v.last.h * 4 > 16e6 ? 1 : 2;
    async function exportPng() {
      if (!v.svg) return;
      try { Dom.download(await Exporter.png(v.svg, "transparent", scale()), name() + ".png", "image/png"); }
      catch (e) { StatusBar.msg(T("Không xuất được PNG: {msg}", { msg: e.message }), "bad"); }
    }
    const exportSvg = () => { if (v.last) Dom.download(v.last.svg, name() + ".svg", "image/svg+xml"); };
    // Clipboard images need ClipboardItem (Chrome / Edge / Safari; file:// counts as secure); otherwise say so and offer the download.
    async function copyPng() {
      if (!v.svg) return;
      if (!window.ClipboardItem || !navigator.clipboard?.write) { StatusBar.msg(T("Trình duyệt không cho chép ảnh — dùng ⬇ PNG."), "warn"); return; }
      try { await navigator.clipboard.write([new ClipboardItem({ "image/png": Exporter.png(v.svg, "transparent", scale()) })]); StatusBar.msg(T("✔ Đã chép ảnh PNG — dán vào chat / slide / tài liệu."), "good"); }
      catch (e) { StatusBar.msg(T("Không chép được ảnh ({msg}) — dùng ⬇ PNG.", { msg: e.message }), "bad"); }
    }

    v.labels = () => {
      const t = theme.value, b = bg.value;
      theme.replaceChildren(mk("option", "", T("Theo editor"), { value: "editor" }), ...Object.entries(CodeImage.THEMES).map(([k, x]) => mk("option", "", x.label, { value: k })));
      bg.replaceChildren(...[["teal", T("Nền xanh ngọc")], ["sunset", T("Nền cam – hồng")], ["violet", T("Nền tím")], ["slate", T("Nền xám")], ["none", T("Nền trong suốt")]].map(([k, l]) => mk("option", "", l, { value: k })));
      theme.value = t || "one-dark"; bg.value = b || "teal";
      theme.title = T("Theme màu code"); bg.title = T("Nền quanh cửa sổ"); pad.title = T("Lề quanh cửa sổ");
      frame.t.textContent = T("Khung"); frame.l.title = T("Khung cửa sổ + tên file");
      nums.t.textContent = T("Số dòng");
      png.textContent = "⬇ PNG"; png.title = T("Tải ảnh PNG (2×)"); svgBtn.textContent = "⬇ SVG"; svgBtn.title = T("Tải ảnh SVG");
      copy.textContent = T("⧉ Chép ảnh"); copy.title = T("Chép ảnh PNG vào clipboard");
    };
    v.show = d => {
      v.last = d;
      Object.assign(theme, { value: d.o.theme }); bg.value = d.o.bg; pad.value = String(d.o.pad); frame.c.checked = d.o.frame; nums.c.checked = d.o.numbers;
      const doc = new DOMParser().parseFromString(d.svg, "image/svg+xml").documentElement;
      if (doc.nodeName !== "svg") throw new Error(T("Không dựng được ảnh SVG."));
      v.svg = document.importNode(doc, true);
      box.replaceChildren(v.svg);
      p.type.textContent = T("Code → ảnh · {n} dòng · {w}×{h}", { n: d.lines, w: d.w, h: d.h });
      return true;
    };
    v.fit = () => {};
    return v;
  },
};

// Bar between the left and right views (#split in 2 columns / 1x2 / 2x1): moves, swaps, clones and compares across the two sides; ⇢ ✨ 👁 🌐 ▶ + act on the focused view, like the tab bar buttons it hides.
const ViewBar = (() => {
  const SIDES = { "2c": [[0], [1]], "12": [[0], [1, 2]], "21": [[0, 1], [2]] };
  let maxLayout = "";
  const sides = () => SIDES[Views.layout];
  // On a side with two views the focused one is used.
  const pick = side => side.includes(Views.focused) ? Views.focused : side[0];
  const sideOf = gi => { const s = sides(); return !s ? -1 : s[0].includes(gi) ? 0 : s[1].includes(gi) ? 1 : -1; };
  const opposite = gi => { const k = sideOf(gi); return k < 0 ? -1 : pick(sides()[1 - k]); };
  const btn = cls => $("split").querySelector(".vb-" + cls);

  // dir 1: left → right, -1: right → left; other layouts: to the next / previous view.
  function move(dir) {
    const s = sides();
    if (!s) {
      const doc = Views.activeDoc(), to = Views.focused + dir;
      if (doc && to >= 0 && to < Views.count) Views.move(doc.id, to);
      return;
    }
    const from = pick(dir > 0 ? s[0] : s[1]), to = pick(dir > 0 ? s[1] : s[0]), doc = Views.activeDoc(from);
    if (doc) Views.move(doc.id, to);
  }

  function clone() {
    const doc = Views.activeDoc(), to = opposite(Views.focused);
    if (doc && to >= 0) CloneSync.cloneTo(doc, to);
  }

  function compare() {
    const s = sides();
    if (Compare.active || !s) Compare.toggle(); else Compare.start(pick(s[0]), pick(s[1]));
  }

  function swap() {
    const s = sides();
    if (s) Views.swap(pick(s[0]), pick(s[1])); else Views.swap();
  }

  // side 0: copy the block at the left view's cursor to the right, 1: right to left.
  function copyBlock(side) {
    const p = Compare.pair;
    if (p) Compare.copyFrom(p.find(gi => sideOf(gi) === side) ?? p[side]);
  }

  function maximize() {
    if (Split.maxed != null) { Split.maximize(null); return; }
    const k = sideOf(Views.focused);
    if (k < 0) return;
    maxLayout = Views.layout;
    Split.maximize(k);
  }

  function sync() {
    const s = sides();
    // Layout change (it resets #work's classes) or focus moved to the hidden side: show both again.
    if (Split.maxed != null && (Views.layout !== maxLayout || sideOf(Views.focused) !== Split.maxed)) Split.maximize(null);
    if (!s) return;
    const left = Views.activeDoc(pick(s[0])), right = Views.activeDoc(pick(s[1]));
    btn("right").disabled = !left;
    btn("left").disabled = !right;
    btn("swap").disabled = !left && !right;
    btn("clone").disabled = !Views.activeDoc();
    const b = PreviewPane.buttons(Views.activeDoc());
    btn("op").hidden = btn("format").hidden = !b.translate;
    btn("preview").hidden = !b.preview;
    btn("translate").hidden = !b.translate;
    btn("run").hidden = !b.run;
    btn("compare").setAttribute("aria-pressed", Compare.active);
    $("split").querySelectorAll(".vb-cmp").forEach(el => { el.hidden = !Compare.active || (Compare.inline && el.matches(".vb-ltr, .vb-rtl")); });
    btn("sync").setAttribute("aria-pressed", ScrollSync.on);
    btn("max").setAttribute("aria-pressed", Split.maxed != null);
  }

  const TOGGLES = [
    ["right", "→ Chuyển tab sang view phải"], ["left", "← Chuyển tab sang view trái"], ["swap", "⇄ Đổi chỗ tab 2 bên"], ["clone", "⧉ Clone tab sang bên kia"],
    ["compare", "≠ So sánh"], ["cmp", "↑ ↓ ⇒ ⇐ khi đang so sánh"], ["sync", "🔗 Cuộn đồng bộ"], ["op", "⇢ Chạy phép đang chọn"], ["format", "✨ Format ra view kia"],
    ["preview", "👁 Preview"], ["translate", "🌐 Dịch"], ["run", "▶ Chạy HTML / JS"], ["new", "+ Ghi chú"], ["max", "⛶ Phóng to 1 bên"], ["even", "⚖ Chia đều 50:50"],
  ];

  // ⚙ Settings ▸ View bar, like the toolbar: one toggle per button; separators hide around an empty group, all off ⇒ the bar narrows to its grip.
  function initVisibility() {
    const bar = $("split");
    const layout = () => {
      let sep = null, seen = false;
      for (const el of bar.children) {
        if (el.matches(".vb-sep")) { el.hidden = true; if (seen) sep = el; }
        else if (el.matches("button:not([data-off])")) { if (sep) sep.hidden = false; sep = null; seen = true; }
      }
      $("work").style.setProperty("--vbw", seen ? "" : "8px");
    };
    for (const [cls, label] of TOGGLES) {
      const key = "viewbar." + cls, els = bar.querySelectorAll(".vb-" + cls);
      const show = on => els.forEach(el => el.toggleAttribute("data-off", !on));
      show(Prefs.get(key, true) !== false);
      Settings.add({ id: key, group: "viewbar", label, def: true, get: () => !els[0].hasAttribute("data-off"), set: on => { show(on); layout(); Prefs.set(key, on); } });
    }
    layout();
  }

  // Shortcuts (Ctrl+K chords); compare / swap / format / preview… already have their own commands.
  function commands() {
    const C = Commands.add, bar = () => !!sides(), cmp = () => Compare.active && !Compare.inline;
    C("vbMoveRight", "Chuyển tab sang view bên phải", "Ctrl+k ArrowRight", () => move(1), () => !!Views.activeDoc());
    C("vbMoveLeft", "Chuyển tab sang view bên trái", "Ctrl+k ArrowLeft", () => move(-1), () => !!Views.activeDoc());
    C("cmpCopyRight", "So sánh: chép khối ở con trỏ view trái sang view phải", "Ctrl+k Shift+ArrowRight", () => copyBlock(0), cmp);
    C("cmpCopyLeft", "So sánh: chép khối ở con trỏ view phải sang view trái", "Ctrl+k Shift+ArrowLeft", () => copyBlock(1), cmp);
    C("scrollSync", "Cuộn đồng bộ 2 view (bật / tắt)", "Ctrl+k l", () => { ScrollSync.toggle(); sync(); }, bar);
    C("maximizeSide", "Phóng to bên đang chọn / hiện lại 2 bên", "Ctrl+k m", maximize, bar);
    C("evenSplit", "Chia đều 2 view (50:50)", "Ctrl+k =", () => Actions.setSplit("50:50"));
  }

  function init() {
    const run = op => () => OutputLink.run(Views.activeDoc(), op), s = () => sides();
    const on = {
      right: () => move(1), left: () => move(-1), swap, clone,
      compare, prev: () => Compare.jump(-1), next: () => Compare.jump(1), ltr: () => copyBlock(0), rtl: () => copyBlock(1),
      sync: () => { ScrollSync.toggle(); sync(); }, op: () => Actions.run(), format: run("format"), preview: run("preview"), translate: run("translate"),
      run: run("run-code"), new: () => Actions.newNote(Views.focused), max: maximize, even: () => Actions.setSplit("50:50"),
    };
    for (const [k, f] of Object.entries(on)) btn(k).onclick = f;
    initVisibility();
    commands();
    ScrollSync.init();
    Views.onChange(sync);
    Compare.onToggle(sync);
    Split.onMax = sync;
    Docs.on(type => { if (type === "lang" || type === "rename") sync(); });
    sync();
  }

  return { init, move, opposite, compare, swap };
})();

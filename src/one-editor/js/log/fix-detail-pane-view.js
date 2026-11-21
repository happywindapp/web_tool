// FIX detail pane: FIX Parser's message list (FixListView: filters, chains, columns, exports) over its Message detail; ◫ moves the list under the source editor.
const PvFixDetail = {
  create(p) {
    const mk = (tag, cls) => Object.assign(document.createElement(tag), cls ? { className: cls } : {});
    const btn = fn => Object.assign(mk("button"), { type: "button", onclick: fn });
    const detail = mk("div", "fx-detail"), el = mk("div", "pv-fix");
    const prev = btn(() => go(-1)), next = btn(() => go(1));
    const split = btn(() => setMode(mode() === "rows" ? "" : "rows")), cols = btn(() => setMode(mode() === "cols" ? "" : "cols"));
    const v = { el, tools: [split, cols, prev, next], last: null, sel: 0 };
    const extras = () => [
      ...(list.chainSize(v.sel) > 1 ? [{ label: "⛓ " + T("Theo chuỗi lệnh"), run: () => act("chain") }] : []),
      ...(list.familySize(v.sel) > list.chainSize(v.sel) ? [{ label: "🌳 " + T("Theo lệnh cha + con"), run: () => act("family") }] : []),
    ];
    const list = FixListView.create(i => pick(i), extras);
    el.append(list.el, detail);

    function renderDetail(keepScroll) {
      const d = v.last, top = detail.scrollTop;
      Detail.render(detail, d.msgs[v.sel], { dict: d.dict, tz: d.tz, index: v.sel, order: "", hideHdr: false, dictLabel: d.dictLabel, anno: false, chainSize: list.chainSize(v.sel), familySize: list.familySize(v.sel) });
      detail.scrollTop = keepScroll ? top : 0;
      list.mark(v.sel);
    }

    // Moves the source cursor and scrolls only the editor's own scroller: focus / scrollIntoView would also scroll the phone carousel away from this pane.
    function showSource(line) {
      const src = Docs.get(v.last.srcId), g = src ? Views.groups[Views.where(src.id)] : null;
      if (!g || g.active !== src.id) return;
      const ev = g.view, ln = ev.state.doc.line(Math.min(Math.max(line, 1), ev.state.doc.lines));
      ev.dispatch({ selection: { anchor: ln.from } });
      ev.scrollDOM.scrollTop = Math.max(0, ev.lineBlockAt(ln.from).top - ev.scrollDOM.clientHeight / 3);
    }

    function pick(i) {
      if (!v.last || i === undefined || i < 0 || i >= v.last.msgs.length) return;
      v.sel = i;
      renderDetail(false);
      showSource(v.last.msgs[i].line);
    }
    const go = d => pick(list.step(d));
    // Cursor moved in the source: the message starting at or before that line, without moving the source back.
    v.at = line => {
      if (!v.last) return;
      let i = 0;
      v.last.msgs.forEach((m, k) => { if (m.line <= line) i = k; });
      if (i !== v.sel) { v.sel = i; renderDetail(false); }
    };

    async function act(name) {
      const m = v.last.msgs[v.sel];
      if (name === "chain" || name === "family") { ChainPick.follow(name, v.sel); list.refresh(); list.mark(v.sel); return; }
      const wire = fields => FixCodec.toWire(fields, name === "soh" ? FixCodec.SOH : "|");
      const text = name === "json" ? JSON.stringify(Detail.json(m, v.last.dict, v.last.tz), null, 2) : name === "fix" ? wire(FixCodec.rebuild(m.fields.filter(f => f.tag !== null))) : wire(m.fields);
      const ok = await Dom.copy(text);
      StatusBar.msg(ok ? T("✔ Đã chép.") : T("Không chép được — trình duyệt chặn clipboard."), ok ? "good" : "bad");
    }

    detail.addEventListener("click", e => {
      const b = e.target.closest("button[data-act]"), li = e.target.closest("ul.issues li[data-tag]");
      if (b) act(b.dataset.act); else if (li) Detail.flash(detail, li.dataset.tag);
    });
    TagInfo.bind(detail, tr => { const m = v.last?.msgs[v.sel], f = m?.fields[+tr.dataset.i]; return f && f.tag !== null ? TagInfo.tooltip(v.last.dict, m, f, v.last.tz) : ""; });

    // 3 panes like FIX Parser: the list goes under ("rows") or beside ("cols") the source editor while the source and this pane are both showing in different views.
    const mode = () => { const m = Prefs.get("fix3", false); return m === "cols" ? "cols" : m ? "rows" : ""; };
    function hostIndex() {
      const out = Docs.get(p.doc), src = v.last && Docs.get(v.last.srcId);
      if (!mode() || !out || !src) return -1;
      const go = Views.where(out.id), gs = Views.where(src.id), G = Views.groups;
      return go >= 0 && gs >= 0 && go !== gs && G[go].active === out.id && G[gs].active === src.id ? gs : -1;
    }
    function place() {
      const gi = hostIndex(), g = gi >= 0 ? Views.groups[gi].el : null, from = list.el.parentNode;
      if (g && from !== g) g.append(list.el); else if (!g && from !== el) el.prepend(list.el);
      if (from && from !== el && from !== list.el.parentNode && !from.querySelector(":scope > .fx-list")) from.classList.remove("fx3", "fx3c");
      g?.classList.add("fx3"); g?.classList.toggle("fx3c", mode() === "cols");
      el.classList.toggle("solo", !!g);
    }
    // 3 columns in 2 side-by-side views: the source view takes 2/3 so editor · list · detail get a third each; leaving restores the old split.
    let keptSplit = null;
    function setMode(m) {
      const was = mode();
      Prefs.set("fix3", m === "cols" ? "cols" : m === "rows");
      const gi = hostIndex();
      if (Views.layout === "2c" && gi >= 0 && m === "cols" && was !== "cols") { keptSplit = Split.ratio(); Split.set(gi === 0 ? 2 / 3 : 1 / 3); }
      else if (Views.layout === "2c" && was === "cols" && m !== "cols") { Split.set(keptSplit ?? 0.5); keptSplit = null; }
      place(); v.labels();
    }
    Views.onChange(place);

    const title = () => { p.type.textContent = T("FIX · {n} message · {dict} — bấm 1 dòng để xem chi tiết", { n: I18n.num(v.last.msgs.length), dict: v.last.dictLabel }); };
    v.labels = () => {
      prev.textContent = "◀"; prev.title = T("Message trước");
      next.textContent = "▶"; next.title = T("Message kế");
      const m = mode(), mark = (b, on, text) => { b.textContent = text; b.classList.toggle("on", on); b.setAttribute("aria-pressed", on); };
      mark(split, m === "rows", m === "rows" ? T("◫ 3 vùng: bật") : T("◫ 3 vùng"));
      mark(cols, m === "cols", m === "cols" ? T("▥ 3 cột: bật") : T("▥ 3 cột"));
      split.title = T("Chia 3 vùng như FIX Parser: dữ liệu + danh sách message ở view nguồn, chi tiết ở view này (bấm lại để tắt)");
      cols.title = T("3 cột cạnh nhau: dữ liệu · danh sách message · chi tiết (màn hình rộng hơn 900px; hẹp hơn thì xếp như 3 vùng; bấm lại để tắt)");
      list.labels();
      if (v.last) { title(); renderDetail(true); }
    };
    // A live re-run of the same source keeps the message picked by the cursor and the detail's scroll.
    v.show = d => {
      if (d.empty) { v.last = null; list.el.hidden = true; detail.replaceChildren(); place(); return false; }
      const same = v.last && v.last.srcId === d.srcId && d.sel === v.sel;
      v.last = d; v.sel = Math.min(d.sel, d.msgs.length - 1);
      list.el.hidden = false;
      list.show(d, v.sel);
      renderDetail(same);
      title();
      place();
      return true;
    };
    return v;
  },
};

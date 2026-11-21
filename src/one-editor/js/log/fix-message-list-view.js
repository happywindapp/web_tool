// FIX message list of the detail pane = FIX Parser's panel 2: search / MsgType / session / broadcast / errors filters, order chains, column filters + drag, CSV / JSON.
const FixListView = (() => {
  const KEEP = "fix-list", store = { get: (k, d) => Prefs.get("fix-" + k, d), set: (k, v) => Prefs.set("fix-" + k, v) };

  // onPick(i): a row was clicked or reached with ↑ / ↓; extras(): right-click menu items (follow chain…).
  function create(onPick, extras) {
    const mk = (tag, cls) => Object.assign(document.createElement(tag), cls ? { className: cls } : {});
    const btn = fn => Object.assign(mk("button"), { type: "button", onclick: fn });
    const chk = () => { const l = mk("label", "chk"), i = Object.assign(mk("input"), { type: "checkbox", onchange: () => { save(); refresh(); } }), t = mk("span"); l.append(i, t); return { l, i, t }; };
    const el = mk("div", "fx-list"), bar = mk("div", "fx-filters"), box = mk("div", "fx-grid"), table = mk("table", "grid");
    const q = Object.assign(mk("input", "fx-q"), { type: "text", oninput: Dom.debounce(() => refresh(), 200) });
    const type = Object.assign(mk("select"), { onchange: () => refresh() }), chains = mk("select"), chip = mk("span", "chip"), cols = mk("span", "chips"), count = mk("span", "muted");
    const admin = chk(), bc = chk(), bad = chk();
    const reset = btn(() => ColView.resetLayout()), csv = btn(() => download("csv")), json = btn(() => download("json"));
    const kept = Prefs.get(KEEP, {});
    admin.i.checked = kept.hideAdmin !== false; bc.i.checked = kept.hideBc === true;
    chip.hidden = cols.hidden = true;
    bar.append(q, type, admin.l, bc.l, bad.l, chains, chip, cols, reset, count, csv, json);
    box.tabIndex = 0;
    box.append(table);
    el.append(bar, box);
    el.dataset.i18nSkip = "";
    let d = null, vis = [], sel = 0;

    const save = () => Prefs.set(KEEP, { hideAdmin: admin.i.checked, hideBc: bc.i.checked });
    const ctx = () => ({ dict: d?.dict, tz: d?.tz || "utc", cols: [], layout: ColView.layout(), inbound: m => !!d?.us && m.get("49") !== d.us });
    const bindChains = () => ChainPick.bind({ msgs: d.msgs, chain: d.chain, dict: d.dict });

    function fillTypes() {
      const cur = type.value, counts = new Map();
      d.msgs.forEach(m => counts.set(m.type, (counts.get(m.type) || 0) + 1));
      type.innerHTML = `<option value="">${Dom.esc(T("Mọi loại message"))}</option>` + [...counts].map(([t, n]) =>
        `<option value="${Dom.esc(t)}">${Dom.esc(`${t} · ${FixDict.msgName(d.dict, t) || "?"} (${n})`)}</option>`).join("");
      type.value = counts.has(cur) ? cur : "";
    }

    function refresh() {
      if (!d) return;
      bindChains();
      vis = Timeline.visible(d.msgs, { q: q.value, type: type.value, hideAdmin: admin.i.checked, hideBc: bc.i.checked, onlyBad: bad.i.checked, onlyNotes: false, only: ChainPick.members() }, ctx());
      Timeline.render(table, d.msgs, vis, sel, ctx());
      count.textContent = T("{shown}/{total} message", { shown: I18n.num(vis.length), total: I18n.num(d.msgs.length) });
      const text = ChainPick.chip();
      chip.hidden = !text;
      if (text) chip.innerHTML = `${Dom.esc(text)}<button title="${Dom.esc(T("Bỏ lọc chuỗi"))}">✕</button>`;
    }

    // Scrolls only the list box: scrollIntoView would also scroll the phone carousel.
    function mark(i) {
      sel = i;
      table.querySelector("tr.sel")?.classList.remove("sel");
      const row = table.querySelector(`tr[data-i="${i}"]`);
      if (!row) return;
      row.classList.add("sel");
      const head = table.tHead?.offsetHeight || 0;
      if (row.offsetTop < box.scrollTop + head || row.offsetTop + row.offsetHeight > box.scrollTop + box.clientHeight) box.scrollTop = row.offsetTop - head - box.clientHeight / 3;
    }

    function download(kind) {
      if (!d) return;
      if (kind === "csv") Dom.download(Timeline.csv(d.msgs, vis, ctx()), "fix-messages.csv", "text/csv;charset=utf-8");
      else Dom.download(JSON.stringify(vis.map(i => Detail.json(d.msgs[i], d.dict, d.tz)), null, 2), "fix-messages.json", "application/json");
    }

    table.addEventListener("click", e => { const tr = e.target.closest("tr[data-i]"); if (tr) onPick(+tr.dataset.i); });
    box.addEventListener("keydown", e => {
      if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
      e.preventDefault();
      const k = vis.indexOf(sel) + (e.key === "ArrowDown" ? 1 : -1);
      if (k >= 0 && k < vis.length) onPick(vis[k]);
    });
    chip.addEventListener("click", e => { if (e.target.closest("button")) { ChainPick.clear(); refresh(); } });
    chains.onchange = () => { const v = chains.value; chains.value = ""; if (v) { ChainPick.choose(v); refresh(); } };
    ColView.init({ columns: () => Timeline.columns(ctx()), onChange: refresh, select: i => onPick(i), extras, store, chipBox: cols });
    ColView.bindTable(table);

    function labels() {
      q.placeholder = T("Tìm: chữ bất kỳ hoặc tag=giá trị (35=8 55=ABC)");
      admin.t.textContent = T("Ẩn session"); admin.l.title = T("Heartbeat, TestRequest, ResendRequest, SequenceReset, Logout, Logon");
      bc.t.textContent = T("Ẩn broadcast h/f"); bc.l.title = T("TradingSessionStatus (h) và SecurityStatus (f) — Server Sàn gửi hàng nghìn bản mỗi ngày");
      bad.t.textContent = T("Chỉ message lỗi");
      chains.title = T("Chọn 1 chuỗi lệnh (đặt → xác nhận → sửa/huỷ → khớp) hoặc 1 lệnh cha 🌳 (kèm mọi lệnh con nối qua 583 / tag link của từ điển riêng) để chỉ xem các message đó");
      reset.textContent = T("↺ Cột"); reset.title = T("Đưa thứ tự cột về mặc định (kéo-thả tiêu đề cột để đổi thứ tự, bấm tiêu đề để lọc, chuột phải vào ô để chỉ hiện / loại trừ giá trị)");
      csv.textContent = T("⬇ CSV"); csv.title = T("Tải bảng đang lọc thành CSV (mở bằng Excel)");
      json.textContent = T("⬇ JSON"); json.title = T("Tải các message đang lọc thành JSON (tag, tên, giá trị, ý nghĩa)");
      if (d) { fillTypes(); bindChains(); ChainPick.fill(chains); refresh(); mark(sel); }
    }

    // A new analysis of the source: types and chains rebuilt, filters kept.
    function show(model, i) {
      d = model; sel = i;
      fillTypes(); bindChains(); ChainPick.fill(chains);
      refresh(); mark(i);
    }

    labels();
    // ◀ ▶ walk the rows the filters show; a message outside them (picked by the cursor) steps from the nearest one.
    const step = dir => { const k = vis.indexOf(sel); return k < 0 ? (dir > 0 ? vis.find(i => i > sel) : [...vis].reverse().find(i => i < sel)) : vis[k + dir]; };

    return { el, show, mark, labels, refresh, step, chainSize: i => d ? (bindChains(), ChainPick.chainSize(i)) : 0, familySize: i => d ? (bindChains(), ChainPick.familySize(i)) : 0 };
  }

  return { create };
})();

// Log merge pane: filter bar; sources (tick, time format, offset, 📂 add files); histogram (ERROR / WARN stacked, click ⇒ that range); merged rows paged by 1,000 — click ⇒ the source line.
const PvLogMerge = {
  create(p) {
    const { mk, button } = PowerUi, PAGE = 1000;
    const q = mk("input", "dq-input lm-q", null, { type: "text", spellcheck: false, autocomplete: "off" });
    const box = () => { const l = mk("label", "chk"), c = mk("input", "", null, { type: "checkbox" }), t = mk("span"); l.append(c, t); return { l, c, t }; };
    const rx = box(), cs = box(), link = box(), unit = mk("select", "lm-unit");
    const go = button("", () => send()), stop = button("", () => LogMergeOp.stop()), open = button("", () => v.last && LogMergeOp.openTab(v.last.srcId)), share = button("", () => v.last && LogMergeOp.share(v.last.srcId));
    const file = mk("input", "", null, { type: "file", multiple: true, hidden: true });
    const v = { el: mk("div", "pv-logmerge"), tools: [q, rx.l, cs.l, link.l, unit, go, stop, open, share], last: null, start: 0 };
    const srcBox = mk("div", "lm-src"), hist = mk("div", "lm-hist"), range = mk("div", "lm-range"), nav = mk("div", "lm-nav"), list = mk("div", "lm-list");
    const prev = button("◀", () => page(Math.max(0, v.start - PAGE), true)), next = button("▶", () => page(v.start + PAGE, true)), pos = mk("span", "lm-pos");
    nav.append(prev, pos, next);
    v.el.append(srcBox, hist, range, nav, list, file);
    const off = LogMergeOp.onBusy(b => { go.disabled = b; stop.disabled = !b; });
    stop.disabled = true;
    v.dispose = off;
    const FMTS = [["", "Tự nhận"], ["@iso", "ISO 8601 / yyyy-MM-dd HH:mm:ss.SSS"], ["@dmy", "dd/MM/yyyy HH:mm:ss"], ["@time", "HH:mm:ss.SSS"], ["@epoch", "epoch ms"], ["@fix", "FIX 52="], ["custom", "Định dạng tay…"]];
    const hhmmss = ms => isFinite(ms) ? new Date(ms).toISOString().slice(11, 23) : "";
    const full = ms => new Date(ms).toISOString().slice(0, 19).replace("T", " ");

    // Settings of the source rows + filter bar → the op (re-run).
    function send(extra = []) {
      const d = v.last;
      if (!d) return;
      const sources = [...srcBox.querySelectorAll(".lm-srow")].filter(r => r.querySelector("input[type=checkbox]").checked).map(r => {
        const sel = r.querySelector("select").value;
        return { n: r.dataset.name, fmt: sel === "custom" ? r.querySelector(".lm-fmt").value.trim() : sel, off: r.querySelector(".lm-off").value.trim() };
      }).concat(extra.map(n => ({ n, fmt: "", off: "" })));
      v.start = 0;
      LogMergeOp.set(d.srcId, { sources, q: q.value, regex: rx.c.checked, cs: cs.c.checked, link: link.c.checked, unit: unit.value });
    }
    const later = Dom.debounce(() => send(), 500);
    q.addEventListener("keydown", e => { if (e.key === "Enter") { e.preventDefault(); send(); } });
    [rx.c, cs.c, link.c, unit].forEach(x => { x.onchange = () => send(); });
    file.onchange = async () => {
      const files = [...file.files];
      file.value = "";
      if (!files.length) return;
      await FileOpen.openMany(files.map(f => ({ file: f, handle: null })));
      send(files.map(f => f.name));
    };

    function sources(d) {
      const on = new Map(d.sources.map((s, k) => [s.id, { ...s, k }])), rows = [];
      // Ticked sources first in their A, B, C… order, then the other open tabs.
      for (const t of [...d.sources, ...d.all.filter(x => !on.has(x.id))]) {
        const s = on.get(t.id), r = mk("div", "lm-srow"), c = mk("input", "", null, { type: "checkbox" });
        r.dataset.name = t.name;
        c.checked = !!s; c.disabled = t.id === d.srcId; c.onchange = () => send();
        const sel = mk("select"), fmt = mk("input", "lm-fmt", null, { type: "text", spellcheck: false, placeholder: "yyyy-MM-dd HH:mm:ss.SSS" }), o = mk("input", "lm-off", null, { type: "text", spellcheck: false, placeholder: "+0s" });
        FMTS.forEach(([val, label]) => sel.append(new Option(T(label), val)));
        const f = s ? s.fmt : "";
        sel.value = f && f[0] !== "@" ? "custom" : f; fmt.value = f && f[0] !== "@" ? f : ""; fmt.hidden = sel.value !== "custom"; o.value = s ? s.off : "";
        sel.onchange = () => { fmt.hidden = sel.value !== "custom"; if (sel.value !== "custom" || fmt.value) send(); };
        fmt.oninput = o.oninput = later;
        sel.title = T("Định dạng giờ của nguồn này"); o.title = T("Lệch giờ cộng vào nguồn này: +7h, -150ms, 2s");
        const stat = s?.stat ? T("{fmt} · {hits} / {n} dòng có giờ", { fmt: s.stat.fmt || "—", hits: I18n.num(s.stat.hits), n: I18n.num(s.stat.lines) }) : "";
        const label = mk("label", "lm-name"), tag = mk("span", "lm-tag lm-s" + (s ? s.k : "x"), s ? String.fromCharCode(65 + s.k) : "·");
        label.append(c, tag, mk("span", "", t.name));
        r.append(label, sel, fmt, o, mk("span", "lm-stat" + (s?.stat && !s.stat.hits ? " rx-bad" : ""), stat));
        rows.push(r);
      }
      const add = button(T("📂 Thêm file log…"), () => file.click(), T("Mở thêm file log làm nguồn (mỗi file 1 tab)"));
      srcBox.replaceChildren(...rows, add);
    }

    function histogram(d) {
      const h = d.v.hist, max = h.n.reduce((a, x) => Math.max(a, x), 1);
      hist.replaceChildren(...h.n.map((n, b) => {
        const bar = mk("button", "lm-bar" + (n ? "" : " lm-empty"), null, { type: "button" }), body = mk("span", "lm-fill");
        body.style.height = (n / max * 100) + "%";
        if (n) { const e = mk("span", "lm-e"), w = mk("span", "lm-w"); e.style.height = (h.err[b] / n * 100) + "%"; w.style.height = (h.warn[b] / n * 100) + "%"; body.append(w, e); }
        bar.append(body);
        bar.title = T("{t} · {n} nhóm dòng · {e} ERROR · {w} WARN", { t: full(h.t0 + b * h.size), n: I18n.num(n), e: I18n.num(h.err[b]), w: I18n.num(h.warn[b]) });
        bar.disabled = !n;
        bar.onclick = () => { if (h.row[b] >= 0) page(h.row[b], true); };
        return bar;
      }));
      const unitText = h.size >= 3600000 ? T("{n} giờ", { n: h.size / 3600000 }) : h.size >= 60000 ? T("{n} phút", { n: h.size / 60000 }) : T("{n} giây", { n: h.size / 1000 });
      range.textContent = h.n.length ? T("{from} → {to} · mỗi cột {unit} (UTC, sau lệch giờ)", { from: full(h.t0), to: full(h.t0 + h.n.length * h.size), unit: unitText }) : T("Không có dòng nào có giờ.");
    }

    const posText = () => { const total = v.last?.v.rows || 0; pos.textContent = total ? T("dòng {a}–{b} / {n}", { a: I18n.num(v.start + 1), b: I18n.num(Math.min(total, v.start + PAGE)), n: I18n.num(total) }) : ""; };

    async function page(start, exact) {
      const d = v.last;
      if (!d) return;
      const total = d.v.rows;
      v.start = Math.max(0, Math.min(exact ? start : Math.floor(start / PAGE) * PAGE, Math.max(0, total - 1)));
      prev.disabled = v.start <= 0; next.disabled = v.start + PAGE >= total;
      posText();
      let rows;
      try { rows = await LogMergeOp.rows(d.srcId, v.start, PAGE); } catch (e) { if (d !== v.last) return; list.replaceChildren(mk("div", "rp-none rx-bad", e.message)); return; }
      if (d !== v.last) return;
      list.replaceChildren();
      if (!rows.length) { list.append(mk("div", "rp-none", T("Không có dòng nào khớp."))); return; }
      PowerUi.appendSliced(list, rows, r => {
        const row = mk("div", "lm-row" + (r.lvl === 2 ? " lg-err" : r.lvl === 1 ? " lg-warn" : "") + (r.head ? "" : " lm-cont"));
        row.append(mk("span", "lm-tag lm-s" + r.s, String.fromCharCode(65 + r.s)), mk("span", "lm-time", r.head ? hhmmss(r.ts) : ""), mk("span", "lm-t", r.text));
        row.onclick = () => { const src = Docs.get(d.sources[r.s]?.id); if (src) { Views.revealLine(src, r.line); PhoneLayout.show(Views.where(src.id) + 1); } };
        return row;
      }, list);
    }

    v.labels = () => {
      q.placeholder = T("id liên kết (ClOrdID, orderId, requestId…) hoặc regex"); q.title = T("Lọc xuyên các nguồn — Enter để lọc");
      rx.t.textContent = "Regex"; cs.t.textContent = "Aa"; cs.l.title = T("Phân biệt hoa / thường");
      link.t.textContent = T("Liên kết"); link.l.title = T("Kéo theo dòng chứa id liên quan (11 / 41 / orderId / requestId) tìm thấy trong dòng khớp");
      unit.replaceChildren(new Option(T("Tự chọn cột"), "auto"), new Option(T("Theo giây"), "s"), new Option(T("Theo phút"), "m"));
      unit.title = T("Độ rộng mỗi cột histogram");
      go.textContent = T("▶ Gộp"); go.title = T("Gộp lại theo thời gian");
      stop.textContent = T("■ Dừng"); stop.title = T("Dừng gộp (huỷ Worker)");
      open.textContent = T("⧉ Mở thành tab"); open.title = T("Mở toàn bộ log đã gộp (theo bộ lọc) thành 1 tab");
      share.textContent = T("🔗 Link"); share.title = T("Chép link chia sẻ: các log nguồn + định dạng, lệch giờ, bộ lọc");
      if (v.last) render();
    };

    function render() {
      const d = v.last;
      p.type.textContent = T("Gộp log · {n} nguồn · {rows} dòng", { n: d.sources.length, rows: I18n.num(d.v.rows) });
      if (document.activeElement !== q) q.value = d.o.q;
      rx.c.checked = d.o.regex; cs.c.checked = d.o.cs; link.c.checked = d.o.link; unit.value = d.o.unit;
      sources(d);
      histogram(d);
      posText();
    }

    v.show = d => { const same = v.last && v.last.srcId === d.srcId; v.last = d; render(); page(same ? Math.min(v.start, d.v.rows) : 0); return true; };
    return v;
  },
};

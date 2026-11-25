// "patch-view" op: a unified / git diff → file list + hunks side by side; Apply to an open tab (name match or picked) in one transaction, failed hunks reported in yellow; compare export: View 1 → View 2 as a .patch tab.
const PatchOp = (() => {
  const OP = "patch-view";
  const total = files => files.reduce((s, f) => [s[0] + f.add, s[1] + f.del], [0, 0]);
  const kindOf = f => f.binary ? "binary" : f.meta ? "meta" : !f.a ? "new" : !f.b ? "del" : "";
  const KIND = { binary: "nhị phân", meta: "đổi tên / chế độ", new: "file mới", del: "xoá file" };

  function run(t, c) {
    const files = UnifiedPatch.parse(t).files;
    if (!files.length) throw Object.assign(new Error(T("Không thấy patch unified (--- a/… · +++ b/… · @@ … @@).")), { warn: true });
    const [a, d] = total(files), short = files.flatMap(f => f.hunks.filter(h => h.short).map(h => T("{file}: hunk dòng {line} thiếu dòng — không áp được.", { file: f.name, line: h.line })));
    const lines = files.map(f => "- `" + f.name + "`" + (kindOf(f) ? " (" + T(KIND[kindOf(f)]) + ")" : "") + " +" + f.add + " −" + f.del + " · " + T("{n} hunk", { n: f.hunks.length }));
    return { text: "# " + T("Patch: {n} file · +{a} −{d}", { n: files.length, a, d }) + "\n\n" + lines.join("\n") + "\n", notes: short, view: { kind: "patch", srcId: c.id, files } };
  }

  // Tabs a patch can go into: editable text tabs other than the patch itself.
  const targets = srcId => Docs.list().filter(d => d.id !== srcId && d.kind !== "output" && d.kind !== "clone" && !Docs.isList(d) && !PreviewPane.isPane(d) && !d.hex && !d.big);
  const match = (f, list) => { const n = [f.b, f.a].filter(Boolean).map(x => UnifiedPatch.base(x).toLowerCase()); return list.find(d => n.includes(d.name.toLowerCase())) || null; };

  // → { ok, n, fail: [hunk numbers], fuzz, tone } after editing the tab, or null when nothing ran.
  function apply(file, doc) {
    if (!doc || !Docs.get(doc.id)) { StatusBar.msg(T("Chọn tab để áp patch “{file}”.", { file: file.name }), "warn"); return null; }
    const text = Docs.text(doc), r = UnifiedPatch.apply(text, file), n = file.hunks.length;
    const fail = r.results.filter(x => !x.ok).map(x => x.i + 1), fuzz = r.results.filter(x => x.ok && x.off).length;
    if (r.ok) {
      const view = PowerUi.viewOf(doc);
      if (!view) return null;
      if (view.state.readOnly) { StatusBar.msg(T("Tab chỉ đọc — không đổi được."), "warn"); return null; }
      view.dispatch({ changes: UnifiedPatch.change(view.state.doc.toString(), r.text), userEvent: "input.patch", scrollIntoView: true });
    }
    const msg = fail.length ? T("Áp {ok}/{n} hunk vào “{name}” — hunk {list} không khớp (đã dò lệch ±3 dòng).", { ok: r.ok, n, name: doc.name, list: fail.join(", ") })
      : T("✔ Áp {n}/{n} hunk vào “{name}” — Ctrl+Z để hoàn tác.", { n, name: doc.name }) + (fuzz ? " " + T("{f} hunk lệch dòng, đã dò được.", { f: fuzz }) : "");
    const tone = fail.length ? "warn" : "good";
    StatusBar.msg(msg, tone);
    return { msg, tone };
  }

  function openNew(file) {
    const doc = Docs.create({ kind: "temp", name: UnifiedPatch.base(file.b), lang: "", text: UnifiedPatch.newText(file) });
    Views.open(doc, Views.focused, true);
    StatusBar.msg(T("✔ Đã mở “{name}” thành tab mới.", { name: doc.name }), "good");
  }

  async function share(srcId, tabs) {
    const src = Docs.get(srcId);
    if (!src) { StatusBar.msg(T("Tab nguồn của kết quả này đã đóng."), "warn"); return; }
    const t = d => ({ n: d.name, l: d.lang || "", t: Docs.text(d) });
    await PowerUi.shareLink({ v: 1, views: [[t(src)], tabs.filter(d => Docs.get(d.id)).map(t)], run: OP },
      n => T("🔗 Đã chép link patch ({n} ký tự) — mở link là xem lại, kèm các tab đích.", { n }));
  }

  // View 1 (old) → View 2 (new) as a unified diff in a new .patch tab.
  function exportPair() {
    const a = Views.activeDoc(0), b = Views.count > 1 ? Views.activeDoc(1) : null;
    if (!a || !b || !a.state || !b.state) { StatusBar.msg(T("Cần 2 tab đang mở ở View 1 (cũ) và View 2 (mới) để xuất .patch."), "warn"); return; }
    const text = UnifiedPatch.create(Docs.text(a), Docs.text(b), a.name, b.name);
    if (!text) { StatusBar.msg(T("2 tab giống hệt nhau — không có gì để xuất."), "warn"); return; }
    const f = UnifiedPatch.parse(text).files[0], doc = Docs.create({ kind: "temp", name: b.name.replace(/\.[^.]*$/, "") + ".patch", lang: "diff", text });
    Views.open(doc, Views.focused, true);
    StatusBar.msg(T("✔ Đã xuất .patch: {h} hunk · +{a} −{d} — ▶ Chạy “Xem patch” để áp vào tab khác.", { h: f.hunks.length, a: f.add, d: f.del }), "good");
  }

  return { run, targets, match, apply, openNew, share, exportPair, kindOf, KIND };
})();

const PvPatch = {
  create(p) {
    const { mk, button } = PowerUi, MAX_ROWS = 3000;
    const link = button("", () => v.last && PatchOp.share(v.last.srcId, v.picked()));
    const v = { el: mk("div", "pv-patch"), tools: [link], last: null, pick: new Map(), res: new Map() };
    v.picked = () => [...new Set(v.last.files.map((f, i) => Docs.get(v.pick.get(i)) || PatchOp.match(f, PatchOp.targets(v.last.srcId))).filter(Boolean))];

    function rows(h) {
      const out = [], L = h.lines;
      let o = h.oldLines ? h.oldStart : h.oldStart + 1, n = h.newLines ? h.newStart : h.newStart + 1, i = 0;
      while (i < L.length) {
        if (L[i].t === " ") { out.push([o++, L[i].s, n++, L[i].s, ""]); i++; continue; }
        const del = [], add = [];
        while (i < L.length && L[i].t === "-") del.push(L[i++]);
        while (i < L.length && L[i].t === "+") add.push(L[i++]);
        for (let k = 0; k < Math.max(del.length, add.length); k++) out.push([del[k] ? o++ : "", del[k]?.s, add[k] ? n++ : "", add[k]?.s, "ch"]);
      }
      return out;
    }

    function hunk(h, open) {
      const box = mk("details", "pt-hunk" + (h.short ? " pt-short" : ""));
      box.open = open;
      box.append(mk("summary", "", "@@ -" + h.oldStart + "," + h.oldLines + " +" + h.newStart + "," + h.newLines + " @@ " + h.head + (h.short ? "  ⚠ " + T("thiếu dòng") : "")));
      const tb = mk("table", "pt-grid"), all = rows(h);
      for (const [lo, so, ln, sn, ch] of all.slice(0, MAX_ROWS)) {
        const tr = mk("tr");
        tr.append(mk("td", "pt-ln", String(lo)), mk("td", so === undefined ? "pt-gap" : ch ? "pt-del" : "", so ?? ""), mk("td", "pt-ln", String(ln)), mk("td", sn === undefined ? "pt-gap" : ch ? "pt-add" : "", sn ?? ""));
        tb.append(tr);
      }
      box.append(tb);
      if (all.length > MAX_ROWS) box.append(mk("div", "rp-none", T("Chỉ hiện {n} dòng đầu của hunk.", { n: I18n.num(MAX_ROWS) })));
      return box;
    }

    function file(f, i) {
      const d = v.last, kind = PatchOp.kindOf(f), card = mk("section", "pt-file"), head = mk("div", "pt-head");
      head.append(mk("span", "pt-name", f.name), ...(kind ? [mk("span", "pt-kind", T(PatchOp.KIND[kind]))] : []), mk("span", "pt-add-n", "+" + f.add), mk("span", "pt-del-n", "−" + f.del));
      const act = mk("div", "pt-act");
      if (kind === "new") act.append(button(T("＋ Mở thành tab mới"), () => PatchOp.openNew(f), T("Tạo tab tạm với nội dung file mới")));
      else if (kind) act.append(mk("span", "rp-none", kind === "del" ? T("Patch xoá file — không áp vào tab.") : T("Không có hunk để áp.")));
      else {
        const list = PatchOp.targets(d.srcId), sel = mk("select", "pt-target", null, { title: T("Tab sẽ nhận patch (tự chọn theo tên file)") });
        const auto = Docs.get(v.pick.get(i)) || PatchOp.match(f, list);
        sel.append(new Option(T("— chọn tab —"), ""), ...list.map(x => new Option(x.name, x.id)));
        sel.value = auto ? auto.id : "";
        sel.onchange = () => v.pick.set(i, sel.value);
        const go = button(T("Áp vào tab"), () => { const r = PatchOp.apply(f, Docs.get(sel.value)); if (r) { v.res.set(i, r); paintRes(); } }, T("Áp mọi hunk vào tab đã chọn — 1 lần Ctrl+Z hoàn tác"));
        go.classList.add("main");
        act.append(sel, go);
      }
      const res = mk("div", "pt-res");
      const paintRes = () => { const r = v.res.get(i); res.hidden = !r; if (r) { res.className = "pt-res " + r.tone; res.textContent = r.msg; } };
      paintRes();
      card.append(head, act, res);
      f.hunks.forEach((h, k) => card.append(hunk(h, k < 20)));
      return card;
    }

    function render() {
      const d = v.last, [a, del] = d.files.reduce((s, f) => [s[0] + f.add, s[1] + f.del], [0, 0]);
      p.type.textContent = T("Patch · {n} file · +{a} −{d}", { n: d.files.length, a, d: del });
      v.el.replaceChildren();
      PowerUi.appendSliced(v.el, d.files, file, v, 20);
    }

    v.labels = () => { link.textContent = T("🔗 Link"); link.title = T("Chép link chia sẻ: patch + các tab đích đang mở"); if (v.last) render(); };
    v.show = d => { if (v.last?.srcId !== d.srcId) { v.pick.clear(); v.res.clear(); } v.last = d; render(); return true; };
    return v;
  },
};

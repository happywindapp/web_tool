// Recipe pane: steps (drag ⠿ or ↑ ↓ to reorder, on / off, args, ✔ / ✖ per step), "+ add step", saved recipes, 🔗 link, then the output. Text nodes only.
const PvRecipe = {
  create(p) {
    const { mk, button } = PowerUi, SHOW = 200000;
    const add = mk("select", "rc-add"), savedSel = mk("select", "rc-saved"), saveBtn = button("💾", () => save()), dropBtn = button("🗑", () => drop()), shareBtn = button("🔗", () => RecipeOp.share(v.last?.srcId).catch(e => StatusBar.msg(e.message, "bad")));
    const list = mk("div", "rc-steps"), head = mk("div", "rc-out-head"), out = mk("pre", "rc-out");
    const v = { el: mk("div", "pv-recipe"), tools: [add, savedSel, saveBtn, dropBtn, shareBtn], last: null, key: "" };
    v.el.append(list, head, out);
    let drag = -1;
    // Steps come from the op state (updated at once), not from the last finished run.
    const steps = () => RecipeOp.steps(v.last.srcId).map(s => ({ ...s, args: { ...s.args } }));
    const commit = (list, later = false) => RecipeOp.set(v.last.srcId, list, later);

    function fillAdd() {
      const groups = {};
      for (const [id, o] of Object.entries(RecipeOps.OPS)) (groups[o.group] ??= mk("optgroup", "", null, { label: T(o.group) })).append(mk("option", "", T(o.label), { value: id }));
      add.replaceChildren(mk("option", "", T("+ Thêm bước…"), { value: "" }), ...Object.values(groups));
    }
    add.onchange = () => { const id = add.value; add.value = ""; if (id && v.last) commit([...steps(), RecipeRun.step(id)]); };

    async function fillSaved() {
      const all = await RecipeOp.load();
      savedSel.replaceChildren(mk("option", "", T("Recipe đã lưu…"), { value: "" }), ...all.map(r => mk("option", "", r.name + " (" + r.steps.length + ")", { value: r.name })));
    }
    savedSel.onchange = async () => { const r = (await RecipeOp.load()).find(x => x.name === savedSel.value); if (r && v.last) commit(r.steps.map(s => ({ ...s, args: { ...s.args } }))); };
    async function save() {
      if (!v.last?.steps.length) { StatusBar.msg(T("Recipe chưa có bước nào để lưu."), "warn"); return; }
      const name = (prompt(T("Tên recipe:"), savedSel.value) || "").trim().slice(0, 80);
      if (!name) return;
      try { await RecipeOp.save(name, steps()); await fillSaved(); savedSel.value = name; StatusBar.msg(T("✔ Đã lưu recipe “{name}”.", { name }), "good"); }
      catch (e) { StatusBar.msg(T("Không lưu được recipe: {msg}", { msg: e.message }), "bad"); }
    }
    async function drop() {
      const name = savedSel.value;
      if (!name || !confirm(T("Xoá recipe “{name}”?", { name }))) return;
      try { await RecipeOp.drop(name); await fillSaved(); } catch (e) { StatusBar.msg(T("Không lưu được recipe: {msg}", { msg: e.message }), "bad"); }
    }

    function argInput(s, i, a) {
      if (a.type === "check") { const l = mk("label", "chk"), c = mk("input", "", null, { type: "checkbox", checked: !!s.args[a.k] }); c.onchange = () => { const n = steps(); n[i].args[a.k] = c.checked; commit(n); }; l.append(c, T(a.label)); return l; }
      if (a.type === "select") { const x = mk("select", "", null, { title: T(a.label) }); a.options.forEach(o => x.append(mk("option", "", o, { value: o }))); x.value = s.args[a.k]; x.onchange = () => { const n = steps(); n[i].args[a.k] = x.value; commit(n); }; return x; }
      const x = mk("input", "rc-arg", null, { type: "text", value: s.args[a.k] ?? "", placeholder: T(a.label), title: T(a.label), spellcheck: false, autocomplete: "off" });
      x.oninput = () => { const n = steps(); if (!n[i]) return; n[i].args[a.k] = x.value; commit(n, true); };
      return x;
    }

    function rows() {
      const d = v.last;
      list.replaceChildren(...d.steps.map((s, i) => {
        const o = RecipeOps.OPS[s.op], row = mk("div", "rc-step" + (s.on ? "" : " off"));
        const grip = mk("span", "rc-grip", "⠿", { title: T("Kéo để đổi thứ tự"), draggable: "true" });
        grip.ondragstart = e => { drag = i; e.dataTransfer.effectAllowed = "move"; e.dataTransfer.setData("text/plain", ""); };
        grip.ondragend = () => { drag = -1; };
        row.ondragover = e => { if (drag >= 0) e.preventDefault(); };
        row.ondrop = e => { e.preventDefault(); const n = steps(), from = drag; drag = -1; if (from < 0 || from === i || from >= n.length) return; const [x] = n.splice(from, 1); n.splice(i, 0, x); commit(n); };
        const on = mk("input", "", null, { type: "checkbox", checked: s.on, title: T("Bật / tắt bước này") });
        on.onchange = () => { const n = steps(); n[i].on = on.checked; commit(n); };
        const move = k => () => { const n = steps(), j = i + k; if (j < 0 || j >= n.length) return; [n[i], n[j]] = [n[j], n[i]]; commit(n); };
        const top = mk("div", "rc-top");
        top.append(grip, on, mk("b", "", (i + 1) + ". " + T(o.label)), mk("span", "rc-state"),
          button("↑", move(-1), T("Lên")), button("↓", move(1), T("Xuống")), button("✖", () => { const n = steps(); n.splice(i, 1); commit(n); }, T("Xoá bước")));
        row.append(top);
        if (o.args) { const args = mk("div", "rc-args"); o.args.forEach(a => args.append(argInput(s, i, a))); row.append(args); }
        return row;
      }));
      if (!d.steps.length) list.append(mk("div", "rp-none", T("Chưa có bước nào — chọn “+ Thêm bước…” ở thanh trên (vd Từ Base64 → Gunzip → JSON format).")));
    }

    function states() {
      const d = v.last;
      [...list.querySelectorAll(".rc-step")].forEach((row, i) => {
        const st = d.states[i] || {}, el = row.querySelector(".rc-state");
        row.classList.toggle("bad", st.state === "error");
        el.textContent = st.state === "ok" ? "✔ " + (st.kind === "bytes" ? T("{n} byte", { n: I18n.num(st.size) }) : T("{n} ký tự", { n: I18n.num(st.size) })) + " · " + st.ms + " ms"
          : st.state === "error" ? "✖ " + st.error : st.state === "skip" ? T("(không chạy)") : st.state === "off" ? T("(tắt)") : "";
      });
      head.textContent = T("Kết quả") + " · " + (d.binary ? T("nhị phân (hex, tối đa 64 KB đầu)") : T("{n} ký tự", { n: I18n.num(d.text.length) })) + (d.failed ? " · " + T("dừng ở bước {n}", { n: d.failed.i + 1 }) : "");
      head.classList.toggle("bad", !!d.failed);
      out.textContent = d.text.length > SHOW ? d.text.slice(0, SHOW) + "\n…" : d.text;
    }

    v.labels = () => {
      fillAdd();
      fillSaved();
      Object.assign(saveBtn, { title: T("Lưu recipe (IndexedDB)") }); Object.assign(dropBtn, { title: T("Xoá recipe đang chọn") }); Object.assign(shareBtn, { title: T("Chép link chia sẻ: dữ liệu vào + các bước") });
      p.type.textContent = T("Recipe · {n} bước", { n: v.last ? v.last.steps.length : 0 });
      if (v.last) { v.key = ""; rows(); states(); }
    };
    // Typing in an arg keeps its box: rows are rebuilt only when the step list itself changed.
    v.show = d => {
      v.last = d;
      // Steps preset by a link / demo are written to the result tab once it exists (F5 keeps them).
      PowerUi.saveOpts(d.srcId, "recipe", RecipeOp.steps(d.srcId));
      const key = JSON.stringify(d.steps.map(s => [s.op, s.on]));
      if (key !== v.key || !list.contains(document.activeElement)) { v.key = key; rows(); }
      states();
      p.type.textContent = T("Recipe · {n} bước", { n: d.steps.length });
      return true;
    };
    return v;
  },
};

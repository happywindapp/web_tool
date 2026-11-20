// "run-code" op + pane: the HTML / JS of the source tab runs in its own copy of tools/one-editor-preview-sandbox.html (origin null, no network); console lines (with source line) show below, and become the result tab text.
const RunCode = (() => {
  let seq = 0;
  const TIMEOUT = 5000, outOf = srcId => Docs.list().find(d => d.kind === "output" && d.link?.src === srcId && d.link.op === "run-code");
  // After F5 (a quiet re-run without "run while typing") the code is not run again: the saved console stays.
  function run(t, c) {
    const mode = c.lang === "HTML" ? "html" : c.lang === "JavaScript" ? "js" : "";
    if (!mode) throw new Error(T("Chỉ chạy được tab HTML hoặc JavaScript (tab này: {lang}).", { lang: c.lang }));
    const text = outOf(c.id) ? Docs.text(outOf(c.id)) : "";
    if (c.quiet && PowerTools.state(c.id, "run-code").live !== true) return { text, view: { kind: "run", srcId: c.id, idle: true } };
    return { text, view: { kind: "run", srcId: c.id, mode, code: t, seq: ++seq }, notes: [T("Chạy trong sandbox (không gọi được mạng, không chạm dữ liệu One Editor); JS im lặng hoặc vòng lặp while / for chạy quá {s} giây thì dừng.", { s: TIMEOUT / 1000 })] };
  }
  return { run, TIMEOUT };
})();

const PvRun = {
  create(p) {
    const { mk, button } = PowerUi, PAGE = "one-editor-preview-sandbox.html", ICON = { log: "›", info: "ℹ", warn: "⚠", error: "✖", debug: "·" };
    const live = mk("label", "chk"), liveBox = mk("input", "", null, { type: "checkbox" }), liveText = mk("span");
    live.append(liveBox, liveText);
    const again = button("", () => { const s = Docs.get(v.last?.srcId); if (s) OutputLink.run(s, "run-code"); }), stopBtn = button("", () => stop(T("⏹ Đã dừng.")));
    const clear = button("", () => { con.replaceChildren(); lines.length = 0; save(); });
    const host = mk("div", "run-host"), con = mk("div", "run-con"), lines = [];
    const v = { el: mk("div", "pv-run"), tools: [again, stopBtn, clear, live], last: null, seq: 0, frame: null, ready: null };
    v.el.append(host, con);
    liveBox.onchange = () => { if (v.last) PowerTools.state(v.last.srcId, "run-code").live = liveBox.checked; };
    const save = Dom.debounce(() => { const d = Docs.get(p.doc); if (d) Views.replaceText(d, lines.join("\n") + (lines.length ? "\n" : "")); }, 300);

    function row(type, text, line) {
      const r = mk("div", "run-row run-" + type), src = Docs.get(v.last?.srcId);
      r.append(mk("span", "run-ic", ICON[type] || "›"));
      if (line > 0) { const a = button(T("dòng {n}", { n: line }), () => src && Views.revealLine(src, line)); a.className = "run-line"; r.append(a); }
      r.append(mk("span", "run-tx", text));
      con.append(r);
      lines.push("[" + type + "]" + (line > 0 ? " L" + line : "") + " " + text);
      save();
    }

    // One sandbox copy per pane, booted once; "ready" is the page's own hello.
    function frame() {
      if (v.ready) return v.ready;
      return v.ready = new Promise((ok, no) => {
        const f = v.frame = mk("iframe", "run-frame", null, { title: "run sandbox" });
        if (location.protocol !== "file:") f.setAttribute("sandbox", "allow-scripts");
        const t = setTimeout(() => { v.ready = null; f.remove(); no(new Error(T("Không nạp được trang sandbox ({file}) — cần file này nằm cạnh one-editor.html.", { file: PAGE }))); }, 15000);
        v.boot = () => { clearTimeout(t); ok(f); };
        f.src = PAGE;
        host.append(f);
      });
    }
    function onMsg(e) {
      if (!v.frame || e.source !== v.frame.contentWindow || !e.data || typeof e.data !== "object") return;
      const m = e.data;
      if (m.ready === true) { v.boot?.(); return; }
      if (m.run !== v.seq || typeof m.type !== "string") return;
      const text = typeof m.text === "string" ? m.text : "", line = Number.isInteger(m.line) ? m.line : 0;
      if (m.type === "done") p.type.textContent = T("Chạy · xong · {n} dòng console", { n: lines.length });
      else if (m.type === "timeout") row("error", T("Quá {s} giây không phản hồi — đã dừng (vòng lặp vô hạn?).", { s: RunCode.TIMEOUT / 1000 }), 0);
      else if (m.type === "limit") row("warn", T("Quá 1000 dòng console — đã dừng."), 0);
      else if (ICON[m.type]) row(m.type, text, line);
    }
    addEventListener("message", onMsg);

    function stop(note) {
      v.frame?.contentWindow?.postMessage({ run: { stop: true } }, "*");
      if (note) row("info", note, 0);
    }
    async function start(d) {
      con.replaceChildren(); lines.length = 0; save();
      v.seq = d.seq;
      host.classList.toggle("js", d.mode === "js");
      p.type.textContent = T("Chạy · {mode} · đang chạy…", { mode: d.mode === "js" ? "JavaScript" : "HTML" });
      try { const f = await frame(); if (v.seq === d.seq) f.contentWindow.postMessage({ run: { seq: d.seq, mode: d.mode, code: d.code, timeout: RunCode.TIMEOUT } }, "*"); }
      catch (e) { row("error", e.message, 0); }
    }

    v.labels = () => {
      again.textContent = T("▶ Chạy lại"); again.title = T("Chạy lại tab nguồn trong sandbox (Ctrl+K R)");
      stopBtn.textContent = "⏹"; stopBtn.title = T("Dừng code đang chạy");
      clear.textContent = "🧹"; clear.title = T("Xoá console");
      liveText.textContent = T("Chạy khi gõ"); live.title = T("Tự chạy lại sau mỗi lần sửa tab nguồn");
    };
    v.show = d => {
      v.last = d;
      liveBox.checked = PowerTools.state(d.srcId, "run-code").live === true;
      v.labels();
      if (d.idle) {
        if (!v.seq) { const out = Docs.get(p.doc); con.replaceChildren(mk("div", "rp-none", T("Bấm ▶ Chạy lại để chạy (code không tự chạy lại sau khi tải lại trang)."))); if (out) con.append(mk("pre", "run-old", Docs.text(out))); }
        p.type.textContent = T("Chạy · chưa chạy");
        return true;
      }
      start(d);
      return true;
    };
    v.destroy = () => { removeEventListener("message", onMsg); v.frame?.remove(); };
    return v;
  },
};

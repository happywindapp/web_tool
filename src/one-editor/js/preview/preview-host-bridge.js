// Diagrams render in tools/one-editor-preview-sandbox.html (iframe sandbox="allow-scripts", own CSP with 'unsafe-eval' for D2) so this page never needs eval; replies are matched by id and type-checked.
const PreviewBridge = (() => {
  const PAGE = "one-editor-preview-sandbox.html", LOAD_MS = 20000, RENDER_MS = 60000;
  const pending = new Map();
  let frame = null, booting = null, onReady = null, nextId = 0;

  // Drops the frame (missing page, hung renderer): the next preview boots a fresh one; requests still waiting fail now.
  function reset(f, err) {
    if (frame !== f) return;
    f.remove();
    frame = booting = onReady = null;
    for (const [id, p] of pending) { clearTimeout(p.timer); pending.delete(id); p.no(err); }
  }

  function boot() {
    return booting ??= new Promise((ok, no) => {
      const f = frame = document.createElement("iframe");
      const fail = () => {
        clearTimeout(timer);
        if (frame !== f) return;
        const e = new Error(T("Không nạp được trang preview ({file}) — cần file này nằm cạnh one-editor.html.", { file: PAGE }));
        reset(f, e);
        no(e);
      };
      const timer = setTimeout(fail, LOAD_MS);
      onReady = () => { clearTimeout(timer); onReady = null; ok(); };
      // file:// blocks local scripts in a sandboxed frame; a file:// page is already its own opaque origin and holds no cloud token (ADR #21).
      if (location.protocol !== "file:") f.setAttribute("sandbox", "allow-scripts");
      Object.assign(f, { className: "pv-sandbox", tabIndex: -1, title: "preview sandbox" });
      f.setAttribute("aria-hidden", "true");
      f.onload = () => setTimeout(() => { if (frame === f && onReady) fail(); }, 3000);
      f.src = PAGE;
      document.body.append(f);
    });
  }

  const str = v => typeof v === "string" ? v : "";
  const color = v => /^#[0-9a-f]{3,8}$/i.test(v) ? v : "#ffffff";
  const pickOf = p => p && typeof p === "object" && Array.isArray(p.options) ? { key: str(p.key), value: str(p.value), options: p.options.filter(Array.isArray).map(([v, l]) => [str(v), str(l)]) } : null;

  // what (short, for status bar + lint mark) + detail (renderer text, for the preview pane).
  function toError(x) {
    const line = Number.isInteger(x.line) && x.line > 0 ? x.line : 0, detail = str(x.message);
    if (x.load) return Object.assign(new Error(T("Không nạp được thư viện {file} — cần thư mục vendor/ nằm cạnh file HTML.", { file: detail })), { line: 0, detail });
    const what = str(x.what) || (line && x.syntax ? T("Lỗi cú pháp ở dòng {line}", { line }) : x.syntax ? T("Lỗi cú pháp") : T("Lỗi khi vẽ"));
    const lines = detail.split("\n").map(l => l.trim()).filter(Boolean);
    const first = lines.find(l => /^(?:Expecting|Unexpected)\b/i.test(l)) || lines.find(l => !/error on line \d+:?$/i.test(l)) || "";
    const short = first.length > 140 ? first.slice(0, 139) + "…" : first;
    return Object.assign(new Error(what + (short && short !== what ? " — " + short : "")), { line, detail });
  }

  addEventListener("message", e => {
    if (!frame || e.source !== frame.contentWindow || !e.data || typeof e.data !== "object") return;
    const m = e.data;
    if (m.ready === true) { onReady?.(); return; }
    const p = pending.get(m.id);
    if (!p) return;
    pending.delete(m.id);
    clearTimeout(p.timer);
    if (m.error && typeof m.error === "object") p.no(toError(m.error));
    else if (typeof m.svg === "string") p.ok({ svg: m.svg, type: str(m.type), bg: color(m.bg), warnings: Array.isArray(m.warnings) ? m.warnings.map(str) : [], pick: pickOf(m.pick) });
    else p.no(new Error(T("Lỗi khi vẽ")));
  });

  async function render(engine, code, cfg) {
    await boot();
    const id = ++nextId;
    return new Promise((ok, no) => {
      const f = frame, err = () => new Error(T("Preview không phản hồi sau {s} giây.", { s: RENDER_MS / 1000 }));
      const timer = setTimeout(() => { pending.delete(id); no(err()); reset(f, err()); }, RENDER_MS);
      pending.set(id, { ok, no, timer });
      // The sandbox's origin is "null", so it cannot be named as the target.
      f.contentWindow.postMessage({ id, engine, code, cfg, lang: I18n.lang }, "*");
    });
  }

  return { render };
})();

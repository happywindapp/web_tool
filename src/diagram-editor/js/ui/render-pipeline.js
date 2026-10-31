const readyEngines = new Set();

// Returns false when the renderer files are missing; the editor locks so the draft is not overwritten.
async function ensureReady(eng, seq) {
  if (readyEngines.has(eng.id)) return true;
  report(T("Đang tải thư viện {lib}…", { lib: eng.lib }), "muted");
  try {
    await eng.ready();
    readyEngines.add(eng.id);
    return true;
  } catch (e) {
    if (seq === renderSeq) {
      $("src").readOnly = $("cfg").readOnly = true;
      report(T("✖ Không nạp được thư viện {file} — hãy tải cả thư mục vendor/ cùng file HTML.", { file: e.message }), "bad");
    }
    return false;
  }
}

function mountSvg(res) {
  const node = SvgSanitizer.clean(res.svg), stage = $("stage");
  stage.replaceChildren(node); stage.classList.remove("stale");
  const vb = node.viewBox.baseVal;
  node.style.maxWidth = "none";
  if (vb && vb.width) { node.setAttribute("width", vb.width); node.setAttribute("height", vb.height); }
  $("view").style.backgroundColor = lastBg = res.bg;
  if (fitNext) { fitNext = false; PanZoom.center(); }
}

function fillPick(pick) {
  const sel = $("pickSel");
  sel.hidden = !pick;
  if (!pick) return;
  sel.title = T("Chọn view cần vẽ");
  sel.replaceChildren(...pick.options.map(([v, label]) => new Option(label, v)));
  sel.value = pick.value;
  sel.dataset.key = pick.key;
}

function renderFailed(e, code) {
  const line = e.line || 0, syntax = e.syntax;
  const what = e.what || (line && syntax ? T("Lỗi cú pháp ở dòng {line}", { line }) : syntax ? T("Lỗi cú pháp") : T("Lỗi khi vẽ"));
  $("stage").classList.toggle("stale", !!currentSvg());
  const lines = code.split("\n").length;
  report(`✖ ${what}` + (currentSvg() ? T(" — đang hiện bản vẽ hợp lệ gần nhất (mờ).") : "."), "bad", String(e?.message || e), Math.min(line, lines));
}

async function render() {
  const seq = ++renderSeq, eng = engine, code = $("src").value, cfgText = $("cfg").value;
  let cfg;
  try { cfg = readConfig(); } catch (e) { return report(T("✖ Cấu hình JSON lỗi: {msg}", { msg: e.message }), "bad"); }
  if (!code.trim()) { $("stage").replaceChildren(); return report(T("Chưa có nội dung."), "muted"); }
  if (!await ensureReady(eng, seq) || seq !== renderSeq) return;
  const t0 = performance.now();
  try {
    const res = await eng.render(code, cfg, seq);
    if (seq !== renderSeq) return;
    if (res.external) return drawioReport();
    mountSvg(res);
    fillPick(res.pick);
    report(T("✔ Đã vẽ sơ đồ {type} · {ms} ms", { type: res.type, ms: Math.round(performance.now() - t0) }), "good");
    flash(res.warnings?.length ? `⚠ ${res.warnings.slice(0, 4).join(" · ")}` : "", res.warnings?.length ? "warn" : "muted");
    VersionHistory.add(store, code, cfgText);
  } catch (e) {
    if (seq === renderSeq) renderFailed(e, code);
  }
}

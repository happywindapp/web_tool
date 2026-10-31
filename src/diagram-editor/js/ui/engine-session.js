// Per-engine state: every tab keeps its own draft, history and saved list; #src and #cfg always hold the active engine's content.
function saveDraft() {
  if ($("src").readOnly) return;
  const ok = store.set("draft", { code: $("src").value, config: $("cfg").value });
  if (!ok) flash(T("✖ Không lưu được nháp (trình duyệt chặn hoặc đầy bộ nhớ) — hãy tải file về để giữ bài."), true);
}

function syncControls() {
  let c = {};
  try { c = readConfig(); } catch { /* the Config tab shows the JSON error */ }
  for (const ctl of engine.controls) {
    const el = $(`opt-${ctl.key}`), v = Object.hasOwn(c, ctl.key) ? c[ctl.key] : ctl.dflt;
    el.value = ctl.options.some(o => String(o[0]) === String(v)) ? String(v) : String(ctl.dflt);
  }
}

function fillControls() {
  const box = $("engineOpts");
  box.replaceChildren(...engine.controls.map(ctl => {
    const sel = document.createElement("select");
    sel.id = `opt-${ctl.key}`; sel.title = T(ctl.title);
    sel.append(...ctl.options.map(([v, label]) => new Option(T(label), String(v))));
    sel.onchange = () => patchConfig(ctl, ctl.options.find(o => String(o[0]) === sel.value)[0]);
    return sel;
  }));
  syncControls();
}

const fillDemo = () => {
  $("demo").innerHTML = `<option value="">${T("Thử mẫu…")}</option>`;
  $("demo").append(...Object.entries(engine.samples).map(([k, v]) => new Option(T(v[0]), k)));
};

function applyEngineUi() {
  const ext = !!engine.external;
  document.querySelectorAll("[data-engine]").forEach(b => b.classList.toggle("on", b.dataset.engine === engine.id));
  $("work").hidden = ext; $("drawioPane").hidden = !ext;
  $("autoWrap").hidden = $("btnRender").hidden = ext;
  $("btnCfgTab").hidden = !engine.configTab;
  if (!engine.configTab) showEditorTab("code");
  $("btnMd").hidden = !engine.fence;
  $("btnDl").textContent = $("dioDl").textContent = T("Tải {ext}", { ext: engine.ext });
  $("file").accept = engine.accept;
  $("src").placeholder = T(engine.placeholder);
  $("pickSel").hidden = true;
  fillDemo(); fillControls();
}

function showEditorTab(tab) {
  document.querySelectorAll("[data-tab]").forEach(x => x.classList.toggle("on", x.dataset.tab === tab));
  $("edCode").hidden = tab !== "code"; $("cfg").hidden = tab !== "cfg";
}

function cleanUrl() {
  try {
    const u = new URL(location.href);
    if (engine.id === "mermaid") u.searchParams.delete("tab"); else u.searchParams.set("tab", engine.id);
    u.searchParams.delete("demo"); u.searchParams.delete("data"); u.hash = "";
    history.replaceState(null, "", u);
  } catch { /* some browsers refuse replaceState on file:// */ }
}

// Loads the engine's own draft; run=false when a link / sample replaces it right after.
function switchEngine(id, run = true) {
  clearTimeout(timer);
  saveDraft();
  renderSeq++;
  engine = ENGINES[id]; store = EngineStore.of(id);
  EngineStore.ui.set("tab", id);
  const draft = store.get("draft", null);
  $("src").readOnly = $("cfg").readOnly = false;
  $("src").value = draft?.code ?? engine.samples[engine.firstSample][1];
  $("cfg").value = draft?.config || engine.defaultConfig;
  fileName = ""; $("fname").textContent = "";
  $("stage").replaceChildren(); $("stage").classList.remove("stale");
  $("view").style.backgroundColor = lastBg = "#ffffff";
  report("", "muted"); flash("");
  applyEngineUi(); paint();
  saved?.forget();
  fitNext = true;
  cleanUrl();
  if (run) render();
}

function edited() { clearTimeout(timer); timer = setTimeout(() => { saveDraft(); if ($("auto").checked) render(); }, 500); }

function setState({ code, config }, name = "") {
  VersionHistory.add(store, $("src").value, $("cfg").value, true);
  $("src").value = code; $("cfg").value = config || engine.defaultConfig;
  fileName = name; $("fname").textContent = T(name);
  syncControls(); paint(); saveDraft(); fitNext = true; render();
}

function patchConfig(ctl, val) {
  let c;
  try { c = readConfig(); }
  catch (e) { syncControls(); return report(T("✖ Sửa lỗi JSON ở tab Cấu hình trước khi đổi giao diện: {msg}", { msg: e.message }), "bad"); }
  if (val === ctl.dflt && !ctl.keep) delete c[ctl.key]; else c[ctl.key] = val;
  $("cfg").value = JSON.stringify(c, null, 2); saveDraft(); render();
}

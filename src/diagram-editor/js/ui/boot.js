I18n.onChange(() => {
  const opts = Object.fromEntries(engine.controls.map(c => [c.key, $(`opt-${c.key}`).value]));
  const pick = $("pickSel").value;
  applyEngineUi();
  for (const [k, v] of Object.entries(opts)) $(`opt-${k}`).value = v;
  $("pickSel").value = pick;
  $("fname").textContent = T(fileName); flash("");
  if ($("hist").open) showHistory();
  saved.fill();
  if (engine.external) drawioReport(); else if (!$("src").readOnly) render();
});

(async function boot() {
  I18n.init();
  ThemePicker.bind($("uiTheme"), EngineStore.ui);
  saved = SavedSessions({
    select: $("savedSel"), saveBtn: $("btnSave"), delBtn: $("btnDelSaved"), key: "saved",
    store: { get: (k, d) => store.get(k, d), set: (k, v) => store.set(k, v) },
    snapshot: () => ({ text: $("src").value, config: $("cfg").value }),
    open: p => { if (typeof p.text === "string") setState({ code: p.text, config: typeof p.config === "string" ? p.config : engine.defaultConfig }, ""); },
    suggestName: () => (fileName || ($("src").value.trim().split("\n")[0] || "").slice(0, 40)).trim(),
    note: (msg, cls) => flash(msg, cls === "bad"),
  });
  bindActions();
  $("auto").checked = EngineStore.ui.get("auto", true);

  const q = new URLSearchParams(location.search), tab = q.get("tab"), demo = q.get("demo"), data = q.get("data");
  const known = Object.hasOwn(ENGINES, tab) ? tab : demo || data ? "mermaid" : EngineStore.ui.get("tab", "mermaid");
  engine = ENGINES[Object.hasOwn(ENGINES, known) ? known : "mermaid"]; store = EngineStore.of(engine.id);
  const draft = store.get("draft", null);
  $("src").value = draft?.code ?? engine.samples[engine.firstSample][1];
  $("cfg").value = draft?.config || engine.defaultConfig;
  applyEngineUi(); paint();

  if (location.hash.length > 1 && await ShareLink.open(location.hash, "từ link chia sẻ")) cleanUrl();
  else if (data) {
    if (!/^(pako|base64):/.test(data)) setState({ code: data, config: $("cfg").value }, "từ link chia sẻ");
    else await ShareLink.open("#" + data, "từ link chia sẻ");
    cleanUrl();
  }
  else if (Object.hasOwn(engine.samples, demo)) { setState({ code: engine.samples[demo][1], config: $("cfg").value }, ""); cleanUrl(); }
  else { cleanUrl(); render(); }
})();

// UI theme: auto (follows the OS) / light / dark, remembered per tool; colours come from the :root[data-theme] overrides in the tool's CSS.
const ThemePicker = (() => {
  const apply = v => { if (v === "light" || v === "dark") document.documentElement.dataset.theme = v; else delete document.documentElement.dataset.theme; };
  // store: the tool's prefixed localStorage wrapper ({ get, set }).
  function bind(select, store) {
    const v = store.get("theme", "auto");
    select.value = v === "light" || v === "dark" ? v : "auto";
    apply(select.value);
    select.addEventListener("change", () => { apply(select.value); store.set("theme", select.value); });
  }
  return { bind, apply };
})();

// Indicator guide dialog (opened from the "?" next to each indicator): sections + illustration, ‹ › / arrow keys through the catalog, tick to show on the chart.
const IndGuide = (() => {
  const e = s => Dom.esc(s);
  const ids = () => Object.keys(Indicators.DEFS);
  let cur = "", hooks = { on: () => false, toggle: () => {} };
  const dlg = () => document.getElementById("indHelpDlg");
  const section = ([k, title]) => {
    const v = IND_GUIDE[cur][k], body = Array.isArray(v) ? `<ul>${v.map(s => `<li>${e(T(s))}</li>`).join("")}</ul>` : `<p>${e(T(v))}</p>`;
    return `<section class="ig-sec ig-${k}"><h4>${e(T(title))}</h4>${body}</section>`;
  };

  function render() {
    const d = Indicators.DEFS[cur], list = ids(), i = list.indexOf(cur);
    const pic = IndIllus.svg(cur, { label: k => T(ChartHelp.TITLE[k] || k) });
    dlg().innerHTML = `<div class="dlg-head"><button data-g="prev" title="${e(T("Chỉ báo trước"))}">‹</button><b>${e(d.name)} — ${e(T(d.label))}</b>`
      + `<span class="muted">${i + 1}/${list.length}</span><button data-g="next" title="${e(T("Chỉ báo sau"))}">›</button><button data-g="close" title="${e(T("Đóng"))}">✕</button></div>`
      + `<div class="ig-body"><label class="chk ig-on"><input type="checkbox" data-g="toggle"${hooks.on(cur) ? " checked" : ""}> ${e(T("Bật trên biểu đồ"))}</label>`
      + `<figure class="ig-fig">${pic}<figcaption class="muted">${e(T("Hình minh họa trên dữ liệu giả lập (không phải giá thật)"))}</figcaption></figure>`
      + IND_GUIDE_SECTIONS.map(section).join("") + `</div>`;
  }
  const go = step => { const list = ids(); cur = list[(list.indexOf(cur) + step + list.length) % list.length]; render(); dlg().scrollTop = 0; };

  // h = { on(id) → shown on chart?, toggle(id, show) }.
  function open(id, h) {
    if (!Object.hasOwn(IND_GUIDE, id)) return;
    cur = id; if (h) hooks = h;
    render();
    if (!dlg().open) dlg().showModal();
  }

  function init() {
    const d = dlg();
    d.addEventListener("click", ev => {
      const b = ev.target.closest("button[data-g]");
      if (!b) { if (ev.target === d) d.close(); return; }
      if (b.dataset.g === "close") d.close(); else go(b.dataset.g === "next" ? 1 : -1);
    });
    d.addEventListener("change", ev => { if (ev.target.dataset.g === "toggle") { hooks.toggle(cur, ev.target.checked); ev.target.checked = hooks.on(cur); } });
    d.addEventListener("keydown", ev => { if (ev.key === "ArrowRight" || ev.key === "ArrowLeft") { ev.preventDefault(); go(ev.key === "ArrowRight" ? 1 : -1); } });
    I18n.onChange(() => { if (d.open) render(); });
  }

  return { open, init };
})();

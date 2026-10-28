// Status line + clickable message list ({line, col, msg}); clicking an item jumps the linked editor to that line.
function ReportPanel(statusEl, listEl, editor = null) {
  const MAX = 500;
  listEl.addEventListener("click", e => {
    const li = e.target.closest("li[data-line]");
    if (li && editor) editor.jump(+li.dataset.line);
  });
  const where = x => x.line ? `<b>${x.col ? T("Dòng {line}, cột {col}", x) : T("Dòng {line}", x)}</b> · ` : "";
  return {
    show(status, cls, items = []) {
      statusEl.className = "status " + cls;
      statusEl.textContent = status;
      listEl.innerHTML = items.slice(0, MAX).map(x => `<li${x.line ? ` data-line="${x.line}"` : ""}>${where(x)}${Dom.esc(x.msg)}</li>`).join("")
        + (items.length > MAX ? `<li class="muted">${T("… và {n} mục nữa", { n: items.length - MAX })}</li>` : "");
      if (editor) editor.mark(items.map(x => x.line));
    },
  };
}

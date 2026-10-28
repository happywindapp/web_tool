// Status line + clickable message list ({line, col, msg}); clicking an item jumps the linked editor to that line.
function ReportPanel(statusEl, listEl, editor = null) {
  const MAX = 500;
  listEl.addEventListener("click", e => {
    const li = e.target.closest("li[data-line]");
    if (li && editor) editor.jump(+li.dataset.line);
  });
  const where = x => x.line ? `<b>Dòng ${x.line}${x.col ? `, cột ${x.col}` : ""}</b> · ` : "";
  return {
    show(status, cls, items = []) {
      statusEl.className = "status " + cls;
      statusEl.textContent = status;
      listEl.innerHTML = items.slice(0, MAX).map(x => `<li${x.line ? ` data-line="${x.line}"` : ""}>${where(x)}${Dom.esc(x.msg)}</li>`).join("")
        + (items.length > MAX ? `<li class="muted">… và ${items.length - MAX} mục nữa</li>` : "");
      if (editor) editor.mark(items.map(x => x.line));
    },
  };
}

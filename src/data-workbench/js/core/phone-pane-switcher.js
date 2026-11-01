// Phone portrait (phone-portrait-layout.css): .pane-switch buttons scroll the .pane-scroller right after them; data-pane-go jumps to a pane; ⋯ opens the header actions.
const PhoneLayout = (() => {
  const switches = [...document.querySelectorAll(".pane-switch")];
  const visible = () => switches.find(sw => sw.offsetParent);

  function sync(sw) {
    const box = sw.nextElementSibling, i = box.clientWidth ? Math.round(box.scrollLeft / box.clientWidth) : 0;
    [...sw.children].forEach((b, k) => b.classList.toggle("on", k === i));
  }
  function go(sw, i) { const box = sw.nextElementSibling; box.scrollLeft = i * box.clientWidth; }
  const show = i => { const sw = visible(); if (sw) go(sw, i); };
  const showLast = () => { const sw = visible(); if (sw) go(sw, sw.children.length - 1); };

  for (const sw of switches) {
    const box = sw.nextElementSibling;
    box.addEventListener("scroll", () => sync(sw), { passive: true });
    new ResizeObserver(() => sync(sw)).observe(box);
    sw.addEventListener("click", e => { if (e.target !== sw) go(sw, [...sw.children].indexOf(e.target)); });
  }
  document.addEventListener("click", e => { const b = e.target.closest("button[data-pane-go]"); if (b) show(+b.dataset.paneGo); });
  document.addEventListener("change", e => { if (e.target.matches("select[data-pane-go], input[data-pane-go]")) show(+e.target.dataset.paneGo); });
  const more = document.querySelector(".more-toggle");
  more.onclick = () => more.setAttribute("aria-expanded", document.body.classList.toggle("more-open"));
  addEventListener("load", () => { const tab = document.querySelector(".wb-nav .on"); if (tab) tab.scrollIntoView({ block: "nearest", inline: "center" }); });

  return { show, showLast };
})();

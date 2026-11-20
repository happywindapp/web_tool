// Sublime-style layouts (Alt+Shift+1/2/3/8/5): id → number of views; the CSS grid for each is #work.lay-<id>.
const Layouts = (() => {
  const LIST = [
    { id: "1", n: 1, label: "1 view", key: "Alt+Shift+1" },
    { id: "2c", n: 2, label: "2 cột", key: "Alt+Shift+2" },
    { id: "3c", n: 3, label: "3 cột", key: "Alt+Shift+3" },
    { id: "2r", n: 2, label: "2 hàng", key: "Alt+Shift+8" },
    { id: "4g", n: 4, label: "Lưới 2×2", key: "Alt+Shift+5" },
  ];
  const get = id => LIST.find(l => l.id === id) || null;
  // Smallest layout holding n views (shared links / demos with more views than the current layout).
  const forCount = n => n <= 1 ? "1" : n === 2 ? "2c" : n === 3 ? "3c" : "4g";
  // "The other view" for Run / move / swap: View 1 ↔ View 2 when there are two, otherwise the next one round the ring.
  const other = (gi, n) => n < 2 ? -1 : n === 2 ? 1 - gi : (gi + 1) % n;
  return { LIST, get, forCount, other, MAX: 4 };
})();

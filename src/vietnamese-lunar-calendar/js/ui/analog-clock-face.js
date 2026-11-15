// Đồng hồ kim SVG cho ô thứ 3 của Chi tiết ngày: svg() vẽ mặt số, update() xoay kim theo giờ máy (gọi mỗi giây).
const AnalogClock = (() => {
  const ticks = Array.from({ length: 60 }, (_, i) => {
    const big = i % 5 === 0, a = i * 6 * Math.PI / 180, r1 = big ? 40 : 43, r2 = 46;
    const p = r => (50 + r * Math.sin(a)).toFixed(2) + " " + (50 - r * Math.cos(a)).toFixed(2);
    return `<path class="${big ? "tk big" : "tk"}" d="M${p(r1)}L${p(r2)}"/>`;
  }).join("");
  const nums = [[12, 50, 22], [3, 79, 53.5], [6, 50, 84], [9, 21, 53.5]].map(([n, x, y]) => `<text x="${x}" y="${y}" text-anchor="middle">${n}</text>`).join("");

  const svg = () => `<svg class="aclock" viewBox="0 0 100 100" role="img" aria-label="clock"><circle class="face" cx="50" cy="50" r="48"/>${ticks}${nums}`
    + `<line class="hh" x1="50" y1="56" x2="50" y2="27"/><line class="mh" x1="50" y1="58" x2="50" y2="15"/><line class="sh" x1="50" y1="60" x2="50" y2="10"/>`
    + `<circle class="pin" cx="50" cy="50" r="2.6"/></svg>`;

  function update(root = document) {
    const d = new Date(), s = d.getSeconds(), m = d.getMinutes() + s / 60, h = (d.getHours() % 12) + m / 60;
    for (const c of root.querySelectorAll(".aclock")) {
      c.querySelector(".hh").setAttribute("transform", `rotate(${h * 30} 50 50)`);
      c.querySelector(".mh").setAttribute("transform", `rotate(${m * 6} 50 50)`);
      c.querySelector(".sh").setAttribute("transform", `rotate(${s * 6} 50 50)`);
    }
  }

  return { svg, update };
})();

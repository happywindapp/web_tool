// Gieo quẻ Mai Hoa cho số SIM: thượng quái = tổng nửa đầu mod 8, hạ quái = tổng nửa sau mod 8 (Tiên thiên, 0 → Khôn), hào động = tổng mod 6; quẻ hỗ, quẻ biến, Thể – Dụng.
const SimHexagram = (() => {
  const tri = n => n % 8 || 8;
  // Tiên thiên t → lines bottom→top (1 = dương): Càn 111, Đoài 110, Ly 101, Chấn 100, Tốn 011, Khảm 010, Cấn 001, Khôn 000.
  const linesOf = t => { const b = 8 - t; return [(b >> 2) & 1, (b >> 1) & 1, b & 1]; };
  const fromLines = l => 8 - (l[0] * 4 + l[1] * 2 + l[2]);
  const byPair = new Map(SimText.HEX.map(h => [h.up * 10 + h.low, h]));

  const make = (up, low) => ({ ...byPair.get(up * 10 + low), upper: SimText.TRIGRAM[up], lower: SimText.TRIGRAM[low], lines: [...linesOf(low), ...linesOf(up)] });
  const fromSix = l => make(fromLines(l.slice(3)), fromLines(l.slice(0, 3)));

  // Thể = quái tĩnh (chủ thể), Dụng = quái có hào động (sự việc); k = mức tốt 0…1.
  function relation(dung, the) {
    if (dung === the) return { key: "Thể Dụng tỷ hòa", k: 1 };
    if (CanChi.generates(dung, the)) return { key: "Dụng sinh Thể", k: 1 };
    if (CanChi.overcomes(the, dung)) return { key: "Thể khắc Dụng", k: 0.75 };
    if (CanChi.generates(the, dung)) return { key: "Thể sinh Dụng", k: 0.25 };
    return { key: "Dụng khắc Thể", k: 0 };
  }

  function cast(digits) {
    const half = digits.length >> 1, add = arr => arr.reduce((a, b) => a + b, 0);
    const sumUp = add(digits.slice(0, half)), sumLow = add(digits.slice(half)), total = sumUp + sumLow;
    const main = make(tri(sumUp), tri(sumLow)), moving = total % 6 || 6, l = main.lines;
    const mutual = fromSix([l[1], l[2], l[3], l[2], l[3], l[4]]);
    const changed = fromSix(l.map((x, i) => i === moving - 1 ? 1 - x : x));
    const dungLower = moving <= 3, the = dungLower ? main.upper : main.lower, dung = dungLower ? main.lower : main.upper;
    return { sumUp, sumLow, total, main, mutual, changed, moving, the, dung, rel: relation(dung.el, the.el) };
  }

  return { cast };
})();

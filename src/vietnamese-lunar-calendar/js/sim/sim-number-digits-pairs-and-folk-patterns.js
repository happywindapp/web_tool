// Số SIM: chuẩn hóa (+84 → 0), nhà mạng, ngũ hành từng số, tổng → số nút + hành SIM (Hậu Thiên), bát tinh cặp số, đuôi số theo dân gian.
const SimNumber = (() => {
  // Hậu Thiên / Lạc Thư: 1 Khảm Thủy, 2 Khôn Thổ, 3–4 Chấn Tốn Mộc, 5 Trung cung Thổ, 6–7 Càn Đoài Kim, 8 Cấn Thổ, 9 Ly Hỏa; 0 theo dân gian là Thủy.
  const DIGIT_EL = [1, 1, 4, 2, 2, 4, 0, 0, 4, 3];
  const CARRIERS = [["Viettel", "32 33 34 35 36 37 38 39 86 96 97 98"], ["Vinaphone", "81 82 83 84 85 88 91 94"], ["MobiFone", "70 76 77 78 79 89 90 93"],
    ["Vietnamobile", "52 56 58 92"], ["Gmobile", "59 99"], ["Itelecom", "87"], ["Reddi", "55"]].map(([name, list]) => [name, list.split(" ")]);
  const ENDINGS = [["68", "Lộc phát (68)"], ["86", "Phát lộc (86)"], ["39", "Thần tài nhỏ (39)"], ["79", "Thần tài lớn (79)"], ["38", "Ông địa nhỏ (38)"], ["78", "Ông địa lớn (78)"]];

  function parse(text) {
    const raw = String(text || "").trim().slice(0, 40);
    if (!raw) return { error: "Chưa nhập số SIM." };
    if (/[^\d\s.+()-]/.test(raw)) return { error: "Số SIM chỉ gồm chữ số (được có dấu cách, chấm, gạch): “{t}”.", params: { t: raw } };
    let d = raw.replace(/\D/g, "");
    if (d.length === 11 && d.startsWith("84")) d = "0" + d.slice(2);
    if (!/^0\d{9}$/.test(d)) return { error: "Số SIM phải có 10 chữ số, bắt đầu bằng 0 hoặc +84: “{t}”.", params: { t: raw } };
    return { text: d, digits: [...d].map(Number) };
  }

  const carrier = text => CARRIERS.find(([, list]) => list.includes(text.slice(1, 3)))?.[0] || "";
  const pretty = text => text.slice(0, 4) + " " + text.slice(4, 7) + " " + text.slice(7);
  const sum = digits => digits.reduce((a, b) => a + b, 0);
  const root = n => n ? 1 + (n - 1) % 9 : 0;
  const nut = digits => sum(digits) % 10 || 10;

  // Bát tinh: 0 and 5 do not form a star (they only hide / boost it), so they are skipped before pairing.
  function pairs(digits) {
    const d = digits.filter(x => x !== 0 && x !== 5), out = [];
    for (let i = 1; i < d.length; i++) {
      const pair = "" + d[i - 1] + d[i];
      out.push({ pair, star: SimText.STAR8.find(s => s.pairs.includes(pair)) });
    }
    return out;
  }

  // Tail patterns people pay for (tứ quý, tam hoa, sảnh, taxi, lộc phát, thần tài…) and the ones they avoid (49, 53).
  function folk(text) {
    const tags = [], tail = n => text.slice(-n);
    let same = 1;
    while (same < 9 && text[9 - same] === text[9]) same++;
    if (same >= 4) tags.push({ key: same >= 6 ? "Lục quý {d}" : same === 5 ? "Ngũ quý {d}" : "Tứ quý {d}", params: { d: text[9] }, good: true });
    else if (same === 3) tags.push({ key: "Tam hoa {d}", params: { d: text[9] }, good: true });
    let run = 1;
    while (run < 9 && +text[9 - run] === +text[10 - run] - 1) run++;
    if (run >= 3) tags.push({ key: "Sảnh tiến {n} số", params: { n: run }, good: true });
    if (tail(6).slice(0, 3) === tail(3) && same < 3) tags.push({ key: "Taxi {a}.{a}", params: { a: tail(3) }, good: true });
    else if (text[6] === text[8] && text[7] === text[9] && text[6] !== text[7]) tags.push({ key: "Số lặp {a}", params: { a: tail(4) }, good: true });
    else if (text[6] === text[9] && text[7] === text[8] && text[6] !== text[7]) tags.push({ key: "Số gánh {a}", params: { a: tail(4) }, good: true });
    const end = ENDINGS.find(([e]) => tail(2) === e);
    if (end) tags.push({ key: end[1], params: {}, good: true });
    if (+tail(4) >= 1950 && +tail(4) <= 2030) tags.push({ key: "Đuôi năm sinh {y}", params: { y: tail(4) }, good: true });
    if (tail(2) === "49" || tail(2) === "53") tags.push({ key: "Đuôi {a} (dân gian kiêng: “49 chưa qua, 53 đã tới”)", params: { a: tail(2) }, good: false });
    return { tags, ending: tags.some(t => !t.good) ? "bad" : tags.length ? "good" : "" };
  }

  return { DIGIT_EL, parse, carrier, pretty, sum, root, nut, pairs, folk, elementOf: n => DIGIT_EL[root(n)] };
})();

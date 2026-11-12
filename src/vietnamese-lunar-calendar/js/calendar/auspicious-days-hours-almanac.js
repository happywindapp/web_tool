// Ngày/giờ tốt xấu: 12 thần hoàng/hắc đạo, 12 trực, 28 tú, hướng xuất hành, Lý Thuần Phong, Khổng Minh, ngày kỵ, tuổi xung, ngũ hành ngày.
const Almanac = (() => {
  const GODS = ["Thanh Long", "Minh Đường", "Thiên Hình", "Chu Tước", "Kim Quỹ", "Bảo Quang", "Bạch Hổ", "Ngọc Đường", "Thiên Lao", "Nguyên Vũ", "Tư Mệnh", "Câu Trận"];
  const GOOD_GOD = [1, 1, 0, 0, 1, 1, 0, 1, 0, 0, 1, 0];
  const TRUC = [
    ["Kiến", "Xuất hành, giá thú, khai trương", "Động thổ, đào giếng"],
    ["Trừ", "Chữa bệnh, tẩy uế, dọn dẹp", "Giá thú, đi xa"],
    ["Mãn", "Cầu tài, cúng tế, mở kho", "Kiện tụng, nhậm chức"],
    ["Bình", "Tốt mọi việc: sửa nhà, làm đường", "Đào mương, khơi nước"],
    ["Định", "Giá thú, nhập học, mua bán, cầu phúc", "Kiện tụng, đi xa"],
    ["Chấp", "Xây dựng, trồng cây, tuyển người", "Xuất hành, dọn nhà, mở kho"],
    ["Phá", "Phá dỡ nhà cũ, chữa bệnh", "Cưới hỏi, khai trương, việc lớn"],
    ["Nguy", "Cúng tế, nghỉ ngơi", "Leo cao, đi thuyền, việc mạo hiểm"],
    ["Thành", "Xuất hành, khai trương, giá thú, nhập học", "Kiện tụng, tranh chấp"],
    ["Thu", "Thu hoạch, nhập kho, buôn bán", "An táng, chữa bệnh"],
    ["Khai", "Khai trương, cưới hỏi, làm nhà, nhậm chức", "An táng, động thổ"],
    ["Bế", "Đắp đê, lấp hố, an táng", "Khai trương, chữa mắt, việc lớn"],
  ];
  const MANSIONS = ["Giác Mộc Giao", "Cang Kim Long", "Đê Thổ Lạc", "Phòng Nhật Thố", "Tâm Nguyệt Hồ", "Vĩ Hỏa Hổ", "Cơ Thủy Báo", "Đẩu Mộc Giải", "Ngưu Kim Ngưu", "Nữ Thổ Bức", "Hư Nhật Thử", "Nguy Nguyệt Yến", "Thất Hỏa Trư", "Bích Thủy Du",
    "Khuê Mộc Lang", "Lâu Kim Cẩu", "Vị Thổ Trĩ", "Mão Nhật Kê", "Tất Nguyệt Ô", "Chủy Hỏa Hầu", "Sâm Thủy Viên", "Tỉnh Mộc Hãn", "Quỷ Kim Dương", "Liễu Thổ Chương", "Tinh Nhật Mã", "Trương Nguyệt Lộc", "Dực Hỏa Xà", "Chẩn Thủy Dẫn"];
  const GOOD_MANSION = [1, 0, 0, 1, 0, 1, 1, 1, 0, 0, 0, 0, 1, 1, 0, 1, 1, 0, 1, 0, 1, 1, 0, 0, 0, 1, 0, 1];
  const DIRS = ["Đông Bắc", "Đông", "Đông Nam", "Nam", "Tây Nam", "Tây", "Tây Bắc", "Bắc"];
  const HY_THAN = [0, 6, 4, 3, 2];
  const TAI_THAN = [2, 2, 1, 1, 7, 3, 4, 4, 5, 6];
  const LTP = [["Đại An", 1], ["Tốc Hỷ", 1], ["Lưu Niên", 0], ["Xích Khẩu", 0], ["Tiểu Cát", 1], ["Tuyệt Lộ", 0]];
  const KHONG_MINH = [
    [["Đường Phong", 1], ["Kim Thổ", 0], ["Kim Dương", 1], ["Thuần Dương", 1], ["Đạo Tặc", 0], ["Hảo Thương", 1]],
    [["Thiên Đạo", 1], ["Thiên Môn", 1], ["Thiên Đường", 1], ["Thiên Tài", 1], ["Thiên Tặc", 0], ["Thiên Dương", 1], ["Thiên Hầu", 0], ["Thiên Thương", 1]],
    [["Chu Tước", 0], ["Bạch Hổ Đầu", 1], ["Bạch Hổ Kiếp", 1], ["Bạch Hổ Túc", 0], ["Huyền Vũ", 0], ["Thanh Long Đầu", 1], ["Thanh Long Kiếp", 1], ["Thanh Long Túc", 0]],
  ];
  const DUONG_CONG = ["1-13", "2-11", "3-9", "4-7", "5-5", "6-3", "7-8", "7-29", "8-27", "9-25", "10-23", "11-21", "12-19"];
  const RELATION = { same: ["Can Chi đồng hành", "Chuyên nhật (cát)", 1], canGen: ["Can sinh Chi", "Bảo nhật (đại cát)", 1], chiGen: ["Chi sinh Can", "Nghĩa nhật (cát)", 1],
    canBeat: ["Can khắc Chi", "Chế nhật (cát trung bình)", 1], chiBeat: ["Chi khắc Can", "Phạt nhật (hung)", 0] };
  const mod = (a, n) => ((a % n) + n) % n;

  // Thanh Long opens at Thân for branch Tý/Ngọ and moves two branches per pair; works for hours (day branch) and days (month branch).
  const godAt = (refChi, chi) => mod(chi - (8 + 2 * (refChi % 6)), 12);
  const god = i => ({ i, name: GODS[i], good: !!GOOD_GOD[i] });

  const dayGod = (lunarMonth, dayChi) => god(godAt(mod(lunarMonth + 1, 12), dayChi));
  const hourGod = (dayChi, h) => god(godAt(dayChi, h));

  function truc(dayChi, termIdx) {
    const i = mod(dayChi - CanChi.termMonthChi(termIdx), 12);
    return { i, name: TRUC[i][0], good: TRUC[i][1], bad: TRUC[i][2] };
  }

  const mansion = jd => { const i = mod(jd + 11, 28); return { i, name: MANSIONS[i], good: !!GOOD_MANSION[i] }; };

  // Hạc (Hắc) thần: 44 days on earth from Kỷ Dậu (6/5/6/5… days per direction), then 16 days in heaven from Quý Tỵ.
  function hacThan(idx) {
    let k = mod(idx - 45, 60);
    for (let i = 0; i < 8; i++) { const n = i % 2 ? 5 : 6; if (k < n) return DIRS[i]; k -= n; }
    return null;
  }
  const directions = p => ({ hy: DIRS[HY_THAN[p.can % 5]], tai: DIRS[TAI_THAN[p.can]], hac: hacThan(p.idx) });

  const lyThuanPhong = (lm, ld, h) => { const [name, good] = LTP[mod(lm - 1 + ld - 1 + h, 6)]; return { name, good: !!good }; };

  function khongMinh(lm, ld) {
    const g = KHONG_MINH[(lm - 1) % 3], [name, good] = g[(ld - 1) % g.length];
    return { name, good: !!good };
  }

  function taboos(ld, lm) {
    const out = [];
    if ([5, 14, 23].includes(ld)) out.push("Nguyệt kỵ");
    if ([3, 7, 13, 18, 22, 27].includes(ld)) out.push("Tam nương");
    if (DUONG_CONG.includes(lm + "-" + ld)) out.push("Dương công kỵ nhật");
    return out;
  }

  // Can chi clashing with p: opposite branch, or the clashing stem (Giáp–Canh, Ất–Tân, Bính–Nhâm, Đinh–Quý) — kept only when nạp âm elements overcome each other.
  function clashes(p) {
    const el = CanChi.napAm(p).el, hit = q => { const e = CanChi.napAm(q).el; return CanChi.overcomes(el, e) || CanChi.overcomes(e, el); };
    const opp = mod(p.chi + 6, 12), out = [];
    for (let c = 0; c < 10; c++) if (c % 2 === opp % 2) { const q = CanChi.pair(c, opp); if (hit(q)) out.push(q); }
    const partner = p.can < 4 ? p.can + 6 : p.can >= 6 ? p.can - 6 : -1;
    if (partner >= 0) for (let chi = partner % 2; chi < 12; chi += 2) {
      const q = CanChi.pair(partner, chi);
      if (hit(q) && !out.some(o => o.idx === q.idx)) out.push(q);
    }
    return out;
  }

  function dayRelation(p) {
    const a = CanChi.CAN_EL[p.can], b = CanChi.CHI_EL[p.chi];
    const key = a === b ? "same" : CanChi.generates(a, b) ? "canGen" : CanChi.generates(b, a) ? "chiGen" : CanChi.overcomes(a, b) ? "canBeat" : "chiBeat";
    const [rule, label, good] = RELATION[key];
    return { rule, label, good: !!good, canEl: CanChi.ELEMENTS[a], chiEl: CanChi.ELEMENTS[b] };
  }

  return { dayGod, hourGod, truc, mansion, directions, lyThuanPhong, khongMinh, taboos, clashes, dayRelation };
})();

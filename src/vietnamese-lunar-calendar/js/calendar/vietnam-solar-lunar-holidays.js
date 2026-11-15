// Ngày lễ / kỷ niệm Việt Nam theo dương lịch và âm lịch; off = 1 (luôn nghỉ) hoặc năm bắt đầu nghỉ, since = năm bắt đầu có ngày đó.
const Holidays = (() => {
  const SOLAR = [
    [1, 1, "Tết Dương lịch", 1], [3, 2, "Thành lập Đảng Cộng sản Việt Nam"], [14, 2, "Lễ Tình nhân"], [27, 2, "Thầy thuốc Việt Nam"],
    [8, 3, "Quốc tế Phụ nữ"], [26, 3, "Thành lập Đoàn TNCS Hồ Chí Minh"], [30, 4, "Giải phóng miền Nam", 1], [1, 5, "Quốc tế Lao động", 1],
    [19, 5, "Ngày sinh Chủ tịch Hồ Chí Minh"], [1, 6, "Quốc tế Thiếu nhi"], [28, 6, "Gia đình Việt Nam"], [27, 7, "Thương binh Liệt sĩ", 2027],
    [19, 8, "Cách mạng Tháng Tám"], [2, 9, "Quốc khánh", 1], [10, 10, "Giải phóng Thủ đô"], [13, 10, "Doanh nhân Việt Nam"],
    [20, 10, "Phụ nữ Việt Nam"], [20, 11, "Nhà giáo Việt Nam"], [24, 11, "Ngày Văn hóa Việt Nam", 2026, 2026], [22, 12, "Quân đội Nhân dân Việt Nam"], [24, 12, "Lễ Giáng sinh"],
  ];
  const LUNAR = [
    [1, 1, "Tết Nguyên Đán", 1], [2, 1, "Mùng 2 Tết", 1], [3, 1, "Mùng 3 Tết", 1], [15, 1, "Tết Nguyên Tiêu"], [3, 3, "Tết Hàn thực"],
    [10, 3, "Giỗ Tổ Hùng Vương", 1], [15, 4, "Lễ Phật Đản"], [5, 5, "Tết Đoan Ngọ"], [15, 7, "Lễ Vu Lan"], [15, 8, "Tết Trung Thu"],
    [9, 9, "Tết Trùng Cửu"], [10, 10, "Tết Thường Tân"], [15, 10, "Tết Hạ Nguyên"], [23, 12, "Ông Công Ông Táo"],
  ];

  // lunar = LunarCal.fromJd(jd) result; leap months carry no festival.
  function of(sd, sm, lunar, sy) {
    const out = [];
    for (const [d, m, name, off, since] of SOLAR) if (d === sd && m === sm && !(since > sy)) out.push({ name, off: !!off && !(off > sy), lunar: false });
    if (!lunar.leap) {
      for (const [d, m, name, off] of LUNAR) if (d === lunar.d && m === lunar.m) out.push({ name, off: !!off, lunar: true });
      if (lunar.m === 12 && lunar.d === lunar.monthLen) out.push({ name: "Giao thừa", off: true, lunar: true });
    }
    return out;
  }

  return { of };
})();

// Thời tiết: mã WMO của Open-Meteo → icon + mô tả ngắn, 34 tỉnh/thành (sau sáp nhập 7/2025) với tọa độ trung tâm hành chính — cặp VI/EN.
const WeatherText = (() => {
  const en = {};
  const p = (vi, enText) => { en[vi] = enText; return vi; };

  const CODE = [
    [[0], "☀️", p("Trời đẹp", "Clear")], [[1], "🌤️", p("Ít mây", "Mostly clear")], [[2], "⛅", p("Có mây", "Partly cloudy")],
    [[3], "☁️", p("Nhiều mây", "Overcast")], [[45, 48], "🌫️", p("Sương mù", "Fog")], [[51, 53, 55, 56, 57], "🌦️", p("Mưa phùn", "Drizzle")],
    [[61, 66, 80], "🌦️", p("Mưa nhẹ", "Light rain")], [[63, 81], "🌧️", p("Mưa", "Rain")], [[65, 67, 82], "🌧️", p("Mưa to", "Heavy rain")],
    [[71, 73, 75, 77, 85, 86], "🌨️", p("Tuyết", "Snow")], [[95], "⛈️", p("Dông", "Thunderstorm")], [[96, 99], "⛈️", p("Dông, mưa đá", "Storm, hail")],
  ];
  const UNKNOWN = { icon: "🌡️", text: p("Không rõ", "Unknown") };
  const code = c => { const r = CODE.find(([cs]) => cs.includes(c)); return r ? { icon: r[1], text: r[2] } : UNKNOWN; };

  // [id, tỉnh/thành, trung tâm hành chính nếu khác tên, lat, lon] — Bắc → Nam.
  const PROVINCES = [
    ["lai-chau", "Lai Châu", "", 22.396, 103.458], ["dien-bien", "Điện Biên", "", 21.386, 103.023], ["lao-cai", "Lào Cai", "Yên Bái", 21.705, 104.875],
    ["cao-bang", "Cao Bằng", "", 22.666, 106.258], ["tuyen-quang", "Tuyên Quang", "", 21.818, 105.211], ["lang-son", "Lạng Sơn", "", 21.853, 106.761],
    ["son-la", "Sơn La", "", 21.327, 103.914], ["thai-nguyen", "Thái Nguyên", "", 21.594, 105.848], ["phu-tho", "Phú Thọ", "Việt Trì", 21.322, 105.402],
    ["bac-ninh", "Bắc Ninh", "Bắc Giang", 21.273, 106.194], ["quang-ninh", "Quảng Ninh", "Hạ Long", 20.951, 107.073], ["ha-noi", "Hà Nội", "", 21.028, 105.854],
    ["hai-phong", "Hải Phòng", "", 20.845, 106.688], ["hung-yen", "Hưng Yên", "", 20.646, 106.051], ["ninh-binh", "Ninh Bình", "", 20.251, 105.975],
    ["thanh-hoa", "Thanh Hóa", "", 19.807, 105.776], ["nghe-an", "Nghệ An", "Vinh", 18.679, 105.681], ["ha-tinh", "Hà Tĩnh", "", 18.343, 105.906],
    ["quang-tri", "Quảng Trị", "Đồng Hới", 17.468, 106.622], ["hue", "Huế", "", 16.463, 107.585], ["da-nang", "Đà Nẵng", "", 16.054, 108.202],
    ["quang-ngai", "Quảng Ngãi", "", 15.12, 108.792], ["gia-lai", "Gia Lai", "Quy Nhơn", 13.776, 109.224], ["dak-lak", "Đắk Lắk", "Buôn Ma Thuột", 12.667, 108.038],
    ["khanh-hoa", "Khánh Hòa", "Nha Trang", 12.239, 109.197], ["lam-dong", "Lâm Đồng", "Đà Lạt", 11.94, 108.458], ["dong-nai", "Đồng Nai", "Biên Hòa", 10.945, 106.824],
    ["tay-ninh", "Tây Ninh", "Tân An", 10.536, 106.413], ["ho-chi-minh", "TP. Hồ Chí Minh", "", 10.776, 106.701], ["dong-thap", "Đồng Tháp", "Mỹ Tho", 10.36, 106.36],
    ["vinh-long", "Vĩnh Long", "", 10.254, 105.972], ["can-tho", "Cần Thơ", "", 10.034, 105.788], ["an-giang", "An Giang", "Rạch Giá", 10.012, 105.081],
    ["ca-mau", "Cà Mau", "", 9.177, 105.15],
  ].map(([id, name, seat, lat, lon]) => ({ id, name, seat, lat, lon }));
  p("TP. Hồ Chí Minh", "Ho Chi Minh City");

  I18n.add(en);
  return { code, PROVINCES };
})();

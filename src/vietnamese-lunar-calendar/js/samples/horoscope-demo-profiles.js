// "Thử mẫu…" of the Tử vi tab / ?demo=horo-*: fake people covering edge cases (sinh trước Tết, giờ Tý muộn, không rõ giờ, input lỗi).
const HORO_DEMOS = (() => {
  const LIST = [
    ["horo-male", "Nam, có giờ sinh", { name: "Nguyen Van An", male: true, birth: "15/08/1990", time: "07:30" }],
    ["horo-before-tet", "Nữ, sinh trước Tết", { name: "Tran Thi Mai", male: false, birth: "20/01/1985", time: "14:15" }],
    ["horo-late-hour", "Sinh giờ Tý muộn (23:40)", { name: "Le Minh Khoa", male: true, birth: "12/11/2000", time: "23:40" }],
    ["horo-no-hour", "Không rõ giờ sinh", { name: "Pham Thu Ha", male: false, birth: "01/01/2001", time: "" }],
    ["horo-bad-date", "Lỗi: ngày sinh không tồn tại", { name: "Test User", male: true, birth: "31/02/1995", time: "08:00" }],
    ["horo-bad-time", "Lỗi: giờ sinh sai", { name: "Test User", male: false, birth: "10/10/1995", time: "25:61" }],
  ];
  const find = k => LIST.find(x => x[0] === k);
  return { keys: LIST.map(x => x[0]), name: k => find(k)?.[1] ?? k, data: k => find(k)?.[2] ?? null };
})();

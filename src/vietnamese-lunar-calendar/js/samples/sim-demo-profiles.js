// "Thử mẫu…" of the SIM phong thủy tab / ?demo=sim-*: sample numbers + fake owners, incl. a lunar birth date, +84 input and no birth date.
const SIM_DEMOS = (() => {
  const LIST = [
    ["sim-sequence", "Sảnh tiến 345678 · nam 1990", { sim: "0912 345 678", male: true, birth: "15/08/1990", time: "07:30" }],
    ["sim-loc-phat", "Đuôi lộc phát 6868 · nữ sinh trước Tết", { sim: "0938.11.6868", male: false, birth: "20/01/1985", time: "14:15" }],
    ["sim-than-tai", "Thần tài 3979 · không rõ giờ sinh", { sim: "0362 573 979", male: true, birth: "12/11/2000", time: "" }],
    ["sim-lunar-birth", "Ngày sinh âm lịch (15/8/1990)", { sim: "0979 397 939", male: false, birth: "15/08/1990", lunar: true, time: "09:00" }],
    ["sim-no-birth", "Chỉ chấm số (+84, không ngày sinh)", { sim: "+84 707 123 456", male: true, birth: "", time: "" }],
  ];
  const find = k => LIST.find(x => x[0] === k);
  return { keys: LIST.map(x => x[0]), name: k => find(k)?.[1] ?? k, data: k => find(k)?.[2] ?? null };
})();

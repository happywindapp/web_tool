// "Thử mẫu…" of the Tử vi tab / ?demo=horo-*: sample births (11/01/1986 falls before Tết ⇒ lunar year Ất Sửu).
const HORO_DEMOS = (() => {
  const LIST = [
    ["horo-1986", "Nam, sinh 11/01/1986 lúc 01:30", { name: "", male: true, birth: "11/01/1986", time: "01:30" }],
    ["horo-2015", "Nam, sinh 25/07/2015 lúc 10:30", { name: "", male: true, birth: "25/07/2015", time: "10:30" }],
  ];
  const find = k => LIST.find(x => x[0] === k);
  return { keys: LIST.map(x => x[0]), name: k => find(k)?.[1] ?? k, data: k => find(k)?.[2] ?? null };
})();

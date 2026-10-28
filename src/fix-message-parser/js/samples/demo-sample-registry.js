// Sample picker + ?demo=<key>: names are translated, contents are fixed fake data in English; text is built once on first use.
const DEMOS = (() => {
  const list = {
    bcgd: { name: "Server Sàn BCGD — vòng đời báo cáo giao dịch (log)", make: () => VenueSamples.lifecycle() },
    "bcgd-day": { name: "Server Sàn BCGD — 14 báo cáo giao dịch trong ngày", make: () => VenueSamples.tradingDay() },
    ttdt: { name: "Server Sàn ĐTTTT — chào giá, huỷ, chấp nhận", make: () => VenueSamples.quotes() },
    order: { name: "FIX 4.4 — vòng đời lệnh cổ phiếu (SOH)", make: () => StdSamples.orderLifecycle() },
    algo: { name: "FIX 4.4 — lệnh algo cha + lệnh con (583)", make: () => StdSamples.algoParentChild() },
    broken: { name: "Message lỗi — checksum, độ dài, thiếu tag…", make: () => StdSamples.broken() },
  };
  const cache = {};
  const text = key => Object.hasOwn(list, key) ? cache[key] ??= list[key].make() : null;
  const isSample = s => Object.keys(list).some(k => text(k) === s);
  return { keys: Object.keys(list), name: k => list[k].name, text, isSample };
})();

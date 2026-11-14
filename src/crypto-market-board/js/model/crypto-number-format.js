// Crypto number formats: adaptive price decimals ($0.00001234 … $98,765.43), compact money (K/M/B/T), signed %, and the USD ↔ VND display currency.
const Currency = (() => {
  let code = "USD", vnd = 0;
  const set = c => { code = c === "VND" ? "VND" : "USD"; };
  // VND only once a USDT→VND rate is known; until then money stays in USD.
  const active = () => code === "VND" && vnd > 0 ? "VND" : "USD";
  return { set, active, setRate: r => { if (Number.isFinite(r) && r > 0) vnd = r; }, rate: () => vnd, get code() { return code; }, conv: usd => active() === "VND" ? usd * vnd : usd };
})();

const Fmt = (() => {
  const en = (n, d = 0) => n.toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d });
  // Significant digits for small prices so $0.000012345 does not collapse to 0.00.
  function price(p) {
    if (p == null || !Number.isFinite(p)) return "";
    const a = Math.abs(p);
    if (a === 0) return "0";
    if (a >= 1000) return en(p, 2);
    if (a >= 1) return en(p, a >= 100 ? 2 : 4);
    const dec = Math.min(12, Math.max(4, 3 - Math.floor(Math.log10(a))));
    return p.toFixed(dec).replace(/(\.\d*?[1-9])0+$/, "$1");
  }
  const big = n => {
    if (n == null || !Number.isFinite(n)) return "";
    const a = Math.abs(n), s = n < 0 ? "-" : "";
    return a >= 1e12 ? s + en(a / 1e12, 2) + "T" : a >= 1e9 ? s + en(a / 1e9, 2) + "B" : a >= 1e6 ? s + en(a / 1e6, 2) + "M" : a >= 1e3 ? s + en(a / 1e3, 1) + "K" : s + en(a, a < 10 ? 2 : 0);
  };
  const signed = (n, d = 2) => n == null || !Number.isFinite(n) ? "" : n > 0 ? "+" + en(n, d) : n < 0 ? "-" + en(-n, d) : en(0, d);
  const pct = (n, d = 2) => n == null || !Number.isFinite(n) ? "" : signed(n, d) + "%";
  const tone = n => n > 0 ? "up" : n < 0 ? "down" : "ref";
  const sym = () => Currency.active() === "VND" ? "₫" : "$";
  // Money in the display currency: price-like (exact) or compact (mcap / volume).
  const money = usd => usd == null || !Number.isFinite(usd) ? "" : Currency.active() === "VND" ? en(Currency.conv(usd), Math.abs(usd * Currency.rate()) >= 100 ? 0 : 2) + " ₫" : "$" + price(usd);
  const moneyBig = usd => usd == null || !Number.isFinite(usd) ? "" : Currency.active() === "VND" ? big(Currency.conv(usd)) + " ₫" : "$" + big(usd);
  const qty = n => n == null || !Number.isFinite(n) ? "" : Math.abs(n) >= 1000 ? en(n, 2) : price(n);
  const date = ts => { if (!ts) return ""; const d = new Date(ts); return Number.isNaN(+d) ? "" : d.toISOString().slice(0, 10); };
  return { en, price, big, signed, pct, tone, sym, money, moneyBig, qty, date };
})();

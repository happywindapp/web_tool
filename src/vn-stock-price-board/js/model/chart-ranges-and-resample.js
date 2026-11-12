// Chart ranges × candle intervals: which combos the feed can serve, fetch window, week/month resampling and Heikin-Ashi.
const ChartRange = (() => {
  const DAY = 86400, VN = 7 * 3600;
  const RANGES = [
    { k: "1W", days: 7, label: "1 tuần" }, { k: "1M", days: 31, label: "1 tháng" }, { k: "3M", days: 92, label: "3 tháng" },
    { k: "6M", days: 183, label: "6 tháng" }, { k: "1Y", days: 366, label: "1 năm" }, { k: "3Y", days: 1096, label: "3 năm" },
    { k: "5Y", days: 1827, label: "5 năm" }, { k: "10Y", days: 3653, label: "10 năm" }, { k: "ALL", days: 9132, label: "Tất cả" },
  ];
  // max/min days keep bar counts sane (5m × 1 month ≈ 1k bars) and match how far back intraday data really goes.
  const INTERVALS = [
    { k: "5m", res: "5", max: 31 }, { k: "15m", res: "15", max: 92 }, { k: "30m", res: "30", max: 183 }, { k: "1h", res: "60", max: 366 },
    { k: "1D", res: "D", max: Infinity }, { k: "1W", res: "D", group: "week", min: 28 }, { k: "1M", res: "D", group: "month", min: 90 },
  ];
  const DEFAULT = { "1W": "15m", "1M": "1h", "3M": "1D", "6M": "1D", "1Y": "1D", "3Y": "1W", "5Y": "1W", "10Y": "1M", "ALL": "1M" };

  const range = k => RANGES.find(r => r.k === k) || RANGES[4];
  const interval = k => INTERVALS.find(i => i.k === k) || INTERVALS[4];
  const valid = (rk, ik) => { const d = range(rk).days, i = interval(ik); return d <= (i.max ?? Infinity) && d >= (i.min ?? 0); };
  const fix = (rk, ik) => valid(rk, ik) ? ik : DEFAULT[range(rk).k];
  const intraday = ik => interval(ik).res !== "D";

  // Fetch window [from, to] in unix seconds; daily fetches start a little earlier so long MAs have warm-up bars.
  function windowOf(rk, ik, now = Date.now() / 1000) {
    const days = range(rk).days + (intraday(ik) ? 0 : 300);
    return { from: Math.floor(now - days * DAY), to: Math.ceil(now), res: interval(ik).res };
  }

  function bucket(t, group) {
    const d = new Date(t * 1000);
    if (group === "month") return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1) / 1000;
    const dow = (d.getUTCDay() + 6) % 7;
    return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - dow) / 1000;
  }

  // Daily bars → week (Monday) / month buckets; intraday bars → shifted to Vietnam wall-clock so the time axis reads 09:15 not 02:15.
  function shape(bars, ik) {
    const it = interval(ik);
    if (it.res !== "D") return bars.map(b => ({ ...b, time: b.time + VN }));
    if (!it.group) return bars;
    const out = [];
    for (const b of bars) {
      const k = bucket(b.time, it.group), last = out[out.length - 1];
      if (last && last.time === k) { last.high = Math.max(last.high, b.high); last.low = Math.min(last.low, b.low); last.close = b.close; last.volume += b.volume; }
      else out.push({ time: k, open: b.open, high: b.high, low: b.low, close: b.close, volume: b.volume });
    }
    return out;
  }

  // Bars shown for the chosen range (the fetch has warm-up bars before it).
  const firstVisible = (bars, rk, now = Date.now() / 1000) => { const s = now - range(rk).days * DAY; const i = bars.findIndex(b => b.time >= s); return i < 0 ? 0 : i; };

  function heikinAshi(bars) {
    const out = [];
    for (const b of bars) {
      const p = out[out.length - 1], close = (b.open + b.high + b.low + b.close) / 4, open = p ? (p.open + p.close) / 2 : (b.open + b.close) / 2;
      out.push({ time: b.time, open, close, high: Math.max(b.high, open, close), low: Math.min(b.low, open, close), volume: b.volume });
    }
    return out;
  }

  return { RANGES, INTERVALS, range, interval, valid, fix, intraday, windowOf, shape, firstVisible, heikinAshi, DEFAULT };
})();

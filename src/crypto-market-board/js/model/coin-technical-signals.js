// Pure technical signals from CLOSED candles: snapshot (RSI, MAs, MACD, volume ratio, 52-week distance) + crossing / breakout events.
const CoinSignals = (() => {
  const ok = x => x != null && Number.isFinite(x);
  const META = {
    goldenCross: ["Golden cross", "MA50 cắt lên MA200 — xu hướng dài hạn chuyển tăng."],
    deathCross: ["Death cross", "MA50 cắt xuống MA200 — xu hướng dài hạn chuyển giảm."],
    crossUp200: ["Vượt MA200", "Giá đóng cửa vượt lên trên MA200."],
    crossDown200: ["Thủng MA200", "Giá đóng cửa rơi xuống dưới MA200."],
    macdUp: ["MACD cắt lên", "MACD cắt lên đường tín hiệu — động lượng tăng."],
    macdDown: ["MACD cắt xuống", "MACD cắt xuống đường tín hiệu — động lượng giảm."],
    rsiExitOversold: ["RSI thoát quá bán", "RSI cắt lên 30 từ vùng quá bán."],
    rsiExitOverbought: ["RSI thoát quá mua", "RSI cắt xuống 70 từ vùng quá mua."],
    volSpike: ["Khối lượng đột biến", "Khối lượng ≥ 2× trung bình 20 nến trước."],
    breakout20: ["Bứt phá đỉnh 20", "Giá đóng cửa cao hơn đỉnh 20 nến trước."],
    breakdown20: ["Thủng đáy 20", "Giá đóng cửa thấp hơn đáy 20 nến trước."],
  };
  const KEYS = Object.keys(META);

  function calc(bars) {
    const c = bars.map(b => b.close), v = bars.map(b => b.volume), m = TA.macd(c);
    return { bars, c, v, rsi: TA.rsi(c, 14), ma50: TA.sma(c, 50), ma200: TA.sma(c, 200), line: m.line, sig: m.signal };
  }

  const volRatioAt = (x, i) => {
    if (i < 20) return null;
    const avg = x.v.slice(i - 20, i).reduce((s, n) => s + n, 0) / 20;
    return avg > 0 ? x.v[i] / avg : null;
  };
  const cross = (a, b, i, up) => ok(a[i]) && ok(b[i]) && ok(a[i - 1]) && ok(b[i - 1]) && (up ? a[i - 1] <= b[i - 1] && a[i] > b[i] : a[i - 1] >= b[i - 1] && a[i] < b[i]);

  function hasEvent(x, key, i) {
    if (i < 1) return false;
    const { c, rsi, ma50, ma200, line, sig, bars } = x;
    switch (key) {
      case "goldenCross": return cross(ma50, ma200, i, true);
      case "deathCross": return cross(ma50, ma200, i, false);
      case "crossUp200": return cross(c, ma200, i, true);
      case "crossDown200": return cross(c, ma200, i, false);
      case "macdUp": return cross(line, sig, i, true);
      case "macdDown": return cross(line, sig, i, false);
      case "rsiExitOversold": return ok(rsi[i]) && ok(rsi[i - 1]) && rsi[i - 1] < 30 && rsi[i] >= 30;
      case "rsiExitOverbought": return ok(rsi[i]) && ok(rsi[i - 1]) && rsi[i - 1] > 70 && rsi[i] <= 70;
      case "volSpike": { const r = volRatioAt(x, i); return r != null && r >= 2; }
      case "breakout20": return i >= 20 && c[i] > Math.max(...bars.slice(i - 20, i).map(b => b.high));
      case "breakdown20": return i >= 20 && c[i] < Math.min(...bars.slice(i - 20, i).map(b => b.low));
      default: return false;
    }
  }

  // → [{ key, barsAgo }] newest first; each key once (its most recent occurrence within `lookback` bars back, 0 = last bar).
  function events(bars, lookback = 10, only = null) {
    if (!bars || bars.length < 30) return [];
    const x = calc(bars), n = bars.length - 1, out = [];
    for (const key of only || KEYS) {
      for (let a = 0; a <= lookback && n - a >= 1; a++) if (hasEvent(x, key, n - a)) { out.push({ key, barsAgo: a }); break; }
    }
    return out.sort((p, q) => p.barsAgo - q.barsAgo);
  }

  // → null when < 30 bars; withScore adds the daily TechOutlook score (heavier).
  function snapshot(bars, withScore = true) {
    if (!bars || bars.length < 30) return null;
    const x = calc(bars), i = bars.length - 1, price = x.c[i], ma50 = x.ma50[i], ma200 = x.ma200[i];
    const hi52 = Math.max(...bars.slice(-365).map(b => b.high)), f = withScore ? TechOutlook.frame(bars, "D", []) : null;
    return { price, rsi: x.rsi[i], ma50, ma200, vsMa50: ok(ma50) ? (price / ma50 - 1) * 100 : null, vsMa200: ok(ma200) ? (price / ma200 - 1) * 100 : null,
      macdAbove: ok(x.line[i]) && ok(x.sig[i]) ? x.line[i] > x.sig[i] : null, volRatio: volRatioAt(x, i), fromHi52: hi52 > 0 ? (price / hi52 - 1) * 100 : null, score: f ? f.score : null };
  }

  const SECONDS = { "1h": 3600, "4h": 14400, "1d": 86400 };
  // Drops the still-forming last bar; bar.time is the open time shifted by tz seconds (Spot.TZ).
  const closed = (bars, interval, tz = 0, nowMs = Date.now()) => bars.length && nowMs / 1000 + tz < bars[bars.length - 1].time + SECONDS[interval] ? bars.slice(0, -1) : bars;

  return { META, KEYS, SECONDS, events, snapshot, closed };
})();

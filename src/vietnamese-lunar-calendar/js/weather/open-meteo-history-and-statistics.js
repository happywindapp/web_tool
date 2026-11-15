// Lịch sử thời tiết Open-Meteo archive (ERA5, từ 1940, trễ ~5 ngày) + thống kê: tóm tắt, theo tháng/năm, khí hậu trung bình tháng, xu hướng.
const WeatherHistory = (() => {
  const API = "https://archive-api.open-meteo.com/v1/archive", KEY = "web_tool.vietnamese-lunar-calendar.wxh.";
  const DAILY = "temperature_2m_max,temperature_2m_min,precipitation_sum,relative_humidity_2m_mean";
  const fix = v => Number(v).toFixed(2);
  const pad = n => String(n).padStart(2, "0");

  // Open-Meteo JSON → [{ y, m, d, tmax, tmin, rain, rh }], days without temperature skipped.
  function parse(j) {
    const d = j && j.daily;
    if (!d || !Array.isArray(d.time)) throw new Error("bad response");
    const at = (k, i) => (d[k] || [])[i] ?? null, out = [];
    d.time.forEach((t, i) => {
      if (at("temperature_2m_max", i) === null || at("temperature_2m_min", i) === null) return;
      const [y, m, dd] = t.split("-").map(Number);
      out.push({ y, m, d: dd, tmax: at("temperature_2m_max", i), tmin: at("temperature_2m_min", i), rain: at("precipitation_sum", i), rh: at("relative_humidity_2m_mean", i) });
    });
    return out;
  }

  // years = full years before the current one (+ current year so far); end = yesterday.
  async function load(lat, lon, years) {
    const now = new Date(), y = now.getFullYear(), end = new Date(now.getTime() - 864e5);
    const q = { latitude: fix(lat), longitude: fix(lon), start_date: (y - years) + "-01-01", daily: DAILY, timezone: "Asia/Ho_Chi_Minh",
      end_date: end.getFullYear() + "-" + pad(end.getMonth() + 1) + "-" + pad(end.getDate()) };
    const k = KEY + [q.latitude, q.longitude, q.start_date, q.end_date].join(",");
    try { const c = JSON.parse(sessionStorage.getItem(k)); if (c) return parse(c); } catch { /* no cache */ }
    const r = await fetch(API + "?" + new URLSearchParams(q));
    if (!r.ok) throw new Error("HTTP " + r.status);
    const json = await r.json(), days = parse(json);
    try { sessionStorage.setItem(k, JSON.stringify({ daily: json.daily })); } catch { /* quota or blocked */ }
    return days;
  }

  return { load, parse };
})();

const WxStats = (() => {
  const vals = a => a.filter(v => v != null && Number.isFinite(v));
  const avg = a => { const v = vals(a); return v.length ? v.reduce((s, x) => s + x, 0) / v.length : null; };
  const sum = a => { const v = vals(a); return v.length ? v.reduce((s, x) => s + x, 0) : null; };
  const mean = d => (d.tmax + d.tmin) / 2;

  function summary(days) {
    let hot = null, cold = null;
    for (const d of days) { if (!hot || d.tmax > hot.tmax) hot = d; if (!cold || d.tmin < cold.tmin) cold = d; }
    return { n: days.length, tavg: avg(days.map(mean)), tmax: avg(days.map(d => d.tmax)), tmin: avg(days.map(d => d.tmin)), hot, cold,
      rain: sum(days.map(d => d.rain)), rainy: days.filter(d => d.rain >= 1).length, rh: avg(days.map(d => d.rh)) };
  }

  const group = (days, key) => { const g = new Map(); for (const d of days) { const k = key(d); if (!g.has(k)) g.set(k, []); g.get(k).push(d); } return g; };
  const monthly = days => [...group(days, d => d.y * 12 + d.m - 1)].map(([k, ds]) => ({ y: Math.floor(k / 12), m: k % 12 + 1, ...summary(ds) }));
  const yearly = days => [...group(days, d => d.y)].map(([y, ds]) => ({ y, ...summary(ds) }));

  // Average month over the given days: temperatures averaged per day, rain = average monthly total.
  const climatology = days => Array.from({ length: 12 }, (_, i) => {
    const ms = monthly(days).filter(x => x.m === i + 1);
    return { m: i + 1, tmax: avg(ms.map(x => x.tmax)), tmin: avg(ms.map(x => x.tmin)), rain: avg(ms.map(x => x.rain)), rainy: avg(ms.map(x => x.rainy)), rh: avg(ms.map(x => x.rh)) };
  });

  // Least squares on (x, y) pairs with y present → { slope, at(x) }.
  function trend(xs, ys) {
    const p = xs.map((x, i) => [x, ys[i]]).filter(([, y]) => y != null);
    if (p.length < 2) return null;
    const mx = avg(p.map(q => q[0])), my = avg(p.map(q => q[1]));
    const slope = p.reduce((s, [x, y]) => s + (x - mx) * (y - my), 0) / p.reduce((s, [x]) => s + (x - mx) ** 2, 0);
    return { slope, at: x => my + slope * (x - mx) };
  }

  return { summary, monthly, yearly, climatology, trend, avg };
})();

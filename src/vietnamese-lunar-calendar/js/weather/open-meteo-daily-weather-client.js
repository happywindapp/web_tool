// Open-Meteo (chỉ GET, gửi tọa độ làm tròn 0,01°): thời tiết theo ngày ~92 ngày qua + 16 ngày tới và hiện tại; cache sessionStorage 30 phút.
const Weather = (() => {
  const API = "https://api.open-meteo.com/v1/forecast", TTL = 30 * 60e3, KEY = "web_tool.vietnamese-lunar-calendar.wx2.";
  const DAILY = "weather_code,temperature_2m_max,temperature_2m_min,relative_humidity_2m_mean,precipitation_probability_max,precipitation_sum,wind_speed_10m_max,uv_index_max,sunrise,sunset";
  const CURRENT = "temperature_2m,apparent_temperature,relative_humidity_2m,weather_code";
  const fix = v => Number(v).toFixed(2);
  const hm = t => (typeof t === "string" ? t.slice(11, 16) : null);

  const url = (lat, lon) => API + "?" + new URLSearchParams({ latitude: fix(lat), longitude: fix(lon), daily: DAILY, current: CURRENT,
    timezone: "Asia/Ho_Chi_Minh", past_days: 92, forecast_days: 16 });

  // Open-Meteo JSON → { days: { [jd]: { code, tmax, tmin, rh, pop, rain, wind, uv, rise, set } }, current }; days without a weather code are skipped.
  function parse(j) {
    const d = j && j.daily;
    if (!d || !Array.isArray(d.time)) throw new Error("bad response");
    const days = {}, at = (k, i) => (d[k] || [])[i] ?? null;
    d.time.forEach((t, i) => {
      if (at("weather_code", i) === null) return;
      const [y, m, dd] = t.split("-").map(Number);
      days[LunarCal.jdFromDate(dd, m, y)] = { code: at("weather_code", i), tmax: at("temperature_2m_max", i), tmin: at("temperature_2m_min", i),
        rh: at("relative_humidity_2m_mean", i), pop: at("precipitation_probability_max", i), rain: at("precipitation_sum", i), wind: at("wind_speed_10m_max", i),
        uv: at("uv_index_max", i), rise: hm(at("sunrise", i)), set: hm(at("sunset", i)) };
    });
    const c = j.current;
    return { days, current: c && c.weather_code != null ? { code: c.weather_code, temp: c.temperature_2m, feels: c.apparent_temperature, rh: c.relative_humidity_2m, time: c.time } : null };
  }

  async function load(lat, lon) {
    const k = KEY + fix(lat) + "," + fix(lon);
    try { const c = JSON.parse(sessionStorage.getItem(k)); if (c && Date.now() - c.at < TTL) return { ...parse(c.json), at: c.at }; } catch { /* no cache */ }
    const r = await fetch(url(lat, lon));
    if (!r.ok) throw new Error("HTTP " + r.status);
    const json = await r.json(), at = Date.now(), out = parse(json);
    try { sessionStorage.setItem(k, JSON.stringify({ at, json })); } catch { /* storage blocked */ }
    return { ...out, at };
  }

  return { load, parse, url };
})();

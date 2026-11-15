// Open-Meteo response → days keyed by Julian day, WMO codes → icon/text, 34 provinces inside Vietnam's bounding box.
// Run: node --test src/vietnamese-lunar-calendar/tests/weather-open-meteo-parse.test.js
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.join(__dirname, "..");
const FILES = ["js/calendar/lunar-solar-conversion-ho-ngoc-duc.js", "js/i18n/weather-codes-and-vn-provinces-vi-en.js", "js/weather/open-meteo-daily-weather-client.js", "js/weather/open-meteo-history-and-statistics.js"];
const ctx = vm.createContext({ I18n: { add() {} }, URLSearchParams });
vm.runInContext(FILES.map(f => fs.readFileSync(path.join(root, f), "utf8")).join("\n;\n") + "\n;globalThis.M = { LunarCal, WeatherText, Weather, WeatherHistory, WxStats };", ctx);
const { LunarCal, WeatherText, Weather, WeatherHistory, WxStats } = ctx.M;

test("parse: daily arrays map to Julian days, null weather codes are skipped, current is kept", () => {
  const r = Weather.parse({
    daily: { time: ["2026-11-15", "2026-11-16", "2026-12-01"], weather_code: [3, 61, null], temperature_2m_max: [31.4, 29, null],
      temperature_2m_min: [24.6, 23, null], relative_humidity_2m_mean: [80, 88, null], precipitation_probability_max: [null, 70, null] },
    current: { time: "2026-11-15T23:30", temperature_2m: 26, apparent_temperature: 29, relative_humidity_2m: 85, weather_code: 2 },
  });
  const jd = LunarCal.jdFromDate(15, 11, 2026);
  assert.deepEqual(Object.keys(r.days).map(Number), [jd, jd + 1]);
  assert.deepEqual({ ...r.days[jd] }, { code: 3, tmax: 31.4, tmin: 24.6, rh: 80, pop: null, rain: null, wind: null, uv: null, rise: null, set: null });
  assert.equal(Weather.parse({ daily: { time: ["2026-11-15"], weather_code: [0], sunrise: ["2026-11-15T05:52"] } }).days[jd].rise, "05:52");
  assert.equal(r.current.temp, 26);
  assert.throws(() => Weather.parse({ error: true }));
});

test("place name: locality + province, deduplicated, null when empty", () => {
  assert.equal(Weather.nameOf({ locality: "Hoàn Kiếm", principalSubdivision: "Hà Nội" }), "Hoàn Kiếm, Hà Nội");
  assert.equal(Weather.nameOf({ locality: "Hà Nội", principalSubdivision: "Hà Nội" }), "Hà Nội");
  assert.equal(Weather.nameOf({ locality: "", city: "Đà Lạt" }), "Đà Lạt");
  assert.equal(Weather.nameOf({}), null);
});

test("WMO codes: clear / overcast / rain / storm, unknown code falls back", () => {
  assert.equal(WeatherText.code(0).text, "Trời đẹp");
  assert.equal(WeatherText.code(3).text, "Nhiều mây");
  assert.equal(WeatherText.code(63).icon, "🌧️");
  assert.equal(WeatherText.code(95).text, "Dông");
  assert.equal(WeatherText.code(42).text, "Không rõ");
});

test("provinces: 34 unique ids inside Vietnam, URL rounds coordinates and asks for 92 past + 16 forecast days", () => {
  const P = WeatherText.PROVINCES;
  assert.equal(P.length, 34);
  assert.equal(new Set(P.map(p => p.id)).size, 34);
  for (const p of P) assert.ok(p.lat > 8 && p.lat < 23.5 && p.lon > 102 && p.lon < 110, p.id);
  const u = new URL(Weather.url(10.7769, 106.7009));
  assert.equal(u.searchParams.get("latitude"), "10.78");
  assert.equal(u.searchParams.get("past_days"), "92");
  assert.equal(u.searchParams.get("forecast_days"), "16");
});

test("history stats: summary, monthly, yearly, climatology, trend", () => {
  const days = WeatherHistory.parse({ daily: { time: ["2024-01-01", "2024-01-02", "2024-02-01", "2025-01-01", "2025-01-02"],
    temperature_2m_max: [30, 32, 28, 34, null], temperature_2m_min: [20, 22, 18, 24, 25], precipitation_sum: [0, 5, 2, 10, 0], relative_humidity_2m_mean: [70, 80, 90, 60, 60] } });
  assert.equal(days.length, 4);
  const s = WxStats.summary(days);
  assert.equal(s.hot.tmax, 34); assert.equal(s.cold.tmin, 18); assert.equal(s.rain, 17); assert.equal(s.rainy, 3);
  assert.equal(JSON.stringify(WxStats.monthly(days).map(m => [m.y, m.m, m.n])), JSON.stringify([[2024, 1, 2], [2024, 2, 1], [2025, 1, 1]]));
  assert.equal(JSON.stringify(WxStats.yearly(days).map(y => [y.y, y.rain])), "[[2024,7],[2025,10]]");
  const jan = WxStats.climatology(days)[0];
  assert.equal(jan.rain, 7.5);
  const t = WxStats.trend([2000, 2001, 2002], [26, 26.5, 27]);
  assert.ok(Math.abs(t.slope - 0.5) < 1e-9 && Math.abs(t.at(2003) - 27.5) < 1e-9);
});

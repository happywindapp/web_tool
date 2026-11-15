// IndexCardSvg (pure): minute bars → last two sessions, SVG chart with reference split and hover points. Run: node --test src/vn-stock-price-board/tests/*.test.js
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const ctx = vm.createContext({});
vm.runInContext(fs.readFileSync(path.join(__dirname, "../js/model/index-intraday-card-svg.js"), "utf8") + "\n;globalThis.S = IndexCardSvg;", ctx);
const S = ctx.S;
// Three trading days (UTC 02:00 = 09:00 Vietnam), one bar per minute 09:00–11:30 and 13:00–14:45.
const day0 = Date.UTC(2026, 10, 11) / 1000, bars = [];
for (let d = 0; d < 3; d++) for (const [a, b] of [[540, 690], [780, 885]]) for (let m = a; m < b; m++) bars.push({ time: day0 + d * 86400 + (m - 420) * 60, close: 1700 + d * 5 + Math.sin(m / 9) * 4, volume: 1000 });

test("keeps the last two sessions in Vietnam minutes", () => {
  const ss = S.sessions(bars);
  assert.equal(ss.length, 2);
  assert.equal(ss[1].day, S.vnDay(day0 + 2 * 86400 + 3600));
  assert.equal(ss[1].pts[0].m, 540);
  assert.equal(ss[1].pts[ss[1].pts.length - 1].m, 884);
  assert.equal(S.hm(570), "09:30");
});

test("chart splits the latest session at the reference and returns hover points", () => {
  const ss = S.sessions(bars), ref = ss[0].pts[ss[0].pts.length - 1].v, c = S.chart(ss, ref, "t");
  assert.match(c.svg, /class="pl prev"/); assert.match(c.svg, /clip-path="url\(#ta\)"/); assert.match(c.svg, /class="refline"/);
  assert.doesNotMatch(c.svg, /NaN|undefined|Infinity/);
  assert.equal(c.pts.length, ss[0].pts.length + ss[1].pts.length);
  assert.ok(c.pts.every((p, i) => p.x >= 0 && p.x <= S.W && (!i || c.pts[i - 1].x <= p.x)));
  assert.doesNotMatch(S.chart([], 1700, "e").svg, /NaN/);
  assert.match(S.chart(S.sessions(bars, 1), 1700, "o").svg, />13:00</);
});

// WatchFile (pure): export JSON round trip, plain text / CSV import. Run: node --test src/vn-stock-price-board/tests/*.test.js
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const ctx = vm.createContext({});
vm.runInContext(["watchlist-symbol-parser.js", "watchlist-file-format.js"].map(f => fs.readFileSync(path.join(__dirname, "../js/model", f), "utf8")).join("\n;\n") + "\n;globalThis.W = WatchFile;", ctx);
const W = ctx.W;
const plain = v => JSON.parse(JSON.stringify(v));

test("export → import round trip keeps tickers, their notes and alerts only", () => {
  const json = W.build({ watch: ["FPT", "VNM"], notes: { FPT: { text: "x", target: 60 }, HPG: { text: "other", target: 30 } },
    alerts: [{ id: "a", sym: "VNM", type: "above", value: 70, fired: "20261114" }, { id: "b", sym: "HPG", type: "below", value: 20 }], now: new Date("2026-11-14T00:00:00Z") });
  const obj = JSON.parse(json);
  assert.equal(obj.app, "vn-stock-price-board");
  assert.deepEqual(Object.keys(obj.notes), ["FPT"]);
  assert.deepEqual(obj.alerts, [{ sym: "VNM", type: "above", value: 70 }]);
  const r = W.parse(json);
  assert.deepEqual(plain(r.symbols), ["FPT", "VNM"]);
  assert.equal(r.json, true);
  assert.equal(r.notes.FPT.target, 60);
  assert.equal(r.alerts.length, 1);
});

test("import: JSON array, plain text, CSV first column, BOM, bad input", () => {
  assert.deepEqual(plain(W.parse('["vnm","FPT","bad!"]').symbols), ["VNM", "FPT"]);
  assert.deepEqual(plain(W.parse("vnm fpt\nHPG").symbols), ["VNM", "FPT", "HPG"]);
  const csv = "﻿Mã,Trần,Sàn,TC\nVNM,58.30,50.70,54.50\nFPT,53.00,46.10,133730\n\"HPG\",22.8,19.9,21.35";
  const r = W.parse(csv);
  assert.deepEqual(plain(r.symbols), ["VNM", "FPT", "HPG"]);
  assert.deepEqual(plain(r.bad), ["Mã"]);
  assert.deepEqual(plain(W.parse("{not json VNM").symbols), ["JSON", "VNM"]);
  assert.throws(() => W.parse("   "));
  assert.deepEqual(plain(W.parse('{"watch": 5}').symbols), []);
});

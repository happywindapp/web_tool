// Pure BtcFlow (no DOM, no network). Run: node --test src/crypto-market-board/tests/btc-address-flow-math.test.js
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const ctx = vm.createContext({});
vm.runInContext(fs.readFileSync(path.join(__dirname, "../js/model/btc-address-flow-math.js"), "utf8") + "\n;globalThis.M = { BtcFlow };", ctx);
const { BtcFlow: F } = ctx.M;
const plain = v => JSON.parse(JSON.stringify(v));

const GENESIS = "1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa";
const P2WPKH = "bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4";
const P2WSH = "bc1qrp33g0q5c5txsp9arysrx4k6zdkfs4nce4xj0gdcccefvpysxf3qccfmv3";
const P2TR = "bc1p0xlxvlhemja6c4dqv22uapctqupfhlxm9h8z3k2e72q4k9hcz7vqzk5jj0";

test("addrType: mainnet types accepted, testnet / garbage / bad checksum rejected", () => {
  assert.equal(F.addrType(GENESIS), "P2PKH");
  assert.equal(F.addrType("3J98t1WpEZ73CNmQviecrnyiWrnqRhWNLy"), "P2SH");
  assert.equal(F.addrType(P2WPKH), "P2WPKH");
  assert.equal(F.addrType(P2WSH), "P2WSH");
  assert.equal(F.addrType(P2TR), "P2TR");
  for (const bad of ["", "hello", "tb1qw508d6qejxtdg4y5r3zarvary0c5xw7kxpjzsx", "mipcBbFg9gMiCh81Kj8tqqdgoZub1ZJRfn", "bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t5", "0x52908400098527886E0F7030069857D2E4169EE7", null, 5])
    assert.equal(F.addrType(bad), "", String(bad));
});

test("normalize: trims, upper-case bech32 → lower, mixed case rejected", () => {
  assert.equal(F.normalize("  " + P2WPKH + "\n"), P2WPKH);
  assert.equal(F.normalize(P2WPKH.toUpperCase()), P2WPKH);
  assert.equal(F.normalize("bc1qW508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4"), "");
  assert.equal(F.normalize(P2TR.toUpperCase()), P2TR);
});

test("balance: chain minus spent, mempool delta, tolerant of missing fields", () => {
  const b = F.balance({ chain_stats: { funded_txo_sum: 500, spent_txo_sum: 200, tx_count: 4 }, mempool_stats: { funded_txo_sum: 10, spent_txo_sum: 40, tx_count: 1 } });
  assert.deepEqual(plain(b), { confirmed: 300, received: 500, sent: 200, txCount: 4, unconfirmed: -30, mempoolTx: 1 });
  assert.equal(F.balance(null).confirmed, 0);
});

const A = "1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa", B = P2WPKH;
const vin = (addr, value) => ({ prevout: { scriptpubkey_address: addr, value } });
const vout = (addr, value) => ({ scriptpubkey_address: addr, value });

test("txNet / txDirection: in, out (with change), self, consolidation", () => {
  const recv = { vin: [vin(B, 1000)], vout: [vout(A, 900), vout(B, 90)] };
  assert.equal(F.txNet(recv, A), 900);
  assert.equal(F.txDirection(recv, A), "in");
  const send = { vin: [vin(A, 1000)], vout: [vout(B, 700), vout(A, 250)] };
  assert.equal(F.txNet(send, A), -750);
  assert.equal(F.txDirection(send, A), "out");
  const self = { vin: [vin(A, 1000)], vout: [vout(A, 990)] };
  assert.equal(F.txNet(self, A), -10);
  assert.equal(F.txDirection(self, A), "self");
  const cons = { vin: [vin(A, 100), vin(B, 500)], vout: [vout(A, 590), vout(B, 5)] };
  assert.equal(F.txDirection(cons, A), "in");
  assert.equal(F.txDirection({ vin: [{ is_coinbase: true }], vout: [vout(A, 5000)] }, A), "in");
});

test("counterparty: biggest other-side address, empty when none", () => {
  assert.equal(F.counterparty({ vin: [vin(B, 1000)], vout: [vout(A, 900)] }, A), B);
  assert.equal(F.counterparty({ vin: [vin(A, 1000)], vout: [vout(A, 250), vout(B, 700)] }, A), B);
  assert.equal(F.counterparty({ vin: [{ is_coinbase: true }], vout: [vout(A, 5000)] }, A), "");
});

test("confirmations, mergeTxs", () => {
  assert.equal(F.confirmations({ status: { confirmed: true, block_height: 100 } }, 105), 6);
  assert.equal(F.confirmations({ status: { confirmed: false } }, 105), 0);
  assert.deepEqual(plain(F.mergeTxs([{ txid: "a" }], [{ txid: "a" }, { txid: "b" }])), [{ txid: "a" }, { txid: "b" }]);
});

const UTX = { hash: "ab".repeat(32), time: 1700000000, inputs: [{ prev_out: { addr: A, value: 6e9 } }, { prev_out: { addr: A, value: 1e9 } }, { prev_out: { addr: B, value: 5e8 } }, {}],
  out: [{ addr: B, value: 5e9 }, { addr: A, value: 2.4e9 }, { addr: null, value: 0 }] };

test("summariseUtx: totals, per-address grouping, biggest first, bad input", () => {
  const s = F.summariseUtx(UTX);
  assert.equal(s.totalOut, 7.4e9);
  assert.equal(s.totalIn, 7.5e9);
  assert.equal(s.time, 1700000000000);
  assert.deepEqual(plain(s.inputs), [{ addr: A, value: 7e9 }, { addr: B, value: 5e8 }]);
  assert.deepEqual(plain(s.outputs[0]), { addr: B, value: 5e9 });
  assert.equal(s.addrCount, 2);
  assert.equal(F.summariseUtx(null), null);
  assert.equal(F.summariseUtx({ hash: "x" }), null);
});

test("isWhale threshold in BTC (inclusive)", () => {
  const s = F.summariseUtx(UTX);
  assert.ok(F.isWhale(s, 50));
  assert.ok(F.isWhale(s, 74));
  assert.ok(!F.isWhale(s, 75));
  assert.ok(!F.isWhale(null, 10));
});

test("btc: sats → trimmed 8-decimal string, grouping, sign", () => {
  assert.equal(F.btc(0), "0");
  assert.equal(F.btc(1), "0.00000001");
  assert.equal(F.btc(150000000), "1.5");
  assert.equal(F.btc(123456789012), "1,234.56789012");
  assert.equal(F.btc(-250000000), "-2.5");
  assert.equal(F.btc(250000000, { sign: true }), "+2.5");
  assert.equal(F.btc(0, { sign: true }), "0");
  assert.equal(F.btc(NaN), "");
});

test("labelOf: Map lookup only", () => {
  const m = new Map([[A, { label: "Genesis", tag: "other" }]]);
  assert.equal(F.labelOf(m, A).label, "Genesis");
  assert.equal(F.labelOf(m, B), null);
  assert.equal(F.labelOf(null, A), null);
});

test("cleanBook: validates, trims, dedupes, caps, tags default to other", () => {
  const raw = [{ addr: A, label: "  Satoshi ", tag: "whale" }, { addr: A, label: "dup" }, { addr: "junk", label: "x" }, { addr: B, label: "" }, { addr: B.toUpperCase(), label: "L".repeat(99), tag: "<b>" }, null, 7];
  const out = plain(F.cleanBook(raw));
  assert.deepEqual(out, [{ addr: A, label: "Satoshi", tag: "whale" }, { addr: B, label: "L".repeat(40), tag: "other" }]);
  assert.deepEqual(plain(F.cleanBook("x")), []);
  assert.equal(F.cleanBook(Array.from({ length: 300 }, (_, i) => ({ addr: "1" + "A".repeat(24) + String.fromCharCode(97 + (i >> 4)) + String.fromCharCode(97 + (i & 15)) + "BC", label: "n" }))).length, 200);
});

test("isTxid / short", () => {
  assert.ok(F.isTxid("a".repeat(64)));
  assert.ok(!F.isTxid("g".repeat(64)) && !F.isTxid("a".repeat(63)));
  assert.equal(F.short(GENESIS), "1A1zP1…DivfNa".slice(0, 7) + GENESIS.slice(-4));
  assert.equal(F.short("abc"), "abc");
});

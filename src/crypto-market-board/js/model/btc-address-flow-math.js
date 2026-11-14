// Pure Bitcoin wallet math: address shape + type, balances, per-address tx flow, mempool tx summary, whale filter, address-book validation.
const BtcFlow = (() => {
  const SAT = 1e8, MAX_BOOK = 200;
  const TAGS = ["exchange", "whale", "fund", "mine", "other"];
  const CH = "qpzry9x8gf2tvdw0s3jn54khce6mua7l";
  const BASE58 = /^[13][1-9A-HJ-NP-Za-km-z]{25,34}$/;

  function bech32Ok(s) {
    const i = s.lastIndexOf("1"), data = [];
    for (const c of s.slice(i + 1)) { const v = CH.indexOf(c); if (v < 0) return false; data.push(v); }
    if (data.length < 7 || s.slice(0, i) !== "bc") return false;
    const G = [0x3b6a57b2, 0x26508e6d, 0x1ea119fa, 0x3d4233dd, 0x2a1462b3];
    let chk = 1;
    for (const v of [3, 3, 0, 2, 3, ...data]) {
      const top = chk >>> 25;
      chk = ((chk & 0x1ffffff) << 5) ^ v;
      for (let k = 0; k < 5; k++) if ((top >>> k) & 1) chk ^= G[k];
    }
    const ver = data[0];
    return chk === (ver === 0 ? 1 : 0x2bc830a3) && ver <= 16;
  }

  // "1…"/"3…" shape-checked only (no base58 checksum); "bc1…" fully checksummed. Returns the address (bech32 lower-cased) or "".
  function normalize(raw) {
    const s = typeof raw === "string" ? raw.trim() : "";
    if (BASE58.test(s)) return s;
    if (s.length < 14 || s.length > 90 || (s !== s.toLowerCase() && s !== s.toUpperCase())) return "";
    const a = s.toLowerCase();
    return a.startsWith("bc1") && /^[a-z0-9]+$/.test(a) && bech32Ok(a) ? a : "";
  }

  function addrType(addr) {
    const a = normalize(addr);
    if (!a) return "";
    if (a[0] === "1") return "P2PKH";
    if (a[0] === "3") return "P2SH";
    if (a.startsWith("bc1p")) return a.length === 62 ? "P2TR" : "";
    if (a.startsWith("bc1q")) return a.length === 42 ? "P2WPKH" : a.length === 62 ? "P2WSH" : "";
    return "";
  }

  const n = v => Number.isFinite(+v) ? +v : 0;
  const sum = arr => arr.reduce((s, x) => s + n(x), 0);

  function balance(info) {
    const c = (info && info.chain_stats) || {}, m = (info && info.mempool_stats) || {};
    const received = n(c.funded_txo_sum), sent = n(c.spent_txo_sum);
    return { confirmed: received - sent, received, sent, txCount: n(c.tx_count), unconfirmed: n(m.funded_txo_sum) - n(m.spent_txo_sum), mempoolTx: n(m.tx_count) };
  }

  const ins = (tx, addr) => (tx.vin || []).filter(i => i && i.prevout && i.prevout.scriptpubkey_address === addr);
  const outs = (tx, addr) => (tx.vout || []).filter(o => o && o.scriptpubkey_address === addr);

  const txNet = (tx, addr) => sum(outs(tx, addr).map(o => o.value)) - sum(ins(tx, addr).map(i => i.prevout.value));

  function txDirection(tx, addr) {
    const fromMe = ins(tx, addr).length > 0, toMe = outs(tx, addr).length > 0;
    if (fromMe && !toMe) return "out";
    if (!fromMe) return "in";
    if ((tx.vout || []).every(o => o.scriptpubkey_address === addr)) return "self";
    return txNet(tx, addr) < 0 ? "out" : "in";
  }

  // Biggest address on the other side of a tx from `addr`'s point of view ("" when none, e.g. coinbase / OP_RETURN).
  function counterparty(tx, addr) {
    const incoming = txDirection(tx, addr) === "in";
    const side = incoming ? group((tx.vin || []).map(i => i && i.prevout).filter(Boolean), p => p.value, p => p.scriptpubkey_address)
      : group(tx.vout || [], o => o.value, o => o.scriptpubkey_address);
    const hit = side.find(x => x.addr !== addr);
    return hit ? hit.addr : "";
  }

  const confirmations = (tx, tip) => tx && tx.status && tx.status.confirmed && n(tip) > 0 ? Math.max(1, n(tip) - n(tx.status.block_height) + 1) : 0;

  function mergeTxs(a, b) {
    const seen = new Set(a.map(t => t.txid));
    return a.concat(b.filter(t => t && !seen.has(t.txid)));
  }

  function group(list, valueOf, addrOf) {
    const m = new Map();
    for (const e of list) { const a = addrOf(e), v = n(valueOf(e)); if (a) m.set(a, (m.get(a) || 0) + v); }
    return [...m].map(([addr, value]) => ({ addr, value })).sort((x, y) => y.value - x.value);
  }

  // blockchain.info "utx" message → { hash, time(ms), totalOut/totalIn (sats), inputs/outputs (per address, biggest first), addrCount } or null.
  function summariseUtx(x) {
    if (!x || typeof x.hash !== "string" || !Array.isArray(x.out)) return null;
    const inp = (x.inputs || []).map(i => i && i.prev_out).filter(Boolean);
    const inputs = group(inp, p => p.value, p => p.addr), outputs = group(x.out, o => o.value, o => o.addr);
    return {
      hash: x.hash, time: n(x.time) > 0 ? n(x.time) * 1000 : 0, totalOut: sum(x.out.map(o => o && o.value)), totalIn: sum(inp.map(p => p.value)),
      inputs, outputs, addrCount: new Set([...inputs, ...outputs].map(e => e.addr)).size,
    };
  }

  const isWhale = (s, thresholdBtc) => !!s && s.totalOut >= thresholdBtc * SAT;

  const labelOf = (book, addr) => (book && typeof book.get === "function" && book.get(addr)) || null;

  function btc(sats, opt = {}) {
    if (!Number.isFinite(+sats)) return "";
    const v = Math.round(Math.abs(+sats)), whole = Math.floor(v / SAT), frac = String(v % SAT).padStart(8, "0").replace(/0+$/, "");
    const body = whole.toLocaleString("en-US") + (frac ? "." + frac : "");
    return (+sats < 0 ? "-" : opt.sign && v > 0 ? "+" : "") + body;
  }

  const isTxid = s => typeof s === "string" && /^[0-9a-f]{64}$/i.test(s);

  // Untrusted storage / imported JSON → [{ addr, label, tag }] (valid, unique, ≤ 200).
  function cleanBook(raw) {
    const out = [], seen = new Set();
    for (const e of Array.isArray(raw) ? raw : []) {
      const addr = e && normalize(e.addr), label = e && typeof e.label === "string" ? e.label.trim().slice(0, 40) : "";
      if (!addr || !label || seen.has(addr)) continue;
      seen.add(addr);
      out.push({ addr, label, tag: TAGS.includes(e.tag) ? e.tag : "other" });
      if (out.length >= MAX_BOOK) break;
    }
    return out;
  }

  const short = (a, k = 6) => a.length > 2 * k + 3 ? `${a.slice(0, k)}…${a.slice(-4)}` : a;

  return { SAT, MAX_BOOK, TAGS, normalize, addrType, balance, txNet, txDirection, counterparty, confirmations, mergeTxs, summariseUtx, isWhale, labelOf, btc, isTxid, cleanBook, short };
})();

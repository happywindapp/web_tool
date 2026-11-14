// Bitcoin network + long-history data: blockchain.info daily charts (price, miner revenue, supply), mempool.space status, Fear & Greed history.
const BtcData = (() => {
  const BC = "https://api.blockchain.info/charts/", MP = "https://mempool.space/api";
  const DAY = 86400;
  const pts = j => ((j && j.values) || []).map(p => ({ t: p.x, v: p.y }));
  const chart = (name, extra = "") => Http.json(`${BC}${name}?timespan=all&format=json&cors=true${extra}`, { ttl: 3600e3, timeout: 45000 }).then(pts);

  // blockchain.info can lag a day or two; top up with Binance daily closes.
  async function topUp(price) {
    const last = price.length ? price[price.length - 1].t : 0;
    if (Date.now() / 1000 - last < 2 * DAY) return price;
    try {
      const k = await Http.json("https://api.binance.com/api/v3/klines?symbol=BTCUSDT&interval=1d&limit=10", { ttl: 600e3 });
      const extra = k.map(r => ({ t: Math.floor(r[0] / 1000 / DAY) * DAY, v: +r[4] })).filter(p => p.t > last && p.v > 0);
      return price.concat(extra);
    } catch { return price; }
  }

  async function history() {
    const [price, rev, supply] = await Promise.all([chart("market-price", "&sampled=false"), chart("miners-revenue", "&sampled=false"), chart("total-bitcoins")]);
    return { price: await topUp(price), rev, supply };
  }

  async function network() {
    const o = { ttl: 60e3, timeout: 20000 };
    const [height, adj, fees, hr, blocks] = await Promise.all([
      Http.json(`${MP}/blocks/tip/height`, o), Http.json(`${MP}/v1/difficulty-adjustment`, o), Http.json(`${MP}/v1/fees/recommended`, o),
      Http.json(`${MP}/v1/mining/hashrate/3y`, { ttl: 3600e3, timeout: 30000 }), Http.json(`${MP}/v1/blocks`, o),
    ]);
    return {
      height: +height, adj, fees,
      hashNow: hr.currentHashrate, diffNow: hr.currentDifficulty,
      hash: (hr.hashrates || []).map(h => ({ t: h.timestamp, v: h.avgHashrate })),
      difficulty: (hr.difficulty || []).map(d => ({ t: d.time || d.timestamp, v: d.difficulty })),
      blocks: (blocks || []).map(b => ({ height: b.height, t: b.timestamp, tx: b.tx_count, size: b.size, pool: b.extras && b.extras.pool ? b.extras.pool.name : "" })),
    };
  }

  const fearGreed = () => FearGreed.history(0).then(l => l.map(x => ({ t: Math.floor(x.t / 1000), v: x.v, label: x.label })));

  return { history, network, fearGreed };
})();

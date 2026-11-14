// Pure DeFi maths: parent grouping, fees + revenue + market-cap joins, P/F and P/S, category / chain aggregates, stablecoin changes.
const DefiMetrics = (() => {
  const pos = n => Number.isFinite(n) && n > 0;
  const num = n => Number.isFinite(n) ? n : 0;
  const pctOf = (cur, prev) => pos(prev) && Number.isFinite(cur) ? (cur / prev - 1) * 100 : null;
  const ratio = (a, b) => pos(a) && pos(b) ? a / b : null;
  const annual = (y1, d30) => pos(y1) ? y1 : pos(d30) ? d30 * 365 / 30 : 0;
  const uniq = lists => [...new Set(lists.flat())];

  function parentName(key) {
    return String(key).replace(/^parent#/, "").split("-").filter(Boolean).map(w => w[0].toUpperCase() + w.slice(1)).join(" ");
  }
  function commonName(kids) {
    const w = kids.map(k => String(k.name).split(" ")), n = [];
    for (let i = 0; i < w[0].length && w.every(x => x[i] === w[0][i]); i++) n.push(w[0][i]);
    return n.join(" ");
  }
  const groupKey = r => r.parent || "id:" + r.id;

  // Merge protocol rows sharing a parent; sum fields summed, the largest child lends category / symbol / name.
  function group(rows, sumKeys) {
    const m = new Map();
    for (const r of rows) { const k = groupKey(r); if (!m.has(k)) m.set(k, []); m.get(k).push(r); }
    return [...m].map(([key, kids]) => {
      const lead = [...kids].sort((a, b) => num(b[sumKeys[0]]) - num(a[sumKeys[0]]))[0];
      const out = { key, parent: lead.parent || null, id: lead.id, slug: lead.slug, kids: kids.length, category: lead.category,
        chains: uniq(kids.map(k => k.chains || [])), name: kids.length > 1 && lead.parent ? commonName(kids) || parentName(lead.parent) : lead.name,
        symbol: (kids.find(k => k.symbol && k.symbol !== "-") || {}).symbol || "", mcap: Math.max(0, ...kids.map(k => num(k.mcap))) || null };
      for (const s of sumKeys) out[s] = kids.reduce((t, k) => t + num(k[s]), 0);
      return out;
    });
  }

  // TVL rows (slim /protocols) → groups with tvl, 1d / 7d change from implied previous TVL, mcap / TVL.
  function protocolGroups(list, { cex = false } = {}) {
    const rows = list.filter(p => cex || p.category !== "CEX").map(p => ({ ...p, p1: p.change_1d > -100 ? num(p.tvl) / (1 + num(p.change_1d) / 100) : 0, p7: p.change_7d > -100 ? num(p.tvl) / (1 + num(p.change_7d) / 100) : 0 }));
    return group(rows, ["tvl", "p1", "p7"]).map(g => ({ ...g, c1: pctOf(g.tvl, g.p1), c7: pctOf(g.tvl, g.p7), mcapTvl: ratio(g.mcap, g.tvl) }));
  }

  function protoIndex(list) {
    const byId = new Map(), bySlug = new Map(), byName = new Map(), parentMcap = new Map(), parentSym = new Map();
    for (const p of list) {
      byId.set(String(p.id), p); bySlug.set(p.slug, p); byName.set(String(p.name).toLowerCase(), p);
      if (!p.parentProtocol) continue;
      if (pos(p.mcap) && !parentMcap.has(p.parentProtocol)) parentMcap.set(p.parentProtocol, p.mcap);
      if (p.symbol && !parentSym.has(p.parentProtocol)) parentSym.set(p.parentProtocol, p.symbol);
    }
    return r => {
      const hit = byId.get(String(r.id)) || bySlug.get(r.slug) || byName.get(String(r.name).toLowerCase()) || {};
      return { mcap: pos(hit.mcap) ? hit.mcap : r.parent && parentMcap.get(r.parent) || null, symbol: hit.symbol || r.parent && parentSym.get(r.parent) || "" };
    };
  }

  // fees / revenue: [{ id, name, slug, symbol?, category, chains, parent, d1, d7, d30, y1 }] → one row per project with P/F and P/S.
  function revenueRows(fees, revenue, protocols, mcapOf) {
    const find = protoIndex(protocols), rev = new Map(revenue.map(r => [String(r.id), r]));
    const rows = fees.map(f => { const r = rev.get(String(f.id)) || {}, m = find(f);
      return { ...f, symbol: m.symbol, mcap: m.mcap || (m.symbol && mcapOf ? mcapOf(m.symbol) : null), r1: num(r.d1), r7: num(r.d7), r30: num(r.d30), ry: num(r.y1) }; });
    return group(rows, ["d30", "d1", "d7", "y1", "r1", "r7", "r30", "ry"]).map(g => {
      const fAnn = annual(g.y1, g.d30), rAnn = annual(g.ry, g.r30);
      return { ...g, f1: g.d1, f7: g.d7, f30: g.d30, fAnn, rAnn, share: pos(g.d30) ? Math.min(100, g.r30 / g.d30 * 100) : null, pf: ratio(g.mcap, fAnn), ps: ratio(g.mcap, rAnn) };
    }).filter(g => g.f30 > 0 || g.r30 > 0);
  }

  function dexRows(list) {
    const rows = list.map(r => ({ ...r, p1: num(r.p1) }));
    const gs = group(rows, ["d1", "d7", "d30", "p1"]), total = gs.reduce((t, g) => t + g.d1, 0);
    return gs.filter(g => g.d1 > 0 || g.d7 > 0).map(g => ({ ...g, c1: pctOf(g.d1, g.p1), share: total > 0 ? g.d1 / total * 100 : null }));
  }

  const chainRows = chains => {
    const total = chains.reduce((t, c) => t + num(c.tvl), 0);
    return chains.filter(c => pos(c.tvl)).map(c => ({ ...c, share: total > 0 ? c.tvl / total * 100 : null }));
  };

  function categoryRows(groups) {
    const m = new Map();
    for (const g of groups) {
      const c = m.get(g.category) || { category: g.category, tvl: 0, p7: 0, count: 0 };
      c.tvl += g.tvl; c.p7 += g.p7; c.count++; m.set(g.category, c);
    }
    return [...m.values()].map(c => ({ ...c, c7: pctOf(c.tvl, c.p7) })).sort((a, b) => b.tvl - a.tvl);
  }

  const stableRows = list => list.map(s => ({ ...s, c1: pctOf(s.cur, s.d1), c7: pctOf(s.cur, s.d7), c30: pctOf(s.cur, s.d30) }));
  function stableTotals(list) {
    const t = { cur: 0, d1: 0, d7: 0, d30: 0 };
    for (const s of list) { t.cur += num(s.cur); t.d1 += num(s.d1) || num(s.cur); t.d7 += num(s.d7) || num(s.cur); t.d30 += num(s.d30) || num(s.cur); }
    return { ...t, c1: pctOf(t.cur, t.d1), c7: pctOf(t.cur, t.d7), c30: pctOf(t.cur, t.d30) };
  }

  const sortRows = (rows, key, dir = -1) => [...rows].sort((a, b) => {
    const x = a[key], y = b[key], nx = x == null || Number.isNaN(x), ny = y == null || Number.isNaN(y);
    if (nx || ny) return nx === ny ? 0 : nx ? 1 : -1;
    return typeof x === "string" ? dir * x.localeCompare(y) : dir * (x - y);
  });

  // Last point of a [{ time, value }] series versus the point ~days earlier.
  function seriesChange(series, days) {
    if (!series.length) return null;
    const last = series[series.length - 1], from = series.findLast(p => p.time <= last.time - days * 86400);
    return from ? pctOf(last.value, from.value) : null;
  }

  return { pctOf, ratio, annual, parentName, protocolGroups, revenueRows, dexRows, chainRows, categoryRows, stableRows, stableTotals, sortRows, seriesChange };
})();

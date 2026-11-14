// DeFi tab table kit: cell formatters, per-table column sets (rebuilt on every render so T() follows the language) and the sortable table markup.
const DefiTables = (() => {
  const e = Dom.esc, dash = `<span class="muted">–</span>`;
  const usd = v => v > 0 ? e(Fmt.moneyBig(v)) : dash;
  const pc = v => v == null ? dash : `<span class="${Fmt.tone(v)}">${e(Fmt.pct(v, 1))}</span>`;
  const plain = (v, d = 1) => v == null ? dash : e(Fmt.en(v, d));
  const mult = v => v == null ? dash : e(Fmt.en(v, v < 100 ? 1 : 0));
  const txt = v => v ? e(v) : dash;
  const name = (r, i) => `<span class="df-rk">${i + 1}</span>` + (r.symbol ? `<span class="df-name" data-coin="${e(r.symbol)}">${e(r.name)}</span> <small class="muted">${e(r.symbol)}</small>` : `<span class="df-nm">${e(r.name)}</span>`);
  const col = (k, label, html, o = {}) => ({ k, label, html, ...o });
  const nameCol = label => col("name", label, name, { left: 1 });
  const cat = col("category", "", r => txt(r.category), { tx: 1 });

  const COLS = {
    chains: () => [nameCol("Chain"), col("tvl", "TVL", r => usd(r.tvl)), col("share", T("Thị phần"), r => plain(r.share, 2) + (r.share == null ? "" : "%"))],
    protocols: () => [nameCol(T("Giao thức")), { ...cat, label: T("Danh mục") }, col("nch", "Chains", r => e(Fmt.en(r.chains.length))), col("tvl", "TVL", r => usd(r.tvl)),
      col("c1", "1d", r => pc(r.c1)), col("c7", "7d", r => pc(r.c7)), col("mcap", T("Vốn hóa"), r => usd(r.mcap)), col("mcapTvl", "MCap/TVL", r => plain(r.mcapTvl, 2))],
    revenue: () => [nameCol(T("Giao thức")), { ...cat, label: T("Danh mục") }, col("f1", T("Phí 24h"), r => usd(r.f1)), col("f7", T("Phí 7d"), r => usd(r.f7)), col("f30", T("Phí 30d"), r => usd(r.f30)),
      col("r1", T("DT 24h"), r => usd(r.r1)), col("r30", T("DT 30d"), r => usd(r.r30)), col("rAnn", T("DT năm hóa"), r => usd(r.rAnn)), col("share", T("DT/Phí"), r => plain(r.share, 0) + (r.share == null ? "" : "%")),
      col("mcap", T("Vốn hóa"), r => usd(r.mcap)), col("pf", "P/F", r => mult(r.pf)), col("ps", "P/S", r => mult(r.ps))],
    dex: () => [nameCol("DEX"), { ...cat, label: T("Danh mục") }, col("d1", T("KL 24h"), r => usd(r.d1)), col("d7", T("KL 7d"), r => usd(r.d7)), col("d30", T("KL 30d"), r => usd(r.d30)),
      col("c1", "1d", r => pc(r.c1)), col("share", T("Thị phần"), r => plain(r.share, 1) + (r.share == null ? "" : "%"))],
    stable: () => [nameCol("Stablecoin"), col("peg", T("Neo giá"), r => txt(r.peg.replace(/^pegged/, "")), { tx: 1 }), col("mech", T("Cơ chế"), r => txt(r.mech), { tx: 1 }),
      col("cur", T("Nguồn cung"), r => usd(r.cur)), col("c1", "1d", r => pc(r.c1)), col("c7", "7d", r => pc(r.c7)), col("c30", "30d", r => pc(r.c30)), col("chains", "Chains", r => e(Fmt.en(r.chains)))],
  };

  const cls = c => c.left ? ' class="df-l"' : c.tx ? ' class="df-tx"' : "";
  function table(cols, rows, st) {
    const head = cols.map(c => `<th data-sort="${c.k}"${cls(c)}>${e(c.label)}${st.k === c.k ? (st.dir > 0 ? " ▲" : " ▼") : ""}</th>`).join("");
    const body = rows.map((r, i) => `<tr>${cols.map(c => `<td${cls(c)}>${c.html(r, i)}</td>`).join("")}</tr>`).join("");
    return `<div class="df-scroll"><table class="dtable df-t"><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table></div>`;
  }

  return { COLS, table, pc, usd };
})();

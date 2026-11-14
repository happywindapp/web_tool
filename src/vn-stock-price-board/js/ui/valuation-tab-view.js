// "Định giá" tab: load ratios + 5-year P/E–P/B history + annual statements + estimates + dividends, compute scores, keep DCF assumptions editable.
const ValTab = (() => {
  const PE = "PRICE_TO_EARNINGS", PB = "PRICE_TO_BOOK";
  const ymd = d => d.toISOString().slice(0, 10);
  const yearsAgo = n => { const d = new Date(); d.setUTCFullYear(d.getUTCFullYear() - n); return ymd(d); };

  async function load(sym) {
    // Only ratios + annual statements are essential; history / estimates / dividends fall back to empty on failure.
    const safe = (p, fb) => p.catch(err => { console.warn("ValTab.load - optional part fail", sym, err); return fb; });
    const [r, hist, annual, est, divs, peers] = await Promise.all([
      Finfo.ratios(sym), safe(Finfo.ratioHistory(sym, [PE, PB], yearsAgo(5)), { [PE]: [], [PB]: [] }),
      Finfo.items(sym, "ANNUAL", Health.CODES, `${new Date().getUTCFullYear() - 7}-01-01`),
      safe(Finfo.items(sym, "ESTIMATION", [21001, 421701, 23000], `${new Date().getUTCFullYear() - 1}-01-01`), []), safe(Finfo.dividends(sym), []), safe(loadPeers(sym), null),
    ]);
    const years = Health.byYear(annual), y0 = years[0];
    if (peers) peers.sym = sym;
    // Estimate for the year after the latest audited one; dividends summed per year, newest complete year first.
    const nextYear = y0 ? y0.year + 1 : new Date().getUTCFullYear(), estRows = Health.byYear(est).find(y => y.year === nextYear);
    const perYear = {};
    for (const d of divs) if (+d.divYear > 1990 && +d.dividend > 0) perYear[+d.divYear] = (perYear[+d.divYear] || 0) + +d.dividend;
    const divYears = y0 ? [0, 1, 2, 3].map(i => perYear[y0.year - i] || 0) : [];
    return { r, hist: { pe: hist[PE], pb: hist[PB] }, years, est: estRows ? { rev: estRows.v[21001] ?? estRows.v[421701] ?? null, np: estRows.v[23000] ?? null } : null,
      divs: divYears, dcf: Health.dcfInputs(years, r.OUTSTANDING_SHARES), peers, sym };
  }

  // Same ICB level-3 sector (level 2 when level 3 has < 3 tickers); reuses the whole-market ratios when already loaded.
  async function loadPeers(sym) {
    const sec = await Market.sectorsLoad(), mine = sec.of.get(sym);
    if (!mine) return null;
    const pick = [3, 2].map(l => sec.levels[l].find(x => x.code === mine[l])).find(g => g && g.codes.length >= 3);
    if (!pick) return null;
    const codes = pick.codes.slice(0, 300), all = Market.ratios(), m = all || await Market.ratiosFor(codes);
    const list = codes.map(c => ({ sym: c, ...(m.get(c) || {}) })).filter(x => x.mcap > 0).sort((a, b) => b.mcap - a.mcap);
    return { code: pick.code, list };
  }

  // Everything below is recomputed on render so DCF edits and live price changes apply without refetching.
  function compute(d, price) {
    const band = { pe: Valuation.band(d.hist.pe), pb: Valuation.band(d.hist.pb) };
    const dcf = d.dcf && d.dcf.fcf0 > 0 ? d.dcf : null;
    const fair = Valuation.fairValues({ price, eps: d.r.EPS_TR, bvps: d.r.BVPS_CR, peMedian: band.pe?.median, pbMedian: band.pb?.median, dcf });
    const pio = Health.piotroski(d.years), alt = Health.altman(d.years, d.r.MARKETCAP);
    const dims = Health.snowflake({ r: d.r, band, fair, years: d.years, est: d.est, divs: d.divs, pio, alt, price });
    return { band, fair, pio, alt, dims, dcf };
  }

  function html(d, price) {
    if (!d.years.length && !Object.keys(d.r).length) return TabHtml.empty(T("Chưa có dữ liệu định giá cho mã này."));
    const c = compute(d, price);
    return ValHtml.snowflake(c.dims) + ValHtml.fair(c.fair, c.dcf, price) + ValHtml.bands(d.hist, c.band) + ValHtml.health(c.pio, c.alt) + ValHtml.peers(d.peers, d.sym, I18n.lang)
      + `<p class="muted pad">${Dom.esc(T("Điểm tự tính từ BCTC năm và chỉ số của VNDirect; công thức ghi trong tài liệu tool."))}</p>`;
  }

  // DCF input edit → returns true when the data changed (caller re-renders).
  function edit(d, el) {
    const k = el.dataset.k, v = parseFloat(el.value);
    if (!d || !d.dcf || !["g", "wacc", "tg"].includes(k) || !Number.isFinite(v)) return false;
    const next = { ...d.dcf, [k]: Math.max(k === "wacc" ? 1 : -10, Math.min(40, v)) };
    next.tg = Math.min(next.tg, next.wacc - 0.5);
    d.dcf = next;
    return true;
  }

  return { load, html, edit, compute };
})();

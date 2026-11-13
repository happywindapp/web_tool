// Pure: pick the statutory statement model for a ticker, then pivot line items × fiscal periods (newest first).
const FinTable = (() => {
  const KINDS = { bs: "BALANCESHEET", is: "INCOME", cf: "CASHFLOW" };
  const PERIODS = 8;

  // Models of one kind: the one with a circular note (TT…) is the full statutory form; WEB/ALL-forms models are summaries.
  function pickModel(models, kind) {
    const name = KINDS[kind], of = models.filter(m => m.modelTypeName === name);
    const best = of.find(m => m.note) || of[0];
    if (!best) return null;
    const items = of.filter(m => m.modelType === best.modelType && Number.isFinite(+m.itemCode))
      .sort((a, b) => (+a.displayOrder || 0) - (+b.displayOrder || 0))
      .map(m => ({ code: +m.itemCode, vi: String(m.itemVnName || ""), en: String(m.itemEnName || ""), level: Math.max(1, Math.min(4, +m.displayLevel || 1)) }));
    return { modelType: +best.modelType, items };
  }

  // First fiscal date worth fetching: 2 years of quarters or 8 years of annual reports (+ slack).
  function since(period, now = new Date()) {
    const y = now.getUTCFullYear() - (period === "year" ? PERIODS + 1 : 3);
    return `${y}-01-01`;
  }

  function build(model, rows, n = PERIODS) {
    const periods = [...new Set(rows.map(r => String(r.fiscalDate)).filter(d => /^\d{4}-\d{2}-\d{2}$/.test(d)))].sort().reverse().slice(0, n);
    const val = new Map(rows.map(r => [`${+r.itemCode}|${r.fiscalDate}`, +r.numericValue]));
    const lines = model.items.map(it => ({ ...it, values: periods.map(p => { const v = val.get(`${it.code}|${p}`); return Number.isFinite(v) ? v : null; }) }))
      .filter(l => l.values.some(v => v !== null));
    return { periods, lines };
  }

  // "2026-06-30" → "Q2/2026" (quarter) or "2026" (annual).
  const label = (date, period) => period === "year" ? date.slice(0, 4) : `Q${Math.ceil(+date.slice(5, 7) / 3)}/${date.slice(0, 4)}`;

  // Money in billion VND; per-share and ratio-sized lines (EPS…) stay as they are.
  function fmt(v, line) {
    if (v == null) return "";
    const small = line.values.every(x => x == null || Math.abs(x) < 1e7);
    const n = small ? v : v / 1e9, d = small ? 0 : Math.abs(n) >= 100 ? 0 : 2;
    return n.toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d });
  }

  // Change vs the previous period of the same row, in %.
  const growth = (values, i) => values[i] != null && values[i + 1] ? (values[i] - values[i + 1]) / Math.abs(values[i + 1]) * 100 : null;

  return { KINDS, pickModel, since, build, label, fmt, growth, PERIODS };
})();

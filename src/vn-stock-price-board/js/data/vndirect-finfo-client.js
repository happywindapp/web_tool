// VNDirect finfo API (public, CORS *): valuation ratios, news, financial statements, corporate events, profile, shareholders, analyst calls.
const Finfo = (() => {
  const BASE = "https://api-finfo.vndirect.com.vn/v4/", cache = new Map(), TTL = 5 * 60e3;
  const RATIOS = ["MARKETCAP", "PRICE_TO_EARNINGS", "PRICE_TO_BOOK", "PRICE_TO_SALES", "EPS_TR", "BVPS_CR", "ROAE_TR_AVG5Q", "ROAA_TR_AVG5Q", "ROIC_TR_AVG5Q",
    "DIVIDEND_YIELD", "BETA", "OUTSTANDING_SHARES", "NMVOLUME_AVG_CR_10D", "PRICE_HIGHEST_CR_52W", "PRICE_LOWEST_CR_52W"];

  async function get(path) {
    const hit = cache.get(path);
    if (hit && Date.now() - hit.at < TTL) return hit.v;
    const ctl = new AbortController(), timer = setTimeout(() => ctl.abort(), 20000);
    try {
      const r = await fetch(BASE + path, { signal: ctl.signal });
      if (!r.ok) throw new Error("HTTP " + r.status);
      const j = await r.json(), v = { data: Array.isArray(j && j.data) ? j.data.filter(x => x && typeof x === "object") : [], total: +(j && j.totalElements) || 0 };
      cache.set(path, { at: Date.now(), v });
      return v;
    } finally { clearTimeout(timer); }
  }
  const q = s => encodeURIComponent(s);

  async function ratios(sym) {
    const r = await get(`ratios/latest?filter=ratioCode:${RATIOS.join(",")}&where=code:${q(sym)}&order=reportDate&fields=ratioCode,value,reportDate`);
    return Object.fromEntries(r.data.filter(x => x && RATIOS.includes(x.ratioCode) && Number.isFinite(+x.value)).map(x => [x.ratioCode, +x.value]));
  }
  // News exists in Vietnamese only (locale EN is empty).
  const news = (sym, page = 1, size = 10) => get(`news?q=tagCodes:${q(sym)}&size=${size}&page=${page}&sort=newsDate:desc~newsTime:desc&fields=newsTitle,newsAbstract,newsSource,newsDate,newsTime,newsUrl,dstockUrl`);
  const events = (sym, locale) => get(`events?q=code:${q(sym)}~locale:${locale === "en" ? "EN_GB" : "VN"}&size=40&sort=disclosureDate:desc`).then(r => r.data);
  const profile = sym => get(`company_profiles?q=code:${q(sym)}`).then(r => r.data[0] || null);
  const shareholders = sym => get(`shareholders?q=code:${q(sym)}&size=15&sort=ownershipPct:desc`).then(r => r.data);
  const recommendations = sym => get(`recommendations?q=code:${q(sym)}&size=30&sort=reportDate:desc`).then(r => r.data);

  // Statement line items of every model this ticker uses (bank / securities / insurance / normal companies differ).
  const models = sym => get(`financial_models?q=codeList:${q(sym)}&size=3000&sort=displayOrder:asc&fields=modelType,modelTypeName,note,formType,itemCode,itemVnName,itemEnName,displayLevel,displayOrder`).then(r => r.data);
  const values = (sym, modelType, period, since) =>
    get(`financial_statements?q=code:${q(sym)}~reportType:${period === "year" ? "ANNUAL" : "QUARTER"}~modelType:${modelType}~fiscalDate:gte:${since}&size=6000&fields=itemCode,numericValue,fiscalDate`).then(r => r.data);

  // Selected line items across all models (codes are shared: 23000 NPAT parent, 14400 total assets…); report: "ANNUAL" | "QUARTER" | "ESTIMATION".
  const items = (sym, report, codes, since) =>
    get(`financial_statements?q=code:${q(sym)}~reportType:${report}~itemCode:${codes.join(",")}~fiscalDate:gte:${since}&size=2000&sort=fiscalDate:desc&fields=itemCode,numericValue,fiscalDate`).then(r => r.data);
  // Daily ratio history, e.g. PRICE_TO_EARNINGS + PRICE_TO_BOOK for 5 years → { CODE: [{ date, value }] ascending }.
  async function ratioHistory(sym, codes, since) {
    const r = await get(`ratios?q=code:${q(sym)}~ratioCode:${codes.join(",")}~reportDate:gte:${since}&sort=reportDate:asc&size=5000&fields=ratioCode,reportDate,value`);
    const out = Object.fromEntries(codes.map(c => [c, []]));
    for (const x of r.data) if (out[x.ratioCode] && Number.isFinite(+x.value)) out[x.ratioCode].push({ date: String(x.reportDate), value: +x.value });
    return out;
  }
  const foreigns = (sym, size = 120) => get(`foreigns?q=code:${q(sym)}&size=${size}&sort=tradingDate:desc&fields=tradingDate,netVal,netVol,buyVal,sellVal,currentRoom,totalRoom`).then(r => r.data);
  // Whole-market daily flows since a date (stocks only): foreign investors and securities firms' proprietary desks (published ~1 day later).
  const foreignsSince = since => get(`foreigns?q=tradingDate:gte:${since}~type:STOCK&size=40000&fields=code,floor,tradingDate,netVal,buyVal,sellVal`).then(r => r.data);
  const proprietarySince = since => get(`proprietary_trading?q=date:gte:${since}~type:STOCK&size=20000&fields=code,floor,date,netVal,buyingVal,sellingVal`).then(r => r.data);
  // Last n trading dates (yyyy-mm-dd, newest first), read from VNINDEX's foreign-flow rows.
  const tradingDates = n => get(`foreigns?q=code:VNINDEX&size=${n}&sort=tradingDate:desc&fields=tradingDate`).then(r => r.data.map(x => String(x.tradingDate)));
  // Cash dividends (đ/share per payment) — Vietnamese locale carries the numbers regardless of UI language.
  const dividends = sym => get(`events?q=code:${q(sym)}~locale:VN~type:DIVIDEND&size=100&sort=effectiveDate:desc&fields=dividend,divYear,divPeriod,effectiveDate,ratio`).then(r => r.data);

  // ICB sectors of one level (1: 10 industries · 2: 19 supersectors · 3: 42 sectors), each with its ticker list.
  const industries = level => get(`industry_classification?q=industryLevel:${level}&size=500&fields=industryCode,vietnameseName,englishName,codeList,higherLevelCode`).then(r => r.data);
  // Latest ratios of many tickers in one call (≤ ~100 codes keeps the URL short and the reply fast).
  const ratiosBulk = (codes, ratioCodes) => get(`ratios/latest?filter=ratioCode:${ratioCodes.join(",")}&where=code:${codes.map(q).join(",")}&order=reportDate&size=1000&fields=code,ratioCode,value`).then(r => r.data);

  return { ratios, news, events, profile, shareholders, recommendations, models, values, items, ratioHistory, foreigns, foreignsSince, proprietarySince, tradingDates, dividends, industries, ratiosBulk };
})();

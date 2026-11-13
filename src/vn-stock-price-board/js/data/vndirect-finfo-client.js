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

  return { ratios, news, events, profile, shareholders, recommendations, models, values };
})();

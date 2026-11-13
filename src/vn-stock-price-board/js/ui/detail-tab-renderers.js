// HTML for the detail tabs fed by VNDirect finfo: ratios, news, events, profile + shareholders, analyst calls, financial statements.
const TabHtml = (() => {
  const e = s => Dom.esc(s ?? "");
  const dmy = s => /^\d{4}-\d{2}-\d{2}/.test(s || "") ? `${s.slice(8, 10)}/${s.slice(5, 7)}/${s.slice(0, 4)}` : "";
  const url = u => /^https?:\/\//i.test(u || "") ? u : "";
  const link = (u, text) => url(u) ? `<a href="${e(url(u))}" target="_blank" rel="noopener noreferrer">${e(text)}</a>` : e(text);
  const num = (v, d = 2) => Number.isFinite(v) ? Fmt.en(v, d) : "—";
  const pct = v => Number.isFinite(v) ? Fmt.en(v * 100, 2) + "%" : "—";
  const stat = (label, val, cls = "") => `<div><span>${e(label)}</span><b class="${cls}">${e(val)}</b></div>`;
  const empty = text => `<p class="muted pad">${e(text)}</p>`;

  function ratios(r) {
    if (!r || !Object.keys(r).length) return empty(T("Chưa có chỉ số định giá cho mã này."));
    return `<div class="dsec"><b>${e(T("Chỉ số cơ bản"))}</b></div><div class="stats">`
      + stat(T("Vốn hoá (tỷ)"), num(r.MARKETCAP / 1e9, 0)) + stat(T("P/E"), num(r.PRICE_TO_EARNINGS)) + stat(T("P/B"), num(r.PRICE_TO_BOOK)) + stat(T("P/S"), num(r.PRICE_TO_SALES))
      + stat(T("EPS (đ)"), num(r.EPS_TR, 0)) + stat(T("BVPS (đ)"), num(r.BVPS_CR, 0)) + stat(T("ROE"), pct(r.ROAE_TR_AVG5Q)) + stat(T("ROA"), pct(r.ROAA_TR_AVG5Q))
      + stat(T("ROIC"), pct(r.ROIC_TR_AVG5Q)) + stat(T("Tỷ suất cổ tức"), pct(r.DIVIDEND_YIELD)) + stat(T("Beta"), num(r.BETA)) + stat(T("CP lưu hành"), Fmt.big(r.OUTSTANDING_SHARES || 0) || "—")
      + stat(T("KL TB 10 phiên"), Fmt.big(r.NMVOLUME_AVG_CR_10D || 0) || "—") + stat(T("Cao nhất 52 tuần"), num(r.PRICE_HIGHEST_CR_52W / 1000)) + stat(T("Thấp nhất 52 tuần"), num(r.PRICE_LOWEST_CR_52W / 1000))
      + `</div>`;
  }

  function news(list, more) {
    if (!list.length) return empty(T("Chưa có tin tức cho mã này."));
    return list.map(n => `<article class="nitem"><b>${link(n.newsUrl || n.dstockUrl, String(n.newsTitle || "").trim())}</b>`
      + `<div class="muted">${e(n.newsSource)} · ${dmy(n.newsDate)} ${e(String(n.newsTime || "").slice(0, 5))}</div>`
      + (n.newsAbstract ? `<p>${e(String(n.newsAbstract).trim())}</p>` : "") + `</article>`).join("")
      + (more ? `<button class="more" data-act="moreNews">${e(T("Xem thêm tin"))}</button>` : "")
      + `<p class="muted pad">${e(T("Tin tổng hợp từ VNDirect (tiếng Việt); bấm tiêu đề để đọc bài gốc."))}</p>`;
  }

  function events(list) {
    if (!list.length) return empty(T("Chưa có sự kiện quyền nào."));
    return `<table class="dtable"><thead><tr><th>${e(T("Công bố"))}</th><th>${e(T("Sự kiện"))}</th><th>${e(T("GDKHQ"))}</th><th>${e(T("Thực hiện"))}</th></tr></thead><tbody>`
      + list.map(x => `<tr><td>${dmy(x.disclosureDate)}</td><td><b>${e(x.typeDesc)}</b>${x.note ? `<div class="muted">${e(x.note)}</div>` : ""}</td>`
        + `<td>${dmy(x.effectiveDate)}</td><td>${dmy(x.actualDate)}</td></tr>`).join("") + `</tbody></table>`;
  }

  function profile(p, holders, lang) {
    if (!p) return empty(T("Chưa có hồ sơ doanh nghiệp."));
    const en = lang === "en";
    const row = (k, v) => v ? `<tr><th>${e(k)}</th><td>${v}</td></tr>` : "";
    const summary = (en && p.enSummary) || p.vnSummary;
    const info = `<table class="dtable kv"><tbody>${row(T("Tên công ty"), e(en ? p.enName || p.vnName : p.vnName))}${row(T("Sàn niêm yết"), e(p.floor))}`
      + `${row(T("Ngày thành lập"), dmy(p.foundDate))}${row(T("Mã số thuế"), e(p.taxCode))}${row(T("Địa chỉ"), e(en && p.enAddress ? p.enAddress : p.vnAddress))}`
      + `${row(T("Điện thoại"), e(p.phone))}${row(T("Website"), link(p.website, p.website))}${row(T("Email"), e(p.email))}`
      + `${row(T("Số nhân viên"), Number.isFinite(+p.employees) && +p.employees ? Fmt.en(+p.employees) : "")}</tbody></table>`;
    const hold = holders.length ? `<div class="dsec"><b>${e(T("Cổ đông lớn"))}</b></div><table class="dtable"><thead><tr><th>${e(T("Cổ đông"))}</th><th>${e(T("Số CP"))}</th><th>${e(T("Tỷ lệ"))}</th></tr></thead><tbody>`
      + holders.map(h => `<tr><td>${e(h.shareholderName)}<div class="muted">${e(en ? h.enRoleType || h.roleType : h.roleType)} · ${dmy(h.effectiveDate)}</div></td>`
        + `<td>${Fmt.en(+h.numberOfShares || 0)}</td><td>${Number.isFinite(+h.ownershipPct) ? Fmt.en(+h.ownershipPct, 2) + "%" : "—"}</td></tr>`).join("") + `</tbody></table>` : "";
    return info + (summary ? `<p class="pad summary">${e(String(summary).trim())}</p>` : "") + hold;
  }

  const CALL = { BUY: "Mua", STRONG_BUY: "Mua mạnh", OUTPERFORM: "Khả quan", OVERWEIGHT: "Khả quan", ADD: "Mua thêm", ACCUMULATE: "Tích luỹ",
    HOLD: "Nắm giữ", NEUTRAL: "Trung lập", MARKET_PERFORM: "Trung lập", UNDERPERFORM: "Kém khả quan", UNDERWEIGHT: "Kém khả quan", REDUCE: "Giảm tỷ trọng", SELL: "Bán" };
  const callTone = c => /BUY|OUTPERFORM|OVERWEIGHT|ADD|ACCUM/.test(c) ? "up" : /SELL|UNDER|REDUCE/.test(c) ? "down" : "ref";

  function recs(list, last) {
    if (!list.length) return empty(T("Chưa có khuyến nghị của công ty phân tích."));
    const avg = +list[0].avgTargetPrice, up = v => last && v ? (v / last - 1) * 100 : null;
    const head = Number.isFinite(avg) && avg ? `<div class="stats">${stat(T("Giá mục tiêu TB"), num(avg))}${stat(T("Tiềm năng"), up(avg) == null ? "—" : Fmt.signed(up(avg)) + "%", up(avg) > 0 ? "up" : "down")}`
      + `${stat(T("Số khuyến nghị"), String(list.length))}</div>` : "";
    return head + `<table class="dtable"><thead><tr><th>${e(T("Ngày"))}</th><th>${e(T("Đơn vị"))}</th><th>${e(T("Đánh giá"))}</th><th>${e(T("Giá mục tiêu"))}</th><th>${e(T("Tiềm năng"))}</th></tr></thead><tbody>`
      + list.map(x => { const c = String(x.type || "").toUpperCase().replace(/\s+/g, "_"), u = up(+x.targetPrice);
        return `<tr><td>${dmy(x.reportDate)}</td><td>${e(x.firm)}</td><td class="${callTone(c)}">${e(CALL[c] ? T(CALL[c]) : x.type)}</td>`
          + `<td>${num(+x.targetPrice)}</td><td class="${u > 0 ? "up" : u < 0 ? "down" : ""}">${u == null ? "—" : Fmt.signed(u) + "%"}</td></tr>`; }).join("")
      + `</tbody></table><p class="muted pad">${e(T("Tiềm năng = giá mục tiêu so với giá khớp hiện tại. Nguồn: VNDirect / Bloomberg."))}</p>`;
  }

  return { ratios, news, events, profile, recs, empty, url };
})();

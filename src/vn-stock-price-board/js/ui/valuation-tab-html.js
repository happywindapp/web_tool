// HTML for the "Định giá" tab: snowflake + criteria, fair-price table with editable DCF assumptions, P/E–P/B bands, Piotroski / Altman.
const ValHtml = (() => {
  const e = s => Dom.esc(s ?? "");
  const DIMS = { value: "Định giá", future: "Tương lai", past: "Quá khứ", health: "Sức khoẻ", dividend: "Cổ tức" };
  const CHECKS = {
    peBand: "P/E thấp hơn trung vị 5 năm", pbBand: "P/B thấp hơn trung vị 5 năm", fair: "Giá thấp hơn giá hợp lý trung bình", pe15: "P/E dưới 15", peg: "PEG dưới 1",
    estRev: "Dự phóng doanh thu năm nay tăng > 10%", estNp: "Dự phóng LNST năm nay tăng > 10%", estNpHigh: "Dự phóng LNST năm nay tăng > 20%",
    roe: "ROE trên 15%", roa: "ROA cao (> 7%; ngân hàng, CK, bảo hiểm > 1%)", npUp: "LNST năm gần nhất tăng", cagr3: "LNST tăng bình quân > 10%/năm trong 3 năm", cagr5: "LNST tăng trong 5 năm",
    eqRatio: "Vốn chủ sở hữu / tổng tài sản > 7%", profit: "Có lãi năm gần nhất", current: "Thanh toán hiện hành > 1", de: "Nợ vay / vốn chủ sở hữu < 1",
    cover: "EBIT / chi phí lãi vay > 3", cfoPos: "Dòng tiền kinh doanh dương", altman: "Altman Z ở vùng an toàn", piotroski: "Piotroski F-score ≥ 6",
    yield2: "Tỷ suất cổ tức > 2%", yield4: "Tỷ suất cổ tức > 4%", streak: "Trả cổ tức tiền 3 năm liền", stable: "Cổ tức năm gần nhất không giảm", payout: "Tỷ lệ chi trả 0–80% lợi nhuận",
  };
  const PIO = { roa: "ROA dương", cfo: "Dòng tiền kinh doanh dương", droa: "ROA tăng so với năm trước", accrual: "Dòng tiền kinh doanh lớn hơn LNST",
    dlev: "Nợ dài hạn / tài sản không tăng", dcr: "Thanh toán hiện hành tăng", dil: "Không phát hành thêm cổ phiếu", dgm: "Biên lãi gộp tăng", dat: "Vòng quay tài sản tăng" };
  const METHODS = { graham: "Graham (√22,5 × EPS × BVPS)", pe: "P/E trung vị 5 năm × EPS", pb: "P/B trung vị 5 năm × BVPS", dcf: "DCF dòng tiền tự do" };
  const DCF_INPUTS = [["g", "Tăng trưởng 5 năm (%)"], ["wacc", "WACC (%)"], ["tg", "Tăng trưởng dài hạn (%)"]];
  const PCT = new Set(["fair", "estRev", "estNp", "estNpHigh", "roe", "roa", "npUp", "cagr3", "cagr5", "eqRatio", "yield2", "yield4", "payout"]);

  const mark = p => p === null ? `<i class="na">–</i>` : p ? `<i class="ok">✔</i>` : `<i class="no">✖</i>`;
  const val = (k, v) => !Number.isFinite(v) ? "" : PCT.has(k) ? ` (${Fmt.en(v, 1)}%)` : k === "streak" ? "" : ` (${Fmt.en(v, 2)})`;
  const sec = title => `<div class="dsec"><b>${e(title)}</b></div>`;
  const pct = v => Number.isFinite(v) ? `<span class="${v > 0 ? "up" : v < 0 ? "down" : ""}">${Fmt.signed(v, 1)}%</span>` : "—";

  function snowflake(dims) {
    const radar = VSvg.radar(dims.map(d => ({ label: T(DIMS[d.key]), score: d.score })));
    const lists = dims.map(d => `<details><summary><b>${e(T(DIMS[d.key]))}</b> <span class="muted">${d.score ?? "–"}/6</span></summary><ul class="checks">`
      + d.checks.map(c => `<li>${mark(c.pass)} ${e(T(CHECKS[c.key]))}${val(c.key, c.v)}</li>`).join("") + `</ul></details>`).join("");
    return sec(T("Snowflake — 5 khía cạnh (0–6)")) + `<div class="snowbox">${radar}<div class="snowlist">${lists}</div></div>`;
  }

  function fair(f, a, price) {
    const rows = f.methods.map(m => `<tr><td>${e(T(METHODS[m.key]))}</td><td>${m.value ? Fmt.en(m.value, 2) : "—"}</td><td>${pct(m.upside)}</td></tr>`).join("");
    const inputs = a ? `<div class="dcfin">${DCF_INPUTS.map(([k, l]) =>
      `<label>${e(T(l))}<input type="number" data-act="dcf" data-k="${k}" value="${a[k]}" step="0.5" min="-10" max="40"></label>`).join("")}</div>`
      + `<p class="muted pad">${e(T("FCF bình quân 3 năm: {f} tỷ · nợ vay ròng: {d} tỷ", { f: Fmt.en((a.fcf0 || 0) / 1e9, 0), d: Fmt.en((a.netDebt || 0) / 1e9, 0) }))}</p>`
      : `<p class="muted pad">${e(T("DCF không áp dụng cho ngân hàng, chứng khoán, bảo hiểm hoặc khi dòng tiền tự do âm."))}</p>`;
    return sec(T("Giá hợp lý (nghìn đồng)")) + `<table class="dtable"><thead><tr><th>${e(T("Phương pháp"))}</th><th>${e(T("Giá"))}</th><th>${e(T("So với giá {p}", { p: Fmt.price(price) }))}</th></tr></thead>`
      + `<tbody>${rows}<tr class="sum"><td><b>${e(T("Trung bình"))}</b></td><td><b>${f.average ? Fmt.en(f.average, 2) : "—"}</b></td><td>${pct(f.upside)}</td></tr></tbody></table>`
      + inputs + `<p class="muted pad">${e(T("Chỉ để tham khảo, không phải khuyến nghị đầu tư."))}</p>`;
  }

  function bands(hist, b) {
    const one = (code, name) => {
      const st = b[code];
      if (st && !(st.current > 0)) return `<p class="pad"><b>${name}</b> ${e(T("hiện âm hoặc chưa có (doanh nghiệp lỗ) — không so được với lịch sử."))}</p>`;
      if (!st) return `<p class="muted pad">${e(T("Chưa đủ dữ liệu {n} lịch sử.", { n: name }))}</p>`;
      return `<div class="bandhead"><b>${name}</b> ${e(T("hiện tại {c} · TB {m} · thấp nhất {lo} · cao nhất {hi}", { c: Fmt.en(st.current, 2), m: Fmt.en(st.mean, 2), lo: Fmt.en(st.min, 2), hi: Fmt.en(st.max, 2) }))}`
        + ` · <span class="${st.percentile < 35 ? "up" : st.percentile > 65 ? "down" : "ref"}">${e(T("cao hơn {p}% số phiên trong 5 năm", { p: Fmt.en(st.percentile, 0) }))}</span></div>`
        + VSvg.band(hist[code], st, T("TB"));
    };
    return sec(T("Định giá lịch sử 5 năm")) + one("pe", "P/E") + one("pb", "P/B");
  }

  function health(pio, alt) {
    if (!pio && !alt) return sec(T("Điểm sức khoẻ tài chính")) + `<p class="muted pad">${e(T("Piotroski và Altman Z không áp dụng cho ngân hàng, chứng khoán, bảo hiểm (hoặc thiếu 2 năm báo cáo)."))}</p>`;
    const zone = { safe: ["up", "An toàn"], grey: ["ref", "Vùng xám"], distress: ["down", "Nguy cơ"] };
    return sec(T("Điểm sức khoẻ tài chính"))
      + (pio ? `<details open><summary><b>Piotroski F-score ${pio.score}/9</b>${pio.known < 9 ? ` <span class="muted">${e(T("({n} tiêu chí thiếu dữ liệu)", { n: 9 - pio.known }))}</span>` : ""}</summary><ul class="checks">${pio.checks.map(c => `<li>${mark(c.pass)} ${e(T(PIO[c.key]))}</li>`).join("")}</ul></details>` : "")
      + (alt ? `<p class="pad">Altman Z = <b class="${zone[alt.zone][0]}">${Fmt.en(alt.z, 2)} — ${e(T(zone[alt.zone][1]))}</b> <span class="muted">${e(T("(> 2,99 an toàn · 1,81–2,99 vùng xám · < 1,81 nguy cơ)"))}</span></p>` : "");
  }

  // Top 10 peers by market cap (the ticker itself always listed) + sector median.
  function peers(p, sym, lang) {
    if (!p || p.list.length < 2) return "";
    const shown = p.list.slice(0, 10);
    if (!shown.some(x => x.sym === sym)) { const me = p.list.find(x => x.sym === sym); if (me) shown.push(me); }
    const med = k => Valuation.median(p.list.map(x => x[k]).filter(v => Number.isFinite(v) && (k !== "pe" || v > 0)));
    const f = (v, d = 2, mul = 1) => Number.isFinite(v) ? Fmt.en(v * mul, d) : "—";
    const row = (x, cls = "") => `<tr${x.sym ? ` data-sym="${e(x.sym)}"` : ""} class="${cls}"><td><b>${e(x.sym || T("Trung vị ngành"))}</b></td><td>${f(x.mcap, 0, 1e-9)}</td>`
      + `<td>${f(x.pe)}</td><td>${f(x.pb)}</td><td>${f(x.roe, 1, 100)}</td><td>${f(x.dy, 1, 100)}</td></tr>`;
    return sec(T("So sánh cùng ngành: {s} ({n} mã)", { s: Market.sectorName(p.code, lang), n: p.list.length }))
      + `<table class="dtable num peers"><thead><tr><th>${e(T("Mã"))}</th><th>${e(T("Vốn hoá (tỷ)"))}</th><th>P/E</th><th>P/B</th><th>ROE %</th><th>${e(T("Cổ tức %"))}</th></tr></thead><tbody>`
      + shown.map(x => row(x, x.sym === sym ? "me" : "")).join("") + row({ mcap: med("mcap"), pe: med("pe"), pb: med("pb"), roe: med("roe"), dy: med("dy") }, "sum") + `</tbody></table>`;
  }

  return { snowflake, fair, bands, health, peers };
})();

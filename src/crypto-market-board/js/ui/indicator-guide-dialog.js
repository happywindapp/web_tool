// "?" next to each indicator in the full chart picker → detailed guide: what it measures, formula, how to read, illustrated example
// (GuideSvg on made-up data with numbered signal points), worked crypto example, combos with other indicators, crypto caveats.
const IndGuide = (() => {
  const SIG = {
    ma: ["giá cắt lên đường trung bình → xu hướng ngắn hạn chuyển tăng", "giá cắt xuống đường trung bình → xu hướng ngắn hạn chuyển giảm"],
    bb: ["đóng cửa trên dải trên → bứt phá nhưng đang căng", "đóng cửa dưới dải dưới → bán mạnh, quá bán ngắn hạn"],
    dc: ["vượt đỉnh 20 nến trước → bứt phá", "thủng đáy 20 nến trước → phá vỡ hỗ trợ"],
    psar: ["chấm SAR chuyển xuống dưới giá → đảo chiều tăng", "chấm SAR chuyển lên trên giá → đảo chiều giảm"],
    ichi: ["Tenkan cắt lên Kijun → tín hiệu tăng", "Tenkan cắt xuống Kijun → tín hiệu giảm"],
    stoch: ["%K cắt lên %D → tín hiệu tăng", "%K cắt xuống %D → tín hiệu giảm"],
    adx: ["+DI cắt lên −DI → phe mua mạnh hơn", "−DI vượt +DI → phe bán mạnh hơn"],
    macd: ["MACD cắt lên đường tín hiệu → động lượng tăng", "MACD cắt xuống đường tín hiệu → động lượng giảm"],
  };
  // Level crossings say which level and whether price enters or leaves the overbought / oversold zone.
  const LV = { outLow: "{name} cắt lên {L}: thoát vùng quá bán → tín hiệu tăng", inLow: "{name} cắt xuống {L}: vào vùng quá bán — bán mạnh, chờ tín hiệu hồi",
    inHigh: "{name} cắt lên {L}: vào vùng quá mua — động lượng mạnh, dễ điều chỉnh", outHigh: "{name} cắt xuống {L}: rời vùng quá mua → tín hiệu giảm",
    up0: "{name} vượt lên {L} → đà tăng", down0: "{name} xuống dưới {L} → đà giảm" };
  const lvText = (name, p) => T(LV[p.lo === p.hi ? (p.up ? "up0" : "down0") : p.L === p.lo ? (p.up ? "outLow" : "inLow") : (p.up ? "inHigh" : "outHigh")], { name, L: p.L });
  const kind = id => ["sma", "ema", "wma"].includes(id) ? "ma" : ["rsi", "cci", "wr", "mfi", "roc"].includes(id) ? "lv" : SIG[id] ? id : null;
  const ids = () => Object.keys(Indicators.DEFS).filter(k => !Indicators.DEFS[k].intraday && IND_GUIDE[k]);
  let cur = "";
  const e = s => Dom.esc(s ?? "");
  const sec = (title, body) => `<section class="gd-sec"><h4>${e(T(title))}</h4>${body}</section>`;
  const list = items => `<ul>${items.map(x => `<li>${e(T(x))}</li>`).join("")}</ul>`;

  function body(id) {
    const d = Indicators.DEFS[id], g = IND_GUIDE[id], pic = GuideSvg.render(id), k = kind(id), on = CoinChart.get().ind.some(x => x.id === id);
    const all = ids(), i = all.indexOf(id), prev = all[(i - 1 + all.length) % all.length], next = all[(i + 1) % all.length];
    const pts = pic.points.length && k ? `<ol class="gd-pts">${pic.points.map(p => `<li class="${p.up ? "up" : "down"}"><b>${p.n}</b> ${e(k === "lv" ? lvText(d.name, p) : T(SIG[k][p.up ? 0 : 1]))}</li>`).join("")}</ol>`
      : `<p class="muted">${e(T("Chỉ báo này không cho tín hiệu mua / bán trực tiếp — xem hướng đi và phân kỳ như phần Cách đọc."))}</p>`;
    return `<div class="dlg-head"><span class="gd-title"><b>${e(d.name)}</b> ${e(T(d.label))}${g.imp ? ` <span class="badge imp">★ ${e(T("Quan trọng"))}</span>` : ""}</span>`
      + `<button data-g="nav" data-v="${prev}" title="${e(T("Chỉ báo trước"))}">‹</button><button data-g="nav" data-v="${next}" title="${e(T("Chỉ báo tiếp theo"))}">›</button><button data-g="close" title="${e(T("Đóng (Esc)"))}">✕</button></div>`
      + `<div class="dlg-body gd">`
      + sec("Chỉ báo này đo gì?", `<p>${e(T(g.what))}</p>`)
      + sec("Cách tính", `<p class="gd-calc">${e(T(g.calc))}</p><p class="muted">${e(T("Tham số mặc định trong tool: {p}.", { p: d.params.map(q => `${q.k} = ${q.d}`).join(", ") || "—" }))}</p>`)
      + sec("Cách đọc", list(g.read))
      + sec("Minh hoạ", `<div class="gd-pic">${pic.svg}</div><div class="gd-leg">${pic.legend.map(l => `<span style="color:${l.color}">■ ${e(l.title)}</span>`).join("")}</div>${pts}`
        + `<p class="muted">${e(T("Dữ liệu giả lập (giảm → tích luỹ → tăng → đi ngang → giảm), chỉ báo tính bằng đúng công thức của tool với tham số mặc định. Số trên hình = điểm tín hiệu."))}</p>`)
      + sec("Ví dụ thực tế", `<p>${e(T(g.ex))}</p>`)
      + sec("Phối hợp với chỉ báo khác", list(g.combo))
      + sec("Lưu ý với crypto", `<p>${e(T(g.note))}</p>`)
      + `<p class="gd-act"><button data-g="toggle" data-v="${id}" class="${on ? "" : "main"}">${e(on ? T("✔ Đang hiện trên biểu đồ — bấm để ẩn") : T("➕ Hiện trên biểu đồ"))}</button>`
      + ` <span class="muted">${e(T("Chỉ để học và tham khảo, không phải lời khuyên đầu tư."))}</span></p></div>`;
  }

  function open(id) {
    if (!IND_GUIDE[id] || !Indicators.DEFS[id]) return;
    cur = id;
    const dlg = $("guideDlg");
    dlg.innerHTML = body(id);
    if (!dlg.open) dlg.showModal();
    dlg.querySelector(".dlg-body").scrollTop = 0;
  }

  function init() {
    const dlg = $("guideDlg");
    dlg.addEventListener("click", ev => {
      if (ev.target === dlg) { dlg.close(); return; }
      const b = ev.target.closest("[data-g]");
      if (!b) return;
      if (b.dataset.g === "close") dlg.close();
      if (b.dataset.g === "nav") open(b.dataset.v);
      if (b.dataset.g === "toggle") { CoinChart.toggleInd(b.dataset.v); open(b.dataset.v); }
    });
    I18n.onChange(() => { if (dlg.open && cur) open(cur); });
  }

  return { init, open };
})();

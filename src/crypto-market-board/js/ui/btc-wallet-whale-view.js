// "Ví BTC & cá voi" tab: address lookup (mempool.space), personal address book with labels, realtime whale stream.
const WalletView = (() => {
  const e = Dom.esc, GENESIS = "1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa", FILE_MAX = 1e6;
  const TYPES = () => ({ P2PKH: T("P2PKH (Legacy)"), P2SH: T("P2SH (Script)"), P2WPKH: T("SegWit (P2WPKH)"), P2WSH: T("SegWit (P2WSH)"), P2TR: T("Taproot (P2TR)") });
  const builtin = a => a === GENESIS ? T("Genesis (Satoshi)") : "";
  let host = null, st = null, seq = 0, balTok = 0, refreshing = false, bmsg = null, edit = false;
  const bal = new Map();
  const v = k => host && host.querySelector(`[data-v="${k}"]`);
  const f = k => host && host.querySelector(`[data-f="${k}"]`);
  const btcMoney = sats => { const m = WalletUi.btcMoney(sats); return m ? ` <span class="muted">≈ ${e(m)}</span>` : ""; };

  function frame() {
    const keep = ["addr", "label", "baddr", "tag"].map(k => f(k) ? f(k).value : "");
    v("top").innerHTML = `<div class="wl-sec"><b>${e(T("Tra cứu địa chỉ"))}</b></div>`
      + `<div class="wl-form"><input type="text" data-f="addr" maxlength="100" spellcheck="false" autocomplete="off" placeholder="${e(T("Địa chỉ Bitcoin (1…, 3…, bc1…)"))}">`
      + `<button class="main" data-act="lookup">${e(T("Tra cứu"))}</button><span class="muted">${e(T("Thử mẫu:"))}</span><button data-lookup="${GENESIS}">${e(T("Genesis (Satoshi)"))}</button></div>`
      + `<p class="sc-note">${e(T("Địa chỉ bạn tra cứu được gửi tới mempool.space (explorer công khai)."))}</p><div data-v="result"></div>`
      + `<div class="wl-sec"><b>${e(T("Sổ địa chỉ"))}</b><span class="muted">${e(T("Nhãn cá nhân, chỉ lưu trên trình duyệt này"))}</span></div>`
      + `<div class="wl-form"><input type="text" data-f="label" maxlength="40" placeholder="${e(T("Nhãn (vd: Ví lạnh)"))}"><input type="text" data-f="baddr" maxlength="100" spellcheck="false" autocomplete="off" placeholder="${e(T("Địa chỉ Bitcoin"))}">`
      + `<select data-f="tag" aria-label="${e(T("Loại"))}">${BtcFlow.TAGS.map(t => `<option value="${t}">${e(WalletUi.tagName(t))}</option>`).join("")}</select>`
      + `<button class="main" data-act="save">${e(T("Lưu"))}</button></div>`
      + `<div class="wl-form"><button data-act="refresh">${e(refreshing ? T("Đang làm mới…") : T("Làm mới số dư"))}</button><button data-act="export">${e(T("Xuất JSON"))}</button>`
      + `<label class="btn">${e(T("Nhập JSON"))}<input type="file" accept=".json,application/json" data-f="file"></label><span class="muted" data-v="bmsg"></span></div><div data-v="book"></div>`;
    ["addr", "label", "baddr", "tag"].forEach((k, i) => { if (keep[i]) f(k).value = keep[i]; });
    v("foot").innerHTML = `<p class="sc-note">${e(T("Dữ liệu là blockchain công khai; nhãn là của riêng bạn, không phải xác nhận danh tính chủ ví."))}</p>`;
    paintResult(); paintBook(); paintMsg();
  }

  function paintMsg() { const m = v("bmsg"); if (m) { m.textContent = bmsg ? bmsg.text : ""; m.className = bmsg ? bmsg.tone : "muted"; } }
  const say = (text, tone = "muted") => { bmsg = { text, tone }; paintMsg(); };

  function paintBook() {
    const box = v("book"); if (!box) return;
    const rows = AddrBook.list().map(x => {
      const b = bal.get(x.addr);
      return `<tr><td><b>${e(x.label)}</b></td><td><span class="badge">${e(WalletUi.tagName(x.tag))}</span></td><td>${WalletUi.addrCell(x.addr, null)}</td>`
        + `<td class="r">${b == null ? '<span class="muted">—</span>' : `${e(BtcFlow.btc(b))} BTC${btcMoney(b)}`}</td>`
        + `<td class="r"><button data-edit="${e(x.addr)}" title="${e(T("Sửa"))}" aria-label="${e(T("Sửa"))}">✎</button> <button data-del="${e(x.addr)}" title="${e(T("Xoá"))}" aria-label="${e(T("Xoá"))}">✕</button></td></tr>`;
    }).join("");
    box.innerHTML = rows ? `<div class="wl-scroll"><table class="wl-tbl"><thead><tr><th>${e(T("Nhãn"))}</th><th>${e(T("Loại"))}</th><th>${e(T("Địa chỉ"))}</th><th class="r">${e(T("Số dư"))}</th><th></th></tr></thead><tbody>${rows}</tbody></table></div>`
      : `<p class="muted wl-pad">${e(T("Sổ địa chỉ trống. Thêm nhãn ở trên hoặc bấm ★ sau khi tra cứu."))}</p>`;
  }

  const err = (msg, retry) => `<div class="errbox">${e(msg)}${retry ? `<button data-act="retry">${e(T("Thử lại"))}</button>` : ""}</div>`;
  const stat = (l, h) => `<div class="card"><span>${e(l)}</span><b>${h}</b></div>`;

  function txRow(tx, a, book) {
    const net = BtcFlow.txNet(tx, a), dir = BtcFlow.txDirection(tx, a), cp = BtcFlow.counterparty(tx, a), c = BtcFlow.confirmations(tx, st.tip);
    const when = tx.status && tx.status.confirmed && tx.status.block_time ? `${Fmt.date(tx.status.block_time * 1000)} ${WalletUi.time(tx.status.block_time * 1000).slice(0, 5)}<br><span class="muted">${e(c ? T("{n} xác nhận", { n: Fmt.en(c) }) : "")}</span>` : `<span class="badge poll">${e(T("Chưa xác nhận"))}</span>`;
    const dl = { in: [T("Nhận"), "up"], out: [T("Gửi"), "down"], self: [T("Nội bộ"), "ref"] }[dir];
    return `<tr><td>${when}</td><td>${WalletUi.txCell(tx.txid)}</td><td><span class="${dl[1]}">${e(dl[0])}</span></td><td>${cp ? WalletUi.addrCell(cp, book) : '<span class="muted">—</span>'}</td>`
      + `<td class="r ${Fmt.tone(net)}">${e(BtcFlow.btc(net, { sign: true }))}</td><td class="r muted">${e(BtcFlow.btc(+tx.fee || 0))}</td></tr>`;
  }

  function paintResult() {
    const box = v("result"); if (!box || !st) return;
    if (st.loading) { box.innerHTML = `<p class="muted wl-pad">${e(T("Đang tải…"))}</p>`; return; }
    if (st.err) { box.innerHTML = err(st.err, st.retry); return; }
    const a = st.addr, b = BtcFlow.balance(st.info), book = AddrBook.map(), hit = book.get(a), name = hit ? hit.label : builtin(a), type = TYPES()[BtcFlow.addrType(a)] || "";
    const shown = st.txs.filter(t => t.status && t.status.confirmed).length;
    box.innerHTML = `<div class="wl-head">${name ? `<b>${e(name)}</b> ` : ""}<span class="badge">${e(type)}</span> <code class="wl-full" title="${e(a)}">${e(a)}</code>`
      + `<button class="wl-cp" data-copy="${e(a)}" title="${e(T("Chép"))}" aria-label="${e(T("Chép"))}">⧉</button> <a href="${e(BtcChain.addrUrl(a))}" ${WalletUi.LINK}>mempool.space ↗</a>`
      + ` <button data-act="star">${e(hit ? T("★ Sửa nhãn trong sổ") : T("★ Lưu vào sổ địa chỉ"))}</button></div>`
      + `<div class="cards">${stat(T("Số dư"), `${e(BtcFlow.btc(b.confirmed))} BTC${btcMoney(b.confirmed)}`)}${stat(T("Tổng nhận"), `${e(BtcFlow.btc(b.received))} BTC`)}${stat(T("Tổng gửi"), `${e(BtcFlow.btc(b.sent))} BTC`)}`
      + `${stat(T("Số giao dịch"), e(Fmt.en(b.txCount + b.mempoolTx)))}${stat(T("Chưa xác nhận"), `<span class="${Fmt.tone(b.unconfirmed)}">${e(BtcFlow.btc(b.unconfirmed, { sign: true }))} BTC</span>`)}</div>`
      + (st.txs.length ? `<div class="wl-scroll"><table class="wl-tbl"><thead><tr><th>${e(T("Thời gian"))}</th><th>${e(T("Mã giao dịch"))}</th><th>${e(T("Hướng"))}</th><th>${e(T("Đối tác"))}</th><th class="r">${e(T("Thay đổi (BTC)"))}</th><th class="r">${e(T("Phí (BTC)"))}</th></tr></thead><tbody>${st.txs.map(t => txRow(t, a, book)).join("")}</tbody></table></div>`
        : `<p class="muted wl-pad">${e(T("Địa chỉ chưa có giao dịch."))}</p>`)
      + (shown < b.txCount ? `<p class="wl-pad"><button data-act="more"${st.paging ? " disabled" : ""}>${e(st.paging ? T("Đang tải…") : T("Xem thêm"))}</button></p>` : "") + (st.pageErr ? err(st.pageErr, false) : "");
  }

  async function lookup(raw) {
    const a = BtcFlow.normalize(raw), id = ++seq;
    if (!a) { st = { err: T("Địa chỉ Bitcoin không hợp lệ (chỉ hỗ trợ mainnet: 1…, 3…, bc1…)."), retry: false }; paintResult(); return; }
    f("addr").value = a; Prefs.set("wallet.last", a);
    st = { addr: a, loading: true }; paintResult();
    try {
      const [info, txs, tip] = await Promise.all([BtcChain.address(a), BtcChain.txs(a), BtcChain.tip().catch(() => 0)]);
      if (!host || id !== seq) return;
      st = { addr: a, info, txs: Array.isArray(txs) ? txs : [], tip };
      bal.set(a, BtcFlow.balance(info).confirmed);
    } catch (x) {
      console.warn("WalletView.lookup - address fail", a, x.message);
      if (!host || id !== seq) return;
      st = { addr: a, err: x.rateLimited ? T("mempool.space đang giới hạn tốc độ, thử lại sau {n}s.", { n: x.retryIn || 60 }) : T("Không tra cứu được địa chỉ này. Kiểm tra mạng rồi thử lại."), retry: true };
    }
    paintResult(); paintBook();
  }

  async function more() {
    const last = [...st.txs].reverse().find(t => t.status && t.status.confirmed);
    if (!last || st.paging) return;
    const id = seq; st.paging = true; st.pageErr = ""; paintResult();
    try { const next = await BtcChain.txs(st.addr, last.txid); if (host && id === seq) st.txs = BtcFlow.mergeTxs(st.txs, Array.isArray(next) ? next : []); }
    catch (x) { console.warn("WalletView.more - txs paging fail", x.message); if (host && id === seq) st.pageErr = T("Không tải thêm được giao dịch."); }
    if (host && id === seq) { st.paging = false; paintResult(); }
  }

  function saveEntry() {
    const addr = BtcFlow.normalize(f("baddr").value);
    if (!addr) return say(T("Địa chỉ Bitcoin không hợp lệ."), "down");
    if (!f("label").value.trim()) return say(T("Nhập nhãn cho địa chỉ."), "down");
    if (!AddrBook.save({ addr, label: f("label").value, tag: f("tag").value })) return say(T("Sổ đầy ({n} địa chỉ).", { n: BtcFlow.MAX_BOOK }), "down");
    f("label").value = f("baddr").value = ""; say(T("Đã lưu."), "up");
  }

  function refreshAll() {
    if (refreshing) return;
    refreshing = true; const tok = ++balTok; frame();
    BtcChain.balances(AddrBook.list().map(x => x.addr), (a, info) => { if (info) bal.set(a, BtcFlow.balance(info).confirmed); paintBook(); }, () => !host || tok !== balTok)
      .then(() => { if (host && tok === balTok) { refreshing = false; frame(); } });
  }

  function importFile(file) {
    if (!file || file.size > FILE_MAX) return say(T("Tệp quá lớn hoặc không hợp lệ."), "down");
    Dom.readFile(file, (name, text) => {
      try { const j = JSON.parse(text); say(T("Đã nhập {n} địa chỉ mới.", { n: AddrBook.merge(Array.isArray(j) ? j : j.book) }), "up"); }
      catch { say(T("Tệp JSON không hợp lệ."), "down"); }
    });
  }

  const actions = {
    lookup: () => lookup(f("addr").value), retry: () => lookup(st && st.addr || f("addr").value), more, save: saveEntry, refresh: refreshAll,
    export: () => Dom.download(JSON.stringify({ book: AddrBook.list() }, null, 2), "btc-address-book.json", "application/json"),
    star: () => { f("baddr").value = st.addr; const h = AddrBook.map().get(st.addr); f("label").value = h ? h.label : ""; if (h) f("tag").value = h.tag; f("label").focus(); },
  };

  function onClick(ev) {
    const t = ev.target.closest("[data-act],[data-lookup],[data-copy],[data-edit],[data-del]");
    if (!t) return;
    const d = t.dataset;
    if (d.act && actions[d.act]) actions[d.act]();
    else if (d.lookup) lookup(d.lookup);
    else if (d.copy) Dom.copy(d.copy).then(ok => { t.textContent = ok ? "✔" : "✖"; setTimeout(() => { t.textContent = "⧉"; }, 1200); });
    else if (d.edit) { const x = AddrBook.map().get(d.edit); if (x) { f("label").value = x.label; f("baddr").value = x.addr; f("tag").value = x.tag; f("label").focus(); } }
    else if (d.del) { bal.delete(d.del); AddrBook.remove(d.del); }
  }

  function mount(el) {
    host = el; seq = 0; refreshing = false; bmsg = null; st = null;
    el.innerHTML = `<div class="wl"><div data-v="top"></div><div data-v="whales"></div><div data-v="foot"></div></div>`;
    el.onclick = onClick;
    el.onkeydown = ev => { if (ev.key === "Enter" && ev.target.dataset.f === "addr") lookup(ev.target.value); else if (ev.key === "Enter" && ev.target.dataset.f && ev.target.dataset.f !== "file") saveEntry(); };
    el.onchange = ev => { if (ev.target.dataset.f === "file") { importFile(ev.target.files[0]); ev.target.value = ""; } };
    frame(); WhalePanel.mount(v("whales"));
    const last = Prefs.get("wallet.last", "");
    if (BtcFlow.normalize(last)) lookup(last);
  }

  function unmount() { WhalePanel.unmount(); seq++; balTok++; if (host) host.onclick = host.onkeydown = host.onchange = null; host = null; }
  function relabel() { if (host) { frame(); WhalePanel.relabel(); } }

  AddrBook.onChange(() => { if (host) { paintBook(); paintResult(); WhalePanel.refresh(); } });
  return { id: "wallet", label: "Ví BTC & cá voi", wide: true, mount, unmount, relabel };
})();

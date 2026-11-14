// Wallet tab helpers: shared cell markup (WalletUi), the personal address book (AddrBook) and the realtime whale-stream section (WhalePanel).
const WalletUi = (() => {
  const e = Dom.esc, LINK = 'target="_blank" rel="noopener noreferrer"';
  const tagName = tag => ({ exchange: T("Sàn giao dịch"), whale: T("Cá voi"), fund: T("Quỹ"), mine: T("Của tôi"), other: T("Khác") })[tag] || T("Khác");
  const btcMoney = sats => { const p = BtcChain.price(); return p ? Fmt.moneyBig(sats / BtcFlow.SAT * p) : ""; };
  const addrCell = (a, book) => {
    const hit = BtcFlow.labelOf(book, a);
    return `<button class="wl-lk" data-lookup="${e(a)}" title="${e(a)}">${hit ? `<b>${e(hit.label)}</b> ` : ""}<span class="${hit ? "muted" : ""}">${e(BtcFlow.short(a))}</span></button>`;
  };
  const txCell = id => `<span class="wl-tx"><a href="${e(BtcChain.txUrl(id))}" ${LINK} title="${e(id)}">${e(BtcFlow.short(id, 8))}</a><button class="wl-cp" data-copy="${e(id)}" title="${e(T("Chép"))}" aria-label="${e(T("Chép"))}">⧉</button></span>`;
  const time = ms => { const d = new Date(ms || Date.now()), p = n => String(n).padStart(2, "0"); return `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`; };
  return { tagName, btcMoney, addrCell, txCell, time, LINK };
})();

const AddrBook = (() => {
  let list = BtcFlow.cleanBook(Prefs.get("wallet.book", [])), map = null;
  const fns = [];
  const commit = () => { list = BtcFlow.cleanBook(list); map = null; Prefs.set("wallet.book", list); fns.forEach(f => f()); };
  const index = () => map || (map = new Map(list.map(x => [x.addr, x])));
  function save(entry) {
    const c = BtcFlow.cleanBook([entry])[0];
    if (!c) return false;
    const i = list.findIndex(x => x.addr === c.addr);
    if (i >= 0) list[i] = c; else if (list.length >= BtcFlow.MAX_BOOK) return false; else list.push(c);
    commit(); return true;
  }
  const remove = a => { list = list.filter(x => x.addr !== a); commit(); };
  const merge = raw => { const n = list.length; list = list.concat(BtcFlow.cleanBook(raw).filter(x => !index().has(x.addr))); commit(); return list.length - n; };
  return { list: () => list, map: index, has: a => index().has(a), save, remove, merge, onChange: f => fns.push(f) };
})();

const WhalePanel = (() => {
  const LEVELS = [10, 50, 100, 500, 1000], MAX = 100, e = Dom.esc;
  let host = null, ctl = null, tick = 0, list, stats, msgs, rate, state, threshold, dirty, lastRate;
  const q = k => host && host.querySelector(`[data-w="${k}"]`);
  const loadLevel = () => { const v = +Prefs.get("wallet.whale", 100); return LEVELS.includes(v) ? v : 100; };

  function onTx(x) {
    msgs++;
    const s = BtcFlow.summariseUtx(x);
    if (!BtcFlow.isWhale(s, threshold)) return;
    s.seen = Date.now();
    list.unshift(s); if (list.length > MAX) list.length = MAX;
    stats.n++; stats.sats += s.totalOut;
    if (!stats.top || s.totalOut > stats.top.totalOut) stats.top = s;
    dirty = true;
  }

  const reset = () => { list = []; stats = { n: 0, sats: 0, top: null }; };

  function start() {
    if (ctl) return;
    reset();
    ctl = BtcChain.watch({ onTx, onState: s => { state = s; dirty = true; } });
  }
  function stop() { if (ctl) { ctl.stop(); ctl = null; } }

  const row = s => {
    const f = s.inputs[0], t = s.outputs[0], book = AddrBook.map(), usd = WalletUi.btcMoney(s.totalOut);
    return `<tr><td>${e(WalletUi.time(s.seen))}</td><td class="r"><b>${e(BtcFlow.btc(s.totalOut))}</b> BTC</td><td class="r">${e(usd)}</td>`
      + `<td>${f ? WalletUi.addrCell(f.addr, book) : '<span class="muted">—</span>'}${s.inputs.length > 1 ? ` <span class="muted">+${s.inputs.length - 1}</span>` : ""}</td>`
      + `<td>${t ? WalletUi.addrCell(t.addr, book) : '<span class="muted">—</span>'}${s.outputs.length > 1 ? ` <span class="muted">+${s.outputs.length - 1}</span>` : ""}</td><td>${WalletUi.txCell(s.hash)}</td></tr>`;
  };

  const STATE = () => ({ connecting: T("Đang kết nối"), live: T("Trực tiếp"), reconnecting: T("Đang kết nối lại"), stopped: T("Đã dừng") })[state] || "";
  const card = (label, value, sub) => `<div class="card"><span>${e(label)}</span><b>${value}</b><em class="muted">${sub || "&nbsp;"}</em></div>`;

  function paintDyn() {
    if (!host) return;
    const b = q("badge"); b.textContent = STATE(); b.className = "badge" + (state === "live" ? " live" : state === "stopped" ? "" : " poll");
    q("rate").textContent = ctl ? T("{n} tin/giây", { n: Fmt.en(rate, 1) }) : "";
    q("toggle").textContent = ctl ? T("Dừng") : T("Bắt đầu");
    const top = stats.top;
    q("cards").innerHTML = card(T("Giao dịch cá voi"), Fmt.en(stats.n), "")
      + card(T("BTC đã chuyển"), `${e(BtcFlow.btc(stats.sats))} BTC`, e(WalletUi.btcMoney(stats.sats)))
      + card(T("Lớn nhất"), top ? `${e(BtcFlow.btc(top.totalOut))} BTC` : "—", top ? e(WalletUi.btcMoney(top.totalOut)) : "");
    q("list").innerHTML = list.length
      ? `<div class="wl-scroll"><table class="wl-tbl"><thead><tr><th>${e(T("Giờ"))}</th><th class="r">${e(T("Tổng BTC"))}</th><th class="r">${e(T("Giá trị"))}</th><th>${e(T("Từ (lớn nhất)"))}</th><th>${e(T("Đến (lớn nhất)"))}</th><th>${e(T("Mã giao dịch"))}</th></tr></thead><tbody>${list.map(row).join("")}</tbody></table></div>`
      : `<p class="muted wl-pad">${e(T("Chưa có giao dịch vượt ngưỡng {n} BTC — đang chờ…", { n: threshold }))}</p>`;
  }

  function paintCtl() {
    q("seg").innerHTML = LEVELS.map(n => `<button data-th="${n}" class="${n === threshold ? "on" : ""}">${n}</button>`).join("");
  }

  function frame() {
    host.innerHTML = `<div class="wl-sec"><b>${e(T("Cá voi realtime"))}</b><span class="muted">${e(T("Giao dịch chưa xác nhận lớn hơn ngưỡng (BTC)"))}</span></div>`
      + `<div class="wl-ctl"><button class="main" data-w="toggle"></button><span class="seg" data-w="seg"></span><span class="badge" data-w="badge"></span><span class="muted" data-w="rate"></span></div>`
      + `<div class="cards" data-w="cards"></div><div data-w="list"></div>`
      + `<p class="sc-note">${e(T("Tổng BTC gồm cả tiền thối về ví gửi nên có thể lớn hơn số tiền thực chuyển. Nhãn lấy từ sổ địa chỉ của bạn."))}</p>`;
    paintCtl();
  }

  function mount(el) {
    host = el; msgs = 0; rate = 0; state = "connecting"; dirty = true; threshold = loadLevel(); lastRate = Date.now(); reset();
    frame();
    el.onclick = ev => {
      const t = ev.target.closest("[data-w=toggle],[data-th]");
      if (!t) return;
      if (t.dataset.th) { threshold = +t.dataset.th; Prefs.set("wallet.whale", threshold); reset(); paintCtl(); dirty = true; }
      else if (ctl) { stop(); state = "stopped"; dirty = true; } else { state = "connecting"; start(); dirty = true; }
    };
    start();
    tick = setInterval(() => {
      const now = Date.now();
      if (now - lastRate >= 1000) { rate = msgs * 1000 / (now - lastRate); msgs = 0; lastRate = now; dirty = true; }
      if (dirty) { dirty = false; paintDyn(); }
    }, 500);
    paintDyn();
  }

  function unmount() { stop(); clearInterval(tick); tick = 0; if (host) host.onclick = null; host = null; }
  const relabel = () => { if (host) { frame(); paintDyn(); } };
  return { mount, unmount, relabel, refresh: () => { dirty = true; } };
})();

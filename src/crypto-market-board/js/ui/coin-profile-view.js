// "Hồ sơ" tab: CoinGecko profile — categories (sector), genesis date, consensus / hashing, block time, chains & contracts, official links, description.
const ProfileView = (() => {
  let seq = 0;
  const e = s => Dom.esc(s ?? "");
  const safe = u => /^https:\/\/[^\s"<>]+$/i.test(u || "") ? u : "";
  const link = (label, url) => safe(url) ? `<a href="${e(url)}" target="_blank" rel="noopener noreferrer">${e(label)}</a>` : "";
  // Description arrives as HTML from CoinGecko → plain text only.
  const plain = html => { const d = new DOMParser().parseFromString(String(html || ""), "text/html"); return (d.body.textContent || "").trim(); };

  function html(p) {
    const links = [[T("Trang chủ"), p.links.home], ["Whitepaper", p.links.whitepaper], ["Explorer", p.links.explorer], ["GitHub", p.links.github], ["X / Twitter", p.links.twitter], ["Reddit", p.links.reddit], [T("Diễn đàn"), p.links.forum]]
      .map(([l, u]) => link(l, u)).filter(Boolean).join(" · ");
    const chains = Object.entries(p.platforms).filter(([k, v]) => k && v).slice(0, 12);
    const desc = plain(p.desc);
    return `<table class="dtable kv"><tbody>`
      + `<tr><th>${e(T("Tên"))}</th><td><b>${e(p.name)}</b> (${e(p.sym)})</td></tr>`
      + (p.categories.length ? `<tr><th>${e(T("Nhóm ngành"))}</th><td>${p.categories.slice(0, 12).map(c => `<span class="rchip">${e(c)}</span>`).join("")}</td></tr>` : "")
      + (p.genesis ? `<tr><th>${e(T("Ngày ra mắt"))}</th><td>${e(p.genesis)}</td></tr>` : "")
      + (p.algo ? `<tr><th>${e(T("Thuật toán"))}</th><td>${e(p.algo)}</td></tr>` : "")
      + (p.blockMin ? `<tr><th>${e(T("Thời gian khối"))}</th><td>${e(T("{n} phút", { n: p.blockMin }))}</td></tr>` : "")
      + (chains.length ? `<tr><th>${e(T("Chuỗi / hợp đồng"))}</th><td>${chains.map(([k, v]) => `<div><b>${e(k)}</b> <code class="addr" title="${e(v)}">${e(v)}</code></div>`).join("")}</td></tr>` : "")
      + (links ? `<tr><th>${e(T("Liên kết"))}</th><td>${links}</td></tr>` : "")
      + `</tbody></table>`
      + (desc ? `<div class="dsec"><b>${e(T("Giới thiệu (tiếng Anh, CoinGecko)"))}</b></div><p class="summary pad">${e(desc.slice(0, 2500))}${desc.length > 2500 ? "…" : ""}</p>` : "")
      + `<p class="src muted pad">${e(T("Nguồn: CoinGecko. Kiểm tra kỹ địa chỉ hợp đồng trước khi giao dịch — token giả thường trùng tên."))}</p>`;
  }

  async function open(sym) {
    const my = ++seq, el = $("dProfile");
    el.innerHTML = `<p class="pad muted">${e(T("Đang tải hồ sơ…"))}</p>`;
    if (!Coins.id(sym)) await Coins.resolve(sym);
    const id = Coins.id(sym);
    if (my !== seq) return;
    if (!id) { el.innerHTML = `<p class="pad muted">${e(T("Không tìm thấy {s} trên CoinGecko.", { s: sym }))}</p>`; return; }
    try {
      const p = await Gecko.profile(id);
      if (my === seq) el.innerHTML = html(p);
    } catch (err) {
      if (my !== seq) return;
      console.warn("ProfileView.open - get coingecko profile fail", id, err.message);
      el.innerHTML = `<div class="errbox">${e(err.rateLimited ? T("CoinGecko giới hạn tần suất — thử lại sau ~{n}s.", { n: err.retryIn || 60 }) : T("Không tải được hồ sơ từ CoinGecko."))}</div>`;
    }
  }

  return { open };
})();

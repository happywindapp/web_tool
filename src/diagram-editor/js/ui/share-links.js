// Mermaid payload stays mermaid.live compatible ({code, mermaid, …}, no tab); the other engines add `tab`. A payload without a known tab is Mermaid.
const ShareLink = (() => {
  const payload = () => engine.id === "mermaid"
    ? { code: $("src").value, mermaid: $("cfg").value, autoSync: true, updateDiagram: true }
    : { tab: engine.id, code: $("src").value, config: $("cfg").value };

  const config = p => typeof p.config === "string" ? p.config : typeof p.mermaid === "string" ? p.mermaid : p.mermaid ? JSON.stringify(p.mermaid, null, 2) : "";

  async function open(hash, from) {
    try {
      const raw = decodeURIComponent(hash.replace(/^#/, "")), p = await ShareCodec.decode(raw);
      if (p === null) return false;
      if (typeof p !== "object" || p === null) throw new Error(T("thiếu dữ liệu"));
      const id = Object.hasOwn(ENGINES, p.tab) ? p.tab : "mermaid";
      if (id !== engine.id) switchEngine(id, false);
      setState({ code: String(p.code ?? ""), config: config(p) }, from);
      return true;
    } catch (e) { flash(T("✖ Link chia sẻ bị hỏng hoặc không đúng định dạng: {msg}", { msg: e.message }), true); return false; }
  }

  async function share() {
    try {
      const u = new URL(location.href);
      u.search = engine.id === "mermaid" ? "" : `?tab=${engine.id}`;
      u.hash = await ShareCodec.encode(payload());
      const link = u.href, local = location.protocol === "file:" ? " " + T("Đang mở bằng file:// nên link chỉ dùng được trên máy này.") : "";
      const msg = T("Đã chép link chia sẻ ({n} ký tự).", { n: I18n.num(link.length) }) + local;
      Promise.resolve().then(() => navigator.clipboard.writeText(link))
        .then(() => flash(msg), () => prompt(T("Trình duyệt chặn sao chép — hãy tự chép link này:"), link));
    } catch (e) { flash(T("✖ Không tạo được link: {msg}", { msg: e.message }), true); }
  }

  function askAndOpen() {
    const s = prompt(T("Dán link chia sẻ (của tool này hoặc mermaid.live, dạng …#pako:…):"));
    if (!s) return;
    const hash = s.slice(s.indexOf("#"));
    if (s.includes("#") && /^#(pako|base64):/.test(hash)) open(hash, "từ link");
    else flash(T("✖ Không thấy dữ liệu #pako: / #base64: trong link."), true);
  }

  return { open, share, askAndOpen };
})();

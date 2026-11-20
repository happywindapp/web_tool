// Preview body for HTML: srcdoc iframe with sandbox (scripts off until the user turns them on) and its own CSP on top of the inherited one, so it cannot reach the network or One Editor.
const PvHtml = {
  // Added right after any doctype (before it would switch to quirks mode); a meta CSP can only tighten the inherited policy.
  CSP: "<meta http-equiv=\"Content-Security-Policy\" content=\"default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data: blob:; font-src data:; media-src data: blob:\">",
  wrap(html) { const m = /^\s*<!doctype[^>]*>/i.exec(html), at = m ? m[0].length : 0; return html.slice(0, at) + PvHtml.CSP + html.slice(at); },
  create(p) {
    const v = { el: Object.assign(document.createElement("div"), { className: "pv-html" }), html: "", scripts: false, frame: null };
    const btn = Object.assign(document.createElement("button"), { className: "pv-script" });
    v.tools = [btn];

    const load = fresh => {
      if (fresh || !v.frame) {
        v.frame?.remove();
        v.frame = Object.assign(document.createElement("iframe"), { className: "pv-frame", title: "HTML preview" });
        v.frame.setAttribute("sandbox", v.scripts ? "allow-scripts" : "");
        v.el.append(v.frame);
      }
      v.frame.srcdoc = PvHtml.wrap(v.html);
    };
    v.labels = () => {
      btn.textContent = v.scripts ? T("⏹ Tắt script") : T("▶ Bật script");
      btn.title = v.scripts ? T("Tải lại trang preview với script bị chặn") : T("Chạy script của trang trong sandbox — không đọc được One Editor, không gọi được mạng");
      btn.setAttribute("aria-pressed", String(v.scripts));
      p.type.textContent = v.scripts ? T("HTML · script đang chạy") : T("HTML · script tắt");
    };
    btn.onclick = () => { v.scripts = !v.scripts; v.labels(); load(true); };
    v.show = d => { v.html = d.empty ? "" : d.html; load(false); v.labels(); return !d.empty; };
    return v;
  },
};

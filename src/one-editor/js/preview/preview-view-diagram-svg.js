// Preview body for drawings (diagram engines, SVG files): sanitized SVG in a shadow root so its <style> cannot touch the page; pan/zoom, fit, SVG/PNG, copy.
const PvDiagram = {
  create(p) {
    const el = (tag, cls) => Object.assign(document.createElement(tag), { className: cls });
    const v = { el: el("div", "pv-view"), stage: el("div", "pv-stage"), sel: el("select", "pv-pick"), svg: null, bg: "#ffffff", fitted: false, pick: null };
    const root = v.stage.attachShadow({ mode: "open" });
    const b = (fn, cls = "") => Object.assign(el("button", cls), { onclick: fn });
    v.b = { out: b(() => v.pz.zoom(0.8)), pct: b(() => v.pz.center(1), "pv-pct"), in: b(() => v.pz.zoom(1.25)), fit: b(() => v.fit()),
      svg: b(() => PreviewPane.exportSvgOf(p)), png: b(() => PreviewPane.exportPngOf(p)), copy: b(() => PreviewPane.copySvgOf(p)) };
    v.sel.hidden = true;
    v.sel.onchange = () => { v.pick = v.sel.value; PreviewPane.rerun(p); };
    v.el.append(v.stage);
    // Links inside a drawing never navigate this page (a #pako: href would load another share link).
    v.el.addEventListener("click", e => { if (e.composedPath().some(n => n.localName === "a")) e.preventDefault(); });
    v.tools = [v.sel, ...Object.values(v.b)];
    v.pz = PanZoomCtl.attach(v.el, v.stage, s => { v.b.pct.textContent = Math.round(s * 100) + "%"; });
    v.b.pct.textContent = "100%";

    v.fit = () => { v.fitted = v.pz.center(); };
    v.mounted = () => { if (!v.fitted) requestAnimationFrame(v.fit); };
    v.labels = () => {
      const set = (k, text, tip) => { v.b[k].textContent = text; v.b[k].title = tip; };
      set("out", "−", T("Thu nhỏ")); set("in", "+", T("Phóng to")); v.b.pct.title = T("Về 100%");
      set("fit", T("⤢ Vừa khung"), T("Thu / phóng cho vừa khung"));
      set("svg", "⬇ SVG", T("Tải hình dạng SVG")); set("png", "⬇ PNG", T("Tải hình dạng PNG (độ nét gấp đôi)"));
      set("copy", T("⧉ Chép SVG"), T("Chép mã SVG vào clipboard"));
      v.sel.title = T("Chọn view cần vẽ");
      v.el.title = T("Kéo để di chuyển, lăn chuột hoặc chụm 2 ngón để phóng to / thu nhỏ");
    };

    // d: { svg, bg, type, pick } | { empty }; returns whether a drawing is shown.
    v.show = d => {
      const svg = d.empty ? null : SvgSanitizer.clean(d.svg);
      root.replaceChildren(...(svg ? [svg] : []));
      v.svg = svg;
      if (!svg) return false;
      const vb = svg.viewBox.baseVal;
      svg.style.maxWidth = "none"; svg.style.display = "block";
      if (vb && vb.width) { svg.setAttribute("width", vb.width); svg.setAttribute("height", vb.height); }
      v.el.style.backgroundColor = v.bg = d.bg;
      p.type.textContent = d.type;
      v.sel.hidden = !d.pick;
      if (d.pick) { v.sel.replaceChildren(...d.pick.options.map(([val, label]) => new Option(label, val))); v.sel.value = v.pick = d.pick.value; }
      if (!v.fitted) v.fit();
      return true;
    };
    return v;
  },
};

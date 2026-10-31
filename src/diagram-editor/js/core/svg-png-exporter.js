// PNG goes through a data: URL (not blob:) so the canvas stays untainted even with <foreignObject> labels.
const Exporter = (() => {
  const size = svg => { const vb = svg.viewBox.baseVal; return vb && vb.width ? [vb.width, vb.height] : [svg.clientWidth, svg.clientHeight]; };
  function svgText(svg, bg) {
    const c = svg.cloneNode(true), [w, h] = size(svg);
    c.setAttribute("xmlns", "http://www.w3.org/2000/svg"); c.setAttribute("width", w); c.setAttribute("height", h);
    c.style.backgroundColor = bg;
    return '<?xml version="1.0" encoding="UTF-8"?>\n' + new XMLSerializer().serializeToString(c);
  }
  async function png(svg, bg, scale) {
    const [w, h] = size(svg), img = new Image();
    img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svgText(svg, bg));
    await img.decode();
    const cv = document.createElement("canvas");
    cv.width = Math.ceil(w * scale); cv.height = Math.ceil(h * scale);
    const g = cv.getContext("2d");
    g.fillStyle = bg; g.fillRect(0, 0, cv.width, cv.height); g.drawImage(img, 0, 0, cv.width, cv.height);
    return new Promise((ok, no) => cv.toBlob(b => b ? ok(b) : no(new Error(T("ảnh quá lớn, hãy giảm độ phân giải"))), "image/png"));
  }
  return { svgText, png };
})();

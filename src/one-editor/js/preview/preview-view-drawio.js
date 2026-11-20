// Preview body for draw.io: nothing leaves the page until the user clicks Connect (ADR #22); one embed frame at a time, edits in it update the source tab.
const PvDrawio = (() => {
  let owner = null;
  const mk = (tag, cls) => Object.assign(document.createElement(tag), cls ? { className: cls } : {});

  function release(v) {
    if (owner !== v) return;
    owner = null;
    v.box.replaceChildren();
    v.box.hidden = true; v.gate.hidden = false;
  }

  function connect(v) {
    if (owner && owner !== v) release(owner);
    owner = v;
    v.gate.hidden = true; v.fail.hidden = true; v.box.hidden = false;
    StatusBar.msg(T("Đang kết nối embed.diagrams.net…"), "");
    DrawioEmbed.connect(v.xml, v.box, I18n.lang);
  }

  async function openInDiagramEditor(v) {
    try { window.open("diagram-editor.html?tab=drawio#" + await ShareCodec.encode({ tab: "drawio", code: v.xml, config: "{}" }), "_blank", "noopener"); }
    catch (e) { StatusBar.msg(T("✖ Không tạo được link: {msg}", { msg: e.message }), "bad"); }
  }

  function create(p) {
    const v = { el: mk("div", "pv-dio"), gate: mk("div", "pv-dio-gate"), box: mk("div", "pv-dio-frame"), fail: mk("p", "pv-dio-fail"), xml: "", doc: p.doc };
    const text = mk("p"), go = mk("button", "main"), open = mk("button");
    v.gate.append(text, go, open, v.fail);
    v.box.hidden = v.fail.hidden = true;
    v.el.append(v.gate, v.box);
    v.tools = [];
    go.onclick = () => connect(v);
    open.onclick = () => openInDiagramEditor(v);
    v.labels = () => {
      text.textContent = T("Sơ đồ draw.io hiện bằng trình soạn embed.diagrams.net — chỉ kết nối khi bạn bấm (mỗi lần mở trang). Sửa trong draw.io là cập nhật luôn tab nguồn.");
      go.textContent = T("🔌 Kết nối draw.io");
      open.textContent = T("↗ Mở trong Diagram Editor");
      open.title = T("Mở sơ đồ này ở tab draw.io của Diagram Editor (tab trình duyệt mới)");
      v.fail.textContent = T("✖ Không kết nối được embed.diagrams.net — kiểm tra mạng / proxy. Sơ đồ vẫn còn trong trình duyệt.");
    };
    v.show = d => {
      v.xml = d.empty ? "" : d.xml;
      p.type.textContent = "draw.io";
      if (owner === v) DrawioEmbed.load(v.xml);
      return !d.empty;
    };
    v.destroy = () => release(v);
    return v;
  }

  function init() {
    DrawioEmbed.init({
      onReady: () => StatusBar.msg(T("✔ Đã nạp sơ đồ vào draw.io."), "good"),
      onFail: () => { if (!owner) return; const v = owner; release(v); v.fail.hidden = false; StatusBar.msg(v.fail.textContent, "bad"); },
      onChange: xml => {
        const out = owner && Docs.get(owner.doc), src = out && Docs.get(out.link.src);
        if (!src || src.readOnly) StatusBar.msg(T("Sửa trong draw.io không ghi được vào tab nguồn (đã đóng hoặc chỉ đọc) — dùng Save của draw.io hoặc mở lại tab nguồn."), "warn");
        else if (Docs.text(src) !== xml) Views.replaceText(src, xml);
      },
      onExport: () => {},
    });
  }

  return { create, init };
})();

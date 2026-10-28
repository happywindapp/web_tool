// Dialogs: anonymize by category (remembered) and custom dictionary CSV (stored in this browser); theme select bound to ThemePicker.
const Settings = (() => {
  let deps = null, custom = null;
  const esc = s => Dom.esc(s);
  const dlg = () => $("dlg");

  function open(html, bind) {
    dlg().innerHTML = html;
    bind(dlg());
    dlg().querySelectorAll("[data-a=close]").forEach(b => { b.onclick = () => dlg().close(); });
    dlg().showModal();
  }

  function anonymize() {
    const cats = Store.get("maskCats", FixMask.DEFAULT), extra = Store.get("maskExtra", "");
    const sens = FixCustom.tags(custom, "sensitive");
    open(`<h3>${esc(T("Che dữ liệu nhạy cảm"))}</h3><p class="muted">${esc(T("Giá trị được thay bằng bí danh cùng độ dài (cùng giá trị → cùng bí danh nên chuỗi lệnh vẫn nối được), mật khẩu và Text thành dấu *. Message hợp lệ được tính lại 9/10."))}</p>` +
      Object.entries(FixMask.CATEGORIES).map(([k, c]) => `<label class="chk"><input type="checkbox" data-cat="${k}" ${cats.includes(k) ? "checked" : ""}>${esc(T(c.label))}</label>`).join("") +
      `<label>${esc(T("Thêm tag (cách nhau bằng dấu phẩy)"))} <input type="text" id="maskExtra" value="${esc(extra)}" placeholder="9879,20001"></label>` +
      (sens.length ? `<p class="muted">${esc(T("Từ điển riêng đánh dấu nhạy cảm: {tags}", { tags: sens.join(", ") }))}</p>` : "") +
      `<div class="row"><button class="main" data-a="ok">${esc(T("Che dữ liệu"))}</button><button data-a="close">${esc(T("Huỷ"))}</button></div>`, d => {
      d.querySelector("[data-a=ok]").onclick = () => {
        const chosen = [...d.querySelectorAll("[data-cat]:checked")].map(x => x.dataset.cat), more = d.querySelector("#maskExtra").value;
        Store.set("maskCats", chosen);
        Store.set("maskExtra", more);
        d.close();
        deps.mask(chosen, [...more.split(/[\s,;]+/).filter(t => /^\d+$/.test(t)), ...sens]);
      };
    });
  }

  function dictionary() {
    open(`<h3>${esc(T("Từ điển riêng (CSV)"))}</h3><p class="muted">${esc(T("Mỗi dòng: tag,name,type,value,meaning,flags — dòng có value thêm ý nghĩa cho giá trị; flags: sensitive (che khi ẩn danh), link (nối chuỗi lệnh cha–con). Lưu trong trình duyệt này, áp lên mọi từ điển."))}</p>` +
      `<textarea id="dictText" class="code" rows="10" spellcheck="false" data-i18n-skip></textarea><div id="dictErr" class="bad"></div>` +
      `<div class="row"><label class="btn">${esc(T("Mở file CSV…"))}<input type="file" id="dictFile" accept=".csv,.txt"></label><button data-a="sample">${esc(T("Chèn ví dụ"))}</button>` +
      `<span class="grow"></span><button class="main" data-a="ok">${esc(T("Lưu & áp dụng"))}</button><button data-a="clear">${esc(T("Xoá từ điển"))}</button><button data-a="close">${esc(T("Đóng"))}</button></div>`, d => {
      const ta = d.querySelector("#dictText");
      ta.value = Store.get("customDict", "");
      d.querySelector("[data-a=sample]").onclick = () => { ta.value = (ta.value.trim() ? ta.value.trim() + "\n" : "") + FixCustom.SAMPLE; };
      d.querySelector("#dictFile").onchange = e => { const f = e.target.files[0]; if (f) f.text().then(t => { ta.value = t.replace(/^﻿/, ""); }); };
      const apply = text => {
        const c = FixCustom.parse(text);
        d.querySelector("#dictErr").textContent = c.errors.length ? T("Bỏ qua {n} dòng không hợp lệ (dòng {lines}).", { n: c.errors.length, lines: c.errors.map(x => x.line).join(", ") }) : "";
        if (!Store.set("customDict", text)) return LinkIO.note(T("✖ Không lưu được — bộ nhớ trình duyệt đầy hoặc bị chặn."), "bad");
        load(text);
        if (!c.errors.length) d.close();
        LinkIO.note(T("✔ Từ điển riêng: {n} tag.", { n: c.fields.size }), "good");
      };
      d.querySelector("[data-a=ok]").onclick = () => apply(ta.value);
      d.querySelector("[data-a=clear]").onclick = () => { ta.value = ""; apply(""); };
    });
  }

  function load(text) {
    custom = FixCustom.parse(text);
    FixDict.setCustom(custom);
    deps.dictChanged();
  }


  // deps: { mask(cats, extraTags), dictChanged() }
  function init(d) {
    deps = d;
    custom = FixCustom.parse(Store.get("customDict", ""));
    FixDict.setCustom(custom);
    $("mask").onclick = anonymize;
    $("dictBtn").onclick = dictionary;
    ThemePicker.bind($("theme"), Store);
  }

  return { init, linkTags: () => FixCustom.tags(custom, "link") };
})();

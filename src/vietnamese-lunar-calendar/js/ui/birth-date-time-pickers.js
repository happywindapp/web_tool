// Ngày sinh: nút 📅 mở bộ chọn ngày của trình duyệt, ghi lại theo radio dương/âm; giờ sinh: datalist 24 mốc giờ kèm canh giờ. Ô gõ tay vẫn giữ nguyên.
const BirthPickers = (() => {
  const pad = n => String(n).padStart(2, "0");
  const iso = jd => { const s = LunarCal.jdToDate(jd); return `${s.y}-${pad(s.m)}-${pad(s.d)}`; };
  const lunarText = jd => { const l = LunarCal.fromJd(jd); return `${pad(l.d)}/${pad(l.m)}${l.leap ? "n" : ""}/${l.y}`; };

  function fillHours() {
    $("birthHours").innerHTML = Array.from({ length: 24 }, (_, h) =>
      `<option value="${pad(h)}:00">${Dom.esc(T("giờ {chi}", { chi: T(CanChi.CHI[Math.floor((h + 1) / 2) % 12]) }))}</option>`).join("");
  }

  // ids: { text, pick, lunar } (element ids); today: jd; onPick(): called after the text box is filled.
  function attach({ text, pick, lunar }, today, onPick) {
    const box = $(text), picker = $(pick);
    fillHours();
    picker.min = `${LunarCal.MIN_YEAR}-01-01`;
    picker.max = iso(today);
    // Opens on the date already typed (read with the selected calendar), else on today.
    const sync = () => { const r = DateText.parse(box.value, { lunar: $(lunar).checked }); picker.value = r.jd && r.jd <= today ? iso(r.jd) : ""; };
    picker.addEventListener("pointerdown", sync);
    picker.addEventListener("click", () => { try { picker.showPicker(); } catch { /* the native tap already opens it */ } });
    picker.addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " ") { sync(); try { picker.showPicker(); } catch { /* unsupported */ } } });
    picker.addEventListener("change", () => {
      if (!picker.value) return;
      const [y, m, d] = picker.value.split("-").map(Number), jd = LunarCal.jdFromDate(d, m, y);
      box.value = $(lunar).checked ? lunarText(jd) : `${pad(d)}/${pad(m)}/${y}`;
      box.classList.remove("bad");
      onPick();
    });
  }

  I18n.onChange(fillHours);
  return { attach, fillHours };
})();

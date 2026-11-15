// Tab SIM phong thủy: tên + cách tính từng tiêu chí, ý nghĩa của kết quả (vì sao được/mất điểm), tổng kết điểm mạnh/yếu và lời khuyên.
const SimExplain = (() => {
  const NAME = { yinyang: "Âm dương cân bằng", natal: "Ngũ hành SIM – bản mệnh", useful: "Bổ khuyết tứ trụ (dụng thần)", main: "Quẻ chủ Kinh Dịch",
    mutual: "Quẻ hỗ (diễn biến)", tidung: "Hành quẻ bát quái (Thể – Dụng)", nine: "Cửu tinh đồ pháp", folk: "Quan niệm dân gian" };
  const HOW = { yinyang: "Số chẵn là âm, số lẻ là dương; 5/5 là cân bằng nhất, 6/4 cũng tốt nếu bên nhiều hơn bù cho can năm sinh (can dương cần thêm âm, can âm cần thêm dương).",
    natal: "Hành SIM = tổng các số rút gọn về 1–9, tra Hậu Thiên bát quái; so với mệnh nạp âm năm sinh.",
    useful: "Tứ trụ giờ – ngày – tháng – năm sinh cho biết hành còn thiếu (dụng thần); SIM mang đúng hành đó là bổ khuyết tốt nhất.",
    main: "Thượng quái = tổng 5 số đầu mod 8, hạ quái = tổng 5 số cuối mod 8 (Mai Hoa Dịch số); quẻ chủ nói về bản chất SIM.",
    mutual: "Quẻ hỗ lấy hào 2–4 và 3–5 của quẻ chủ, nói về diễn biến, quá trình sử dụng.",
    tidung: "Quái có hào động là Dụng (sự việc), quái tĩnh là Thể (người dùng); Dụng sinh Thể hoặc tỷ hòa là tốt.",
    nine: "Mỗi số 1–9 ứng một sao Cửu tinh (Lạc Thư); SIM có số của sao đang vượng theo vận Huyền Không (vận 9 → số 9) là tốt nhất, số sinh khí (1, 2) kế tiếp.",
    folk: "Số nút (tổng mod 10, càng cao càng tốt), tỷ lệ cặp số cát theo bát tinh, đuôi số đẹp/kiêng." };
  const REL = { "Thể Dụng tỷ hòa": "Thể và Dụng cùng hành: mọi việc thuận hòa, dễ thành.", "Dụng sinh Thể": "Dụng sinh Thể: được giúp đỡ, có lợi — tốt nhất.",
    "Thể khắc Dụng": "Thể khắc Dụng: chủ động nắm được việc, thành công nhưng phải nỗ lực.", "Thể sinh Dụng": "Thể sinh Dụng: hao tổn công sức, tiền bạc.",
    "Dụng khắc Thể": "Dụng khắc Thể: bị áp chế, nhiều trở ngại." };
  const NATAL = { "SIM sinh mệnh (tốt nhất)": "Hành của SIM nuôi dưỡng mệnh chủ: được nâng đỡ, việc hanh thông.",
    "SIM và mệnh cùng hành (bình hòa)": "Cùng hành nên tương trợ, ổn định; không thêm cũng không bớt.",
    "Mệnh khắc SIM (chế ngự được)": "Chủ khắc SIM: chủ động kiểm soát được nhưng tốn sức hơn.",
    "Mệnh sinh SIM (hao tổn)": "Chủ phải nuôi SIM: dễ hao tâm sức, tiền bạc.",
    "SIM khắc mệnh (xấu)": "SIM khắc mệnh chủ: dân gian cho là dễ gặp trở ngại, nên tránh." };
  const ROLE = { "dụng thần": "Tứ trụ đang thiếu đúng hành này nhất — SIM bổ khuyết trực tiếp, tốt nhất.",
    "hỷ thần": "Hành này hỗ trợ dụng thần — SIM giúp cân bằng lá số, tốt.",
    "nhàn thần": "Hành trung tính với lá số: không giúp cũng không hại nhiều.",
    "cừu thần": "Hành này nuôi kỵ thần — bất lợi gián tiếp.",
    "kỵ thần": "Hành này làm lá số lệch thêm — nên tránh." };
  const RATING = { "Đại cát": "Quẻ đại cát: nền tảng rất tốt.", "Cát": "Quẻ cát: thuận lợi.", "Bình": "Quẻ bình: không tốt không xấu, tùy các tiêu chí khác.",
    "Hung": "Quẻ hung: bất lợi." };
  const ADVICE = { "Rất tốt": "Rất hợp: nên giữ, dùng làm số chính lâu dài.", "Tốt": "Hợp: dùng tốt; có thể cải thiện thêm ở các tiêu chí còn yếu.",
    "Trung bình": "Dùng được nhưng chưa nổi bật; nếu chọn số mới, ưu tiên khắc phục các tiêu chí còn yếu.",
    "Chưa hợp": "Chưa hợp: nên cân nhắc đổi số, nhất là khi quẻ chủ hung hoặc SIM khắc mệnh." };

  function yinYang(yy) {
    const diff = Math.abs(yy.even - yy.odd);
    if (diff === 0) return T("Âm dương hài hòa: năng lượng cân bằng, dân gian cho là SIM “êm”, hợp dùng lâu dài.");
    if (diff === 2) return T(yy.k === 1 ? "Lệch nhẹ nhưng nghiêng đúng phía bù cho can năm sinh của chủ — xem như hài hòa." : "Lệch nhẹ: vẫn chấp nhận được; tốt hơn nếu bên nhiều hơn bù được can năm sinh.");
    if (diff === 4) return T(yy.even > yy.odd ? "Nghiêng âm rõ (nhiều số chẵn): dân gian cho là dễ trầm, chậm, thiếu bứt phá." : "Nghiêng dương rõ (nhiều số lẻ): dân gian cho là dễ nóng vội, hao tổn.");
    return T("Mất cân bằng âm dương nặng: dân gian khuyên tránh dùng làm số chính.");
  }

  function nine(s) {
    if (s.key === "Vượng khí") return T("Có số {v} của sao đang nắm vận — đón vượng khí thời vận (tài lộc, cơ hội) đến hết vận ({end}).", { v: s.prosper, end: s.end });
    if (s.key === "Sinh khí") return T("Có số của sao sắp vượng ({s}) — năng lượng đang lên, lợi về lâu dài.", { s: s.rising.join(", ") });
    if (s.key === "Thoái khí") return T("Chỉ có số {f} của sao vừa hết vận — năng lượng đang suy.", { f: s.fading });
    return T("Không có số vượng/sinh khí của vận hiện tại — thiếu trợ lực thời vận.");
  }

  function folk(r) {
    const nutText = r.nut >= 9 ? "{nut} nút: nhóm nút cao, dân gian rất chuộng." : r.nut >= 7 ? "{nut} nút: khá cao." : r.nut >= 5 ? "{nut} nút: trung bình." : "{nut} nút: thấp, dân gian ít chuộng.";
    const ending = r.folk.ending === "good" ? T("Đuôi số đẹp theo dân gian.") : r.folk.ending === "bad" ? T("Đuôi số dân gian kiêng.") : T("Đuôi số bình thường.");
    return T(nutText, { nut: r.nut }) + " " + T("{good}/{n} cặp số mang sao cát (Sinh Khí, Thiên Y, Diên Niên, Phục Vị).", { good: r.goodPairs, n: r.pairs.length }) + " " + ending;
  }

  // Meaning of one criterion's result (why it scored what it did).
  function why(c, r) {
    switch (c.id) {
      case "yinyang": return yinYang(c.yy);
      case "natal": return c.nat ? T(NATAL[c.nat.key]) : T("Nhập ngày sinh để biết SIM có hợp mệnh nạp âm của chủ không.");
      case "useful": return r.bazi ? T(ROLE[r.bazi.role[r.el]]) : T("Nhập ngày sinh để xác định hành tứ trụ còn thiếu.");
      case "main": return T(r.hex.main.meaning) + " " + T(RATING[r.hex.main.rating]);
      case "mutual": return T(r.hex.mutual.meaning) + " " + T(RATING[r.hex.mutual.rating]);
      case "tidung": return T(REL[r.hex.rel.key]);
      case "nine": return nine(c.star);
      default: return folk(r);
    }
  }

  function summary(r) {
    const used = r.criteria.filter(c => c.pts !== null), names = list => list.map(c => T(NAME[c.id])).join(", ");
    return { advice: T(ADVICE[r.verdict]), strong: names(used.filter(c => c.k >= 0.75)), weak: names(used.filter(c => c.k < 0.4)) };
  }

  return { NAME, HOW, REL, why, summary };
})();

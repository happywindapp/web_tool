// Lời giải thích và lời khuyên cho mục “Dành cho bạn” (ngày hợp/xung tuổi, ngũ hành, dụng thần, số ngày cá nhân) — cặp VI/EN, VI là khóa T().
const PersonalText = (() => {
  const en = {};
  const p = (vi, enText) => { en[vi] = enText; return vi; };

  const REASON = {
    clash: p("Ngày {day} xung khắc tuổi {age} của bạn (chi đối xung, nạp âm khắc).", "{day} day clashes with your {age} birth year (opposite branch, conflicting elements)."),
    xung: p("Chi ngày {chi} đối xung với tuổi {age}.", "The day branch {chi} opposes your {age} birth year."),
    hai: p("Chi ngày {chi} lục hại với tuổi {age}: dễ hiểu lầm, vướng víu.", "The day branch {chi} is in a “harm” relation with {age}: misunderstandings, snags."),
    tamHop: p("Chi ngày {chi} tam hợp với tuổi {age}: dễ được hỗ trợ.", "The day branch {chi} is in a triple harmony with {age}: support comes easily."),
    lucHop: p("Chi ngày {chi} lục hợp với tuổi {age}: hòa thuận, dễ thỏa thuận.", "The day branch {chi} pairs harmoniously with {age}: smooth agreements."),
    sameChi: p("Ngày {chi} trùng chi tuổi bạn: ổn định, ít biến động.", "{chi} day shares your birth-year branch: steady, few surprises."),
    elGen: p("Nạp âm ngày ({day}) sinh mệnh {me} của bạn.", "The day’s element ({day}) nourishes your {me} destiny element."),
    elSame: p("Nạp âm ngày ({day}) cùng hành với mệnh {me}.", "The day’s element ({day}) matches your {me} destiny element."),
    elBeat: p("Nạp âm ngày ({day}) khắc mệnh {me} của bạn.", "The day’s element ({day}) overcomes your {me} destiny element."),
    useful: p("Ngày mang hành {el} — dụng thần trong bát tự của bạn.", "The day carries {el} — the useful element of your chart."),
    avoid: p("Ngày mang hành {el} — kỵ thần trong bát tự của bạn.", "The day carries {el} — the unfavourable element of your chart."),
    good: p("Ngày hoàng đạo ({god}).", "Auspicious day ({god})."),
    bad: p("Ngày hắc đạo ({god}).", "Inauspicious day ({god})."),
    taboo: p("Ngày kỵ chung: {list}.", "Generally avoided day: {list}."),
  };

  const ADVICE = {
    great: p("Ngày rất hợp với bạn: nên làm việc quan trọng, gặp gỡ, đàm phán, bắt đầu kế hoạch mới.", "A very good day for you: do important tasks, meet people, negotiate, start new plans."),
    good: p("Ngày thuận lợi: tiến hành công việc đã chuẩn bị, chủ động liên hệ người cần gặp.", "A favourable day: move ahead with prepared work and reach out to the people you need."),
    normal: p("Ngày bình thường: làm việc thường nhật, chưa nên quyết định lớn nếu chưa chắc chắn.", "An ordinary day: keep to routine work and hold off big decisions you are unsure about."),
    careful: p("Ngày nên cẩn trọng: tránh ký kết, khai trương, đi xa, đầu tư lớn; giữ bình tĩnh khi tranh luận.", "A day for caution: avoid signing, launching, long trips and big investments; stay calm in arguments."),
    color: p("Màu may mắn hôm nay: {colors}.", "Lucky colours today: {colors}."),
    dir: p("Hướng tốt cho bạn: {dir} ({kind}); hôm nay Tài thần ở {tai}, Hỷ thần ở {hy}.", "Your good direction: {dir} ({kind}); today the God of Wealth is {tai}, the God of Joy {hy}."),
    birthday: p("🎂 Chúc mừng sinh nhật! Một ngày để nhìn lại và đặt mục tiêu mới.", "🎂 Happy birthday! A day to look back and set new goals."),
  };

  const NUM = [null,
    [p("Khởi đầu", "Beginnings"), p("Hợp để bắt đầu việc mới, chủ động đưa ra ý tưởng và tự quyết.", "Good for starting new things, taking initiative and deciding for yourself.")],
    [p("Hợp tác", "Partnership"), p("Lắng nghe, kiên nhẫn, làm việc nhóm; hợp để hòa giải và kết nối.", "Listen, be patient, work with others; good for mending and connecting.")],
    [p("Sáng tạo – giao tiếp", "Creativity & expression"), p("Viết, trình bày, gặp gỡ bạn bè; tránh phân tán năng lượng.", "Write, present, meet friends; avoid scattering your energy.")],
    [p("Nền tảng – chăm chỉ", "Foundations & work"), p("Sắp xếp, làm việc chi tiết, hoàn thiện kế hoạch; ít hợp với mạo hiểm.", "Organise, do detailed work, finish plans; not a day for risks.")],
    [p("Thay đổi – tự do", "Change & freedom"), p("Linh hoạt, đi lại, thử điều mới; cẩn thận với quyết định bốc đồng.", "Be flexible, travel, try something new; beware of impulsive choices.")],
    [p("Gia đình – trách nhiệm", "Home & responsibility"), p("Dành thời gian cho người thân, giải quyết việc nhà, giúp đỡ người khác.", "Spend time with family, handle home matters, help others.")],
    [p("Suy ngẫm – học hỏi", "Reflection & study"), p("Nghiên cứu, đọc sách, nghỉ ngơi; chưa nên quyết định vội.", "Research, read, rest; don’t rush decisions.")],
    [p("Tài chính – thành tựu", "Money & achievement"), p("Hợp với công việc, tiền bạc, đàm phán và thể hiện năng lực.", "Good for work, finances, negotiation and showing your ability.")],
    [p("Hoàn tất – buông bỏ", "Completion & release"), p("Kết thúc việc dang dở, dọn dẹp, cho đi; chuẩn bị cho chu kỳ mới.", "Finish loose ends, declutter, give; prepare for a new cycle.")],
  ];

  const VERDICT = { great: p("Rất hợp", "Excellent"), good: p("Hợp", "Good"), normal: p("Ngày bình thường", "Ordinary"), careful: p("Cẩn trọng", "Be careful") };

  I18n.add(en);
  return { REASON, ADVICE, NUM, VERDICT };
})();

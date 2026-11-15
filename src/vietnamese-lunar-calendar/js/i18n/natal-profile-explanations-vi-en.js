// Diễn giải pane "Bản mệnh": hình tượng 30 mệnh nạp âm, ý nghĩa 4 trụ, hành vượng/thiếu, quan hệ tuổi, Đông/Tây tứ mệnh — cặp VI/EN, VI là khóa T().
const NatalExplain = (() => {
  const en = {};
  const p = (vi, enText) => { en[vi] = enText; return vi; };

  // Same order as CanChi.NAP_AM.
  const NAP_AM = [
    p("Vàng nằm đáy biển: tài năng tiềm ẩn, kín đáo, cần thời cơ và người nâng đỡ mới tỏa sáng.", "Gold at the bottom of the sea: hidden talent, discreet; shines once the right time and backer arrive."),
    p("Lửa trong lò: nhiệt huyết, bền bỉ, giỏi rèn luyện bản thân và người khác; cần môi trường ổn định để giữ lửa.", "Fire in the furnace: passionate and steady, good at forging yourself and others; needs a stable setting to keep burning."),
    p("Cây rừng lớn: rộng lượng, có tầm nhìn, thích che chở; hợp làm việc tập thể, dẫn dắt.", "Great forest wood: generous and far-sighted, protective; suited to teamwork and leading."),
    p("Đất ven đường: chân chất, chịu khó, hay giúp người; thành công nhờ tích lũy từng bước.", "Roadside earth: down-to-earth, hard-working, helpful; succeeds by building up step by step."),
    p("Kim loại mũi kiếm: sắc sảo, quyết đoán, cương trực; cần học mềm mỏng để tránh va chạm.", "Sword-edge metal: sharp, decisive, upright; should learn some softness to avoid clashes."),
    p("Lửa trên đỉnh núi: nổi bật, nhiệt tình, thích tự do và khám phá; dễ bùng nhanh tắt nhanh.", "Mountain-top fire: stands out, enthusiastic, loves freedom and discovery; flares up and dies down quickly."),
    p("Nước dưới khe: trong sáng, khéo léo, linh hoạt; âm thầm mà bền bỉ.", "Stream water: clear, tactful, flexible; quiet but persistent."),
    p("Đất trên tường thành: vững vàng, có trách nhiệm, đáng tin; thích bảo vệ gia đình và tập thể.", "Rampart earth: solid, responsible, trustworthy; protects family and group."),
    p("Kim loại trong nến sáp: thông minh, tinh tế, cầu toàn; cần được tôi luyện qua thử thách.", "Candle-wax metal: clever, refined, perfectionist; needs challenges to be tempered."),
    p("Cây dương liễu: mềm mại, duyên dáng, giàu cảm xúc, dễ thích nghi; cần chỗ dựa vững.", "Willow wood: gentle, graceful, emotional, adaptable; needs firm support."),
    p("Nước giữa dòng suối: thông minh, giao tiếp tốt, nhiều ý tưởng; đôi khi thiếu kiên định.", "Spring water: bright, communicative, full of ideas; sometimes inconsistent."),
    p("Đất trên mái nhà: che chở, chu đáo, coi trọng gia đình; sống có nguyên tắc.", "Rooftop earth: sheltering, caring, family-minded; lives by principles."),
    p("Lửa sấm sét: mạnh mẽ, bùng nổ, dám nghĩ dám làm; cần tiết chế nóng nảy.", "Thunderbolt fire: powerful, explosive, bold; should temper a quick temper."),
    p("Cây tùng bách: kiên cường, chính trực, chịu được gian khó, được người tôn trọng.", "Pine and cypress wood: resilient, upright, endures hardship, earns respect."),
    p("Dòng nước chảy dài: kiên trì, sâu sắc, có chí lớn và tầm nhìn xa.", "Long-flowing water: persistent, deep, ambitious and far-sighted."),
    p("Vàng lẫn trong cát: giá trị thật cần thời gian sàng lọc; thực tế, thành công muộn mà chắc.", "Gold in the sand: true worth takes time to sift out; practical, succeeds late but surely."),
    p("Lửa dưới chân núi: ấm áp, hiền hòa, chu đáo, sống tình cảm.", "Fire below the mountain: warm, gentle, attentive, affectionate."),
    p("Cây đồng bằng: giản dị, hòa đồng, dễ gần, tiến lên nhờ chăm chỉ.", "Flatland wood: simple, sociable, approachable; advances through diligence."),
    p("Đất trên vách: chắc chắn, kín đáo, đáng tin; hợp vai trò hỗ trợ, quản lý.", "Wall earth: solid, discreet, reliable; suited to support and management roles."),
    p("Vàng pha bạch kim: thanh lịch, có gu, trọng danh dự; dễ được quý nhân để ý.", "Gold and platinum: elegant, tasteful, honour-minded; easily noticed by benefactors."),
    p("Lửa ngọn đèn: soi sáng người khác, thông minh, tận tụy; hợp giáo dục, tư vấn.", "Lamp fire: lights the way for others, smart, devoted; suited to teaching and advising."),
    p("Nước mưa trên trời: rộng lượng, lý tưởng, nuôi dưỡng mọi người; đôi khi xa thực tế.", "Heavenly rain water: generous, idealistic, nurturing; sometimes impractical."),
    p("Đất đầm lớn: bao dung, nhẫn nại, giàu nội tâm.", "Great marsh earth: tolerant, patient, rich inner life."),
    p("Vàng làm trang sức: tinh tế, yêu cái đẹp, khéo giao tiếp; coi trọng hình ảnh.", "Jewellery gold: refined, loves beauty, socially skilled; cares about image."),
    p("Cây dâu tằm: cần cù, hữu ích, chăm lo gia đình; thành quả đến từ lao động bền bỉ.", "Mulberry wood: diligent, useful, family-caring; rewards come from steady work."),
    p("Nước suối lớn: năng động, mạnh mẽ, nhiều tham vọng; cần định hướng để không phân tán.", "Great stream water: dynamic, strong, ambitious; needs direction to stay focused."),
    p("Đất pha cát: linh hoạt, thực tế, dễ thích nghi nhưng cần nền tảng vững.", "Sandy earth: flexible, practical, adaptable, but needs a firm base."),
    p("Lửa mặt trời: rực rỡ, lạc quan, có sức ảnh hưởng, thích dẫn dắt.", "Sunfire: radiant, optimistic, influential, likes to lead."),
    p("Cây lựu đá: bền bỉ, sống nội tâm, tình cảm sâu sắc, thành công nhờ kiên trì.", "Pomegranate wood: enduring, introspective, deeply caring; succeeds through perseverance."),
    p("Nước biển cả: bao la, phóng khoáng, nhiều hoài bão, tầm nhìn rộng.", "Ocean water: vast, free-spirited, full of dreams, wide vision."),
  ];

  const PILLAR = [p("Gốc gác, tổ tiên, thời thơ ấu (≈ 1–16 tuổi).", "Roots, ancestors, childhood (≈ age 1–16)."),
    p("Cha mẹ, anh chị em, tuổi trẻ (≈ 17–32 tuổi); là mùa sinh nên quyết định hành nào vượng.", "Parents, siblings, youth (≈ age 17–32); the birth season, which sets the dominant element."),
    p("Bản thân (can ngày = nhật chủ) và vợ/chồng (chi ngày), trung niên (≈ 33–48 tuổi).", "Yourself (day stem = day master) and your spouse (day branch), mid-life (≈ age 33–48)."),
    p("Con cái, ước vọng, hậu vận (≈ từ 49 tuổi).", "Children, aspirations, later life (≈ from age 49).")];

  // Index = CanChi.ELEMENTS (Kim, Thủy, Mộc, Hỏa, Thổ).
  const STRONG = [p("Kim vượng: quyết đoán, nguyên tắc, trọng nghĩa; dễ cứng nhắc, cố chấp.", "Strong Metal: decisive, principled, loyal; can be rigid and stubborn."),
    p("Thủy vượng: thông minh, linh hoạt, giao tiếp giỏi; dễ thay đổi, thiếu kiên định.", "Strong Water: smart, flexible, good communicator; changeable, inconsistent."),
    p("Mộc vượng: nhân hậu, cầu tiến, sáng tạo; dễ bướng, khó nhường.", "Strong Wood: kind, ambitious, creative; can be headstrong."),
    p("Hỏa vượng: nhiệt huyết, lạc quan, nổi bật; dễ nóng vội.", "Strong Fire: passionate, optimistic, stands out; can be hasty."),
    p("Thổ vượng: điềm đạm, đáng tin, chịu khó; dễ bảo thủ, chậm thay đổi.", "Strong Earth: calm, reliable, hard-working; can be conservative, slow to change.")];
  const WEAK = [p("Thiếu Kim: khó quyết đoán, khó giữ nguyên tắc; nên rèn kỷ luật.", "Lacking Metal: indecisive, hard to stick to rules; build discipline."),
    p("Thiếu Thủy: khó thích nghi, ít linh hoạt; nên mở rộng giao tiếp, học hỏi.", "Lacking Water: slow to adapt, inflexible; widen your contacts and keep learning."),
    p("Thiếu Mộc: thiếu động lực phát triển và kế hoạch; nên đặt mục tiêu dài hạn.", "Lacking Wood: weak drive and planning; set long-term goals."),
    p("Thiếu Hỏa: thiếu nhiệt huyết, ngại thể hiện; nên chủ động hơn.", "Lacking Fire: low enthusiasm, shy to show yourself; be more proactive."),
    p("Thiếu Thổ: thiếu ổn định, khó tích lũy; nên xây nền tảng tài chính và thói quen.", "Lacking Earth: unsettled, hard to save; build financial and habit foundations.")];

  const COMPAT = { tamHop: p("3 tuổi hợp nhau nhất: làm ăn, kết bạn, hôn nhân thuận lợi.", "The three best-matched signs: good for business, friendship and marriage."),
    lucHop: p("Cặp tuổi bổ trợ nhau: hợp kết hôn, cộng sự thân thiết.", "A complementary pair: good for marriage and close partnership."),
    xung: p("Tuổi đối nghịch: dễ bất đồng, cần nhường nhịn khi hợp tác.", "Opposing sign: prone to disagreement; give way when working together."),
    hai: p("Dễ hiểu lầm, ngấm ngầm cản trở nhau.", "Prone to misunderstandings and hidden obstruction.") };

  const KUA_GROUP = { "Đông": p("Đông tứ mệnh (Khảm, Ly, Chấn, Tốn) hợp nhà, cửa, bàn làm việc quay về Bắc, Nam, Đông, Đông Nam; người cùng nhóm Đông hợp ở chung.", "East group (Kan, Li, Zhen, Xun): houses, doors and desks facing North, South, East or South-East; fits living with other East-group people."),
    "Tây": p("Tây tứ mệnh (Càn, Khôn, Cấn, Đoài) hợp nhà, cửa, bàn làm việc quay về Tây, Tây Bắc, Tây Nam, Đông Bắc; người cùng nhóm Tây hợp ở chung.", "West group (Qian, Kun, Gen, Dui): houses, doors and desks facing West, North-West, South-West or North-East; fits living with other West-group people.") };

  I18n.add(en);
  return { NAP_AM, PILLAR, STRONG, WEAK, COMPAT, KUA_GROUP };
})();

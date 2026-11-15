// Tab SIM phong thủy: 8 quái, 64 quẻ (thượng, hạ, mức cát hung, lời quẻ), bát tinh cặp số, cửu tinh, ý nghĩa con số — cặp VI/EN, VI là khóa T().
const SimText = (() => {
  const en = {};
  const p = (vi, enText) => { en[vi] = enText; return vi; };

  // Tiên thiên order 1..8; el = index into CanChi.ELEMENTS (Kim, Thủy, Mộc, Hỏa, Thổ).
  const TRIGRAM = [null, ["Càn", p("Trời", "Heaven"), 0], ["Đoài", p("Đầm", "Lake"), 0], ["Ly", p("Lửa", "Fire"), 3], ["Chấn", p("Sấm", "Thunder"), 2],
    ["Tốn", p("Gió", "Wind"), 2], ["Khảm", p("Nước", "Water"), 1], ["Cấn", p("Núi", "Mountain"), 4], ["Khôn", p("Đất", "Earth"), 4]].map(t => t && { name: t[0], image: t[1], el: t[2] });

  const RATING = { "Đại cát": p("Đại cát", "Very auspicious"), "Cát": p("Cát", "Auspicious"), "Bình": p("Bình", "Neutral"), "Hung": p("Hung", "Inauspicious") };

  // King Wen order: [thượng, hạ, tên, mức, lời quẻ]; mức theo tuvitinh.com, chỉnh khi ≥ 2 nguồn khác nói ngược (Thái, Đoài, Khảm, Khốn, Đại Quá, Tùy, Lâm).
  const H = (up, low, vi, enName, rating, meaning, enMeaning) => ({ up, low, name: p(vi, enName), rating, meaning: p(meaning, enMeaning) });
  const HEX = [
    H(1, 1, "Thuần Càn", "The Creative", "Đại cát", "Cương kiện, sáng tạo, hanh thông; tự cường không ngừng.", "Strong, creative and prosperous; keep striving."),
    H(8, 8, "Thuần Khôn", "The Receptive", "Đại cát", "Nhu thuận, bao dung, bền bỉ; theo người đi trước thì được lợi.", "Yielding, tolerant and steady; following a good lead brings gain."),
    H(6, 4, "Thủy Lôi Truân", "Difficulty at the Beginning", "Hung", "Gian nan buổi đầu, mọi việc còn vướng mắc; cần kiên nhẫn.", "A hard start, things are tangled; patience is needed."),
    H(7, 6, "Sơn Thủy Mông", "Youthful Folly", "Hung", "Non nớt, mờ mịt; nên học hỏi và tìm người chỉ dẫn.", "Inexperience and confusion; learn and find a mentor."),
    H(6, 1, "Thủy Thiên Nhu", "Waiting", "Cát", "Chờ thời, nuôi dưỡng sức lực; kiên nhẫn rồi sẽ hanh thông.", "Wait and build strength; patience leads to success."),
    H(1, 6, "Thiên Thủy Tụng", "Conflict", "Hung", "Tranh chấp, kiện tụng; nên hòa giải, tránh đối đầu.", "Disputes and lawsuits; settle, avoid confrontation."),
    H(8, 6, "Địa Thủy Sư", "The Army", "Cát", "Tập hợp lực lượng, cần kỷ luật và người dẫn dắt chính đáng.", "Gather forces with discipline under a rightful leader."),
    H(6, 8, "Thủy Địa Tỷ", "Holding Together", "Cát", "Gần gũi, hợp tác, được người giúp đỡ.", "Closeness and cooperation; others help you."),
    H(5, 1, "Phong Thiên Tiểu Súc", "Small Taming", "Bình", "Tích lũy nhỏ, việc còn bị kìm hãm; nên bền chí.", "Small gains, progress held back; persevere."),
    H(1, 2, "Thiên Trạch Lý", "Treading", "Cát", "Thận trọng từng bước, giữ lễ thì vượt qua hiểm nguy.", "Tread carefully; courtesy carries you past danger."),
    H(8, 1, "Địa Thiên Thái", "Peace", "Đại cát", "Thông suốt, hanh thông, trên dưới hòa hợp.", "Everything flows; harmony between high and low."),
    H(1, 8, "Thiên Địa Bĩ", "Standstill", "Hung", "Bế tắc, trên dưới không thông; nên giữ mình chờ thời.", "Blocked and stagnant; keep low and wait."),
    H(1, 3, "Thiên Hỏa Đồng Nhân", "Fellowship", "Cát", "Đồng lòng, hợp tác rộng rãi, được nhiều người ủng hộ.", "Shared purpose, broad cooperation and support."),
    H(3, 1, "Hỏa Thiên Đại Hữu", "Great Possession", "Đại cát", "Sở hữu lớn, giàu có, thịnh vượng.", "Great wealth and abundance."),
    H(8, 7, "Địa Sơn Khiêm", "Modesty", "Cát", "Khiêm tốn thì được tôn trọng, việc trước sau đều tốt.", "Modesty earns respect and a good outcome."),
    H(4, 8, "Lôi Địa Dự", "Enthusiasm", "Cát", "Vui vẻ, hứng khởi, thuận lợi để hành động.", "Joyful energy; a good time to act."),
    H(2, 4, "Trạch Lôi Tùy", "Following", "Cát", "Tùy thời, thuận theo lẽ phải thì hanh thông.", "Adapt to the times and follow what is right."),
    H(7, 5, "Sơn Phong Cổ", "Work on the Decayed", "Hung", "Sự việc hư hỏng, tồn đọng cần sửa chữa.", "Things have decayed and need repair."),
    H(8, 2, "Địa Trạch Lâm", "Approach", "Cát", "Lớn mạnh, tiến tới, được việc.", "Growing strength and progress."),
    H(5, 8, "Phong Địa Quan", "Contemplation", "Bình", "Quan sát, chiêm nghiệm; chưa nên hành động vội.", "Observe and reflect before acting."),
    H(3, 4, "Hỏa Lôi Phệ Hạp", "Biting Through", "Bình", "Cắn đứt trở ngại; phải quyết đoán, giữ công bằng.", "Bite through obstacles with decisiveness and fairness."),
    H(7, 3, "Sơn Hỏa Bí", "Grace", "Cát", "Vẻ đẹp bề ngoài; việc nhỏ thì lợi.", "Outward beauty; good for small matters."),
    H(7, 8, "Sơn Địa Bác", "Splitting Apart", "Hung", "Suy sụp, bị bào mòn; nên giữ yên, không nên tiến.", "Decline and erosion; stay put, do not advance."),
    H(8, 4, "Địa Lôi Phục", "Return", "Bình", "Trở lại, hồi phục; vận tốt đang quay về.", "Recovery; good fortune is coming back."),
    H(1, 4, "Thiên Lôi Vô Vọng", "Innocence", "Hung", "Chân thật, không vọng động thì yên ổn.", "Sincerity without rash moves keeps you safe."),
    H(7, 1, "Sơn Thiên Đại Súc", "Great Taming", "Cát", "Tích lũy lớn, nuôi dưỡng tài đức.", "Great accumulation of resources and virtue."),
    H(7, 4, "Sơn Lôi Di", "Nourishment", "Cát", "Nuôi dưỡng; cẩn trọng lời nói và ăn uống.", "Nourishment; mind your words and diet."),
    H(2, 5, "Trạch Phong Đại Quá", "Great Exceeding", "Hung", "Quá tải, gánh nặng vượt sức; cần thận trọng.", "Overload beyond your strength; be careful."),
    H(6, 6, "Thuần Khảm", "The Abysmal", "Hung", "Hiểm trở chồng chất; giữ lòng tin để vượt qua.", "Danger upon danger; keep faith to get through."),
    H(3, 3, "Thuần Ly", "The Clinging", "Cát", "Sáng sủa, rực rỡ, nương tựa vào điều chính đáng.", "Brightness, clinging to what is right."),
    H(2, 7, "Trạch Sơn Hàm", "Influence", "Cát", "Cảm ứng, giao hòa; thuận lợi tình cảm, hôn nhân.", "Mutual attraction; good for love and marriage."),
    H(4, 5, "Lôi Phong Hằng", "Duration", "Cát", "Bền lâu, kiên định thì hanh thông.", "Constancy brings success."),
    H(1, 7, "Thiên Sơn Độn", "Retreat", "Hung", "Lui đúng lúc để bảo toàn.", "Withdraw in time to preserve yourself."),
    H(4, 1, "Lôi Thiên Đại Tráng", "Great Power", "Cát", "Mạnh mẽ, hưng thịnh; tránh quá cứng rắn.", "Strong and thriving; avoid being too forceful."),
    H(3, 8, "Hỏa Địa Tấn", "Progress", "Cát", "Tiến lên, thăng tiến, được trọng dụng.", "Advancement and recognition."),
    H(8, 3, "Địa Hỏa Minh Di", "Darkening of the Light", "Hung", "Ánh sáng bị che lấp, dễ tổn thương; nên ẩn nhẫn.", "Light obscured, easily hurt; endure quietly."),
    H(5, 3, "Phong Hỏa Gia Nhân", "The Family", "Cát", "Gia đạo êm ấm, trong ngoài có nề nếp.", "A warm, well-ordered home."),
    H(3, 2, "Hỏa Trạch Khuê", "Opposition", "Hung", "Chia lìa, bất đồng; việc nhỏ còn được, việc lớn khó thành.", "Discord; small matters only."),
    H(6, 7, "Thủy Sơn Kiển", "Obstruction", "Hung", "Gian nan, trắc trở; nên dừng lại tìm người giúp.", "Hardship and obstacles; pause and seek help."),
    H(4, 6, "Lôi Thủy Giải", "Deliverance", "Cát", "Khó khăn được tháo gỡ, nhẹ nhõm.", "Difficulties are released."),
    H(7, 2, "Sơn Trạch Tổn", "Decrease", "Bình", "Bớt đi, hy sinh trước rồi sau được lợi.", "Give first, gain later."),
    H(5, 4, "Phong Lôi Ích", "Increase", "Cát", "Tăng thêm, lợi ích, thuận lợi làm việc lớn.", "Benefit and growth; favourable for big undertakings."),
    H(2, 1, "Trạch Thiên Quải", "Breakthrough", "Hung", "Quyết đoán, dứt khoát loại bỏ điều xấu.", "Resolutely remove what is wrong."),
    H(1, 5, "Thiên Phong Cấu", "Coming to Meet", "Bình", "Gặp gỡ bất ngờ; cẩn trọng với cám dỗ.", "Unexpected encounters; beware of temptation."),
    H(2, 8, "Trạch Địa Tụy", "Gathering Together", "Cát", "Tụ họp, đông đủ, thịnh vượng.", "People and prosperity gather."),
    H(8, 5, "Địa Phong Thăng", "Pushing Upward", "Cát", "Đi lên, thăng tiến từng bước vững chắc.", "A steady rise."),
    H(2, 6, "Trạch Thủy Khốn", "Oppression", "Hung", "Khốn cùng, bế tắc; giữ ý chí để vượt qua.", "Exhaustion and dead ends; hold on to your will."),
    H(6, 5, "Thủy Phong Tỉnh", "The Well", "Bình", "Ổn định, nuôi người; cần bồi đắp thường xuyên.", "Steady and nourishing; needs regular upkeep."),
    H(2, 3, "Trạch Hỏa Cách", "Revolution", "Cát", "Thay đổi, cải cách đúng thời thì tốt.", "Timely change is good."),
    H(3, 5, "Hỏa Phong Đỉnh", "The Cauldron", "Cát", "Vững chãi, đổi mới thành công, được trọng vọng.", "Stability, successful renewal and esteem."),
    H(4, 4, "Thuần Chấn", "The Arousing", "Bình", "Chấn động rồi yên; giữ bình tĩnh.", "Shock, then calm; stay composed."),
    H(7, 7, "Thuần Cấn", "Keeping Still", "Bình", "Dừng lại đúng lúc, tĩnh tâm.", "Stop at the right time; calm the mind."),
    H(5, 7, "Phong Sơn Tiệm", "Development", "Cát", "Tiến dần, vững vàng; tốt cho hôn nhân.", "Gradual, steady progress; good for marriage."),
    H(4, 2, "Lôi Trạch Quy Muội", "The Marrying Maiden", "Hung", "Việc không chính danh, hấp tấp dễ hỏng.", "Improper or hasty moves fail."),
    H(4, 3, "Lôi Hỏa Phong", "Abundance", "Cát", "Thịnh vượng, sung túc; giữ được lúc đỉnh cao.", "Prosperity at its peak; hold on to it."),
    H(3, 7, "Hỏa Sơn Lữ", "The Wanderer", "Bình", "Bôn ba, chưa yên ổn.", "Travel and restlessness."),
    H(5, 5, "Thuần Tốn", "The Gentle", "Bình", "Mềm mỏng, thuận theo thì việc nhỏ hanh thông.", "Gentleness; small matters succeed."),
    H(2, 2, "Thuần Đoài", "The Joyous", "Đại cát", "Vui vẻ, hòa duyệt, giao tiếp thuận lợi.", "Cheerful, good relations and communication."),
    H(5, 6, "Phong Thủy Hoán", "Dispersion", "Hung", "Ly tán rồi quy tụ; nên đoàn kết.", "Scattering, then reuniting; stay united."),
    H(6, 2, "Thủy Trạch Tiết", "Limitation", "Cát", "Tiết chế, có chừng mực thì tốt.", "Moderation is good."),
    H(5, 2, "Phong Trạch Trung Phu", "Inner Truth", "Cát", "Thành tín, được người tin cậy.", "Sincerity earns trust."),
    H(4, 7, "Lôi Sơn Tiểu Quá", "Small Exceeding", "Bình", "Việc nhỏ được, việc lớn chưa nên.", "Small things yes, big things not yet."),
    H(6, 3, "Thủy Hỏa Ký Tế", "After Completion", "Đại cát", "Việc đã thành; giữ gìn để khỏi suy.", "Things are done; guard against decline."),
    H(3, 6, "Hỏa Thủy Vị Tế", "Before Completion", "Hung", "Chưa xong, còn cơ hội; cần thận trọng hoàn tất.", "Not yet done, still open; finish carefully."),
  ].map((h, i) => ({ ...h, no: i + 1 }));

  // Bát tinh (du niên) of a digit pair; good = cát tinh.
  const STAR8 = [
    ["Sinh Khí", 1, ["14", "41", "67", "76", "39", "93", "28", "82"], p("Quý nhân, lạc quan, nhiều bạn bè, cơ hội đến dễ dàng.", "Helpful people, optimism, many friends, easy opportunities.")],
    ["Thiên Y", 1, ["13", "31", "68", "86", "49", "94", "27", "72"], p("Tài lộc, sức khỏe, được trời giúp, tiền đến tự nhiên.", "Wealth and health; money comes naturally.")],
    ["Diên Niên", 1, ["19", "91", "78", "87", "34", "43", "26", "62"], p("Năng lực lãnh đạo, trách nhiệm, sự nghiệp bền vững.", "Leadership, responsibility, a lasting career.")],
    ["Phục Vị", 1, ["11", "22", "33", "44", "66", "77", "88", "99"], p("Ổn định, kiên nhẫn, tích lũy; hơi bảo thủ.", "Stability, patience, saving; a little conservative.")],
    ["Tuyệt Mệnh", 0, ["12", "21", "69", "96", "48", "84", "37", "73"], p("Liều lĩnh, thăng trầm lớn về tiền bạc và sức khỏe.", "Recklessness; big ups and downs in money and health.")],
    ["Ngũ Quỷ", 0, ["18", "81", "79", "97", "36", "63", "24", "42"], p("Thất thường, nhiều biến động, dễ gặp thị phi.", "Erratic, turbulent, prone to gossip.")],
    ["Lục Sát", 0, ["16", "61", "47", "74", "38", "83", "29", "92"], p("Vướng bận tình cảm, dễ lo âu, hao tổn.", "Emotional entanglements, worry and losses.")],
    ["Họa Hại", 0, ["17", "71", "89", "98", "46", "64", "23", "32"], p("Khẩu thiệt, tranh cãi, dễ gặp rắc rối do lời nói.", "Quarrels and trouble caused by words.")],
  ].map(([name, good, pairs, text]) => ({ name, good: !!good, pairs, text }));

  const NINE_STAR = [null, ["Nhất Bạch", "1 White"], ["Nhị Hắc", "2 Black"], ["Tam Bích", "3 Jade"], ["Tứ Lục", "4 Green"], ["Ngũ Hoàng", "5 Yellow"],
    ["Lục Bạch", "6 White"], ["Thất Xích", "7 Red"], ["Bát Bạch", "8 White"], ["Cửu Tử", "9 Purple"]].map(s => s && p(s[0], s[1]));

  const DIGIT = [p("Số 0: khởi đầu, vô hạn, cân bằng.", "0: beginnings, infinity, balance."), p("Số 1 (Nhất): độc lập, đứng đầu, sinh sôi.", "1: independence, first place, growth."),
    p("Số 2 (Nhị): cặp đôi, hòa hợp, mãi mãi.", "2: pairs, harmony, forever."), p("Số 3 (Tam): vững chắc, tài lộc (Thần tài khi đi với 9).", "3: stability and wealth (God of Wealth with 9)."),
    p("Số 4 (Tứ): bốn mùa, ổn định; dân gian kiêng vì đọc gần “tử”.", "4: four seasons, stability; avoided by folk belief because it sounds like “death”."),
    p("Số 5 (Ngũ): ngũ hành, ngũ phúc, trung tâm.", "5: five elements, five blessings, the centre."), p("Số 6 (Lục): lộc, thuận lợi, may mắn.", "6: prosperity, smooth luck."),
    p("Số 7 (Thất): quyền lực, bí ẩn; có người kiêng vì “thất” là mất.", "7: power and mystery; some avoid it because “thất” also means loss."),
    p("Số 8 (Bát): phát đạt, thịnh vượng.", "8: prosperity and success."), p("Số 9 (Cửu): trường cửu, viên mãn, quyền uy.", "9: longevity, fulfilment, authority.")];

  I18n.add(en);
  return { TRIGRAM, RATING, HEX, STAR8, NINE_STAR, DIGIT };
})();

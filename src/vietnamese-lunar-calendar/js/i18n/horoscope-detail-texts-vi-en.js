// Detailed natal texts (cung hoàng đạo, con giáp, ngũ hành, nhật chủ, mũi tên thần số học) written as VI/EN pairs; VI is the T() key.
const HoroDetail = (() => {
  const en = {};
  const p = (vi, enText) => { en[vi] = enText; return vi; };

  const ZODIAC = [
    [p("Bạch Dương", "Aries"), "♈", "21/3 – 19/4", p("Sao Hỏa", "Mars"), p("Nhiệt huyết, thẳng thắn, thích dẫn đầu và hành động nhanh.", "Passionate, direct, loves to lead and acts fast."),
      p("Dũng cảm, tự tin, giàu năng lượng", "Brave, confident, energetic"), p("Nóng vội, thiếu kiên nhẫn, dễ bốc đồng", "Impatient, hasty, impulsive"),
      p("Yêu mãnh liệt, thích chinh phục; cần người đủ bản lĩnh theo kịp.", "Loves intensely and likes the chase; needs a partner who can keep up."), p("Khởi nghiệp, kinh doanh, thể thao, quân đội", "Start-ups, sales, sports, the military")],
    [p("Kim Ngưu", "Taurus"), "♉", "20/4 – 20/5", p("Sao Kim", "Venus"), p("Điềm tĩnh, thực tế, chung thủy, yêu cái đẹp và sự ổn định.", "Calm, practical, loyal, loves beauty and stability."),
      p("Kiên trì, đáng tin, giỏi giữ tiền", "Persistent, reliable, good with money"), p("Bảo thủ, cứng đầu, ngại thay đổi", "Stubborn, set in their ways, resists change"),
      p("Chậm mà chắc, yêu bền lâu và chăm chút người mình thương.", "Slow but sure; loves for the long run and cares deeply."), p("Tài chính, ngân hàng, nghệ thuật, ẩm thực, bất động sản", "Finance, banking, the arts, food, real estate")],
    [p("Song Tử", "Gemini"), "♊", "21/5 – 20/6", p("Sao Thủy", "Mercury"), p("Lanh lợi, tò mò, giao tiếp giỏi, thích điều mới mẻ.", "Quick-witted, curious, great communicators who love novelty."),
      p("Thông minh, linh hoạt, hài hước", "Clever, adaptable, funny"), p("Thiếu kiên định, dễ chán, hay đổi ý", "Inconsistent, easily bored, changes their mind"),
      p("Cần người hiểu mình, trò chuyện được và cho mình tự do.", "Needs someone who understands, talks and allows freedom."), p("Truyền thông, báo chí, bán hàng, giảng dạy, công nghệ", "Media, journalism, sales, teaching, tech")],
    [p("Cự Giải", "Cancer"), "♋", "21/6 – 22/7", p("Mặt Trăng", "Moon"), p("Giàu tình cảm, sống nội tâm, gắn bó với gia đình.", "Emotional, inward-looking, devoted to family."),
      p("Chu đáo, che chở, trực giác tốt", "Caring, protective, intuitive"), p("Đa cảm, dễ tổn thương, hay lo xa", "Moody, easily hurt, worries a lot"),
      p("Yêu là hết lòng, coi trọng tổ ấm và sự an toàn.", "Loves wholeheartedly; values home and security."), p("Y tế, giáo dục, nhà hàng, chăm sóc khách hàng, bất động sản", "Healthcare, education, hospitality, customer care, real estate")],
    [p("Sư Tử", "Leo"), "♌", "23/7 – 22/8", p("Mặt Trời", "Sun"), p("Tự tin, hào phóng, thích tỏa sáng và được công nhận.", "Confident, generous, loves to shine and be recognised."),
      p("Lãnh đạo, ấm áp, trung thành", "Leadership, warmth, loyalty"), p("Kiêu hãnh, thích được khen, đôi khi độc đoán", "Proud, craves praise, can be bossy"),
      p("Lãng mạn, nồng nhiệt, muốn được trân trọng.", "Romantic and warm; wants to be appreciated."), p("Quản lý, nghệ thuật biểu diễn, chính trị, giải trí", "Management, performing arts, politics, entertainment")],
    [p("Xử Nữ", "Virgo"), "♍", "23/8 – 22/9", p("Sao Thủy", "Mercury"), p("Tỉ mỉ, logic, cầu toàn, thích giúp ích cho người khác.", "Meticulous, logical, perfectionist, likes to be useful."),
      p("Chăm chỉ, phân tích giỏi, có trách nhiệm", "Hard-working, analytical, responsible"), p("Khắt khe, hay lo, dễ chỉ trích", "Demanding, anxious, critical"),
      p("Kín đáo nhưng tận tụy, thể hiện tình yêu bằng hành động.", "Reserved but devoted; shows love through actions."), p("Kế toán, y dược, nghiên cứu, kiểm định, biên tập", "Accounting, medicine, research, quality control, editing")],
    [p("Thiên Bình", "Libra"), "♎", "23/9 – 22/10", p("Sao Kim", "Venus"), p("Hòa nhã, công bằng, yêu cái đẹp và sự cân bằng.", "Gracious, fair-minded, loves beauty and balance."),
      p("Khéo ngoại giao, tinh tế, có gu thẩm mỹ", "Diplomatic, tactful, good taste"), p("Do dự, ngại xung đột, phụ thuộc ý người khác", "Indecisive, avoids conflict, seeks approval"),
      p("Cần sự hài hòa, tôn trọng và lãng mạn trong tình yêu.", "Needs harmony, respect and romance in love."), p("Luật, ngoại giao, thiết kế, thời trang, nhân sự", "Law, diplomacy, design, fashion, HR")],
    [p("Bọ Cạp", "Scorpio"), "♏", "23/10 – 21/11", p("Sao Diêm Vương", "Pluto"), p("Sâu sắc, bí ẩn, mạnh mẽ và quyết liệt.", "Deep, mysterious, powerful and determined."),
      p("Ý chí sắt đá, trung thành, nhạy bén", "Iron will, loyal, perceptive"), p("Đa nghi, ghen tuông, khó tha thứ", "Suspicious, jealous, slow to forgive"),
      p("Yêu sâu đậm, cần sự tin tưởng tuyệt đối.", "Loves deeply and needs complete trust."), p("Điều tra, tâm lý, y khoa, tài chính, nghiên cứu", "Investigation, psychology, medicine, finance, research")],
    [p("Nhân Mã", "Sagittarius"), "♐", "22/11 – 21/12", p("Sao Mộc", "Jupiter"), p("Lạc quan, yêu tự do, thích khám phá và học hỏi.", "Optimistic, freedom-loving, eager to explore and learn."),
      p("Cởi mở, hài hước, tầm nhìn rộng", "Open-minded, humorous, big-picture"), p("Thiếu kiên nhẫn, nói thẳng quá, ngại ràng buộc", "Restless, too blunt, dislikes commitment"),
      p("Cần một người bạn đồng hành cùng phiêu lưu.", "Needs a partner in adventure."), p("Du lịch, giáo dục, xuất bản, luật, ngoại thương", "Travel, education, publishing, law, foreign trade")],
    [p("Ma Kết", "Capricorn"), "♑", "22/12 – 19/1", p("Sao Thổ", "Saturn"), p("Kỷ luật, tham vọng, thực tế và có trách nhiệm.", "Disciplined, ambitious, practical and responsible."),
      p("Bền bỉ, có kế hoạch, đáng tin cậy", "Enduring, well-planned, dependable"), p("Khô khan, quá nghiêm khắc, ôm việc", "Reserved, too strict, a workaholic"),
      p("Thận trọng khi yêu nhưng rất chung thủy, coi trọng cam kết.", "Cautious in love but very faithful; values commitment."), p("Quản trị, tài chính, kỹ thuật, hành chính công", "Management, finance, engineering, public administration")],
    [p("Bảo Bình", "Aquarius"), "♒", "20/1 – 18/2", p("Sao Thiên Vương", "Uranus"), p("Độc lập, sáng tạo, tư duy khác biệt, quan tâm cộng đồng.", "Independent, inventive, unconventional, community-minded."),
      p("Sáng tạo, nhân văn, cởi mở", "Original, humane, open"), p("Xa cách, bướng bỉnh, khó đoán", "Detached, stubborn, unpredictable"),
      p("Cần tình bạn trong tình yêu và không gian riêng.", "Needs friendship within love and personal space."), p("Công nghệ, khoa học, hoạt động xã hội, sáng chế", "Technology, science, social work, invention")],
    [p("Song Ngư", "Pisces"), "♓", "19/2 – 20/3", p("Sao Hải Vương", "Neptune"), p("Mơ mộng, giàu lòng trắc ẩn, nhạy cảm và nghệ sĩ.", "Dreamy, compassionate, sensitive and artistic."),
      p("Trực giác mạnh, bao dung, giàu trí tưởng tượng", "Strong intuition, forgiving, imaginative"), p("Hay trốn tránh thực tế, dễ bị ảnh hưởng", "Escapist, easily influenced"),
      p("Yêu lãng mạn, hy sinh vì người mình thương.", "Romantic, will sacrifice for the one they love."), p("Nghệ thuật, âm nhạc, y tế, tâm lý, từ thiện", "Art, music, healthcare, psychology, charity")],
  ].map(([name, sym, dates, planet, traits, strengths, weaknesses, love, career]) => ({ name, sym, dates, planet, traits, strengths, weaknesses, love, career }));
  const ZODIAC_ELEMENT = [p("Lửa", "Fire"), p("Đất", "Earth"), p("Khí", "Air"), p("Nước", "Water")];
  const ZODIAC_MODE = [p("Tiên phong", "Cardinal"), p("Kiên định", "Fixed"), p("Linh hoạt", "Mutable")];

  const ANIMAL = [
    [p("Tuổi Tý thông minh, nhanh nhạy, khéo xoay xở và biết tích lũy.", "Rat people are clever, quick, resourceful and good savers."), p("Hợp kinh doanh, tài chính; nên bớt tính toán thiệt hơn.", "Suit business and finance; should calculate gains and losses less.")],
    [p("Tuổi Sửu cần cù, nhẫn nại, đáng tin, làm việc đến nơi đến chốn.", "Ox people are diligent, patient, trustworthy and thorough."), p("Hợp nông nghiệp, kỹ thuật, quản lý; nên linh hoạt hơn.", "Suit agriculture, engineering, management; should be more flexible.")],
    [p("Tuổi Dần mạnh mẽ, dũng cảm, có khí chất lãnh đạo.", "Tiger people are strong, brave and natural leaders."), p("Hợp lãnh đạo, quân đội, khởi nghiệp; nên kiềm chế nóng nảy.", "Suit leadership, the military, start-ups; should curb their temper.")],
    [p("Tuổi Mão hiền hòa, tinh tế, khéo léo, yêu sự bình yên.", "Cat people are gentle, refined, tactful and love peace."), p("Hợp nghệ thuật, ngoại giao, giáo dục; nên quyết đoán hơn.", "Suit the arts, diplomacy, education; should be more decisive.")],
    [p("Tuổi Thìn tự tin, nhiều hoài bão, có sức hút và may mắn.", "Dragon people are confident, ambitious, charismatic and lucky."), p("Hợp quản lý, chính trị, kinh doanh lớn; nên khiêm tốn hơn.", "Suit management, politics, big business; should be humbler.")],
    [p("Tuổi Tỵ sâu sắc, khôn ngoan, kín đáo và trực giác tốt.", "Snake people are deep, wise, discreet and intuitive."), p("Hợp nghiên cứu, tư vấn, tài chính; nên cởi mở hơn.", "Suit research, consulting, finance; should open up more.")],
    [p("Tuổi Ngọ năng động, yêu tự do, nhiệt tình và hoạt bát.", "Horse people are active, free-spirited, enthusiastic and lively."), p("Hợp bán hàng, du lịch, truyền thông; nên kiên trì hơn.", "Suit sales, travel, media; should be more persistent.")],
    [p("Tuổi Mùi hiền lành, giàu lòng thương, yêu nghệ thuật.", "Goat people are gentle, compassionate and artistic."), p("Hợp nghệ thuật, chăm sóc, giáo dục; nên tự tin hơn.", "Suit the arts, caregiving, education; should be more confident.")],
    [p("Tuổi Thân lanh lợi, hoạt ngôn, sáng tạo và đa tài.", "Monkey people are smart, witty, inventive and versatile."), p("Hợp công nghệ, kinh doanh, giải trí; nên tập trung hơn.", "Suit tech, business, entertainment; should focus more.")],
    [p("Tuổi Dậu chăm chỉ, chỉn chu, thẳng thắn và đúng giờ.", "Rooster people are hard-working, neat, frank and punctual."), p("Hợp kế toán, quân đội, quản lý chất lượng; nên mềm mỏng hơn.", "Suit accounting, the military, quality control; should be gentler.")],
    [p("Tuổi Tuất trung thành, chính trực, sống có trách nhiệm.", "Dog people are loyal, honest and responsible."), p("Hợp luật, an ninh, công tác xã hội; nên bớt lo âu.", "Suit law, security, social work; should worry less.")],
    [p("Tuổi Hợi chân thành, rộng lượng, lạc quan và hưởng thụ.", "Pig people are sincere, generous, optimistic and enjoy life."), p("Hợp dịch vụ, ẩm thực, từ thiện; nên tiết chế chi tiêu.", "Suit services, food, charity; should rein in spending.")],
  ].map(([traits, advice]) => ({ traits, advice }));

  const ELEMENT = [
    [p("Kiên định, công bằng, giữ chữ tín", "Steadfast, fair, keeps promises"), p("Cứng nhắc, khó thỏa hiệp", "Rigid, slow to compromise"), p("Tài chính, ngân hàng, cơ khí, luật, quân đội", "Finance, banking, mechanics, law, the military"), p("Phổi, đường hô hấp, da", "Lungs, airways, skin"), p("Tây, Tây Bắc", "West, Northwest")],
    [p("Thông minh, khéo giao tiếp, thích nghi nhanh", "Smart, sociable, adapts fast"), p("Dễ dao động, thiếu kiên định", "Wavering, inconsistent"), p("Thương mại, vận tải, du lịch, truyền thông, thủy sản", "Trade, logistics, tourism, media, fisheries"), p("Thận, bàng quang, hệ bài tiết", "Kidneys, bladder, urinary system"), p("Bắc", "North")],
    [p("Nhân hậu, sáng tạo, thích phát triển", "Kind, creative, growth-minded"), p("Dễ ôm đồm, đôi lúc cố chấp", "Overcommits, can be stubborn"), p("Giáo dục, y tế, nông lâm nghiệp, thiết kế, xuất bản", "Education, healthcare, farming and forestry, design, publishing"), p("Gan, mật, gân cốt", "Liver, gallbladder, tendons"), p("Đông, Đông Nam", "East, Southeast")],
    [p("Nhiệt huyết, quyết đoán, truyền cảm hứng", "Passionate, decisive, inspiring"), p("Nóng vội, dễ nổi nóng", "Hasty, quick-tempered"), p("Năng lượng, ẩm thực, công nghệ, giải trí, marketing", "Energy, food, technology, entertainment, marketing"), p("Tim, mạch máu, mắt", "Heart, blood vessels, eyes"), p("Nam", "South")],
    [p("Điềm tĩnh, thực tế, đáng tin", "Calm, practical, reliable"), p("Bảo thủ, chậm thay đổi", "Conservative, slow to change"), p("Bất động sản, xây dựng, nông nghiệp, quản lý, khai khoáng", "Real estate, construction, agriculture, management, mining"), p("Dạ dày, tỳ vị, tiêu hóa", "Stomach, spleen, digestion"), p("Đông Bắc, Tây Nam", "Northeast, Southwest")],
  ].map(([strengths, weaknesses, careers, health, dirs]) => ({ strengths, weaknesses, careers, health, dirs }));

  const DAY_MASTER = [
    p("Giáp Mộc như cây đại thụ: chính trực, có chí tiến thủ, thích che chở người khác nhưng khó uốn mình.", "Yang Wood is a tall tree: upright, ambitious and protective, but hard to bend."),
    p("Ất Mộc như dây leo, hoa cỏ: mềm mỏng, khéo léo, giỏi thích nghi và biết dựa thế.", "Yin Wood is a vine or flower: gentle, tactful, adaptable and good at using support."),
    p("Bính Hỏa như mặt trời: rộng lượng, nhiệt tình, thích tỏa sáng, đôi khi phô trương.", "Yang Fire is the sun: generous, warm, loves to shine, sometimes showy."),
    p("Đinh Hỏa như ngọn nến: tinh tế, chu đáo, giàu nội tâm, sáng bền nhưng dễ chao đảo.", "Yin Fire is a candle: subtle, thoughtful, rich inner life, steady light that can flicker."),
    p("Mậu Thổ như núi lớn: vững vàng, đáng tin, bao dung nhưng chậm và cố chấp.", "Yang Earth is a mountain: solid, trustworthy, tolerant, but slow and stubborn."),
    p("Kỷ Thổ như ruộng vườn: chăm chỉ, nuôi dưỡng, khéo vun vén, hay lo nghĩ.", "Yin Earth is farmland: diligent, nurturing, good at tending things, prone to worry."),
    p("Canh Kim như sắt thép, gươm đao: cương quyết, nghĩa khí, thẳng thắn, có lúc cứng rắn quá.", "Yang Metal is steel or a sword: resolute, loyal, frank, at times too harsh."),
    p("Tân Kim như châu ngọc: tinh tế, trọng thể diện, có gu, nhạy cảm với lời chê.", "Yin Metal is a jewel: refined, image-conscious, tasteful, sensitive to criticism."),
    p("Nhâm Thủy như sông biển: thông minh, phóng khoáng, nhiều ý tưởng, khó ràng buộc.", "Yang Water is the ocean: clever, broad-minded, full of ideas, hard to pin down."),
    p("Quý Thủy như mưa sương: dịu dàng, trực giác tốt, kiên nhẫn, sống nội tâm.", "Yin Water is rain or dew: gentle, intuitive, patient, introspective."),
  ];

  const ARROW = {
    "123": [p("Mũi tên Kế hoạch", "Arrow of Planning"), p("Biết lên kế hoạch, làm việc có trình tự.", "Good at planning and working step by step."), p("Trống 1-2-3", "Empty 1-2-3"), p("Dễ thiếu kế hoạch, làm theo cảm hứng.", "May lack planning and act on impulse.")],
    "456": [p("Mũi tên Ý chí", "Arrow of Willpower"), p("Ý chí mạnh, theo đuổi mục tiêu đến cùng.", "Strong will, follows goals to the end."), p("Mũi tên Uất giận", "Arrow of Frustration"), p("Dễ thất vọng, cần học cách chấp nhận và kiên nhẫn.", "Easily frustrated; needs acceptance and patience.")],
    "789": [p("Mũi tên Hoạt động", "Arrow of Activity"), p("Năng động, thích hành động và trải nghiệm.", "Active, loves action and experience."), p("Mũi tên Thụ động", "Arrow of Passivity"), p("Dễ trì trệ, cần chủ động đặt mục tiêu.", "Prone to inertia; needs to set goals proactively.")],
    "147": [p("Mũi tên Thực tế", "Arrow of Practicality"), p("Thực tế, khéo tay, làm được việc cụ thể.", "Practical, handy, gets concrete things done."), p("Trống 1-4-7", "Empty 1-4-7"), p("Thiếu thực tế, cần rèn kỹ năng làm việc tay chân.", "Impractical; should build hands-on skills.")],
    "258": [p("Mũi tên Cân bằng cảm xúc", "Arrow of Emotional Balance"), p("Cảm xúc ổn định, thấu hiểu người khác.", "Emotionally steady and empathetic."), p("Mũi tên Nhạy cảm", "Arrow of Hypersensitivity"), p("Dễ tổn thương, cần học cách bộc lộ cảm xúc.", "Easily hurt; should learn to express feelings.")],
    "369": [p("Mũi tên Trí tuệ", "Arrow of Intellect"), p("Trí nhớ tốt, tư duy sắc bén.", "Good memory and sharp thinking."), p("Mũi tên Trí nhớ ngắn hạn", "Arrow of Poor Memory"), p("Nên ghi chép và rèn luyện trí nhớ.", "Take notes and train your memory.")],
    "159": [p("Mũi tên Quyết tâm", "Arrow of Determination"), p("Kiên định, không bỏ cuộc giữa chừng.", "Determined, does not give up halfway."), p("Mũi tên Trì hoãn", "Arrow of Procrastination"), p("Hay trì hoãn, cần chia nhỏ việc để bắt đầu.", "Tends to procrastinate; break work into small steps.")],
    "357": [p("Mũi tên Tâm linh", "Arrow of Spirituality"), p("Nhạy bén, có chiều sâu tinh thần.", "Perceptive with spiritual depth."), p("Mũi tên Hoài nghi", "Arrow of Scepticism"), p("Hay nghi ngờ, cần cởi mở với điều mới.", "Sceptical; should stay open to new things.")],
  };

  const CAREER = { 1: p("Lãnh đạo, khởi nghiệp, quản lý dự án", "Leadership, start-ups, project management"), 2: p("Tư vấn, ngoại giao, nhân sự, chăm sóc khách hàng", "Counselling, diplomacy, HR, customer care"),
    3: p("Truyền thông, nghệ thuật, viết lách, giảng dạy", "Media, the arts, writing, teaching"), 4: p("Kỹ thuật, kế toán, xây dựng, vận hành", "Engineering, accounting, construction, operations"),
    5: p("Bán hàng, du lịch, marketing, báo chí", "Sales, travel, marketing, journalism"), 6: p("Giáo dục, y tế, công tác xã hội, thiết kế nội thất", "Education, healthcare, social work, interior design"),
    7: p("Nghiên cứu, phân tích dữ liệu, công nghệ, triết học", "Research, data analysis, technology, philosophy"), 8: p("Kinh doanh, tài chính, đầu tư, quản trị", "Business, finance, investment, administration"),
    9: p("Từ thiện, nghệ thuật, giáo dục, y tế cộng đồng", "Charity, the arts, education, public health"), 11: p("Tư vấn tinh thần, nghệ thuật, giảng dạy, truyền cảm hứng", "Spiritual guidance, the arts, teaching, inspiring others"),
    22: p("Kiến trúc, quản lý dự án lớn, xây dựng tổ chức", "Architecture, large projects, building organisations"), 33: p("Giáo dục, chữa lành, công tác cộng đồng", "Education, healing, community service") };

  const ANIMAL_NAME = [["con Chuột", "Rat"], ["con Trâu", "Ox"], ["con Hổ", "Tiger"], ["con Mèo", "Cat"], ["con Rồng", "Dragon"], ["con Rắn", "Snake"],
    ["con Ngựa", "Horse"], ["con Dê", "Goat"], ["con Khỉ", "Monkey"], ["con Gà", "Rooster"], ["con Chó", "Dog"], ["con Lợn", "Pig"]].map(([vi, e]) => p(vi, e));

  I18n.add(en);
  return { ANIMAL_NAME, ZODIAC, ZODIAC_ELEMENT, ZODIAC_MODE, ANIMAL, ELEMENT, DAY_MASTER, ARROW, CAREER };
})();

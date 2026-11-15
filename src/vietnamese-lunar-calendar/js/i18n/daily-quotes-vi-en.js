// Danh ngôn / tục ngữ gốc cho Chi tiết ngày (DailyQuote gộp với QuotesVietnam + QuotesWorld) — cặp VI/EN, VI là khóa T().
const QuotesClassic = (() => {
  const en = {};
  const p = (vi, enText) => { en[vi] = enText; return vi; };
  const TN = p("Tục ngữ", "Vietnamese proverb"), CD = p("Ca dao", "Vietnamese folk verse");

  const LIST = [
    [p("Không có việc gì khó, chỉ sợ lòng không bền; đào núi và lấp biển, quyết chí ắt làm nên.", "Nothing is hard, only a wavering heart is to be feared; move mountains, fill seas — resolve will get it done."), "Hồ Chí Minh"],
    [p("Vì lợi ích mười năm thì phải trồng cây, vì lợi ích trăm năm thì phải trồng người.", "For ten years' benefit plant trees; for a hundred years' benefit nurture people."), "Hồ Chí Minh"],
    [p("Hiền tài là nguyên khí của quốc gia.", "Talented people are the vital energy of the nation."), "Thân Nhân Trung"],
    [p("Sống là cho, đâu chỉ nhận riêng mình.", "To live is to give, not only to receive."), "Tố Hữu"],
    [p("Uống nước nhớ nguồn.", "When drinking water, remember its source."), TN],
    [p("Có công mài sắt, có ngày nên kim.", "Grind an iron bar long enough and it becomes a needle."), TN],
    [p("Đi một ngày đàng, học một sàng khôn.", "Travel a day, gain a basket of wisdom."), TN],
    [p("Thất bại là mẹ thành công.", "Failure is the mother of success."), TN],
    [p("Ăn quả nhớ kẻ trồng cây.", "When eating fruit, remember who planted the tree."), TN],
    [p("Gần mực thì đen, gần đèn thì rạng.", "Near ink you turn black, near a lamp you shine."), TN],
    [p("Tốt gỗ hơn tốt nước sơn.", "Good wood matters more than good paint."), TN],
    [p("Nước chảy đá mòn.", "Constant dripping wears away the stone."), TN],
    [p("Cái khó ló cái khôn.", "Hardship brings out wisdom."), TN],
    [p("Một điều nhịn chín điều lành.", "One act of patience brings nine of peace."), TN],
    [p("Học thầy không tày học bạn.", "Learning from friends can rival learning from teachers."), TN],
    [p("Một cây làm chẳng nên non, ba cây chụm lại nên hòn núi cao.", "One tree makes no hill; three trees together make a high mountain."), CD],
    [p("Lời nói chẳng mất tiền mua, lựa lời mà nói cho vừa lòng nhau.", "Words cost nothing, so choose them to please one another."), CD],
    [p("Hành trình vạn dặm bắt đầu từ một bước chân.", "A journey of a thousand miles begins with a single step."), "Lão Tử"],
    [p("Điều mình không muốn, chớ làm cho người khác.", "Do not do to others what you do not want done to yourself."), "Khổng Tử"],
    [p("Thiên thời không bằng địa lợi, địa lợi không bằng nhân hòa.", "Good timing is not as good as good terrain; good terrain is not as good as human harmony."), "Mạnh Tử"],
    [p("Biết người biết ta, trăm trận không nguy.", "Know the enemy and know yourself, and a hundred battles hold no danger."), "Tôn Tử"],
    [p("Học như thuyền đi ngược nước, không tiến ắt sẽ lùi.", "Learning is like rowing upstream: not to advance is to fall back."), p("Ngạn ngữ Trung Hoa", "Chinese proverb")],
    [p("Không ai tắm hai lần trên cùng một dòng sông.", "No one steps in the same river twice."), "Heraclitus"],
    [p("Kiến thức là sức mạnh.", "Knowledge is power."), "Francis Bacon"],
    [p("Tôi tư duy, vậy tôi tồn tại.", "I think, therefore I am."), "René Descartes"],
    [p("Thời gian là tiền bạc.", "Time is money."), "Benjamin Franklin"],
    [p("Điều gì không giết được ta sẽ khiến ta mạnh mẽ hơn.", "What does not kill me makes me stronger."), "Friedrich Nietzsche"],
    [p("Tưởng tượng quan trọng hơn kiến thức.", "Imagination is more important than knowledge."), "Albert Einstein"],
  ];

  [["Đức Phật", "The Buddha"], ["Lão Tử", "Laozi"], ["Khổng Tử", "Confucius"], ["Mạnh Tử", "Mencius"], ["Trang Tử", "Zhuangzi"], ["Tôn Tử", "Sun Tzu"],
    ["Tuân Tử", "Xunzi"], ["Kinh Dịch", "I Ching"], ["Lễ Ký", "Book of Rites"], ["Lỗ Tấn", "Lu Xun"]].forEach(([vi, e]) => p(vi, e));
  I18n.add(en);
  return LIST;
})();

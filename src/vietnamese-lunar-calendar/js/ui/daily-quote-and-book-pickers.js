// Danh ngôn · sách hay · phim hay · English · link kiến thức mỗi ngày: gắn chủ đề, lọc theo chủ đề được bật, mỗi ngày 1 mục cố định (băm jd), 🔄 đi tiếp n bước.
const DailyPick = (() => {
  const FOLK = new Set(["Tục ngữ", "Ca dao", "Thành ngữ", "Câu đối dân gian"]);
  const EAST = new Set(["Lão Tử", "Khổng Tử", "Mạnh Tử", "Trang Tử", "Tôn Tử", "Tuân Tử", "Kinh Dịch", "Lễ Ký", "Đức Phật", "Rabindranath Tagore", "Mahatma Gandhi",
    "Lỗ Tấn", "Bhagavad Gita", "Kahlil Gibran", "Swami Vivekananda", "Ngạn ngữ Trung Hoa"]);
  // Vietnamese authors: listed in QuotesVietnam, or (QuotesClassic) a name with Vietnamese-only letters.
  const VN = new Set(QuotesVietnam.map(q => q[1])), VI_LETTERS = /[ăâđêôơưạ-ỹ]/i;
  const quoteTopic = by => (FOLK.has(by) ? "folk" : EAST.has(by) ? "east" : VN.has(by) || VI_LETTERS.test(by) ? "vn" : "west");

  const TOPICS = {
    quote: [["folk", "Tục ngữ – ca dao"], ["vn", "Danh nhân Việt Nam"], ["east", "Triết lý phương Đông"], ["west", "Danh nhân phương Tây"]],
    book: [["vn-lit", "Văn học Việt Nam"], ["world-lit", "Văn học thế giới"], ["kids", "Thiếu nhi – tuổi mới lớn"], ["history", "Lịch sử – văn hóa"],
      ["philosophy", "Triết học – tôn giáo"], ["science", "Khoa học – công nghệ"], ["psychology", "Tâm lý – kỹ năng sống"], ["business", "Kinh tế – kinh doanh – đầu tư"],
      ["memoir", "Hồi ký – tiểu sử"]],
    movie: [["vn", "Phim Việt Nam"], ["drama", "Chính kịch – tâm lý"], ["scifi", "Khoa học viễn tưởng – giả tưởng"], ["animation", "Hoạt hình"], ["documentary", "Tài liệu"],
      ["comedy", "Hài – gia đình"], ["thriller", "Hành động – ly kỳ"], ["history", "Lịch sử – chiến tranh"], ["learn-en", "Học English"]],
    english: [["daily", "Giao tiếp hằng ngày"], ["work", "Công việc – kinh doanh"], ["tech", "Công nghệ"], ["idiom", "Thành ngữ – cụm động từ"], ["academic", "Học thuật (IELTS/TOEIC)"]],
    link: [["it", "Công nghệ thông tin"], ["engineering", "Kỹ thuật"], ["programming", "Lập trình"], ["security", "Bảo mật"], ["ai", "AI"], ["data", "Dữ liệu – thống kê"],
      ["science", "Khoa học"], ["society", "Xã hội"], ["economics", "Kinh tế"], ["finance", "Tài chính"], ["culture", "Văn hóa – nghệ thuật"],
      ["health", "Sức khỏe – y học"], ["psychology", "Tâm lý – phát triển bản thân"], ["language", "Ngoại ngữ"], ["productivity", "Kỹ năng sống – năng suất"]],
  };
  // Topic groups shown in the ⚙ panel (ticking a group toggles all its topics).
  const GROUPS = { link: [["Công nghệ", ["it", "engineering", "programming", "security", "ai", "data"]], ["Khoa học & xã hội", ["science", "society", "economics", "finance", "culture"]],
    ["Đời sống", ["health", "psychology", "language", "productivity"]]] };
  // Optional data files (const at script top level is not on globalThis, so typeof each name).
  const MOVIE_SETS = [typeof MoviesA === "undefined" ? [] : MoviesA, typeof MoviesB === "undefined" ? [] : MoviesB, typeof MoviesC === "undefined" ? [] : MoviesC];
  // Same film in two source files (different topics) ⇒ keep the first.
  const uniq = (list, key) => { const seen = new Set(); return list.filter(x => !seen.has(x[key]) && seen.add(x[key])); };
  const ENGLISH_SETS = [typeof EnglishA === "undefined" ? [] : EnglishA, typeof EnglishB === "undefined" ? [] : EnglishB];
  const LINK_SETS = [typeof KnowledgeLinks === "undefined" ? [] : KnowledgeLinks, typeof KnowledgeLinksLife === "undefined" ? [] : KnowledgeLinksLife,
    typeof KnowledgeLinksTech === "undefined" ? [] : KnowledgeLinksTech];
  const LISTS = {
    quote: [...QuotesClassic, ...QuotesVietnam, ...QuotesWorld].map(([text, by]) => ({ text, by, topic: quoteTopic(by) })),
    book: [...BooksVietnam, ...BooksWorldLiterature, ...BooksWorldNonfiction].map(b => ({ ...b, topic: BookTopics[b.title] || "world-lit" })),
    movie: uniq(MOVIE_SETS.flat(), "title"),
    english: uniq(ENGLISH_SETS.flat(), "word"),
    link: LINK_SETS.flat(),
  };
  const SALT = { quote: 0, book: 7, link: 13, movie: 19, english: 23 };
  const gcd = (a, b) => (b ? gcd(b, a % b) : a);

  // allowed: array of topic ids, empty = every topic. n = how many times 🔄 was pressed for this day.
  function of(kind, jd, n = 0, allowed = []) {
    let list = allowed.length ? LISTS[kind].filter(x => allowed.includes(x.topic)) : LISTS[kind];
    if (!list.length) list = LISTS[kind];
    if (!list.length) return null;
    const step = [97, 89, 83, 79, 73].find(s => gcd(list.length, s) === 1) || 1;
    return list[((Math.imul(jd + SALT[kind], 2654435761) >>> 0) + n * step) % list.length];
  }

  return { of, TOPICS, GROUPS, LISTS };
})();

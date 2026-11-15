// Danh ngôn + sách hay mỗi ngày: gộp các danh sách, mỗi ngày 1 mục cố định; băm jd để các ngày liền nhau không đi tuần tự theo 1 nguồn.
const { DailyQuote, BookOfDay } = (() => {
  const pick = (list, jd, salt) => list[(Math.imul(jd + salt, 2654435761) >>> 0) % list.length];
  const QUOTES = [...QuotesClassic, ...QuotesVietnam, ...QuotesWorld];
  const BOOKS = [...BooksVietnam, ...BooksWorldLiterature, ...BooksWorldNonfiction];
  return {
    DailyQuote: { of: jd => { const [text, by] = pick(QUOTES, jd, 0); return { text, by }; }, ALL: QUOTES },
    BookOfDay: { of: jd => pick(BOOKS, jd, 7), ALL: BOOKS },
  };
})();

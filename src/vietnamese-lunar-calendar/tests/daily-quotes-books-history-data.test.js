// Data for Chi tiết ngày (danh ngôn, sách) and lịch tháng (lịch sử): sizes, no duplicates, valid dates, every VI key has English.
// Run: node --test src/vietnamese-lunar-calendar/tests/daily-quotes-books-history-data.test.js
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.join(__dirname, "..");
const FILES = ["daily-quotes-vietnamese-proverbs-and-figures-vi-en.js", "daily-quotes-world-thinkers-vi-en.js", "daily-quotes-vi-en.js",
  "book-of-the-day-vietnamese-books-vi-en.js", "book-of-the-day-world-literature-vi-en.js", "book-of-the-day-world-nonfiction-vi-en.js", "book-topics-by-title.js", "knowledge-links-vi-en.js", "knowledge-links-tech-and-skills-vi-en.js", "knowledge-links-life-and-culture-vi-en.js", "movies-vietnam-asia-and-world-drama-vi-en.js", "movies-scifi-animation-documentary-comedy-thriller-vi-en.js",
  "movies-for-learning-english-vi-en.js", "english-word-of-the-day-daily-work-tech-vi-en.js", "english-word-of-the-day-idioms-academic-vi-en.js",
  "world-history-events-by-month-vi-en.js", "vietnam-history-events-by-month-vi-en.js"].map(f => "js/i18n/" + f).concat("js/ui/daily-quote-and-book-pickers.js");
const dict = {};
const ctx = vm.createContext({ I18n: { add: o => Object.assign(dict, o) } });
vm.runInContext(FILES.map(f => fs.readFileSync(path.join(root, f), "utf8")).join("\n;\n")
  + "\n;globalThis.M = { DailyPick, HistoryWorld, HistoryVietnam };", ctx);
const { DailyPick, HistoryWorld, HistoryVietnam } = ctx.M;
const Q = DailyPick.LISTS.quote, B = DailyPick.LISTS.book, L = DailyPick.LISTS.link;
const hasEn = s => typeof dict[s] === "string" && dict[s].trim() !== "";

test("quotes: at least 300, unique, every text translated, picker stable per day", () => {
  assert.ok(Q.length >= 300, String(Q.length));
  assert.equal(new Set(Q.map(q => q.text)).size, Q.length);
  for (const { text } of Q) assert.ok(hasEn(text), text);
  assert.equal(DailyPick.of("quote", 2461000).text, DailyPick.of("quote", 2461000).text);
  assert.ok(new Set(Array.from({ length: 30 }, (_, i) => DailyPick.of("quote", 2461000 + i).text)).size > 20);
});

test("books: at least 300, unique titles, title + summary translated, sane years", () => {
  assert.ok(B.length >= 300, String(B.length));
  assert.equal(new Set(B.map(b => b.title)).size, B.length);
  for (const b of B) {
    assert.ok(hasEn(b.title) && hasEn(b.about) && b.author, b.title);
    assert.ok(Number.isInteger(b.year) && b.year <= 2026, b.title);
  }
});

test("history: 8 events per month for world and Vietnam, valid day of month, translated", () => {
  const len = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  for (const list of [HistoryWorld, HistoryVietnam]) {
    for (let m = 1; m <= 12; m++) assert.equal(list.filter(e => e.m === m).length, 8, "month " + m);
    for (const e of list) {
      assert.ok(e.d >= 1 && e.d <= len[e.m - 1], e.text);
      assert.ok(Number.isInteger(e.y) && e.y <= 2026 && hasEn(e.text), e.text);
    }
  }
});

test("topics: every item has a known topic, filters keep only allowed topics, 🔄 walks the filtered list", () => {
  for (const kind of ["quote", "book", "movie", "english", "link"]) {
    const ids = DailyPick.TOPICS[kind].map(t => t[0]);
    for (const x of DailyPick.LISTS[kind]) assert.ok(ids.includes(x.topic), kind + ": " + (x.text || x.title || x.name));
    for (const id of ids) assert.ok(DailyPick.LISTS[kind].some(x => x.topic === id), kind + " has no item for " + id);
  }
  for (let n = 0; n < 40; n++) assert.equal(DailyPick.of("book", 2461000, n, ["kids"]).topic, "kids");
  const seen = new Set(Array.from({ length: 26 }, (_, n) => DailyPick.of("book", 2461000, n, ["kids"]).title));
  assert.equal(seen.size, B.filter(b => b.topic === "kids").length);
  assert.ok(L.length >= 60 && L.every(l => l.url.startsWith("https://") && hasEn(l.about)));
});

test("movies + English: sizes, no duplicates after merge, translated, English entries have IPA and an example", () => {
  const M = DailyPick.LISTS.movie, E = DailyPick.LISTS.english;
  assert.ok(M.length >= 200, String(M.length));
  assert.equal(new Set(M.map(m => m.title)).size, M.length);
  for (const m of M) assert.ok(hasEn(m.title) && hasEn(m.about) && hasEn(m.country) && m.director && Number.isInteger(m.year), m.title);
  assert.ok(E.length >= 340, String(E.length));
  assert.equal(new Set(E.map(e => e.word.toLowerCase())).size, E.length);
  for (const e of E) assert.ok(e.ipa.startsWith("/") && e.ipa.endsWith("/") &&e.example && hasEn(e.meaning) && dict[e.trans] === e.example, e.word);
});

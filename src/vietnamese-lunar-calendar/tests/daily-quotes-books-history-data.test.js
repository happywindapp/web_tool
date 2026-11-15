// Data for Chi tiết ngày (danh ngôn, sách) and lịch tháng (lịch sử): sizes, no duplicates, valid dates, every VI key has English.
// Run: node --test src/vietnamese-lunar-calendar/tests/daily-quotes-books-history-data.test.js
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.join(__dirname, "..");
const FILES = ["daily-quotes-vietnamese-proverbs-and-figures-vi-en.js", "daily-quotes-world-thinkers-vi-en.js", "daily-quotes-vi-en.js",
  "book-of-the-day-vietnamese-books-vi-en.js", "book-of-the-day-world-literature-vi-en.js", "book-of-the-day-world-nonfiction-vi-en.js",
  "world-history-events-by-month-vi-en.js", "vietnam-history-events-by-month-vi-en.js"].map(f => "js/i18n/" + f).concat("js/ui/daily-quote-and-book-pickers.js");
const dict = {};
const ctx = vm.createContext({ I18n: { add: o => Object.assign(dict, o) } });
vm.runInContext(FILES.map(f => fs.readFileSync(path.join(root, f), "utf8")).join("\n;\n")
  + "\n;globalThis.M = { DailyQuote, BookOfDay, HistoryWorld, HistoryVietnam };", ctx);
const { DailyQuote, BookOfDay, HistoryWorld, HistoryVietnam } = ctx.M;
const hasEn = s => typeof dict[s] === "string" && dict[s].trim() !== "";

test("quotes: at least 300, unique, every text translated, picker stable per day", () => {
  assert.ok(DailyQuote.ALL.length >= 300, String(DailyQuote.ALL.length));
  assert.equal(new Set(DailyQuote.ALL.map(q => q[0])).size, DailyQuote.ALL.length);
  for (const [text] of DailyQuote.ALL) assert.ok(hasEn(text), text);
  assert.equal(DailyQuote.of(2461000).text, DailyQuote.of(2461000).text);
  assert.ok(new Set(Array.from({ length: 30 }, (_, i) => DailyQuote.of(2461000 + i).text)).size > 20);
});

test("books: at least 300, unique titles, title + summary translated, sane years", () => {
  assert.ok(BookOfDay.ALL.length >= 300, String(BookOfDay.ALL.length));
  assert.equal(new Set(BookOfDay.ALL.map(b => b.title)).size, BookOfDay.ALL.length);
  for (const b of BookOfDay.ALL) {
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

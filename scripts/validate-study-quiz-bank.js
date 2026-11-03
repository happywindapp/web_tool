// Kiểm ngân hàng đề `const BANK = [...]` trong study/<de-thi>.html: schema, trùng câu, phương án tham chiếu chéo ở câu không `fixed`.
const fs = require("fs");

const file = process.argv[2];
if (!file) { console.error("Usage: node scripts/validate-study-quiz-bank.js study/CBTTCK.html"); process.exit(2); }
const m = fs.readFileSync(file, "utf8").match(/const BANK = (\[[\s\S]*?\n\]);/);
if (!m) { console.error(`Không tìm thấy "const BANK = [...]" trong ${file}`); process.exit(2); }
const bank = Function(`"use strict"; return ${m[1]};`)();

// Phương án bị xáo khi thi ⇒ câu nhắc tới phương án khác phải đánh dấu `fixed: true`.
const crossRef = /tất cả (các )?(phương án|đáp án|câu)|cả [abcdef] và [abcdef]|không (có )?(phương án|đáp án) nào|(?<!\p{L})câu [abcdef](?!\p{L})|(?<!\p{L})[abcdef] và [abcdef](?!\p{L})|(phương án|đáp án) [abcdef](?!\p{L})|cả (2|hai) (câu|phát biểu)/iu;
const errs = [], seen = new Map(), byTopic = {}, byAnswer = {};
let giveaway = 0;

bank.forEach((q, i) => {
  const at = `#${i} [${q.topic}] ${String(q.q).slice(0, 50)}`;
  if (!q.topic || !q.q || !q.explain) errs.push(`${at}: thiếu topic/q/explain`);
  const opts = Array.isArray(q.options) ? q.options : [];
  if (opts.length < 2 || opts.length > 6) errs.push(`${at}: cần 2–6 phương án`);
  if (opts.some(o => !String(o).trim())) errs.push(`${at}: có phương án rỗng`);
  if (new Set(opts.map(o => String(o).trim().toLowerCase())).size !== opts.length) errs.push(`${at}: phương án trùng nhau`);
  if (!Number.isInteger(q.answer) || q.answer < 0 || q.answer >= opts.length) errs.push(`${at}: answer ngoài khoảng`);
  if (!q.fixed && opts.some(o => crossRef.test(o))) errs.push(`${at}: phương án tham chiếu chéo nhưng thiếu fixed:true → "${opts.find(o => crossRef.test(o))}"`);
  const key = String(q.q).toLowerCase().replace(/\s+/g, " ").trim();
  if (seen.has(key)) errs.push(`${at}: trùng câu hỏi với #${seen.get(key)}`); else seen.set(key, i);
  byTopic[q.topic] = (byTopic[q.topic] || 0) + 1;
  byAnswer[q.answer] = (byAnswer[q.answer] || 0) + 1;
  const len = opts.map(o => String(o).length), others = len.filter((_, k) => k !== q.answer);
  if (others.length && len[q.answer] > 1.3 * Math.max(...others)) giveaway++;
});

console.log(`${file}: ${bank.length} câu, ${Object.keys(byTopic).length} chủ đề, ${bank.filter(q => q.fixed).length} câu fixed`);
console.table(byTopic);
console.log("Phân bố vị trí đáp án:", byAnswer);
console.log(`Đáp án dài vượt trội (>30% phương án dài nhì, dễ đoán): ${giveaway}`);
if (errs.length) { console.error(`\n${errs.length} lỗi:\n` + errs.join("\n")); process.exit(1); }
console.log("OK");

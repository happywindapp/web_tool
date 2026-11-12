// Thần số học Pythagoras: số chủ đạo, sứ mệnh/linh hồn/nhân cách theo tên (bỏ dấu), số ngày sinh, năm/tháng cá nhân, 4 đỉnh cao cuộc đời.
const Numerology = (() => {
  const MASTER = [11, 22, 33];
  const sumDigits = n => String(n).split("").reduce((a, c) => a + +c, 0);
  const reduce = (n, keepMaster = true) => { while (n > 9 && !(keepMaster && MASTER.includes(n))) n = sumDigits(n); return n; };
  const letterValue = ch => (ch.charCodeAt(0) - 65) % 9 + 1;

  // "Nguyễn Thị Ánh" → "NGUYEN THI ANH" (Đ → D; non-letters dropped).
  const plain = name => String(name || "").normalize("NFD").replace(/\p{M}/gu, "").replace(/[đĐ]/g, "D").toUpperCase().replace(/[^A-Z ]+/g, " ").trim().replace(/\s+/g, " ");

  // Y is a vowel when no vowel stands next to it (Thùy, Mỹ), a consonant otherwise (Uyên, Yến).
  function isVowel(word, i) {
    const c = word[i];
    if ("AEIOU".includes(c)) return true;
    if (c !== "Y") return false;
    return !"AEIOU".includes(word[i - 1] || "") && !"AEIOU".includes(word[i + 1] || "");
  }

  function nameNumbers(name) {
    const p = plain(name);
    if (!p) return null;
    let all = 0, vowels = 0, consonants = 0;
    for (const word of p.split(" ")) for (let i = 0; i < word.length; i++) {
      const v = letterValue(word[i]);
      all += v;
      if (isVowel(word, i)) vowels += v; else consonants += v;
    }
    return { plain: p, expression: reduce(all), soul: reduce(vowels), personality: reduce(consonants) };
  }

  // birth = { d, m, y } solar.
  function compute(name, birth) {
    const lifePath = reduce(sumDigits(birth.d) + sumDigits(birth.m) + sumDigits(birth.y));
    const md = reduce(birth.m, false), dd = reduce(birth.d, false), yd = reduce(sumDigits(birth.y), false);
    const p1 = reduce(md + dd), p2 = reduce(dd + yd), p3 = reduce(p1 + p2), p4 = reduce(md + yd);
    const firstEnd = 36 - reduce(lifePath, false);
    return {
      birth, lifePath, birthDay: reduce(birth.d), name: nameNumbers(name),
      pinnacles: [p1, p2, p3, p4].map((n, i) => ({ n, from: i ? firstEnd + 9 * (i - 1) + 1 : 0, to: i < 3 ? firstEnd + 9 * i : null })),
      personalYear: y => personalYear(birth, y),
    };
  }

  const personalYear = (birth, y) => reduce(reduce(birth.d, false) + reduce(birth.m, false) + reduce(sumDigits(y), false), false);
  // Personal month uses the solar calendar date the month starts on.
  const personalMonth = (num, s) => reduce(personalYear(num.birth, s.y) + s.m, false);

  return { compute, personalMonth, plain };
})();

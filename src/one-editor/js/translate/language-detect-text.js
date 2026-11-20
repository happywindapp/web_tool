// Guesses the natural language of a text (fallback when the browser has no LanguageDetector): script first, then Vietnamese letters, then common Latin words.
const TrLang = (() => {
  const LANGS = ["vi", "en", "zh", "zh-Hant", "ja", "ko", "fr", "de", "es", "pt", "it", "ru", "th", "id"];
  // Letters only Vietnamese uses (â ê ô à é… also appear in French / Portuguese / loanwords).
  const VI = /[ăđơưạảấầẩẫậắằẳẵặẹẻẽếềểễệỉịọỏốồổỗộớờởỡợụủứừửữựỳỵỷỹĩũ]/giu;
  const KANA = /[\p{Script=Hiragana}\p{Script=Katakana}]/gu;
  const SCRIPTS = [["ko", /\p{Script=Hangul}/gu], ["zh", /\p{Script=Han}/gu], ["ru", /\p{Script=Cyrillic}/gu], ["th", /\p{Script=Thai}/gu]];
  const WORDS = {
    en: "the and is are of to in that it for with this was you not be have from".split(" "),
    fr: "le la les des est et une un pour que dans pas sur avec vous nous".split(" "),
    de: "der die das und ist nicht ein eine mit sich auf für den dem ich sie".split(" "),
    es: "el los las que es y una por para con del como pero muy son hay".split(" "),
    pt: "o os as que uma um com do da em mais pelo nao voce".split(" "),
    it: "il gli che una un per con non del della sono questo anche".split(" "),
    id: "yang dan di ini itu dengan untuk tidak ada dari saya akan kami".split(" "),
  };
  const count = (s, re) => (s.match(re) || []).length;
  const label = (code, ui) => { try { return new Intl.DisplayNames([ui], { type: "language" }).of(code) || code; } catch { return code; } };

  // → one of LANGS; Latin text with no clue counts as English.
  function guess(text) {
    const s = String(text || "").replace(/^\s*(```|~~~)[\s\S]*?^\s*\1.*$/gm, " ").slice(0, 5000);
    const letters = count(s, /\p{L}/gu);
    if (!letters) return "en";
    if (count(s, KANA)) return "ja";
    for (const [code, re] of SCRIPTS) if (count(s, re) / letters > 0.3) return code;
    const vi = count(s, VI);
    if (vi >= 2 || (vi && letters < 40)) return "vi";
    const words = s.toLowerCase().match(/\p{L}+/gu) || [];
    let best = "en", top = 0;
    for (const [code, list] of Object.entries(WORDS)) {
      const set = new Set(list), n = words.reduce((a, w) => a + (set.has(w) ? 1 : 0), 0);
      if (n > top) { top = n; best = code; }
    }
    return best;
  }

  // Default target when the user keeps "auto": Vietnamese ↔ English.
  const pairFor = (from, to) => to && to !== "auto" && to !== from ? to : from === "vi" ? "en" : "vi";
  // A detector result like "zh-TW" / "pt-BR" maps onto LANGS.
  const normalize = code => {
    const c = String(code || "").trim();
    if (LANGS.includes(c)) return c;
    if (/^zh-(TW|HK|MO|Hant)/i.test(c)) return "zh-Hant";
    const base = c.split("-")[0].toLowerCase();
    return LANGS.includes(base) ? base : "";
  };

  return { LANGS, guess, pairFor, normalize, label };
})();

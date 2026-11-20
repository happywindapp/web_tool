// Chrome / Edge built-in AI (Translator, LanguageDetector): runs on this device, the text never leaves the browser. Feature-detected, never browser-sniffed.
const OnDevice = (() => {
  const MAX_BYTES = 4000;
  const translators = new Map();
  let detector = null;
  const has = () => typeof self.Translator?.availability === "function" && typeof self.Translator.create === "function";

  // → null (no API) | "available" | "downloadable" | "downloading" | "unavailable"
  async function availability(from, to) {
    if (!has()) return null;
    try { return await self.Translator.availability({ sourceLanguage: from, targetLanguage: to }); } catch { return "unavailable"; }
  }

  // One translator per pair, created once (the first create may download the language pack: needs a click).
  async function prepare(from, to, onProgress) {
    const key = from + ">" + to;
    if (!translators.has(key)) {
      const monitor = m => m.addEventListener("downloadprogress", e => onProgress(Math.round((+e.loaded || 0) * 100)));
      translators.set(key, self.Translator.create({ sourceLanguage: from, targetLanguage: to, monitor }));
    }
    try { return await translators.get(key); } catch (e) { translators.delete(key); throw e; }
  }

  // Detected language of the text, "" when unsure or when the detector would need a download first.
  async function detect(text) {
    if (typeof self.LanguageDetector?.availability !== "function") return "";
    try {
      if (!detector) {
        if (await self.LanguageDetector.availability() !== "available") return "";
        detector = await self.LanguageDetector.create();
      }
      const [top] = await detector.detect(String(text).slice(0, 2000));
      return top && top.confidence >= 0.6 ? TrLang.normalize(top.detectedLanguage) : "";
    } catch { return ""; }
  }

  return { has, availability, prepare, detect, MAX_BYTES };
})();

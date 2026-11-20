// Read aloud with speechSynthesis (offline, voices of this device): sentence by sentence so long texts are not cut off; no voice for a language ⇒ has() false.
const Speech = (() => {
  const MAX = 20000;
  let voices = [];
  const ok = () => typeof self.speechSynthesis === "object" && typeof self.SpeechSynthesisUtterance === "function";
  const load = () => { if (ok()) voices = self.speechSynthesis.getVoices(); };
  const tag = v => String(v.lang || "").toLowerCase().replace("_", "-");
  const wanted = lang => lang === "zh-Hant" ? ["zh-tw", "zh-hk"] : [String(lang).toLowerCase()];
  function voiceFor(lang) {
    const exact = wanted(lang), base = exact[0].split("-")[0];
    return voices.find(v => exact.includes(tag(v))) || voices.find(v => tag(v).split("-")[0] === base) || null;
  }
  const has = lang => ok() && !!lang && !!voiceFor(lang);
  const stop = () => { if (ok()) self.speechSynthesis.cancel(); };

  // → false when there is nothing to read or no voice.
  function speak(text, lang, rate = 1) {
    const v = voiceFor(lang), t = String(text || "").slice(0, MAX);
    if (!ok() || !v || !t.trim()) return false;
    stop();
    for (const s of TrChunk.sentences(t, 200)) {
      const u = new self.SpeechSynthesisUtterance(s);
      u.voice = v; u.lang = v.lang; u.rate = rate;
      self.speechSynthesis.speak(u);
    }
    return true;
  }

  const listeners = [];
  function init() {
    if (!ok()) return;
    load();
    self.speechSynthesis.addEventListener("voiceschanged", () => { load(); listeners.forEach(f => f()); });
  }

  return { ok, has, speak, stop, init, onVoices: f => listeners.push(f) };
})();

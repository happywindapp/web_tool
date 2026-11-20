// English dictionary (api.dictionaryapi.dev, ADR #22): IPA UK/US, audio, meanings by part of speech, examples, synonyms. Only the looked-up word is sent, and only on click.
const TrDict = (() => {
  const BASE = "https://api.dictionaryapi.dev/api/v2/entries/en/", AUDIO = /^https:\/\/api\.dictionaryapi\.dev\/media\/[\w./%-]+\.mp3$/;
  const cache = new Map();
  const str = v => typeof v === "string" ? v.trim() : "";

  // An English word or a phrase of ≤ 3 words → the lookup key; anything else → null.
  function candidate(text, from) {
    const t = String(text || "").trim().replace(/\s+/g, " ");
    if (from !== "en" || t.length > 60 || !/^[A-Za-z][A-Za-z'’-]*( [A-Za-z][A-Za-z'’-]*){0,2}$/.test(t)) return null;
    return t.toLowerCase().replace(/’/g, "'");
  }

  // API JSON (array of entries) → { word, phonetics: [{ ipa, audio, accent }], meanings: [{ pos, defs: [{ def, ex }], syn }] } with text only.
  function normalize(json) {
    if (!Array.isArray(json) || !json.length) return null;
    const phon = new Map(), byPos = new Map();
    for (const e of json) {
      if (!e || typeof e !== "object") continue;
      const list = Array.isArray(e.phonetics) ? e.phonetics : [];
      for (const p of list) {
        if (!p || typeof p !== "object") continue;
        const ipa = str(p.text), audio = AUDIO.test(str(p.audio)) ? str(p.audio) : "", accent = (/-(uk|us|au|ca)\.mp3$/i.exec(audio)?.[1] || "").toUpperCase();
        if (!ipa && !audio) continue;
        const key = ipa + "|" + accent, had = phon.get(key);
        if (!had) phon.set(key, { ipa, audio, accent }); else if (!had.audio && audio) had.audio = audio;
      }
      if (!phon.size && str(e.phonetic)) phon.set(str(e.phonetic) + "|", { ipa: str(e.phonetic), audio: "", accent: "" });
      for (const m of Array.isArray(e.meanings) ? e.meanings : []) {
        if (!m || typeof m !== "object") continue;
        const pos = str(m.partOfSpeech) || "—", slot = byPos.get(pos) || { pos, defs: [], syn: new Set() };
        byPos.set(pos, slot);
        for (const d of Array.isArray(m.definitions) ? m.definitions : []) {
          if (d && str(d.definition) && slot.defs.length < 6) slot.defs.push({ def: str(d.definition), ex: str(d.example) });
          if (d && Array.isArray(d.synonyms)) d.synonyms.forEach(s => str(s) && slot.syn.add(str(s)));
        }
        if (Array.isArray(m.synonyms)) m.synonyms.forEach(s => str(s) && slot.syn.add(str(s)));
      }
    }
    const meanings = [...byPos.values()].filter(m => m.defs.length).map(m => ({ pos: m.pos, defs: m.defs, syn: [...m.syn].slice(0, 10) }));
    const phonetics = [...phon.values()].sort((a, b) => (b.accent === "UK") - (a.accent === "UK") || (b.accent === "US") - (a.accent === "US")).slice(0, 4);
    return meanings.length || phonetics.length ? { word: str(json[0]?.word), phonetics, meanings } : null;
  }

  async function lookup(word) {
    if (cache.has(word)) return cache.get(word);
    let r;
    try { r = await fetch(BASE + encodeURIComponent(word), { credentials: "omit", referrerPolicy: "no-referrer" }); }
    catch { throw new Error(T("Không kết nối được từ điển (api.dictionaryapi.dev) — mất mạng hoặc bị chặn.")); }
    if (r.status === 404) { cache.set(word, null); return null; }
    if (!r.ok) throw new Error(T("Từ điển báo lỗi HTTP {code}.", { code: r.status }));
    let j;
    try { j = await r.json(); } catch { throw new Error(T("Từ điển trả về dữ liệu lạ.")); }
    const v = normalize(j);
    cache.set(word, v);
    return v;
  }

  return { candidate, normalize, lookup };
})();

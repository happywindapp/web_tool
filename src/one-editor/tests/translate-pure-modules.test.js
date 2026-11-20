// Run: node --test src/one-editor/tests/translate-pure-modules.test.js
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.join(__dirname, "..");
const eq = (a, b, msg) => assert.deepEqual(JSON.parse(JSON.stringify(a)), b, msg);
const ctx = vm.createContext({ T: (s, p) => p ? s.replace(/\{(\w+)\}/g, (m, k) => k in p ? String(p[k]) : m) : s, TextEncoder, URLSearchParams, URL, Intl });
const src = f => fs.readFileSync(path.join(root, f), "utf8");
vm.runInContext([
  "../data-workbench/js/core/text-utils.js", "../data-workbench/js/parsers/format-detect.js", "js/editor/language-detect.js", "js/core/layout-presets.js",
  "js/core/output-operations.js", "js/core/share-link-state.js", "js/core/demo-samples.js", "js/core/demo-samples-translate.js",
  "js/translate/language-detect-text.js", "js/translate/text-chunker-for-translation.js", "js/translate/translate-provider-mymemory.js", "js/translate/dictionary-english-lookup.js",
  "js/translate/lookup-terms-from-selection.js", "js/translate/example-sentences-tatoeba.js", "js/translate/web-page-reader-jina.js",
].map(src).join("\n;\n") + "\n;Object.assign(globalThis, { OutputOps, ShareState, DEMOS, TrLang, TrChunk, MyMemory, TrDict, TrTerms, TrExamples, WebPage });", ctx);
const { OutputOps, ShareState, DEMOS, TrLang, TrChunk, MyMemory, TrDict, TrTerms, TrExamples, WebPage } = ctx;

test("language guess: scripts, Vietnamese letters, Latin stop words; default pair is Vietnamese ↔ English", () => {
  const cases = { "Hello, this is the order book.": "en", "Xin chào, đây là sổ lệnh.": "vi", "こんにちは世界": "ja", "你好世界": "zh", "안녕하세요": "ko", "Привет мир": "ru",
    "Bonjour, nous avons une commande pour vous": "fr", "Der Auftrag ist nicht fertig und die Daten sind": "de", "Hola, el pedido para los clientes": "es", "serendipity": "en", "": "en", "12345": "en" };
  for (const [t, want] of Object.entries(cases)) assert.equal(TrLang.guess(t), want, t);
  for (const t of ["Le projet est prêt à être évalué", "Você está pronto para a reunião?", "The café serves crêpes and the menu is ready"]) assert.notEqual(TrLang.guess(t), "vi", "â ê ô of other languages: " + t);
  assert.equal(TrLang.guess("Tạm biệt"), "vi", "short Vietnamese");
  assert.equal(TrLang.guess("```\nxin chào đây là code\n```\nThe report is ready"), "en", "fenced code is ignored");
  eq([TrLang.pairFor("vi", "auto"), TrLang.pairFor("en", "auto"), TrLang.pairFor("en", "ja"), TrLang.pairFor("ja", "ja"), TrLang.pairFor("vi", "vi")], ["en", "vi", "ja", "vi", "en"]);
  eq(["zh-TW", "zh-Hant-HK", "pt-BR", "EN", "xx", "", "constructor"].map(TrLang.normalize), ["zh-Hant", "zh-Hant", "pt", "en", "", "", ""]);
});

test("chunker: keeps line breaks, Markdown markers and fenced code; join puts translations back", () => {
  const text = "# Title\n\n- [ ] first item\n  > quoted line  \n```js\nconst a = 1; // keep\n```\n1. Step one.\n\n    \nplain\r\nend";
  const segs = TrChunk.plan(text);
  eq(TrChunk.units(segs), ["Title", "first item", "quoted line", "Step one.", "plain", "end"]);
  assert.equal(TrChunk.join(segs, TrChunk.units(segs)), text, "identity join");
  assert.equal(TrChunk.join(segs, TrChunk.units(segs).map(u => u.toUpperCase())), text.replace(/Title|first item|quoted line|Step one\.|plain|end/g, m => m.toUpperCase()));
  eq(TrChunk.units(TrChunk.plan("~~~\nnot this\n```\nstill code\n~~~\nyes")), ["yes"], "a fence closes only with the same marker");
  eq(TrChunk.units(TrChunk.plan("--- \n| --- |\n42")), [], "lines without letters stay as they are");
});

test("chunker: long lines split at sentences, then spaces, then characters, within the byte limit", () => {
  const long = "Alpha beta gamma. Delta epsilon zeta eta theta! Iota kappa lambda mu nu xi omicron pi rho sigma tau upsilon phi chi psi omega.";
  const segs = TrChunk.plan(long, 40), units = TrChunk.units(segs);
  assert.equal(TrChunk.join(segs, units), long);
  assert.ok(units.every(u => TrChunk.bytes(u) <= 40));
  eq(units.slice(0, 2), ["Alpha beta gamma.", "Delta epsilon zeta eta theta!"]);
  const vi = "Đây là một câu tiếng Việt rất dài để kiểm tra việc cắt theo byte UTF-8. ".repeat(4).trim(), v = TrChunk.plan(vi, 60);
  assert.equal(TrChunk.join(v, TrChunk.units(v)), vi);
  assert.ok(TrChunk.units(v).every(u => TrChunk.bytes(u) <= 60), "Vietnamese letters count as 2–3 bytes");
  eq(TrChunk.cut("x".repeat(25), 10), ["xxxxxxxxxx", "xxxxxxxxxx", "xxxxx"]);
  eq(TrChunk.sentences("One. Two three four.\n\nFive six seven eight nine ten", 12), ["One.", "Two three", "four.", "Five six", "seven eight", "nine ten"]);
});

test("MyMemory: URL carries the text and language pair; responses map to text, quota and errors", () => {
  const u = new URL(MyMemory.url("Hello & bye", "zh-Hant", "vi"));
  eq([u.origin + u.pathname, u.searchParams.get("q"), u.searchParams.get("langpair")], ["https://api.mymemory.translated.net/get", "Hello & bye", "zh-TW|vi"]);
  assert.equal(MyMemory.parse({ responseData: { translatedText: "Xin ch&#224;o &quot;b&#x1EA1;n&quot; &amp; t&#39;i" }, responseStatus: 200 }), "Xin chào \"bạn\" & t'i");
  assert.throws(() => MyMemory.parse({ responseData: { translatedText: "x" }, quotaFinished: true, responseStatus: 200 }), e => e.quota === true);
  assert.throws(() => MyMemory.parse({ responseData: { translatedText: "MYMEMORY WARNING: YOU USED ALL AVAILABLE FREE TRANSLATIONS FOR TODAY" }, responseStatus: 200 }), e => e.quota === true);
  assert.throws(() => MyMemory.parse({ responseData: { translatedText: "" }, responseStatus: "403", responseDetails: "INVALID LANGUAGE PAIR" }), /INVALID LANGUAGE PAIR/);
  assert.throws(() => MyMemory.parse(null), /lạ/);
  assert.equal(MyMemory.decode("&#0; &#99999999; &bogus;"), "&#0; &#99999999; &bogus;", "invalid entities stay as text");
});

test("dictionary: candidate words, normalized entries keep text only and dictionaryapi audio", () => {
  eq(["Hello", " look  up ", "state of the art", "don’t", "hello!", "two words three four", "xin", "Xin chào"].map(w => TrDict.candidate(w, "en")),
    ["hello", "look up", null, "don't", null, null, "xin", null]);
  assert.equal(TrDict.candidate("hello", "vi"), null, "only English sources");
  const api = [{ word: "hello", phonetics: [{ audio: "https://api.dictionaryapi.dev/media/pronunciations/en/hello-au.mp3" }, { text: "/həˈləʊ/", audio: "https://api.dictionaryapi.dev/media/pronunciations/en/hello-uk.mp3" },
    { text: "/həˈloʊ/", audio: "" }, { text: "/x/", audio: "https://evil.example/x-us.mp3" }, { text: "/y/", audio: "javascript:alert(1)" }],
  meanings: [{ partOfSpeech: "noun", definitions: [{ definition: "A greeting.", synonyms: ["hi"] }], synonyms: ["greeting"] },
    { partOfSpeech: "interjection", definitions: [{ definition: "Said when meeting someone.", example: "Hello, everyone." }, { definition: "  " }] }] },
  { word: "hello", meanings: [{ partOfSpeech: "noun", definitions: [{ definition: "Second entry." }] }] }];
  eq(TrDict.normalize(api), { word: "hello",
    phonetics: [{ ipa: "/həˈləʊ/", audio: "https://api.dictionaryapi.dev/media/pronunciations/en/hello-uk.mp3", accent: "UK" }, { ipa: "", audio: "https://api.dictionaryapi.dev/media/pronunciations/en/hello-au.mp3", accent: "AU" },
      { ipa: "/həˈloʊ/", audio: "", accent: "" }, { ipa: "/x/", audio: "", accent: "" }],
    meanings: [{ pos: "noun", defs: [{ def: "A greeting.", ex: "" }, { def: "Second entry.", ex: "" }], syn: ["hi", "greeting"] },
      { pos: "interjection", defs: [{ def: "Said when meeting someone.", ex: "Hello, everyone." }], syn: [] }] });
  for (const bad of [null, {}, [], [null], [{ meanings: "x" }], { title: "No Definitions Found" }]) assert.equal(TrDict.normalize(bad), null, JSON.stringify(bad));
});

test("look-up terms: one per highlighted word, ≤ 10, with the sentence around it", () => {
  const text = "The big company violated planning rules. Planning took a year.\n- Faster search. Daily report.\n";
  const at = s => { const i = text.indexOf(s); return { from: i, to: i + s.length }; };
  let r = TrTerms.fromRanges(text, [at(" company violated planning")], "en");
  eq(r.terms.map(t => [t.term, t.key, t.sentence]), [
    ["company violated planning", "company violated planning", "The big company violated planning rules."],
    ["company", "company", "The big company violated planning rules."],
    ["violated", "violated", "The big company violated planning rules."],
    ["planning", "planning", "The big company violated planning rules."]], "one range of 3 words ⇒ the phrase + 3 words");
  r = TrTerms.fromRanges(text, [at("ompany vio"), { from: 3, to: 3 }, at(". Plan"), at("search."), at(" - ")], "en");
  eq(r.terms.map(t => [t.term, t.sentence]), [["company violated", "The big company violated planning rules."], ["company", "The big company violated planning rules."],
    ["violated", "The big company violated planning rules."], ["Planning", "Planning took a year."], ["search", "Faster search."]],
    "cut words grow to the whole word; one word ⇒ no phrase; punctuation and empty ranges give nothing");
  eq(TrTerms.fromRanges("a b c d e f g", [{ from: 0, to: 13 }], "en").terms.map(t => t.term), ["a", "b", "c", "d", "e", "f", "g"], "more than 6 words ⇒ words only");
  eq(TrTerms.fromRanges(text, [at("planning"), at("Planning")], "en").terms.length, 1, "case-insensitive unique");
  const many = Array.from({ length: 13 }, (_, i) => "w" + i).join(" ");
  const m = TrTerms.fromRanges(many, [{ from: 0, to: many.length }], "vi");
  eq([m.terms.length, m.skipped, m.terms[0].key, m.terms[9].term], [10, 3, null, "w9"], "max 10; non-English terms have no dictionary key");
  eq(TrTerms.fromRanges("今日は晴れです。明日は雨です。週末は寒い。", [{ from: 8, to: 10 }], "ja").terms[0].sentence, "明日は雨です。", "CJK full stops end a sentence");
  eq(TrTerms.fromRanges("Look!", [{ from: 0, to: 5 }], "en").terms[0].sentence, "", "the sentence is just the term");
  eq(TrTerms.fromText(" serendipity \n", "en").terms, [{ term: "serendipity", key: "serendipity", sentence: "" }]);
  eq(TrTerms.fromText("A long sentence here.", "en").terms, []);
});

test("Tatoeba examples: exact-phrase query, approved sentences with a translation, text only", () => {
  const u = new URL(TrExamples.url('risk "limit"', "en", "vi"));
  eq([u.origin + u.pathname, u.searchParams.get("lang"), u.searchParams.get("q"), u.searchParams.get("trans:lang")], ["https://api.tatoeba.org/v1/sentences", "eng", '"risk  limit"', "vie"]);
  eq([TrExamples.url("x", "en", "xx"), TrExamples.url("  ", "en", "vi")], ["", ""]);
  const api = { data: [
    { text: "It's a big risk.", translations: [{ text: "Gián tiếp.", is_direct: false }, { text: "Đó là rủi ro lớn.", is_direct: true }] },
    { text: "Unapproved.", is_unapproved: true, translations: [{ text: "x" }] },
    { text: "No translation.", translations: [] },
    { text: "<b>Nested</b>", translations: [[{ text: "Lồng." }]] },
    { text: "Three.", translations: [{ text: "Ba.", is_unapproved: true }, { text: "Ba!" }] },
    { text: "Four.", translations: [{ text: "Bốn." }] }] };
  eq(TrExamples.parse(api), [{ text: "It's a big risk.", tr: "Đó là rủi ro lớn." }, { text: "<b>Nested</b>", tr: "Lồng." }, { text: "Three.", tr: "Ba!" }]);
  for (const bad of [null, {}, { data: "x" }, { data: [null, 1] }]) eq(TrExamples.parse(bad), []);
});

test("translate op, demos and share links", () => {
  const op = OutputOps.get("translate");
  assert.ok(op && op.pane && !op.preview && typeof op.restore === "function", "pane op that keeps its text");
  assert.ok(OutputOps.get("preview").pane);
  eq([OutputOps.isLive({ live: true }), OutputOps.isLive({ live: false }), OutputOps.isLive({ live: d => d.on }, { on: 1 }), OutputOps.isLive({ live: d => d.on }, {})], [true, false, true, false]);
  for (const k of ["translate-en-vi", "translate-vi-en", "dictionary-word", "dictionary-selection"]) {
    const p = ShareState.parse(DEMOS[k].payload());
    assert.equal(p.views[0].length, 1, k);
    assert.equal(typeof DEMOS[k].after, "function", k);
  }
  assert.equal(ShareState.parse({ v: 1, views: [[{ n: "a", t: "hi" }]], run: "translate" }).run, "", "a link never starts a translation");
  assert.equal(ShareState.parse({ v: 1, views: [[{ n: "a", t: "hi" }]], run: "preview" }).run, "preview");
});

// Translate.run with stubbed browser APIs: what may reach the network, and when.
const JINA = "https://r.jina.ai/";
const PAGE_MD = "Intro with [a link](https://x.org/a_(b) \"T\") and ![logo](https://x.org/l.png).\n\n| Name | Note |\n|---|---|\n| Alpha | `code` here |";
function translateWith({ device = null, consent = false, active = true, sel = {}, page = { data: { title: "Cool  page", url: "https://x.org/page", content: PAGE_MD, metadata: { lang: "fr-FR" } } } }) {
  const calls = { fetch: [], confirm: 0, device: 0 };
  const c = vm.createContext({
    T: ctx.T, TextEncoder, URLSearchParams, URL, AbortSignal, Intl, Error, Promise, Map, Set,
    Prefs: { get: (k, d) => d, set: () => {} }, I18n: { lang: "en", num: n => String(n) }, StatusBar: { msg: () => {} },
    Docs: { list: () => [], text: () => "", get: id => sel[id] && { id, state: { selection: { ranges: sel[id] } } }, root: d => d, family: d => [{ id: "clone", state: null }, d] }, navigator: { userActivation: { isActive: active } },
    confirm: () => { calls.confirm++; return consent; },
    fetch: async (u, o) => { calls.fetch.push(u); if (u.startsWith(JINA)) { const main = !!o?.headers?.["X-Target-Selector"]; calls.main = (calls.main || []).concat(main); return { status: 200, json: async () => typeof page === "function" ? page(main) : page }; } const q = new URL(u).searchParams; return { status: 200, json: async () => ({ responseData: { translatedText: "MM:" + q.get("q") }, responseStatus: 200 }) }; },
    OnDevice: { MAX_BYTES: 4000, detect: async () => "", availability: async () => device, prepare: async () => ({ translate: async u => { calls.device++; return "D:" + u; } }) },
  });
  vm.runInContext(["js/translate/language-detect-text.js", "js/translate/text-chunker-for-translation.js", "js/translate/translate-provider-mymemory.js",
    "js/translate/dictionary-english-lookup.js", "js/translate/lookup-terms-from-selection.js", "js/translate/web-page-reader-jina.js", "js/translate/translate-run.js"].map(src).join("\n;\n") + "\n;globalThis.Translate = Translate;", c);
  return { Translate: c.Translate, calls };
}

test("translate run: on-device sends nothing; MyMemory only after consent; live and pending never send", async () => {
  let t = translateWith({ device: "available" });
  let r = await t.Translate.run("Hello team.\nSee you.", { id: "a" });
  eq([r.text, r.view.provider, t.calls.fetch.length, t.calls.confirm], ["D:Hello team.\nD:See you.", "device", 0, 0]);
  t = translateWith({ device: null, consent: false });
  await assert.rejects(t.Translate.run("Hello team.", { id: "a" }), e => e.warn === true);
  eq([t.calls.confirm, t.calls.fetch.length], [1, 0], "declined ⇒ nothing sent");
  t = translateWith({ device: null, consent: true });
  r = await t.Translate.run("Hello team.\n```\nsecret = 1\n```\n", { id: "a" });
  eq([r.text, t.calls.fetch.length, r.view.provider], ["MM:Hello team.\n```\nsecret = 1\n```\n", 1, "mymemory"], "code block not sent");
  await t.Translate.run("Hello again.", { id: "b" });
  eq([t.calls.confirm, t.calls.fetch.length], [1, 2], "consent asked once per page");
  t = translateWith({ device: null, consent: true });
  await assert.rejects(t.Translate.run("Hello team.", { id: "a", quiet: true }), e => e.warn === true);
  eq([t.calls.confirm, t.calls.fetch.length], [0, 0], "live (quiet) run never asks nor sends");
  t = translateWith({ device: "downloadable", active: false });
  r = await t.Translate.run("Hello team.", { id: "a" });
  eq([r.view.pending, r.error.warn, t.calls.device, t.calls.fetch.length], [true, true, 0, 0], "opened without a click ⇒ waits");
  t = translateWith({ device: "available" });
  Object.assign(t.Translate.of("a"), { to: "en" });
  await assert.rejects(t.Translate.run("Hello team.", { id: "a" }), /trùng nhau/, "explicit target equal to the source");
});

test("translate run: a text with more units than the cache keeps every translation", async () => {
  const t = translateWith({ device: "available" }), lines = Array.from({ length: 3500 }, (_, i) => "Line number " + i + " is here.");
  const r = await t.Translate.run(lines.join("\n"), { id: "big" });
  assert.equal(r.text, lines.map(l => "D:" + l).join("\n"));
});

test("translate run: look-up follows the highlighted ranges; dictionary strings use the run's provider", async () => {
  const text = "Check the risk limit. Then call the desk.";
  let t = translateWith({ device: "available", sel: { a: [{ from: 10, to: 20, empty: false }, { from: 0, to: 0, empty: true }, { from: 36, to: 40, empty: false }] } });
  let r = await t.Translate.run(text, { id: "a" });
  eq(r.view.look.terms.map(x => x.term), ["risk limit", "risk", "limit", "desk"], "highlight read from the tab or its clone");
  r = await t.Translate.run(text, { id: "z", quiet: true });
  eq(r.view.look.terms, [], "nothing highlighted, not one term");
  r = await t.Translate.run("serendipity", { id: "b" });
  eq(r.view.look.terms.map(x => x.term), ["serendipity"], "no highlight ⇒ the whole tab when it is one term");
  eq(await t.Translate.list(["risk limit", "risk limit"], "en", "vi", "device"), ["D:risk limit", "D:risk limit"]);
  eq(t.calls.fetch.length, 0, "on-device dictionary translation sends nothing");
  t = translateWith({ device: null, consent: true });
  await assert.rejects(t.Translate.list(["desk"], "en", "vi", "mymemory"), /MyMemory/, "no MyMemory before the page agreed");
  await t.Translate.run("Hello team.", { id: "c" });
  eq(await t.Translate.list(["desk", "x".repeat(600)], "en", "vi", "mymemory"), ["MM:desk", ""], "too long for one MyMemory request ⇒ left out");
  eq(t.calls.fetch.length, 2);
});

test("web page: a tab of one http(s) URL, Jina JSON → Markdown, URLs / code / pipes / edge spaces never reach the translator", () => {
  eq(["https://x.org/a?b=1#top", "  https://www.w3.org/Provider/Style/URI\n", "see https://x.org", "https://x.org\nhttps://y.org", "ftp://x.org", "https://localhost:3000/a.b", "javascript:alert(1)", "https://x"].map(WebPage.urlOf),
    ["https://x.org/a?b=1", "https://www.w3.org/Provider/Style/URI", "", "", "", "", "", ""]);
  const p = WebPage.parse({ data: { title: " Cool \n page ", url: "https://x.org/", content: "Body.", metadata: { lang: "en-US" } } });
  eq(p, { title: "Cool page", url: "https://x.org/", lang: "en", md: "# Cool page\n\nBody." });
  assert.equal(WebPage.parse({ data: { title: "T", content: "## Own heading\nx" } }).md, "## Own heading\nx", "content with a heading keeps it");
  assert.throws(() => WebPage.parse({ data: null, code: 422, readableMessage: "Domain could not be resolved" }), /Domain could not be resolved/);
  const segs = WebPage.plan(PAGE_MD, 450);
  eq(TrChunk.units(segs), ["Intro with", "a link", "and", "logo", "Name", "Note", "Alpha", "here"]);
  assert.equal(TrChunk.join(segs, TrChunk.units(segs)), PAGE_MD, "identity join");
  eq([WebPage.urlOf("https://user:pw@x.org/a"), WebPage.parse({ data: { url: "javascript:alert(1)", content: "x" } }).url], ["", ""], "no credentials sent, page.url only http(s)");
  assert.equal(WebPage.esc("a](https://evil/x) ![b|c]\n<i>`d`\\"), "a\\](https://evil/x) !\\[b\\|c\\] \\<i\\>\\`d\\`\\\\", "a translation cannot open a link / image / cell / tag");
  const c = WebPage.cap(WebPage.plan("Alpha beta.\n\nGamma delta.\n\nEpsilon.", 450), 25);
  eq([c.done, c.total, TrChunk.units(c.segs)], [2, 3, ["Alpha beta.", "Gamma delta."]], "long page: first pieces within the budget");
  assert.match(WebPage.googleUrl("https://x.org/a?b=1", "zh"), /^https:\/\/translate\.google\.com\/translate\?sl=auto&tl=zh-CN&u=https%3A%2F%2Fx\.org%2Fa%3Fb%3D1$/);
  assert.equal(DEMOS["translate-web-page"].payload().views[0][0].t, "https://www.w3.org/Provider/Style/URI\n");
});

test("web page run: asks before Jina, sends only the URL (no #fragment), caches the page, live / no-click runs send nothing", async () => {
  let t = translateWith({ device: "available", consent: false });
  await assert.rejects(t.Translate.run("https://x.org/page#top", { id: "a" }), e => e.warn === true);
  eq([t.calls.confirm, t.calls.fetch.length], [1, 0], "declined ⇒ nothing sent");
  t = translateWith({ device: "available", consent: true });
  let r = await t.Translate.run("https://x.org/page#top", { id: "a" });
  eq([t.calls.fetch, t.calls.main], [[JINA + "https://x.org/page"], [true]], "main content (article / main) asked first");
  assert.equal(r.text, "# D:Cool page\n\nD:Intro with [D:a link](https://x.org/a_(b) \"T\") D:and ![D:logo](https://x.org/l.png).\n\n| D:Name | D:Note |\n|---|---|\n| D:Alpha | `code` D:here |");
  eq([r.view.web, r.view.from, r.view.by, r.view.provider, r.view.look], [{ url: "https://x.org/page", title: "Cool page" }, "fr", "page", "device", null]);
  await t.Translate.run("https://x.org/page", { id: "b" });
  eq([t.calls.confirm, t.calls.fetch.length], [1, 1], "asked once, page cached");
  await assert.rejects(t.Translate.run("https://x.org/page", { id: "a", quiet: true }), e => e.warn === true);
  eq(t.calls.fetch.length, 1, "live run never fetches");
  t = translateWith({ device: "available", consent: true, active: false });
  r = await t.Translate.run("https://x.org/page", { id: "a" });
  eq([r.view.pending, r.view.web.url, r.error.warn, t.calls.confirm, t.calls.fetch.length], [true, "https://x.org/page", true, 0, 0], "opened without a click ⇒ waits");
  t = translateWith({ device: "available", consent: true, page: { data: null, code: 422, readableMessage: "Domain 'x.org' could not be resolved" } });
  await assert.rejects(t.Translate.run("https://x.org/page", { id: "a" }), /could not be resolved/);
  t = translateWith({ device: "available", consent: true, page: main => main ? { data: null, code: 422, readableMessage: "No content available with target selector" } : { data: { title: "Plain", content: "No main element here." } } });
  r = await t.Translate.run("https://x.org/plain", { id: "a" });
  eq([t.calls.main, r.text], [[true, false], "# D:Plain\n\nD:No main element here."], "no <main> / <article> ⇒ whole page");
  t = translateWith({ device: "available", consent: true });
  await Promise.all([t.Translate.run("https://x.org/page", { id: "a" }), t.Translate.run("https://x.org/page", { id: "b" })]);
  eq(t.calls.fetch.length, 1, "a second ▶ while loading does not fetch again");
  const long = Array.from({ length: 60 }, (_, i) => "Line " + i + " " + "word ".repeat(18)).join("\n\n");
  t = translateWith({ device: null, consent: true, page: { data: { title: "Long", content: long } } });
  r = await t.Translate.run("https://x.org/long", { id: "a" });
  const sent = t.calls.fetch.filter(u => !u.startsWith(JINA)).length;
  assert.ok(sent > 10 && sent < 61 && r.view.warnings.length === 1 && /\/ 61/.test(r.view.warnings[0]), "MyMemory: first pieces within today's quota, the rest kept: " + sent + " " + r.view.warnings);
  assert.ok(r.text.includes("# MM:Long") && r.text.endsWith("Line 59 " + "word ".repeat(18).trim()), "untranslated tail kept as is");
});

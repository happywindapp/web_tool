// Khung tab Danh ngôn · Sách · Phim · English · Kiến thức trong Chi tiết ngày: 🔄 đổi mục khác, ⚙ chọn chủ đề được hiện (lưu localStorage, bỏ chọn hết = tất cả).
const DailyReads = (() => {
  const esc = s => Dom.esc(s);
  const KINDS = ["quote", "book", "movie", "english", "link"];
  const TAB = { quote: "💬 Danh ngôn", book: "📚 Sách", movie: "🎬 Phim", english: "🔤 English", link: "💡 Kiến thức" };
  const NEXT = { quote: "Đổi danh ngôn khác", book: "Đổi sách khác", movie: "Đổi phim khác", english: "Đổi từ khác", link: "Đổi trang kiến thức khác" };
  const SET = { quote: "Chọn chủ đề danh ngôn", book: "Chọn chủ đề sách", movie: "Chọn thể loại phim", english: "Chọn chủ đề từ vựng", link: "Chọn chủ đề kiến thức" };
  const canSpeak = typeof speechSynthesis !== "undefined";
  const say = text => canSpeak ? `<button type="button" class="say" data-say="${esc(text)}" title="${esc(T("Nghe phát âm"))}">🔊</button>` : "";
  const extra = { jd: null, quote: 0, book: 0, movie: 0, english: 0, link: 0 };
  let o, tab = "quote", open = false, allowed = { quote: [], book: [], movie: [], english: [], link: [] };

  const topicName = (kind, id) => { const t = DailyPick.TOPICS[kind].find(x => x[0] === id); return t ? T(t[1]) : id; };

  function panel() {
    if (!open) return "";
    const on = allowed[tab];
    const isOn = id => !on.length || on.includes(id);
    const box = ([id, name]) => `<label class="chk"><input type="checkbox" data-dr-topic="${tab}" value="${id}"${isOn(id) ? " checked" : ""}>${esc(T(name))}</label>`;
    const groups = DailyPick.GROUPS[tab];
    const list = groups ? groups.map(([name, ids], gi) => `<div class="dr-group"><label class="chk dr-group-head"><input type="checkbox" data-dr-group="${gi}"${ids.every(isOn) ? " checked" : ""}>${esc(T(name))}</label>`
      + `<div class="dr-topics">${DailyPick.TOPICS[tab].filter(t => ids.includes(t[0])).map(box).join("")}</div></div>`).join("") : `<div class="dr-topics">${DailyPick.TOPICS[tab].map(box).join("")}</div>`;
    return `<div class="dr-set"><b>${esc(T("Chủ đề được hiện"))}</b>${list}`
      + `<div class="nb-row"><small class="muted">${esc(T("Bỏ chọn hết = hiện tất cả"))}</small><button type="button" data-dr-all>${esc(T("Chọn tất cả"))}</button>`
      + `<button type="button" class="main" data-dr-close>${esc(T("Xong"))}</button></div></div>`;
  }

  function body(jd) {
    const x = DailyPick.of(tab, jd, extra[tab], allowed[tab]);
    if (!x) return `<p class="muted">${esc(T("Đang cập nhật dữ liệu."))}</p>`;
    const topic = `<span class="tag">${esc(topicName(tab, x.topic))}</span>`;
    if (tab === "quote") return `<blockquote class="quote">${esc(T(x.text))}<cite>— ${esc(T(x.by))} ${topic}</cite></blockquote>`;
    if (tab === "book") {
      const year = x.year < 0 ? T("{y} TCN", { y: -x.year }) : String(x.year);
      return `<p><b>${esc(T(x.title))}</b> — ${esc(x.author)} (${esc(year)}) ${topic}</p><p>${esc(T(x.about))}</p>`;
    }
    if (tab === "movie") return `<p><b>${esc(T(x.title))}</b> — ${esc(x.director)} (${x.year}) · ${esc(T(x.country))} ${topic}</p><p>${esc(T(x.about))}</p>`;
    if (tab === "english") {
      const trans = T(x.trans);
      return `<p class="en-word"><b lang="en">${esc(x.word)}</b>${say(x.word)} <span class="muted">${esc(x.ipa)}</span> <small class="muted">${esc(x.pos)} · ${esc(x.level)}</small> ${topic}</p>`
        + `<p>${esc(T(x.meaning))}</p><p lang="en"><i>${esc(x.example)}</i>${say(x.example)}</p>` + (trans !== x.example ? `<p class="muted">${esc(trans)}</p>` : "");
    }
    let host = x.url;
    try { host = new URL(x.url).hostname.replace(/^www\./, ""); } catch { /* keep url */ }
    return `<p><a href="${esc(x.url)}" target="_blank" rel="noopener noreferrer"><b>${esc(x.name)}</b></a> <small class="muted">${esc(host)} · ${x.lang === "vi" ? "VI" : "EN"}</small> ${topic}</p><p>${esc(T(x.about))}</p>`;
  }

  function html(jd) {
    if (extra.jd !== jd) Object.assign(extra, { jd, quote: 0, book: 0, movie: 0, english: 0, link: 0 });
    const tabs = KINDS.map(k => `<button type="button" role="tab" data-dr-tab="${k}" aria-selected="${k === tab}" class="${k === tab ? "on" : ""}">${esc(T(TAB[k]))}</button>`).join("");
    return `<section class="reads"><div class="reads-bar"><div class="seg reads-tabs" role="tablist">${tabs}<a class="btn study-link" href="../study.html" target="_blank" rel="noopener" title="${esc(T("Mở trang bài thi trắc nghiệm ôn tập"))}">🎓 Study</a></div><span class="dr-act">`
      + `<button type="button" data-dr-set title="${esc(T(SET[tab]))}" aria-expanded="${open}">⚙</button><button type="button" data-dr-next title="${esc(T(NEXT[tab]))}">🔄</button></span></div>`
      + panel() + `<div class="reads-body">${body(jd)}</div></section>`;
  }

  // Browser text-to-speech (offline, no network): English voice if the system has one.
  function speak(text) {
    if (!canSpeak) return;
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text), v = speechSynthesis.getVoices().find(x => /^en(-|_)US/i.test(x.lang)) || speechSynthesis.getVoices().find(x => /^en/i.test(x.lang));
    u.lang = "en-US"; u.rate = 0.9; if (v) u.voice = v;
    speechSynthesis.speak(u);
  }

  function save() { o.store.set("topics", allowed); extra[tab] = 0; o.onChange(); }

  // opts: { store, onChange: re-render the day pane }
  function init(opts) {
    o = opts;
    const raw = o.store.get("topics", {});
    for (const k of KINDS) { const ids = DailyPick.TOPICS[k].map(t => t[0]); allowed[k] = Array.isArray(raw && raw[k]) ? raw[k].filter(id => ids.includes(id)) : []; }
    const t0 = o.store.get("readsTab", "quote");
    if (KINDS.includes(t0)) tab = t0;
    $("detail").addEventListener("click", e => {
      const sp = e.target.closest("[data-say]");
      if (sp) return speak(sp.dataset.say);
      const t = e.target.closest("[data-dr-tab],[data-dr-next],[data-dr-set],[data-dr-all],[data-dr-close]");
      if (!t) return;
      if (t.dataset.drTab) { tab = t.dataset.drTab; open = false; o.store.set("readsTab", tab); }
      else if (t.hasAttribute("data-dr-next")) extra[tab]++;
      else if (t.hasAttribute("data-dr-set")) open = !open;
      else if (t.hasAttribute("data-dr-all")) { allowed[tab] = []; return save(); }
      else open = false;
      o.onChange();
      if (t.dataset.drTab) $("detail").querySelector(".reads-tabs .on")?.scrollIntoView({ block: "nearest", inline: "nearest" });
    });
    $("detail").addEventListener("change", e => {
      if (e.target.dataset.drGroup) {
        const ids = DailyPick.GROUPS[tab][+e.target.dataset.drGroup][1];
        $("detail").querySelectorAll("[data-dr-topic]").forEach(x => { if (ids.includes(x.value)) x.checked = e.target.checked; });
      } else if (!e.target.dataset.drTopic) return;
      const ids = [...$("detail").querySelectorAll("[data-dr-topic]")].filter(x => x.checked).map(x => x.value);
      allowed[tab] = ids.length === DailyPick.TOPICS[tab].length ? [] : ids;
      save();
    });
  }

  return { init, html };
})();

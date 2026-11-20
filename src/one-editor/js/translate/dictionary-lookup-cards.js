// Look-up cards of the Translate tab: one card per highlighted word (≤ 10) — English dictionary, term + senses in both languages, example sentences. Text nodes only.
const PvDictCards = {
  create(mk, btn) {
    const all = btn(() => c.lookup()), note = mk("span", "tr-dict-note"), skip = mk("div", "tr-muted"), list = mk("div", "tr-cards"), el = mk("div", "tr-dict");
    el.append(all, note, skip, list);
    const c = { el, d: {}, terms: [], skipped: 0, sig: "", cards: new Map(), running: false };
    const tr = (e, s) => e && e.tr && s ? e.tr.get(s) || "" : "";

    // Text with each occurrence of the term in <mark>.
    function marked(cls, text, term) {
      const box = mk("div", cls), low = text.toLowerCase(), t = term.toLowerCase();
      let i = 0, at;
      while (t && (at = low.indexOf(t, i)) >= 0) { box.append(text.slice(i, at), mk("mark", "", { textContent: text.slice(at, at + t.length) })); i = at + t.length; }
      box.append(text.slice(i));
      return box;
    }
    // Source line + its translation (when there is one) appended to box.
    const pair = (box, e, s, term, quote) => {
      const q = x => quote ? "“" + x + "”" : x, t = tr(e, s);
      box.append(term ? marked("tr-src", q(s), term) : mk("div", quote ? "tr-src tr-ex" : "tr-src", { textContent: q(s) }));
      if (t) box.append(mk("div", quote ? "tr-tr tr-ex" : "tr-tr", { textContent: q(t) }));
      return box;
    };
    function phon(ph) {
      const s = mk("span", "tr-ph");
      if (ph.accent) s.append(mk("small", "", { textContent: ph.accent }));
      if (ph.ipa) s.append(mk("span", "", { textContent: ph.ipa }));
      if (ph.audio) s.append(Object.assign(btn(() => new Audio(ph.audio).play().catch(() => StatusBar.msg(T("Không phát được audio phát âm."), "bad"))), { textContent: "🔊", title: T("Nghe phát âm (audio từ api.dictionaryapi.dev)") }));
      return s;
    }

    function examples(t, e) {
      const box = mk("div", "tr-exs"), ex = e && e.ex || [];
      box.append(mk("div", "tr-exs-h", { textContent: T("Ví dụ") }));
      if (t.sentence) { const it = mk("div", "tr-exi"); it.append(mk("small", "tr-tag", { textContent: T("Trong văn bản") })); box.append(pair(it, e, t.sentence, t.term)); }
      for (const x of ex) { const it = mk("div", "tr-exi"); it.append(marked("tr-src", x.text, t.term), mk("div", "tr-tr", { textContent: x.tr })); box.append(it); }
      if (ex.length) box.append(mk("div", "tr-muted", { textContent: T("Câu ví dụ + bản dịch: Tatoeba (CC BY 2.0 FR)") }));
      if (e && e.exErr) box.append(mk("div", "tr-dict-err", { textContent: e.exErr }));
      else if (e && !e.busy && e.ex && !t.sentence && !ex.length) box.append(mk("div", "tr-muted", { textContent: T("Không tìm thấy câu ví dụ.") }));
      return box;
    }
    function card(t) {
      const e = c.cards.get(t.term), box = mk("div", "tr-card"), head = mk("div", "tr-word"), tt = tr(e, t.term);
      head.append(mk("b", "", { textContent: t.term }), ...(e && e.r ? e.r.phonetics.map(phon) : []));
      if (tt) head.append(mk("span", "tr-tr", { textContent: "→ " + tt }));
      head.append(Object.assign(btn(() => lookOne(t)), { className: "tr-card-go", textContent: e && !e.busy ? T("↻ Tra lại") : T("📖 Tra từ điển “{w}”", { w: t.term }), disabled: !!(e && e.busy) }));
      box.append(head);
      if (e && e.busy) box.append(mk("div", "tr-muted", { textContent: T("Đang tra từ điển…") }));
      else if (e && e.rErr) box.append(mk("div", "tr-dict-err", { textContent: e.rErr }));
      else if (e && t.key && !e.r) box.append(mk("div", "tr-muted", { textContent: T("Không tìm thấy “{w}” trong từ điển tiếng Anh.", { w: t.term }) }));
      for (const m of e && e.r ? e.r.meanings : []) {
        const sec = mk("div", "tr-pos"), ol = mk("ol");
        sec.append(mk("i", "", { textContent: m.pos }));
        for (const d of m.defs) ol.append(d.ex ? pair(pair(mk("li"), e, d.def), e, d.ex, "", true) : pair(mk("li"), e, d.def));
        sec.append(ol);
        if (m.syn.length) sec.append(mk("div", "tr-syn", { textContent: T("Đồng nghĩa: {list}", { list: m.syn.join(", ") }) }));
        box.append(sec);
      }
      if (t.sentence || e) box.append(examples(t, e));
      if (e && e.trErr) box.append(mk("div", "tr-muted", { textContent: e.trErr }));
      return box;
    }

    // Translated with the run's provider: on-device the term, sentence, every sense + example; MyMemory only the term + first sense of each part of speech (daily quota).
    function wanted(t, r, device) {
      const items = [t.term, device && t.sentence];
      for (const m of r ? r.meanings : []) m.defs.forEach((d, i) => { if (device || i === 0) items.push(d.def); if (device) items.push(d.ex); });
      return [...new Set(items.filter(Boolean))];
    }
    async function lookOne(t) {
      const sig = c.sig, { from, to, provider } = c.d, e = { busy: true };
      c.cards.set(t.term, e);
      render();
      const [r, ex] = await Promise.allSettled([t.key ? TrDict.lookup(t.key) : undefined, TrExamples.search(t.term, from, to)]);
      Object.assign(e, { r: r.value, rErr: r.reason ? r.reason.message : "", ex: ex.value, exErr: ex.reason ? ex.reason.message : "" });
      if (c.quota) e.trErr = c.quota;
      else if (!provider) e.trErr = T("Bấm ▶ Dịch để có thêm bản dịch {lang} trong từ điển.", { lang: Translate.name(to) });
      else {
        const items = wanted(t, e.r, provider === "device");
        try { const out = await Translate.list(items, from, to, provider); e.tr = new Map(items.map((s, i) => [s, out[i]])); }
        catch (x) { e.trErr = T("Không dịch được phần từ điển: {msg}", { msg: x.message }); if (x.quota) c.quota = e.trErr; }
      }
      e.busy = false;
      e.failed = !!(e.rErr || e.exErr || (e.trErr && provider && !c.quota));
      if (sig === c.sig) render();
    }
    c.lookup = async () => {
      if (c.running) return;
      c.running = true;
      render();
      const sig = c.sig;
      try { for (const t of c.terms) if (sig === c.sig && (!c.cards.has(t.term) || c.cards.get(t.term).failed)) await lookOne(t); }
      finally { c.running = false; render(); }
    };

    function render() {
      const n = c.terms.length;
      el.hidden = !n;
      if (!n) return list.replaceChildren();
      Object.assign(all, { textContent: T("📖 Tra tất cả {n} từ / cụm từ", { n }), hidden: n < 2, disabled: c.running,
        title: T("Từ điển tiếng Anh, nghĩa + bản dịch, câu ví dụ — mỗi từ tô đen là 1 thẻ, vùng tô 2–6 từ có thêm 1 thẻ cho cả cụm (giữ Ctrl + kéo chuột để tô nhiều chỗ), tối đa {max} thẻ", { max: TrTerms.MAX }) });
      note.textContent = c.d.provider === "mymemory" ? T("Chỉ gửi các từ / cụm từ dưới đây tới api.dictionaryapi.dev (từ điển tiếng Anh), api.tatoeba.org (câu ví dụ) và MyMemory (bản dịch nghĩa) khi bấm.")
        : T("Chỉ gửi các từ / cụm từ dưới đây tới api.dictionaryapi.dev (từ điển tiếng Anh) và api.tatoeba.org (câu ví dụ) khi bấm.");
      skip.hidden = !c.skipped;
      skip.textContent = T("Chỉ tra {max} từ / cụm từ đầu — bỏ qua {n} còn lại.", { n: c.skipped, max: TrTerms.MAX });
      list.replaceChildren(...c.terms.map(card));
    }
    c.show = d => {
      const look = d.look || { terms: [], skipped: 0 }, sig = JSON.stringify([look.terms.map(t => [t.term, t.sentence]), d.from, d.to, d.provider || ""]);
      c.d = d;
      c.skipped = look.skipped;
      if (sig !== c.sig) Object.assign(c, { sig, terms: look.terms, cards: new Map(), running: false, quota: "" });
    };
    c.labels = render;
    return c;
  },
};

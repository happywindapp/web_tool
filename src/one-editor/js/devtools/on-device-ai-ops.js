// "ai-summarize" / "ai-explain" / "ai-proofread" ops on Chrome's built-in model (Summarizer, LanguageModel, Proofreader / Rewriter): the first use may download the model (progress in the status bar, click = cancel); nothing leaves the machine.
const LocalAiOps = (() => {
  const MAX = 20000;
  let busy = null;
  const api = name => (typeof globalThis[name]?.create === "function" ? globalThis[name] : null);
  const stopped = () => Object.assign(new Error(T("Đã huỷ.")), { stopped: true });
  const cancel = () => busy?.abort();

  // create() options shared by every API: download progress + cancel.
  function common(ac) {
    return {
      signal: ac.signal,
      monitor(m) { m.addEventListener("downloadprogress", e => StatusBar.msg(T("Đang tải model AI trên máy {p}% (chỉ lần đầu) — bấm để huỷ.", { p: Math.round((e.loaded || 0) * 100) }), "", cancel, T("Bấm để huỷ"))); },
    };
  }
  async function make(name, opts, ac) {
    const A = api(name), avail = await A.availability(opts).catch(() => "unavailable");
    if (avail === "unavailable") throw Object.assign(new Error(T("Máy / trình duyệt này không chạy được {api} (thiếu phần cứng hoặc chưa bật).", { api: name })), { warn: true });
    if (avail !== "available") StatusBar.msg(T("Đang chuẩn bị model AI trên máy — bấm để huỷ."), "", cancel, T("Bấm để huỷ"));
    return A.create({ ...opts, ...common(ac) });
  }

  const SYS = {
    summarize: "Summarize the user's text as short Markdown bullet points. Keep names, numbers and identifiers exact.",
    explain: "You explain code, regular expressions and log excerpts to a developer. Answer in Markdown: what it does, step by step, then pitfalls. Be concise.",
    proofread: "Fix grammar, spelling and punctuation of the user's English text. Keep its meaning, tone and formatting. Reply with the corrected text only.",
  };
  const LM_OPTS = { expectedInputs: [{ type: "text", languages: ["en"] }], expectedOutputs: [{ type: "text", languages: ["en"] }] };
  async function prompt(kind, text, ac, hint = "") {
    const s = await make("LanguageModel", LM_OPTS, ac);
    try { return await s.prompt([{ role: "system", content: SYS[kind] }, { role: "user", content: (hint ? hint + "\n\n" : "") + text }], { signal: ac.signal }); }
    finally { s.destroy?.(); }
  }

  async function exec(kind, text, ac, lang) {
    if (kind === "summarize" && api("Summarizer")) {
      const s = await make("Summarizer", { type: "key-points", format: "markdown", length: "medium", expectedInputLanguages: ["en"], outputLanguage: "en" }, ac);
      try { return { out: await s.summarize(text, { signal: ac.signal }), by: "Summarizer" }; } finally { s.destroy?.(); }
    }
    if (kind === "proofread" && api("Proofreader")) {
      const p = await make("Proofreader", { expectedInputLanguages: ["en"] }, ac);
      try { const r = await p.proofread(text, { signal: ac.signal }); return { out: r?.correctedInput ?? String(r ?? ""), by: "Proofreader", n: r?.corrections?.length }; } finally { p.destroy?.(); }
    }
    if (kind === "proofread" && api("Rewriter")) {
      const r = await make("Rewriter", { tone: "as-is", format: "as-is", length: "as-is", sharedContext: SYS.proofread }, ac);
      try { return { out: await r.rewrite(text, { signal: ac.signal, context: SYS.proofread }), by: "Rewriter" }; } finally { r.destroy?.(); }
    }
    if (!api("LanguageModel")) throw Object.assign(new Error(T("Trình duyệt này không có API AI trên máy cho việc này.")), { warn: true });
    const hint = kind === "explain" ? "Explain this " + (lang === "Log" ? "log excerpt" : /regex/i.test(lang) ? "regular expression" : lang && lang !== "Plain Text" ? lang + " code" : "text") + ":" : "";
    return { out: await prompt(kind, text, ac, hint), by: "LanguageModel" };
  }

  async function run(kind, t, c) {
    const text = t.trim();
    if (!text) throw Object.assign(new Error(T("Tab trống — không có gì để gửi cho AI.")), { warn: true });
    busy?.abort();
    const ac = busy = new AbortController(), src = Docs.get(c.id), lang = src ? Docs.effectiveLang(src) : "";
    try {
      const r = await exec(kind, text.slice(0, MAX), ac, lang);
      StatusBar.msg(T("✔ AI trên máy ({api}) đã xong — dữ liệu không rời máy.", { api: r.by }), "good");
      const notes = [T("Kết quả do model nhỏ trên máy tạo ({api}) — hãy kiểm lại.", { api: r.by }), text.length > MAX ? T("Chỉ gửi {n} ký tự đầu.", { n: I18n.num(MAX) }) : "", r.n != null ? T("{n} chỗ sửa.", { n: r.n }) : ""].filter(Boolean);
      return { text: String(r.out ?? "").replace(/\n?$/, "\n"), notes };
    } catch (e) {
      if (ac.signal.aborted || e?.name === "AbortError") throw stopped();
      throw e;
    } finally { if (busy === ac) busy = null; }
  }

  return { run, cancel };
})();

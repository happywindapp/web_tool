// Phase 15a text & list tools: one entry per ▶ op (wrap / join lines, extract URL·e-mail·IP, slug, HTML → text, numbers → words, word frequency) — fields for the options dialog, clean(), run().
const TextTools = (() => {
  const n = x => I18n.num(x);
  const TOOLS = {
    "wrap-lines": {
      title: "Bọc / nối dòng", replace: true, clean: WrapLines.clean,
      presets: [["", "Tuỳ chỉnh"], ["sql-in", "SQL IN (lô 1.000)"], ["sql-values", "SQL VALUES (lô 1.000)"], ["json-array", "JSON array"], ["go-slice", "Go slice"], ["cs-array", "C# array"]],
      fields: [
        { k: "prefix", label: "Tiền tố mỗi dòng", type: "text" }, { k: "suffix", label: "Hậu tố mỗi dòng", type: "text" },
        { k: "quote", label: "Nháy", type: "select", options: [["none", "Không nháy"], ["single", "'…' (SQL, '' trong chuỗi)"], ["singleAuto", "'…' — số giữ nguyên"], ["double", "\"…\" (escape \\\")"]] },
        { k: "join", label: "Dấu nối (\\n = xuống dòng)", type: "text" }, { k: "batch", label: "Chia lô N dòng (0 = không chia)", type: "number" },
        { k: "head", label: "Đầu mỗi lô", type: "text" }, { k: "tail", label: "Cuối mỗi lô", type: "text" }, { k: "sep", label: "Giữa các lô", type: "text" },
        { k: "trim", label: "Bỏ khoảng trắng đầu / cuối", type: "check" }, { k: "skipEmpty", label: "Bỏ dòng trống", type: "check" }, { k: "unique", label: "Bỏ dòng trùng", type: "check" },
      ],
      run: (t, o) => { const r = WrapLines.run(t, o); return { text: r.text, notes: [T("{items} dòng → {batches} lô.", { items: n(r.items), batches: n(r.batches) }) + (r.numeric ? " " + T("Toàn số ⇒ không thêm nháy.") : "")] }; },
    },
    "extract": {
      title: "Trích URL / email / IP", clean: ExtractText.clean,
      fields: [{ k: "kinds", label: "Loại", type: "multi", options: ExtractText.KINDS.map(k => [k, ExtractText.NAME[k]]) }, { k: "unique", label: "Bỏ trùng", type: "check" }, { k: "count", label: "Đếm số lần (cột 2, khi bỏ trùng)", type: "check" }],
      run: (t, o) => { const r = ExtractText.run(t, o); return { text: r.text, notes: [r.groups.map(g => T("{kind}: {n} ({all} lần)", { kind: ExtractText.NAME[g.kind], n: n(g.items.length), all: n(r.total[g.kind]) })).join(" · ")] }; },
    },
    "slug-lines": {
      title: "Slug (bỏ dấu tiếng Việt)", replace: true, clean: o => ({ keepCase: o?.keepCase === true }),
      fields: [{ k: "keepCase", label: "Giữ hoa / thường", type: "check" }],
      run: (t, o) => ({ text: Slug.lines(t, o.keepCase) }),
    },
    "html-to-text": {
      title: "HTML → văn bản", clean: () => ({}), fields: [],
      // DOMParser never runs scripts or fetches images / styles of the parsed document.
      run: t => ({ text: HtmlText.convert(new DOMParser().parseFromString(t, "text/html").body || document.createElement("body")) }),
    },
    "number-words": {
      title: "Số → chữ", replace: true, clean: NumWords.clean,
      fields: [{ k: "lang", label: "Ngôn ngữ", type: "select", options: [["vi", "Tiếng Việt"], ["en", "English"]] }, { k: "dong", label: "Thêm “đồng” (tiếng Việt)", type: "check" }, { k: "cap", label: "Viết hoa chữ đầu", type: "check" }],
      run: (t, o) => { const r = NumWords.replaceAll(t, o); return { text: r.text, notes: [T("Đổi {n} số.", { n: n(r.n) }) + (r.skipped ? " " + T("{n} số quá {d} chữ số — giữ nguyên.", { n: n(r.skipped), d: NumWords.MAX_DIGITS }) : "")] }; },
    },
    "word-freq": {
      title: "Tần suất từ", clean: WordFreq.clean,
      fields: [{ k: "stop", label: "Bỏ stopword English (the, and, of…)", type: "check" }, { k: "top", label: "Top N (0 = tất cả)", type: "number" }],
      run: (t, o) => { const r = WordFreq.run(t, o); return { text: r.text, notes: [T("{total} từ, {distinct} từ khác nhau.", { total: n(r.total), distinct: n(r.distinct) })] }; },
    },
  };

  const get = id => Object.hasOwn(TOOLS, id) ? TOOLS[id] : null;
  const opts = (srcId, id) => PowerUi.opts(srcId, id, get(id).clean, () => get(id).clean({}));
  // ▶ op: options of the source tab (dialog / link / hot exit).
  function op(id, t, c) {
    const tool = get(id), r = tool.run(t, opts(c.id, id));
    return { text: r.text, notes: r.notes || [] };
  }

  return { TOOLS, get, opts, op };
})();

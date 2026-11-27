// On-device AI (Chrome built-in: Summarizer, LanguageModel, Proofreader / Rewriter): feature detection only on the main page — menu rows next to 🤖 Hỏi AI, Palette rows and ▶ ops exist only when the browser has the API; the work lives in the lazy bundle (LocalAiOps).
const LocalAi = (() => {
  const has = name => typeof globalThis[name]?.create === "function" && typeof globalThis[name]?.availability === "function";
  const KINDS = {
    "ai-summarize": { label: "🧠 Tóm tắt (AI trên máy)", apis: ["Summarizer", "LanguageModel"] },
    "ai-explain": { label: "🧠 Giải thích code / regex / log (AI trên máy)", apis: ["LanguageModel"] },
    "ai-proofread": { label: "🧠 Sửa câu English (AI trên máy)", apis: ["Proofreader", "Rewriter", "LanguageModel"] },
  };
  const can = op => !!KINDS[op]?.apis.some(has);
  const any = () => Object.keys(KINDS).some(can);
  const REQ = "Cần Chrome / Edge ≥ 138 trên Windows 10/11, macOS 13+, Linux hoặc Chromebook Plus; GPU > 4 GB VRAM hoặc CPU 16 GB RAM, 4 nhân; ổ đĩa trống ≥ 22 GB; lần đầu Chrome tải model (mạng không đo lưu lượng). Không có trên điện thoại.";
  function reason() {
    const list = ["Summarizer", "LanguageModel", "Proofreader", "Rewriter"].filter(has);
    return list.length ? T("Trình duyệt có: {list}. Model chạy trên máy, dữ liệu không rời máy.", { list: list.join(", ") }) : T("Trình duyệt này không có API AI trên máy — các mục 🧠 bị ẩn.");
  }

  // Editor right-click rows (selection): one submenu beside 🤖 Hỏi AI; runSel(op) turns the selection into a temp tab and runs op on it.
  function entries(x, y, runSel) {
    const ops = Object.keys(KINDS).filter(can);
    if (!ops.length) return [];
    return [TabMenu.entry(T("🧠 AI trên máy…"), "", () => TabMenu.show([Object.assign(document.createElement("div"), { className: "menu-head", textContent: T("AI trên máy (không gửi dữ liệu đi)") }),
      ...ops.map(op => TabMenu.entry(T(KINDS[op].label).replace(/ \(.*\)$/, ""), "", () => runSel(op)))], x, y))];
  }

  Settings.add({ id: "localAi", group: "preview", type: "info", label: "AI trên máy (Chrome built-in)", hint: REQ, get: reason });
  return { KINDS, can, any, entries, reason, REQ };
})();

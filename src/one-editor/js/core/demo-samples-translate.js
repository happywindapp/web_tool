// Phase 7 demos (translate, read aloud, dictionary) added to DEMOS; content is fake — English, except the Vietnamese source of translate-vi-en.
(() => {
  const t = (n, text) => ({ n, l: "", t: text }), F = "```";
  const EN = `# Release notes — Order service 2.4

The order service now checks the risk limit before an order is stored.
If the limit is exceeded, the order is rejected and the client sees a clear message.

## What changed
- Faster order search on the history page.
- The daily report is sent at 6 PM instead of 8 PM.
- [ ] The mobile app update is still in review.

${F}js
// code blocks are not translated
const fee = Math.round(qty * price * 0.0015);
${F}

> Please test with the business date of the next trading session.
`;
  const VI = `Ghi chú họp nhóm — tuần 47

Hệ thống đặt lệnh mới đã chạy ổn định trên môi trường kiểm thử.
Chúng ta cần hoàn thành báo cáo hiệu năng trước thứ Sáu.

Việc cần làm:
- Kiểm tra lại phí giao dịch cho kênh di động.
- Cập nhật tài liệu hướng dẫn cho khách hàng mới.
- Chuẩn bị kế hoạch triển khai và phương án quay lui.
`;
  // The demo fixes its language pair (a target remembered from earlier use would change the result), then translates.
  // phrases: highlighted first (one range each, like holding Ctrl while dragging), so the look-up cards follow them.
  const translate = (name, to, dict, phrases) => async () => {
    const src = Views.tabsOf(0).map(Docs.get).filter(d => d && d.kind === "temp" && d.name === name).pop();
    if (!src) return;
    const view = Views.activeView(0), text = view && view.state.doc.toString(), { EditorSelection } = CM.state;
    if (phrases && text) view.dispatch({ selection: EditorSelection.create(phrases.map(p => [text.indexOf(p), p.length]).filter(([at]) => at >= 0).map(([at, n]) => EditorSelection.range(at, at + n))) });
    Object.assign(Translate.of(src.id), { from: "auto", to });
    if (!await OutputLink.run(src, "translate") || !dict) return;
    const out = Docs.list().find(d => d.kind === "output" && d.link?.src === src.id && d.link.op === "translate");
    PreviewPane.viewOf(out?.id)?.lookup?.();
  };
  const one = (name, text) => () => ({ v: 1, views: [[t(name, text)], []] });

  Object.assign(DEMOS, {
    "translate-en-vi": { label: "Dịch: Anh → Việt (Markdown, giữ code)", payload: one("release-notes.md", EN), after: translate("release-notes.md", "vi") },
    "translate-vi-en": { label: "Dịch: Việt → Anh", payload: one("team-notes-vi.txt", VI), after: translate("team-notes-vi.txt", "en") },
    "dictionary-selection": { label: "Từ điển: tô đen nhiều từ (gửi các từ mẫu tới dictionaryapi.dev + Tatoeba)", payload: one("release-notes.md", EN),
      after: translate("release-notes.md", "vi", true, ["checks the risk limit", "clear message"]) },
    "translate-web-page": { label: "Dịch trang web: dán link (gửi URL mẫu tới r.jina.ai)", payload: one("web-page-link.txt", "https://www.w3.org/Provider/Style/URI\n"), after: translate("web-page-link.txt", "vi") },
    "dictionary-word": { label: "Từ điển: 1 từ tiếng Anh (gửi từ tới dictionaryapi.dev)", payload: one("word.txt", "serendipity\n"), after: translate("word.txt", "vi", true) },
  });
})();

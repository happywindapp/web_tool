# Phase 7 — Dịch · đọc to · từ điển (kiểu Google Translate)

## Context Links
- [plan.md](plan.md) · ADR #22 · Chrome built-in AI: `Translator`, `LanguageDetector` · Web Speech API `speechSynthesis` · MyMemory API · dictionaryapi.dev

## Overview
- Priority: P2 · Status: ⬜ · Cỡ: M
- Nhập văn bản ở view này ⇒ bấm **Dịch** ⇒ tab output liên kết ở view kia: bản dịch, nút 🔊 đọc nguồn + bản dịch, từ điển + phiên âm khi là 1 từ/cụm ngắn.

## Key Insights
- Translator API chạy trên máy (Chrome/Edge desktop, cần tải model lần đầu, phải có thao tác người dùng) ⇒ không gửi văn bản ra ngoài — khớp cam kết riêng tư ADR #2.
- MyMemory nhận văn bản qua query string (`/get?q=…&langpair=en|vi`), ~500 byte/request, ~5.000 ký tự/ngày ẩn danh ⇒ chia đoạn, báo quota, **hỏi trước khi gửi**, ghi rõ "văn bản được gửi tới MyMemory".
- `speechSynthesis` offline, giọng theo máy (Windows có `vi-VN` "An"); không có giọng ⇒ ẩn nút 🔊 cho ngôn ngữ đó.
- dictionaryapi.dev chỉ tiếng Anh: IPA, loại từ, nghĩa, ví dụ, audio phát âm.

## Requirements
- Thanh dịch trên tab output: ngôn ngữ nguồn (Tự nhận diện) ⇆ ngôn ngữ đích (mặc định VI↔EN theo nhận diện), nút đổi chiều, nguồn đang dùng (Trên máy / MyMemory).
- Dịch lại khi bấm hoặc tuỳ chọn "dịch khi gõ" (debounce, chỉ với on-device).
- 🔊 đọc toàn bộ / đọc phần chọn; tốc độ; dừng.
- Từ điển: khi nguồn là 1 từ hoặc cụm ≤ 3 từ tiếng Anh ⇒ IPA (UK/US), audio, nghĩa theo loại từ, ví dụ, từ đồng nghĩa.
- Văn bản dài: dịch theo đoạn, giữ xuống dòng; code block Markdown không dịch.
- Lỗi/quota/mất mạng ⇒ báo rõ, giữ nguyên nguồn.
- Demo: `translate-en-vi`, `translate-vi-en`, `dictionary-word`.

## Architecture
```
js/translate/ translate-provider-on-device.js, translate-provider-mymemory.js, language-detect-text.js,
              text-chunker-for-translation.js (thuần), dictionary-english-lookup.js, speech-read-aloud.js, translate-output-view.js
```

## Implementation Steps
1. Spike nhỏ: kiểm `Translator.availability` cặp en↔vi trên Chrome/Edge hiện tại.
2. Provider on-device + phát hiện ngôn ngữ; fallback hỏi rồi MyMemory.
3. Chunker (test node), output view, đổi chiều.
4. Đọc to, từ điển.
5. Demo + VI/EN + mobile.

## Todo List
- [ ] Spike Translator API en↔vi
- [ ] On-device + MyMemory fallback (hỏi trước)
- [ ] Chunker + test
- [ ] Output view + 🔊 + từ điển
- [ ] Demo + VI/EN + mobile

## Success Criteria
- Chrome desktop: dịch EN↔VI không có request mạng nào (kiểm DevTools); trình duyệt khác: chỉ gửi sau khi user đồng ý.

## Risk Assessment
- Translator API đổi/không có trên Edge ⇒ phát hiện tính năng, không phát hiện trình duyệt.
- MyMemory chất lượng thấp/quota ⇒ báo rõ nguồn + giới hạn.

## Security Considerations
- CSP `connect-src https://api.mymemory.translated.net https://api.dictionaryapi.dev`; `media-src` cho audio từ điển (đo domain thật).
- Không gửi gì khi chưa bấm; đồng ý gửi MyMemory chỉ nhớ trong phiên.

## Next Steps
- Phase 6.

# AI Memory

> Nơi AI ghi lại **bài học** để lần sau không lặp lại sai lầm.
> Khác với memory global riêng từng AI tool (`~/.claude/projects/.../memory/` với Claude Code) — xem
> `docs/glossary.md` mục "Memory" để phân biệt 2 hệ. File ở ĐÂY là bản chung, git-tracked,
> mọi AI tool + người đều đọc được — không phải bản thay thế cho memory global.

## Cách dùng

- Mỗi bài học = 1 file `.md` ngắn, tên kebab-case mô tả vấn đề.
  Ví dụ: `build-error-lib-x-version-mismatch.md`, `gotcha-grpc-timeout-default.md`.
- Nội dung gợi ý: **Triệu chứng → Nguyên nhân → Cách xử lý đúng**.
- Chỉ ghi điều DURABLE (lặp lại nhiều lần, dễ quên). Bỏ qua noise debug tạm thời.
- **Nếu bạn (AI) vừa ghi 1 finding vào memory global của riêng mình, quay lại đây và tự hỏi: "cái này có
  cần AI tool khác / người khác biết không?"** — nếu có, ghi thêm 1 file ở đây trong CÙNG lượt, đừng đợi
  user phải hỏi lại.

## Mục lục

- [sed-case-conversion-corrupts-vietnamese-utf8.md](sed-case-conversion-corrupts-vietnamese-utf8.md) —
  sed `\L`/`\U` phá chữ có dấu (byte rác `�`); đổi hoa/thường bằng Edit tool hoặc node.
- [date-input-follows-browser-locale-use-dd-mm-yyyy-text.md](date-input-follows-browser-locale-use-dd-mm-yyyy-text.md) — `<input type=date>` gõ tay theo locale (en-US = mm/dd) ⇒ dùng ô chữ dd/mm/yyyy + 📅 chọn + dòng xem trước.
- [browser-js-parse-cost-and-syntax-check-cost-measured.md](browser-js-parse-cost-and-syntax-check-cost-measured.md) — số đo parse JS 1–10 MB (~90 ms/MB ở CPU 4×; chi phí chính là tải mạng + RAM) và chi phí kiểm cú pháp theo ngôn ngữ (Lezer có sẵn 0 KB, tree-sitter cpp 4,5 MB).
- [iframe-srcdoc-inherits-parent-csp-use-separate-sandbox-file.md](iframe-srcdoc-inherits-parent-csp-use-separate-sandbox-file.md) — `srcdoc` kế thừa CSP cha (eval bị chặn) ⇒ engine cần eval chạy trong file HTML riêng + `iframe sandbox="allow-scripts"`; `file://` sandbox không nạp được script local.

- [bilingual-technique-names-in-explanations.md](bilingual-technique-names-in-explanations.md) —
  **bắt buộc mọi AI khi giải thích:** kỹ thuật/pattern/khái niệm quan trọng ghi song ngữ `English term (thuật ngữ tiếng Việt)`; chỉ thuật ngữ then chốt, lần đầu nhắc. Bản Claude: `~/.claude/CLAUDE.md`

- [code-quality-gates-self-review-checklist-design-forks.md](code-quality-gates-self-review-checklist-design-forks.md) —
  **bắt buộc mọi AI, mọi task code:** self-review diff theo checklist trước khi báo "xong"; checklist backend/API
  (scale/paging DB, che lỗi, không trả entity, tên = cột domain, Validate() ở request DTO + guard nil ở usecase, tách DDL/backfill, index);
  ngã rẽ thiết kế ⇒ hỏi user; review PR theo mục D. Bản Claude: `~/.claude/rules/code-quality-gates.md`

- [new-tool-must-support-vi-en-i18n.md](new-tool-must-support-vi-en-i18n.md) —
  **bắt buộc mọi AI khi thêm/sửa tool:** song ngữ English + Tiếng Việt (nút `VI | EN`, module `I18n`, từ điển English, dịch card index);
  checklist ở `docs/architecture/README.md` mục 3.

- [new-tool-must-ship-quick-test-sample-data.md](new-tool-must-ship-quick-test-sample-data.md) —
  **bắt buộc mọi AI khi thêm/sửa tool:** dropdown `Thử mẫu…` + `?demo=<key>`, mẫu hợp lệ + mẫu lỗi, dữ liệu giả;
  checklist ở `docs/architecture/README.md` mục 3.

- [new-tool-must-have-share-link-button.md](new-tool-must-have-share-link-button.md) —
  **bắt buộc mọi AI khi thêm/sửa tool:** nút `🔗 Chia sẻ link`, link `#pako:` (dữ liệu chỉ ở hash), mở link là nạp + chạy, đọc `?data=`,
  không mất bài đang sửa; checklist ở `docs/architecture/README.md` mục 3.

- [new-tool-must-use-two-tier-header-toolbar-colors.md](new-tool-must-use-two-tier-header-toolbar-colors.md) —
  **bắt buộc mọi AI khi thêm/sửa tool:** header teal `#164e63` cho việc cấp ứng dụng + tab, toolbar tint accent 10% cho việc trên dữ liệu; dùng file CSS chung hoặc chép rule; checklist ở `docs/architecture/README.md` mục 3.

- [new-tool-must-work-on-desktop-and-mobile.md](new-tool-must-work-on-desktop-and-mobile.md) —
  **bắt buộc mọi AI khi thêm/sửa tool:** dùng tốt cả Desktop và Mobile (4 dải kích thước, thao tác chuột/phím/chạm ngang nhau, kiểm ma trận); bẫy đo `innerWidth`, pane co về 0 ở 641–900, rule màn thấp thiếu `pointer:coarse`.

- [scaffold-robocopy-copies-skill-junctions.md](scaffold-robocopy-copies-skill-junctions.md) — robocopy cần `/XJ` khi copy template

- [study-quiz-cards-go-in-study-html-not-index.md](study-quiz-cards-go-in-study-html-not-index.md) — bài thi ở `study/`, card vào `study.html` không vào `index.html`; dựng đề mới theo playbook `docs/study/README.md` + validator `scripts/validate-study-quiz-bank.js`.
- [headless-test-isolated-browser-context-indexeddb.md](headless-test-isolated-browser-context-indexeddb.md) — headless kiểm tool có hot exit IndexedDB: mỗi trang `createBrowserContext()` riêng.
- [headless-cdp-injected-script-skips-eval-csp.md](headless-cdp-injected-script-skips-eval-csp.md) — kiểm CSP chặn eval bằng `setTimeout("chuỗi")`, không bằng `<script>` chèn từ `page.evaluate` (CDP được miễn).
- [headless-user-activation-always-active-mock-getter.md](headless-user-activation-always-active-mock-getter.md) — puppeteer `goto` ⇒ `userActivation.isActive` luôn `true`; giả lập getter để kiểm luồng "chưa bấm" (Translator tải gói…).
- [headless-drag-drop-synthetic-events-and-cdp-interception.md](headless-drag-drop-synthetic-events-and-cdp-interception.md) — kéo-thả giả: kiểm `defaultPrevented` + kết quả đĩa (dropEffect đọc ra none); drag interception phải `mouse.drop` để đóng phiên kéo; `tar.exe` Windows không đọc tên có dấu.
- [one-editor-size-budget-lazy-bundles-vendor-rebuild.md](one-editor-size-budget-lazy-bundles-vendor-rebuild.md) — budget từ 2026-11-22: file chính + mỗi file phụ ≤ 9,9 MB, tối đa 3 file phụ/tool (vendor + sandbox không tính), CPU 4× ~2 s chỉ cảnh báo; tính năng ít dùng vào bundle `*.template.js` nạp lười + `node --check`; script vendor build lại core ⇒ `git checkout` core/languages khi chỉ thêm gói.
- [web-page-translate-no-iframe-use-jina-reader.md](web-page-translate-no-iframe-use-jina-reader.md) — dịch trang web client-side: translate.goog / Yandex chặn iframe, proxy CORS hỏng ⇒ Jina Reader `r.jina.ai` (JSON, CORS cả `file://`, `X-Target-Selector` lấy bài viết); không thêm `img-src https:` — SVG link chia sẻ lọt sanitizer.
- [one-editor-pane-sync-source-without-scrolling-phone-carousel.md](one-editor-pane-sync-source-without-scrolling-phone-carousel.md) — pane dời con trỏ tab nguồn: dispatch `selection` + `scrollDOM.scrollTop`, không `focus` / `scrollIntoView` (kéo carousel ≤640px về View 1).
- [sandboxed-iframe-same-process-endless-loop-freezes-page.md](sandboxed-iframe-same-process-endless-loop-freezes-page.md) — iframe sandbox (srcdoc, `file://`) chạy cùng process trang chính ⇒ `while(true)` treo cả trang: JS chạy Worker + `terminate()`, HTML cần loop guard chèn vào điều kiện vòng lặp (không thêm xuống dòng).
- [headless-test-file-system-access-with-opfs-handles.md](headless-test-file-system-access-with-opfs-handles.md) — test file/folder local headless: OPFS handle thay picker, phải serve http (OPFS chặn `file://`), `isolateHistory` cho bước undo riêng.
- [headless-test-ui-locale-en-and-mobile-viewport-reload.md](headless-test-ui-locale-en-and-mobile-viewport-reload.md) — headless mở UI English ⇒ `I18n.set("vi")` sau boot; đổi `isMobile` giữa chừng làm reload trang ⇒ test mobile ở trang riêng.
- [css-grid-auto-row-collapses-overflow-hidden-pane.md](css-grid-auto-row-collapses-overflow-hidden-pane.md) — pane `overflow:hidden` trong track grid `auto` bị bóp còn viền khi container hết chỗ (One Editor Explorer 641–900 px) ⇒ thêm `min-height`; test đo chiều cao thật.
- [isomorphic-git-in-browser-needs-buffer-and-index-stat-reuse.md](isomorphic-git-in-browser-needs-buffer-and-index-stat-reuse.md) — isomorphic-git UMD cần `Buffer` (truyền polyfill làm tham số, không `window.Buffer`); trình duyệt chỉ có mtime ms ⇒ dùng lại stat của index khi size + mtime khớp, `refresh: false` để không ghi `.git/index`; pack > 300 MB thì bỏ.
- [one-editor-area-shortcuts-need-window-capture.md](one-editor-area-shortcuts-need-window-capture.md) — phím tắt riêng 1 vùng (F2 trong Explorer) bị `Commands.onKey` ở document capture nuốt ⇒ nghe ở `window` capture; kiểm ZIP bằng `Expand-Archive`, không `tar.exe`.
- [one-editor-non-text-view-as-own-tab-kind.md](one-editor-non-text-view-as-own-tab-kind.md) — nội dung không phải text (danh sách folder…) ⇒ `kind` tab riêng + `mount` từ `Views.refresh`, coi là pane, loại khỏi hot exit / snapshot / reopen / share; không overlay lên tab file.
- [chrome-directory-handle-has-no-move.md](chrome-directory-handle-has-no-move.md) — Chrome chưa có `move()` cho folder handle ⇒ đổi tên folder trên đĩa báo chưa hỗ trợ; test OPFS dùng chuyển folder (`copyTo` cut), `rename` + prompt mới có hoàn tác.
- [powershell-launcher-untrusted-path-traps-ps51.md](powershell-launcher-untrusted-path-traps-ps51.md) — launcher PS 5.1 nhận path từ web: `-WorkingDirectory` wildcard `[ ]`, `GetFullPath` trước khi kiểm, chặn UNC/ADS/`"`, dry-run không phủ `Start-Process`.
- [sophos-lockdown-kills-browser-launching-powershell.md](sophos-lockdown-kills-browser-launching-powershell.md) — trình duyệt gọi protocol có handler PowerShell ⇒ Sophos Lockdown đóng trình duyệt; kiểm `HitmanPro.Alert` event 911.
- [one-editor-tab-drop-handled-by-filedrop-capture.md](one-editor-tab-drop-handled-by-filedrop-capture.md) — drop tab editor / file OS bị `FileDrop` (và dòng Explorer bị `ExplorerDnd`) bắt ở document capture ⇒ vùng thả mới phải hook vào 2 module đó, không gắn listener riêng.
- [ai-chat-site-prefill-query-param-plus-clipboard.md](ai-chat-site-prefill-query-param-plus-clipboard.md) — `?q=` điền sẵn câu hỏi AI không chính thức, Gemini không có ⇒ chép clipboard trước rồi mới mở tab; test map domain AI về 127.0.0.1.
- [codemirror-line-decoration-follows-line-content.md](codemirror-line-decoration-follows-line-content.md) — bookmark `Decoration.line`: chèn ở đầu dòng ⇒ `mapPos(pos, 1)` để theo nội dung; thay cả text giữ số dòng; `doc.marks` + `marksLive`, chụp marks trước khi reset `state`.
- [one-editor-boot-time-text-shaping-and-inline-compile.md](one-editor-boot-time-text-shaping-and-inline-compile.md) — khởi động chậm ở CPU 4×: text shaping emoji (font fallback) ~1 s + compile script inline 1,15 MB; khai báo "Segoe UI Emoji" không giúp.
- [boot-trace-and-self-review-once-per-phase.md](boot-trace-and-self-review-once-per-phase.md) — đo boot CPU 4× + agent self-review chỉ 1 lần ở đợt cuối phase, không từng đợt con

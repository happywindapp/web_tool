# Dev toolchain — build tool mới từ URL / tài liệu

> Cài đặt 2026-10-27 trên máy dev (Windows, per-user, dưới `C:\_devtools\`).
> Toolchain chỉ dùng **lúc phát triển** để AI hiểu nguồn tham khảo; tool xuất ra vẫn là 1 file HTML tự chứa, không gọi mạng.

## Quy trình

```text
Input của user ─┬─ URL web tool tham khảo ──► Chrome CDP + REA (cấu trúc trang, script, route, screenshot)
                └─ Tài liệu .docx/.xlsx/.pdf/.pptx ──► skill office-extract (text) + ai-multimodal (ảnh/sơ đồ)
                                     ▼
                   AI viết tools/<viec-lam>.html  (+ card index.html, bảng README, docs/tools/<x>.md)
                                     ▼
                   Mở trình duyệt kiểm tra (?demo=...) · skill chrome-devtools để chụp/so sánh
```

## Đã cài

| Thành phần | Vị trí | Dùng cho |
|------------|--------|----------|
| Node.js 24.22.1 (song song) | `C:\_devtools\nodejs-24.22.1` | Chỉ để chạy REA (yêu cầu `^24.22.1`). **PATH vẫn là** `C:\_devtools\nodejs` 24.14.1 |
| REA `rea-agents` 6.8.0 | `C:\_devtools\rea` | MCP server `rea` + CLI: phân tích web bundle, export script, chụp màn hình, so sánh capture |
| MCP `rea` | `~/.claude.json`, **local scope** của `C:\_web_tool` | Chỉ bật trong project này, không commit |
| `python-pptx` 1.0.2 | Python 3.13 | Skill `office-extract` đọc `.pptx` |
| Chrome (có sẵn) | Program Files | Browser cho REA qua CDP |

## Phân tích 1 URL tham khảo

```powershell
.\scripts\start-chrome-cdp-for-rea.ps1 -Url https://example.com/tool   # -Headed để thấy cửa sổ
# Trong Claude Code: MCP rea → list_browser_targets(http://127.0.0.1:9333)
#   → analyze_web_bundle / export_web_scripts / capture_web_screenshot
.\scripts\start-chrome-cdp-for-rea.ps1 -Stop
```

CLI tương đương (khi không dùng MCP):

```powershell
$rea = "C:\_devtools\nodejs-24.22.1\node.exe", "C:\_devtools\rea\node_modules\rea-agents\scripts\rea.mjs"
& $rea[0] $rea[1] list-browser-targets http://127.0.0.1:9333
& $rea[0] $rea[1] analyze-web-bundle http://127.0.0.1:9333 <targetId> --observation-ms 3000 --format json > out.json
& $rea[0] $rea[1] doctor
```

Không dùng shim `C:\_devtools\rea\rea.cmd`: nó gọi `node` trên PATH (24.14.1, không đạt yêu cầu engine).

## Đã review nhưng KHÔNG cài

| Tool | Lý do |
|------|-------|
| Ghidra | Decompile binary native (exe/dll/so); tool của project là HTML/JS → không liên quan. Cần thêm JDK 21 + ~1 GB |
| IDA Pro | Như Ghidra, thêm license thương mại trả phí |
| Hopper | Chỉ chạy macOS/Linux, không có bản Windows |
| JADX | Decompile APK Android; chỉ cần khi nguồn tham khảo là app Android. Cài khi có nhu cầu: JDK 21 + JADX dưới `C:\_devtools\`, rồi đặt `REA_JADX_MCP_JAR` |
| leanrea (skill) | Thay thế nhẹ cho REA nhưng không có workflow cho website/JS; nguồn cài không thống nhất (`aicodeking/leanrea` vs `a16z/lean-rea`), dự án mới 1 contributor |
| `rea setup` | Ghi MCP + skill vào config **toàn cục** của mọi agent (Claude, Codex, Gemini, Copilot…) → thay bằng đăng ký local scope cho riêng project |
| `frida` install script | REA bỏ qua khi cài; chỉ dùng cho dynamic instrumentation tiến trình native |

## Lưu ý

- Chỉ phân tích để hiểu hành vi/thuật toán rồi **viết lại**; không chép nguyên code/asset của site khác (bản quyền).
- Script dùng profile Chrome tạm (`%TEMP%\web_tool-rea-chrome-profile`), CDP chỉ nghe loopback — không đụng cookie/session thật.
- Nâng Node trên PATH lên ≥ 24.22.1 (khi đóng hết VS Code/agent đang dùng node) thì có thể bỏ bản song song và trỏ MCP về node chính.

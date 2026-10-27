# Rule: Clean code (always-on)

- **YAGNI · KISS · DRY.** Diff hẹp, chỉ đụng dòng cần cho task. Không drive-by reformat.
- **Comment tối thiểu:** mặc định KHÔNG comment; khi cần chỉ 1 dòng giải thích WHY (không restate code).
- Giữ file < ~200 dòng; tách module theo concern.
- Check module/skill đã có trước khi tạo mới. Sửa file hiện hữu thay vì tạo `*-enhanced`/`*-v2`.
- **Naming:** file kebab-case mô tả rõ mục đích. Code theo ngôn ngữ: Go/Rust → snake_case; C#/Java → PascalCase; JS/TS/Python/shell → kebab-case.

# Diagrams — web_tool

Lưu **cả file gốc** (mermaid / draw.io) **lẫn ảnh export** để AI đọc được. Ưu tiên mermaid.

## Luồng xử lý tab Format của `data-workbench.html` (trước là `format-json-xml-html.html`)

```mermaid
flowchart LR
    IN["Input<br/>dán · mở file · kéo-thả · ?demo="] --> DET{"detect()<br/>đuôi file → ký tự đầu"}
    DET -->|JSON| JC["JsonTool.check<br/>JSON.parse"]
    DET -->|XML| XC["MarkupTool.checkXml<br/>DOMParser"]
    DET -->|HTML| HC["MarkupTool.build(html)<br/>đếm fixes"]
    JC & XC & HC --> ST["Footer: trạng thái + lỗi<br/>gutter đỏ · bấm → nhảy dòng"]

    BTN["Format & sửa lỗi / Thu gọn"] --> JP["JsonTool.parse → AST + fixes"]
    BTN --> MB["MarkupTool.build → tree + fixes"]
    JP --> JS["stringify"]
    MB --> SE["serialize / minify"]
    JS & SE --> OUT["#out highlight · #tree cây<br/>Sao chép · Tải về · ← Dùng kết quả"]
```

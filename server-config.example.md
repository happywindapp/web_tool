# Server Config (EXAMPLE)

> Copy file này thành `server-config.md` (đã gitignore) nếu sau này cần giá trị thật.
> TUYỆT ĐỐI KHÔNG commit `server-config.md`.
>
> `web_tool` **không có biến môi trường, server hay credential** — mọi tool chạy client-side. Khối sinh tự
> động `gen:env` của template đã gỡ vì không có gì để sinh.

## Notes

- Nếu sau này thêm host tĩnh (GitHub Pages/nội bộ) cần token deploy → ghi TÊN biến ở đây, giá trị ở `server-config.md`.
- Không hardcode credentials vào code/docs.

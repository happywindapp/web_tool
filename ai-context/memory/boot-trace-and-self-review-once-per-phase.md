# Đo boot CPU 4× + self-review: 1 lần mỗi phase, không từng đợt con

- **Triệu chứng:** phase chia nhiều đợt (vd One Editor 14a…14h), mỗi đợt đều chạy `cpu4-boot-trace.mjs` (~10–15 phút máy rảnh) và 2 agent review (`code-reviewer` + `silent-failure-hunter`) ⇒ tốn token / thời gian gần bằng phần code.
- **Nguyên nhân:** luật "self-review trước khi báo xong" bị áp ở mức đợt con thay vì mức phase.
- **Cách đúng (user chốt 2026-11-25):** mỗi đợt con chỉ build `-Check` + node test + headless của đợt + hồi quy headless các đợt trước, giữ baseline `headless/scratch/one-editor-pre<đợt>.html`. Đợt cuối phase: đo boot 1 lần so baseline trước phase + self-review 1 lần trên toàn bộ diff → sửa → chạy lại test/headless mọi đợt.

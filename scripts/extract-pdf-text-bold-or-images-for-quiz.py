# Trích PDF làm nguồn đề thi: text kèm **in đậm** (file đáp án in đậm) hoặc --images <dir> xuất ảnh từng trang (PDF scan) để AI đọc.
import os
import sys

from pypdf import PdfReader


def text_with_bold(reader):
    out = []
    for page in reader.pages:
        def visit(text, cm, tm, font, size):
            if not text:
                return
            bold = "Bold" in str((font or {}).get("/BaseFont", ""))
            out.append(f"**{text}**" if bold and text.strip() else text)
        page.extract_text(visitor_text=visit)
        out.append("\n")
    return "".join(out).replace("****", "")


def dump_images(reader, out_dir):
    os.makedirs(out_dir, exist_ok=True)
    for i, page in enumerate(reader.pages, 1):
        for j, im in enumerate(page.images):
            ext = os.path.splitext(im.name)[1] or ".png"
            with open(os.path.join(out_dir, f"p{i:02d}_{j}{ext}"), "wb") as f:
                f.write(im.data)
    print(f"{len(reader.pages)} trang → {out_dir}")


if __name__ == "__main__":
    if len(sys.argv) < 2:
        sys.exit("Usage: python -I extract-pdf-text-bold-or-images-for-quiz.py <file.pdf> [--images <out_dir>]")
    reader = PdfReader(sys.argv[1])
    if len(sys.argv) >= 4 and sys.argv[2] == "--images":
        dump_images(reader, sys.argv[3])
    else:
        sys.stdout.reconfigure(encoding="utf-8")
        print(text_with_bold(reader))

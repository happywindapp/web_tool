// "explorer-folder" / "explorer-display" / "explorer-commander" / "explorer-search" / "explorer-file-ops" demos: a fake sample project held in memory (read-only, like a folder picked with <input webkitdirectory>) — or written to the page's private OPFS when served over http(s), so file operations work — opened in the Explorer and the folder tabs; F5 keeps the folder saved before.
(() => {
  // base: "now" of the fake dates; extra: more [path, body, age in days, type] rows. → File list with webkitRelativePath "sample-project/…".
  function sampleFiles(base, extra = []) {
    const day = 864e5;
    const PNG = Uint8Array.from(atob("iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAIAAABLbSncAAAAG0lEQVR4nGPgK5kg5peMSTJgFeUrmcAwKHUAAADBOyGX+x6rAAAAAElFTkSuQmCC"), c => c.charCodeAt(0));
    const BIN = Uint8Array.from({ length: 96 }, (_, i) => (i * 37) % 256);
    return [
      ["README.md", "# Sample Project\n\nA fake order-book service used to try the **One Editor** folder tab.\n\n- Select several files with `Ctrl+click` or `Shift+click`\n- Filter with `Ctrl+F`, e.g. `*.md;*.csv`\n- Type `rea` to jump to this file\n\n```js\nconst fee = qty * price * 0.0015;\n```\n", 1],
      ["package.json", '{\n  "name": "sample-order-book",\n  "version": "1.4.2",\n  "scripts": { "test": "node --test" }\n}\n', 3],
      [".gitignore", "node_modules/\ndist/\n*.log\n", 9],
      ["src/app.js", "import { orderValue } from \"./orders/order-book.js\";\n\nconsole.log(orderValue({ qty: 100, price: 25.5 }));\n", 0],
      ["src/orders/order-book.js", "export const orderValue = o => o.qty * o.price;\nexport const side = o => (o.qty < 0 ? \"SELL\" : \"BUY\");\n", 2],
      ["src/orders/fees/fee-rules.json", '{ "rate": 0.0015, "min": 1, "currency": "USD" }\n', 4],
      ["src/orders/fees/archive/2025/q4/fee-rules-2025-q4.csv", "month,rate,min\n2025-10,0.0016,1\n2025-11,0.0016,1\n2025-12,0.0015,1\n", 40],
      ["docs/guide.md", "## Guide\n\n1. Open a folder\n2. Press `Alt+P` for the preview pane\n3. Delete goes to the recycle bin on real folders\n\n| Key | Action |\n|---|---|\n| Ctrl+A | select all |\n| F2 | rename |\n", 5],
      ["docs/architecture.svg", '<svg xmlns="http://www.w3.org/2000/svg" width="240" height="120"><rect x="10" y="30" width="90" height="60" rx="8" fill="#164e63"/><rect x="140" y="30" width="90" height="60" rx="8" fill="#0e7490"/><path d="M100 60h40" stroke="#334155" stroke-width="3"/><text x="55" y="65" fill="#fff" font-size="13" text-anchor="middle">API</text><text x="185" y="65" fill="#fff" font-size="13" text-anchor="middle">Orders</text></svg>\n', 6, "image/svg+xml"],
      ["assets/logo.png", PNG, 12, "image/png"],
      ["data/trades.csv", "id,symbol,qty,price\n1,ACME,100,25.5\n2,GLOBEX,-50,12.25\n3,INITECH,300,7.8\n", 1],
      ["data/notes.txt", "Remember to reconcile trades before 16:00.\n", 7],
      ["logs/app-2026-11-20.log", "2026-11-20 09:00:01 INFO order-gateway started\n2026-11-20 09:00:03 WARN slow quote feed (850 ms)\n2026-11-20 09:00:05 ERROR order ORD-1002 rejected: risk limit\n", 0],
      ["styles/site.css", "body { font-family: system-ui; color: #0f172a; }\n.board { display: grid; gap: 8px; }\n", 8],
      ["bin/tool.bin", BIN, 20, "application/octet-stream"],
      ...extra,
    ].map(([path, body, age, type = "text/plain"]) => {
      const f = new File([body], path.split("/").at(-1), { type, lastModified: base - age * day });
      Object.defineProperty(f, "webkitRelativePath", { value: "sample-project/" + path });
      return f;
    });
  }
  function sampleProject(base, extra = []) {
    const root = LocalFs.fromFileList(sampleFiles(base, extra));
    Explorer.setRoot(root, true);
    return root;
  }
  const svg = (w, h, fill, text) => `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><rect width="${w}" height="${h}" rx="12" fill="${fill}"/><text x="${w / 2}" y="${h / 2 + 6}" fill="#fff" font-size="18" font-family="sans-serif" text-anchor="middle">${text}</text></svg>`;
  const done = label => StatusBar.msg(T("Đã nạp mẫu “{name}”.", { name: T(label) }), "good");
  // A fresh writable copy in the origin private file system (not on file://); null when the browser has none.
  async function opfsProject(files) {
    if (location.protocol === "file:" || !navigator.storage?.getDirectory) return null;
    try {
      const top = await (await navigator.storage.getDirectory()).getDirectoryHandle("one-editor-demo", { create: true });
      await top.removeEntry("sample-project", { recursive: true }).catch(() => {});
      const root = await top.getDirectoryHandle("sample-project", { create: true });
      for (const f of files) {
        const parts = f.webkitRelativePath.split("/").slice(1);
        let d = root;
        for (const p of parts.slice(0, -1)) d = await d.getDirectoryHandle(p, { create: true });
        const w = await (await d.getFileHandle(parts.at(-1), { create: true })).createWritable();
        await w.write(f);
        await w.close();
      }
      return LocalFs.fromHandle(root);
    } catch { return null; }
  }

  // Phase 11e: logs for the advanced search, a "duplicates" folder (3 identical pairs, 1 same-size pair, 2 empty files) and two deploy folders to compare.
  function searchExtra() {
    const NL = String.fromCharCode(10), text = (...lines) => lines.join(NL) + NL;
    const log = (n, word) => text(...Array.from({ length: n }, (_, i) => `2026-11-21 10:${String(i % 60).padStart(2, "0")}:00 ${i % 9 ? "INFO" : word} request ${1000 + i} handled`));
    const invoice = text("id,customer,amount", "1,Contoso,120.50", "2,Fabrikam,88.00", "3,Northwind,42.75"), yaml = text("service: order-book", "port: 8080", "retries: 3");
    const photo = text("Photo shoot notes: north gate, 9 AM, bring tripod."), app = text('export const start = () => console.log("order-book up");');
    const logo = text('<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64"><circle cx="32" cy="32" r="28" fill="#0e7490"/></svg>');
    return [
      ["logs/app-2026-11-21.log", log(40, "ERROR"), 1], ["logs/app-2026-11-10.log", log(40, "ERROR"), 13], ["logs/access.log", log(40, "WARN"), 2], ["logs/debug.log", text("2026-11-22 08:00:00 ERROR tiny debug log"), 0.5],
      ["duplicates/invoice-2026-10.csv", invoice, 30], ["duplicates/archive/invoice-2026-10 (copy).csv", invoice, 3],
      ["duplicates/photo-notes.txt", photo, 5], ["duplicates/archive/photo-notes.txt", photo, 50],
      ["duplicates/config.yaml", yaml, 4], ["duplicates/archive/config.backup.yaml", yaml, 9],
      ["duplicates/prices-a.csv", text("symbol,price", "ACME,25.5"), 2], ["duplicates/prices-b.csv", text("symbol,price", "ACME,26.5"), 2],
      ["duplicates/empty-1.txt", "", 1], ["duplicates/archive/empty-2.txt", "", 1],
      ["deploy/2026-11-19/app.js", app, 4], ["deploy/2026-11-19/config.json", text('{ "version": "1.4.1", "debug": true }'), 4], ["deploy/2026-11-19/README.md", text("Release 1.4.1 notes"), 4],
      ["deploy/2026-11-19/old-only.txt", text("Removed in 1.4.2"), 4], ["deploy/2026-11-19/assets/logo.svg", logo, 4, "image/svg+xml"],
      ["deploy/2026-11-20/app.js", app, 3], ["deploy/2026-11-20/config.json", text('{ "version": "1.4.2", "debug": false, "feature": true }'), 3], ["deploy/2026-11-20/README.md", text("Release 1.4.2 notes"), 3],
      ["deploy/2026-11-20/new-feature.js", text("export const feature = true;"), 3], ["deploy/2026-11-20/assets/logo.svg", logo, 3, "image/svg+xml"],
      ["deploy/2026-11-20/migrations/001-init.sql", text("CREATE TABLE orders (id INT);"), 3],
    ];
  }

  Object.assign(DEMOS, {
    "explorer-folder": { label: "Explorer: folder mẫu (chọn nhiều, lọc, breadcrumb, xem trước)", open: () => {
      const root = sampleProject(Date.parse("2026-11-20T09:00:00Z"));
      if (!FolderView.preview()) FolderView.togglePreview();
      FolderItems.show(root, "README.md");
      done("Explorer: folder mẫu (chọn nhiều, lọc, breadcrumb, xem trước)");
    } },
    // Dates relative to now (colour by age), a few pictures (thumbnails), tags and the details pane.
    "explorer-display": { label: "Explorer: hiển thị (ảnh thu nhỏ, tô màu, nhãn, chi tiết)", open: async () => {
      const root = sampleProject(Date.now() - 20 * 60e3, [["assets/banner.svg", svg(320, 120, "#0e7490", "Order Book"), 0.01, "image/svg+xml"],
        ["assets/icon-buy.svg", svg(96, 96, "#15803d", "BUY"), 2, "image/svg+xml"], ["assets/icon-sell.svg", svg(96, 96, "#b91c1c", "SELL"), 12, "image/svg+xml"], ["CHANGELOG.md", "# Changelog\n\n## 1.4.2\n- Fee rules for Q4\n", 0.2]]);
      FolderView.setFlag("kind", true);
      FolderView.setFlag("age", true);
      if (!FolderView.details()) FolderView.toggleDetails();
      FolderView.setMode("lg");
      const kids = await Explorer.loadKids(root), at = name => kids.find(k => k.name === name);
      Tags.set([at("README.md")], "red");
      Tags.set([at("package.json"), at("data")], "green");
      FolderItems.show(at("assets"), "banner.svg");
      done("Explorer: hiển thị (ảnh thu nhỏ, tô màu, nhãn, chi tiết)");
    } },
    // Two panels (root | src), grouped by type; over http(s) the copy is writable so F5 / F6 / F7 / F8 really work.
    "explorer-commander": { label: "Explorer: 2 panel kiểu Commander (F5 chép, F6 chuyển, nhóm, xem phẳng, Cột)", open: async () => {
      const files = sampleFiles(Date.parse("2026-11-20T09:00:00Z")), disk = await opfsProject(files), root = disk || LocalFs.fromFileList(files);
      Explorer.setRoot(root, true);
      FolderView.setGroup("type");
      const kids = await Explorer.loadKids(root);
      DualPanel.open(root, kids.find(k => k.name === "src") || root);
      StatusBar.msg(disk ? T("Đã nạp mẫu 2 panel (bản chép có quyền ghi trong bộ nhớ riêng của trang): chọn file rồi F5 chép / F6 chuyển sang panel kia, Ctrl+Z hoàn tác.")
        : T("Đã nạp mẫu 2 panel (chỉ đọc — mở qua http(s) để thử F5 / F6): Ctrl+D folder hay dùng, Ctrl+Alt+B xem phẳng, Ctrl+Shift+9 kiểu Cột."), "good");
    } },
    // 2 panels on the two deploy folders and their compare in the 🔎 tab; over http(s) the copy is writable so ⇄ Đồng bộ works.
    "explorer-search": { label: "Explorer: tìm file, file trùng, so sánh + đồng bộ folder", open: async () => {
      const files = sampleFiles(Date.now(), searchExtra()), disk = await opfsProject(files), root = disk || LocalFs.fromFileList(files);
      Explorer.setRoot(root, true);
      const [a, b] = [await FolderPaths.resolve(root.name + "/deploy/2026-11-19"), await FolderPaths.resolve(root.name + "/deploy/2026-11-20")];
      DualPanel.open(a, b);
      ResultsTab.open("compare", { a: a.path, b: b.path, skip: true }, 0);
      StatusBar.msg(disk ? T("Đã nạp mẫu tìm & so sánh (bản chép có quyền ghi): tab 🔎 so sánh 2 bản deploy — ⇄ Đồng bộ ▾ rồi Ctrl+Z hoàn tác; chuột phải folder ▸ Tìm & so sánh ▸ Tìm file… (Alt+F7) / Tìm file trùng.")
        : T("Đã nạp mẫu tìm & so sánh (chỉ đọc — mở qua http(s) để thử đồng bộ): tab 🔎 so sánh 2 bản deploy; chuột phải folder ▸ Tìm & so sánh ▸ Tìm file… (Alt+F7) / Tìm file trùng."), "good");
    } },
    // Over http(s): a writable copy plus docs-backup.tar.gz (made by Tar) to drag, create from templates, compress and extract.
    "explorer-file-ops": { label: "Explorer: thao tác file (kéo-thả, Mới ▸ mẫu, nén / giải nén tar.gz)", open: async () => {
      const files = sampleFiles(Date.parse("2026-11-20T09:00:00Z")), disk = await opfsProject(files), root = disk || LocalFs.fromFileList(files);
      if (disk) {
        await VendorPaths.load("extras");
        const docs = files.filter(f => f.webkitRelativePath.startsWith("sample-project/docs/"));
        const list = [{ name: "docs/" }, ...await Promise.all(docs.map(async f => ({ name: "docs/" + f.name, data: new Uint8Array(await f.arrayBuffer()), date: new Date(f.lastModified) })))];
        const w = await (await root.handle.getFileHandle("docs-backup.tar.gz", { create: true })).createWritable();
        await w.write(await Tar.gzip(Tar.create(list)));
        await w.close();
      }
      Explorer.setRoot(root, true);
      FolderItems.show(root, "README.md");
      StatusBar.msg(disk ? T("Đã nạp mẫu thao tác file (bản chép có quyền ghi): kéo file lên 1 folder để chuyển (giữ Ctrl để chép), chuột phải vùng trống ▸ Mới ▸ mẫu file, chuột phải docs-backup.tar.gz ▸ Giải nén vào folder, Ctrl+Z hoàn tác.")
        : T("Đã nạp mẫu thao tác file (chỉ đọc — mở qua http(s) để thử kéo-thả, Mới ▸ và nén / giải nén)."), "good");
    } },
  });
})();

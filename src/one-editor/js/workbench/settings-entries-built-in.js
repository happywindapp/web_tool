// The settings One Editor already had, in the ⚙ Settings tab: each entry reads and writes through the module that owns the value, so the toolbar, Palette and View menu stay in step.
(() => {
  const S = Settings.add, flag = (key, def) => () => Prefs.get(key, def) === !def ? !def : def;
  const flip = (get, toggle) => v => { if (get() !== v) toggle(); };
  const choose = list => () => list.map(([v, label]) => [v, T(label)]);
  TrashStore.onChange(() => Settings.changed());

  // Explorer & folder tab
  const showFiles = flag("exShowFiles", true), git = flag("gitIcons", true);
  S({ id: "exShowFiles", group: "explorer", label: "Hiện file trong cây Explorer", hint: "Tắt ⇒ cây chỉ có folder, file xem ở tab folder", get: showFiles, set: v => { Prefs.set("exShowFiles", v); Explorer.render(); }, def: true });
  S({ id: "gitIcons", group: "explorer", label: "Biểu tượng trạng thái Git", hint: "Kiểu TortoiseGit trong cây và tab folder (folder có .git)", get: git, set: flip(git, () => GitStatus.toggle()), def: true });
  S({ id: "fiView", group: "explorer", type: "choice", label: "Kiểu xem tab folder", hint: "Như menu Xem của Windows Explorer (Ctrl+Shift+1…9)", choices: () => FolderView.MODES.map(([m, label]) => [m, T(label)]),
    get: () => FolderView.mode(), set: m => FolderView.setMode(m), def: "details" });
  S({ id: "fiSort", group: "explorer", type: "choice", label: "Sắp xếp theo", hint: "Cột sắp xếp của tab folder (bấm tiêu đề cột cũng đổi)", choices: () => FolderView.COLS.map(([k, label]) => [k, T(label)]),
    get: () => FolderView.sort().key, set: k => FolderView.setSort(k, FolderView.sort().asc), def: "name" });
  S({ id: "fiSortDir", group: "explorer", type: "choice", label: "Thứ tự sắp xếp", choices: choose([["asc", "Tăng dần"], ["desc", "Giảm dần"]]),
    get: () => (FolderView.sort().asc ? "asc" : "desc"), set: v => FolderView.setSort(FolderView.sort().key, v === "asc"), def: "asc" });
  S({ id: "fiChecks", group: "explorer", label: "Ô chọn mục", hint: "Checkbox ở mỗi dòng tab folder (luôn có trên màn hình cảm ứng)", get: () => FolderView.checks(), set: flip(() => FolderView.checks(), FolderView.toggleChecks), def: false });
  S({ id: "fiPreview", group: "explorer", label: "Khung xem trước", hint: "File đang chọn hiện cạnh danh sách (Alt+P)", get: () => FolderView.preview(), set: flip(() => FolderView.preview(), FolderView.togglePreview), def: false });
  S({ id: "fiDetails", group: "explorer", label: "Khung chi tiết", hint: "Thông tin mục đang chọn, ở chỗ của khung xem trước (Alt+Shift+P)", get: () => FolderView.details(), set: flip(() => FolderView.details(), FolderView.toggleDetails), def: false });
  for (const [k, id, label, hint, def] of [["ext", "fiExt", "Hiện đuôi file", "Tắt ⇒ “README.md” hiện là “README”; lọc và gõ để nhảy vẫn theo tên đủ", true],
    ["hidden", "fiHidden", "Hiện file ẩn (tên bắt đầu bằng “.”)", "Như .gitignore, .env — cả cây Explorer lẫn tab folder", true],
    ["thumbs", "fiThumbs", "Ảnh thu nhỏ", "Ở kiểu xem Biểu tượng rất lớn / lớn / vừa và Ô xếp", true],
    ["age", "fiAge", "Tô màu theo tuổi", "Nền đậm dần: sửa trong 1 giờ · hôm nay · 7 ngày", false],
    ["kind", "fiKind", "Tô màu theo loại", "Màu tên file: code · dữ liệu · tài liệu · ảnh · nén · nhị phân", false]])
    S({ id, group: "explorer", label, hint, get: () => FolderView.flag(k), set: v => FolderView.setFlag(k, v), def });
  S({ id: "fiGroup", group: "explorer", type: "choice", label: "Nhóm theo", hint: "Nhóm mục của tab folder có tiêu đề gập được (Xem ▸ Nhóm theo)", choices: () => FolderView.GROUPS.map(([g, label]) => [g, T(label)]),
    get: () => FolderView.group(), set: g => FolderView.setGroup(g), def: "none" });
  S({ id: "fiFlatSkip", group: "explorer", label: "Bỏ .git / node_modules khi xem phẳng", hint: "Xem phẳng (⇣, Ctrl+Alt+B) không đọc 2 loại folder nặng này", get: () => FolderView.flag("flatSkip"), set: v => FolderView.setFlag("flatSkip", v), def: true });

  // Editor
  const cm = CmSetup.settings, aid = id => () => !!Aids.settings()[id];
  S({ id: "theme", group: "editor", type: "choice", label: "Giao diện", hint: "Sáng / tối, hoặc theo hệ điều hành", choices: choose([["auto", "Tự động"], ["light", "Sáng"], ["dark", "Tối"]]),
    get: () => $("uiTheme").value, set: v => { $("uiTheme").value = v; $("uiTheme").dispatchEvent(new Event("change")); }, def: "auto" });
  const font = () => (Prefs.get("font", 13) | 0) || 13;
  S({ id: "font", group: "editor", type: "number", label: "Cỡ chữ editor (px)", hint: "9–28 — Ctrl+= / Ctrl+- / Ctrl+0 cũng đổi", min: 9, max: 28,
    get: font, set: v => { if (v !== font()) Actions.zoom(v === 13 ? 0 : v - font()); }, def: 13 });
  S({ id: "wrap", group: "editor", label: "Xuống dòng mềm", hint: "Gói dòng dài trong khung (Alt+Z)", get: () => cm.wrap, set: v => Actions.setWrap(v), def: true });
  S({ id: "minimap", group: "editor", label: "Minimap", hint: "Bản thu nhỏ của file ở mép phải editor", get: () => cm.minimap, set: v => Actions.setMinimap(v), def: false });
  S({ id: "guides", group: "editor", label: "Đường thụt lề (indent guide)", get: () => cm.guides, set: v => Actions.setGuides(v), def: true });
  S({ id: "hidden", group: "editor", label: "Hiện ký tự ẩn", hint: "Dấu cách, Tab, xuống dòng (nút ¶)", get: () => cm.hidden, set: flip(() => cm.hidden, EncodingActions.toggleHidden), def: false });
  S({ id: "clipKeep", group: "data", label: "Nhớ lịch sử clipboard qua F5", hint: "Lưu trong IndexedDB của trình duyệt này — có thể chứa mật khẩu / token bạn đã chép; tắt là xoá ngay bản đã lưu (mục 📌 luôn được giữ)",
    get: () => ClipHistory.keep(), set: v => ClipHistory.setKeep(v), def: false });
  S({ id: "todoTags", group: "editor", type: "text", label: "Từ khoá TODO", hint: "Panel ☑ TODO: các tag cách nhau dấu phẩy (in hoa khi so)", get: () => TodoScan.tags(Prefs.get("todoTags", "")).join(", "),
    set: v => { Prefs.set("todoTags", TodoScan.tags(v).join(", ")); TodoPanel.rescan(); }, def: TodoScan.DEFAULT.join(", ") });
  S({ id: "lint", group: "editor", label: "Kiểm lỗi khi gõ", hint: "Dữ liệu (JSON, XML, YAML…) và cú pháp code", get: () => cm.lint, set: v => { cm.lint = v; Prefs.set("lint", v); Views.applySettings(); }, def: true });
  S({ id: "numHover", group: "editor", label: "Tooltip quy đổi số / timestamp", hint: "Rê chuột lên số: hex, nhị phân, ngày giờ", get: () => cm.numHover, set: v => DevActions.setHover(v), def: true });
  S({ id: "words", group: "editor", label: "Gợi ý từ có sẵn trong file khi gõ", get: () => cm.words, set: v => Actions.setWords(v), def: true });
  for (const [id, label, def] of [["rulers", "Thước cột 80 / 120", false], ["brackets", "Tô màu cặp ngoặc", true], ["swatches", "Ô màu cạnh mã màu CSS", true], ["crumbs", "Breadcrumbs (đường dẫn symbol trên editor)", false]])
    S({ id: "aid-" + id, group: "editor", label, get: aid(id), set: flip(aid(id), () => Aids.toggle(id)), def });

  // Shortcuts
  S({ id: "keys", group: "keys", type: "choice", label: "Bộ phím tắt của editor", hint: "Chỉ phím soạn thảo — phím của ứng dụng (Ctrl+P, Ctrl+Shift+P…) giữ nguyên",
    choices: () => Object.keys(KeyProfiles.PROFILES).map(id => [id, { notepadpp: "Notepad++", vscode: "VS Code", sublime: "Sublime Text" }[id]]), get: () => KeyProfiles.current(), set: id => KeyProfiles.set(id), def: "notepadpp" });
  S({ id: "vim", group: "keys", label: "Vim", hint: "Chế độ phím Vim (Esc về Normal, :w lưu)", get: flag("vim", false), set: v => KeyProfiles.setVim(v), def: false });
  S({ id: "emmet", group: "keys", label: "Emmet", hint: "HTML · CSS · JSX — Tab hoặc Ctrl+E mở rộng viết tắt", get: () => EditorExtras.emmetOn(), set: v => EditorExtras.setEmmet(v), def: true });

  // Preview & translate (read when a translation starts)
  S({ id: "trTo", group: "preview", type: "choice", label: "Ngôn ngữ đích khi dịch", hint: "Mặc định cho tab dịch mới", choices: () => [["auto", T("Tự chọn (Việt ↔ Anh)")], ...TrLang.LANGS.map(c => [c, Translate.name(c)])],
    get: () => (TrLang.LANGS.includes(Prefs.get("tr.to", "")) ? Prefs.get("tr.to", "") : "auto"), set: v => Prefs.set("tr.to", v), def: "auto" });
  S({ id: "trLive", group: "preview", label: "Dịch khi gõ", hint: "Cho tab dịch mới — chỉ với bộ dịch trên máy (Chrome / Edge mới)", get: flag("tr.live", false), set: v => Prefs.set("tr.live", v), def: false });
  S({ id: "trBi", group: "preview", label: "Song ngữ", hint: "Cho tab dịch mới — bản dịch xen câu gốc", get: flag("tr.bi", true), set: v => Prefs.set("tr.bi", v), def: true });
  S({ id: "trRate", group: "preview", type: "choice", label: "Tốc độ đọc to", choices: () => ["0.75", "1", "1.25", "1.5"].map(x => [x, x + "×"]),
    get: () => String(Prefs.get("tr.rate", 1)), set: v => Prefs.set("tr.rate", +v), def: "1" });

  // Saved data
  S({ id: "storage", group: "data", type: "info", label: "Dung lượng trình duyệt đã dùng", hint: "Ghi chú, tab, lịch sử cục bộ, thùng rác (IndexedDB) của trang này",
    get: async () => { const e = await navigator.storage?.estimate?.(); return e ? T("{used} / hạn mức {quota}", { used: FolderFmt.size(e.usage || 0), quota: FolderFmt.size(e.quota || 0) }) : T("Trình duyệt không cho biết."); } });
  S({ id: "trash", group: "data", type: "info", label: "Thùng rác", hint: "File xoá trong Explorer, giữ tối đa 30 ngày",
    get: () => { const s = TrashStore.summary(); return s?.n ? T("{n} mục · {size}", { n: s.n, size: FolderFmt.size(s.size) }) : T("Trống"); },
    actions: () => [[T("🗑 Mở"), () => TrashTab.open()], [T("🧹 Dọn sạch…"), async () => {
      const recs = await TrashStore.list();
      if (recs.length && confirm(T("Dọn sạch thùng rác ({n} mục)? Không khôi phục được.", { n: recs.length }))) { await TrashStore.purge(recs.map(r => r.id)); Settings.changed(); }
    }]] });
  S({ id: "clearData", group: "data", type: "info", label: "Xoá dữ liệu đã lưu", hint: "Mọi ghi chú, tab đã lưu, lịch sử cục bộ và thùng rác trong trình duyệt này", get: () => "",
    actions: () => [[T("🗑 Xoá dữ liệu đã lưu…"), () => Actions.clearData()]] });
  S({ id: "gdriveKey", group: "data", type: "info", label: "API key Google Drive", hint: "Để mở folder Drive công khai — chỉ lưu trong trình duyệt này",
    get: () => { const k = String(Prefs.get("gdriveKey", "") || ""); return k ? T("Đã lưu (…{tail})", { tail: k.slice(-4) }) : T("Chưa có"); },
    actions: () => [[T("Đổi…"), () => { if (CloudDrive.askKey() != null) Settings.changed(); }], [T("Xoá"), () => { Prefs.set("gdriveKey", ""); StatusBar.msg(T("Đã xoá API key Google Drive."), "good"); }]] });
})();

// Tab "Bảng CSV": view/edit CSV-TSV in a grid — encoding, delimiter sniffing, sort, filter, edit cells, add/remove rows & columns, export.
(() => {
  const PAGE = 500, DECIMAL = /^-?\d+(\.\d+)?$/, NUMERIC_CELL = /^-?\d+(?:[.,]\d+)*$/;
  const collator = new Intl.Collator("vi", { numeric: true, sensitivity: "base" });
  let report, head = [], rows = [], sort = { col: -1, dir: 1 }, page = 0, editBefore = "";
  let lastFile = null, lastText = "", fileName = "", delimUsed = ",", lastShow = () => {};

  const delimSel = () => ({ auto: "", tab: "\t" }[$("csv-delim").value] ?? $("csv-delim").value);
  const genHead = n => Array.from({ length: n }, (_, i) => T("Cột {n}", { n: i + 1 }));
  const cmp = (a = "", b = "") => DECIMAL.test(a.trim()) && DECIMAL.test(b.trim()) ? a - b : collator.compare(a, b);

  // On a language switch lastShow re-parses the source only to re-word the report; grid edits are kept.
  function loadText(text, name = "", extra = () => []) {
    fileName = name; lastText = text;
    const p = CsvTool.parse(text, delimSel());
    delimUsed = p.delimiter;
    const all = p.rows.map(r => r.length < p.width ? [...r, ...new Array(p.width - r.length).fill("")] : r);
    if ($("csv-header").checked && all.length) { head = all[0]; rows = all.slice(1); } else { head = genHead(p.width); rows = all; }
    sort = { col: -1, dir: 1 }; page = 0; $("csv-filter").value = "";
    render();
    const n = rows.length, cols = head.length, delimiter = delimSel();
    lastShow = (q = CsvTool.parse(text, delimiter), ex = extra(true)) => {
      if (!text.trim()) return report.show(T("Chưa có dữ liệu."), "muted");
      report.show(T("✔ Đã nạp {n} hàng × {cols} cột · {delim}", { n: I18n.num(n), cols, delim: T(q.delimiterName) }) + (name ? " · " + name : "") + "."
        + (q.fixes.length ? " " + T("Có {n} chỗ không chuẩn, xem bên dưới.", { n: q.fixes.length }) : ""), q.fixes.length || ex.length ? "warn" : "good", [...ex, ...q.fixes]);
    };
    lastShow(p, extra(false));
  }

  function viewIdx() {
    const f = $("csv-filter").value.trim().toLowerCase();
    let idx = rows.map((_, i) => i);
    if (f) idx = idx.filter(i => rows[i].some(v => v.toLowerCase().includes(f)));
    if (sort.col >= 0) idx.sort((a, b) => sort.dir * cmp(rows[a][sort.col], rows[b][sort.col]));
    return idx;
  }

  function render() {
    $("csv-empty").hidden = head.length > 0;
    const idx = viewIdx(), pages = Math.max(1, Math.ceil(idx.length / PAGE));
    page = Math.min(page, pages - 1);
    const shown = idx.slice(page * PAGE, (page + 1) * PAGE);
    const numCol = head.map((_, c) => shown.some(r => rows[r][c]) && shown.every(r => !rows[r][c] || NUMERIC_CELL.test(rows[r][c].trim())));
    const arrow = c => sort.col !== c ? "⇅" : sort.dir > 0 ? "▲" : "▼";
    const tip = { sort: T("Sắp xếp"), delCol: T("Xoá cột"), delRow: T("Xoá hàng") };
    const th = (h, c) => `<th><div class="th"><span class="hname" contenteditable="true" data-h="${c}">${Dom.esc(h)}</span>`
      + `<button class="mini" data-sort="${c}" title="${tip.sort}">${arrow(c)}</button><button class="mini del" data-delc="${c}" title="${tip.delCol}">×</button></div></th>`;
    const tr = r => `<tr><td class="rn"><button class="mini del" data-delr="${r}" title="${tip.delRow}">×</button>${r + 1}</td>`
      + head.map((_, c) => `<td contenteditable="true" data-r="${r}" data-c="${c}"${numCol[c] ? ' class="num"' : ""}>${Dom.esc(rows[r][c] ?? "")}</td>`).join("") + "</tr>";
    $("csv-table").innerHTML = head.length ? `<thead><tr><th class="rn">#</th>${head.map(th).join("")}</tr></thead><tbody>${shown.map(tr).join("")}</tbody>` : "";
    $("csv-page").textContent = T("Trang {n}/{total}", { n: page + 1, total: pages });
    $("csv-prev").disabled = page === 0;
    $("csv-next").disabled = page >= pages - 1;
    $("csv-info").textContent = head.length ? T("{n} hàng × {cols} cột", { n: I18n.num(rows.length), cols: head.length })
      + (idx.length !== rows.length ? " · " + T("lọc còn {n}", { n: I18n.num(idx.length) }) : "") : "";
  }

  const outDelim = () => delimSel() || delimUsed;
  const csvText = (eol = "\n") => CsvTool.stringify($("csv-header").checked ? [head, ...rows] : rows, outDelim(), eol);

  function readCurrentFile() {
    if (!lastFile) return;
    Dom.readFile(lastFile, (name, text) => text === null ? report.show(T("✖ Không đọc được file {name}", { name }), "bad") : loadText(text, name), $("csv-enc").value);
  }
  const onFile = f => { lastFile = f; readCurrentFile(); };

  // JSON / XML / YAML sent from another tab goes through the converter first; code or markup output is refused.
  function receive(text, meta) {
    if (meta.kind === "csv" || meta.kind === "tsv") return loadText(text);
    if (!Convert.FROM.includes(meta.kind)) return report.show(T("✖ Bảng CSV chỉ nhận JSON, XML, YAML, CSV hoặc TSV (đang gửi: {kind}).", { kind: meta.kind || T("không rõ") }), "bad");
    try {
      $("csv-header").checked = true;
      const r = Convert.run(text, meta.kind, "csv");
      const notes = again => {
        const x = again ? Convert.run(text, meta.kind, "csv") : r;
        return [...x.fixes.map(f => ({ ...f, line: 0, msg: T("Dữ liệu nguồn: {msg}", f) })), ...x.notes.map(msg => ({ line: 0, msg }))];
      };
      loadText(r.out, "", notes);
    } catch (e) { report.show(T("✖ Không chuyển được sang bảng: {msg}", { msg: e.message }), "bad"); }
  }

  function toggleHeader() {
    if ($("csv-header").checked) { head = rows.shift() || []; }
    else { rows.unshift(head); head = genHead(head.length); }
    render();
  }

  function bindTable() {
    const table = $("csv-table");
    table.addEventListener("focusin", e => { editBefore = e.target.textContent; });
    table.addEventListener("keydown", e => {
      if (!e.target.isContentEditable) return;
      if (e.key === "Enter" && !e.shiftKey && !e.ctrlKey) { e.preventDefault(); e.target.blur(); }
      else if (e.key === "Escape") { e.target.textContent = editBefore; e.target.blur(); }
    });
    table.addEventListener("focusout", e => {
      const el = e.target;
      if (el.dataset.r !== undefined) rows[+el.dataset.r][+el.dataset.c] = el.textContent;
      else if (el.dataset.h !== undefined) head[+el.dataset.h] = el.textContent;
    });
    table.addEventListener("click", e => {
      const b = e.target.closest("button");
      if (!b) return;
      if (b.dataset.sort !== undefined) {
        const c = +b.dataset.sort;
        sort = sort.col !== c ? { col: c, dir: 1 } : sort.dir > 0 ? { col: c, dir: -1 } : { col: -1, dir: 1 };
      } else if (b.dataset.delc !== undefined) {
        const c = +b.dataset.delc;
        head.splice(c, 1); rows.forEach(r => r.splice(c, 1));
        sort = sort.col === c ? { col: -1, dir: 1 } : { col: sort.col > c ? sort.col - 1 : sort.col, dir: sort.dir };
      } else if (b.dataset.delr !== undefined) rows.splice(+b.dataset.delr, 1);
      render();
    });
  }

  function init() {
    report = ReportPanel($("csv-status"), $("csv-msgs"));
    bindTable();
    $("csv-file").onchange = e => { if (e.target.files[0]) onFile(e.target.files[0]); e.target.value = ""; };
    $("csv-enc").onchange = readCurrentFile;
    $("csv-delim").onchange = () => { if (lastText) loadText(lastText, fileName); };
    $("csv-header").onchange = toggleHeader;
    $("csv-filter").oninput = Dom.debounce(() => { page = 0; render(); }, 200);
    $("csv-prev").onclick = () => { page--; render(); };
    $("csv-next").onclick = () => { page++; render(); };
    $("csv-add-col").onclick = () => { head.push(T("Cột {n}", { n: head.length + 1 })); rows.forEach(r => r.push("")); render(); };
    $("csv-add-row").onclick = () => {
      if (!head.length) head = genHead(1);
      rows.push(head.map(() => ""));
      $("csv-filter").value = ""; sort = { col: -1, dir: 1 }; page = Infinity;
      render();
      const cell = document.querySelector(`#csv-table td[data-r="${rows.length - 1}"]`);
      if (cell) cell.focus();
    };
    $("csv-paste-toggle").onclick = () => { $("csv-paste").hidden = !$("csv-paste").hidden; if (!$("csv-paste").hidden) $("csv-paste-text").focus(); };
    $("csv-paste-load").onclick = () => { lastFile = null; loadText($("csv-paste-text").value); $("csv-paste").hidden = true; };
    $("csv-save").onclick = () => {
      if (!head.length) return;
      const d = outDelim();
      Dom.download(($("csv-bom").checked ? "﻿" : "") + csvText($("csv-eol").value === "crlf" ? "\r\n" : "\n"),
        `${Dom.baseName(fileName)}.edited.${d === "\t" ? "tsv" : "csv"}`, "text/csv;charset=utf-8");
    };
    $("csv-clear").onclick = () => { lastFile = null; head = []; rows = []; loadText(""); };
    $("csv-demo").onchange = e => { demo(e.target.value); e.target.value = ""; };
    Workbench.bindSendTo($("csv-send"), "csv", () => head.length ? { text: csvText(), kind: outDelim() === "\t" ? "tsv" : "csv" } : null);
    demo("csv");
  }

  function demo(name) {
    const d = DEMOS.csv[name];
    if (d) { lastFile = null; loadText(d.text, d.name); }
  }

  Workbench.register("csv", { label: "Bảng CSV", init, onFile, receive, demo, relang: () => { render(); lastShow(); } });
})();

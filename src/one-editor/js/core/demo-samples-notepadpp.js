// Phase 2b demos (encoding, EOL, line ops, column, macro) added to DEMOS; file demos open real bytes so encoding / EOL detection runs; content is fake.
(() => {
  const t = (n, text) => ({ n, l: "", t: text });
  const hex = h => Uint8Array.from(h.match(/../g), b => parseInt(b, 16));
  // Windows-1258 CSV with Vietnamese customer names (CRLF).
  const CP1258 = "69642c6e616d652c636974792c6e6f74650d0a312c4e677579eade6e2056e36e20416e2c48e0204ef4f2692c4b68e16368206df5ec690d0a322c5472e2cc6e20546869f22042ed63682cd0e0204ee3de6e672cd061de2078e163206e68e2f26e0d0a332c4cea20486fe06e67205068fa632c4875eaec2c4368f5cc20647579eaf2740d0a";
  const MIXED = "deploy step 1: build\r\ndeploy step 2: test\ndeploy step 3: package\r\ndeploy step 4: upload\rdeploy step 5: verify\r\n";
  const SYMBOLS = "GLOBX\nacme\nINITECH\nACME\n\nglobx\nUMBRELLA\nACME\n10 lots\n2 lots\n\nINITECH\n";
  const CSV_COLS = "symbol,side,qty\nACME,BUY,100\nGLOBX,SELL,50\nINITECH,BUY,300\nUMBRELLA,SELL,20\nACME,SELL,75\n";
  const WORDS = "acme corp\nglobex inc\ninitech llc\numbrella group\nhooli\n";
  const key = (key, code) => ({ k: { key, code, ctrlKey: false, shiftKey: false, altKey: false, metaKey: false } });

  Object.assign(DEMOS, {
    "windows-1258": { label: "File Windows-1258 (tự dò bảng mã)", file: () => new File([hex(CP1258)], "customers-cp1258.csv") },
    "crlf-mixed": { label: "Xuống dòng hỗn hợp CRLF / LF / CR", file: () => new File([MIXED], "deploy-steps.txt") },
    "sort-dedupe": { label: "Sắp xếp + bỏ trùng dòng", payload: () => ({ v: 1, views: [[t("symbols.txt", SYMBOLS)], []] }), after: () => StatusBar.msg(T("Thử Palette (Ctrl+Shift+P) → “Dòng: sắp xếp…”, “Dòng: bỏ dòng trùng”, “Dòng: bỏ dòng trống”.")) },
    "column-csv": { label: "Chọn cột + chèn số", payload: () => ({ v: 1, views: [[t("orders.csv", CSV_COLS)], []] }), after: () => StatusBar.msg(T("Shift+Alt+kéo chọn cột đầu (hoặc Ctrl+Alt+↓), rồi Palette → “Cột: chèn số tăng dần…”.")) },
    "macro": {
      label: "Macro: bọc mỗi dòng trong dấu nháy",
      payload: () => ({ v: 1, views: [[t("names.txt", WORDS)], []] }),
      after: () => { Macro.set([key("Home", "Home"), { p: "\"" }, key("End", "End"), { p: "\"," }, key("ArrowDown", "ArrowDown")]); StatusBar.msg(T("Đã nạp sẵn 1 macro (bọc dòng trong \"…\",). Đặt con trỏ ở dòng 1 rồi Palette → “Macro: phát tới cuối tab”, hoặc Alt+Shift+R để ghi macro của bạn.")); },
    },
  });
})();

// Pure text helpers shared by parsers and tabs (no DOM, so node tests can load them).
const TextUtil = (() => {
  const stripBom = s => s.charCodeAt(0) === 0xfeff ? s.slice(1) : s;
  const lineCol = (s, i) => { const pre = s.slice(0, i).split("\n"); return { line: pre.length, col: pre[pre.length - 1].length + 1 }; };
  const INDENT = { "2": "  ", "3": "   ", "4": "    ", "8": "        ", tab: "\t" };
  const indentUnit = v => INDENT[v] ?? "  ";
  const countLines = s => { let n = 1; for (let i = s.indexOf("\n"); i >= 0; i = s.indexOf("\n", i + 1)) n++; return n; };
  const sizeKb = s => (new Blob([s]).size / 1024).toFixed(1);
  // Excel would drop leading zeros, round >15-digit ids, cut trailing decimals and reformat times → write those as ="…" text.
  const excelExact = v => (/^-?\d+(\.\d+)?$/.test(v) && (String(Number(v)) !== v || v.replace(/\D/g, "").length > 15)) || /^\d{1,2}:\d{2}(:\d{2})?(\.\d+)?$/.test(v);
  return { stripBom, lineCol, indentUnit, countLines, sizeKb, excelExact };
})();

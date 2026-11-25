// Demo files made at run time in the workers (sql.js / SheetJS), opened like a dropped file: no binary sample is shipped.
const DataDemos = (() => {
  async function open(make, name) {
    try { await FileOpen.openMany([{ file: new File([await make()], name), handle: null }]); }
    catch (e) { StatusBar.msg(T("Không tạo được file mẫu: {msg}", { msg: e.message }), "bad"); }
  }
  return { sqlite: () => open(SqlOp.demoDb, "demo-trades.db"), xlsx: () => open(OfficeOp.demoXlsx, "demo-workbook.xlsx") };
})();

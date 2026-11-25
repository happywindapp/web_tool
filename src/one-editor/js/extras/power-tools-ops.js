// Phase 9 ops run by OutputOps through PowerTools.op(name): cron, SQL from data, JSON Schema, invisible chars (9a), recipe (9b), regex + run code (9c), code → image (9d).
const PowerOps = (() => {
  let inited = false;
  function init() {
    if (inited) return;
    inited = true;
    const V = { invisible: PvInvisible, recipe: PvRecipe, regex: PvRegex, run: PvRun, "code-image": PvCodeImage, syntax: PvSyntax, sql: PvSql, fake: PvFake, office: PvOffice, logmerge: PvLogMerge, fixlife: PvFixLife, swift: PvSwift, curl: PvCurl, x509: PvX509, openapi: PvOpenApi, patch: PvPatch };
    for (const [k, v] of Object.entries(V)) PreviewPane.addView(k, v);
    RegexMarks.init();
  }

  const cron = t => {
    const r = CronExplain.report(t);
    const e = r.errors[0];
    return { text: r.text, notes: e ? [T("{n} dòng cron lỗi — dòng {line}: {msg}", { n: r.errors.length, line: e.line, msg: e.message })] : [] };
  };

  // SQL settings per source tab: dialect + batch remembered in this browser, table / key per tab.
  function sqlOpts(srcId) {
    const s = PowerTools.state(srcId, "sql"), saved = Prefs.get("sql", {});
    s.dialect ??= saved.dialect === "pg" ? "pg" : "tsql";
    s.batch ??= Number.isInteger(saved.batch) && saved.batch > 0 ? saved.batch : DataSql.DEF.batch;
    s.table ??= "";
    s.key ??= "";
    return s;
  }
  function sql(mode) {
    return (t, c) => {
      const data = DataSql.read(t, c.lang), r = DataSql.build(data, { ...sqlOpts(c.id), mode }, c.name);
      return { text: r.text, fixes: data.fixes, notes: [T("SQL chỉ là văn bản — tự kiểm rồi chạy bằng công cụ DB của bạn."), ...r.notes] };
    };
  }

  const schema = (t, c) => JsonSchemaGen.generate(t, OutputOps.baseName(c.name));

  function invisible(t, c) {
    const r = Invisible.scan(t);
    const lines = r.items.map(i => i.line + ":" + i.col + "\t" + i.code + "\t" + i.name);
    return { text: lines.join("\n") + (lines.length ? "\n" : ""), view: { kind: "invisible", srcId: c.id, ...r }, notes: [T("{n} ký tự vô hình / lạ.", { n: I18n.num(r.total) })] };
  }

  return { init, cron, sqlInsert: sql("insert"), sqlUpdate: sql("update"), sqlOpts, schema, invisible,
    recipe: (t, c) => RecipeOp.run(t, c), regex: (t, c) => RegexOp.run(t, c), run: (t, c) => RunCode.run(t, c), codeImage: (t, c) => CodeImageOp.run(t, c), syntaxCheck: (t, c) => SyntaxCheckOp.run(t, c),
    sqlQuery: (t, c) => SqlOp.run(t, c), fakeData: (t, c) => FakeOp.run(t, c), office: (t, c) => OfficeOp.run(t, c),
    logMerge: (t, c) => LogMergeOp.run(t, c), fixLifecycle: (t, c) => FixLifeOp.run(t, c), swiftDetail: (t, c) => SwiftOp.run(t, c),
    curlConvert: (t, c) => CurlOp.run(t, c), x509: (t, c) => X509Op.run(t, c), protobuf: t => ProtoOp.run(t), openapiDoc: (t, c) => OpenApiOp.run(t, c), patchView: (t, c) => PatchOp.run(t, c) };
})();

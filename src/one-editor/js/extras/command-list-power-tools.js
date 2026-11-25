// Phase 9 commands: ops reuse their labels, the rest run in the lazy bundle.
function registerPowerToolCommands(C, doc, hasDoc) {
  const use = fn => () => PowerTools.use(fn);
  for (const id of ["cron", "sql-insert", "sql-update", "json-schema", "invisible", "recipe", "regex", "run-code", "code-image", "sql-query", "fake-data", "office", "log-merge", "fix-lifecycle", "swift-detail", "curl-convert", "x509", "protobuf", "openapi-doc", "patch-view"])
    C("op-" + id, () => T(OutputOps.get(id).label) + " ⇢", id === "run-code" ? "Ctrl+k r" : null, () => OutputLink.run(doc(), id), hasDoc);
  C("sqlOptions", "SQL từ dữ liệu: tuỳ chọn…", null, use(() => SqlOptions.open()), hasDoc);
  C("batchReplace", "Thay hàng loạt…", null, use(() => BatchUi.open()), hasDoc);
  C("mdTable", "Markdown: TSV / CSV → bảng", null, use(() => MdActions.toTable()), hasDoc);
  C("mdAlign", "Markdown: căn thẳng bảng", null, use(() => MdActions.align()), hasDoc);
  C("mdToc", "Markdown: chèn / cập nhật mục lục", null, use(() => MdActions.toc()), hasDoc);
}

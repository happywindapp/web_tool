// One Editor lazy bundle, loaded on the first use of a data tool (8b tree / query / line filter), a FIX tab (8a hover dictionary + Message detail) or a phase 9 power tool. Needs the main page's I18n, JsonTool, MarkupTool, Views, Docs.
// Data tools (phase 8b)
// @include js/i18n/en-one-editor-data-tools-strings.js
// @include js/data/jsonpath-filter-expression.js
// @include js/data/jsonpath-subset-query.js
// @include js/data/json-xml-tree-model.js
// @include js/data/xpath-query.js
// @include js/data/data-tools-ops.js
// @include js/data/tree-pane-view.js
// @include js/data/query-pane-view.js
// @include js/log/line-filter-to-output.js
// @include js/log/filter-pane-view.js
// FIX dictionary (phase 8a): the same FIX 4.4 + venue overlay + FIX 5.0SP2 names data as FIX Parser (QuickFIX License 1.0 — see src/fix-message-parser/js/dictionary/quickfix-LICENSE.txt).
// @include ../fix-message-parser/js/dictionary/fix44-standard-dictionary-data.js
// @include ../fix-message-parser/js/dictionary/venue-fix44-dialect-overlay-data.js
// @include ../fix-message-parser/js/dictionary/fix50sp2-extra-field-names-data.js
// @include ../fix-message-parser/js/dictionary/fix-dictionary.js
// FIX message detail: FIX Parser's extractor, validator, tag explanations (FIX Orchestra, Apache-2.0 — see src/fix-message-parser/js/dictionary/fix-orchestra-LICENSE.txt) and detail pane.
// FIX Parser's English strings fill only the words One Editor does not translate yet ("Xoá", "Ghi chú"… keep One Editor's wording).
{
  const add = I18n.add;
  I18n.add = d => add(Object.fromEntries(Object.entries(d).filter(([vi]) => !I18n.has(vi))));
  // @include ../fix-message-parser/js/i18n/en-fix-parser-ui-strings.js
  I18n.add = add;
}
// @include js/i18n/en-one-editor-fix-detail-strings.js
// @include ../fix-message-parser/js/dictionary/fix44-orchestra-descriptions-data.js
// @include ../fix-message-parser/js/dictionary/venue-fix-spec-notes-data.js
// @include ../fix-message-parser/js/dictionary/tag-explanation-lookup.js
// @include ../fix-message-parser/js/parser/fix-wire-codec.js
// @include ../fix-message-parser/js/parser/fix-log-extractor.js
// @include ../fix-message-parser/js/parser/fix-message-validator.js
// @include ../fix-message-parser/js/model/venue-dialect-detection.js
// @include ../fix-message-parser/js/model/fix-timestamp-time-zone-format.js
// @include ../fix-message-parser/js/ui/tag-meaning-and-tooltip.js
// @include ../fix-message-parser/js/ui/message-detail-pane.js
// @include ../data-workbench/js/core/column-filter-popover-and-chips.js
// @include ../fix-message-parser/js/model/message-annotations-by-content.js
// @include ../fix-message-parser/js/model/order-chain-linker.js
// @include ../fix-message-parser/js/ui/order-chain-picker.js
// @include ../fix-message-parser/js/ui/message-timeline-table.js
// @include ../fix-message-parser/js/ui/column-filters-and-layout.js
// @include js/log/fix-detail-model.js
// @include js/log/fix-message-list-view.js
// @include js/log/fix-detail-pane-view.js
// @include styles/fix-detail-pane.css
// Power tools (phase 9): cron, SQL from data, JSON Schema, batch replace, invisible chars, Markdown tables (9a), recipe (9b), regex tester + run code (9c), code → image (9d).
// @include js/i18n/en-one-editor-power-tools-lazy-strings.js
// @include styles/power-tools-panes-dialogs.css
// @include js/extras/power-pane-helpers.js
// @include js/extras/cron-expression-parser.js
// @include js/extras/cron-expression-explain.js
// @include js/extras/data-to-sql-statements.js
// @include js/extras/sql-options-dialog.js
// @include js/extras/json-to-json-schema.js
// @include js/extras/batch-replace-rules.js
// @include js/extras/batch-replace-dialog.js
// @include js/extras/unicode-invisible-inspector.js
// @include js/extras/invisible-pane-view.js
// @include js/extras/markdown-table-tools.js
// @include js/extras/markdown-table-actions.js
// @include js/extras/transform-recipe-ops.js
// @include js/extras/transform-recipe-runner.js
// @include js/extras/recipe-op-and-store.js
// @include js/extras/recipe-pane-view.js
// @include js/extras/regex-tester-core.js
// @include js/extras/regex-tester-op.js
// @include js/extras/regex-tester-pane-view.js
// @include js/extras/run-code-pane-view.js
// @include js/extras/code-snippet-to-image.js
// @include js/extras/code-image-op-and-pane.js
// @include js/extras/syntax-check-op-and-pane.js
// Data (phase 14b): Blob Worker host · SQL on tabs + SQLite file (sql.js) · fake data · xlsx / docx viewer (SheetJS mini, mammoth); the libraries load into the worker on first use.
// @include js/i18n/en-one-editor-data-sql-office-strings.js
// @include styles/data-sql-fake-office-panes.css
// @include js/core/blob-worker-host.js
// @include js/extras/sql-on-tabs-pure.js
// @include js/extras/sql-on-tabs-op-and-worker.js
// @include js/extras/sql-on-tabs-pane-view.js
// @include js/extras/fake-data-from-json-schema-pure.js
// @include js/extras/fake-data-op-and-pane.js
// @include js/extras/office-xlsx-docx-viewer.js
// @include js/extras/data-files-demos.js
// @include js/extras/power-tools-demos.js
// @include js/extras/power-tools-ops.js
// Log + domain (phase 14c): log merge in a Blob Worker + histogram, FIX order lifecycle + sequence diagram, SWIFT MT dictionary + detail.
// @include js/i18n/en-one-editor-log-domain-strings.js
// @include styles/log-domain-panes.css
// @include js/log/log-merge-timeline-pure.js
// @include js/log/log-merge-op-and-worker.js
// @include js/log/log-merge-pane-view.js
// @include js/log/fix-order-lifecycle-pure.js
// @include js/log/fix-order-lifecycle-op-and-pane.js
// @include js/log/swift-mt-tag-dictionary-data.js
// @include js/log/swift-mt-parse-pure.js
// @include js/log/swift-mt-detail-op-and-pane.js
// @include js/log/log-domain-demos.js
// Dev tools (phase 14d): cURL ⇄ code, X.509 + protobuf decode, OpenAPI docs — pure models + ops / panes.
// @include js/i18n/en-one-editor-devtools-14d-strings.js
// @include styles/curl-x509-openapi-panes.css
// @include js/devtools/curl-parse-and-codegen-pure.js
// @include js/devtools/curl-request-codegen-pure.js
// @include js/devtools/curl-convert-op-and-pane.js
// @include js/devtools/x509-der-decode-pure.js
// @include js/devtools/protobuf-wire-decode-pure.js
// @include js/devtools/x509-protobuf-op-and-pane.js
// @include js/extras/openapi-doc-model-pure.js
// @include js/extras/openapi-doc-op-and-pane.js
// @include js/devtools/curl-x509-protobuf-openapi-demos.js
// Compare / Git (phase 14e): conflict block widget (markers scanned on the main page), unified patch view + apply + export.
// @include js/i18n/en-one-editor-git-14e-strings.js
// @include styles/git-conflict-patch-panes.css
// @include js/editor/git-conflict-resolver.js
// @include js/extras/unified-patch-pure.js
// @include js/extras/unified-patch-op-and-pane.js
// @include js/editor/git-conflict-patch-demos.js
// File + on-device AI (phase 14f): checksum (SHA-1/256/512 native or in a Blob Worker) + sum file check, split / join files, Chrome built-in AI ops.
// @include js/i18n/en-one-editor-file-ai-14f-strings.js
// @include styles/file-checksum-split-join-ai.css
// @include js/extras/file-checksum-sha-pure.js
// @include js/extras/file-split-join-pure.js
// @include js/extras/explorer-file-checksum.js
// @include js/extras/checksum-verify-op-and-pane.js
// @include js/extras/explorer-split-join-files.js
// @include js/devtools/on-device-ai-ops.js
// @include js/extras/file-checksum-demos.js
// Text & list tools + encoders (phase 15a): wrap / join lines, extract URL·e-mail·IP, slug, HTML → text, numbers → words, word frequency, Base32/58/85 · HMAC · UUID v7 / ULID · CIDR · chmod.
// @include js/i18n/en-one-editor-text-utils-15a-strings.js
// @include styles/text-utilities-dialog.css
// @include js/extras/wrap-join-lines-pure.js
// @include js/extras/extract-urls-emails-ips-pure.js
// @include js/extras/slug-and-html-to-text-pure.js
// @include js/extras/number-to-words-vi-en-pure.js
// @include js/extras/word-frequency-pure.js
// @include js/devtools/base-n-hmac-uuid7-cidr-chmod-pure.js
// @include js/extras/text-utility-tools.js
// @include js/extras/text-tool-options-dialog.js
// @include js/devtools/encoder-selection-actions.js
// @include js/extras/text-utilities-demos.js
// Code formatters (phase 15b): gofmt · clang-format · ruff, WASM in a Blob Worker per engine (tools/vendor/code-formatter-*).
// @include js/i18n/en-one-editor-code-formatters-15b-strings.js
// @include js/format/wasm-code-formatters.js
// @include js/format/code-formatter-demos.js
// Explorer tar / gzip (phase 11d): Tar for ExplorerArchive.
// @include js/core/tar-gzip-archive-pure.js
// Explorer find & compare (phase 11e): advanced file search, duplicate files, folder compare + one-way sync for FileTools / the 🔎 tab.
// @include js/core/explorer-folder-compare-pure.js
// @include js/core/explorer-search-duplicates-pure.js
// @include js/extras/explorer-scan-walk.js
// @include js/extras/explorer-advanced-file-search.js
// @include js/extras/explorer-duplicate-file-finder.js
// @include js/extras/explorer-folder-compare.js
// @include js/extras/explorer-folder-sync-apply.js
// Profile backup (phase 14a): export / import settings, library, notes as one .json.gz.
// @include js/core/profile-backup-pure.js
// @include js/workbench/profile-backup-actions.js

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
// @include js/extras/power-tools-demos.js
// @include js/extras/power-tools-ops.js

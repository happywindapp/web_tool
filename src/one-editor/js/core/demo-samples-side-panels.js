// Phase 12 demos for the activity bar panels (Problems, TODO, Timeline, Clipboard) added to DEMOS; content is fake and in English.
(() => {
  const t = (n, text) => ({ n, l: "", t: text });
  const JSON_BAD = `{
  "service": "order-gateway",
  "port": 8443,
  "limits": { "maxQty": 5000, "maxNotional": 2500000, },
  "symbols": ["ACME", "BETA" "GAMMA"]
}
`;
  const YAML_BAD = `pipeline:
  name: nightly-build
  steps:
    - run: npm ci
    - run: npm test
   - run: npm run build
`;
  const JS_TODO = `// order-service.js — demo for the TODO / FIXME panel
const todoList = [];            // not a tag: part of a name

export function place(order) {
  // TODO: validate the price band before sending
  if (!order.qty) throw new Error("qty");
  /* FIXME: rounding drops the last tick */
  const px = Math.round(order.price * 100) / 100;
  todoList.push(order.id); // HACK keep ids until the queue is fixed
  return { ...order, px };   // XXX: remove the spread copy
}
`;
  const MD_TODO = `# Release notes

See TODO.md for the backlog — prose like this is not a tag.

TODO: write the upgrade guide
<!-- BUG: the table below renders twice -->
`;
  const NOTE = ["# Desk checklist", "", "- open the session", "- check limits"];
  Object.assign(DEMOS, {
    "problems-lint": { label: "Problems: lỗi của mọi tab đang mở (⚠ thanh bên)", payload: () => ({ v: 1, views: [[t("gateway-config.json", JSON_BAD)], [t("nightly.yaml", YAML_BAD)]] }),
      after: () => SidePanels.show("problems") },
    "todo-tags": { label: "TODO / FIXME trong code (☑ thanh bên)", payload: () => ({ v: 1, views: [[t("order-service.js", JS_TODO)], [t("release-notes.md", MD_TODO)]] }),
      after: () => SidePanels.show("todo") },
    "clipboard-history": { label: "Lịch sử clipboard: 3 mục mẫu, chỉ trong bộ nhớ (📋 thanh bên)", payload: () => ({ v: 1, views: [[t("scratch.sql", "-- click an item in 📋 to insert it here\n")], []] }),
      after: () => { ["SELECT id, qty FROM orders WHERE qty > 100;", "ACME,BUY,100,25.40\nBETA,SELL,50,61.20", "https://example.com/api/v1/orders?status=open"].forEach(x => ClipHistory.add(x)); SidePanels.show("clipboard"); } },
    // Two snapshots of the note written straight into local history, then the panel.
    "timeline-snapshots": { label: "Timeline: 2 bản lịch sử của ghi chú (🕘 thanh bên)", payload: () => ({ v: 1, views: [[t("desk-checklist.md", [...NOTE, "- close the session", ""].join("\n"))], []] }),
      after: async () => {
        const d = Docs.root(Views.activeDoc());
        await LocalHistory.snap(d, true, NOTE.join("\n") + "\n");
        await LocalHistory.snap(d, true, [...NOTE, "- send the report", ""].join("\n"));
        SidePanels.show("timeline");
      } },
  });
})();

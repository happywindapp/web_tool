// Phase 8b demos (tree, JSONPath / XPath, lint, Rainbow CSV) added to DEMOS; content is fake and in English.
(() => {
  const t = (n, text) => ({ n, l: "", t: text });
  const ORDERS = `{
  "account": { "id": "DEMO-001", "type": "margin", "tags": ["vip", "api"] },
  "orders": [
    { "id": "ORD-1", "symbol": "ACME", "side": "BUY", "qty": 100, "price": 25.4, "status": "FILLED" },
    { "id": "ORD-2", "symbol": "GLOBX", "side": "SELL", "qty": 50, "price": 61.2, "status": "OPEN" },
    { "id": "ORD-3", "symbol": "ACME", "side": "SELL", "qty": 300, "price": 26.1, "status": "FILLED" },
    { "id": "ORD-4", "symbol": "INITECH", "side": "BUY", "qty": 20, "price": 9.75, "status": "CANCELLED" }
  ],
  "updatedAt": 1763630400
}
`;
  const CATALOG = `<?xml version="1.0" encoding="UTF-8"?>
<catalog>
  <book id="b1" lang="en">
    <title>Order Books Explained</title>
    <price currency="USD">29.90</price>
  </book>
  <book id="b2" lang="fr">
    <title>Market Data Basics</title>
    <price currency="EUR">18.50</price>
  </book>
  <book id="b3" lang="en">
    <title>Settlement in Practice</title>
    <price currency="USD">42.00</price>
  </book>
</catalog>
`;
  const YAML_BAD = `service: order-gateway
replicas: 3
env:
  - name: LOG_LEVEL
    value: info
  - name: TIMEOUT_MS
     value: 5000
ports: [8080, 9090
`;
  const CSV = `id,symbol,side,qty,price,venue,note
ORD-1,ACME,BUY,100,25.40,MAIN,"first fill, partial"
ORD-2,GLOBX,SELL,50,61.20,ALT,
ORD-3,ACME,SELL,300,26.10,MAIN,"quoted ""text"" inside"
ORD-4,INITECH,BUY,20,9.75,DARK,cancelled by client
`;
  // A query demo sets the query of its source tab, then runs it (the run button of the pane does the same).
  const query = (name, q) => async () => {
    const src = Views.tabsOf(0).map(Docs.get).filter(d => d && d.kind === "temp" && d.name === name).pop();
    if (!src) return;
    DataOps.state(src.id).q = q;
    await OutputLink.run(src, "query");
  };
  const one = (name, text, run) => () => ({ v: 1, views: [[t(name, text)], []], run });

  Object.assign(DEMOS, {
    "json-tree": { label: "Cây JSON (bấm nút tới dòng, chép JSONPath)", payload: one("orders.json", ORDERS, "tree") },
    "jsonpath": { label: "JSONPath: lệnh FILLED có qty > 50", payload: one("orders-query.json", ORDERS), after: query("orders-query.json", "$.orders[?(@.status == 'FILLED' && @.qty > 50)].id") },
    "xpath": { label: "XPath trên XML", payload: one("catalog.xml", CATALOG), after: query("catalog.xml", "//book[price > 20]/title") },
    "lint-yaml": { label: "YAML lỗi — kiểm lỗi khi gõ (F8 tới lỗi)", payload: one("deploy.yaml", YAML_BAD) },
    "rainbow-csv": { label: "Rainbow CSV (màu theo cột, căn cột)", payload: one("orders.csv", CSV) },
  });
})();

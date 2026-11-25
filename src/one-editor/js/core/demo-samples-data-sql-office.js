// Phase 14b demos: SQL over 2 CSV tabs, a SQLite file and an xlsx made at run time (extras), fake data from a JSON Schema; content is fake and in English.
(() => {
  const t = (n, text) => ({ n, l: "", t: text });
  const ORDERS = "order_id,customer_id,symbol,side,qty,price\n1001,C01,ACME,BUY,500,21.40\n1002,C02,BOLT,SELL,1200,8.15\n1003,C01,CRUX,BUY,300,54.90\n1004,C03,ACME,SELL,200,21.75\n1005,C02,DYNA,BUY,800,12.05\n1006,C04,EVOX,BUY,100,99.50\n1007,C01,BOLT,BUY,700,8.20\n";
  const CUSTOMERS = "customer_id,name,tier,account\nC01,Alex Carter,gold,007001\nC02,Blair Novak,silver,007002\nC03,Casey Lin,silver,007003\nC04,Drew Patel,bronze,007004\n";
  const JOIN = "-- Each open CSV tab is a table: orders, customers\nSELECT c.name, c.tier, COUNT(*) AS orders, SUM(o.qty * o.price) AS notional\nFROM orders o\nJOIN customers c ON c.customer_id = o.customer_id\nGROUP BY c.name, c.tier\nORDER BY notional DESC;\n";
  const SCHEMA = JSON.stringify({
    $schema: "https://json-schema.org/draft/2020-12/schema", title: "Order", type: "object", required: ["orderId", "account", "symbol", "side", "qty", "price", "createdAt"],
    properties: {
      orderId: { type: "string", format: "uuid" }, account: { type: "string", pattern: "^DEMO[0-9]{6}$" }, symbol: { $ref: "#/$defs/ticker" },
      side: { enum: ["BUY", "SELL"] }, qty: { type: "integer", minimum: 100, maximum: 10000, multipleOf: 100 }, price: { type: "number", minimum: 1, maximum: 250 },
      createdAt: { type: "string", format: "date-time" }, trader: { type: "object", properties: { name: { type: "string" }, email: { type: "string", format: "email" } }, required: ["name"] },
      tags: { type: "array", items: { type: "string", enum: ["algo", "care", "dma", "block"] }, maxItems: 2 },
    },
    $defs: { ticker: { type: "string", pattern: "^[A-Z]{3,4}$" } },
  }, null, 2) + "\n";
  const extras = fn => () => PowerTools.use(fn);

  Object.assign(DEMOS, {
    "sql-join": { label: "SQL: JOIN 2 tab CSV (sql.js trong Worker)", payload: () => ({ v: 1, views: [[t("orders.csv", ORDERS), t("customers.csv", CUSTOMERS)], []], run: "sql-query", opts: { query: JOIN } }) },
    "sqlite-db": { label: "SQLite: mở file .db mẫu (bảng + view)", open: extras(() => DataDemos.sqlite()) },
    "fake-data-schema": { label: "Dữ liệu giả từ JSON Schema (seed cố định)", payload: () => ({ v: 1, views: [[t("order.schema.json", SCHEMA)], []], run: "fake-data", opts: { n: 25, seed: "demo", format: "json", mode: "schema" } }) },
    "xlsx-sheets": { label: "xlsx: workbook 3 sheet (tạo bằng SheetJS)", open: extras(() => DataDemos.xlsx()) },
  });
})();

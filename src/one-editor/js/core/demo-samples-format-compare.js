// Phase 2a demos (format, convert, compare) added to DEMOS; content is fake and in English.
(() => {
  const t = (n, text) => ({ n, l: "", t: text });
  const SOH = String.fromCharCode(1);
  const CONFIG_V1 = `# Order gateway settings (sample)
server:
  host: 0.0.0.0
  port: 8080
  timeoutMs: 3000
risk:
  maxOrderValue: 500000000
  allowShortSell: false
venues:
  - MAIN
  - DARK
logging:
  level: INFO
`;
  const CONFIG_V2 = `# Order gateway settings (sample)
server:
  host: 0.0.0.0
  port: 9090
  timeoutMs: 3000
  tls: true
risk:
  maxOrderValue: 750000000
  allowShortSell: false
venues:
  - MAIN
logging:
  level: DEBUG
  file: /var/log/gateway.log
`;
  const JSON_A = `{
  "accountId": "DEMO-001",
  "currency": "VND",
  "limits": { "daily": 1000000000, "perOrder": 200000000 },
  "symbols": ["ACME", "GLOBX"],
  "active": true
}
`;
  const JSON_B = `{
  "active": true,
  "symbols": ["ACME", "GLOBX", "INITECH"],
  "limits": { "perOrder": 250000000, "daily": 1000000000 },
  "currency": "VND",
  "accountId": "DEMO-001"
}
`;
  const MESSY_JS = `const   orders=[{id:"ORD-1",qty:100,price:25400},{id:"ORD-2",qty:50,price:61200}]
function total( list ){return list.reduce((s,o)=>s+o.qty*o.price,0)}
console.log( total(orders) )
`;
  const MESSY_SQL = `select o.order_id,o.symbol,sum(f.qty) as filled_qty from orders o join fills f on f.order_id=o.order_id where o.trade_date='2026-11-18' and o.status in ('FILLED','PARTIAL') group by o.order_id,o.symbol order by filled_qty desc`;
  const BROKEN_JSON = `{
  // settlement instruction (sample)
  'account': "DEMO-002",
  "amount": 125000000,
  "currency": "VND",,
  "valueDate": "2026-11-20",
}
`;
  const FIX_MSG = ["8=FIX.4.4", "9=148", "35=D", "49=DEMO_CLIENT", "56=DEMO_BROKER", "34=12", "52=20261118-02:15:00.000", "11=ORD-1001", "55=ACME", "54=1", "38=100", "40=2", "44=25400", "59=0", "10=128"].join(SOH) + SOH + "\n";
  const MESSY_GO = `package main

import "fmt"

func main() {
fmt.Println("orders")
    for i := 0; i < 3; i++ {
  fmt.Println(i)
        }
}
`;
  const TRADE_JSON = `{"tradeId":"T-20261118-0042","symbol":"ACME","side":"BUY","qty":300,"price":25400.5,"fills":[{"qty":200,"venue":"MAIN"},{"qty":100,"venue":null,"fee":12.5}],"account":{"id":"DEMO-001","type":"cash"},"settled":false}`;
  const PAGE_HTML = `<h1>Release notes</h1>
<p>Version <strong>2.4</strong> adds <em>faster</em> order routing and <del>legacy</del> cleanup.</p>
<ul><li><input type="checkbox" checked> Route by venue</li><li><input type="checkbox"> Retry on reject</li></ul>
<table><thead><tr><th>Venue</th><th>Latency (ms)</th></tr></thead><tbody><tr><td>MAIN</td><td>4</td></tr><tr><td>DARK</td><td>7</td></tr></tbody></table>
<pre><code class="language-json">{ "route": "MAIN", "retry": 2 }</code></pre>
<p>See <a href="https://example.com/docs">the docs</a>.</p>
`;

  Object.assign(DEMOS, {
    "compare": { label: "So sánh 2 file ở 2 view", payload: () => ({ v: 1, views: [[t("gateway-v1.yaml", CONFIG_V1)], [t("gateway-v2.yaml", CONFIG_V2)]], compare: true }) },
    "compare-json": { label: "So sánh JSON theo cấu trúc", payload: () => ({ v: 1, views: [[t("account-a.json", JSON_A)], [t("account-b.json", JSON_B)]], compare: "json" }) },
    "format-mixed": { label: "Format nhiều ngôn ngữ (JS, SQL, JSON lỗi, FIX, Go)", payload: () => ({ v: 1, views: [[t("messy.js", MESSY_JS), t("report.sql", MESSY_SQL), t("instruction.json", BROKEN_JSON), t("new-order.fix", FIX_MSG), t("main.go", MESSY_GO)], []], run: "format" }) },
    "json-to-types": { label: "JSON → Go struct (và TS / C# / Java / C++)", payload: () => ({ v: 1, views: [[t("trade.json", TRADE_JSON)], []], run: "to-go" }) },
    "html-to-md": { label: "HTML → Markdown (bảng, task list, code)", payload: () => ({ v: 1, views: [[t("release-notes.html", PAGE_HTML)], []], run: "html-to-md" }) },
  });
  // Phase 15b content: js/format/code-formatter-demos.js (extras).
  for (const [k, label] of [["format-go", "Format Go (gofmt, có tab lỗi)"], ["format-cpp-clang", "Format C++ · Java · C# (clang-format Google)"], ["format-python-ruff", "Format Python (ruff, có tab lỗi)"]]) DEMOS[k] = { label, lazy: true };
})();

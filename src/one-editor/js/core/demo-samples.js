// Demo payloads (same shape as a share link) for the "Thử mẫu…" dropdown and ?demo=<key>; content is fake and in English.
const DEMOS = (() => {
  const ORDERS_JS = `// Order book helpers (sample)
const FEE_RATE = 0.0015;

export function orderValue(order) {
  return order.qty * order.price;
}

export const withFee = order => {
  const value = orderValue(order);
  return { ...order, value, fee: Math.round(value * FEE_RATE) };
};

const orders = [
  { id: "ORD-1001", side: "BUY", symbol: "ACME", qty: 100, price: 25400 },
  { id: "ORD-1002", side: "SELL", symbol: "GLOBX", qty: 50, price: 61200 },
];

console.log(orders.map(withFee));
`;
  const TRADE_JSON = `{"tradeId":"T-20261118-0042","symbol":"ACME","side":"BUY","qty":300,"price":25400,"fills":[{"qty":200,"price":25400,"venue":"MAIN"},{"qty":100,"price":25400,"venue":"MAIN"}],"account":{"id":"DEMO-001","type":"cash"},"settled":false}`;
  const BROKEN_JSON = `{
  "tradeId": "T-20261118-0043",
  "symbol": "GLOBX",
  "qty": 120,
  "price": 61200,
  "tags": ["swing", "demo"],,
  "note": "two commas above make this invalid"
}
`;
  const README_MD = `# Demo project

Tabs in **View 1** and **View 2** were detected by name or by content:

- \`app.py\` → Python (extension)
- \`snippet\` → Go (content, no extension)
- \`deploy\` → Shell (shebang)

Change the language from the toolbar if a guess is wrong.
`;
  const APP_PY = `import json
from pathlib import Path


class Portfolio:
    def __init__(self, positions):
        self.positions = positions

    def total(self) -> float:
        return sum(p["qty"] * p["price"] for p in self.positions)


if __name__ == "__main__":
    data = json.loads(Path("positions.json").read_text())
    print(Portfolio(data).total())
`;
  const SNIPPET_GO = `package main

import (
	"fmt"
	"strings"
)

func main() {
	symbols := []string{"ACME", "GLOBX", "INITECH"}
	fmt.Println(strings.Join(symbols, ", "))
}
`;
  const QUERY_SQL = `SELECT o.symbol, SUM(o.qty * o.price) AS turnover
FROM orders o
JOIN accounts a ON a.id = o.account_id
WHERE o.trade_date = '2026-11-18'
GROUP BY o.symbol
ORDER BY turnover DESC;
`;
  const CONFIG_YAML = `service: order-gateway
port: 8080
log:
  level: info
  format: json
venues:
  - MAIN
  - DARK
`;
  const DEPLOY_SH = `#!/usr/bin/env bash
set -euo pipefail
echo "Building order-gateway"
docker build -t order-gateway:demo .
docker run --rm -p 8080:8080 order-gateway:demo
`;
  const GUIDE_MD = `# One Editor quick guide

## Views
Open a file in **View 1**, run an operation, and the result appears in **View 2** as a linked tab (\`name ⇢ operation\`).

## Saving
| Tab | Where it lives |
| --- | --- |
| Note | This browser (IndexedDB), saved as you type |
| File | Your disk: Ctrl+S writes back, or downloads a copy |

> Drop files or a folder onto a view to open them.

\`\`\`json
{ "tip": "Ctrl+Enter runs the selected operation" }
\`\`\`
`;
  function largeLog() {
    const lines = [], lv = ["INFO", "DEBUG", "WARN", "INFO", "ERROR"];
    for (let i = 0; i < 50000; i++) {
      const s = String(i % 60).padStart(2, "0"), m = String(Math.floor(i / 60) % 60).padStart(2, "0");
      lines.push("2026-11-18 09:" + m + ":" + s + "." + String(i % 1000).padStart(3, "0") + " " + lv[i % 5] + " order-gateway seq=" + i + " symbol=ACME qty=" + (i % 900 + 100));
    }
    return lines.join("\n") + "\n";
  }

  const t = (n, text) => ({ n, l: "", t: text });
  const LIST = {
    "js": { label: "JavaScript", payload: () => ({ v: 1, views: [[t("orders.js", ORDERS_JS)], []] }) },
    "output-link": { label: "JSON ⇢ JSON đẹp ở View 2", payload: () => ({ v: 1, views: [[t("trade.json", TRADE_JSON)], []], run: "json-pretty" }) },
    "json-broken": { label: "JSON lỗi (báo dòng lỗi)", payload: () => ({ v: 1, views: [[t("broken-trade.json", BROKEN_JSON)], []], run: "json-pretty" }) },
    "multi-tab": { label: "Nhiều tab, tự nhận diện ngôn ngữ", payload: () => ({ v: 1, views: [[t("README.md", README_MD), t("app.py", APP_PY), t("snippet", SNIPPET_GO)], [t("query.sql", QUERY_SQL), t("config.yaml", CONFIG_YAML), t("deploy", DEPLOY_SH)]] }) },
    "split-2x2": { label: "Lưới 2×2, 4 view", payload: () => ({ v: 1, layout: "4g", views: [[t("orders.js", ORDERS_JS)], [t("query.sql", QUERY_SQL)], [t("app.py", APP_PY)], [t("config.yaml", CONFIG_YAML)]] }) },
    "markdown": { label: "Markdown", payload: () => ({ v: 1, views: [[t("guide.md", GUIDE_MD)], []], wrap: true }) },
    "large": { label: "File lớn 50.000 dòng", payload: () => ({ v: 1, views: [[t("large-50k.log", largeLog())], []] }) },
  };
  return LIST;
})();

// Phase 9 demo content (labels in demo-samples-power-tools.js): fake data in English; after() runs the follow-up step (dialog, conversion, run).
const PowerDemos = (() => {
  const t = (n, text) => ({ n, l: "", t: text });
  const one = (name, text, run, opts) => () => ({ v: 1, views: [[t(name, typeof text === "function" ? text() : text)], []], run, opts });
  const C = String.fromCharCode, TAB = C(9);
  const view = () => Views.activeView();
  const selectText = s => { const v = view(), at = v.state.doc.toString().indexOf(s); if (at >= 0) v.dispatch({ selection: { anchor: at, head: at + s.length } }); };

  const CRON = `# Cron jobs (sample) - one expression per line, # starts a comment
MAILTO=ops@example.com
*/15 9-17 * * 1-5   /opt/jobs/sync-quotes.sh
0 2 * * *           /opt/jobs/nightly-settlement.sh --full
@weekly             /opt/jobs/rotate-logs.sh
# Quartz / Spring (seconds first, ? = no specific value, L = last, # = nth weekday)
0 0/30 8-18 ? * MON-FRI
0 15 10 L * ?
0 0 9 ? * 6#3
`;
  const ORDERS_CSV = `order_id,symbol,side,qty,price,trader,note
1001,ACME,BUY,100,25400,O'Brien,
1002,GLOBX,SELL,50,61200,Zoë Martin,"partial fill, retry"
1003,INITECH,BUY,0075,12.5,Ana Silva,leading zero stays text
`;
  const ORDERS_JSON = `[
  { "id": 1001, "symbol": "ACME", "qty": 100, "price": 25400.5, "placedAt": "2026-11-20T09:30:00Z", "trader": { "email": "demo.trader@example.com", "desk": "EQ" }, "tags": ["swing"] },
  { "id": 1002, "symbol": "GLOBX", "qty": 50, "price": 61200, "placedAt": "2026-11-20T10:05:12Z", "trader": { "email": "zoe@example.com" }, "tags": [], "note": null }
]
`;
  const LOG = `2026-11-20 09:30:01	INFO	order accepted id=1001
2026-11-20 09:30:02	ERROR	risk check failed id=1002
2026-11-20 09:30:02	DEBUG	cache hit symbol=ACME
2026-11-20 09:30:05	WARN	slow response 812ms
`;
  const UNICODE = () => "Copy-pasted text with hidden characters (fake data):\n"
    + "order" + C(0x200b) + "_id = 1001" + C(0xa0) + " # zero-width space + no-break space\n"
    + "8=FIX.4.4" + C(1) + "35=D" + C(1) + "55=ACME" + C(1) + "10=000" + C(1) + "  # SOH delimiters\n"
    + "status = " + C(0xfeff) + "FILLED  # BOM in the middle of the file\n"
    + "file = invoice_" + C(0x202e) + "fdp.exe  # right-to-left override\n"
    + "domain = p" + C(0x430) + "ypal.example.com  # Cyrillic a inside a Latin word\n";
  const MD = `# Release notes

## Summary
Orders and settlement changes for the sample desk.

## Fees
|Market|Fee|Note|
|-|-:|-|
|MAIN|0.15%|equities|
|DARK|0.2%|block trades only|

## Volumes (pasted from Excel)
Symbol${TAB}Orders${TAB}Turnover
ACME${TAB}1200${TAB}30480000
GLOBX${TAB}315${TAB}19278000

## Next steps
### Testing
### Rollout
`;

  // A fake fill event, gzipped then Base64-encoded, as it often sits in a log line.
  const GZ = "H4sIAAAAAAAACl2MwQqCQBRF/+Wun/FmJKO3jCICQagWUbSo5gWCZs1MgYj/HmKrlvecw+2gH31ECBrv1E/uZVWpA41z4yAotsvEMFsQQltfmwqCdV4sDgMonUKwW+U5CK/YQqZMePryppDMWGbC8Bkgp24M0r+gp5+w/+JMiP7i1EPgtG6Sd1APQgwQWLZZYkxiec9zSY3w7Ij+C10Tp8rQAAAA";
  const RECIPE = [{ op: "b64dec" }, { op: "gunzip" }, { op: "json" }];

  const REGEX = `ORDER ACME=100 price=25400 side=BUY
ORDER GLOBX=50 price=61200 side=SELL
CANCEL INITECH=75 price=12500 side=BUY
note: lowercase abc=1 does not match
`;
  const TAG = "scr" + "ipt";
  const HTML = `<!doctype html>
<html>
<head>
<style>
  body { font-family: system-ui, sans-serif; margin: 16px; }
  .card { border: 1px solid #94a3b8; border-radius: 8px; padding: 12px; max-width: 320px; }
  button { padding: 6px 12px; }
</style>
</head>
<body>
  <div class="card">
    <h3>Order ticket (demo)</h3>
    <p>Total: <b id="total">0</b></p>
    <button id="add">Add 100 shares</button>
  </div>
  <${TAG}>
    let qty = 0;
    const price = 25400;
    document.getElementById("add").onclick = () => {
      qty += 100;
      document.getElementById("total").textContent = (qty * price).toLocaleString("en-US");
      console.log("qty", qty, { value: qty * price });
    };
    console.info("page ready");
    console.warn("prices are fake");
    fetch("https://example.com/api").catch(e => console.error("network is blocked:", e.message));
    missingFunction(); // throws: the error shows its line
  </${TAG}>
</body>
</html>
`;
  const CODE = `// Fee calculator (sample) - exported as an image with the theme you pick
export interface Order { symbol: string; qty: number; price: number }

const FEE_RATE = 0.0015;

export function fee(order: Order): number {
  const value = order.qty * order.price;
  return Math.max(Math.round(value * FEE_RATE), 1_000); // minimum fee
}
`;
  const JS = `// Runs in a Worker inside the sandbox: console only, no DOM, no network.
const orders = [{ id: 1, qty: 100, price: 25400 }, { id: 2, qty: 50, price: 61200 }];
const total = orders.reduce((s, o) => s + o.qty * o.price, 0);
console.log("orders", orders);
console.log("total", total);
setTimeout(() => console.info("timer fired"), 100);

// An endless loop: the sandbox stops it after 5 seconds.
setTimeout(() => { while (true) {} }, 300);
`;

  return {
    "regex": { payload: one("orders.log", REGEX, "regex"), after: () => OutputLink.run(Views.activeDoc(), "regex") },
    "code-image": { payload: one("fees.ts", CODE, "code-image") },
    "run-html": { payload: one("ticket.html", HTML), after: () => OutputLink.run(Views.activeDoc(), "run-code") },
    "run-js": { payload: one("totals.js", JS), after: () => OutputLink.run(Views.activeDoc(), "run-code") },
    "recipe-base64-gzip-json": { payload: one("payload.b64", GZ + "\n", "recipe", RECIPE) },
    "cron": { payload: one("crontab.txt", CRON, "cron") },
    "sql-from-data": { payload: one("orders.csv", ORDERS_CSV, "sql-insert") },
    "json-schema": { payload: one("orders.json", ORDERS_JSON, "json-schema") },
    "batch-replace": { payload: one("gateway.log", LOG), after: () => BatchUi.open([
      { find: TAB, repl: " | " }, { find: "(\\d{4})-(\\d{2})-(\\d{2})", repl: "$3/$2/$1", regex: true },
      { find: "ERROR", repl: "ERR", matchCase: true, word: true }, { on: false, find: "^.*DEBUG.*\\n", repl: "", regex: true },
    ]) },
    "unicode-invisible": { payload: one("pasted.txt", UNICODE, "invisible") },
    "markdown-table": { payload: one("release-notes.md", MD), after: () => {
      selectText("Symbol" + TAB + "Orders" + TAB + "Turnover\nACME" + TAB + "1200" + TAB + "30480000\nGLOBX" + TAB + "315" + TAB + "19278000\n");
      MdActions.toTable().then(() => { view().dispatch({ selection: { anchor: 0 } }); MdActions.align(); const v = view(); v.dispatch({ selection: { anchor: v.state.doc.line(3).from } }); MdActions.toc(); });
    } },
  };
})();

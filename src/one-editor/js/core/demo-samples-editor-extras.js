// Phase 8d demos (Emmet, colours, Outline / breadcrumbs) added to DEMOS; content is fake and in English.
(() => {
  const t = (n, text) => ({ n, l: "", t: text });
  const HTML = `<!-- Put the cursor after an abbreviation and press Ctrl+E (or Tab while it is underlined) -->
<style>
  .card { color: #0e7490; border: 1px solid rgb(203, 213, 225); background: hsl(48, 96%, 89%); }
</style>
ul.orders>li.order*3>span.symbol{ACME}+span.qty{100}
`;
  const GUIDE = `# Trading desk handbook

## Orders
### Limit orders
Prices are checked against the daily band.
### Market orders
Filled at the best price.

## Settlement
### Cash
T+2 for equities.
### Securities
Moved by the depository.

## Risk
Limits are checked before an order is stored.
`;
  const LOG = `09:00:01 INFO  session opened user=demo
09:00:04 INFO  order accepted id=A1001 ACME buy 100 @ 12.50
09:00:07 WARN  price outside band id=A1002 ACME sell 50 @ 19.00
09:00:09 INFO  order accepted id=A1003 BETA buy 200 @ 7.10
09:00:12 ERROR risk limit exceeded id=A1004 BETA buy 9000 @ 7.12
09:00:15 INFO  order filled id=A1001 qty=100
09:00:18 INFO  order filled id=A1003 qty=200
09:00:21 INFO  session closed
`;
  const CFG = `{
  "desk": "demo",
  "limits": {
    "maxOrderQty": 5000,
    "priceBandPct": 7
  },
  "symbols": ["ACME", "BETA"]
}
`;
  Object.assign(DEMOS, {
    bookmarks: { label: "Bookmark nhiều tab (🔖 thanh bên)", payload: () => ({ v: 1, views: [[t("orders.log", LOG)], [t("desk-config.json", CFG)]] }),
      after: () => { BookmarkList.set(Views.activeDoc(0), [3, 5]); BookmarkList.set(Views.activeDoc(1), [4]); SidePanels.show("bookmarks"); } },
    "emmet-html": { label: "Emmet + ô màu CSS (Ctrl+E)", payload: () => ({ v: 1, views: [[t("orders.html", HTML)], []] }),
      after: () => { const v = Views.activeView(); v.dispatch({ selection: { anchor: v.state.doc.length - 1 } }); v.focus(); } },
    "outline-md": { label: "Outline + breadcrumbs (Markdown)", payload: () => ({ v: 1, views: [[t("handbook.md", GUIDE)], []] }),
      after: () => { SidePanels.show("outline"); EditorExtras.use(() => { if (!Aids.settings().crumbs) Aids.toggle("crumbs"); }); const v = Views.activeView(); v.dispatch({ selection: { anchor: v.state.doc.toString().indexOf("T+2") } }); } },
  });
})();

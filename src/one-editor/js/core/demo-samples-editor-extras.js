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
  Object.assign(DEMOS, {
    "emmet-html": { label: "Emmet + ô màu CSS (Ctrl+E)", payload: () => ({ v: 1, views: [[t("orders.html", HTML)], []] }),
      after: () => { const v = Views.activeView(); v.dispatch({ selection: { anchor: v.state.doc.length - 1 } }); v.focus(); } },
    "outline-md": { label: "Outline + breadcrumbs (Markdown)", payload: () => ({ v: 1, views: [[t("handbook.md", GUIDE)], []] }),
      after: () => { SideBar.show("outline"); const v = Views.activeView(); v.dispatch({ selection: { anchor: v.state.doc.toString().indexOf("T+2") } }); } },
  });
})();

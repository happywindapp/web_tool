// Phase 3b demos (Markdown, HTML, SVG, tables, draw.io previews) added to DEMOS; content is fake and in English.
(() => {
  const t = (n, text) => ({ n, l: "", t: text }), F = "```", S = "scr" + "ipt";
  const MD = `# Release notes — Order service 2.4

Short summary with **bold**, *italic*, \`inline code\`, ~~old text~~ and a [link to the spec](https://example.com/spec).

## Contents
- [Flow](#flow)
- [Checklist](#checklist)
- [Fees](#fees)
- [Channels](#channels)

## Flow

The order goes through a risk check before it is stored.

${F}mermaid
flowchart LR
  A[Client] --> B[Order API]
  B --> C{Risk ok?}
  C -- yes --> D[(Orders DB)]
  C -- no --> E[Reject]
${F}

## Checklist
- [x] API changes merged
- [x] UAT sign-off
- [ ] Production deploy

## Fees

| Channel | Orders | Fee (%) |
|:--------|-------:|:-------:|
| Web     | 420    | 0.15    |
| Mobile  | 310    | 0.15    |
| Partner | 150    | 0.10    |

> **Note:** raw HTML is shown as text, never run:
> <${S}>alert("hi")</${S}> <img src=x onerror=alert(1)>
> and [this link](javascript:alert(1)) is dropped.

${F}js
// code blocks keep their text
const total = orders.reduce((sum, o) => sum + o.qty, 0);
${F}

## Channels

${F}mermaid
pie title Orders by channel
  "Web" : 420
  "Mobile" : 310
  "Partner" : 150
${F}

1. Build the release branch
2. Verify on UAT with the business date of the next session
3. Ship and watch the order queue for one hour

Each step has an owner and a rollback plan. If the order queue grows for more than ten minutes, stop the rollout and switch back.

---
_End of notes._
`;
  const HTML = `<!doctype html>
<html>
<head>
<style>
  body { font-family: system-ui, sans-serif; margin: 24px; color: #164e63; }
  .card { border: 1px solid #94a3b8; border-radius: 8px; padding: 12px 16px; max-width: 420px; }
  button { padding: 6px 12px; }
</style>
</head>
<body>
  <h1>Order summary</h1>
  <div class="card">
    <p>Order <b>ORD-1001</b> — 3 items, total <b>129.50 USD</b>.</p>
    <button id="btn">Count clicks</button>
    <span id="out">Scripts are off — use the script button above the preview.</span>
  </div>
  <${S}>
    let n = 0;
    document.getElementById("out").textContent = "Scripts are on.";
    document.getElementById("btn").onclick = () => { document.getElementById("out").textContent = "Clicked " + (++n) + " time(s)."; };
  </${S}>
</body>
</html>
`;
  const SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="260" height="130" viewBox="0 0 260 130">
  <!-- the style below stays inside the preview: body{display:none} cannot hide the page -->
  <style>.box { fill: #164e63; } .t { fill: #fff; font: bold 22px sans-serif; } body { display: none; }</style>
  <rect class="box" x="10" y="10" width="240" height="110" rx="16"/>
  <circle cx="44" cy="65" r="16" fill="#f59e0b"/>
  <text class="t" x="145" y="73" text-anchor="middle">One Editor</text>
</svg>
`;
  const CSV = `order_id,customer,channel,qty,price
ORD-1001,Acme Corp,Web,3,43.20
ORD-1002,Globex,Mobile,1,129.00
ORD-1003,"Initech, Ltd",Partner,12,8.75
ORD-1004,Umbrella,Web,5
ORD-1005,Hooli,Mobile,2,64.10
`;
  const JSON_TEXT = `[
  { "id": "ORD-1001", "status": "filled", "qty": 3, "tags": ["web", "priority"] },
  { "id": "ORD-1002", "status": "pending", "qty": 1, "note": null },
  { "id": "ORD-1003", "status": "rejected", "qty": 12, "reason": { "code": "RISK", "text": "limit exceeded" } }
]
`;
  const DRAWIO = `<mxfile>
  <diagram name="Flow">
    <mxGraphModel>
      <root>
        <mxCell id="0"/>
        <mxCell id="1" parent="0"/>
        <mxCell id="2" value="Order API" style="rounded=1;whiteSpace=wrap;" vertex="1" parent="1">
          <mxGeometry x="40" y="40" width="120" height="50" as="geometry"/>
        </mxCell>
        <mxCell id="3" value="Orders DB" style="shape=cylinder3;whiteSpace=wrap;" vertex="1" parent="1">
          <mxGeometry x="240" y="30" width="80" height="70" as="geometry"/>
        </mxCell>
        <mxCell id="4" edge="1" parent="1" source="2" target="3">
          <mxGeometry relative="1" as="geometry"/>
        </mxCell>
      </root>
    </mxGraphModel>
  </diagram>
</mxfile>
`;
  const one = (name, text) => () => ({ v: 1, views: [[t(name, text)], []], run: "preview" });
  async function previewBoth() {
    const srcs = Views.tabsOf(0).map(Docs.get).filter(d => d && d.kind === "temp" && /\.(csv|json)$/.test(d.name)).slice(-2);
    for (const d of srcs) await OutputLink.run(d, "preview");
  }

  Object.assign(DEMOS, {
    "markdown-mermaid": { label: "Preview: Markdown + khối mermaid", payload: one("release-notes.md", MD) },
    "html": { label: "Preview: HTML (script tắt, bấm để bật)", payload: one("order-summary.html", HTML) },
    "svg": { label: "Preview: SVG", payload: one("badge.svg", SVG) },
    "table": { label: "Preview: bảng CSV + JSON", payload: () => ({ v: 1, views: [[t("orders.csv", CSV), t("orders.json", JSON_TEXT)], []] }), after: previewBoth },
    "drawio": { label: "Preview: draw.io (cần bấm kết nối)", payload: one("flow.drawio", DRAWIO) },
  });
})();

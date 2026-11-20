// Phase 3 demos (diagram / chart previews) added to DEMOS; content is fake and in English.
(() => {
  const t = (n, text) => ({ n, l: "", t: text });
  const FLOW = `flowchart LR
  A[Customer] --> B{Cart valid?}
  B -- yes --> C[Reserve stock]
  B -- no --> D[Show errors]
  C --> E[(Orders DB)]
  C --> F[Payment gateway]
  F -->|approved| G[Send receipt]
  F -->|declined| D
`;
  const BROKEN = `flowchart TD
  A[Order received] --> B[Check stock]
  B --> C{In stock?}
  C -->|yes E[Ship parcel]
  C -- no --> D[Back-order]
`;
  const PIE = `pie showData
  title Orders by channel (sample)
  "Web" : 420
  "Mobile app" : 310
  "Partner API" : 150
  "Call center" : 45
`;
  const XY = `xychart-beta
  title "Monthly revenue (sample, k USD)"
  x-axis [Jan, Feb, Mar, Apr, May, Jun]
  y-axis "Revenue" 0 --> 140
  bar [52, 61, 78, 90, 104, 121]
  line [48, 58, 70, 85, 99, 117]
`;
  const SANKEY = `sankey-beta

Visits,Product page,1200
Visits,Search,800
Product page,Cart,540
Search,Cart,260
Cart,Checkout,520
Cart,Abandoned,280
Checkout,Paid,470
Checkout,Failed,50
`;
  const GANTT = `gantt
  title Release plan (sample)
  dateFormat YYYY-MM-DD
  section Build
    API changes :a1, 2026-12-01, 6d
    UI changes  :a2, after a1, 5d
  section Verify
    UAT         :b1, after a2, 4d
    Fix round   :b2, after b1, 3d
  section Ship
    Release     :milestone, m1, after b2, 0d
`;
  const SEQ = `@startuml
actor Trader
participant "Order API" as API
participant "Risk check" as Risk
database "Order store" as DB
Trader -> API : POST /orders
API -> Risk : validate(order)
Risk --> API : ok
API -> DB : insert
DB --> API : id = ORD-1001
API --> Trader : 201 Created
@enduml
`;
  const D2 = `direction: right
user: Customer {shape: person}
web: Web app
api: Order API
db: Orders DB {shape: cylinder}
queue: Event queue {shape: queue}
user -> web: HTTPS
web -> api: REST
api -> db: SQL
api -> queue: order.created
`;
  const DBML = `Table customers {
  id int [pk, increment]
  name varchar [not null]
  email varchar [unique]
}

Table orders {
  id int [pk, increment]
  customer_id int [ref: > customers.id]
  status varchar
  created_at timestamp
}

Table order_items {
  order_id int [ref: > orders.id]
  sku varchar
  qty int
  price decimal
}
`;
  const one = (name, text) => () => ({ v: 1, views: [[t(name, text)], []], run: "preview" });
  // Each chart tab gets its own preview; the first one ends up shown.
  async function previewAll() {
    const srcs = Views.tabsOf(0).map(Docs.get).filter(d => d && /\.mmd$/.test(d.name) && d.kind === "temp").slice(-4);
    for (const d of srcs) await OutputLink.run(d, "preview");
    const first = srcs[0] && Docs.list().find(d => PreviewPane.isPreview(d) && d.link.src === srcs[0].id);
    if (first) Views.open(first, Views.where(first.id), false);
  }

  Object.assign(DEMOS, {
    "mermaid-flow": { label: "Preview: Mermaid flowchart", payload: one("checkout-flow.mmd", FLOW) },
    "mermaid-chart": { label: "Preview: chart Mermaid (pie, xychart, sankey, gantt)", payload: () => ({ v: 1, views: [[t("orders-by-channel.mmd", PIE), t("monthly-revenue.mmd", XY), t("checkout-funnel.mmd", SANKEY), t("release-plan.mmd", GANTT)], []] }), after: previewAll },
    "mermaid-error": { label: "Preview: Mermaid lỗi cú pháp (báo dòng lỗi)", payload: one("broken-flow.mmd", BROKEN) },
    "plantuml-seq": { label: "Preview: PlantUML sequence", payload: one("place-order.puml", SEQ) },
    "d2": { label: "Preview: D2 kiến trúc", payload: one("architecture.d2", D2) },
    "dbml": { label: "Preview: DBML sơ đồ bảng", payload: one("shop.dbml", DBML) },
  });
})();

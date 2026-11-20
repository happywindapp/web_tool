// Phase 8a demos (log colours + line filter, FIX colours + hover) added to DEMOS; content is fake and in English.
(() => {
  const t = (n, text) => ({ n, l: "", t: text });
  const LOG = `2026-11-20 09:15:00.120 INFO  order-gateway started on 10.0.4.17:8443 build="2.4.1"
2026-11-20 09:15:02.381 DEBUG session 6f1c2a9e-4b7d-4c1e-9a33-2b8f0d5e7a10 opened for DEMO-001
2026-11-20 09:15:03.004 INFO  order ORD-1001 accepted qty=100 price=25.40
2026-11-20 09:15:03.510 WARN  risk limit at 92% for account DEMO-001
2026-11-20 09:15:04.002 INFO  order ORD-1002 accepted qty=50 price=61.20
2026-11-20 09:15:04.877 ERROR order ORD-1003 rejected: price outside the daily band (code=E1024)
2026-11-20 09:15:05.100 INFO  heartbeat ok latency=4ms
2026-11-20 09:15:06.450 ERROR upstream 10.0.9.2:9000 timeout after 3000 ms, retry 1/3
2026-11-20 09:15:07.012 INFO  upstream reconnected
2026-11-20 09:15:08.300 DEBUG cache hit ratio=0.97
`;
  const FIX = `8=FIX.4.4|9=148|35=D|34=1080|49=CLIENT01|52=20261120-09:15:03.004|56=BROKER|11=ORD-1001|21=1|38=100|40=2|44=25.40|54=1|55=ACME|59=0|60=20261120-09:15:03|10=128|
8=FIX.4.4|9=162|35=8|34=2211|49=BROKER|52=20261120-09:15:03.120|56=CLIENT01|6=0|11=ORD-1001|14=0|17=EXEC-1|37=OID-77|39=0|54=1|55=ACME|150=0|151=100|10=045|
8=FIX.4.4|9=171|35=8|34=2212|49=BROKER|52=20261120-09:15:04.877|56=CLIENT01|6=0|11=ORD-1003|14=0|17=EXEC-2|37=NONE|39=8|54=2|55=GLOBX|58=Price outside band|150=8|151=0|10=201|
`;
  const one = (name, text, run) => () => ({ v: 1, views: [[t(name, text)], []], run });

  Object.assign(DEMOS, {
    "log-filter": { label: "Log: màu + lọc ERROR|WARN (±1 dòng)", payload: one("order-gateway.log", LOG), after: async () => {
      const src = Views.tabsOf(0).map(Docs.get).filter(d => d && d.kind === "temp" && d.name === "order-gateway.log").pop();
      if (!src) return;
      await DataOps.load();
      Object.assign(LineFilter.state(src.id), { q: "ERROR|WARN", regex: true, cs: false, invert: false, ctx: 1 });
      await OutputLink.run(src, "filter");
    } },
    "fix-hover": { label: "FIX: màu theo nhóm tag, rê chuột xem nghĩa", payload: one("orders.fix", FIX) },
  });
})();

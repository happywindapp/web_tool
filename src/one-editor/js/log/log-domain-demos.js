// Phase 14c demo content (labels in demo-samples-log-domain.js): 3 logs with skewed clocks + a stack trace, a FIX order New → Replace → Partial → Filled + one odd status, MT540 + a broken copy; all fake.
Object.assign(PowerDemos, (() => {
  const t = (n, text) => ({ n, l: "", t: text });
  const GATEWAY = `2026-11-20 02:30:00.105 INFO  [gw] FIX session logon BROKER
2026-11-20 02:30:01.220 INFO  [gw] NewOrderSingle clOrdId=ORD-1001 symbol=ACME qty=500
2026-11-20 02:30:01.480 INFO  [gw] ExecutionReport clOrdId=ORD-1001 orderId=OID-77 status=NEW
2026-11-20 02:30:03.010 WARN  [gw] slow ack 812ms clOrdId=ORD-1002
2026-11-20 02:30:04.900 ERROR [gw] reject clOrdId=ORD-1002 reason=PRICE_BAND
2026-11-20 02:31:10.000 INFO  [gw] heartbeat
2026-11-20 02:32:00.300 INFO  [gw] ExecutionReport clOrdId=ORD-1001 orderId=OID-77 status=FILLED
`;
  const OMS = `20/11/2026 09:30:01.300 INFO  OMS received order orderId=OID-77 clOrdId=ORD-1001 account=DEMO000123
20/11/2026 09:30:01.350 DEBUG OMS risk request requestId=REQ-9001 orderId=OID-77
20/11/2026 09:30:04.850 ERROR OMS order failed clOrdId=ORD-1002
java.lang.IllegalStateException: price outside band
    at demo.oms.PriceBand.check(PriceBand.java:42)
    at demo.oms.OrderService.place(OrderService.java:118)
20/11/2026 09:32:00.250 INFO  OMS fill orderId=OID-77 qty=500 px=21.40
`;
  const RISK = `02:30:03.850 INFO  risk check start requestId=REQ-9001
02:30:03.900 INFO  risk check ok requestId=REQ-9001 limit=50000
02:30:07.300 WARN  risk limit near 90% account=DEMO000123
02:31:30.000 INFO  risk recalculated exposures
`;
  const fix = (seq, from, to, time, body) => `8=FIX.4.4|9=100|35=${body[0]}|34=${seq}|49=${from}|52=20261120-${time}|56=${to}|${body[1]}|10=000|`;
  const C = "CLIENT01", B = "BROKER";
  const FIX = [
    fix(11, C, B, "02:30:01.220", ["D", "11=ORD-2001|38=1000|40=2|44=21.40|54=1|55=ACME|60=20261120-02:30:01.220"]),
    fix(21, B, C, "02:30:01.480", ["8", "6=0|11=ORD-2001|14=0|17=EX-1|37=OID-501|38=1000|39=0|54=1|55=ACME|150=0|151=1000"]),
    fix(12, C, B, "02:30:20.010", ["G", "11=ORD-2002|41=ORD-2001|37=OID-501|38=1000|40=2|44=21.50|54=1|55=ACME|60=20261120-02:30:20.010"]),
    fix(22, B, C, "02:30:20.200", ["8", "6=0|11=ORD-2002|41=ORD-2001|14=0|17=EX-2|37=OID-501|38=1000|39=0|44=21.50|54=1|55=ACME|150=5|151=1000"]),
    fix(23, B, C, "02:31:05.700", ["8", "6=21.50|11=ORD-2002|14=400|17=EX-3|31=21.50|32=400|37=OID-501|38=1000|39=1|54=1|55=ACME|150=F|151=600"]),
    fix(24, B, C, "02:31:40.050", ["8", "6=21.50|11=ORD-2002|14=1000|17=EX-4|31=21.50|32=600|37=OID-501|38=1000|39=2|54=1|55=ACME|150=F|151=0"]),
    fix(25, B, C, "02:31:41.000", ["8", "6=21.50|11=ORD-2002|14=1000|17=EX-5|37=OID-501|38=1000|39=0|54=1|55=ACME|150=0|151=0"]),
    fix(13, C, B, "02:33:00.000", ["D", "11=ORD-2003|38=200|40=2|44=99.00|54=2|55=GLOBX|60=20261120-02:33:00.000"]),
    fix(26, B, C, "02:33:00.150", ["8", "6=0|11=ORD-2003|14=0|17=EX-6|37=NONE|38=200|39=8|54=2|55=GLOBX|58=Price outside band|150=8|151=0"]),
  ].join("\n") + "\n";
  const MT = (ref, fiac) => `{1:F01FAKEVNVXAXXX0000000000}{2:I540DUMYVNVXXXXXN}{3:{108:DEMO${ref.slice(-4)}}}{4:
:16R:GENL
:20C::SEME//${ref}
:23G:NEWM
:98C::PREP//20261120093000
:16S:GENL
:16R:TRADDET
:98A::TRAD//20261120
:98A::SETT//20261122
:90B::DEAL//ACTU/VND21400,
:35B:ISIN VN0000DEMO01
DEMO BOND 2030
:16S:TRADDET
${fiac}:16R:SETDET
:22F::SETR//TRAD
:16R:SETPRTY
:95P::DEAG//FAKEVNVXXXX
:16S:SETPRTY
:16R:SETPRTY
:95P::PSET//DUMYVNVXXXX
:16S:SETPRTY
:16S:SETDET
-}{5:{CHK:000000000000}}
`;
  const SWIFT = MT("DEMO-REF-0001", ":16R:FIAC\n:36B::SETT//UNIT/1000,\n:97A::SAFE//DEMO000123\n:16S:FIAC\n") + MT("DEMO-REF-0002", ":16R:FIAC\n:36B::SETT//UNIT/1000,\n");

  return {
    "log-merge": { payload: () => ({ v: 1, views: [[t("gateway.log", GATEWAY), t("oms.log", OMS), t("risk.log", RISK)], []], run: "log-merge",
      opts: { sources: [{ n: "gateway.log", fmt: "", off: "" }, { n: "oms.log", fmt: "", off: "-7h" }, { n: "risk.log", fmt: "", off: "-2500ms" }], q: "", unit: "s", link: true } }) },
    "fix-lifecycle": { payload: () => ({ v: 1, views: [[t("orders-lifecycle.fix", FIX)], []], run: "fix-lifecycle" }) },
    "swift-mt540": { payload: () => ({ v: 1, views: [[t("settlement-mt540.fin", SWIFT)], []], run: "swift-detail" }) },
  };
})());

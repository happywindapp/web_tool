// Fake FIX 4.4 samples: a broker⇄exchange order lifecycle (raw SOH, Parties group), an algo parent with child orders (583), and broken messages (^A) for the validator.
const StdSamples = (() => {
  const t = s => `20261028-${s}`;
  let seq = { BROKER01: 0, EXCH: 0 };
  const m = (from, to, time, type, body, opts) => FixCodec.build([["35", type], ["34", ++seq[from]], ["49", from], ["52", t(time)], ["56", to], ...body], opts);
  const parties = [["453", 2], ["448", "TRADER7"], ["447", "D"], ["452", 11], ["448", "BRK01"], ["447", "B"], ["452", 1]];

  function orderLifecycle() {
    seq = { BROKER01: 0, EXCH: 0 };
    const o = [["1", "ACC-7781"], ["11", "ORD-1001"], ["38", 1000], ["40", 2], ["44", "25.40"], ["54", 1], ["55", "ACME"], ["59", 0], ["60", t("02:15:00.100")]];
    const er = (time, extra) => m("EXCH", "BROKER01", time, "8", [["6", extra.avg || 0], ["11", extra.id || "ORD-1001"], ["14", extra.cum || 0], ["17", extra.exec], ["37", "EX-55001"], ["39", extra.st], ["54", 1], ["55", "ACME"], ["150", extra.et], ["151", extra.left], ...(extra.more || [])]);
    return [
      m("BROKER01", "EXCH", "02:14:59.900", "A", [["98", 0], ["108", 30]]),
      m("EXCH", "BROKER01", "02:14:59.950", "A", [["98", 0], ["108", 30]]),
      m("BROKER01", "EXCH", "02:15:00.120", "D", [...o, ...parties]),
      er("02:15:00.140", { exec: "E-1", st: 0, et: 0, left: 1000 }),
      er("02:15:03.310", { exec: "E-2", st: 1, et: "F", left: 600, cum: 400, avg: "25.40", more: [["31", "25.40"], ["32", 400]] }),
      m("BROKER01", "EXCH", "02:16:10.000", "G", [["11", "ORD-1002"], ["41", "ORD-1001"], ["38", 1000], ["40", 2], ["44", "25.50"], ["54", 1], ["55", "ACME"], ["60", t("02:16:10.000")]]),
      er("02:16:10.025", { id: "ORD-1002", exec: "E-3", st: 5, et: 5, left: 600, cum: 400, avg: "25.40", more: [["41", "ORD-1001"]] }),
      er("02:17:42.870", { id: "ORD-1002", exec: "E-4", st: 2, et: "F", left: 0, cum: 1000, avg: "25.46", more: [["31", "25.50"], ["32", 600]] }),
      m("BROKER01", "EXCH", "02:18:00.500", "F", [["11", "ORD-1003"], ["41", "ORD-1002"], ["38", 1000], ["54", 1], ["55", "ACME"], ["60", t("02:18:00.500")]]),
      m("EXCH", "BROKER01", "02:18:00.520", "9", [["11", "ORD-1003"], ["37", "EX-55001"], ["39", 2], ["41", "ORD-1002"], ["58", "Too late to cancel"], ["102", 0], ["434", 1]]),
      m("BROKER01", "EXCH", "02:18:30.000", "D", [["11", "ORD-1004"], ["38", 10], ["40", 2], ["44", "9.99"], ["54", 1], ["55", "ZZZ"], ["60", t("02:18:30.000")]]),
      m("EXCH", "BROKER01", "02:18:30.012", "j", [["45", 5], ["58", "Unknown security ZZZ"], ["372", "D"], ["379", "ORD-1004"], ["380", 2]]),
    ].join("\n");
  }

  // Each line breaks one rule; checksums stay correct unless the line is about the checksum.
  function broken() {
    seq = { BROKER01: 0, EXCH: 0 };
    const ok = (n = 1) => [["11", `ORD-${2000 + n}`], ["38", 100], ["40", 1], ["54", 1], ["55", "ACME"], ["60", t("03:00:00.000")]];
    const caret = w => w.split(FixCodec.SOH).join("^A");
    const good = m("BROKER01", "EXCH", "03:00:00.001", "D", ok(1));
    const badSum = good.replace(/10=\d{3}\x01$/, s => `10=${String((+s.slice(3, 6) + 7) % 256).padStart(3, "0")}\x01`);
    const badLen = m("BROKER01", "EXCH", "03:00:00.003", "D", ok(3), { bodyLength: 97 });
    const order = FixCodec.toWire(FixCodec.rebuild(FixCodec.split(m("BROKER01", "EXCH", "03:00:00.004", "D", ok(4)), FixCodec.SOH).sort((a, b) => a.tag === "35" ? 1 : b.tag === "35" ? -1 : 0)));
    const missing = m("BROKER01", "EXCH", "03:00:00.005", "D", [["11", "ORD-2005"], ["38", 100], ["55", "ACME"]]);
    const types = m("BROKER01", "EXCH", "03:00:00.006", "D", [["11", "ORD-2006"], ["38", "1O0"], ["40", 1], ["54", "X"], ["55", "ACME"], ["60", "2026-10-28 03:00"]]);
    const dup = m("BROKER01", "EXCH", "03:00:00.007", "D", [...ok(7), ["55", "ACME2"]]);
    const group = m("BROKER01", "EXCH", "03:00:00.008", "D", [...ok(8), ["453", 3], ["448", "TRADER7"], ["447", "D"], ["452", 11], ["448", "BRK01"], ["447", "B"], ["452", 1]]);
    const cut = m("BROKER01", "EXCH", "03:00:00.009", "D", ok(9)).replace(/\x0160=.*$/, "");
    const unknownTag = m("BROKER01", "EXCH", "03:00:00.010", "D", [...ok(10), ["9876", "desk-A"]]);
    return [
      "# Each line below breaks one FIX rule — pick a row to see what the validator reports.",
      caret(good), caret(badSum), caret(badLen), caret(order), caret(missing), caret(types), caret(dup), caret(group), caret(cut), caret(unknownTag),
      "# Fragment without header/trailer:",
      "35=D|11=ORD-2011|55=ACME|54=1|38=100",
      "# Delimiters lost when the log was copied:",
      "8=FIX.4.49=6535=034=1249=BROKER0152=20261028-03:00:00.01256=EXCH10=123",
    ].join("\n");
  }

  // Client parent order sliced by the broker into child orders that carry ClOrdLinkID(583) = parent ClOrdID; one child points at an earlier parent.
  function algoParentChild() {
    seq = { BROKER01: 0, EXCH: 0, CLIENT1: 0 };
    const p = s => s.split(FixCodec.SOH).join("|");
    const child = (time, id, qty, px, more = []) => m("BROKER01", "EXCH", time, "D", [["11", id], ["38", qty], ["40", 2], ["44", px], ["54", 1], ["55", "ACME"], ["60", t(time)], ["583", "PARENT-7001"], ...more]);
    const er = (time, id, ex, et, st, left, cum = 0, more = []) => m("EXCH", "BROKER01", time, "8", [["6", cum ? "25.48" : 0], ["11", id], ["14", cum], ["17", `E-${ex}-${et}${cum}`], ["37", ex], ["39", st], ["54", 1], ["55", "ACME"], ["150", et], ["151", left], ...more]);
    return [
      m("CLIENT1", "BROKER01", "02:30:00.000", "D", [["1", "ACC-7781"], ["11", "PARENT-7001"], ["38", 9000], ["40", 2], ["44", "25.50"], ["54", 1], ["55", "ACME"], ["60", t("02:30:00.000")], ["847", "TWAP"]]),
      m("BROKER01", "CLIENT1", "02:30:00.020", "8", [["6", 0], ["11", "PARENT-7001"], ["14", 0], ["17", "B-1"], ["37", "BO-7001"], ["39", 0], ["54", 1], ["55", "ACME"], ["150", 0], ["151", 9000]]),
      child("02:30:01.000", "CH-7001-1", 3000, "25.48"),
      er("02:30:01.015", "CH-7001-1", "EX-81", 0, 0, 3000),
      child("02:31:01.000", "CH-7001-2", 3000, "25.47"),
      er("02:31:01.012", "CH-7001-2", "EX-82", 0, 0, 3000),
      er("02:31:30.400", "CH-7001-1", "EX-81", "F", 2, 0, 3000, [["31", "25.48"], ["32", 3000]]),
      m("BROKER01", "EXCH", "02:32:00.000", "G", [["11", "CH-7001-2R"], ["41", "CH-7001-2"], ["38", 3000], ["40", 2], ["44", "25.49"], ["54", 1], ["55", "ACME"], ["60", t("02:32:00.000")], ["583", "PARENT-7001"]]),
      er("02:32:00.018", "CH-7001-2R", "EX-82", 5, 0, 3000, 0, [["41", "CH-7001-2"]]),
      er("02:32:40.700", "CH-7001-2R", "EX-82", "F", 1, 2000, 1000, [["31", "25.49"], ["32", 1000]]),
      child("02:33:01.000", "CH-7001-3", 3000, "25.50"),
      er("02:33:01.011", "CH-7001-3", "EX-83", 0, 0, 3000),
      m("BROKER01", "EXCH", "02:34:00.000", "F", [["11", "CH-7001-3X"], ["41", "CH-7001-3"], ["38", 3000], ["54", 1], ["55", "ACME"], ["60", t("02:34:00.000")]]),
      er("02:34:00.009", "CH-7001-3X", "EX-83", 4, 4, 0, 0, [["41", "CH-7001-3"]]),
      m("BROKER01", "CLIENT1", "02:34:05.000", "8", [["6", "25.48"], ["11", "PARENT-7001"], ["14", 4000], ["17", "B-2"], ["31", "25.48"], ["32", 4000], ["37", "BO-7001"], ["39", 1], ["54", 1], ["55", "ACME"], ["150", "F"], ["151", 5000]]),
      m("BROKER01", "EXCH", "02:35:00.000", "D", [["11", "CH-6999-4"], ["38", 500], ["40", 2], ["44", "25.40"], ["54", 2], ["55", "ACME"], ["60", t("02:35:00.000")], ["583", "PARENT-6999"]]),
      er("02:35:00.010", "CH-6999-4", "EX-84", 0, 0, 500),
    ].map(p).join("\n");
  }

  return { orderLifecycle, algoParentChild, broken };
})();

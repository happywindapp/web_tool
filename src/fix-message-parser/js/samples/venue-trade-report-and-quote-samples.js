// Fake exchange-server bond logs following CBTS v1.15 flows: BCGD trade reports 35=s/t/u + ER/Reject, and ĐTTTT quotes S/AI/AJ/Z. Firms, accounts, bonds are made up.
const VenueSamples = (() => {
  const DAY = "20261028";
  const utc = vn => { const [h, m, s] = vn.split(":"); return `${DAY}-${String(+h - 7).padStart(2, "0")}:${m}:${s}`; };
  const pipe = wire => wire.split(FixCodec.SOH).join("|");

  // Our gateway "FIRM001" ⇄ "EXCH": both sides count MsgSeqNum and echo the other's last seq in 369 (venue header rule).
  function session(us = "FIRM001", them = "EXCH") {
    let outSeq = 0, inSeq = 0;
    const msg = (from, to, seq, last, time, type, body) => pipe(FixCodec.build([["35", type], ["34", seq], ["49", from], ["52", utc(time)], ["56", to], ["369", last], ...body]));
    return {
      out: (time, type, body) => msg(us, them, ++outSeq, inSeq, time, type, body),
      in: (time, type, body) => msg(them, us, ++inSeq, outSeq, time, type, body),
      get outSeq() { return outSeq; },
    };
  }

  // NewOrderCross: 1/448 = seller account/firm, 2/449 = buyer account/firm, 54 = side of the entering firm, 6464 = 0 from members,
  // 549 = 1 new report / 3 counterparty accepts (548 = venue order number being accepted).
  const cross = o => {
    const sell = o.side === 2 ? o.ours : o.theirs, buy = o.side === 2 ? o.theirs : o.ours;
    return [["1", sell.acc], ["2", buy.acc], ["11", o.id], ["38", o.qty], ["40", "R"], ["54", o.side], ["55", o.sym], ["64", DAY], ["168", DAY],
      ["448", sell.firm], ["449", buy.firm], ["548", o.crossId || ""], ["549", o.crossType || 1], ["640", o.px], ["6363", o.settl || 1], ["6464", o.settlValue ?? 0]];
  };
  // Match notice (150=3/39=2): 41 = seller's venue order no, 526 = buyer's, 37 = 17 = match no, 448 = counterparty, 11 only for same-firm reports.
  const fill = (o, sellNo, buyNo, matchNo) => [...(o.sameFirm ? [["11", o.id]] : []), ["14", o.qty], ["17", matchNo], ["31", o.px], ["32", o.qty], ["37", matchNo],
    ["39", 2], ["41", sellNo], ["54", o.side], ["55", o.sym], ["150", 3], ["151", 0], ["448", o.theirs.firm], ["526", buyNo], ["6464", o.qty * o.px]];
  const cancelAck = (o, id, venueNo) => [["1", o.ours.acc], ["11", id], ["14", 0], ["17", venueNo], ["37", venueNo], ["39", 5], ["40", "R"], ["41", venueNo],
    ["44", o.px], ["54", o.side], ["55", o.sym], ["150", 4], ["151", o.qty]];
  const amendAck = (o, id, origNo, newNo) => [["1", o.ours.acc], ["11", id], ["14", 0], ["17", newNo], ["31", o.px], ["32", o.qty], ["37", newNo], ["39", "A"],
    ["40", "R"], ["41", origNo], ["54", o.side], ["55", o.sym], ["58", "Amendment waiting for approval"], ["150", 5], ["151", o.qty], ["6464", o.qty * o.px]];
  const us = acc => ({ firm: "001", acc }), peer = (firm, acc) => ({ firm, acc });

  function lifecycle() {
    const s = session(), L = [];
    const out = (t, ty, b) => L.push(`2026-10-28 ${t} OUT ${s.out(t, ty, b)}`), inn = (t, ty, b) => L.push(`2026-10-28 ${t} IN  ${s.in(t, ty, b)}`);
    L.push("2026-10-28 08:54:59.880 INFO  Created session FIX.4.4:FIRM001->EXCH", "2026-10-28 08:54:59.902 INFO  Connecting to exchange-gateway.example:1369");
    out("08:55:00.010", "A", [["98", 0], ["108", 30], ["553", "firm001.trader"], ["554", "Secret#2026"]]);
    inn("08:55:00.052", "A", [["98", 0], ["108", 30]]);
    L.push("2026-10-28 08:55:00.060 INFO  Logon OK, waiting for market open");
    const same = { ours: us("001C000101"), theirs: us("001C000102"), sameFirm: true, side: 1, sym: "ABC12401", qty: 5000, px: 98500 };
    out("08:56:12.300", "s", cross({ ...same, id: "BOND-20261028-0001" }));
    inn("08:56:12.318", "3", [["45", s.outSeq], ["58", "Market is not accepting orders yet"], ["372", "s"], ["373", -32001]]);
    inn("09:00:00.004", "h", [["336", "BOND_AUC_O"], ["339", 1], ["340", 1]]);
    out("09:00:30.120", "0", []);
    inn("09:00:30.150", "0", []);
    const o2 = { ...same, id: "BOND-20261028-0002" };
    out("09:01:05.210", "s", cross(o2));
    inn("09:01:05.236", "8", fill(o2, "ABC12401-2610280000001", "ABC12401-2610280000002", "ABC12401-2610280000003"));
    L.push("2026-10-28 09:03:40.480 INFO  Cross-firm report to firm 046, waiting for the counterparty to accept");
    const o3 = { id: "BOND-20261028-0003", ours: us("001C000103"), theirs: peer("046", "046C000201"), side: 1, sym: "XYZ12502", qty: 2000, px: 101200, settl: 2 };
    out("09:03:40.500", "s", cross(o3));
    inn("09:03:40.533", "s", cross({ ...o3, crossId: "XYZ12502-2610280000004" }));
    const inv = { id: "s_5", ours: us("001C000104"), theirs: peer("046", "046C000202"), side: 2, sym: "DEF12303", qty: 3000, px: 99800 };
    inn("09:04:10.880", "s", cross({ ...inv, side: 1, ours: inv.theirs, theirs: inv.ours, crossId: "DEF12303-2610280000005" }));
    inn("09:05:02.441", "8", fill(o3, "XYZ12502-2610280000006", "XYZ12502-2610280000004", "XYZ12502-2610280000007"));
    const acc = { ...inv, id: "BOND-20261028-0004", crossType: 3, crossId: "DEF12303-2610280000005" };
    out("09:06:20.105", "s", cross(acc));
    inn("09:06:20.140", "8", fill(acc, "DEF12303-2610280000008", "DEF12303-2610280000005", "DEF12303-2610280000009"));
    const o5 = { ...o2, id: "BOND-20261028-0005", px: 98600 };
    out("09:12:30.000", "t", [["551", "ABC12401-2610280000003"], ...cross({ ...o5, crossType: 2 }).filter(([t]) => t !== "548")]);
    inn("09:12:30.027", "8", amendAck(o5, o5.id, "ABC12401-2610280000003", "ABC12401-2610280000010"));
    const o6 = { id: "BOND-20261028-0006", ours: us("001C000105"), theirs: peer("009", "009C000301"), side: 2, sym: "XYZ12502", qty: 1000, px: 101000 };
    out("09:20:15.700", "s", cross(o6));
    inn("09:20:15.731", "s", cross({ ...o6, crossId: "XYZ12502-2610280000011" }));
    out("09:25:44.100", "u", [["11", "BOND-20261028-0007"], ["40", "R"], ["54", 2], ["55", o6.sym], ["549", 1], ["551", "XYZ12502-2610280000011"]]);
    inn("09:25:44.130", "8", cancelAck(o6, "BOND-20261028-0007", "XYZ12502-2610280000011"));
    inn("09:30:00.003", "h", [["336", "BOND_CONT"], ["339", 1], ["340", 1]]);
    out("09:41:09.010", "u", [["11", "BOND-20261028-0008"], ["40", "R"], ["54", 1], ["55", "DEF12303"], ["549", 1], ["551", "DEF12303-2610270000099"]]);
    inn("09:41:09.022", "3", [["45", s.outSeq], ["58", "Order status invalid or order number not found"], ["372", "u"], ["373", -34000]]);
    inn("09:45:00.500", "f", [["55", "ABC12401"], ["6251", "BOND_BRD_01"], ["9740", 108000], ["9741", 88000], ["9742", 110000], ["9743", 86000], ["9744", 0], ["9745", 0]]);
    return L.join("\n");
  }

  // A trading day: 14 trade reports over 4 bonds — same-firm (matched at once), cross-firm (accepted or still pending), amend, cancel, reject.
  function tradingDay() {
    const s = session(), L = [], syms = ["ABC12401", "XYZ12502", "DEF12303", "GHK12604"], peers = ["046", "009", "022"];
    let minute = 5, seq = 0, rnd = 7;
    const next = () => (rnd = (rnd * 48271) % 2147483647) / 2147483647;
    const no = sym => `${sym}-261028${String(++seq).padStart(7, "0")}`;
    const clock = sec => { minute += 2 + Math.floor(next() * 4); return `${String(9 + Math.floor(minute / 60)).padStart(2, "0")}:${String(minute % 60).padStart(2, "0")}:${String(sec).padStart(2, "0")}.${String(Math.floor(next() * 900) + 100)}`; };
    const later = (t, ms) => t.replace(/\.(\d{3})$/, (m, f) => "." + String(Math.min(999, +f + ms)).padStart(3, "0"));
    for (let n = 1; n <= 14; n++) {
      const sameFirm = n % 3 === 1, sym = syms[n % 4], firm = peers[n % 3];
      const o = { id: `BOND-20261028-${String(100 + n).padStart(4, "0")}`, ours: us(`001C000${110 + n}`), theirs: sameFirm ? us(`001C000${150 + n}`) : peer(firm, `${firm}C000${400 + n}`),
        sameFirm, side: n % 2 ? 1 : 2, sym, qty: (1 + Math.floor(next() * 20)) * 500, px: 97000 + Math.floor(next() * 60) * 100, settl: n % 4 === 0 ? 2 : 1 };
      const t = clock(Math.floor(next() * 59));
      if (n === 6) {
        L.push(s.out(t, "s", cross({ ...o, px: o.px + 55 })));
        L.push(s.in(later(t, 14), "3", [["45", s.outSeq], ["58", "Price must be a multiple of the tick size"], ["372", "s"], ["373", -31003]]));
        continue;
      }
      L.push(s.out(t, "s", cross(o)));
      const mine = no(sym);
      if (!sameFirm) L.push(s.in(later(t, 20), "s", cross({ ...o, crossId: mine })));
      const theirsNo = no(sym), matchNo = no(sym);
      if (sameFirm || n % 3 === 2) L.push(s.in(later(t, sameFirm ? 25 : 600), "8", fill(o, o.side === 2 ? mine : theirsNo, o.side === 2 ? theirsNo : mine, matchNo)));
      if (n === 4) {
        const ta = clock(10), a = { ...o, id: o.id + "-A", px: o.px + 100 };
        L.push(s.out(ta, "t", [["551", matchNo], ...cross({ ...a, crossType: 2 }).filter(([tag]) => tag !== "548")]));
        L.push(s.in(later(ta, 30), "8", amendAck(a, a.id, matchNo, no(sym))));
      }
      if (n === 9) {
        const tc = clock(20), id = o.id + "-C";
        L.push(s.out(tc, "u", [["11", id], ["40", "R"], ["54", o.side], ["55", o.sym], ["549", 1], ["551", mine]]));
        L.push(s.in(later(tc, 22), "8", cancelAck(o, id, mine)));
      }
    }
    return L.join("\n");
  }

  // ĐTTTT (electronic negotiated deal): our quote → AI 537=1 → partner accepts → match ER; a cancelled quote (298=4); we accept a partner quote with AJ.
  function quotes() {
    const s = session(), L = [];
    const q = (id, side, qty, px, sym) => [["1", "001C000101"], ["11", id], ["38", qty], ["40", "S"], ["54", side], ["55", sym], ["64", DAY], ["513", 0], ["640", px], ["6363", 1], ["6464", qty * px]];
    const status = (type, id, quoteId, oldId, side, qty, px, sym, firm = "001") => [["1", firm === "001" ? "001C000101" : ""], ["11", id], ["38", qty], ["40", "S"], ["54", side], ["55", sym],
      ["64", DAY], ["131", oldId], ["171", quoteId], ["513", 0], ["537", type], ["640", px], ["4488", firm], ["6363", 1], ["6464", qty * px]];
    const match = (id, side, qty, px, sym, quoteId, matchNo, firm) => [["11", id], ["14", qty], ["17", matchNo], ["31", px], ["32", qty], ["37", matchNo], ["39", 2], ["41", quoteId],
      ["54", side], ["55", sym], ["150", 3], ["151", 0], ["448", firm], ["526", quoteId], ["6464", qty * px]];
    L.push(s.out("10:02:00.100", "S", q("QUOTE-20261028-0001", 2, 1000, 99500, "ABC12401")));
    L.push(s.in("10:02:00.131", "AI", status(1, "QUOTE-20261028-0001", "ABC12401-2610280000010", "", 2, 1000, 99500, "ABC12401")));
    L.push(s.in("10:06:45.902", "8", match("QUOTE-20261028-0001", 2, 1000, 99500, "ABC12401", "ABC12401-2610280000010", "ABC12401-2610280000011", "046")));
    L.push(s.out("10:10:12.400", "S", q("QUOTE-20261028-0002", 1, 3000, 100800, "GHK12604")));
    L.push(s.in("10:10:12.433", "AI", status(1, "QUOTE-20261028-0002", "GHK12604-2610280000012", "", 1, 3000, 100800, "GHK12604")));
    L.push(s.out("10:18:30.010", "Z", [["11", "QUOTE-20261028-0003"], ["40", "S"], ["55", "GHK12604"], ["171", "GHK12604-2610280000012"], ["298", 4]]));
    L.push(s.in("10:18:30.044", "AI", status(3, "QUOTE-20261028-0003", "GHK12604-2610280000013", "GHK12604-2610280000012", 1, 3000, 100800, "GHK12604")));
    L.push(s.in("10:25:01.700", "AI", status(1, "S_812", "DEF12303-2610280000014", "", 2, 2000, 99900, "DEF12303", "009")));
    L.push(s.out("10:26:15.250", "AJ", [["1", "001C000101"], ["2", "001C000101"], ["11", "ACCEPT-20261028-0001"], ["38", 2000], ["40", "S"], ["54", 1], ["55", "DEF12303"], ["64", DAY], ["640", 99900], ["693", "DEF12303-2610280000014"], ["694", 1], ["6464", 199800000]]));
    L.push(s.in("10:26:15.281", "8", match("ACCEPT-20261028-0001", 1, 2000, 99900, "DEF12303", "DEF12303-2610280000014", "DEF12303-2610280000015", "009")));
    return L.join("\n");
  }

  return { lifecycle, tradingDay, quotes };
})();

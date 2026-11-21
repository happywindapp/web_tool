// FIX tab → messages checked with FIX Parser's rules (dialect auto: FIX 4.4 or the venue's), the one at the cursor line selected; result text = a light JSON summary (full JSON per message: "Copy JSON").
const FixDetailModel = (() => {
  const MAX = 5000;

  function build(text, cursorLine = 0, tz = "utc") {
    const ex = FixLog.extract(text);
    if (!ex.items.length) throw new Error(T("Không thấy message FIX nào — cần dòng có 8=FIX… hoặc các cặp tag=value có 35=."));
    const items = ex.items.slice(0, MAX), dialect = items.some(FixVenue.isVenue) ? "venue" : "fix44", dict = FixDict.get(dialect);
    const msgs = items.map(it => FixCheck.analyse(it, dict)), venue = FixVenue.idOf(msgs) || T("Server Sàn");
    FixKnow.setVenue(venue);
    let sel = 0;
    msgs.forEach((m, i) => { if (m.line <= cursorLine) sel = i; });
    const count = level => msgs.filter(m => m.level === level).length;
    const dictLabel = dialect === "venue" ? venue + " FIX 4.4" : "FIX 4.4";
    const json = { dictionary: dictLabel, count: msgs.length, messages: msgs.map(m => ({ line: m.line, msgType: m.type, name: FixDict.msgName(dict, m.type), level: m.level, issues: m.issues.map(x => T(x.key, x.params)) })) };
    const notes = [T("{n} message · {e} lỗi · {w} cảnh báo · từ điển {dict}.", { n: I18n.num(msgs.length), e: count("error"), w: count("warn"), dict: dictLabel })];
    if (ex.items.length > MAX) notes.push(T("Chỉ hiện {n} message đầu.", { n: I18n.num(MAX) }));
    if (ex.skipped) notes.push(T("Bỏ qua {n} dòng không phải FIX.", { n: I18n.num(ex.skipped) }));
    // us = our CompID (an outgoing log prefix, else the first sender): rows from the other side are marked inbound.
    const out = msgs.find(m => /\b(OUT|outgoing|sent)\b|->|>>/i.test(m.prefix)), us = (out || msgs[0]).get("49");
    return { msgs, dict, dictLabel, sel, tz, notes, chain: FixChain.link(msgs), us, text: JSON.stringify(json, null, 2) + "\n" };
  }

  return { build, MAX };
})();

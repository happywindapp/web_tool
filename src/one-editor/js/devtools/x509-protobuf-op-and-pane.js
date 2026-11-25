// "x509" op: PEM chain / DER → a Markdown report + one card per certificate (validity colours, SHA-256 fingerprint, chain check); private keys are flagged, never decoded. "protobuf" op: raw bytes → field tree text.
const X509Op = (() => {
  const DAY_WARN = 30;
  const fmt = ms => ms == null ? "?" : new Date(ms).toISOString().replace("T", " ").slice(0, 19) + " UTC";
  const cn = f => (f.subject.find(([k]) => k === "CN") || f.subject[f.subject.length - 1] || ["", "?"])[1];
  async function sha256(der) {
    if (!globalThis.crypto?.subtle) return "";
    return X509.hex(new Uint8Array(await crypto.subtle.digest("SHA-256", der)), ":").toUpperCase();
  }
  const validity = f => f.expired ? { tone: "bad", text: T("Đã hết hạn {n} ngày", { n: I18n.num(-f.daysLeft) }) }
    : f.notYet ? { tone: "warn", text: T("Chưa tới ngày hiệu lực") }
    : f.daysLeft == null ? { tone: "", text: "?" }
    : { tone: f.daysLeft < DAY_WARN ? "warn" : "good", text: T("Còn {n} ngày", { n: I18n.num(f.daysLeft) }) };
  const WARN = { priv: "Dòng {n}: khối {type} là khoá riêng — không giải, không hiển thị. Đừng chia sẻ file này.", notCert: "Dòng {n}: khối {type} không phải chứng chỉ — bỏ qua.", bad: "Dòng {n}: không đọc được chứng chỉ (DER hỏng hoặc không phải X.509)." };
  const warnText = w => T(WARN[w.code], { n: w.line, type: w.type || "" });
  const keyText = k => k.alg + (k.curve ? " " + k.curve : "") + (k.bits ? " (" + k.bits + " bit)" : "");
  const basicText = b => b ? "CA=" + (b.ca ? "TRUE" : "FALSE") + (b.pathLen != null ? ", pathLen=" + b.pathLen : "") + (b.critical ? " · critical" : "") : "";

  // blocks → { certs, warns }; bytes: DER from a recipe step.
  async function analyse(text, bytes) {
    const list = bytes ? [{ type: "DER", line: 1, der: bytes }] : X509.blocks(text), certs = [], warns = [];
    for (const b of list) {
      if (b.private) { warns.push({ code: "priv", line: b.line, type: b.type }); continue; }
      if (!b.der) { warns.push({ code: "notCert", line: b.line, type: b.type }); continue; }
      try { certs.push({ ...X509.decode(b.der), line: b.line, sha256: await sha256(b.der) }); }
      catch { warns.push({ code: "bad", line: b.line }); }
    }
    certs.forEach((f, i) => { f.chain = i + 1 < certs.length && !f.selfSigned ? X509.nameText(f.issuer) === X509.nameText(certs[i + 1].subject) : null; });
    return { certs, warns };
  }

  function rows(f) {
    const v = validity(f);
    return [
      [T("Subject"), X509.nameText(f.subject)], [T("Issuer"), X509.nameText(f.issuer) + (f.selfSigned ? " " + T("(tự ký)") : "")], [T("Serial"), f.serial],
      [T("Hiệu lực"), fmt(f.notBefore) + " → " + fmt(f.notAfter) + " · " + v.text, v.tone], [T("SAN"), f.san.join(", ")], [T("Khoá"), keyText(f.key)],
      [T("Thuật toán ký"), f.sigAlg], ["SHA-256", f.sha256 || T("(trình duyệt không có crypto.subtle)")], [T("Basic constraints"), basicText(f.basic)],
      [T("Key usage"), f.keyUsage.join(", ")], [T("Extended key usage"), f.eku.join(", ")],
      ...(f.chain == null ? [] : [[T("Chuỗi"), f.chain ? T("✓ Issuer khớp Subject của chứng chỉ kế") : T("✗ Issuer không khớp Subject của chứng chỉ kế"), f.chain ? "good" : "warn"]]),
    ].filter(r => r[1]);
  }

  function markdown(certs, warns) {
    const out = [];
    warns.forEach(w => out.push("> ⚠ " + warnText(w), ""));
    certs.forEach((f, i) => { out.push("## " + T("Chứng chỉ {n}", { n: i + 1 }) + " — " + cn(f), ""); rows(f).forEach(([k, val]) => out.push("- **" + k + "**: " + val)); out.push(""); });
    return out.join("\n");
  }

  async function run(t, c) {
    const { certs, warns } = await analyse(t);
    const first = warns[0];
    if (!certs.length) throw Object.assign(new Error(first ? warnText(first) : T("Không thấy chứng chỉ — cần khối -----BEGIN CERTIFICATE----- hoặc DER base64 / hex.")), { warn: true, line: first?.line || 0 });
    const bad = certs.filter(f => f.expired).length;
    const notes = [T("{n} chứng chỉ · {bad} đã hết hạn.", { n: certs.length, bad })];
    const error = first ? Object.assign(new Error(warns.map(warnText).join(" ")), { warn: true, line: first.line }) : null;
    return { text: markdown(certs, warns), notes, error, view: { kind: "x509", srcId: c.id, certs, warns } };
  }

  // Recipe step: text (PEM / base64) or DER bytes → the Markdown report.
  async function recipe(v) {
    const { certs, warns } = await analyse(typeof v === "string" ? v : "", typeof v === "string" ? null : v);
    if (!certs.length) throw new Error(warns[0] ? warnText(warns[0]) : T("Không thấy chứng chỉ — cần khối -----BEGIN CERTIFICATE----- hoặc DER base64 / hex."));
    return markdown(certs, warns);
  }

  async function share(srcId) {
    const src = Docs.get(srcId);
    if (!src) { StatusBar.msg(T("Tab nguồn của kết quả này đã đóng."), "warn"); return; }
    if (X509.blocks(Docs.text(src)).some(b => b.private)) { StatusBar.msg(T("Tab có khoá riêng — không tạo link (khoá sẽ nằm trong link)."), "warn"); return; }
    await PowerUi.shareLink({ v: 1, views: [[{ n: src.name, l: src.lang || "", t: Docs.text(src) }], []], run: "x509" }, n => T("🔗 Đã chép link X.509 ({n} ký tự) — mở link là giải lại.", { n }));
  }

  return { run, recipe, share, rows, cn, warnText };
})();

const ProtoOp = (() => {
  const ERR = { notBytes: "Không phải hex / base64 — dán byte protobuf dạng hex (08 96 01…) hoặc base64.", notProto: "{n} byte này không giải được thành message protobuf (wire format sai).", tooBig: "Quá {mb} MB — protobuf chỉ giải tối đa {mb} MB." };
  function decode(input) {
    try { return ProtoWire.decode(input); }
    catch (e) { throw Object.assign(new Error(T(ERR[e.code] || e.message, { n: I18n.num(e.bytes || 0), mb: ProtoWire.MAX_BYTES / 1048576 })), { warn: true }); }
  }
  function run(t) {
    const r = decode(t);
    const notes = [T("{n} byte ({kind}) · {f} field cấp đầu — không có .proto nên tên field là số.", { n: I18n.num(r.bytes), kind: r.kind, f: r.fields.length })];
    if (r.cut) notes.push(T("Cây quá lớn — đã cắt bớt."));
    return { text: ProtoWire.text(r.fields).join("\n") + "\n", notes };
  }
  // Recipe step: bytes go in as hex.
  const recipe = v => ProtoWire.text(decode(typeof v === "string" ? v : Array.from(v, b => b.toString(16).padStart(2, "0")).join(" ")).fields).join("\n") + "\n";
  return { run, recipe };
})();

const PvX509 = {
  create(p) {
    const { mk, button } = PowerUi;
    const link = button("", () => v.last && X509Op.share(v.last.srcId));
    const v = { el: mk("div", "pv-x509"), tools: [link], last: null };
    const jump = (d, line) => { const src = Docs.get(d.srcId); if (src) { Views.revealLine(src, line); PhoneLayout.show(Views.where(src.id) + 1); } };

    function card(f, i, d) {
      const box = mk("div", "x5-card" + (f.expired ? " x5-expired" : "")), h = mk("h4", "x5-head", T("Chứng chỉ {n}", { n: i + 1 }) + " — " + X509Op.cn(f));
      h.tabIndex = 0; h.title = T("Tới dòng {n} ở tab nguồn", { n: f.line }); h.onclick = () => jump(d, f.line); h.onkeydown = e => { if (e.key === "Enter") jump(d, f.line); };
      const tb = mk("table", "rx-tab x5-tab");
      for (const [k, val, tone] of X509Op.rows(f)) { const tr = mk("tr"); tr.append(mk("th", "", k), mk("td", tone ? "x5-" + tone : "", val)); tb.append(tr); }
      box.append(h, tb);
      return box;
    }

    function render() {
      const d = v.last;
      p.type.textContent = T("X.509 · {n} chứng chỉ", { n: d.certs.length });
      v.el.replaceChildren(...d.warns.map(w => mk("div", "x5-warn", "⚠ " + X509Op.warnText(w))), ...d.certs.map((f, i) => card(f, i, d)));
    }

    v.labels = () => { link.textContent = T("🔗 Link"); link.title = T("Chép link chia sẻ: chứng chỉ + giải lại khi mở"); if (v.last) render(); };
    v.show = d => { v.last = d; render(); return true; };
    return v;
  },
};

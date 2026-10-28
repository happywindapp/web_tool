// FIX Orchestra FIX44 (field/message/code docs) + venue CBTS FIX spec text (per-message tag notes, purposes, error codes) → compact JS data modules.
// node scripts/generate-fix-tag-notes-from-orchestra-and-cbts.js <OrchestraFIX44.xml> <cbts.txt> <out-dir> <venue-name>   (venue-name in the spec → "{venue}")
// cbts.txt = text of "CBTS.FIX Message & Protocol for Gate v1.15.pdf": python -c "import pypdf,sys;r=pypdf.PdfReader(sys.argv[1]);open(sys.argv[2],'w',encoding='utf8').write(''.join(f'\n===== PAGE {i+1} =====\n'+(p.extract_text() or '') for i,p in enumerate(r.pages)))" in.pdf cbts.txt
const fs = require("fs"), path = require("path");
const [orchestraFile, cbtsFile, outDir, venueName] = process.argv.slice(2);
if (!venueName) throw new Error("missing <venue-name>: the exchange name used in the spec text, replaced by {venue}");

// pypdf splits some Vietnamese syllables after the leading consonants ("ch ứng" → "chứng").
const VOWEL = "àáảãạăằắẳẵặâầấẩẫậèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵ";
const glue = s => s.replace(new RegExp(`(^|[\\s(])([bcdđghklmnpqrstvx]{1,3}) ([${VOWEL}])`, "gi"), "$1$2$3");
const clean = s => glue(s.replace(/[`\\|]/g, "/").replace(/\$\{/g, "$ {").replace(/\s+/g, " ").trim());
const xml = s => s.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, "&");
const norm = s => s.toLowerCase().replace(/[^a-z0-9]/g, "");

function orchestra(file) {
  const x = fs.readFileSync(file, "utf8");
  const doc = body => {
    const m = /purpose="SYNOPSIS">([\s\S]*?)<\/fixr:documentation>/.exec(body);
    return m ? clean(xml(m[1]).replace(/\*\*\*[\s\S]*?\*\*\*/g, "").replace(/\(see Volume[^)]*\)/gi, "").replace(/\s*\(\s*\)/g, "")) : "";
  };
  const fields = [...x.matchAll(/<fixr:field id="(\d+)" name="(\w+)"[^>]*>([\s\S]*?)<\/fixr:field>/g)]
    .map(m => [m[1], doc(m[3])]).filter(([, d]) => d).map(([t, d]) => `${t}|${d}`);
  const codes = [];
  for (const cs of x.matchAll(/<fixr:codeSet id="(\d+)"[^>]*>([\s\S]*?)<\/fixr:codeSet>/g))
    for (const c of cs[2].matchAll(/<fixr:code id="\d+" name="(\w+)" value="([^"]*)"[^>]*>([\s\S]*?)<\/fixr:code>/g)) {
      const d = doc(c[3]);
      if (d && norm(d) !== norm(c[1])) codes.push(`${cs[1]}|${clean(xml(c[2]))}|${d}`);
    }
  const messages = [...x.matchAll(/<fixr:message id="\d+" name="(\w+)"[^>]*msgType="([^"]+)"[^>]*>([\s\S]*?)<\/fixr:message>/g)]
    .map(m => [m[2], doc(m[3])]).filter(([, d]) => d).map(([t, d]) => `${t}|${d}`);
  return { fields: fields.join("\n"), codes: codes.join("\n"), messages: messages.join("\n") };
}

// Body of the CBTS spec: "4.x Message …" sections, "Mục đích:" purposes, "Tag Field Name Request Value Note" tables, Phụ lục 01 error codes.
function cbts(file) {
  const lines = fs.readFileSync(file, "utf8").split("\n").map(l => l.replace(/\s+$/, ""));
  const body = [];
  for (let i = 0; i < lines.length; i++) {
    if (/^===== PAGE \d+ =====$/.test(lines[i])) { if (/^\d+$/.test((lines[i + 1] || "").trim())) i++; continue; }
    body.push(lines[i]);
  }
  const start = body.findIndex((l, i) => i > 300 && /^4\.4\.\s+Message Logon\s*$/.test(l));
  const appendix = body.findIndex((l, i) => i > start && /^DANH SÁCH MÃ LỖI HỆ THỐNG\s*$/.test(l.trim()));
  const ROW = /^(\d{1,5}) ([A-Za-z][A-Za-z0-9_]*) (Y|N)\b ?(.*)$/;
  const HEAD = /^4\.\d+(?:\.\d+)?\.\s+\S/;
  const sections = [];
  let sec = null, row = null, inPurpose = false;
  const part = body.slice(start, appendix);
  const nextFilled = i => part.findIndex((x, k) => k > i && x.trim());
  part.forEach((l, i) => {
    // A row wrapped over 2-3 lines: "537" / "QuoteType" / "Y …" or "526 SecondaryClOrdID" / "Y Số hiệu…".
    const n = nextFilled(i);
    if (/^\d{1,5}$/.test(l.trim()) && n > 0 && /^[A-Za-z][A-Za-z0-9_]*$/.test(part[n].trim())) { l = part[i] = `${l.trim()} ${part[n].trim()}`; part[n] = ""; }
    const j = nextFilled(i);
    const m2 = /^(\d{1,5}) ([A-Za-z][A-Za-z0-9_]*)$/.exec(l.trim()), nx = j > 0 && j <= i + 2 && /^(Y|N)\b ?(.*)$/.exec(part[j].trim());
    if (m2 && nx) { part[i] = `${m2[1]} ${m2[2]} ${nx[1]} ${nx[2]}`; part[j] = ""; }
  });
  for (const l of part) {
    const sub = l.replace(/^4\.\d+(?:\.\d+)*\.\s+/, "").trim();
    if (HEAD.test(l) && sec && /^Mục đích$/.test(sub)) { inPurpose = true; continue; }
    if (HEAD.test(l) && sec && /^Các trường của message$/.test(sub)) { inPurpose = false; continue; }
    if (HEAD.test(l) && !/\.{5}/.test(l)) { sec = { title: l.trim(), purpose: [], rows: [] }; sections.push(sec); row = null; inPurpose = false; continue; }
    if (!sec) continue;
    if (/^Mục đích\s*:?/.test(l.trim())) { inPurpose = true; const t = l.replace(/^\s*Mục đích\s*:?\s*/, ""); if (t) sec.purpose.push(t); continue; }
    if (/^(Các trường|Tag Field Name)/.test(l.trim())) { inPurpose = false; continue; }
    const m = ROW.exec(l.trim());
    if (m) { row = { tag: m[1], name: m[2], req: m[3], lines: [m[4].trim()] }; sec.rows.push(row); inPurpose = false; continue; }
    if (inPurpose && l.trim()) { sec.purpose.push(l.trim()); continue; }
    if (!row && !sec.rows.length && l.trim() && sec.purpose.length === 0 && !/^\d/.test(l)) sec.purpose.push(l.trim());
    else if (row && l.trim()) row.lines.push(l.trim());
  }

  // Note text keeps its line structure ("¶"); wrapped lines starting in lowercase join the previous line.
  const join = ls => ls.filter(Boolean).reduce((a, l) => a.length && /^[a-zà-ỹđ(]/.test(l) ? [...a.slice(0, -1), a[a.length - 1] + " " + l] : [...a, l], []);
  const messages = [], notes = [], seen = new Set();
  for (const s of sections) {
    const t35 = s.rows.find(r => r.tag === "35");
    if (!t35) continue;
    const type = (t35.lines[0].split(/\s+/)[0] || "").replace(/[^\w]/g, "");
    if (!type) continue;
    const t150 = type === "8" ? s.rows.find(r => r.tag === "150") : null;
    const key = t150 ? `8/${(t150.lines[0].split(/\s+/)[0] || "").replace(/[^\w]/g, "")}` : type;
    if (seen.has(key)) continue;
    seen.add(key);
    const purpose = clean(join(s.purpose).join(" "));
    const title = s.title.replace(/^4\.\d+(?:\.\d+)?\.\s+(Message\s+)?/, "").replace(/^Các trường của message\s+/, "ExecutionReport — ");
    messages.push(`${key}|${clean(title)}|${purpose}`);
    for (const r of s.rows) notes.push(`${key}|${r.tag}|${r.req}|${join(r.lines).map(clean).filter(Boolean).join("¶")}`);
  }

  const errors = [];
  let err = null;
  for (const l of body.slice(appendix)) {
    const m = /^\s*(?:\d+\s+)?(-?\d{1,6})\s+(?:M\s+)?(\S.*)$/.exec(l);
    if (m && /^-?\d+$/.test(m[1]) && (m[1].startsWith("-") || m[1] === "0")) { err = [m[1], m[2].trim()]; errors.push(err); }
    else if (err && l.trim() && !/^(Lỗi |STT )/.test(l.trim())) err[1] += " " + l.trim();
  }
  return { messages: messages.join("\n"), notes: notes.join("\n"), errors: errors.map(([c, d]) => `${c}|${clean(d)}`).join("\n") };
}

const emit = (name, comment, obj) => `${comment}\nconst ${name} = {\n${Object.entries(obj).map(([k, v]) => `  ${k}: \`${v}\`,`).join("\n")}\n};\n`;
fs.mkdirSync(outDir, { recursive: true });
// The UI fills {venue} with the CompID found in the pasted FIX data, so the spec text never hard-codes an exchange name.
const venueEsc = venueName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const toPlaceholder = s => s.replace(new RegExp(`${venueEsc}(?=[^\\W\\d_])`, "g"), "{venue} ").replace(new RegExp(venueEsc, "g"), "{venue}");
const o = orchestra(orchestraFile), c = Object.fromEntries(Object.entries(cbts(cbtsFile)).map(([k, v]) => [k, toPlaceholder(v)]));
fs.writeFileSync(path.join(outDir, "fix44-orchestra-descriptions-data.js"), emit("FixDocStd",
  "// GENERATED from FIXTradingCommunity/orchestrations OrchestraFIX44.xml (Apache-2.0; FIX content © FIX Protocol Ltd) — field: tag|synopsis · code: tag|value|synopsis · message: type|synopsis.", o));
fs.writeFileSync(path.join(outDir, "venue-fix-spec-notes-data.js"), emit("FixDocVenue",
  "// GENERATED from the venue FIX spec \"Message & Protocol for Gate v1.15\" — message: key|title|purpose · note: key|tag|Y/N|text (¶ = line break) · error: code|text. key = MsgType, ExecutionReport = 8/<ExecType>. {venue} = venue name taken from the FIX data.", c));
console.log({ fields: o.fields.split("\n").length, codes: o.codes.split("\n").length, msgs: o.messages.split("\n").length,
  venueMsgs: c.messages.split("\n").length, venueNotes: c.notes.split("\n").length, errors: c.errors.split("\n").length });

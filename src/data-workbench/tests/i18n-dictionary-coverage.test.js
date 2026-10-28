// Every Vietnamese UI string (markup text/title/placeholder, string literals, T() keys) must have an English entry.
// Run: node --test src/data-workbench/tests/i18n-dictionary-coverage.test.js   (LIST=1 prints the missing keys as JSON)
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.join(__dirname, "..");
const read = f => fs.readFileSync(path.join(root, f), "utf8");
const walk = dir => fs.readdirSync(path.join(root, dir), { withFileTypes: true })
  .flatMap(d => d.isDirectory() ? walk(`${dir}/${d.name}`) : [`${dir}/${d.name}`]);

const VI = /[àáảãạăằắẳẵặâầấẩẫậèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵđ]/;
const NOT_UI = /\/(demo-samples|en-[\w-]+)\.js$|i18n-ui-language/;
const KEEP = new Set(["Phan Ngọc Minh Quân"]);

const ctx = vm.createContext({ localStorage: { getItem: () => "en" } });
vm.runInContext(["js/core/i18n-ui-language-vi-en.js", ...walk("js/i18n")].map(read).join("\n;\n") + "\n;globalThis.I = I18n;", ctx);

// Splits one source line into "..."/'...' literals and the remaining code; regex literals and // comments are dropped.
function scan(line) {
  const literals = [];
  let code = "", i = 0;
  while (i < line.length) {
    const c = line[i];
    if (c === '"' || c === "'") {
      let j = i + 1;
      while (j < line.length && line[j] !== c) j += line[j] === "\\" ? 2 : 1;
      literals.push({ text: line.slice(i, j + 1), at: i, before: line.slice(0, i) });
      code += '""'; i = j + 1;
    } else if (c === "/" && line[i + 1] === "/") break;
    else if (c === "/" && /[=(,:!&|?{};]\s*$|^\s*$|return\s*$/.test(code)) {
      let j = i + 1, cls = false;
      while (j < line.length && (cls || line[j] !== "/")) { if (line[j] === "\\") j++; else if (line[j] === "[") cls = true; else if (line[j] === "]") cls = false; j++; }
      code += "/re/"; i = j + 1;
    } else { code += c; i++; }
  }
  return { literals, code };
}

function jsKeys() {
  const keys = new Map();
  for (const f of walk("js").filter(f => f.endsWith(".js") && !NOT_UI.test(f))) {
    read(f).split("\n").forEach((line, i) => {
      const { literals, code } = scan(line);
      for (const l of literals) if (/\bT\($/.test(l.before) || VI.test(l.text)) keys.set(vm.runInNewContext(l.text), `${f}:${i + 1}`);
      assert.ok(!VI.test(code), `${f}:${i + 1} Vietnamese text outside a "..." literal cannot be translated — use T(): ${line.trim()}`);
    });
  }
  return keys;
}

function markupKeys() {
  const keys = new Map();
  const decode = s => s.replace(/&quot;/g, '"').replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&#10;/g, "\n").replace(/&amp;/g, "&");
  for (const f of ["data-workbench.template.html", ...walk("partials")]) {
    const html = read(f);
    for (const m of html.matchAll(/>([^<>]+)</g)) if (VI.test(m[1])) keys.set(decode(m[1].trim()), f);
    for (const m of html.matchAll(/\b(?:title|placeholder)="([^"]*)"/g)) if (VI.test(m[1])) keys.set(decode(m[1]), f);
  }
  return keys;
}

const allKeys = () => [...jsKeys(), ...markupKeys()].filter(([k]) => !KEEP.has(k));

test("i18n: every Vietnamese UI string has an English translation", () => {
  const missing = allKeys().filter(([k]) => ctx.I.t(k) === k);
  if (process.env.LIST) console.log(JSON.stringify(Object.fromEntries(missing), null, 1));
  assert.equal(missing.length, 0, "Missing English for:\n" + missing.map(([k, at]) => `  ${at}  ${k}`).join("\n"));
});

test("i18n: placeholders match between Vietnamese and English", () => {
  const names = s => [...new Set([...s.matchAll(/\{(\w+)\}/g)].map(m => m[1]))].sort().join(",");
  for (const [k] of allKeys()) {
    const en = ctx.I.t(k);
    if (en !== k) assert.equal(names(en), names(k), `placeholders differ: ${k} → ${en}`);
  }
});

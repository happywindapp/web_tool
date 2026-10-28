// Every Vietnamese UI string (markup text/title/placeholder, "…" literals, T() keys) must have an English entry with the same {placeholders}.
// Run: node --test src/fix-message-parser/tests/i18n-dictionary-coverage.test.js   (LIST=1 prints the missing keys as JSON)
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.join(__dirname, "..");
const read = f => fs.readFileSync(path.join(root, f), "utf8");
const walk = dir => fs.readdirSync(path.join(root, dir), { withFileTypes: true })
  .flatMap(d => d.isDirectory() ? walk(`${dir}/${d.name}`) : [`${dir}/${d.name}`]);

const VI = /[àáảãạăằắẳẵặâầấẩẫậèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵđ]/i;
const UI_JS = f => f.endsWith(".js") && !/\/(dictionary|i18n)\/|\/(venue-trade|fix44-order)/.test(f);
const KEEP = new Set(["Phan Ngọc Minh Quân"]);

const ctx = vm.createContext({ localStorage: { getItem: () => "en" } });
vm.runInContext([read("../data-workbench/js/core/i18n-ui-language-vi-en.js"), ...walk("js/i18n").map(read)].join("\n;\n") + "\n;globalThis.I = I18n;", ctx);

function jsKeys() {
  const keys = new Map();
  for (const f of walk("js").filter(UI_JS)) read(f).split("\n").forEach((line, i) => {
    if (/^\s*\/\//.test(line)) return;
    for (const m of line.matchAll(/(\bT\(\s*)?"((?:[^"\\]|\\.)*)"/g)) if (m[1] || VI.test(m[2])) keys.set(JSON.parse(`"${m[2]}"`), `${f}:${i + 1}`);
    const code = line.replace(/\bT\(\s*"(?:[^"\\]|\\.)*"/g, "T(");
    for (const tpl of code.matchAll(/`[^`]*`/g)) assert.ok(!VI.test(tpl[0]), `${f}:${i + 1} Vietnamese inside a template literal cannot be translated — use T("… {x} …", { x })`);
  });
  return keys;
}

function markupKeys() {
  const keys = new Map(), html = read("fix-message-parser.template.html");
  const decode = s => s.replace(/&quot;/g, '"').replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&");
  for (const m of html.matchAll(/>([^<>]+)</g)) if (VI.test(m[1])) keys.set(decode(m[1].trim()), "template");
  for (const m of html.matchAll(/\b(?:title|placeholder)="([^"]*)"/g)) if (VI.test(m[1])) keys.set(decode(m[1]), "template");
  return keys;
}

const allKeys = () => [...jsKeys(), ...markupKeys()].filter(([k]) => !KEEP.has(k));

test("i18n: every Vietnamese UI string has an English translation", () => {
  const missing = allKeys().filter(([k]) => VI.test(k) && ctx.I.t(k) === k);
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

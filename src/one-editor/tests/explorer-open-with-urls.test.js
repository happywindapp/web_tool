// Run: node --test src/one-editor/tests/explorer-open-with-urls.test.js — URL builders of the Explorer "Open with" menu, browser-tab kinds, root path joining.
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const ROOT = path.join(__dirname, "..");
const ctx = vm.createContext({ Explorer: { root: () => ({ name: "web", path: "web" }) } });
for (const f of ["js/workbench/explorer-local-root-path.js", "js/workbench/explorer-open-in-browser-tab.js", "js/workbench/explorer-open-with-apps-menu.js", "js/workbench/open-with-windows-protocol-setup.js"])
  vm.runInContext(fs.readFileSync(path.join(ROOT, f), "utf8"), ctx);
const { OpenWith, BrowserTab, LocalRoot, OpenWithSetup } = vm.runInContext("({ OpenWith, BrowserTab, LocalRoot, OpenWithSetup })", ctx);
const BS = "\\";

test("vscode:// keeps the drive, encodes segments, adds line:col", () => {
  assert.equal(OpenWith.vscodeUrl(["C:", "a b", "x#1.js"].join(BS), [12, 3]), "vscode://file/C:/a%20b/x%231.js:12:3");
  assert.equal(OpenWith.vscodeUrl("C:" + BS, null), "vscode://file/C:/");
});

test("search-ms: and oneeditor-open: carry the path encoded", () => {
  assert.equal(OpenWith.searchMsUrl("C:" + BS + "w", "w"), "search-ms:displayname=w&crumb=location:C%3A%5Cw");
  assert.equal(OpenWith.protocolUrl("gitbash", "C:" + BS + "a&b"), "oneeditor-open:gitbash?C%3A%5Ca%26b");
});

test("dirOf keeps a drive root", () => {
  assert.equal(OpenWith.dirOf("C:" + BS + "x.txt"), "C:" + BS);
  assert.equal(OpenWith.dirOf(["C:", "a", "x.txt"].join(BS)), "C:" + BS + "a");
});

test("LocalRoot.abs joins the relative node path with backslashes", () => {
  assert.equal(LocalRoot.abs({ path: "web/src/a.js" }, "C:" + BS + "_web_tool"), ["C:", "_web_tool", "src", "a.js"].join(BS));
  assert.equal(LocalRoot.abs({ path: "web" }, "D:" + BS), "D:" + BS);
  assert.equal(LocalRoot.abs({ path: "web/a" }, "D:" + BS), "D:" + BS + "a");
});

test("LocalRoot.known: full path only when the root path is saved and the node is under the local root", () => {
  ctx.Prefs = { get: () => ({}) };
  assert.equal(LocalRoot.known({ path: "web/a.js" }), "");
  ctx.Prefs = { get: () => ({ web: "C:" + BS + "_bond" }) };
  assert.equal(LocalRoot.known({ path: "web/src/a.js" }), ["C:", "_bond", "src", "a.js"].join(BS));
  assert.equal(LocalRoot.known({ path: "web" }), "C:" + BS + "_bond");
  assert.equal(LocalRoot.known({ path: "webx/a.js" }), "");
  ctx.Explorer = { root: () => ({ name: "web", path: "web", remote: "gdrive" }) };
  assert.equal(LocalRoot.known({ path: "web/a.js" }), "");
  ctx.Explorer = { root: () => ({ name: "web", path: "web" }) };
});

test("BrowserTab.kindOf: HTML sandboxed, SVG as image, NUL ⇒ binary", () => {
  assert.equal(BrowserTab.kindOf("Index.HTML"), "html");
  assert.equal(BrowserTab.kindOf("logo.svg"), "image");
  assert.equal(BrowserTab.kindOf("doc.pdf"), "direct");
  assert.equal(BrowserTab.kindOf("a.bin", new Uint8Array([65, 0, 66])), "binary");
  assert.equal(BrowserTab.kindOf("a.js", new Uint8Array([65, 66])), "text");
});

test("launcher refuses UNC paths and only selects files", () => {
  assert.match(OpenWithSetup.SCRIPT, /notmatch '\^\[A-Za-z\]:\\\\'/);
  assert.match(OpenWithSetup.SCRIPT, /\/select,/);
  assert.doesNotMatch(OpenWithSetup.SCRIPT, /`/);
});

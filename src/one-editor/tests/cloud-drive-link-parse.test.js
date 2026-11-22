// Run: node --test src/one-editor/tests/cloud-drive-link-parse.test.js
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const ctx = vm.createContext({ T: s => s, URL, TextEncoder, btoa });
vm.runInContext(fs.readFileSync(path.join(__dirname, "../js/providers/cloud-drive-public-folder-provider.js"), "utf8") + "\n;globalThis.CloudDrive = CloudDrive;", ctx);
const { CloudDrive } = ctx;
const eq = (a, b) => assert.deepEqual(JSON.parse(JSON.stringify(a)), b);

test("Google Drive folder links → folder id", () => {
  eq(CloudDrive.parse("https://drive.google.com/drive/folders/1Op6CVXItmypmaM98I5HZc8T-4Nl3Oo68?usp=drive_link"), { kind: "gdrive", id: "1Op6CVXItmypmaM98I5HZc8T-4Nl3Oo68" });
  eq(CloudDrive.parse(" https://drive.google.com/drive/u/1/folders/18beAGIDF3XQczbDcmqPcAoDwtC26P1S- "), { kind: "gdrive", id: "18beAGIDF3XQczbDcmqPcAoDwtC26P1S-" });
  eq(CloudDrive.parse("https://drive.google.com/open?id=18beAGIDF3XQczbDcmqPcAoDwtC26P1S-"), { kind: "gdrive", id: "18beAGIDF3XQczbDcmqPcAoDwtC26P1S-" });
  eq(CloudDrive.parse("https://drive.google.com/file/d/1NVSEe5E1RY3gHVIPE23G2llJATDIzbGe/view"), null);
});

test("OneDrive personal / business / unknown links", () => {
  eq(CloudDrive.parse("https://1drv.ms/f/c/dc16d91ddd7dc10d/IgAwiOUEMnqFQqW_2XeWUqRBAT_xAp-D_ywvj3ThfG4vO8U?e=aawCTu#x"), { kind: "onedrive", url: "https://1drv.ms/f/c/dc16d91ddd7dc10d/IgAwiOUEMnqFQqW_2XeWUqRBAT_xAp-D_ywvj3ThfG4vO8U?e=aawCTu" });
  eq(CloudDrive.parse("https://contoso-my.sharepoint.com/:f:/g/personal/a/xyz"), { kind: "business" });
  eq(CloudDrive.parse("https://onedrive.live.com/shared?id=%2Fpersonal%2Fdc16d91ddd7dc10d%2FDocuments%2FTest&ithint=folder&e=X4YrME&migratedtospo=true&ga=1"), { kind: "odpage" }, "address bar of the page: no share token");
  eq(CloudDrive.parse("https://onedrive.live.com/?authkey=%21AB&id=DC16%21123&cid=DC16"), { kind: "onedrive", url: "https://onedrive.live.com/?authkey=%21AB&id=DC16%21123&cid=DC16" });
  eq(CloudDrive.parse("http://1drv.ms/f/s!abc"), null);
  eq(CloudDrive.parse("https://example.com/drive/folders/1Op6CVXItmypmaM98I5HZc8T"), null);
  eq(CloudDrive.parse("not a link"), null);
});

test("OneDrive share id = u! + base64url without padding", () => {
  assert.equal(CloudDrive.shareId("https://1drv.ms/f/c/dc16d91ddd7dc10d/IgAwiOUEMnqFQqW_2XeWUqRBAT_xAp-D_ywvj3ThfG4vO8U?e=aawCTu"),
    "u!aHR0cHM6Ly8xZHJ2Lm1zL2YvYy9kYzE2ZDkxZGRkN2RjMTBkL0lnQXdpT1VFTW5xRlFxV18yWGVXVXFSQkFUX3hBcC1EX3l3dmozVGhmRzR2TzhVP2U9YWF3Q1R1");
  assert.match(CloudDrive.shareId("https://1drv.ms/f/s!Aé?"), /^u![A-Za-z0-9_-]+$/);
});

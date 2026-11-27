// Phase 14f demo content (label in demo-samples-file-ai-14f.js): a SHA-256 sum file checked against 3 open tabs — 2 match, 1 was edited after the sums were made, 1 file is missing. All fake.
Object.assign(PowerDemos, (() => {
  const t = (n, text, l = "") => ({ n, l, t: text });
  const sha = text => { const h = ShaSum.create("SHA-256"); h.update(new TextEncoder().encode(text)); return h.hex(); };
  const README = "# Demo Release 1.4.2 (fake)\n\nOrder gateway build for the demo exchange. Not a real product.\n";
  const CONFIG = "{\n  \"service\": \"order-gateway\",\n  \"port\": 9443,\n  \"maxOrdersPerSecond\": 200\n}\n";
  const NOTES = "Release notes (fake demo)\n- Faster order routing\n- Fixed a rounding bug in fees\n";
  const SUMS = () => "# SHA-256 checksums of demo-release-1.4.2 (fake) — made with sha256sum\n" + ShaSum.format([
    { hash: sha(README), name: "README.md" }, { hash: sha(CONFIG.replace("9443", "8443")), name: "config.json" },
    { hash: sha(NOTES), name: "NOTES.txt" }, { hash: sha("binary build"), name: "bin/order-gateway.exe" }]);
  return {
    "checksum-verify": { payload: () => ({ v: 1, views: [[t("demo-release-1.4.2.sha256", SUMS())], [t("README.md", README, "Markdown"), t("config.json", CONFIG, "JSON"), t("NOTES.txt", NOTES)]], run: "checksum-verify" }) },
  };
})());

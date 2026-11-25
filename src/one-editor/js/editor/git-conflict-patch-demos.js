// Phase 14e demo content (labels in demo-samples-git-14e.js): a merge with 2 conflicts (one diff3) next to a Markdown file whose "=======" heading is not a conflict; a 2-file patch whose second hunk sits 3 lines lower in the open tab. All fake.
Object.assign(PowerDemos, (() => {
  const t = (n, text, l = "") => ({ n, l, t: text });
  const CONFLICT = [
    "// Fake demo: order-service.js after `git merge feature/limit-orders` — 2 conflicts, the second in diff3 style.",
    "const DEFAULT_LIMIT = 100;",
    "",
    "<<<<<<< HEAD",
    "function placeOrder(account, symbol, qty) {",
    "  return submit({ account, symbol, qty, type: \"MARKET\" });",
    "}",
    "=======",
    "function placeOrder(account, symbol, qty, price) {",
    "  const type = price ? \"LIMIT\" : \"MARKET\";",
    "  return submit({ account, symbol, qty, price, type });",
    "}",
    ">>>>>>> feature/limit-orders",
    "",
    "function cancelOrder(id) {",
    "<<<<<<< HEAD",
    "  log(\"cancel\", id);",
    "||||||| merged common ancestor",
    "  console.log(\"cancel\", id);",
    "=======",
    "  audit.write({ action: \"cancel\", id });",
    ">>>>>>> feature/limit-orders",
    "  return api.delete(\"/orders/\" + id);",
    "}",
    "",
  ].join("\n");
  const NOTES = "Release notes\n=======\n\nA setext heading underline is not a conflict marker: this tab shows no conflict.\n\nKnown issues\n-------\n\n- None (fake demo).\n";

  const ORDER = [
    "// Fake demo order service.",
    "const DEFAULT_LIMIT = 100;",
    "",
    "function placeOrder(account, symbol, qty) {",
    "  return submit({ account, symbol, qty, type: \"MARKET\" });",
    "}",
    "",
    "function listOrders(account) {",
    "  return api.get(\"/orders?account=\" + account);",
    "}",
    "",
    "function orderStatus(id) {",
    "  return api.get(\"/orders/\" + id + \"/status\");",
    "}",
    "",
    "function cancelOrder(id) {",
    "  console.log(\"cancel\", id);",
    "  return api.delete(\"/orders/\" + id);",
    "}",
    "",
  ].join("\n");
  const ORDER_NEW = ORDER.replace("function placeOrder(account, symbol, qty) {\n  return submit({ account, symbol, qty, type: \"MARKET\" });",
    "function placeOrder(account, symbol, qty, price) {\n  const type = price ? \"LIMIT\" : \"MARKET\";\n  return submit({ account, symbol, qty, price, type });")
    .replace("  console.log(\"cancel\", id);", "  audit.write({ action: \"cancel\", id });");
  // The open tab gained 3 lines after the patch was made ⇒ hunk 2 applies 3 lines lower (fuzz).
  const ORDER_TAB = ORDER.replace("function orderStatus", "// Added after the patch was made.\nconst RETRIES = 3;\n\nfunction orderStatus");
  const CFG = "service: orders\nport: 8080\nlimits:\n  maxQty: 10000\n  maxOrdersPerMinute: 60\nlog:\n  level: info\n";
  const CFG_NEW = CFG.replace("maxQty: 10000", "maxQty: 5000").replace("level: info", "level: debug\n  audit: true");
  const PATCH = () => "From 0000000000000000000000000000000000000000 Mon Sep 17 00:00:00 2001\nFrom: Demo Dev <dev@demo.example.invalid>\nSubject: [PATCH] Limit orders + audit log (fake demo)\n\n---\n"
    + UnifiedPatch.create(ORDER, ORDER_NEW, "src/order-service.js") + UnifiedPatch.create(CFG, CFG_NEW, "config/app.yaml");

  return {
    "git-conflict": { payload: () => ({ v: 1, views: [[t("order-service.js", CONFLICT, "JavaScript")], [t("RELEASE-NOTES.md", NOTES, "Markdown")]] }) },
    "patch-apply": { payload: () => ({ v: 1, views: [[t("limit-orders.patch", PATCH())], [t("order-service.js", ORDER_TAB, "JavaScript"), t("app.yaml", CFG, "YAML")]], run: "patch-view" }) },
  };
})());

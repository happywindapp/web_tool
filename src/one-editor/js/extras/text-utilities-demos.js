// Phase 15a demo content (labels in demo-samples-text-utils-15a.js). All data fake; the slug sample is Vietnamese on purpose (accent removal).
Object.assign(PowerDemos, (() => {
  const t = (n, text, l = "") => ({ n, l, t: text });
  const tab = name => Docs.list().find(d => d.kind === "temp" && d.name === name);
  const CASES = "order book snapshot\nmax_orders_per_second\nClientOrderID\nsettlement-date-t2\nHttpRequestTimeout\nfee.rate.percent\n";
  const IDS = Array.from({ length: 1200 }, (x, i) => "ORD-" + (100001 + i)).join("\n") + "\n";
  const LOG = `2026-11-20 09:15:02.114 INFO  gateway started on 0.0.0.0:9443 (pid 4120), docs at https://docs.example.com/gateway/v2?lang=en.
2026-11-20 09:15:03.900 WARN  client 10.20.30.41 retried 3x; contact ops-team@demo-broker.example or see (https://status.example.org/incidents/42).
2026-11-20 09:15:04.001 ERROR peer 10.20.30.256 rejected: bad octet; fallback to [2001:db8:85a3::8a2e:370:7334]:9443
2026-11-20 09:15:05.120 INFO  heartbeat from fe80::1ff:fe23:4567:890a, mac 00:1a:2b:3c:4d:5e, build 1.2.3.4.5
2026-11-20 09:15:06.450 INFO  client 10.20.30.41 reconnected; report sent to risk.desk@demo-broker.example, ops-team@demo-broker.example
2026-11-20 09:15:07.003 DEBUG mirror www.example.net/feeds/latest, ipv4-mapped ::ffff:192.0.2.33
`;
  const TITLES = 'Hướng dẫn đặt lệnh mua cổ phiếu\nBáo cáo giao dịch tháng 11/2026\nĐiều khoản & Chính sách bảo mật (bản thử)\n';
  const HTML = `<h1>Release notes 1.4.2 (fake)</h1>
<p>Faster <b>order routing</b> and a fix for <a href="https://example.com/fees">fee rounding</a>.</p>
${"<"}script>alert("never runs")${"<"}/script>
<ul><li>New: bulk cancel</li><li>Fixed: T+2 date on holidays</li></ul>
<table><tr><th>Symbol</th><th>Qty</th></tr><tr><td>ACME</td><td>1,000</td></tr><tr><td>DEMO</td><td>250</td></tr></table>
<pre>  limit = 200
  burst = 50</pre>
`;
  const AMOUNTS = "Invoice INV-2026-0042: 1.250.000\nDeposit: 15.000.000,50\nFee: 21\nRefund: 105\nBudget: 2.000.000.000.000\n";
  const MESSAGE = "order=ORD-1001&qty=100&price=25.50&ts=1764212400000";
  const NETWORK = "10.20.30.0/22\n192.168.1.7/31\n2001:db8:abcd:12::/48\n";
  const IDS2 = "0197c1e4-6a40-7b3e-9a6f-1c2d3e4f5a6b\n01JDQ3Z8K4M5N6P7Q8R9S0T1V2\nrwxr-x---\n4755\n";
  const runRecipe = (name, steps) => { const d = tab(name); if (d) { PowerUi.saveOpts(d.id, "recipe", steps, RecipeRun.clean(steps)); OutputLink.run(d, "recipe"); } };

  return {
    "case-styles": { payload: () => ({ v: 1, views: [[t("identifiers.txt", CASES)], []] }),
      after: () => { const v = Views.activeView(); v.dispatch({ selection: { anchor: 0, head: v.state.doc.length } }); v.focus(); StatusBar.msg(T("Đã chọn cả tab — chuột phải ▸ “Aa Đổi kiểu chữ ▸”, hoặc Palette “Chữ: …”.")); } },
    "wrap-sql-in": { payload: () => ({ v: 1, views: [[t("order-ids.txt", IDS)], []], run: "wrap-lines", opts: { ...WrapLines.DEF, ...WrapLines.PRESETS["sql-in"] } }) },
    "extract-ips-urls": { payload: () => ({ v: 1, views: [[t("gateway.log", LOG, "Log")], []], run: "extract", opts: { kinds: ExtractText.KINDS, unique: true, count: true } }) },
    "slug-html-text": { payload: () => ({ v: 1, views: [[t("titles.txt", TITLES), t("release-notes.html", HTML, "HTML")], []], run: "slug-lines" }),
      after: () => { const d = tab("release-notes.html"); if (d) OutputLink.run(d, "html-to-text"); } },
    "number-words-vi": { payload: () => ({ v: 1, views: [[t("amounts.txt", AMOUNTS)], []], run: "number-words", opts: { lang: "vi", dong: true, cap: true } }) },
    // No run in the payload: the HMAC key is set here in memory, the way the recipe pane keeps it (never in a link).
    "encoders-hmac-cidr": { payload: () => ({ v: 1, views: [[t("message.txt", MESSAGE), t("network.txt", NETWORK), t("ids-and-modes.txt", IDS2)], []] }),
      after: () => {
        runRecipe("message.txt", [{ op: "hmac", on: true, args: { alg: "SHA-256", key: "demo-secret", keyFmt: "text", out: "hex" } }]);
        runRecipe("network.txt", [RecipeRun.step("cidr")]);
        StatusBar.msg(T("Khoá HMAC mẫu “demo-secret” chỉ nằm trong bộ nhớ. Tab ids-and-modes.txt: đặt con trỏ vào dòng ▸ Palette “UUID v7 / ULID → thời điểm” / “chmod”."));
      } },
  };
})());

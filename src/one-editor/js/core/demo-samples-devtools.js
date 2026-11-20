// Phase 8c demos (dev text tools) added to DEMOS; the token is built here from fake claims, its signature is a placeholder.
(() => {
  const t = (n, text) => ({ n, l: "", t: text });
  const b64u = o => btoa(JSON.stringify(o)).replace(/=+$/, "").replace(/\+/g, "-").replace(/\//g, "_");
  const token = () => b64u({ alg: "HS256", typ: "JWT", kid: "demo-key-1" }) + "." + b64u({
    sub: "user-1042", name: "Demo Trader", role: ["viewer", "trader"], iss: "https://auth.example.com", aud: "order-service",
    iat: 1763625600, nbf: 1763625600, exp: 1893456000,
  }) + ".ZGVtby1zaWduYXR1cmUtbm90LXJlYWw";
  const JWT = () => `# A fake JWT (made-up claims, placeholder signature). The token can sit anywhere in the tab.
GET /api/orders HTTP/1.1
Host: api.example.com
Authorization: Bearer ${token()}
`;
  const URL_TEXT = "https://shop.example.com/search?q=red+shoes&size=42&size=43&sort=price_asc&note=50%25%20off&utm_source=newsletter#results\n";
  const NUMBERS = `# Hover a number or a date for its conversions, or put the cursor on it and run
# "Epoch <-> ISO date" or "Number: to hex" from the Command Palette (Ctrl+Shift+P).
created_at   = 1763630400
updated_ms   = 1763634000123
expires      = 2026-12-31T23:59:59Z
local_time   = 2026-11-20 09:30:00
flags        = 0x1F
mask         = 0b1011
order_id     = 4096
escaped_json = {\\"symbol\\":\\"ACME\\",\\"qty\\":100}
`;
  const one = (name, text, run) => () => ({ v: 1, views: [[t(name, typeof text === "function" ? text() : text)], []], run });

  Object.assign(DEMOS, {
    "jwt": { label: "JWT decode (không kiểm chữ ký)", payload: one("request.http", JWT, "jwt") },
    "url-query": { label: "URL → bảng tham số query", payload: one("link.txt", URL_TEXT, "url-parts") },
    "dev-numbers": { label: "Epoch · hex · ngày giờ (rê chuột lên số)", payload: one("timestamps.txt", NUMBERS) },
  });
})();

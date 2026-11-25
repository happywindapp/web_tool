// Phase 14a demos: profile backup file, sticky scroll, smart paste; content is fake and in English.
(() => {
  const t = (n, text) => ({ n, l: "", t: text });
  // Writing aids are installed once the page is ready (after the first paint).
  const whenReady = fn => { const go = () => document.body.classList.contains("ready") ? fn() : setTimeout(go, 100); go(); };
  const b64u = s => btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  const PROFILE = JSON.stringify({ app: "one-editor-profile", version: 1, created: "2026-11-25T09:00:00.000Z",
    prefs: { font: 14, sticky: true, keys: "vscode" },
    meta: { snippets: [{ prefix: "ordlog", body: "console.log(\"order\", ${1:id});", lang: "JavaScript", desc: "log an order" }], macros: {}, replaceSets: [], recipes: [{ name: "b64 → text", steps: [{ op: "b64dec" }] }],
      groups: [{ id: "g-demo", name: "Desk", items: [{ kind: "note", id: "note-demo-1" }] }], pinned: [{ kind: "note", id: "note-demo-1" }], tags: {} },
    notes: [{ id: "note-demo-1", kind: "note", name: "desk-checklist.md", lang: "Markdown", text: "# Desk checklist\n\n- open the session\n- check limits\n", updated: 1764061200000 }] }, null, 2);

  function body(n) {
    const out = [];
    for (let i = 1; i <= n; i++) out.push(`      const step${i} = book.levels[${i % 5}]?.qty ?? 0;`, `      total += step${i} * price;`);
    return out.join("\n");
  }
  const ENGINE_TS = `// Sticky scroll demo: scroll down — the class / method / if lines stay pinned at the top.
export class MatchingEngine {
  private books = new Map<string, OrderBook>();

  constructor(private readonly venue: string) {}

  public reprice(symbol: string, price: number): number {
    const book = this.books.get(symbol);
    let total = 0;
    if (book) {
      for (const side of ["BUY", "SELL"]) {
${body(40)}
      }
    }
    return total;
  }
}
`;
  const GUIDE_MD = ["# Operations guide", "", "## Market open", "", ...Array.from({ length: 30 }, (x, i) => `- Pre-open check ${i + 1}: confirm limits and sessions.`), "", "### Auction", "",
    ...Array.from({ length: 30 }, (x, i) => `Auction note ${i + 1}: orders queue until the uncross.`), "", "## Market close", "", "Reconcile fills.", ""].join("\n");

  function scrollTo(line) {
    whenReady(() => {
      for (const g of Views.groups.slice(0, Views.count)) if (g.active) {
        const st = g.view.state, pos = st.doc.line(Math.min(line, st.doc.lines)).from;
        g.view.dispatch({ effects: CM.view.EditorView.scrollIntoView(pos, { y: "start" }) });
      }
    });
  }

  const JWT = b64u(JSON.stringify({ alg: "HS256", typ: "JWT" })) + "." + b64u(JSON.stringify({ sub: "DEMO-001", name: "Demo Trader", role: "dealer", iat: 1764061200, exp: 1764064800 })) + ".c2lnbmF0dXJlLW5vdC1jaGVja2Vk";
  const B64 = btoa("Settlement batch DEMO-42 closed: 128 trades, 0 breaks.\n");

  Object.assign(DEMOS, {
    "profile-backup": { label: "Sao lưu profile: file mẫu + ⚙ Dữ liệu đã lưu", payload: () => ({ v: 1, views: [[t("one-editor-profile-sample.json", PROFILE)], []] }),
      after: () => whenReady(() => { SettingsTab.open("data", 1); StatusBar.msg(T("Mẫu: file profile ở View 1 (JSON, không nén). ⚙ Dữ liệu đã lưu ▸ ⬇ Xuất profile / ⬆ Nhập profile — nhập sẽ tải lại trang."), "good"); }) },
    "sticky-scroll": { label: "Sticky scroll: class / method / heading dính đầu màn hình", payload: () => ({ v: 1, views: [[t("matching-engine.ts", ENGINE_TS)], [t("operations-guide.md", GUIDE_MD)]] }), after: () => scrollTo(45) },
    "smart-paste": { label: "Dán thông minh: JWT + Base64 ⇒ gợi ý phép ▶", payload: () => ({ v: 1, views: [[t("pasted-token", JWT + "\n")], [t("pasted-blob", B64 + "\n")]] }),
      after: () => whenReady(() => SmartPaste.detectVisible()) },
  });
})();

// Snippets: a built-in set per language + the user's own (IndexedDB meta "snippets"), offered in autocomplete by prefix and from the Palette; ${1:field} placeholders, Tab moves on.
const Snippets = (() => {
  const JS = ["JavaScript", "TypeScript", "JSX", "TSX"];
  const BUILT = [
    ["log", JS, "console.log(${1:value});", "console.log"], ["fn", JS, "function ${1:name}(${2:args}) {\n\t${3}\n}", "function"],
    ["afn", JS, "const ${1:name} = (${2:args}) => {\n\t${3}\n};", "arrow function"], ["forof", JS, "for (const ${1:item} of ${2:items}) {\n\t${3}\n}", "for … of"],
    ["try", JS, "try {\n\t${1}\n} catch (${2:e}) {\n\t${3}\n}", "try / catch"], ["imp", JS, "import { ${2:name} } from \"${1:module}\";", "import"],
    ["def", ["Python"], "def ${1:name}(${2:args}):\n    ${3:pass}", "def"], ["ifmain", ["Python"], "if __name__ == \"__main__\":\n    ${1:main()}", "__main__"],
    ["func", ["Go"], "func ${1:name}(${2:args}) ${3:error} {\n\t${4}\n}", "func"], ["iferr", ["Go"], "if err != nil {\n\treturn ${1:err}\n}", "if err != nil"],
    ["sel", ["SQL"], "SELECT ${1:*}\nFROM ${2:table}\nWHERE ${3:1 = 1};", "SELECT"], ["upd", ["SQL"], "UPDATE ${1:table}\nSET ${2:col} = ${3:value}\nWHERE ${4:id} = ${5:1};", "UPDATE"],
    ["flex", ["CSS", "SCSS", "LESS"], "display: flex;\nalign-items: ${1:center};\ngap: ${2:8px};", "flexbox"], ["media", ["CSS", "SCSS", "LESS"], "@media (max-width: ${1:640px}) {\n\t${2}\n}", "@media"],
    ["table", ["Markdown"], "| ${1:Col} | ${2:Col} |\n| --- | --- |\n| ${3} | ${4} |", "table"], ["code", ["Markdown"], "```${1:js}\n${2}\n```", "code block"],
    ["class", ["C#", "Java"], "public class ${1:Name}\n{\n\t${2}\n}", "class"],
  ].map(([prefix, langs, body, desc]) => ({ prefix, langs, body, desc }));
  let mine = [], loading = null;

  const load = () => loading ??= NotesDb.getMeta("snippets").then(v => { mine = Array.isArray(v) ? v.filter(s => s && typeof s.prefix === "string" && typeof s.body === "string") : []; }, () => { mine = []; });
  // true when written; IndexedDB blocked / failing is reported.
  const store = () => NotesDb.putMeta("snippets", mine).then(ok => ok || Promise.reject(new Error(T("trình duyệt chặn IndexedDB")))).then(() => true, e => { StatusBar.msg(T("Không lưu được snippet: {msg}", { msg: e.message }), "bad"); return false; });
  const forLang = lang => [...mine.filter(s => !s.lang || s.lang === lang).map(s => ({ ...s, own: true })), ...BUILT.filter(s => s.langs.includes(lang))];
  const langOf = view => { const g = Views.groups.find(x => x.view === view), d = g && Docs.get(g.active); return d ? Docs.effectiveLang(d) : ""; };

  function source(ctx) {
    const w = ctx.matchBefore(/[\w$-]+/);
    if (!w || (w.from === w.to && !ctx.explicit)) return null;
    const list = forLang(langOf(ctx.view)).filter(s => s.prefix.startsWith(w.text));
    return list.length ? { from: w.from, options: list.map(s => CM.autocomplete.snippetCompletion(s.body, { label: s.prefix, detail: s.desc || T("snippet"), type: "text", boost: s.own ? 2 : 1 })) } : null;
  }
  const extension = () => CM.state.EditorState.languageData.of(() => [{ autocomplete: source }]);

  async function pick() {
    await load();
    const v = Views.activeView(), list = forLang(langOf(v));
    if (!list.length) { StatusBar.msg(T("Chưa có snippet cho ngôn ngữ này — bôi đen đoạn code rồi “Snippet: lưu vùng chọn…”."), "warn"); return; }
    QuickPick.pick(list.map(s => ({ label: s.prefix + (s.own ? " ★" : ""), detail: s.desc || s.body.split("\n")[0].slice(0, 60), run: () => { const r = v.state.selection.main; CM.autocomplete.snippet(s.body)(v, null, r.from, r.to); v.focus(); } })), T("Chọn snippet để chèn"));
  }

  async function saveSelection() {
    await load();
    const v = Views.activeView(), r = v.state.selection.main, body = v.state.sliceDoc(r.from, r.to);
    if (!body.trim()) { StatusBar.msg(T("Bôi đen đoạn code cần lưu thành snippet trước."), "warn"); return; }
    const prefix = (prompt(T("Tên gọi tắt của snippet (gõ tên này rồi chọn trong gợi ý):"), "") || "").trim();
    if (!prefix) return;
    const lang = langOf(v), esc = body.replace(/\\(?=[{}])/g, "\\\\").replace(/([$#])\{/g, "$1\\{");
    mine = [{ prefix, body: esc, lang, desc: T("của tôi · {lang}", { lang }) }, ...mine.filter(s => !(s.prefix === prefix && s.lang === lang))].slice(0, 500);
    if (await store()) StatusBar.msg(T("✔ Đã lưu snippet “{prefix}” cho {lang} (trong trình duyệt này).", { prefix, lang }), "good");
  }

  async function pickDelete() {
    await load();
    if (!mine.length) { StatusBar.msg(T("Chưa có snippet nào của bạn."), "warn"); return; }
    QuickPick.pick(mine.map(s => ({ label: "🗑 " + s.prefix, detail: s.lang || "*", run: async () => { mine = mine.filter(x => x !== s); if (await store()) StatusBar.msg(T("Đã xoá snippet “{prefix}”.", { prefix: s.prefix }), "good"); } })), T("Chọn snippet của bạn để xoá"));
  }

  return { load, extension, source, pick, saveSelection, pickDelete, BUILT };
})();

// HTML → Markdown with turndown + GFM (tables, strikethrough, task lists); <pre><code class="language-x"> keeps x as the fence language.
const HtmlToMd = (() => {
  let service = null;

  function make() {
    const s = new TurndownService({ headingStyle: "atx", codeBlockStyle: "fenced", bulletListMarker: "-", emDelimiter: "*" });
    s.use(turndownPluginGfm.gfm);
    s.addRule("fencedLanguage", {
      filter: n => n.nodeName === "PRE" && n.firstChild && n.firstChild.nodeName === "CODE",
      replacement: (content, n) => {
        const code = n.firstChild, lang = (/(?:^|\s)(?:language|lang)-([\w#+-]+)/.exec(code.className || "") || [])[1] || "";
        const text = code.textContent.replace(/\n$/, ""), fence = "`".repeat(Math.max(3, ...(text.match(/`+/g) || []).map(m => m.length + 1)));
        return "\n\n" + fence + lang + "\n" + text + "\n" + fence + "\n\n";
      },
    });
    return s;
  }

  const convert = html => (service ??= make()).turndown(html) + "\n";
  return { convert };
})();

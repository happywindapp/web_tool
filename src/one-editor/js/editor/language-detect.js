// Language of a document: file name/extension → shebang/modeline → content score. Ids are CodeMirror language-data names plus a few with no highlighter yet.
const LangDetect = (() => {
  const PLAIN = "Plain Text";
  const EXT = {
    "JavaScript": "js mjs cjs", "TypeScript": "ts mts cts", "JSX": "jsx", "TSX": "tsx",
    "JSON": "json jsonc json5 map har ipynb webmanifest geojson babelrc eslintrc",
    "HTML": "html htm xhtml shtml", "CSS": "css", "SCSS": "scss", "LESS": "less", "Markdown": "md markdown mkd",
    "XML": "xml xsd xsl xslt svg drawio dio wsdl config csproj vbproj props targets plist resx pom nuspec xaml kml gpx rss atom dtsx",
    "YAML": "yaml yml", "SQL": "sql", "Python": "py pyw", "Go": "go", "Java": "java", "C#": "cs", "C": "c h",
    "C++": "cpp cc cxx hpp hh hxx", "Rust": "rs", "PHP": "php", "Ruby": "rb", "Kotlin": "kt kts", "Swift": "swift",
    "Scala": "scala", "Groovy": "groovy gradle", "Lua": "lua", "Perl": "pl pm", "R": "r", "Dart": "dart", "VB.NET": "vb",
    "Shell": "sh bash zsh ksh", "PowerShell": "ps1 psm1 psd1", "Dockerfile": "dockerfile", "TOML": "toml",
    "Properties files": "properties ini cfg conf env", "diff": "diff patch", "ProtoBuf": "proto", "Vue": "vue",
    "Mermaid": "mmd mermaid", "PlantUML": "puml plantuml pu iuml", "D2": "d2", "DBML": "dbml", "Structurizr": "dsl", "Graphviz": "dot gv", "FIX": "fix",
    "CSV": "csv", "TSV": "tsv tab", "Log": "log", "GraphQL": "graphql gql", [PLAIN]: "txt text",
  };
  const NAMES = { dockerfile: "Dockerfile", jenkinsfile: "Groovy", gemfile: "Ruby", rakefile: "Ruby", ".env": "Properties files", ".editorconfig": "Properties files", ".gitignore": PLAIN };
  const NO_HIGHLIGHT = new Set(["Mermaid", "PlantUML", "D2", "DBML", "Structurizr", "Graphviz", "FIX", "CSV", "TSV", "Log", "GraphQL", PLAIN]);
  const BY_EXT = {}, ALIAS = {};
  for (const [id, exts] of Object.entries(EXT)) {
    ALIAS[id.toLowerCase()] = id;
    for (const e of exts.split(" ")) BY_EXT[e] = ALIAS[e] = id;
  }
  Object.assign(ALIAS, {
    node: "JavaScript", nodejs: "JavaScript", deno: "JavaScript", bun: "JavaScript", js2: "JavaScript", golang: "Go", csharp: "C#",
    python: "Python", dash: "Shell", "shell-script": "Shell", pwsh: "PowerShell", rscript: "R", dosini: "Properties files", text: PLAIN, plain: PLAIN,
  });
  const alias = w => { const k = w.toLowerCase(); return ALIAS[k] || ALIAS[k.replace(/[\d.]+$/, "")] || ""; };

  function byName(name) {
    const base = (name || "").split(/[\\/]/).pop().toLowerCase();
    if (NAMES[base]) return NAMES[base];
    if (base.startsWith("dockerfile.")) return "Dockerfile";
    const m = /\.([^.]+)$/.exec(base);
    return m && Object.hasOwn(BY_EXT, m[1]) ? BY_EXT[m[1]] : "";
  }

  function byHeader(text) {
    const lines = text.slice(0, 600).split("\n", 2), first = lines[0] || "";
    const sb = /^#!\s*(\S+)(?:\s+(?:-\S+\s+)*([\w.+-]+))?/.exec(first);
    if (sb) { let p = sb[1].split("/").pop(); if (p === "env") p = sb[2] || ""; if (alias(p)) return alias(p); }
    const emacs = /-\*-\s*(?:[^*]*?\bmode:\s*([\w+#.-]+)[^*]*?|([\w+#.-]+))\s*-\*-/i.exec(lines.join("\n"));
    if (emacs && alias(emacs[1] || emacs[2])) return alias(emacs[1] || emacs[2]);
    const edges = text.slice(0, 600).split("\n").slice(0, 5).concat(text.slice(-600).split("\n").slice(-5)).join("\n");
    const vim = /\b(?:vim?|ex):.*?\b(?:ft|filetype|syntax)=([\w+#.-]+)/.exec(edges);
    return vim ? alias(vim[1]) : "";
  }

  // Same field count on ≥ 80% of the first lines ⇒ delimited data.
  const delimited = sep => t => {
    const lines = t.split("\n", 12).filter(l => l.trim()).slice(0, 10);
    const n = lines.length ? lines[0].split(sep).length - 1 : 0;
    if (lines.length < 3 || n < 1 || lines.some(l => /[{};]\s*$/.test(l))) return 0;
    return lines.filter(l => l.split(sep).length - 1 === n).length >= lines.length * 0.8 ? 5 : 0;
  };

  // [regex (g), weight, cap on counted matches]; a function rule returns its own score.
  const RULES = {
    Mermaid: [[/^\s*(?:graph|flowchart)\s+(?:TD|TB|BT|RL|LR)\b|^\s*(?:sequenceDiagram|classDiagram|stateDiagram(?:-v2)?|erDiagram|gantt|pie|journey|gitGraph|mindmap|timeline|xychart-beta|sankey-beta|quadrantChart|requirementDiagram|block-beta|C4Context|C4Container|C4Component)\b/gm, 6, 1]],
    PlantUML: [[/^\s*@start(?:uml|mindmap|wbs|gantt|json|yaml|salt)\b/gm, 6, 1]],
    Structurizr: [[/^\s*workspace\b[^{\n]*\{/gm, 4, 1], [/^\s*(?:model|views)\s*\{/gm, 2, 2], [/=\s*(?:person|softwareSystem|container)\b/g, 2]],
    Graphviz: [[/^\s*(?:strict\s+)?(?:di)?graph(?:[ \t]+(?:"[^"\n]*"|[\w.]+))?\s*\{/gm, 6, 1]],
    FIX: [[/(?:^|\cA|\|)8=FIXT?\.\d\.\d(?:\cA|\|)/gm, 6, 1], [/(?:\cA|\|)35=\w{1,2}(?:\cA|\|)/g, 2, 1]],
    DBML: [[/^\s*Table\s+[\w."]+(?:\s+as\s+\w+)?\s*(?:\[[^\]]*\])?\s*\{/gm, 3], [/^\s*Ref\s*\w*\s*:/gm, 2], [/\[(?:pk|primary key|not null|increment|unique|ref:)[^\]]*\]/gi, 1], [/^\s*Enum\s+[\w."]+\s*\{/gm, 2]],
    D2: [[/^\s*direction:\s*(?:right|down|left|up)\s*$/gm, 4, 1], [/^\s*[\w.]+\.(?:shape|style\.[\w-]+|icon):\s*\S/gm, 2], [/^\s*shape:\s*\w+/gm, 2], [/^\s*[\w ."]+?\s*(?:<->|->|--)\s*[\w ."]+?(?::\s*.*)?$/gm, 1]],
    Markdown: [[/^#{1,6}\s+\S/gm, 2, 2], [/^\s*(?:[-*+]|\d+\.)\s+\S/gm, 1], [/\[[^\]\n]+\]\([^)\s]+\)/g, 2], [/^```/gm, 2], [/^>\s/gm, 1], [/\*\*[^*\n]+\*\*/g, 1]],
    SQL: [[/\b(?:SELECT\s[\s\S]{0,300}?\bFROM|INSERT\s+INTO|UPDATE\s+\w+\s+SET|DELETE\s+FROM|CREATE\s+(?:OR\s+REPLACE\s+)?(?:TABLE|VIEW|INDEX|PROCEDURE|FUNCTION)|ALTER\s+TABLE|DROP\s+TABLE)\b/gi, 3], [/\b(?:WHERE|JOIN|GROUP\s+BY|ORDER\s+BY|VALUES)\b/gi, 1]],
    Python: [[/^\s*def\s+\w+\s*\(.*\)\s*(?:->.*)?:\s*$/gm, 3], [/^\s*(?:import\s+[\w.]+\s*$|from\s+[\w.]+\s+import\s)/gm, 2], [/^\s*class\s+\w+(?:\(.*\))?:\s*$/gm, 3], [/\bself\./g, 1], [/^if __name__ == ['"]__main__['"]:/gm, 3, 1], [/^\s*(?:elif|except|finally)\b.*:\s*$/gm, 2]],
    Go: [[/^package\s+\w+\s*$/gm, 4, 1], [/^func\s+(?:\([^)]*\)\s*)?\w+\s*\(/gm, 3], [/:=/g, 1], [/\bfmt\.\w+\(/g, 2], [/^import\s+\(/gm, 2, 1]],
    Java: [[/^package\s+[\w.]+;/gm, 3, 1], [/^import\s+(?:static\s+)?[\w.]+(?:\.\*)?;/gm, 2], [/\bpublic\s+(?:static\s+)?(?:final\s+)?(?:class|interface|enum|void|record)\b/g, 2], [/System\.out\.print/g, 3], [/@Override\b/g, 2]],
    "C#": [[/^\s*using\s+System(?:\.[\w.]+)?;/gm, 4, 1], [/^\s*namespace\s+[\w.]+/gm, 2, 1], [/\{\s*get;\s*(?:set;|init;)?\s*\}/g, 3], [/Console\.Write/g, 3], [/\bpublic\s+(?:async\s+)?(?:Task|void|string|int|bool)\b/g, 1]],
    Kotlin: [[/^\s*fun\s+\w+\s*\(/gm, 3], [/^\s*val\s+\w+/gm, 1]],
    Rust: [[/^\s*(?:pub\s+)?fn\s+\w+/gm, 2], [/\blet\s+mut\b/g, 3], [/\bprintln!\(/g, 3], [/^use\s+\w+::/gm, 2], [/^\s*impl\b/gm, 2]],
    C: [[/^#include\s*[<"]/gm, 3, 2], [/\bprintf\s*\(/g, 1], [/\bint\s+main\s*\(/g, 2, 1]],
    "C++": [[/\bstd::|\bcout\s*<<|\btemplate\s*</g, 3], [/^#include\s*<(?:iostream|vector|string|map|memory)>/gm, 3, 1]],
    Shell: [[/^\s*(?:echo|export|cd|sudo|apt(?:-get)?|yum|curl|wget|chmod|mkdir|rm|source)\s/gm, 1], [/^\s*(?:if\s+\[|fi|then|done|esac|elif\s+\[)\b/gm, 2], [/\|\s*(?:grep|awk|sed|xargs|sort|uniq|wc)\b/g, 2]],
    PowerShell: [[/\b(?:Get|Set|New|Remove|Write|Invoke|Import|Start|Stop|Test|Out)-[A-Z]\w+/g, 3], [/\s-(?:eq|ne|gt|lt|like|match)\s/gi, 1], [/^\s*param\s*\(/gim, 2, 1], [/\$\w+\s*=/g, 1]],
    Dockerfile: [[/^FROM\s+\S+/gm, 3, 1], [/^(?:RUN|COPY|ADD|ENTRYPOINT|CMD|WORKDIR|EXPOSE|ENV|ARG)\s/gm, 1]],
    diff: [[/^@@ -\d+(?:,\d+)? \+\d+(?:,\d+)? @@/gm, 4, 1], [/^(?:---|\+\+\+) \S/gm, 1, 2]],
    JavaScript: [[/\b(?:const|let)\s+[\w${}[\], ]+\s*=/g, 2], [/=>/g, 1], [/\bfunction\b\s*\w*\s*\(/g, 2], [/\bconsole\.\w+\(/g, 2], [/\brequire\(|\bmodule\.exports\b|^\s*export\s+(?:default|const|function|class)\b|^\s*import\s+.+\s+from\s+['"]/gm, 2], [/\b(?:document|window)\.\w+/g, 2]],
    TypeScript: [[/:\s*(?:string|number|boolean|any|void|unknown|never)\b/g, 2], [/^\s*(?:export\s+)?interface\s+\w+/gm, 3], [/^\s*(?:export\s+)?type\s+\w+\s*=/gm, 2]],
    CSS: [[/^\s*[.#]?[\w-]+[\w\s>+~.#:[\]="'-]*\{\s*$/gm, 1], [/^\s+[a-z-]+\s*:\s*[^;{}]+;\s*$/gm, 1], [/@(?:media|import|keyframes|font-face)\b/g, 2]],
    YAML: [[/^[\w.-]+:\s*$/gm, 1], [/^[\w.-]+:\s+\S/gm, 1], [/^\s+-\s+\S/gm, 1], [/^---\s*$/gm, 2, 1]],
    "Properties files": [[/^\[[\w .:-]+\]\s*$/gm, 2], [/^\s*[\w.-]+\s*=\s*\S/gm, 1]],
    Log: [[/^\[?\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}:\d{2}/gm, 1], [/\b(?:INFO|WARN|WARNING|ERROR|DEBUG|TRACE|FATAL)\b/g, 1]],
    CSV: [delimited(",")], TSV: [delimited("\t")],
  };
  // A language that extends another adds the parent's score once its own rules hit (TS ⊃ JS, C++ ⊃ C).
  const PARENT = { TypeScript: "JavaScript", "C++": "C" };

  const looksJson = s => /^[{[]\s*(?:["{[\]}\d-]|true\b|false\b|null\b)/.test(s);

  function byContent(text) {
    const t = TextUtil.stripBom(text).slice(0, 20000), s = t.trimStart();
    if (!s) return "";
    if (s.startsWith("<?php")) return "PHP";
    if (/^<\?xml|^<svg[\s>]/i.test(s)) return "XML";
    if (s.startsWith("<")) return Detect.markup(s) === "html" ? "HTML" : "XML";
    if (looksJson(s)) return "JSON";
    // Short lines keep the overlapping quantifiers in RULES linear (one 20k-char line took ~0.3 s).
    const sample = t.split("\n", 400).map(l => l.slice(0, 400)).join("\n"), score = {};
    for (const [id, rules] of Object.entries(RULES))
      score[id] = rules.reduce((sum, r) => sum + (typeof r === "function" ? r(sample) : r[1] * Math.min((sample.match(r[0]) || []).length, r[2] ?? 3)), 0);
    for (const [id, parent] of Object.entries(PARENT)) if (score[id]) score[id] += score[parent];
    let best = "", top = 2;
    for (const [id, sc] of Object.entries(score)) if (sc > top) { best = id; top = sc; }
    return best;
  }

  // → { id, by: "ext" | "header" | "content" | "none" }
  function detect(name, text = "") {
    let id = byName(name);
    if (id) return { id, by: "ext" };
    if ((id = byHeader(text))) return { id, by: "header" };
    if ((id = byContent(text))) return { id, by: "content" };
    return { id: PLAIN, by: "none" };
  }

  // Indent unit of a text: "\t" when tab-indented lines win, else the most common step between indent levels (2 / 4 / 8 spaces).
  function indentOf(text) {
    let tabs = 0, spaces = 0, prev = 0;
    const steps = {};
    for (const line of text.slice(0, 200000).split("\n", 2000)) {
      const m = /^([ \t]*)\S/.exec(line);
      if (!m) continue;
      const lead = m[1];
      if (lead.startsWith("\t")) { tabs++; continue; }
      const n = lead.length, step = Math.abs(n - prev);
      if (n) spaces++;
      if (step >= 2 && step <= 8) steps[step] = (steps[step] || 0) + 1;
      prev = n;
    }
    if (tabs > spaces) return "\t";
    const best = Object.entries(steps).sort((a, b) => b[1] - a[1] || a[0] - b[0])[0];
    return " ".repeat(best ? +best[0] : 2);
  }

  const ids = [PLAIN, ...Object.keys(EXT).filter(k => k !== PLAIN).sort((a, b) => a.localeCompare(b))];
  const highlighter = id => NO_HIGHLIGHT.has(id) || !Object.hasOwn(EXT, id) ? "" : id;
  const extOf = id => Object.hasOwn(EXT, id) ? EXT[id].split(" ")[0] : "txt";

  return { detect, byName, byHeader, byContent, indentOf, ids, highlighter, extOf, PLAIN };
})();

// "New ▸" file templates of the Explorer: label (Vietnamese source, T() at show time), suggested name and a short fake English body.
const FileTemplates = (() => {
  const GITIGNORE = {
    Node: "node_modules/\ndist/\ncoverage/\n.env\n*.log\nnpm-debug.log*\n.DS_Store\n",
    Python: "__pycache__/\n*.py[cod]\n.venv/\nvenv/\n.env\ndist/\nbuild/\n*.egg-info/\n.pytest_cache/\n",
    ".NET": "bin/\nobj/\n*.user\n*.suo\n.vs/\nTestResults/\n*.nupkg\n",
    Go: "/bin/\n*.exe\n*.test\n*.out\ncoverage.txt\nvendor/\n.env\n",
  };
  const LIST = [
    { label: "Văn bản (.txt)", name: "New Text Document.txt", body: "" },
    { label: "Markdown (README)", name: "README.md", body: "# Project Name\n\nOne-line description of what this project does.\n\n## Getting started\n\n```sh\nnpm install\nnpm test\n```\n\n## Usage\n\n- Item one\n- Item two\n\n## License\n\nMIT\n" },
    { label: "JSON", name: "data.json", body: '{\n  "name": "sample",\n  "version": "1.0.0",\n  "items": [\n    { "id": 1, "label": "First" }\n  ]\n}\n' },
    { label: "YAML", name: "config.yaml", body: "# Sample configuration\napp:\n  name: sample-service\n  port: 8080\nlogging:\n  level: info\n" },
    { label: "HTML5", name: "index.html", body: '<!doctype html>\n<html lang="en">\n<head>\n  <meta charset="utf-8">\n  <meta name="viewport" content="width=device-width, initial-scale=1">\n  <title>New page</title>\n  <link rel="stylesheet" href="styles.css">\n</head>\n<body>\n  <h1>Hello</h1>\n  \x3cscript type="module" src="main.js">\x3c/script>\n</body>\n</html>\n' },
    { label: "CSS", name: "styles.css", body: ":root {\n  --ink: #0f172a;\n  --accent: #0e7490;\n}\n\nbody {\n  margin: 0;\n  font-family: system-ui, sans-serif;\n  color: var(--ink);\n}\n" },
    { label: "JavaScript module", name: "main.js", body: "// Entry point.\nexport function greet(name) {\n  return `Hello, ${name}!`;\n}\n\nconsole.log(greet(\"world\"));\n" },
    { label: "TypeScript", name: "index.ts", body: "export interface User {\n  id: number;\n  name: string;\n}\n\nexport function greet(user: User): string {\n  return `Hello, ${user.name}!`;\n}\n" },
    { label: "Python", name: "main.py", body: "\"\"\"Sample script.\"\"\"\n\n\ndef main() -> None:\n    print(\"Hello, world!\")\n\n\nif __name__ == \"__main__\":\n    main()\n" },
    { label: "Go (main)", name: "main.go", body: "package main\n\nimport \"fmt\"\n\nfunc main() {\n\tfmt.Println(\"Hello, world!\")\n}\n" },
    { label: "SQL", name: "query.sql", body: "-- Sample query\nSELECT id, name, created_at\nFROM customers\nWHERE active = 1\nORDER BY created_at DESC;\n" },
    ...Object.entries(GITIGNORE).map(([k, body]) => ({ label: ".gitignore (" + k + ")", name: ".gitignore", body })),
    { label: ".editorconfig", name: ".editorconfig", body: "root = true\n\n[*]\ncharset = utf-8\nend_of_line = lf\nindent_style = space\nindent_size = 2\ninsert_final_newline = true\ntrim_trailing_whitespace = true\n\n[*.md]\ntrim_trailing_whitespace = false\n" },
    { label: "Mermaid (.mmd)", name: "diagram.mmd", body: "flowchart LR\n  A[Client] --> B{API}\n  B -->|valid| C[Orders]\n  B -->|invalid| D[Error]\n" },
  ];
  return { LIST };
})();

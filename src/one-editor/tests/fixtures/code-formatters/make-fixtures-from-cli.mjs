// Regenerate the expected outputs of the code-formatter parity test from the real CLIs (same versions as tools/vendor/code-formatter-*):
//   node src/one-editor/tests/fixtures/code-formatters/make-fixtures-from-cli.mjs
// CLIs (per-user, no PATH change): C:\_devtools\Go (gofmt), C:\_devtools\clang-format-23.1.1, C:\_devtools\ruff-0.15.20 — override with GOFMT / CLANG_FORMAT / RUFF.
import { execFileSync, spawnSync } from "node:child_process";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const bin = {
  gofmt: process.env.GOFMT || "C:/_devtools/Go/bin/gofmt.exe",
  clang: process.env.CLANG_FORMAT || "C:/_devtools/clang-format-23.1.1/clang_format/data/bin/clang-format.exe",
  ruff: process.env.RUFF || "C:/_devtools/ruff-0.15.20/bin/ruff.exe",
};
const STYLES = ["LLVM", "Google", "Chromium", "Mozilla", "WebKit", "Microsoft"];
const cases = [
  { engine: "gofmt", input: "go/orders.go" }, { engine: "gofmt", input: "go/generics.go" }, { engine: "gofmt", input: "go/bad.go" },
  ...STYLES.map(style => ({ engine: "clang-format", input: "cpp/order_book.cpp", style })),
  { engine: "clang-format", input: "cpp/templates.cpp", style: "Google" }, { engine: "clang-format", input: "c/ring_buffer.c", style: "LLVM" },
  { engine: "clang-format", input: "java/OrderBook.java", style: "Google" }, { engine: "clang-format", input: "cs/OrderMath.cs", style: "Microsoft" },
  { engine: "clang-format", input: "proto/order.proto", style: "Google" }, { engine: "clang-format", input: "cpp/templates.cpp", styleFile: "dot-clang-format.yaml" },
  { engine: "ruff", input: "py/orders.py", config: {} }, { engine: "ruff", input: "py/misc.py", config: { line_width: 60, quote_style: "single" } },
  { engine: "ruff", input: "py/misc.py", config: { quote_style: "preserve", indent_width: 2 } }, { engine: "ruff", input: "py/bad.py", config: {} },
];
const FILE = { cpp: "main.cpp", c: "main.c", java: "Main.java", cs: "main.cs", proto: "main.proto" };

const run = (exe, args, input) => {
  const r = spawnSync(exe, args, { input, encoding: "utf8", cwd: here });
  return { out: r.stdout, err: r.stderr, code: r.status };
};
// gofmt: "<standard input>:6:23: msg"; ruff: "error: Failed to parse x.py:3:19: msg" → { line, col }.
const where = s => { const m = /:(\d+):(\d+): /.exec(s); return m ? { line: +m[1], col: +m[2] } : null; };

mkdirSync(join(here, "expected"), { recursive: true });
const manifest = {
  versions: {
    gofmt: execFileSync(bin.gofmt.replace(/gofmt(\.exe)?$/, "go$1"), ["version"], { encoding: "utf8" }).trim(),
    clang: execFileSync(bin.clang, ["--version"], { encoding: "utf8" }).trim(),
    ruff: execFileSync(bin.ruff, ["--version"], { encoding: "utf8" }).trim(),
  },
  cases: [],
};
for (const c of cases) {
  const input = readFileSync(join(here, "input", c.input), "utf8"), ext = c.input.split(".").pop();
  let r;
  if (c.engine === "gofmt") r = run(bin.gofmt, [], input);
  else if (c.engine === "clang-format") {
    const style = c.styleFile ? "file:" + join(here, "input", c.styleFile) : c.style;
    r = run(bin.clang, ["--style=" + style, "--assume-filename=" + FILE[ext]], input);
  } else {
    const k = c.config, args = ["format", "--isolated", "--stdin-filename", "x.py"];
    if (k.line_width) args.push("--line-length", String(k.line_width));
    if (k.quote_style) args.push("--config", `format.quote-style = '${k.quote_style}'`);
    if (k.indent_width) args.push("--config", `indent-width = ${k.indent_width}`);
    r = run(bin.ruff, [...args, "-"], input);
  }
  const name = c.input.replace(/[/.]/g, "_") + (c.style ? "_" + c.style : c.styleFile ? "_file" : c.engine === "ruff" ? "_" + (Object.values(c.config).join("_") || "default") : "") + ".out";
  const entry = { ...c, expected: r.code === 0 ? name : null };
  if (r.code === 0) writeFileSync(join(here, "expected", name), r.out);
  else entry.error = where(r.err) || { raw: r.err.trim() };
  manifest.cases.push(entry);
  console.log(r.code === 0 ? "ok   " : "error", c.engine, c.input, c.style || c.styleFile || JSON.stringify(c.config || ""), r.code === 0 ? "" : JSON.stringify(entry.error));
}
writeFileSync(join(here, "manifest.json"), JSON.stringify(manifest, null, 1) + "\n");

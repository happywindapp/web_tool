// gofmt · clang-format · ruff (WASM, tools/vendor/code-formatter-*), one Blob Worker per engine started on its first use: format(text, lang, engine, opts) → { text, notes } | { error: { line, col, msg } }; a load / run failure rejects.
function wasmFormatterWorkerHandlers() {
  // ruff reports UTF-8 byte offsets ("… at byte range 6..7").
  function lineCol(text, byte) {
    const pre = new TextDecoder().decode(new TextEncoder().encode(text).subarray(0, byte));
    return { line: pre.split("\n").length, col: pre.length - pre.lastIndexOf("\n") };
  }
  return {
    gofmt(d) {
      try { return { text: self.fmtGofmt.format(d.text) }; }
      catch (e) {
        const m = /^(\d+):(\d+): ([^\n]*)/.exec(e && e.message);
        if (!m) throw e;
        return { error: { line: +m[1], col: +m[2], msg: m[3] } };
      }
    },
    // A syntax error is not an error for clang-format (it formats what it can, like the CLI); a bad style throws.
    "clang-format"(d) { return { text: self.fmtClang.format(d.text, d.file, d.style) }; },
    ruff(d) {
      try { return { text: self.fmtRuff.format(d.text, null, d.config) }; }
      catch (e) {
        if (typeof e !== "string") throw e;
        const m = / at byte range (\d+)\.\.\d+\s*$/.exec(e);
        return { error: { ...(m ? lineCol(d.text, +m[1]) : { line: 0, col: 0 }), msg: m ? e.slice(0, m.index) : e } };
      }
    },
  };
}

const WasmFmt = (() => {
  const LIB = { gofmt: "fmtGofmt", "clang-format": "fmtClang", ruff: "fmtRuff" };
  const FILE = { C: "main.c", "C++": "main.cpp", Java: "Main.java", "C#": "main.cs", ProtoBuf: "main.proto" };
  const QUOTES = ["double", "single", "preserve"];
  const workers = {};
  const worker = engine => workers[engine] ??= BlobWorker.create({ libs: [LIB[engine]], code: () => "const HANDLERS = (" + wasmFormatterWorkerHandlers + ")();" });

  // The open folder's root .clang-format (or _clang-format), read on every format so an edit applies at once.
  async function folderStyle() {
    const root = Explorer.root();
    if (!root?.handle) return null;
    for (const name of [".clang-format", "_clang-format"]) {
      let file;
      try { file = await (await root.handle.getFileHandle(name)).getFile(); }
      catch (e) { if (e.name === "NotFoundError" || e.name === "TypeMismatchError") continue; throw new Error(T("Không đọc được {file}: {msg}", { file: name, msg: e.message })); }
      const text = await file.text();
      if (text.trim()) return { text, file: name, folder: root.name || root.handle.name };
    }
    return null;
  }

  function config(o) {
    const width = Math.round(+o.pyWidth);
    const c = { line_width: width >= 1 && width <= 320 ? width : 88, quote_style: QUOTES.includes(o.pyQuote) ? o.pyQuote : "double" };
    // "auto" keeps ruff's own 4 spaces (same as the CLI); an explicit choice wins.
    if (o.indent === "tab") c.indent_style = "tab";
    else if (+o.indent > 0) c.indent_width = +o.indent;
    return c;
  }

  async function format(text, lang, engine, o = {}) {
    if (!LIB[engine]) throw new Error(engine);
    const data = { text }, notes = [];
    if (engine === "clang-format") {
      const f = await folderStyle();
      data.file = FILE[lang] || "main.cpp";
      data.style = f ? f.text : Formatter.CLANG_STYLES.includes(o.clang) ? o.clang : "LLVM";
      if (f) notes.push(T("clang-format: dùng {file} ở gốc folder “{folder}”.", f));
    } else if (engine === "ruff") data.config = config(o);
    try {
      const r = await worker(engine).call(engine, data, { timeout: 30000 });
      return r.error ? r : { text: r.text, notes };
    } catch (e) {
      // A trap may leave the WASM memory broken: the next call starts a fresh worker.
      worker(engine).stop();
      throw e;
    }
  }

  return { format };
})();

// Find in files, pure: regex from the options, every match with line / col, replacement edits ($1, $<name>, \n), folder skip rules and a time-sliced loop.
const FindCore = (() => {
  const LIMITS = { fileBytes: 5 * 1024 * 1024, files: 20000, shownHits: 2000, countPerFile: 100000 };
  // Letters incl. Vietnamese (Latin-1 … Latin Extended-B, Latin Extended Additional): \b alone is ASCII-only.
  const WORD = /[0-9A-Za-z_À-ɏḀ-ỿ]/.source, isWord = new RegExp("^" + WORD + "$");
  const HEAVY_DIRS = new Set([".git", "node_modules"]);
  const BINARY_EXT = /\.(?:png|jpe?g|gif|webp|bmp|ico|tiff?|psd|avif|heic|zip|7z|rar|gz|tgz|bz2|xz|tar|jar|war|nupkg|exe|dll|so|dylib|bin|obj|o|a|lib|pdb|class|pyc|wasm|pdf|docx?|xlsx?|pptx?|od[tsp]|woff2?|ttf|otf|eot|mp[34]|m4a|wav|ogg|flac|avi|mov|mkv|webm|sqlite|db|mdb|iso|dmg|msi)$/i;

  // Empty query → null; a bad regex throws. "m" so ^ and $ work per line.
  function compile(q, o = {}) {
    if (!q) return null;
    let src = o.regex ? q : q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    // Whole word as in VS Code: a boundary only on a side where the query itself starts / ends with a word character.
    if (o.word) src = (o.regex || isWord.test(q[0]) ? "(?<!" + WORD + ")" : "") + "(?:" + src + ")" + (o.regex || isWord.test(q.slice(-1)) ? "(?!" + WORD + ")" : "");
    return new RegExp(src, "gm" + (o.matchCase ? "" : "i"));
  }

  function lineStarts(text) {
    const s = [0];
    for (let i = text.indexOf("\n"); i >= 0; i = text.indexOf("\n", i + 1)) s.push(i + 1);
    return s;
  }
  function lineIndex(starts, pos) {
    let lo = 0, hi = starts.length - 1;
    while (lo < hi) { const mid = (lo + hi + 1) >> 1; if (starts[mid] <= pos) lo = mid; else hi = mid - 1; }
    return lo;
  }

  // Copies a short slice so it does not keep the whole (up to 5 MB) file text alive.
  const own = s => Array.from(s).join("");

  // → { count, more, hits: up to `keep` of { from, to, line (1-based), col, snip, at, cut } }; snip = ≤ 40 chars before + match + ≤ 120 after on the line.
  // Counting stops at LIMITS.countPerFile (more = true) so "." on a 5 MB file stays short; zero-length matches count too (replace "^" prefixes lines).
  function matches(text, re, keep = Infinity) {
    const hits = [];
    let count = 0, starts = null, li = -1, lineEnd = 0;
    re.lastIndex = 0;
    for (let m; (m = re.exec(text));) {
      if (m[0] === "") re.lastIndex++;
      if (++count >= LIMITS.countPerFile) return { count, more: true, hits };
      if (hits.length >= keep) continue;
      starts ??= lineStarts(text);
      const k = lineIndex(starts, m.index), from = starts[k];
      if (k !== li) { li = k; lineEnd = text.indexOf("\n", from); if (lineEnd < 0) lineEnd = text.length; }
      const a = Math.max(from, m.index - 40), b = Math.min(lineEnd, m.index + m[0].length + 120);
      hits.push({ from: m.index, to: m.index + m[0].length, line: k + 1, col: m.index - from, snip: own(text.slice(a, b)), at: m.index - a, cut: a > from });
    }
    return { count, more: false, hits };
  }

  // Regex mode replacement as in JS String.replace ($$ $& $` $' $1…$99 $<name>), plus \n \t \\ like VS Code.
  const unescape = s => s.replace(/\\(n|t|\\)/g, (a, c) => c === "n" ? "\n" : c === "t" ? "\t" : "\\");
  function expand(m, repl) {
    return repl.replace(/\$(\$|&|`|'|\d{1,2}|<([^>]*)>)/g, (all, t, name) => {
      if (t === "$") return "$";
      if (t === "&") return m[0];
      if (t === "`") return m.input.slice(0, m.index);
      if (t === "'") return m.input.slice(m.index + m[0].length);
      if (name !== undefined) return m.groups && Object.hasOwn(m.groups, name) ? m.groups[name] ?? "" : all;
      const n = +t;
      if (n >= m.length && t.length === 2 && +t[0] > 0 && +t[0] < m.length) return (m[+t[0]] ?? "") + t[1];
      return n > 0 && n < m.length ? m[n] ?? "" : all;
    });
  }

  // → [{ from, to, insert }] for one CodeMirror transaction (each match its own change, so undo and cursors stay sane).
  function edits(text, re, repl, regex) {
    const out = [], r = regex ? unescape(repl) : repl;
    re.lastIndex = 0;
    for (let m; (m = re.exec(text));) {
      if (m[0] === "") re.lastIndex++;
      out.push({ from: m.index, to: m.index + m[0].length, insert: regex ? expand(m, r) : r });
    }
    return out;
  }

  const skipDir = (name, heavy) => !heavy && HEAVY_DIRS.has(name);
  const binaryName = name => BINARY_EXT.test(name);

  const pause = () => globalThis.scheduler?.yield ? globalThis.scheduler.yield() : new Promise(ok => setTimeout(ok, 0));
  // work(item) for each item of an array or async iterable, yielding to the browser every `budget` ms; stop() → true ends early. → items done.
  async function sliced(items, work, { budget = 12, stop = () => false, now = () => Date.now(), yieldNow = pause, progress } = {}) {
    let t = now(), done = 0;
    for await (const item of items) {
      if (stop()) break;
      await work(item);
      done++;
      if (now() - t >= budget) { if (progress) progress(done); await yieldNow(); t = now(); }
    }
    return done;
  }

  return { LIMITS, compile, matches, expand, edits, unescape, skipDir, binaryName, sliced, lineStarts, lineIndex };
})();

// Loop guard for user scripts run in the sandbox page: while / for / do-while conditions get "__oeLoop() && (…)" so an endless loop throws after the time limit. No newline is added (error lines stay right); strings, comments, regex and template text are skipped.
const LoopGuard = (() => {
  const REGEX_AFTER = /^(?:return|typeof|case|do|else|in|of|new|delete|void|throw|instanceof|yield|await)$/;
  const regexAllowed = prev => prev === "" || /^[(,=:[!&|?{};+\-*%<>~^]$/.test(prev) || REGEX_AFTER.test(prev);

  function endQuote(s, i, q) { for (i++; i < s.length; i++) { if (s[i] === "\\") i++; else if (s[i] === q || s[i] === "\n") return i + 1; } return s.length; }
  function endRegex(s, i) {
    for (let cls = false, j = i + 1; j < s.length; j++) {
      const c = s[j];
      if (c === "\\") j++;
      else if (c === "\n") return j;
      else if (cls) cls = c !== "]";
      else if (c === "[") cls = true;
      else if (c === "/") { j++; while (/[a-z]/i.test(s[j] || "")) j++; return j; }
    }
    return s.length;
  }

  // mask[i] = 1 where s[i] is code; loops = positions right after a "while" / "for" keyword.
  function scan(s) {
    const mask = new Uint8Array(s.length), loops = [], tpl = [];
    let i = 0, prev = "", depth = 0;
    const template = j => { for (; j < s.length; j++) { if (s[j] === "\\") j++; else if (s[j] === "`") return j + 1; else if (s[j] === "$" && s[j + 1] === "{") { tpl.push(depth); mask[j] = mask[j + 1] = 1; prev = "{"; return j + 2; } } return s.length; };
    while (i < s.length) {
      const c = s[i], n = s[i + 1];
      if (c === "/" && n === "/") { const e = s.indexOf("\n", i); i = e < 0 ? s.length : e; continue; }
      if (c === "/" && n === "*") { const e = s.indexOf("*/", i + 2); i = e < 0 ? s.length : e + 2; continue; }
      if (c === "'" || c === '"') { i = endQuote(s, i, c); prev = "x"; continue; }
      if (c === "`") { i = template(i + 1); if (s[i - 1] === "`") prev = "x"; continue; }
      if (c === "/" && regexAllowed(prev)) { i = endRegex(s, i); prev = "x"; continue; }
      if (c === "}" && tpl.length && tpl[tpl.length - 1] === depth) { tpl.pop(); mask[i] = 1; i = template(i + 1); if (s[i - 1] === "`") prev = "x"; continue; }
      mask[i] = 1;
      if (/[\w$]/.test(c)) {
        const w = /^[\w$]+/.exec(s.slice(i, i + 64))[0];
        mask.fill(1, i, i + w.length);
        let k = i - 1;
        while (k >= 0 && /\s/.test(s[k])) k--;
        if ((w === "while" || w === "for") && s[k] !== ".") loops.push({ at: i + w.length, kind: w });
        prev = w; i += w.length; continue;
      }
      if (c === "{") depth++; else if (c === "}") depth--;
      if (!/\s/.test(c)) prev = c;
      i++;
    }
    return { mask, loops };
  }

  // → { code, count }.
  function insert(s, fn = "__oeLoop") {
    const { mask, loops } = scan(s), edits = [];
    const nextCode = j => { while (j < s.length && (!mask[j] || /\s/.test(s[j]))) j++; return j; };
    for (const lp of loops) {
      let o = nextCode(lp.at);
      if (lp.kind === "for" && s.startsWith("await", o)) o = nextCode(o + 5);
      if (s[o] !== "(" || !mask[o]) continue;
      let d = 0, close = -1;
      const semis = [];
      for (let j = o; j < s.length; j++) {
        if (!mask[j]) continue;
        if ("([{".includes(s[j])) d++;
        else if (")]}".includes(s[j]) && --d === 0) { close = j; break; }
        else if (s[j] === ";" && d === 1) semis.push(j);
      }
      if (close < 0) continue;
      if (lp.kind === "while") edits.push([o + 1, fn + "() && ("], [close, ")"]);
      else if (semis.length === 2) {
        let empty = true;
        for (let j = semis[0] + 1; j < semis[1]; j++) if (mask[j] && !/\s/.test(s[j])) { empty = false; break; }
        if (empty) edits.push([semis[0] + 1, " " + fn + "() "]);
        else edits.push([semis[0] + 1, " " + fn + "() && ("], [semis[1], ")"]);
      }
    }
    edits.sort((a, b) => b[0] - a[0]);
    let out = s;
    for (const [at, text] of edits) out = out.slice(0, at) + text + out.slice(at);
    return { code: out, count: edits.filter(e => e[1] !== ")").length };
  }

  return { insert, scan };
})();

// Conservative CSS minifier: drops comments, collapses whitespace outside strings, keeps spaces that change meaning.
const CssMin = (() => {
  // Spaces around "+", "-", "~", or before ":"/"(" can be significant (calc(), "a :hover", "and (") so they are kept.
  const DROP_AFTER = "{};,>(:!", DROP_BEFORE = "{};,>)!";

  function minify(css) {
    let out = "", i = 0, comments = 0;
    while (i < css.length) {
      const c = css[i];
      if (c === '"' || c === "'") {
        let j = i + 1;
        while (j < css.length && css[j] !== c && css[j] !== "\n") j += css[j] === "\\" ? 2 : 1;
        out += css.slice(i, j + 1); i = j + 1; continue;
      }
      if (c === "/" && css[i + 1] === "*") {
        const e = css.indexOf("*/", i + 2);
        i = e < 0 ? css.length : e + 2; comments++;
        if (/[\w-]/.test(out[out.length - 1] || "") && /[\w-]/.test(css[i] || "")) out += " ";
        continue;
      }
      if (/\s/.test(c)) {
        while (i < css.length && /\s/.test(css[i])) i++;
        const prev = out[out.length - 1], next = css[i];
        if (prev !== undefined && next !== undefined && !DROP_AFTER.includes(prev) && !DROP_BEFORE.includes(next) && !(next === "/" && css[i + 1] === "*")) out += " ";
        continue;
      }
      if (c === "}" && out.endsWith(";")) out = out.slice(0, -1);
      out += c; i++;
    }
    return { text: out.trim(), comments };
  }

  return { minify };
})();

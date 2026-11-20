// Markdown inline syntax → [string | {t, a, c}] via CommonMark's delimiter + bracket stacks (linear time); raw HTML stays text, links/images only with a vetted URL.
const MdInline = (() => {
  const ENT = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: String.fromCharCode(160), copy: "©", reg: "®", trade: "™", hellip: "…", mdash: "—", ndash: "–", laquo: "«", raquo: "»" };
  const RX = {
    esc: /\\([!-/:-@[-`{-~])/y, ent: /&(?:#(\d{1,7})|#[xX]([0-9a-fA-F]{1,6})|([a-z]{1,10}));/y, ref: /\[([^\]]{0,999})\]/y,
    auto: /<((?:https?|ftp):\/\/[^\s<>]+|mailto:[^\s<>]+|[\w.+-]+@[\w-]+(?:\.[\w-]+)+)>/y,
    bare: /(?:https?:\/\/|www\.)[^\s<]*[^\s<?!.,:;*_~'")\]]/y, plain: /[^\\`<!\[\]*_~\n&hHwW]+/y,
    dest: /\(\s*(?:<([^<>\n]*)>|((?:[^\s()\\]|\\.|\((?:[^\s()\\]|\\.)*\))*))(?:\s+(?:"((?:[^"\\]|\\.)*)"|'((?:[^'\\]|\\.)*)'|\(((?:[^()\\]|\\.)*)\)))?\s*\)/y,
  };
  const MAX_DEPTH = 64;
  const at = (re, s, i) => { re.lastIndex = i; return re.exec(s); };
  const isSpace = c => !c || /\s/.test(c);
  const isPunct = c => !!c && /[\p{P}\p{S}]/u.test(c);
  const isWord = c => !!c && /[\p{L}\p{N}]/u.test(c);
  const point = n => n > 0 && n <= 0x10ffff && (n < 0xd800 || n > 0xdfff) ? String.fromCodePoint(n) : String.fromCharCode(0xfffd);
  const entity = m => m[1] || m[2] ? point(parseInt(m[1] || m[2], m[1] ? 10 : 16)) : Object.hasOwn(ENT, m[3]) ? ENT[m[3]] : null;
  const decode = s => s.replace(/\\([!-/:-@[-`{-~])/g, "$1").replace(/&(?:#(\d{1,7})|#[xX]([0-9a-fA-F]{1,6})|([a-z]{1,10}));/g, (m, a, b, c) => entity([m, a, b, c]) ?? m);
  const norm = s => s.trim().toLowerCase().replace(/\s+/g, " ");

  // http(s), mailto and in-page #fragments only; control chars and spaces are ignored when checking the scheme.
  const bare = u => decode(String(u || "")).replace(/[\0-\x20\x7f]+/g, "");
  const safeUrl = u => { const v = bare(u); return /^(?:https?:\/\/|mailto:|#)/i.test(v) ? v : null; };
  const safeImg = u => { const v = bare(u); return /^data:image\/(?:png|jpe?g|gif|webp|svg\+xml)[;,]/i.test(v) ? v : null; };
  const text = nodes => nodes.map(n => typeof n === "string" ? n : n.t === "img" ? n.a.alt : n.t === "br" ? " " : text(n.c || [])).join("");

  // Linked list → arrays without recursion; nesting deeper than MAX_DEPTH (and links inside links) is flattened.
  function toArray(first) {
    const root = [], work = [[first, root, 0, false]];
    const push = (arr, s) => { if (typeof arr[arr.length - 1] === "string") arr[arr.length - 1] += s; else arr.push(s); };
    while (work.length) {
      const [start, arr, depth, inA] = work.pop();
      for (let it = start; it; it = it.next) {
        if (it.s !== undefined) { if (it.s) push(arr, it.s); }
        else if (it.d) { if (it.n) push(arr, it.d.repeat(it.n)); }
        else if (it.br) push(arr, it.img ? "![" : "[");
        else if (it.leaf) arr.push(it.leaf);
        else if (depth >= MAX_DEPTH || (inA && it.t === "a")) { work.push([it.next, arr, depth, inA], [it.first, arr, depth, inA]); break; }
        else { const node = { t: it.t, c: [] }; if (it.a) node.a = it.a; arr.push(node); work.push([it.next, arr, depth, inA], [it.first, node.c, depth + 1, inA || it.t === "a"]); break; }
      }
    }
    return root;
  }

  function parse(src, refs = {}) {
    const head = { next: null }, brackets = [], noCode = new Set();
    let tail = head, lastD = null, noComment = false, i = 0, m;
    const add = it => { it.prev = tail; it.next = null; tail.next = it; tail = it; return it; };
    const addText = s => { if (tail.s !== undefined) tail.s += s; else add({ s }); };
    const unlink = it => { it.prev.next = it.next; if (it.next) it.next.prev = it.prev; else tail = it.prev; };
    const dropD = x => { if (x.dp) x.dp.dn = x.dn; if (x.dn) x.dn.dp = x.dp; if (lastD === x) lastD = x.dp; };

    // CommonMark "process emphasis" above `bottom`; openers_bottom keeps it linear.
    function emphasis(bottom) {
      let cur = lastD;
      if (!cur || cur === bottom) return;
      while (cur.dp && cur.dp !== bottom) cur = cur.dp;
      const floor = {};
      while (cur) {
        if (!cur.close) { cur = cur.dn; continue; }
        const key = cur.d + (cur.open ? 1 : 0) + (cur.orig % 3), stop = Object.hasOwn(floor, key) ? floor[key] : bottom;
        let o = cur.dp;
        for (; o && o !== bottom && o !== stop; o = o.dp) {
          if (o.d === cur.d && o.open && !((o.close || cur.open) && (o.orig + cur.orig) % 3 === 0 && (o.orig % 3 || cur.orig % 3))) break;
        }
        if (!o || o === bottom || o === stop) { floor[key] = cur.dp; const nx = cur.dn; if (!cur.open) dropD(cur); cur = nx; continue; }
        const use = cur.d === "~" ? 2 : o.n >= 2 && cur.n >= 2 ? 2 : 1;
        o.n -= use; cur.n -= use;
        const node = { t: cur.d === "~" ? "del" : use === 2 ? "strong" : "em", first: o.next === cur ? null : o.next };
        if (node.first) { node.first.prev = null; cur.prev.next = null; }
        o.next = node; node.prev = o; node.next = cur; cur.prev = node;
        o.dn = cur; cur.dp = o;
        if (!o.n) { dropD(o); unlink(o); }
        if (!cur.n) { const nx = cur.dn; dropD(cur); unlink(cur); cur = nx; }
      }
      while (lastD && lastD !== bottom) dropD(lastD);
    }

    // "]" closes the newest "[" into a link / image when a (destination) or known [ref] follows.
    function closeBracket() {
      const op = brackets[brackets.length - 1];
      if (!op || !op.active) { if (op) brackets.pop(); addText("]"); return i + 1; }
      const d = at(RX.dest, src, i + 1), refM = !d && at(RX.ref, src, i + 1);
      const label = src.slice(op.src + 1, i), key = norm(refM && refM[1] ? refM[1] : label), ref = !d && Object.hasOwn(refs, key) ? refs[key] : null;
      brackets.pop();
      if (!d && !ref) { addText("]"); return i + 1; }
      const href = d ? d.href ?? d[1] ?? d[2] : ref.href, title = d ? d[3] ?? d[4] ?? d[5] : ref.title, end = d ? i + 1 + d[0].length : i + 1 + (refM ? refM[0].length : 0);
      emphasis(op.dBottom);
      const kids = op.next;
      if (kids) kids.prev = null;
      tail = op.prev; tail.next = null;
      if (op.img) {
        const alt = text(toArray(kids)), img = safeImg(href), u = safeUrl(href);
        if (img) add({ leaf: { t: "img", a: title ? { src: img, alt, title: decode(title) } : { src: img, alt } } });
        else if (u) add({ t: "a", a: { href: u }, first: { s: "🖼 " + (alt || u) } });
        else addText("🖼 " + alt);
        return end;
      }
      brackets.forEach(b => { if (!b.img) b.active = false; });
      const u = safeUrl(href);
      if (u) add({ t: "a", a: title ? { href: u, title: decode(title) } : { href: u }, first: kids });
      else if (kids) { tail.next = kids; kids.prev = tail; for (tail = kids; tail.next; tail = tail.next); }
      return end;
    }

    while (i < src.length) {
      const c = src[i];
      if ((m = at(RX.plain, src, i))) { addText(m[0]); i += m[0].length; continue; }
      if (c === "\\" && src[i + 1] === "\n") { add({ leaf: { t: "br" } }); i += 2; continue; }
      if (c === "\\" && (m = at(RX.esc, src, i))) { addText(m[1]); i += 2; continue; }
      if (c === "&" && (m = at(RX.ent, src, i)) && entity(m) !== null) { addText(entity(m)); i += m[0].length; continue; }
      if (c === "\n") {
        const hard = tail.s !== undefined && / {2,}$/.test(tail.s);
        if (tail.s !== undefined) tail.s = tail.s.replace(/ +$/, "");
        if (hard) add({ leaf: { t: "br" } }); else addText("\n");
        i++; continue;
      }
      if (c === "`") {
        let k = i; while (src[k] === "`") k++;
        const n = k - i;
        let e = -1;
        if (!noCode.has(n)) for (let j = src.indexOf("`", k); j >= 0; j = src.indexOf("`", j)) { let q = j; while (src[q] === "`") q++; if (q - j === n) { e = j; break; } j = q; }
        if (e < 0) { noCode.add(n); addText(src.slice(i, k)); i = k; continue; }
        let code = src.slice(k, e).replace(/\n/g, " ");
        if (code.length > 2 && code[0] === " " && code[code.length - 1] === " " && code.trim()) code = code.slice(1, -1);
        add({ leaf: { t: "code", c: [code] } }); i = e + n; continue;
      }
      if (c === "<") {
        if (src.startsWith("<!--", i) && !noComment) { const e = src.indexOf("-->", i + 4); if (e < 0) noComment = true; else { i = e + 3; continue; } }
        const u = (m = at(RX.auto, src, i)) && safeUrl(/^[\w.+-]+@/.test(m[1]) ? "mailto:" + m[1] : m[1]);
        if (u) { add({ t: "a", a: { href: u }, first: { s: m[1] } }); i += m[0].length; continue; }
        addText(c); i++; continue;
      }
      if (c === "[" || (c === "!" && src[i + 1] === "[")) { const img = c === "!"; brackets.push(add({ br: true, img, src: i + (img ? 1 : 0), active: true, dBottom: lastD })); i += img ? 2 : 1; continue; }
      if (c === "]") { i = closeBracket(); continue; }
      if (c === "*" || c === "_" || c === "~") {
        let k = i; while (src[k] === c) k++;
        const n = k - i, before = src[i - 1], after = src[k];
        const left = !isSpace(after) && (!isPunct(after) || isSpace(before) || isPunct(before)), right = !isSpace(before) && (!isPunct(before) || isSpace(after) || isPunct(after));
        const open = c === "_" ? left && (!right || isPunct(before)) : left, close = c === "_" ? right && (!left || isPunct(after)) : right;
        if ((!open && !close) || (c === "~" && n !== 2)) { addText(src.slice(i, k)); i = k; continue; }
        const it = add({ d: c, n, orig: n, open, close, dp: lastD, dn: null });
        if (lastD) lastD.dn = it;
        lastD = it; i = k; continue;
      }
      if ("hHwW".includes(c) && !isWord(src[i - 1]) && (m = at(RX.bare, src, i))) {
        add({ t: "a", a: { href: /^www\./i.test(m[0]) ? "http://" + m[0] : m[0] }, first: { s: m[0] } }); i += m[0].length; continue;
      }
      addText(c); i++;
    }
    emphasis(null);
    return toArray(head.next);
  }

  return { parse, text, safeUrl, safeImg, decode };
})();

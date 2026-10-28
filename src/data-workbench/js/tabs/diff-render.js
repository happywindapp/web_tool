// Line ops → side-by-side table; paired del/ins become "modified" rows with character-level highlight, long equal runs collapse.
const DiffRender = (() => {
  const esc = Dom.esc;
  const CONTEXT = 3;

  function charDiff(l, r) {
    const a = Array.from(l), b = Array.from(r);
    const ops = a.length + b.length <= 4000 ? SeqDiff.diff(a, b, 200) : null;
    if (!ops) return [`<del>${esc(l)}</del>`, `<ins>${esc(r)}</ins>`];
    let L = "", R = "";
    for (const o of ops) {
      if (o.op === "eq") { L += esc(a[o.a]); R += esc(b[o.b]); }
      else if (o.op === "del") L += `<del>${esc(a[o.a])}</del>`;
      else R += `<ins>${esc(b[o.b])}</ins>`;
    }
    return [L.replace(/<\/del><del>/g, ""), R.replace(/<\/ins><ins>/g, "")];
  }

  function toRows(aLines, bLines, ops) {
    const rows = [];
    for (let i = 0; i < ops.length;) {
      if (ops[i].op === "eq") { const o = ops[i++]; rows.push({ t: "eq", a: o.a, b: o.b, l: esc(aLines[o.a]), r: esc(bLines[o.b]) }); continue; }
      const dels = [], inss = [];
      while (i < ops.length && ops[i].op !== "eq") { (ops[i].op === "del" ? dels : inss).push(ops[i]); i++; }
      for (let k = 0; k < Math.max(dels.length, inss.length); k++) {
        const d = dels[k], n = inss[k];
        if (d && n) { const [l, r] = charDiff(aLines[d.a], bLines[n.b]); rows.push({ t: "mod", a: d.a, b: n.b, l, r }); }
        else if (d) rows.push({ t: "del", a: d.a, b: null, l: esc(aLines[d.a]), r: "" });
        else rows.push({ t: "ins", a: null, b: n.b, l: "", r: esc(bLines[n.b]) });
      }
    }
    return rows;
  }

  // hidden[i] keeps the HTML of a collapsed equal run so a click can expand it in place.
  function render(aLines, bLines, ops, onlyChanges) {
    const rows = toRows(aLines, bLines, ops);
    const tr = x => `<tr class="${x.t}"><td class="ln">${x.a === null ? "" : x.a + 1}</td><td class="cl">${x.l}</td><td class="ln">${x.b === null ? "" : x.b + 1}</td><td class="cr">${x.r}</td></tr>`;
    const near = new Uint8Array(rows.length);
    rows.forEach((x, i) => { if (x.t !== "eq") for (let k = Math.max(0, i - CONTEXT); k <= Math.min(rows.length - 1, i + CONTEXT); k++) near[k] = 1; });
    const hidden = [], stats = { del: 0, ins: 0, mod: 0 };
    rows.forEach(x => { if (x.t !== "eq") stats[x.t]++; });
    let html = "";
    for (let i = 0; i < rows.length;) {
      if (!onlyChanges || near[i]) { html += tr(rows[i++]); continue; }
      let j = i;
      while (j < rows.length && !near[j]) j++;
      hidden.push(rows.slice(i, j).map(tr).join(""));
      html += `<tr class="skip" data-skip="${hidden.length - 1}"><td colspan="4">… ${(j - i).toLocaleString("vi")} dòng giống nhau (bấm để hiện)</td></tr>`;
      i = j;
    }
    return { html: `<table class="dt"><colgroup><col class="lnc"><col><col class="lnc"><col></colgroup>${html}</table>`, hidden, stats };
  }

  return { render };
})();

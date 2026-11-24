// Git panel model: statusMatrix codes (GitStatusModel files Map) → groups Modified · Added · Removed · Untracked with name / folder per file, filtered by a path query.
const GitChanges = (() => {
  const ORDER = ["m", "a", "d", "u"];

  function group(files, q = "") {
    const needle = q.trim().toLowerCase(), out = { m: [], a: [], d: [], u: [] };
    for (const [path, code] of files) {
      if (!out[code] || (needle && !path.toLowerCase().includes(needle))) continue;
      const i = path.lastIndexOf("/");
      out[code].push({ path, code, name: path.slice(i + 1), dir: i < 0 ? "" : path.slice(0, i) });
    }
    return ORDER.map(code => ({ code, items: out[code].sort((a, b) => a.path.localeCompare(b.path)) })).filter(g => g.items.length);
  }

  const count = files => [...files.values()].filter(c => ORDER.includes(c)).length;
  // Detached HEAD shows the 7-char commit id.
  const head = (branch, oid) => branch || (oid ? oid.slice(0, 7) : "?");

  return { ORDER, group, count, head };
})();

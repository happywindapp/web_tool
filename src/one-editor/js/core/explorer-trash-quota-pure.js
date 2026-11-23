// Recycle bin rules (ADR #27): per-delete cap, total cap (oldest go first), expiry after 30 days and "a (2).txt" names when restoring onto a taken name.
const TrashQuota = (() => {
  const MB = 1048576, ONE = { bytes: 100 * MB, files: 2000 }, TOTAL = 500 * MB, DAYS = 30, DAY = 864e5;
  const fits = (bytes, files) => bytes <= ONE.bytes && files <= ONE.files;

  // records [{ id, at, size }] → ids to drop: expired ones, then the oldest until `adding` more bytes fit under TOTAL.
  function drops(records, adding = 0, now = Date.now()) {
    const old = r => now - r.at > DAYS * DAY, live = records.filter(r => !old(r)).sort((a, b) => a.at - b.at);
    const out = records.filter(old).map(r => r.id);
    let total = live.reduce((s, r) => s + (r.size || 0), 0) + adding;
    for (const r of live) { if (total <= TOTAL) break; out.push(r.id); total -= r.size || 0; }
    return out;
  }

  // taken(name) → Promise<boolean>; folders keep dots in their name.
  async function freeName(name, dir, taken) {
    if (!await taken(name)) return name;
    const k = dir ? -1 : name.lastIndexOf("."), [base, ext] = k > 0 ? [name.slice(0, k), name.slice(k)] : [name, ""];
    for (let i = 2; ; i++) { const n = base + " (" + i + ")" + ext; if (!await taken(n)) return n; }
  }

  return { fits, drops, freeName, ONE, TOTAL, DAYS, MB };
})();

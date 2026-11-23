// Pure (node test): Windows-like "Group by" for list tabs — groups in first-seen or fixed order, buckets by type family / date modified / size — and the column filter check.
const FolderGroups = (() => {
  const KB = 1024, MB = 1048576;
  const FAMILY = {
    code: "js mjs cjs ts tsx jsx py go java cs c h cpp hpp rs rb php kt swift scala sh ps1 bat cmd sql css scss less html htm vue svelte lua pl r dart",
    data: "json jsonl xml yaml yml toml ini cfg conf env csv tsv log fix proto graphql",
    doc: "md markdown txt rst adoc pdf doc docx xls xlsx ppt pptx odt ods rtf",
    image: "png jpg jpeg gif webp bmp ico avif svg tif tiff heic",
    archive: "zip tar gz tgz 7z rar bz2 xz zst",
    binary: "exe dll so dylib bin dat class jar wasm pyc o obj lib msi iso",
  };
  const EXT = new Map(Object.entries(FAMILY).flatMap(([f, list]) => list.split(" ").map(x => [x, f])));
  const ORDER = {
    family: ["folder", "code", "data", "doc", "image", "archive", "binary", "other"],
    date: ["today", "yesterday", "week", "month", "older", "none"],
    size: ["empty", "tiny", "small", "medium", "large", "none"],
  };

  const ext = name => { const k = name.lastIndexOf("."); return k > 0 ? name.slice(k + 1).toLowerCase() : ""; };
  const family = (name, dir = false) => dir ? "folder" : EXT.get(ext(name)) || "other";

  // Calendar days in local time (DST-safe): today, yesterday, earlier this week (from Monday), earlier this month, older; a future date counts as today.
  function date(mod, now = Date.now()) {
    if (!Number.isFinite(mod)) return "none";
    const d = new Date(now), at = (y, m, day) => new Date(y, m, day).getTime();
    const y = d.getFullYear(), m = d.getMonth(), day = d.getDate();
    if (mod >= at(y, m, day)) return "today";
    if (mod >= at(y, m, day - 1)) return "yesterday";
    if (mod >= at(y, m, day - (d.getDay() + 6) % 7)) return "week";
    if (mod >= at(y, m, 1)) return "month";
    return "older";
  }

  // Colour by age: changed within the hour (or in the future), earlier today, within 7 days; "" = older / unknown.
  function age(mod, now = Date.now()) {
    if (!Number.isFinite(mod)) return "";
    if (now - mod < 3600e3) return "hour";
    return date(mod, now) === "today" ? "today" : now - mod < 7 * 864e5 ? "week" : "";
  }

  // Windows size groups: empty · < 16 KB · < 1 MB · < 128 MB · larger; folders and unknown sizes apart.
  function size(bytes, dir = false) {
    if (dir || !Number.isFinite(bytes)) return "none";
    return bytes === 0 ? "empty" : bytes < 16 * KB ? "tiny" : bytes < MB ? "small" : bytes < 128 * MB ? "medium" : "large";
  }

  // → [{ key, items }]: groups in the order of `order` (keys not in it last), else in first-seen order; items keep their order.
  function group(items, keyOf, order = null) {
    const map = new Map();
    for (const it of items) {
      const k = keyOf(it);
      if (!map.has(k)) map.set(k, []);
      map.get(k).push(it);
    }
    const out = [...map].map(([key, list]) => ({ key, items: list }));
    if (!order) return out;
    const rank = k => { const i = order.indexOf(k); return i < 0 ? order.length : i; };
    return out.map((g, i) => [g, i]).sort((a, b) => rank(a[0].key) - rank(b[0].key) || a[1] - b[1]).map(x => x[0]);
  }

  // Column filter (▾ on a header): picks = { column: Set of allowed values }; an empty or missing set lets everything through.
  const passes = (item, picks, valueOf) => Object.entries(picks || {}).every(([col, set]) => !set?.size || set.has(valueOf(item, col)));

  // Group by / column filter value of { name, dir, size, mod }: "type" ⇒ extension ("" = none), "date" / "size" ⇒ the buckets above; folders have no date / size here ⇒ "folder".
  function bucket(by, it, now = Date.now()) {
    if (it.dir) return "folder";
    return by === "type" ? ext(it.name) : by === "date" ? date(it.mod, now) : by === "size" ? size(it.size) : "";
  }
  const BY = { date: ["folder", ...ORDER.date], size: ["folder", ...ORDER.size] };
  // Bucket keys in display order: folders first, then types A–Z with "no extension" last, dates / sizes in the Windows order.
  function orderKeys(by, keys) {
    if (BY[by]) return group(keys, k => k, BY[by]).map(g => g.key);
    const rank = k => (k === "folder" ? 0 : k === "" ? 2 : 1);
    return [...keys].sort((a, b) => rank(a) - rank(b) || (a < b ? -1 : a > b ? 1 : 0));
  }
  // → [{ key, items }] grouped by bucket(by, info(item)); items keep their order (the sort) inside a group.
  function groupBy(items, by, info, now = Date.now()) {
    const groups = new Map(group(items, it => bucket(by, info(it), now)).map(g => [g.key, g]));
    return orderKeys(by, [...groups.keys()]).map(k => groups.get(k));
  }

  return { ORDER, family, date, age, size, group, passes, bucket, orderKeys, groupBy };
})();

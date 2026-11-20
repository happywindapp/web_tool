// Every command once — id, Vietnamese label (shown through T), shortcuts, run, optional when() — shared by the keyboard, Command Palette and the ⌘ button on touch.
const Commands = (() => {
  const list = [], byKey = new Map(), ran = [], prefixes = new Set();
  let chord = "", chordAt = 0;

  function add(id, label, keys, run, when) {
    const cmd = { id, label, keys: keys ? [].concat(keys) : [], run, when };
    list.push(cmd);
    cmd.keys.forEach(k => { byKey.set(k, cmd); if (k.includes(" ")) prefixes.add(k.split(" ")[0]); });
  }

  const usable = c => !c.when || c.when();
  const all = () => list.filter(usable);
  const exec = c => { ran.forEach(f => f(c.id)); c.run(); };
  const run = id => { const c = list.find(x => x.id === id); if (c && usable(c)) exec(c); };

  // "Ctrl+Alt+Shift+<key>": letters and digits by physical key (layout / Shift independent), other keys by e.key.
  function keyOf(e) {
    const k = /^Key[A-Z]$/.test(e.code) ? e.code.slice(3).toLowerCase() : /^Digit\d$/.test(e.code) ? e.code.slice(5) : e.key;
    return (e.ctrlKey || e.metaKey ? "Ctrl+" : "") + (e.altKey ? "Alt+" : "") + (e.shiftKey ? "Shift+" : "") + k;
  }

  // A chord ("Ctrl+k v"): the first key is swallowed and waits 1.5 s for the next; a second key that is no chord acts on its own.
  function onKey(e) {
    if (/^(?:Control|Shift|Alt|Meta)$/.test(e.key)) return;
    const k = keyOf(e), first = Date.now() - chordAt < 1500 ? chord : "", inDialog = e.target.closest && e.target.closest("dialog");
    chord = "";
    if (!first && prefixes.has(k) && !inDialog) { chord = k; chordAt = Date.now(); e.preventDefault(); e.stopPropagation(); return; }
    const c = (first && byKey.get(first + " " + k)) || byKey.get(k);
    if (!c || !usable(c) || (inDialog && c.id !== "palette")) return;
    e.preventDefault();
    e.stopPropagation();
    exec(c);
  }

  const keyLabel = c => c.keys[0] ? c.keys[0].replace(/(^|[+ ])([a-z])(?= |$)/g, (m, p, l) => p + l.toUpperCase()) : "";
  const bound = e => byKey.has(keyOf(e)) || prefixes.has(keyOf(e));
  return { add, all, run, onKey, keyOf, keyLabel, bound, onRun: f => ran.push(f) };
})();

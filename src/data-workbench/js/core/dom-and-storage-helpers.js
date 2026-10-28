// DOM lookup, HTML escape, clipboard (with fallback), download (revokes Blob URL), file reading, prefixed localStorage.
const $ = id => document.getElementById(id);

const Dom = (() => {
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const debounce = (fn, ms) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };

  // navigator.clipboard needs a secure context (https, localhost, file://); plain http falls back to execCommand.
  function copy(text) {
    const legacy = () => {
      const ta = document.createElement("textarea");
      ta.value = text; ta.style.position = "fixed"; ta.style.opacity = "0";
      document.body.appendChild(ta); ta.select();
      let ok = false;
      try { ok = document.execCommand("copy"); } catch { ok = false; }
      ta.remove();
      return ok;
    };
    if (navigator.clipboard && window.isSecureContext) return navigator.clipboard.writeText(text).then(() => true, legacy);
    return Promise.resolve(legacy());
  }

  function download(text, name, type = "text/plain;charset=utf-8") {
    const url = URL.createObjectURL(new Blob([text], { type }));
    const a = document.createElement("a");
    a.href = url; a.download = name;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10000);
  }

  function readFile(file, cb, encoding = "utf-8") {
    const r = new FileReader();
    r.onload = () => cb(file.name, TextUtil.stripBom(String(r.result)));
    r.onerror = () => cb(file.name, null);
    r.readAsText(file, encoding);
  }

  const baseName = name => name ? name.replace(/(\.[^.]+)?$/, "") : "ket-qua";

  return { esc, debounce, copy, download, readFile, baseName };
})();

// localStorage may be blocked (private mode, browser policy) → every access degrades to "not saved".
const Store = (() => {
  const P = "web_tool.data-workbench.";
  const get = (k, d) => { try { const v = localStorage.getItem(P + k); return v == null ? d : JSON.parse(v); } catch { return d; } };
  const set = (k, v) => { try { localStorage.setItem(P + k, JSON.stringify(v)); return true; } catch { return false; } };
  const del = k => { try { localStorage.removeItem(P + k); } catch { /* storage blocked */ } };
  return { get, set, del };
})();

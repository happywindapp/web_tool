// localStorage may be blocked → every access degrades to "not saved". Mermaid and shared UI settings keep the "mermaid-editor:" keys so existing drafts survive the rename.
const EngineStore = (() => {
  const make = P => ({
    get: (k, d) => { try { const v = localStorage.getItem(P + k); return v == null ? d : JSON.parse(v); } catch { return d; } },
    set: (k, v) => { try { localStorage.setItem(P + k, JSON.stringify(v)); return true; } catch { return false; } },
    del: k => { try { localStorage.removeItem(P + k); } catch { /* storage blocked */ } },
  });
  const ui = make("mermaid-editor:");
  const of = id => id === "mermaid" ? ui : make(`diagram-editor:${id}:`);
  return { ui, of };
})();

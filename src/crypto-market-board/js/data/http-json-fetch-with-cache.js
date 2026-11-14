// GET JSON with timeout, TTL cache (memory, + sessionStorage when persist) and in-flight de-dup; errors carry .status and .rateLimited (HTTP 429) for clear UI messages.
const Http = (() => {
  const cache = new Map(), inflight = new Map();
  const blockedUntil = new Map();
  const host = url => { try { return new URL(url).host; } catch { return ""; } };
  const SK = "web_tool.crypto-market-board.http:";
  const fromSession = url => { try { const v = JSON.parse(sessionStorage.getItem(SK + url) || "null"); if (v && v.at && "data" in v) { cache.set(url, v); return v; } } catch { /* blocked / full */ } return null; };
  const toSession = (url, v) => { try { sessionStorage.setItem(SK + url, JSON.stringify(v)); } catch { /* blocked / full */ } };

  // opt: { ttl ms (0 = no cache), timeout ms, persist (survive reload within ttl), opaqueLimit (host answers 429 without CORS → a network error means "rate limited") }
  async function json(url, opt = {}) {
    const ttl = opt.ttl || 0, hit = cache.get(url) || (opt.persist ? fromSession(url) : null);
    if (ttl && hit && Date.now() - hit.at < ttl) return hit.data;
    if (inflight.has(url)) return inflight.get(url);
    const h = host(url), wait = (blockedUntil.get(h) || 0) - Date.now();
    if (wait > 0) {
      if (hit) return hit.data;
      throw Object.assign(new Error(`rate limited by ${h}`), { status: 429, rateLimited: true, retryIn: Math.ceil(wait / 1000) });
    }
    const p = (async () => {
      const ctl = new AbortController(), timer = setTimeout(() => ctl.abort(), opt.timeout || 20000);
      try {
        const res = await fetch(url, { signal: ctl.signal, credentials: "omit", referrerPolicy: "no-referrer" });
        if (res.status === 429 || res.status === 418) {
          const sec = Math.min(300, Math.max(30, +res.headers.get("retry-after") || 60));
          blockedUntil.set(h, Date.now() + sec * 1000);
          throw Object.assign(new Error(`HTTP ${res.status} ${h}`), { status: res.status, rateLimited: true, retryIn: sec });
        }
        if (!res.ok) throw Object.assign(new Error(`HTTP ${res.status} ${h}`), { status: res.status });
        const data = await res.json();
        if (ttl) { const v = { at: Date.now(), data }; cache.set(url, v); if (opt.persist) toSession(url, v); }
        return data;
      } catch (e) {
        if (opt.opaqueLimit && e instanceof TypeError) {
          blockedUntil.set(h, Date.now() + 60000);
          e = Object.assign(new Error(`rate limited by ${h} (opaque)`), { rateLimited: true, retryIn: 60 });
        }
        // A stale copy beats an empty view when the source hiccups.
        if (hit && !opt.noStale) return hit.data;
        throw e;
      } finally { clearTimeout(timer); inflight.delete(url); }
    })();
    inflight.set(url, p);
    return p;
  }

  const qs = o => Object.entries(o).filter(([, v]) => v != null && v !== "").map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`).join("&");

  return { json, qs, drop: url => cache.delete(url) };
})();

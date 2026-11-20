// JWT decode: header + payload only — the signature is NOT verified (no key here); time claims become dates. Pure, the token never leaves the page.
const Jwt = (() => {
  const TOKEN = /(?<![\w-])(eyJ[\w-]*)\.([\w-]+)\.([\w-]*)/;
  const TIME = ["exp", "nbf", "iat", "auth_time", "updated_at"];

  function part(b64, name) {
    let text;
    try {
      const bin = atob(b64.replace(/-/g, "+").replace(/_/g, "/"));
      text = new TextDecoder("utf-8", { fatal: true }).decode(Uint8Array.from(bin, c => c.charCodeAt(0)));
    } catch { throw new Error(T("Phần {name} của JWT không phải Base64URL hợp lệ.", { name })); }
    try { return [JSON.parse(text), text]; } catch (e) { throw new Error(T("Phần {name} của JWT không phải JSON: {msg}", { name, msg: e.message })); }
  }

  // The first token in the text ("Bearer …", a header line, a log line…) → { header, payload, signature: { alg, bytes }, raw: decoded JSON texts }; errors carry the line.
  function decode(text) {
    const m = TOKEN.exec(text);
    if (!m) throw new Error(T("Không thấy JWT (dạng eyJ….….…) trong tab."));
    const line = text.slice(0, m.index).split("\n").length;
    try {
      const [header, ht] = part(m[1], "header"), [payload, pt] = part(m[2], "payload");
      return { header, payload, signature: { alg: header && header.alg, bytes: Math.floor(m[3].length * 3 / 4), verified: false }, raw: { header: ht, payload: pt } };
    } catch (e) { throw Object.assign(e, { line }); }
  }

  // Time claims → { k, v, utc, local, rel, state }: state "bad" = expired / not valid yet, "good" = valid now.
  function claims(payload, now = Date.now()) {
    if (!payload || typeof payload !== "object") return [];
    return TIME.filter(k => typeof payload[k] === "number" && Math.abs(payload[k]) < 8.64e12).map(k => {
      const ms = payload[k] * 1000;
      const state = k === "exp" ? (ms <= now ? "bad" : "good") : k === "nbf" ? (ms > now ? "bad" : "good") : "";
      return { k, v: payload[k], utc: DevNum.iso(ms), local: DevNum.localIso(ms), rel: DevNum.ago(ms, now), state };
    });
  }

  return { decode, claims, TOKEN };
})();

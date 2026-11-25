// Pure (node test): what a pasted text is — JWT, cURL, cron, long URL, Base64 (UTF-8 / gzip), PEM, FIX, SWIFT MT, epoch, minified JSON / XML, OpenAPI — on its first 64 KB.
const PasteDetect = (() => {
  const HEAD = 65536;
  const atobSafe = s => { try { return atob(s); } catch { return null; } };
  const printable = s => { let bad = 0; for (let i = 0; i < s.length; i++) { const c = s.charCodeAt(i); if (c < 9 || (c > 13 && c < 32) || c === 127) bad++; } return bad <= s.length * 0.02; };
  // A cut sample may end inside a multi-byte character, so it is decoded leniently.
  function utf8(bin, cut) { try { return new TextDecoder("utf-8", { fatal: !cut }).decode(Uint8Array.from(bin, c => c.charCodeAt(0))); } catch { return null; } }
  // 2001–2040 only, no leading 0: a 10-digit phone / account number is not a date.
  const epochIso = n => { const ms = n.length === 13 ? +n : +n * 1000; return n[0] !== "0" && ms >= 978307200000 && ms < 2240611200000 ? new Date(ms).toISOString() : null; };
  const NAME = "(?:JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC|MON|TUE|WED|THU|FRI|SAT|SUN)", TOKEN = `(?:[\\d*?/,LW#-]+|${NAME}(?:[-,]${NAME})*)`;
  const CRON = new RegExp(`^${TOKEN}(?:\\s+${TOKEN}){4,6}$`, "i");

  // → { kind, label, lang?, op?, steps?, info? } or null; label is the Vietnamese name shown in "Phát hiện {label}".
  function detect(text) {
    if (typeof text !== "string") return null;
    const t = text.slice(0, HEAD).trim(), one = !/\n/.test(t);
    if (t.length < 6) return null;
    if (one && /^eyJ[\w-]{4,}\.eyJ[\w-]*\.[\w-]*$/.test(t)) return { kind: "jwt", label: "JWT", op: "jwt" };
    if (/^-----BEGIN [A-Z0-9 ]+-----/.test(t)) return { kind: "pem", label: /PRIVATE KEY/.test(t.slice(0, 80)) ? "khoá riêng PEM" : "PEM (chứng chỉ / khoá)", op: "x509" };
    if (/^curl(?:\.exe)?\s/i.test(t)) return { kind: "curl", label: "lệnh cURL", lang: "Shell", op: "curl-convert" };
    if (/^(?:[^\n]*?[\x01|^])?8=FIX[\w.]*[\x01|^][\s\S]*?35=/.test(t.slice(0, 2000))) return { kind: "fix", label: "message FIX", lang: "FIX", op: "fix-detail" };
    if (/^\{1:F0\d/.test(t)) return { kind: "swift", label: "SWIFT MT (ISO 15022)", lang: "SWIFT MT", op: "swift-detail" };
    if (/^(?:openapi:\s*["']?3\.|swagger:\s*["']?2\.)/m.test(t.slice(0, 4000)) || /^\{\s*"(?:openapi|swagger)"\s*:\s*"[23]\./.test(t)) return { kind: "openapi", label: "OpenAPI / Swagger", lang: t[0] === "{" ? "JSON" : "YAML", op: "openapi-doc" };
    if (one && /^https?:\/\/\S+\?\S+=/.test(t) && t.length >= 60) return { kind: "url", label: "URL có query", op: "url-parts" };
    if (one && (/^@(?:yearly|annually|monthly|weekly|daily|hourly)$/.test(t) || (CRON.test(t) && /[*?/]/.test(t)))) return { kind: "cron", label: "biểu thức cron", op: "cron" };
    if (one && /^\d{10}(?:\d{3})?$/.test(t)) { const iso = epochIso(t); if (iso) return { kind: "epoch", label: "epoch", info: iso }; }
    if (one && t.length >= 120 && /^[[{]/.test(t)) { try { JSON.parse(t); return { kind: "json", label: "JSON 1 dòng", lang: "JSON", op: "json-pretty" }; } catch { /* not JSON */ } }
    if (t.length >= 120 && /^<[?!\w]/.test(t) && t.split("\n").length <= 2 && /<\/[\w:.-]+>\s*$/.test(t)) return { kind: "xml", label: /^<!doctype html|^<html/i.test(t) ? "HTML 1 dòng" : "XML 1 dòng", lang: /^<!doctype html|^<html/i.test(t) ? "HTML" : "XML", op: "format" };
    const b = t.replace(/\s+/g, "");
    if (b.length >= 16 && b.length % 4 === 0 && /^[A-Za-z0-9+/]+={0,2}$/.test(b) && /[A-Z]/.test(b) && /[a-z0-9+/]/.test(b)) {
      const bin = atobSafe(b.slice(0, 8192));
      if (bin && bin.charCodeAt(0) === 0x1f && bin.charCodeAt(1) === 0x8b) return { kind: "base64", label: "Base64 (gzip)", op: "recipe", steps: [{ op: "b64dec" }, { op: "gunzip" }] };
      const s = bin && utf8(bin, b.length > 8192);
      if (s && printable(s)) return { kind: "base64", label: "Base64 (UTF-8)", op: "recipe", steps: [{ op: "b64dec" }] };
    }
    return null;
  }

  return { detect, HEAD };
})();

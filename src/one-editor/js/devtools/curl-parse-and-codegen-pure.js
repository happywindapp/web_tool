// Pure (node test): curl command (bash \ · cmd ^ · PowerShell `) or a .http request → request model → fetch / axios / Go / C# / Python / PowerShell / .http / curl text. Never sends anything.
const CurlConv = (() => {
  const TARGETS = ["fetch", "axios", "go", "csharp", "python", "powershell", "http", "curl"];
  const LANG = { fetch: "JavaScript", axios: "JavaScript", go: "Go", csharp: "C#", python: "Python", powershell: "PowerShell", http: "Plain Text", curl: "Shell" };
  const SECRET = /^(?:authorization|proxy-authorization|cookie|set-cookie|x-api-key|api-key|apikey|x-auth-token|x-access-token|x-csrf-token|.*(?:token|secret|password|signature).*)$/i;
  const ARG = new Set(["-X", "--request", "-H", "--header", "-d", "--data", "--data-raw", "--data-binary", "--data-ascii", "--data-urlencode", "--json", "-F", "--form", "--form-string", "-u", "--user", "-b", "--cookie", "-A", "--user-agent", "-e", "--referer", "--url",
    "-o", "--output", "-m", "--max-time", "--connect-timeout", "--retry", "-x", "--proxy", "--cacert", "--cert", "--key", "-w", "--write-out", "-c", "--cookie-jar", "-T", "--upload-file", "--resolve", "-r", "--range", "-E", "--oauth2-bearer", "--aws-sigv4"]);
  const ALIAS = { "--request": "-X", "--header": "-H", "--data": "-d", "--data-ascii": "-d", "--form": "-F", "--form-string": "-F", "--user": "-u", "--cookie": "-b", "--user-agent": "-A", "--referer": "-e", "--get": "-G", "--head": "-I", "--insecure": "-k", "--location": "-L" };

  // Shell words of one command; dialect from the line continuation style.
  function words(text) {
    const dialect = /`\r?\n/.test(text) || /^\s*curl\.exe\b/i.test(text) ? "powershell" : /\^\r?\n/.test(text) || /\^"/.test(text) ? "cmd" : "bash";
    let s = text.replace(/\r\n?/g, "\n");
    s = dialect === "powershell" ? s.replace(/`\n/g, " ") : dialect === "cmd" ? s.replace(/\^\n/g, " ").replace(/\^(.)/g, "$1") : s.replace(/\\\n/g, " ");
    const out = [];
    let cur = null, i = 0;
    const push = c => { cur = (cur ?? "") + c; };
    while (i < s.length) {
      const c = s[i];
      if (/\s/.test(c)) { if (cur !== null) { out.push(cur); cur = null; } if (c === "\n" && dialect === "bash" && out.length) break; i++; continue; }
      if (dialect === "bash" && c === "$" && s[i + 1] === "'") { const r = ansiC(s, i + 2); push(r.v); i = r.i; continue; }
      if (c === "'") {
        let j = i + 1, v = "";
        for (; j < s.length; j++) { if (s[j] === "'") { if (dialect === "powershell" && s[j + 1] === "'") { v += "'"; j++; continue; } break; } v += s[j]; }
        push(v); i = j + 1; continue;
      }
      if (c === '"') {
        let j = i + 1, v = "";
        for (; j < s.length && s[j] !== '"'; j++) {
          if (dialect === "bash" && s[j] === "\\" && /["\\$`\n]/.test(s[j + 1] || "")) { v += s[++j]; continue; }
          if (dialect === "powershell" && s[j] === "`") { const n = s[++j]; v += n === "n" ? "\n" : n === "t" ? "\t" : n; continue; }
          if (dialect === "cmd" && s[j] === "\\" && s[j + 1] === '"') { v += '"'; j++; continue; }
          if (dialect === "cmd" && s[j] === '"' && s[j + 1] === '"') { v += '"'; j++; continue; }
          v += s[j];
        }
        push(v); i = j + 1; continue;
      }
      if (dialect === "bash" && c === "\\" && i + 1 < s.length) { push(s[i + 1]); i += 2; continue; }
      if (dialect === "powershell" && c === "`" && i + 1 < s.length) { push(s[i + 1]); i += 2; continue; }
      push(c); i++;
    }
    if (cur !== null) out.push(cur);
    return { words: out, dialect };
  }
  function ansiC(s, i) {
    let v = "";
    const E = { n: "\n", t: "\t", r: "\r", "\\": "\\", "'": "'", '"': '"' };
    for (; i < s.length && s[i] !== "'"; i++) {
      if (s[i] !== "\\") { v += s[i]; continue; }
      const n = s[++i];
      if (n === "x") { v += String.fromCharCode(parseInt(s.substr(i + 1, 2), 16) || 0); i += 2; } else v += E[n] ?? n;
    }
    return { v, i: i + 1 };
  }

  const header = (list, k) => list.find(h => h[0].toLowerCase() === k.toLowerCase());
  function splitUrl(raw, notes) {
    let url = raw;
    if (!/^[a-z][\w+.-]*:\/\//i.test(url)) { url = "http://" + url; notes.push({ code: "noScheme" }); }
    const hash = url.indexOf("#"), base = hash >= 0 ? url.slice(0, hash) : url, q = base.indexOf("?");
    const query = q < 0 ? [] : base.slice(q + 1).split("&").filter(Boolean).map(p => { const e = p.indexOf("="); const dec = x => { try { return decodeURIComponent(x.replace(/\+/g, " ")); } catch { return x; } }; return e < 0 ? [dec(p), ""] : [dec(p.slice(0, e)), dec(p.slice(e + 1))]; });
    return { url, base: q < 0 ? base : base.slice(0, q), query };
  }

  // curl text → { method, url, base, query, headers, body, bodyKind, form, notes, dialect }; throws { code } when there is no curl / URL.
  function parse(text) {
    const { words: w, dialect } = words(text);
    if (!w.length || !/^curl(?:\.exe)?$/i.test(w[0])) throw Object.assign(new Error("noCurl"), { code: "noCurl" });
    const r = { method: "", headers: [], data: [], form: [], notes: [], dialect, get: false, flags: [] };
    let url = "";
    for (let i = 1; i < w.length; i++) {
      let a = w[i], v;
      if (/^-[A-Za-z]{2,}$/.test(a) && !ARG.has(a)) {
        const head = a.slice(0, 2);
        if (ARG.has(head)) { v = a.slice(2); a = head; } else { for (const ch of a.slice(1)) flag("-" + ch, r); continue; }
      }
      const eq = a.startsWith("--") ? a.indexOf("=") : -1;
      if (eq > 0 && ARG.has(a.slice(0, eq))) { v = a.slice(eq + 1); a = a.slice(0, eq); }
      if (!a.startsWith("-") || a === "-") { if (!url) url = a; else r.notes.push({ code: "extraUrl", v: a }); continue; }
      if (ARG.has(a)) { if (v === undefined) v = w[++i] ?? ""; option(ALIAS[a] || a, v, r); } else flag(ALIAS[a] || a, r);
      if (a === "--url") url = v;
    }
    if (!url) throw Object.assign(new Error("noUrl"), { code: "noUrl" });
    const u = splitUrl(url, r.notes);
    let body = r.data.length ? r.data.join("&") : null;
    if (r.get && body !== null) { u.query.push(...body.split("&").map(p => { const e = p.indexOf("="); return e < 0 ? [p, ""] : [p.slice(0, e), p.slice(e + 1)]; })); body = null; }
    const method = (r.method || (r.head ? "HEAD" : body !== null || r.form.length ? "POST" : "GET")).toUpperCase();
    return finish({ method, url: u.base + (u.query.length ? "?" + u.query.map(q => enc(q[0]) + (q[1] !== "" ? "=" + enc(q[1]) : "")).join("&") : ""), base: u.base, query: u.query, headers: r.headers, body, form: r.form, notes: r.notes, dialect, json: r.json });
  }
  const enc = s => encodeURIComponent(s).replace(/%20/g, "+");
  function option(a, v, r) {
    if (a === "-X") r.method = v;
    else if (a === "-H") { const c = v.indexOf(":"); if (c > 0) { const k = v.slice(0, c).trim(), val = v.slice(c + 1).trim(); if (val || !v.endsWith(";")) r.headers.push([k, val]); } }
    else if (a === "-d" || a === "--data-raw" || a === "--data-binary" || a === "--data-urlencode" || a === "--json") {
      if (v.startsWith("@") && a !== "--data-raw") r.notes.push({ code: "fileBody", v: v.slice(1) });
      r.data.push(a === "--data-urlencode" ? urlencodeArg(v) : v);
      if (a === "--json") { r.json = true; if (!header(r.headers, "Content-Type")) r.headers.push(["Content-Type", "application/json"]); if (!header(r.headers, "Accept")) r.headers.push(["Accept", "application/json"]); }
    } else if (a === "-F") { const e = v.indexOf("="); const k = e < 0 ? v : v.slice(0, e), val = e < 0 ? "" : v.slice(e + 1); r.form.push([k, val.replace(/^[@<]/, ""), /^[@<]/.test(val)]); }
    else if (a === "-u") r.headers.push(["Authorization", "Basic " + btoa(unescape(encodeURIComponent(v)))]);
    else if (a === "-E" || a === "--cert" || a === "--key") r.notes.push({ code: "clientCert" });
    else if (a === "--oauth2-bearer") r.headers.push(["Authorization", "Bearer " + v]);
    else if (a === "-b") { if (v.includes("=")) r.headers.push(["Cookie", v]); else r.notes.push({ code: "cookieFile", v }); }
    else if (a === "-A") r.headers.push(["User-Agent", v]);
    else if (a === "-e") r.headers.push(["Referer", v]);
    else if (a === "-x" || a === "--proxy") r.notes.push({ code: "proxy", v });
    else if (a === "-T" || a === "--upload-file") { r.notes.push({ code: "fileBody", v }); r.method ||= "PUT"; }
  }
  function urlencodeArg(v) { const e = v.indexOf("="); return e < 0 ? encodeURIComponent(v) : v.slice(0, e + 1) + encodeURIComponent(v.slice(e + 1)); }
  function flag(a, r) {
    if (a === "-G") r.get = true;
    else if (a === "-I") r.head = true;
    else if (a === "-k") r.notes.push({ code: "insecure" });
  }

  function finish(req) {
    const ct = (header(req.headers, "Content-Type") || [])[1] || "";
    req.bodyKind = req.form.length ? "multipart" : req.body === null ? "" : /json/i.test(ct) || req.json || /^\s*[[{]/.test(req.body) && isJson(req.body) ? "json" : /x-www-form-urlencoded/i.test(ct) || (!ct && /^[^\s=&]+=[^\s]*(?:&[^\s=&]+=[^\s]*)*$/.test(req.body)) ? "form" : "text";
    req.pretty = req.bodyKind === "json" && isJson(req.body) ? JSON.stringify(JSON.parse(req.body), null, 2) : req.body;
    if (req.bodyKind === "json" && !isJson(req.body)) req.notes.push({ code: "badJson" });
    return req;
  }
  function isJson(s) { try { JSON.parse(s); return true; } catch { return false; } }

  // .http / REST Client: METHOD URL [HTTP/x], headers, blank line, body; the first request of the file.
  function parseHttp(text) {
    const lines = text.replace(/\r\n?/g, "\n").split("\n");
    let i = 0;
    while (i < lines.length && (/^\s*(?:#|\/\/|@\w+\s*=)/.test(lines[i]) || !lines[i].trim())) i++;
    const m = /^\s*(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS|TRACE|CONNECT)\s+(\S+)(?:\s+HTTP\/[\d.]+)?\s*$/i.exec(lines[i] || "");
    if (!m) throw Object.assign(new Error("noHttp"), { code: "noHttp" });
    const notes = [], headers = [];
    for (i++; i < lines.length && lines[i].trim() && !/^###/.test(lines[i]); i++) { const c = lines[i].indexOf(":"); if (c > 0) headers.push([lines[i].slice(0, c).trim(), lines[i].slice(c + 1).trim()]); }
    const rest = [];
    for (i++; i < lines.length && !/^###/.test(lines[i]); i++) rest.push(lines[i]);
    if (i < lines.length) notes.push({ code: "moreRequests" });
    const body = rest.join("\n").replace(/\s+$/, "") || null, u = splitUrl(m[2], notes);
    return finish({ method: m[1].toUpperCase(), url: u.url, base: u.base, query: u.query, headers, body, form: [], notes, dialect: "http" });
  }
  const isHttp = text => /^\s*(?:(?:#|\/\/|@\w+\s*=)[^\n]*\n|\s*\n)*\s*(?:GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)\s+\S+/i.test(text.slice(0, 4000)) && !/^\s*curl/i.test(text);

  return { parse, parseHttp, isHttp, words, SECRET, TARGETS, LANG, header };
})();

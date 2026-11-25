// Pure (node test): request model (CurlConv) → code text for fetch · axios · Go net/http · C# HttpClient · Python requests · PowerShell Invoke-RestMethod · .http · curl.
const CurlGen = (() => {
  const q = s => JSON.stringify(s);
  const sq = s => "'" + String(s).replace(/'/g, "'\\''") + "'";
  const psq = s => "'" + String(s).replace(/'/g, "''") + "'";
  const ind = (s, pad) => s.split("\n").join("\n" + pad);
  const jsonBody = r => r.bodyKind === "json" && r.pretty !== r.body;
  const ct = r => (CurlConv.header(r.headers, "Content-Type") || [])[1] || "";

  function pyLit(v, pad = "") {
    if (v === null) return "None";
    if (v === true || v === false) return v ? "True" : "False";
    if (typeof v === "number") return String(v);
    if (typeof v === "string") return q(v);
    const p2 = pad + "    ";
    if (Array.isArray(v)) return v.length ? "[\n" + v.map(x => p2 + pyLit(x, p2)).join(",\n") + ",\n" + pad + "]" : "[]";
    const e = Object.entries(v);
    return e.length ? "{\n" + e.map(([k, x]) => p2 + q(k) + ": " + pyLit(x, p2)).join(",\n") + ",\n" + pad + "}" : "{}";
  }

  function fetchJs(r) {
    const o = [];
    if (r.method !== "GET") o.push("  method: " + q(r.method) + ",");
    if (r.headers.length) o.push("  headers: {\n" + r.headers.map(([k, v]) => "    " + q(k) + ": " + q(v) + ",").join("\n") + "\n  },");
    let pre = "";
    if (r.form.length) { pre = "const form = new FormData();\n" + r.form.map(([k, v, f]) => "form.append(" + q(k) + ", " + (f ? "fileInput.files[0] /* " + v + " */" : q(v)) + ");").join("\n") + "\n\n"; o.push("  body: form,"); }
    else if (r.body !== null) o.push("  body: " + (jsonBody(r) ? "JSON.stringify(" + ind(r.pretty, "  ") + ")" : q(r.body)) + ",");
    return pre + "const res = await fetch(" + q(r.url) + (o.length ? ", {\n" + o.join("\n") + "\n}" : "") + ");\nconst data = await res." + (/json/i.test((CurlConv.header(r.headers, "Accept") || [])[1] || "") || r.bodyKind === "json" ? "json" : "text") + "();\nconsole.log(res.status, data);\n";
  }

  function axios(r) {
    const o = ["  method: " + q(r.method.toLowerCase()) + ",", "  url: " + q(r.base) + ","];
    if (r.query.length) o.push("  params: {\n" + r.query.map(([k, v]) => "    " + q(k) + ": " + q(v) + ",").join("\n") + "\n  },");
    if (r.headers.length) o.push("  headers: {\n" + r.headers.map(([k, v]) => "    " + q(k) + ": " + q(v) + ",").join("\n") + "\n  },");
    let pre = "";
    if (r.form.length) { pre = "const form = new FormData();\n" + r.form.map(([k, v, f]) => "form.append(" + q(k) + ", " + (f ? "fileInput.files[0] /* " + v + " */" : q(v)) + ");").join("\n") + "\n\n"; o.push("  data: form,"); }
    else if (r.body !== null) o.push("  data: " + (jsonBody(r) ? ind(r.pretty, "  ") : q(r.body)) + ",");
    return "import axios from \"axios\";\n\n" + pre + "const res = await axios({\n" + o.join("\n") + "\n});\nconsole.log(res.status, res.data);\n";
  }

  function go(r) {
    const raw = s => s.includes("`") ? q(s) : "`" + s + "`";
    const body = r.form.length ? "nil /* multipart: build with mime/multipart */" : r.body === null ? "nil" : "strings.NewReader(" + raw(r.pretty ?? r.body) + ")";
    return "package main\n\nimport (\n\t\"fmt\"\n\t\"io\"\n\t\"net/http\"\n" + (r.body !== null && !r.form.length ? "\t\"strings\"\n" : "") + ")\n\nfunc main() {\n" +
      "\treq, err := http.NewRequest(" + q(r.method) + ", " + q(r.url) + ", " + body + ")\n\tif err != nil {\n\t\tpanic(err)\n\t}\n" +
      r.headers.map(([k, v]) => "\treq.Header.Set(" + q(k) + ", " + q(v) + ")\n").join("") +
      "\tres, err := http.DefaultClient.Do(req)\n\tif err != nil {\n\t\tpanic(err)\n\t}\n\tdefer res.Body.Close()\n\tdata, _ := io.ReadAll(res.Body)\n\tfmt.Println(res.StatusCode, string(data))\n}\n";
  }

  function csharp(r) {
    const M = { GET: "Get", POST: "Post", PUT: "Put", DELETE: "Delete", PATCH: "Patch", HEAD: "Head", OPTIONS: "Options" }[r.method];
    const lines = ["using var client = new HttpClient();", "using var request = new HttpRequestMessage(" + (M ? "HttpMethod." + M : "new HttpMethod(" + q(r.method) + ")") + ", " + q(r.url) + ");"];
    const type = ct(r), contentHeaders = /^(content-type|content-length|content-encoding|content-language)$/i;
    r.headers.filter(([k]) => !contentHeaders.test(k)).forEach(([k, v]) => lines.push("request.Headers.TryAddWithoutValidation(" + q(k) + ", " + q(v) + ");"));
    if (r.form.length) { lines.push("var form = new MultipartFormDataContent();"); r.form.forEach(([k, v, f]) => lines.push(f ? "form.Add(new StreamContent(File.OpenRead(" + q(v) + ")), " + q(k) + ", " + q(v) + ");" : "form.Add(new StringContent(" + q(v) + "), " + q(k) + ");")); lines.push("request.Content = form;"); }
    else if (r.body !== null) lines.push("request.Content = new StringContent(" + (jsonBody(r) ? "\"\"\"\n" + r.pretty + "\n\"\"\"" : q(r.body)) + ", System.Text.Encoding.UTF8, " + q((type.split(";")[0] || (r.bodyKind === "json" ? "application/json" : "text/plain")).trim()) + ");");
    lines.push("using var response = await client.SendAsync(request);", "var body = await response.Content.ReadAsStringAsync();", "Console.WriteLine($\"{(int)response.StatusCode} {body}\");");
    return lines.join("\n") + "\n";
  }

  function python(r) {
    const a = [q(r.base)];
    if (r.query.length) a.push("params=" + pyLit(Object.fromEntries(r.query)));
    const hs = r.headers.filter(([k]) => !(jsonBody(r) && /^content-type$/i.test(k)));
    if (hs.length) a.push("headers=" + pyLit(Object.fromEntries(hs)));
    if (r.form.length) { a.push("files=" + "{\n" + r.form.map(([k, v, f]) => "    " + q(k) + ": " + (f ? "open(" + q(v) + ", \"rb\")" : "(None, " + q(v) + ")")).join(",\n") + ",\n}"); }
    else if (r.body !== null) a.push(jsonBody(r) ? "json=" + pyLit(JSON.parse(r.body)) : "data=" + q(r.body));
    return "import requests\n\nres = requests.request(\n    " + q(r.method) + ",\n    " + a.map(x => ind(x, "    ")).join(",\n    ") + ",\n)\nprint(res.status_code, res.text)\n";
  }

  function powershell(r) {
    const lines = [], type = ct(r), hs = r.headers.filter(([k]) => !/^content-type$/i.test(k));
    if (hs.length) lines.push("$headers = @{\n" + hs.map(([k, v]) => "    " + psq(k) + " = " + psq(v)).join("\n") + "\n}");
    if (r.form.length) lines.push("$form = @{\n" + r.form.map(([k, v, f]) => "    " + psq(k) + " = " + (f ? "Get-Item " + psq(v) : psq(v))).join("\n") + "\n}");
    else if (r.body !== null) lines.push("$body = @'\n" + (r.pretty ?? r.body) + "\n'@");
    const args = ["-Uri " + psq(r.url), "-Method " + r.method[0] + r.method.slice(1).toLowerCase()];
    if (hs.length) args.push("-Headers $headers");
    if (r.form.length) args.push("-Form $form");
    else if (r.body !== null) { args.push("-Body $body"); args.push("-ContentType " + psq(type || (r.bodyKind === "json" ? "application/json" : "text/plain"))); }
    lines.push("$res = Invoke-RestMethod " + args.join(" `\n    "), "$res");
    return lines.join("\n") + "\n";
  }

  const http = r => r.method + " " + r.url + "\n" + r.headers.map(([k, v]) => k + ": " + v + "\n").join("") + (r.body !== null ? "\n" + (r.pretty ?? r.body) + "\n" : "");

  function curl(r) {
    const a = ["curl" + (r.method !== "GET" && !(r.method === "POST" && r.body !== null) ? " -X " + r.method : "") + " " + sq(r.url)];
    r.headers.forEach(([k, v]) => a.push("-H " + sq(k + ": " + v)));
    r.form.forEach(([k, v, f]) => a.push("-F " + sq(k + "=" + (f ? "@" : "") + v)));
    if (r.body !== null && !r.form.length) a.push("--data-raw " + sq(r.body));
    return a.join(" \\\n  ") + "\n";
  }

  const GEN = { fetch: fetchJs, axios, go, csharp, python, powershell, http, curl };
  const gen = (r, target) => (GEN[target] || fetchJs)(r);
  return { gen, pyLit };
})();

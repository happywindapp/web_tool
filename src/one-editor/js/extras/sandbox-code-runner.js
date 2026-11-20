// Runs inside tools/one-editor-preview-sandbox.html (CSP without connect-src): user code only ever runs in a child iframe sandbox="allow-scripts" (opaque origin — no IndexedDB even on file://): JS in a Worker started there (dropped when silent past the limit), HTML with guarded loops.
(() => {
  const MAX_MSG = 1000;
  let child = null, seq = 0, token = 0, sent = 0, watch = 0, last = 0;
  const post = (type, text = "", line = 0) => { if (type === "done" || type === "timeout" || sent++ < MAX_MSG) parent.postMessage({ run: seq, type, text: String(text).slice(0, 10000), line: line | 0 }, "*"); else if (sent === MAX_MSG + 2) { stop(); parent.postMessage({ run: seq, type: "limit", text: "", line: 0 }, "*"); } };
  function stop() { child?.remove(); child = null; clearInterval(watch); }

  // Prelude of the user's page / worker, one line (no line shift): console, errors, alert…, the loop guard.
  function prelude(tok, limit, inWorker) {
    const P = inWorker ? "self.postMessage" : "parent.postMessage";
    return "(function(){var S=" + tok + ",L=" + limit + ",P=function(t,a,l){try{" + P + "({__rc:S,type:t,text:String(a),line:l||0}" + (inWorker ? "" : ",\"*\"") + ")}catch(e){}};"
      + "var F=function(v,d){d=d||0;try{if(typeof v===\"string\")return d?JSON.stringify(v):v;if(v instanceof Error)return v.stack||String(v);if(typeof v===\"function\")return \"ƒ \"+(v.name||\"anonymous\")+\"()\";"
      + "if(v&&typeof v===\"object\"){if(v.nodeType===1)return \"<\"+v.tagName.toLowerCase()+(v.id?\"#\"+v.id:\"\")+\">\";if(d>2)return Array.isArray(v)?\"[…]\":\"{…}\";"
      + "if(Array.isArray(v))return \"[\"+v.slice(0,50).map(function(x){return F(x,d+1)}).join(\", \")+\"]\";return \"{\"+Object.keys(v).slice(0,50).map(function(k){return k+\": \"+F(v[k],d+1)}).join(\", \")+\"}\"}return String(v)}catch(e){return String(v)}};"
      + "var W=function(){var s=(new Error).stack||\"\",m=/:(\\d+):\\d+\\)?$/.exec(s.split(\"\\n\")[3]||\"\");return m?+m[1]:0};"
      + "[\"log\",\"info\",\"warn\",\"error\",\"debug\"].forEach(function(k){console[k]=function(){P(k,[].map.call(arguments,function(a){return F(a)}).join(\" \"),W())}});console.table=console.dir=console.log;"
      + "self.addEventListener(\"error\",function(e){P(\"error\",e.message,e.lineno);e.preventDefault()});self.addEventListener(\"unhandledrejection\",function(e){P(\"error\",\"Uncaught (in promise) \"+F(e.reason),0)});"
      + (inWorker ? "setInterval(function(){P(\"hb\",\"\",0)},250);self.__oeDone=function(){P(\"done\",\"\",0)};"
        : "self.addEventListener(\"securitypolicyviolation\",function(e){P(\"warn\",\"blocked: \"+e.blockedURI,e.lineNumber)});self.alert=function(m){P(\"info\",\"alert: \"+F(m),W())};self.confirm=function(m){P(\"info\",\"confirm: \"+F(m)+\" → false\",W());return false};"
          + "self.prompt=function(m){P(\"info\",\"prompt: \"+F(m)+\" → null\",W());return null};self.addEventListener(\"load\",function(){P(\"done\",\"\",0)});")
      + "var T0=0,A=false;self.__oeLoop=function(){if(!A){A=true;T0=Date.now();setTimeout(function(){A=false},0)}if(Date.now()-T0>L){P(\"timeout\",\"\",0);throw new Error(\"loop ran over \"+L+\" ms\")}return true};})();";
  }

  // new Function only parses (never runs; this page runs the user's code anyway): a guarded script that no longer parses runs unguarded.
  function guard(js) {
    const g = LoopGuard.insert(js);
    if (!g.count) return js;
    try { new Function(g.code); return g.code; } catch { /* try the original below */ }
    try { new Function(js); return js; } catch { return g.code; }
  }

  const TAG = "scr" + "ipt", SCRIPT = new RegExp("(<" + TAG + String.raw`\b(?![^>]*(?<![\w-])src\s*=)[^>]*>)([\s\S]*?)(</` + TAG + String.raw`\s*>)`, "gi");
  function runHtml(code, limit) {
    const html = code.replace(SCRIPT, (m, a, js, b) => /(?<![\w-])type\s*=\s*["']?(?!text\/javascript|text\/ecmascript|module|application\/javascript)[\w/+-]+/i.test(a) ? m : a + guard(js) + b);
    const m = /^\s*<!doctype[^>]*>/i.exec(html), at = m ? m[0].length : 0;
    child = document.createElement("iframe");
    child.setAttribute("sandbox", "allow-scripts");
    child.style.cssText = "border:0;width:100%;height:100%;display:block;background:#fff";
    child.srcdoc = html.slice(0, at) + "<" + TAG + ">" + prelude(token, limit, false) + "</" + TAG + ">" + html.slice(at);
    document.body.append(child);
  }

  // Started inside the opaque-origin child: a Worker made here (no sandbox attr on file://) would share file:// storage with One Editor.
  function host(src, module, tok) {
    var u = URL.createObjectURL(new Blob([src], { type: "text/javascript" })), w = new Worker(u, module ? { type: "module" } : {});
    w.onmessage = function (e) { parent.postMessage(e.data, "*"); };
    w.onerror = function (e) { e.preventDefault(); parent.postMessage({ __rc: tok, type: "error", text: String(e.message), line: e.lineno || 0 }, "*"); };
  }
  function runJs(code, limit) {
    const src = prelude(token, limit, true) + code.replace(/^#!.*/, "") + "\n;self.__oeDone();\n";
    const module = /^\s*(?:import|export)\s+[\w{*"']/m.test(code), arg = JSON.stringify(src).replace(/<\//g, "<\\/");
    child = document.createElement("iframe");
    child.setAttribute("sandbox", "allow-scripts");
    child.style.display = "none";
    child.srcdoc = "<" + TAG + ">(" + host + ")(" + arg + "," + module + "," + token + ")</" + TAG + ">";
    document.body.append(child);
    last = Date.now();
    watch = setInterval(() => { if (Date.now() - last > limit) { stop(); post("timeout"); } }, 200);
  }

  addEventListener("message", e => {
    const m = e.data;
    if (child && e.source === child.contentWindow && m && m.__rc === token && typeof m.type === "string") {
      last = Date.now();
      if (m.type === "hb") return;
      post(m.type, m.text, m.line);
      if (m.type === "timeout") stop();
      return;
    }
    if (e.source !== parent || !m || typeof m.run !== "object" || !m.run) return;
    const r = m.run;
    stop();
    if (r.stop || typeof r.code !== "string" || !Number.isInteger(r.seq)) return;
    seq = r.seq; token = Math.floor(Math.random() * 1e9) + 1; sent = 0;
    const limit = Math.min(Math.max(+r.timeout || 5000, 500), 60000);
    document.documentElement.style.cssText = document.body.style.cssText = "margin:0;height:100%;overflow:hidden";
    if (r.mode === "js") runJs(r.code, limit); else runHtml(r.code, limit);
  });
})();

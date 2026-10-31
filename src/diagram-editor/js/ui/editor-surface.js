// Active engine + editor surface: status line, gutter, overlay colouring.
let engine = ENGINES.mermaid, store = EngineStore.of("mermaid"), saved = null;
let renderSeq = 0, errLine = 0, fitNext = true, fileName = "", lastBg = "#ffffff", timer;

function report(text, cls, detail = "", line = 0) {
  $("status").textContent = text; $("status").className = cls;
  $("err").textContent = detail; $("err").hidden = !detail; $("err").dataset.line = line;
  errLine = line; gutter();
}
const flash = (msg, cls = "muted") => { $("info").textContent = msg; $("info").className = cls === true ? "bad" : cls || "muted"; };

function gutter() {
  const n = $("src").value.split("\n").length;
  let h = ""; for (let i = 1; i <= n; i++) h += (i === errLine ? `<b>${i}</b>` : i) + "\n";
  $("gut").innerHTML = h;
}
function syncScroll() { const t = $("src"); $("hl").scrollTop = $("gut").scrollTop = t.scrollTop; $("hl").scrollLeft = t.scrollLeft; }
function paint() { const v = $("src").value; $("hl").innerHTML = (v.length < 2e5 ? Highlight.html(v, engine) : Highlight.esc(v)) + "\n"; gutter(); syncScroll(); }

function readConfig() {
  const t = $("cfg").value.trim(), c = t ? JSON.parse(t) : {};
  if (typeof c !== "object" || c === null || Array.isArray(c)) throw new Error(T("cấu hình phải là 1 object JSON"));
  return c;
}
const currentSvg = () => $("stage").querySelector("svg");
const baseName = () => (fileName || `${T("so-do")}-${engine.id}`).replace(/\.[^.]+$/, "");

function download(name, blob) {
  const a = document.createElement("a"), u = URL.createObjectURL(blob);
  a.href = u; a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(u), 2000);
}
function copy(data, okMsg) {
  return Promise.resolve()
    .then(() => typeof data === "string" ? navigator.clipboard.writeText(data) : navigator.clipboard.write([new ClipboardItem({ "image/png": data })]))
    .then(() => flash(okMsg), e => flash(T("✖ Không sao chép được ({msg}). Trình duyệt chặn clipboard — hãy dùng nút Tải về.", { msg: e.message }), true));
}
function needSvg() { const s = currentSvg(); if (!s) flash(T("Chưa có sơ đồ để xuất."), true); return s; }

// Format detection: by file extension first, then by content sniffing (per tab: markup, data, code).
const Detect = (() => {
  const EXT = {
    json: "json jsonc json5 geojson har ipynb webmanifest map babelrc eslintrc",
    xml: "xml cdm pdm ldm oom bpm svg xsd xsl xslt wsdl config csproj vbproj props targets plist kml gpx rss atom xaml resx pom nuspec dtsx",
    html: "html htm xhtml shtml",
    csv: "csv", tsv: "tsv tab", yaml: "yaml yml",
    css: "css scss less", js: "js mjs cjs jsx ts tsx",
  };

  function byExt(name, allowed) {
    if (!name || !name.includes(".")) return "";
    const ext = name.split(".").pop().toLowerCase();
    return allowed.find(k => EXT[k].split(" ").includes(ext)) || "";
  }

  const head = text => TextUtil.stripBom(text).trimStart();

  function markup(text, name = "") {
    const k = byExt(name, ["json", "xml", "html"]);
    if (k) return k;
    const t = head(text);
    if (/^[\[{]/.test(t)) return "json";
    if (/^</.test(t)) return /^(<!doctype html|<html|<head|<body)|<(div|p|span|table|script|a)[\s>]/i.test(t) ? "html" : "xml";
    return /^["\d\-]|^(true|false|null)\b/.test(t) ? "json" : "xml";
  }

  function data(text, name = "") {
    const k = byExt(name, ["json", "xml", "csv", "tsv", "yaml"]);
    if (k) return k;
    const t = head(text);
    if (/^[\[{]/.test(t)) return "json";
    if (/^</.test(t)) return "xml";
    const first = t.split(/\r?\n/, 1)[0] || "";
    if (first.includes("\t")) return "tsv";
    if (/^(---|- |#)/.test(t) || /^[^,;|"]+:(\s|$)/.test(first)) return "yaml";
    return "csv";
  }

  function code(text, name = "") {
    const k = byExt(name, ["css", "js"]);
    if (k) return k;
    const t = head(text).slice(0, 5000);
    // CSS also contains var(--x) and @import, so those only count as JS in their keyword form.
    if (/^(\/\*[\s\S]*?\*\/\s*)*@(import|media|charset|font-face|keyframes|supports|layer)\b/.test(t)) return "css";
    if (/\b(function|const|let|return|export)\b|(?<!@)\bimport\b|\bvar\s+[A-Za-z_$]|\bclass\s+[A-Za-z_$][\w$]*\s*(extends\b|\{)|=>|console\.|\bif\s*\(/.test(t)) return "js";
    return /[^{}]+\{[^{}]*:[^{}]*\}/.test(t) ? "css" : "js";
  }

  return { markup, data, code };
})();

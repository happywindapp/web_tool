// Share links are untrusted and the page allows inline handlers, so renderer output is parsed inert and stripped of anything executable before it reaches the DOM.
const SvgSanitizer = (() => {
  // SMIL (animate/set…) can rewrite href to javascript: after sanitizing, so it goes too.
  const DROP = "script,iframe,frame,frameset,object,embed,link,meta,base,form,input,button,textarea,audio,video,animate,animateMotion,animateTransform,set,discard,handler,listener";
  const URL_ATTR = /^(?:href|xlink:href|src|action|formaction)$/i;
  const SAFE_URL = /^(?:#|data:image\/(?:png|jpe?g|gif|webp|svg\+xml)[;,])/i;
  const BAD_VALUE = /(?:java|vb)script:|data:text\/html/i;

  function clean(svgText) {
    const html = svgText.replace(/^\s*<\?xml[^>]*>/, "").replace(/^\s*<!DOCTYPE[^>]*>/i, "");
    const doc = new DOMParser().parseFromString(html, "text/html");
    const root = doc.querySelector("svg");
    if (!root) throw new Error("no <svg> in renderer output");
    root.querySelectorAll(DROP).forEach(n => n.remove());
    for (const el of [root, ...root.querySelectorAll("*")]) for (const a of [...el.attributes]) {
      if (/^on/i.test(a.name) || (URL_ATTR.test(a.name) && !SAFE_URL.test(a.value.trim())) || BAD_VALUE.test(a.value.replace(/[\s\0-\x1f]+/g, ""))) el.removeAttribute(a.name);
    }
    return document.importNode(root, true);
  }

  return { clean };
})();

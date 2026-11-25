// Go to symbol (Ctrl+R): functions / classes / types / headings from the Lezer syntax tree; languages without a tree fall back to a declaration regex.
const Symbols = (() => {
  const DEF = /^(?:Function|Method|Class|Interface|Type|Struct|Enum|Trait|Impl|Module|Namespace|Record)(?:Declaration|Definition|Decl|Spec|Item)$|^FuncDecl$|^MethodDecl$|^TypeSpec$|^(?:ATX|Setext)Heading\d$/;
  const NAME = /^(?:VariableDefinition|VariableName|PropertyDefinition|PropertyName|Definition|DefName|TypeName|TypeDefinition|BoundIdentifier|Identifier|Name|FieldName)$/;
  const FALLBACK = /^\s*(?:(?:export|public|private|protected|internal|static|async|abstract|override|final|sealed|partial|pub|default)\s+)*(?:function|def|class|func|interface|struct|enum|fn|record|module|namespace|type|sub|procedure)\s+([\w$.]+)/;
  const MAX = 3000;

  function fromTree(state) {
    const L = CM.language, tree = L.ensureSyntaxTree(state, state.doc.length, 300) || L.syntaxTree(state), out = [];
    tree.iterate({
      enter: n => {
        if (out.length >= MAX) return false;
        // JS/TS "const f = () => …" / "= function": a variable holding a function counts as one.
        const fnVar = n.name === "VariableDeclaration" && !!(n.node.getChild("ArrowFunction") || n.node.getChild("FunctionExpression"));
        if (!fnVar && !DEF.test(n.name)) return;
        let label = "";
        if (/Heading/.test(n.name)) label = state.doc.lineAt(n.from).text.replace(/^\s*#+\s*/, "");
        else for (let c = n.node.firstChild; c; c = c.nextSibling) if (NAME.test(c.name)) { label = state.sliceDoc(c.from, c.to); break; }
        if (label) out.push({ label, kind: n.name.replace(/(?:Declaration|Definition|Decl|Spec|Item)$/, "").replace(/^(?:ATX|Setext)Heading/, "H"), pos: n.from });
      },
    });
    return out;
  }

  function fromLines(state) {
    const out = [];
    for (let i = 1; i <= state.doc.lines && out.length < MAX; i++) {
      const line = state.doc.line(i), m = FALLBACK.exec(line.text.slice(0, 300));
      if (m) out.push({ label: m[1], kind: "", pos: line.from });
    }
    return out;
  }

  // → [{ label, kind, line, pos }] in document order.
  function list(state) {
    if (/^\s*\{1:F0\d/.test(state.sliceDoc(0, 64))) return SwiftMarks.outline(state.doc.toString()).map(s => ({ label: s.label, kind: "H" + (s.depth + 1), line: s.line, pos: state.doc.line(s.line).from }));
    let out = fromTree(state);
    if (!out.length) out = fromLines(state);
    return out.map(s => Object.assign(s, { line: state.doc.lineAt(s.pos).number }));
  }

  return { list };
})();

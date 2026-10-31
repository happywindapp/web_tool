// Tab order. Each engine: { id, label, lib, ext, accept, fence?, configTab?, external?, defaultConfig, comment, keywords, placeholder, samples, firstSample, controls, ready(), render(code, cfg, seq) }.
const ENGINES = { mermaid: MermaidEngine, plantuml: PlantumlEngine, drawio: DrawioEngine, dbml: DbmlEngine, d2: D2Engine, structurizr: StructurizrEngine };

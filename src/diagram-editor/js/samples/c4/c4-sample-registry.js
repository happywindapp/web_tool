// Adds every system × C4 level to the tabs' samples as ?demo=c4-<system>-<level>; Structurizr gets one workspace with 4 views.
for (const model of [C4_MODEL_BANKING, C4_MODEL_SECURITIES, C4_MODEL_SHOPPING]) {
  for (const { key, label } of C4Views.LEVELS) {
    const id = `c4-${model.key}-${key}`;
    MERMAID_SAMPLES[id] = [label, C4ToText.mermaid(model, key), model.group];
    PLANTUML_SAMPLES[id] = [label, C4ToText.plantuml(model, key), model.group];
    DRAWIO_SAMPLES[id] = [label, C4ToDrawio.build(model, key), model.group];
    D2_SAMPLES[id] = [label, C4ToD2.build(model, key), model.group];
  }
  STRUCTURIZR_SAMPLES[`c4-${model.key}`] = ["L1–L4 — 4 view (chọn view trên toolbar)", C4ToStructurizr.build(model), model.group];
}

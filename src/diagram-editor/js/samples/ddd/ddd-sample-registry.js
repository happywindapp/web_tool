// Adds every system × DDD diagram to the tabs' samples as ?demo=ddd-<system>-<view>; Structurizr gets one workspace with 5 views.
for (const model of [DDD_MODEL_BANKING, DDD_MODEL_SECURITIES, DDD_MODEL_SHOPPING]) {
  for (const { key, label } of DddViews.VIEWS) {
    const id = `ddd-${model.key}-${key}`;
    MERMAID_SAMPLES[id] = [label, DddToText.mermaid(model, key), model.group];
    PLANTUML_SAMPLES[id] = [label, DddToText.plantuml(model, key), model.group];
    DRAWIO_SAMPLES[id] = [label, DddToDrawio.build(model, key), model.group];
    D2_SAMPLES[id] = [label, DddToD2.build(model, key), model.group];
  }
  STRUCTURIZR_SAMPLES[`ddd-${model.key}`] = ["5 sơ đồ DDD (chọn view trên toolbar)", DddToStructurizr.build(model), model.group];
}

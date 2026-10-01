/*
  DEMO LIBRARY ERRORS (синтетическая).
  Библиотека загружается, но содержит проблемные шаблоны:
    - шаблон без id           -> error, пропущен;
    - шаблон без blocks       -> error, пропущен;
    - шаблон без visualStyle  -> warning, fallback "cinematic";
  Плюс один валидный шаблон (demo_errors_ok) — проверка, что ошибки
  не блокируют остальные шаблоны той же библиотеки.
*/
window.TEMPLATE_LIBRARY = {
  libraryId: "demo_library_errors",
  name: "Demo Library Errors",
  version: "1.0.0",
  templates: [
    {
      label: "No Id Template",
      templateGroup: "Text",
      visualStyle: "cinematic",
      blocks: [ { id: "err1", kind: "shape", role: "bg", x: 0, y: 0, w: 1123, h: 794, shape: "rect", style: { fill: "#fff", radius: 0, stroke: null }, visible: true } ]
    },
    {
      id: "demo_errors_noblocks",
      label: "No Blocks Template",
      templateGroup: "Text",
      visualStyle: "cinematic"
    },
    {
      id: "demo_errors_ok",
      label: "Demo Errors OK",
      templateGroup: "About",
      visualStyle: "demo-minimal",
      blocks: [
        { id: "demo_errors_ok_bg", kind: "shape", role: "bg", x: 0, y: 0, w: 1123, h: 794, shape: "rect", style: { fill: "#f4f4f4", radius: 0, stroke: null }, visible: true },
        { id: "demo_errors_ok_title", kind: "text", role: "title", x: 60, y: 160, w: 640, h: 60, content: "Errors library valid template", style: { fontFamily: "Inter, system-ui, sans-serif", fontSize: 40, fontWeight: 500, lineHeight: 1.1, letterSpacing: -0.5, textAlign: "left", color: "#222", textTransform: "none", semanticType: "title" }, visible: true }
      ]
    }
  ]
};

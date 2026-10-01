/*
  DEMO LIBRARY CONFLICT (синтетическая).
  Специально содержит demo_a_intro — дубликат template ID из Demo Library A.
  Проверка: конфликт зафиксирован, silent overwrite отсутствует,
  уникальный demo_c_extra (новый стиль demo-purple) загружается.
*/
window.TEMPLATE_LIBRARY = {
  libraryId: "demo_library_conflict",
  name: "Demo Library Conflict",
  version: "1.0.0",
  templates: [
    {
      id: "demo_a_intro",
      label: "Conflict Copy Of Demo A Intro",
      templateGroup: "Intro",
      visualStyle: "cinematic",
      blocks: [
        { id: "conflict_bg", kind: "shape", role: "bg", x: 0, y: 0, w: 1123, h: 794, shape: "rect", style: { fill: "#ffdddd", radius: 0, stroke: null }, visible: true }
      ]
    },
    {
      id: "demo_c_extra",
      label: "Demo C Extra (Purple)",
      templateGroup: "Gallery",
      visualStyle: "demo-purple",
      blocks: [
        { id: "demo_c_extra_bg", kind: "shape", role: "bg", x: 0, y: 0, w: 1123, h: 794, shape: "rect", style: { fill: "#180f22", radius: 0, stroke: null }, visible: true },
        { id: "demo_c_extra_title", kind: "text", role: "title", x: 80, y: 320, w: 900, h: 80, content: "Demo Purple Layout", style: { fontFamily: "Inter, system-ui, sans-serif", fontSize: 58, fontWeight: 600, lineHeight: 1, letterSpacing: -1.5, textAlign: "left", color: "#c9a2ff", textTransform: "none", semanticType: "title" }, visible: true }
      ]
    }
  ]
};

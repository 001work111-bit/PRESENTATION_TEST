/*
  DEMO LIBRARY B (синтетическая). Новый формат через window.TEMPLATE_LIBRARY.
  Содержит шаблон без visualStyle (проверка fallback "cinematic" + warning).
*/
window.TEMPLATE_LIBRARY = {
  libraryId: "demo_library_b",
  name: "Demo Library B",
  version: "1.0.0",
  templates: [
    {
      id: "demo_b_intro",
      label: "Demo B Intro",
      templateGroup: "Intro",
      visualStyle: "demo-minimal",
      blocks: [
        { id: "demo_b_intro_bg", kind: "shape", role: "bg", x: 0, y: 0, w: 1123, h: 794, shape: "rect", style: { fill: "#fafafa", radius: 0, stroke: null }, visible: true },
        { id: "demo_b_intro_title", kind: "text", role: "title", x: 60, y: 120, w: 620, h: 60, content: "Demo B Minimal", style: { fontFamily: "Inter, system-ui, sans-serif", fontSize: 44, fontWeight: 500, lineHeight: 1.05, letterSpacing: -1, textAlign: "left", color: "#222222", textTransform: "none", semanticType: "title" }, visible: true }
      ]
    },
    {
      id: "demo_b_text",
      label: "Demo B Text",
      templateGroup: "Text",
      isFavorite: false,
      blocks: [
        { id: "demo_b_text_bg", kind: "shape", role: "bg", x: 0, y: 0, w: 1123, h: 794, shape: "rect", style: { fill: "#ffffff", radius: 0, stroke: null }, visible: true },
        { id: "demo_b_text_body", kind: "text", role: "body", x: 60, y: 140, w: 600, h: 300, content: "Demo B body text (visualStyle missing -> cinematic)", style: { fontFamily: "Inter, system-ui, sans-serif", fontSize: 17, fontWeight: 400, lineHeight: 1.48, letterSpacing: 0, textAlign: "left", color: "#4c5661", textTransform: "none", semanticType: "body" }, visible: true }
      ]
    }
  ]
};

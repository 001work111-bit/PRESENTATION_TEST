/*
  DEMO LIBRARY A (синтетическая, для тестов внешних библиотек).
  Контракт: window.TEMPLATE_LIBRARY = { libraryId, name, version, templates: [...] }
  Блоки повторяют page-модель редактора (shape/text), контент — только демо.
*/
window.TEMPLATE_LIBRARY = {
  libraryId: "demo_library_a",
  name: "Demo Library A",
  version: "1.0.0",
  description: "Synthetic demo library A (Arena fixture)",
  templates: [
    {
      id: "demo_a_intro",
      label: "Demo A Intro",
      templateGroup: "Intro",
      visualStyle: "cinematic",
      isFavorite: false,
      blocks: [
        { id: "demo_a_intro_bg", kind: "shape", role: "bg", x: 0, y: 0, w: 1123, h: 794, shape: "rect", style: { fill: "#ffffff", radius: 0, stroke: null }, visible: true },
        { id: "demo_a_intro_title", kind: "text", role: "title", x: 48, y: 96, w: 680, h: 72, content: "Demo A Intro Title", style: { fontFamily: "Inter, system-ui, sans-serif", fontSize: 56, fontWeight: 600, lineHeight: 1, letterSpacing: -2, textAlign: "left", color: "#111315", textTransform: "none", semanticType: "title" }, visible: true },
        { id: "demo_a_intro_meta", kind: "text", role: "meta", x: 48, y: 44, w: 260, h: 22, content: "DEMO LIBRARY A", style: { fontFamily: "Inter, system-ui, sans-serif", fontSize: 11, fontWeight: 700, lineHeight: 1.2, letterSpacing: 2.2, textAlign: "left", color: "#5f6873", textTransform: "uppercase", semanticType: "meta" }, visible: true }
      ]
    },
    {
      id: "demo_a_cover",
      label: "Demo A Cover",
      templateGroup: "Project Cover",
      visualStyle: "demo-green",
      isFavorite: false,
      blocks: [
        { id: "demo_a_cover_bg", kind: "shape", role: "bg", x: 0, y: 0, w: 1123, h: 794, shape: "rect", style: { fill: "#0f1a12", radius: 0, stroke: null }, visible: true },
        { id: "demo_a_cover_title", kind: "text", role: "title", x: 80, y: 300, w: 900, h: 90, content: "Demo A Cover Title", style: { fontFamily: "Inter, system-ui, sans-serif", fontSize: 64, fontWeight: 600, lineHeight: 1, letterSpacing: -2, textAlign: "left", color: "#8fe3a8", textTransform: "none", semanticType: "title" }, visible: true }
      ]
    },
    {
      id: "demo_a_gallery",
      label: "Demo A Gallery",
      templateGroup: "Gallery",
      visualStyle: "editorial-blue",
      isFavorite: false,
      blocks: [
        { id: "demo_a_gallery_bg", kind: "shape", role: "bg", x: 0, y: 0, w: 1123, h: 794, shape: "rect", style: { fill: "#f8f9fc", radius: 0, stroke: null }, visible: true },
        { id: "demo_a_gallery_plate", kind: "shape", role: "plate", x: 48, y: 120, w: 1027, h: 500, shape: "rect", style: { fill: "#e7ecfa", radius: 12, stroke: null }, visible: true }
      ]
    }
  ]
};

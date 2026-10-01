/*
  DEMO LIBRARY LEGACY (синтетическая, compatibility path).
  Старый формат проекта: window.MY_CUSTOM_COVERS = [...] без libraryId.
  Loader нормализует: libraryId = fallback из имени файла (demo-library-legacy).
*/
window.MY_CUSTOM_COVERS = [
  {
    id: "demo_legacy_cover",
    label: "Demo Legacy Cover",
    templateGroup: "Project Cover",
    visualStyle: "cinematic",
    isFavorite: false,
    blocks: [
      { id: "demo_legacy_bg", kind: "shape", role: "bg", x: 0, y: 0, w: 1123, h: 794, shape: "rect", style: { fill: "#101418", radius: 0, stroke: null }, visible: true },
      { id: "demo_legacy_title", kind: "text", role: "title", x: 80, y: 340, w: 900, h: 80, content: "Legacy Format Cover", style: { fontFamily: "Inter, system-ui, sans-serif", fontSize: 52, fontWeight: 600, lineHeight: 1, letterSpacing: -1, textAlign: "left", color: "#ffffff", textTransform: "none", semanticType: "title" }, visible: true }
    ]
  }
];

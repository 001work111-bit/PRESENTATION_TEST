/*
  =============================================================
  PANEL UI V1.1 (js/panel-ui.js) — НЕЗАВИСИМЫЙ ФАЙЛ ПАНЕЛИ
  =============================================================
  Этот файл владеет ДИЗАЙНОМ и ПОВЕДЕНИЕМ ОКНА плавающей панели
  (dock) Presentation и редактируется БЕЗ касания ядра
  (TemplateRegistry / TemplateManager / setupApprovedDock / shell).

  Что здесь живёт:
    - ручка правой границы  -> ширина панели (кнопки/вкладки
      перестраиваются: .approved-dock-tabs grid auto-fit);
    - ручка правого нижнего угла -> масштаб панели (scale 0.5–1.6);
    - режим FIT: AUTO — при каждом переключении панели её высота
      подстраивается под фактический контент; USER — высота остаётся
      как зафиксировано существующими стилями/пользователем.
    - Alt+O / legacy action "panelAppearance" открывает настройки
      панели в Shell Gear. Отдельный floating popup не используется.

  ПУБЛИЧНЫЙ API (стабильный, для будущих редизайнов):
    window.PanelUI.fit()            — подогнать высоту под контент сейчас
    window.PanelUI.setAutoFit(bool) — включить/выключить режим AUTO
    window.PanelUI.isAutoFit()      — текущий режим
    window.PanelUI.togglePopup()    — compatibility alias для Shell Gear
    window.PanelUI.setWidth(px) / setScale(v) / setOpacity(v) / reset()

  Правила совместимости:
    - НЕ трогать: id ручек (#panelUiResizeEdge/#panelUiResizeCorner),
      id legacy-поверхности (#panelUiOpacityPopup), ключ storage
      (portfolio_editor_panel_ui_v1), имена хуков __panelUiV1*;
    - сохранить PanelUI API и состояние: { w, scale, opacity, autoFit }.
  =============================================================
*/
(function setupPanelUiV1(){
  if (window.__IS_PDF_EXPORT__) return;
  if (window.__panelUiV1Loaded) return;
  window.__panelUiV1Loaded = true;

  const panel = document.querySelector(".left-panel");
  const dock = document.getElementById("approvedDockRoot");
  if (!panel || !dock || document.getElementById("panelUiResizeEdge")) return;

  const STORE_KEY = "portfolio_editor_panel_ui_v1";

  /* ---------- состояние (персистится) ---------- */
  function readState(){
    try {
      const raw = JSON.parse(window.localStorage.getItem(STORE_KEY) || "{}");
      return {
        w: Number(raw.w) || null,
        scale: Math.min(1.6, Math.max(0.5, Number(raw.scale) || 1)),
        opacity: Math.min(1, Math.max(0.15, raw.opacity == null ? 1 : (Number(raw.opacity) || 1))),
        autoFit: raw.autoFit === true /* USER-режим по умолчанию */
      };
    } catch (e) { return { w: null, scale: 1, opacity: 1, autoFit: false }; }
  }
  function writeState(){
    try { window.localStorage.setItem(STORE_KEY, JSON.stringify(st)); } catch (e) {}
  }
  let st = readState();
  let fitTimer = null;

  /* =========================================================
     DESIGN TOKENS — вся визуальная тема панели в одном месте.
     Редактируйте эти переменные и правила ниже, чтобы изменить
     внешний вид панели/ручек/поп-апа, не трогая ядро.
     ========================================================= */
  const styleEl = document.createElement("style");
  styleEl.id = "panelUiV1Style";
  styleEl.textContent = `
    /* ---------- DESIGN TOKENS ---------- */
    :root{
      --panelui-accent:#4a9eff;
      --panelui-handle-w:12px;
      --panelui-corner-size:20px;
      --panelui-popup-bg:#1d2027;
      --panelui-popup-border:rgba(255,255,255,.16);
      --panelui-popup-radius:12px;
      --panelui-popup-shadow:0 14px 44px rgba(0,0,0,.6);
      --panelui-text:#cbd0d8;
      --panelui-text-dim:#8b93a1;
    }
    /* вкладки dock перестраиваются при изменении ширины панели */
    .approved-dock-tabs{ grid-template-columns:repeat(auto-fit, minmax(64px, 1fr))!important; }

    /* ---------- ручки изменения размера ---------- */
    .panel-ui-handle{ position:fixed; z-index:4000; }
    .panel-ui-handle.panel-ui-edge{ width:var(--panelui-handle-w); cursor:ew-resize; }
    .panel-ui-handle.panel-ui-corner{ width:var(--panelui-corner-size); height:var(--panelui-corner-size); cursor:nwse-resize; }
    /* подсветка убрана по фидбеку: только курсор показывает направление */
    .panel-ui-handle.panel-ui-edge:hover{ background:transparent; }
    .panel-ui-handle.panel-ui-corner:hover{ background:transparent; border-top-left-radius:14px; }

    /* Legacy popup retained for API/storage compatibility, never shown in the user flow. */
    #panelUiOpacityPopup{
      display:none!important;
      position:fixed; z-index:4600; width:236px; padding:10px 12px;
      background:var(--panelui-popup-bg); border:1px solid var(--panelui-popup-border);
      border-radius:var(--panelui-popup-radius); box-shadow:var(--panelui-popup-shadow);
      font-size:11px; color:var(--panelui-text); font-family:inherit; user-select:none;
    }
    #panelUiOpacityPopup .panel-popup-title{
      display:flex; align-items:center; justify-content:space-between;
      font-size:9px; font-weight:800; letter-spacing:.10em; color:var(--panelui-text-dim); margin-bottom:8px;
    }
    #panelUiOpacityPopup .panel-popup-close{
      background:none; border:none; color:var(--panelui-text-dim); cursor:pointer;
      font-size:13px; line-height:1; padding:0 2px;
    }
    #panelUiOpacityPopup .panel-popup-close:hover{ color:#fff; }
    #panelUiOpacityPopup .panel-popup-row{ display:flex; align-items:center; gap:8px; }
    #panelUiOpacityPopup input[type="range"]{ flex:1 1 auto; min-width:0; cursor:pointer; accent-color:var(--panelui-accent); }
    #panelUiOpacityPopup .panel-popup-val{ min-width:36px; text-align:right; font-variant-numeric:tabular-nums; color:var(--panelui-text-dim); }
    #panelUiOpacityPopup .panel-popup-fit{ margin-top:8px; gap:6px; }
    #panelUiOpacityPopup .panel-popup-fit-label{ font-size:9px; font-weight:800; letter-spacing:.10em; color:var(--panelui-text-dim); }
    #panelUiOpacityPopup .panel-popup-fit-btn{
      flex:1 1 0; min-width:0; font-size:9px; font-weight:700; letter-spacing:.06em;
      padding:3px 0; cursor:pointer; border-radius:6px;
      background:#20232a; border:1px solid rgba(255,255,255,.14); color:var(--panelui-text-dim);
    }
    #panelUiOpacityPopup .panel-popup-fit-btn.is-active{
      background:rgba(74,158,255,.16); border-color:rgba(74,158,255,.5); color:var(--panelui-accent);
    }
    #panelUiOpacityPopup .panel-popup-actions{ display:flex; justify-content:flex-end; margin-top:8px; }
    #panelUiOpacityPopup .panel-popup-reset{ font-size:9px; padding:3px 10px; }
  `;
  document.head.appendChild(styleEl);

  /* ---------- ручки изменения размера (body-level fixed) ---------- */
  const edge = document.createElement("div");
  edge.id = "panelUiResizeEdge";
  edge.className = "panel-ui-handle panel-ui-edge";
  edge.title = "Тянуть — ширина панели (кнопки перестраиваются)";
  const corner = document.createElement("div");
  corner.id = "panelUiResizeCorner";
  corner.className = "panel-ui-handle panel-ui-corner";
  corner.title = "Тянуть — масштаб панели";
  document.body.appendChild(edge);
  document.body.appendChild(corner);

  function panelRect(){ return panel.getBoundingClientRect(); }

  function panelVisible(){
    /* display:none (shell-panel-hidden и т.п.) — единственный честный признак;
       размеры через getBoundingClientRect не используются (ненадёжны до layout) */
    try { if (window.getComputedStyle(panel).display === "none") return false; } catch (e) {}
    return true;
  }

  function syncHandles(){
    const on = panelVisible();
    edge.style.display = on ? "block" : "none";
    corner.style.display = on ? "block" : "none";
    if (!on) return;
    const r = panelRect();
    edge.style.left = Math.round(r.right - 6) + "px";
    edge.style.top = Math.round(r.top) + "px";
    edge.style.height = Math.round(r.height) + "px";
    corner.style.left = Math.round(r.right - 15) + "px";
    corner.style.top = Math.round(r.bottom - 15) + "px";
  }

  /*
    Ширина: inline !important width/min-width/max-width на элементе —
    побеждает ЛЮБОЕ стилевое правило файла (в т.ч. литеральную фиксацию
    350px!important в split-режиме). Корневые переменные обновляются,
    чтобы позиционирование панели и соседних зон следовало за шириной.
  */
  function applyWidth(){
    if (!st.w) return;
    const wpx = Math.round(st.w) + "px";
    panel.style.setProperty("width", wpx, "important");
    panel.style.setProperty("min-width", wpx, "important");
    panel.style.setProperty("max-width", wpx, "important");
    panel.style.setProperty("--approved-dock-w", wpx, "important");
    panel.style.setProperty("--fixed-left-panel-w", wpx, "important");
    try {
      document.documentElement.style.setProperty("--approved-dock-w", wpx);
      document.documentElement.style.setProperty("--fixed-left-panel-w", wpx);
    } catch (e) {}
  }
  function clearWidth(){
    ["width","min-width","max-width","--approved-dock-w","--fixed-left-panel-w"]
      .forEach(prop => panel.style.removeProperty(prop));
    try {
      document.documentElement.style.removeProperty("--approved-dock-w");
      document.documentElement.style.removeProperty("--fixed-left-panel-w");
    } catch (e) {}
  }
  function applyScale(){
    panel.style.transformOrigin = "top left";
    panel.style.transform = st.scale !== 1 ? "scale(" + st.scale + ")" : "";
  }
  function applyOpacity(){
    panel.style.opacity = String(st.opacity);
  }

  /* ---------- FIT: высота панели по контенту ---------- */
  function fitPanel(){
    if (!st.autoFit || !panelVisible()) return;
    const scale = st.scale || 1;
    /* максимум — "под длину приложения" (viewport) с учётом масштаба */
    const maxH = Math.max(180, ((window.innerHeight || 800) - 28) / scale);
    const contentH = panel.scrollHeight; /* контент + внутренние отступы панели */
    const newH = Math.max(160, Math.min(Math.round(contentH), Math.round(maxH)));
    ["height", "min-height", "max-height"].forEach(p => panel.style.setProperty(p, newH + "px", "important"));
    syncHandles();
  }
  function clearFit(){
    ["height", "min-height", "max-height"].forEach(p => panel.style.removeProperty(p));
  }
  function scheduleFit(){
    if (!st.autoFit) return;
    clearTimeout(fitTimer);
    fitTimer = setTimeout(fitPanel, 180);
  }
  function notifyShell(){
    try { if (window.parent && window.parent !== window) window.parent.postMessage({type:"PANEL_UI_STATE",state:Object.assign({},st)},"*"); } catch (e) {}
  }
  function setAutoFit(on){
    st.autoFit = !!on;
    writeState();
    if (st.autoFit) fitPanel(); else clearFit();
    syncFitButtons();
    notifyShell();
  }

  /* переключения панели/вкладок и изменения контента -> переподгон */
  try {
    new MutationObserver(scheduleFit).observe(document.body, {
      attributes: true,
      attributeFilter: ["data-approved-split-section", "data-approved-master-tab", "class"]
    });
  } catch (e) {}
  try {
    new MutationObserver(scheduleFit).observe(dock, { childList: true, subtree: true });
  } catch (e) {}

  function applyAll(){
    applyWidth(); applyScale(); applyOpacity();
    if (st.autoFit) fitPanel();
    syncHandles();
  }

  /* ---------- drag ---------- */
  function beginDrag(event, onMove){
    event.preventDefault();
    event.stopPropagation();
    const startX = event.clientX;
    const startY = event.clientY;
    const move = ev => onMove(ev.clientX - startX, ev.clientY - startY);
    const up = () => {
      document.removeEventListener("mousemove", move);
      document.removeEventListener("mouseup", up);
      writeState();
      if (st.autoFit) fitPanel(); /* после смены ширины контент перетёк */
      syncHandles();
      notifyShell();
    };
    document.addEventListener("mousemove", move);
    document.addEventListener("mouseup", up);
  }

  edge.addEventListener("mousedown", event => {
    const startW = panelRect().width / (st.scale || 1);
    beginDrag(event, dx => {
      const maxW = Math.max(280, (window.innerWidth || 1280) * 0.6);
      st.w = Math.min(maxW, Math.max(260, startW + dx));
      applyWidth();
      syncHandles();
    });
  });

  corner.addEventListener("mousedown", event => {
    const startScale = st.scale;
    beginDrag(event, (dx, dy) => {
      st.scale = Math.min(1.6, Math.max(0.5, startScale + (dx + dy) / 600));
      applyScale();
      syncHandles();
    });
  });

  /* ---------- поп-ап (Alt+O): прозрачность + FIT + Reset ---------- */
  const popup = document.createElement("div");
  popup.id = "panelUiOpacityPopup";
  popup.style.display = "none";
  popup.innerHTML = [
    '<div class="panel-popup-title"><span>PANEL &middot; APPEARANCE</span>',
    '<button type="button" class="panel-popup-close" title="Закрыть (Esc)">&times;</button></div>',
    '<div class="panel-popup-row">',
    '<input type="range" id="panelUiOpacity" min="20" max="100" step="1" aria-label="Прозрачность панели">',
    '<span class="panel-popup-val" id="panelUiOpacityVal"></span>',
    '</div>',
    '<div class="panel-popup-row panel-popup-fit">',
    '<span class="panel-popup-fit-label">FIT</span>',
    '<button type="button" class="panel-popup-fit-btn" id="panelUiFitUser" title="Высота как зафиксировано (по умолчанию)">USER</button>',
    '<button type="button" class="panel-popup-fit-btn" id="panelUiFitAuto" title="Подстраивать высоту панели под контент при каждом переключении">AUTO</button>',
    '</div>',
    '<div class="panel-popup-actions">',
    '<button type="button" class="btn panel-popup-reset" id="panelUiResetBtn" title="Сбросить ширину, масштаб, прозрачность и FIT">Reset</button>',
    '</div>'
  ].join("");
  document.body.appendChild(popup);

  function syncPopupControls(){
    const slider = document.getElementById("panelUiOpacity");
    const val = document.getElementById("panelUiOpacityVal");
    if (slider) slider.value = String(Math.round(st.opacity * 100));
    if (val) val.textContent = Math.round(st.opacity * 100) + "%";
    syncFitButtons();
  }
  function syncFitButtons(){
    const userBtn = document.getElementById("panelUiFitUser");
    const autoBtn = document.getElementById("panelUiFitAuto");
    if (userBtn) userBtn.classList.toggle("is-active", !st.autoFit);
    if (autoBtn) autoBtn.classList.toggle("is-active", !!st.autoFit);
  }

  function positionPopup(){
    const r = panelRect();
    let left = r.right + 14;
    const pw = 236, ph = 150;
    if (left + pw > (window.innerWidth || 1280) - 8) left = Math.max(8, r.left - pw - 14);
    let top = Math.max(8, Math.min(r.top, (window.innerHeight || 800) - ph - 8));
    popup.style.left = Math.round(left) + "px";
    popup.style.top = Math.round(top) + "px";
  }

  function requestAppearanceSettings(action){
    try {
      if(window.parent&&window.parent!==window){
        const type=action==="toggle"?"SHELL_TOGGLE_SETTINGS_PANEL":action==="close"?"SHELL_CLOSE_SETTINGS_PANEL":"SHELL_OPEN_SETTINGS_PANEL";
        window.parent.postMessage({type},"*");
      }
    } catch (e) {}
  }
  function isPopupOpen(){ return false; }
  function openPopup(){ requestAppearanceSettings("open"); }
  function closePopup(){ popup.style.display = "none"; requestAppearanceSettings("close"); }
  function togglePopup(){ requestAppearanceSettings("toggle"); }

  popup.querySelector(".panel-popup-close").addEventListener("click", closePopup);

  document.getElementById("panelUiOpacity").addEventListener("input", function(){
    st.opacity = Math.min(1, Math.max(0.15, (parseInt(this.value, 10) || 100) / 100));
    applyOpacity();
    writeState();
    syncPopupControls();
  });

  document.getElementById("panelUiFitUser").addEventListener("click", () => setAutoFit(false));
  document.getElementById("panelUiFitAuto").addEventListener("click", () => setAutoFit(true));

  document.getElementById("panelUiResetBtn").addEventListener("click", () => {
    st = { w: null, scale: 1, opacity: 1, autoFit: st.autoFit };
    clearWidth();
    panel.style.transform = "";
    panel.style.opacity = "";
    writeState();
    if (st.autoFit) fitPanel(); else clearFit();
    syncPopupControls();
    syncHandles();
  });

  document.addEventListener("keydown", event => {
    if (event.key === "Escape" && isPopupOpen()) { event.preventDefault(); closePopup(); }
  }, true);

  panel.addEventListener("scroll", syncHandles);
  window.addEventListener("resize", () => { syncHandles(); if (st.autoFit) scheduleFit(); });
  setInterval(syncHandles, 700);

  applyAll();
  notifyShell();
  /* после boot карточки раскладываются асинхронно — переподгон по факту */
  if (st.autoFit) { setTimeout(fitPanel, 350); setTimeout(fitPanel, 900); }

  /* =========================================================
     BUTTON / PANEL DESIGN SYSTEMS (Shell Settings -> «Дизайн»)
     Три законченных визуальных языка для кнопок и панелей.
     Применение: body[data-btn-theme="studio|aura|soft"].
     Тема переключается из Shell (SHELL_BUTTON_THEME) и читается
     из localStorage при старте. Только визуал, логика не меняется.
     ========================================================= */
  const THEMES_STYLE_ID = "panelUiThemesStyle";
  const BUTTON_THEME_KEY = "workspace_button_theme";
  const SAFE_THEMES = ["studio", "aura", "soft", "noir"];
  /* legacy-алиасы: Outline Pro -> Aura, Paper (светлая) -> Noir */
  const THEME_ALIASES = { outline: "aura", paper: "noir" };

  const THEMES_CSS = `
    /* ---------- STUDIO — Graphite Quiet (базовый, стандарт) ---------- */
    body[data-btn-theme="studio"] .btn,
    body[data-btn-theme="studio"] .small-btn,
    body[data-btn-theme="studio"] .icon-action-btn,
    body[data-btn-theme="studio"] .align-pills button,
    body[data-btn-theme="studio"] .gap-presets button,
    body[data-btn-theme="studio"] .tlib-onoff,
    body[data-btn-theme="studio"] .panel-popup-fit-btn{
      background:#20232a!important;
      border:1px solid #3a3a3a!important;
      border-radius:8px!important;
      transition:background .15s, border-color .15s, color .15s!important;
    }
    body[data-btn-theme="studio"] .btn:hover,
    body[data-btn-theme="studio"] .small-btn:hover,
    body[data-btn-theme="studio"] .icon-action-btn:hover{
      background:#2c303b!important; border-color:#50555f!important;
    }
    body[data-btn-theme="studio"] .approved-dock-tabs{
      grid-template-columns:repeat(auto-fit, minmax(64px, 1fr))!important;
    }
    body[data-btn-theme="studio"] .approved-dock-tab{ border-radius:8px!important; }

    /* ---------- AURA — BORDERLESS (минимализм Framer-уровня) ----------
       Кнопка определяется ПОВЕРХНОСТЬЮ, а не рамкой:
         обычная    = белое 5% на тёмном, радиус 10, без бордера;
         hover      = поверхность ярче (белое 10%), без сдвигов и цвета;
         активная   = монохромная инверсия (белое 16% + белый текст);
       Никаких рамок, uppercase, трекинга, градиентов и свечений.
       Единый радиус 10px, единый тайминг 120ms ease-out. */
    body[data-btn-theme="aura"] .btn,
    body[data-btn-theme="aura"] .small-btn,
    body[data-btn-theme="aura"] .icon-action-btn,
    body[data-btn-theme="aura"] .align-pills button,
    body[data-btn-theme="aura"] .gap-presets button,
    body[data-btn-theme="aura"] .tlib-onoff,
    body[data-btn-theme="aura"] .panel-popup-fit-btn{
      background:rgba(255,255,255,.05)!important;
      border:1px solid transparent!important;
      border-radius:10px!important;
      color:#e8ebf1!important;
      font-weight:600!important;
      letter-spacing:.01em!important;
      transition:background .12s ease-out, color .12s ease-out!important;
    }
    body[data-btn-theme="aura"] .btn:hover,
    body[data-btn-theme="aura"] .small-btn:hover,
    body[data-btn-theme="aura"] .icon-action-btn:hover{
      background:rgba(255,255,255,.10)!important;
    }
    body[data-btn-theme="aura"] .btn:active,
    body[data-btn-theme="aura"] .small-btn:active,
    body[data-btn-theme="aura"] .icon-action-btn:active{
      background:rgba(255,255,255,.14)!important;
    }
    body[data-btn-theme="aura"] .btn.active,
    body[data-btn-theme="aura"] .align-pills button.active,
    body[data-btn-theme="aura"] .approved-dock-tab.is-active,
    body[data-btn-theme="aura"] .tlib-onoff.is-on{
      background:rgba(255,255,255,.17)!important;
      color:#ffffff!important;
      border-color:transparent!important;
    }
    body[data-btn-theme="aura"] .approved-dock-tabs{
      gap:4px!important;
      padding:3px!important;
      background:rgba(255,255,255,.03)!important;
      border:1px solid transparent!important;
      border-radius:12px!important;
    }
    body[data-btn-theme="aura"] .approved-dock-tab{
      background:transparent!important;
      border:1px solid transparent!important;
      border-radius:9px!important;
      color:#9aa2b1!important;
      font-weight:600!important;
      letter-spacing:.01em!important;
    }
    body[data-btn-theme="aura"] .approved-dock-tab:hover{
      background:rgba(255,255,255,.06)!important;
      color:#e8ebf1!important;
    }

    /* ---------- SOFT TACTILE — Pill Glow ---------- */
    body[data-btn-theme="soft"] .btn,
    body[data-btn-theme="soft"] .small-btn,
    body[data-btn-theme="soft"] .icon-action-btn,
    body[data-btn-theme="soft"] .align-pills button,
    body[data-btn-theme="soft"] .gap-presets button,
    body[data-btn-theme="soft"] .tlib-onoff,
    body[data-btn-theme="soft"] .panel-popup-fit-btn{
      background:#262b34!important;
      border:1px solid transparent!important;
      border-radius:999px!important;
      box-shadow:inset 0 1px 0 rgba(255,255,255,.05);
      transition:background .15s, transform .15s, box-shadow .15s!important;
    }
    body[data-btn-theme="soft"] .btn:hover,
    body[data-btn-theme="soft"] .small-btn:hover,
    body[data-btn-theme="soft"] .icon-action-btn:hover{
      background:#2f3542!important;
      transform:translateY(-1px)!important;
      box-shadow:0 6px 16px rgba(0,0,0,.35)!important;
    }
    body[data-btn-theme="soft"] .btn.active,
    body[data-btn-theme="soft"] .approved-dock-tab.is-active,
    body[data-btn-theme="soft"] .tlib-onoff.is-on{
      background:#4a9eff!important;      /* ровный акцент: без градиентов и свечения */
      border-color:transparent!important;
      color:#fff!important;
      box-shadow:none!important;
    }
    body[data-btn-theme="soft"] .approved-dock-tabs{ gap:5px!important; }
    body[data-btn-theme="soft"] .approved-dock-tab{
      border-radius:999px!important;
      background:#262b34!important;
      border:1px solid transparent!important;
    }

    /* ---------- NOIR — Framed (тёмная витрина системы) ----------
       Рамка — главный сигнал: каждая кнопка очерчена 1px #2c3442.
       Hover: фон и рамка светлеют на одну ступень. Активная —
       инверсия (белая заливка #f5f7fa, тёмный текст) — приём
       Figma/Framer. Циановый акцент #45d6e6 — только в деталях
       панельного слоя, не в кнопках. */
    body[data-btn-theme="noir"] .btn,
    body[data-btn-theme="noir"] .small-btn,
    body[data-btn-theme="noir"] .icon-action-btn,
    body[data-btn-theme="noir"] .align-pills button,
    body[data-btn-theme="noir"] .gap-presets button,
    body[data-btn-theme="noir"] .tlib-onoff,
    body[data-btn-theme="noir"] .panel-popup-fit-btn{
      background:#161a22!important;
      border:1px solid #2c3442!important;
      border-radius:9px!important;
      color:#e8ebf1!important;
      transition:background .12s ease-out, border-color .12s ease-out!important;
    }
    body[data-btn-theme="noir"] .btn:hover,
    body[data-btn-theme="noir"] .small-btn:hover,
    body[data-btn-theme="noir"] .icon-action-btn:hover{
      background:#1c2230!important;
      border-color:#3a465c!important;
    }
    body[data-btn-theme="noir"] .btn.active,
    body[data-btn-theme="noir"] .align-pills button.active,
    body[data-btn-theme="noir"] .approved-dock-tab.is-active,
    body[data-btn-theme="noir"] .tlib-onoff.is-on{
      background:#f5f7fa!important;
      border-color:#f5f7fa!important;
      color:#0e1116!important;
    }
    body[data-btn-theme="noir"] .approved-dock-tab{
      background:#141821!important;
      border:1px solid #2c3442!important;
      border-radius:8px!important;
      color:#aab3c2!important;
    }
    body[data-btn-theme="noir"] .approved-dock-tab:hover{
      background:#1c2230!important;
      border-color:#3a465c!important;
      color:#e8ebf1!important;
    }
  `;

  /* =========================================================
     PANEL SYSTEMS — полный облик карточек панелей (не только
     кнопки): карточки, заголовки секций, селекты, поля ввода,
     чекбокс-строки, сетки, плотность, подписи, списки.
     Скоуп: только .left-panel (dock и его карточки). Канвас,
     тулбары страниц, экспорт и модалки НЕ затрагиваются.
     Тема PAPER — демонстрация максимальной глубины системы:
     светлая панель, поля-подчёркивания, чернильные кнопки,
     компактная плотность, подчёркнутые вкладки.
     ========================================================= */
  /* =========================================================
     PANEL SYSTEMS V2 (V2.6) — полный облик панелей.
     Скоуп HOST: полоса дока (.left-panel), ВСЕ 14+ слотов
     approvedSplit*Slot (Frame Inspector, Templates, Tech,
     Concept, Pages, Export, Deck, Hotkeys, Text, ...) и
     плавающий AI Pages Collector (.aipc-panel).
     :is(#id,...) даёт id-специфичность — перебивает dock-правила.
     Архитектура: 4 темы задают ТОЛЬКО токены --pnl-*, далее
     один словарь применяет их ко всем элементам. Новая панель
     на стандартных классах перекрашивается автоматически.
     ========================================================= */
  const HOST = ':is(.left-panel, .aipc-panel,' +
    '#approvedSplitAiSlot,#approvedSplitConceptQuickSlot,#approvedSplitConceptSlot,' +
    '#approvedSplitDeckSlot,#approvedSplitExportSlot,#approvedSplitFrameSlot,' +
    '#approvedSplitHotkeysSlot,#approvedSplitPageSlot,#approvedSplitPagesSlot,' +
    '#approvedSplitTechSlot,#approvedSplitTemplateLibrariesSlot,' +
    '#approvedSplitTemplateManagerSlot,#approvedSplitTemplatesSlot,#approvedSplitTextSlot,' +
    '#legacyApprovedSplitConceptSlot,#legacyApprovedSplitTemplatesSlot)';

  const PANEL_SYSTEMS_CSS = `
    /* ---------- Токены тем ---------- */
    body[data-btn-theme="studio"]{
      --pnl-host-bg:transparent; --pnl-host-brd:transparent; --pnl-host-rad:16px; --pnl-host-sh:none;
      --pnl-card-bg:#1d2027; --pnl-card-brd:#2e323c; --pnl-card-rad:12px; --pnl-card-sh:none;
      --pnl-title-c:#b8c0cc; --pnl-title-ls:.12em; --pnl-title-brd:transparent;
      --pnl-field-bg:#20232a; --pnl-field-brd:#3a3a3a; --pnl-field-rad:8px; --pnl-field-c:#e8ebf1;
      --pnl-note-c:#9aa3b2; --pnl-line:#262a33;
      --pnl-sub-bg:#20232a; --pnl-sub-brd:#2e323c; --pnl-sub-rad:10px;
      --pnl-list-bg:#22262e; --pnl-list-brd:#2e323c; --pnl-list-rad:9px;
      --pnl-chip-bg:#262a33; --pnl-chip-brd:#3a3a3a; --pnl-chip-c:#e8ebf1; --pnl-chip-on-bg:#4a9eff; --pnl-chip-on-c:#fff;
      --pnl-kbd-bg:#262a33; --pnl-kbd-brd:#3a3a3a; --pnl-kbd-c:#e8ebf1; --pnl-kbd-hover:#2e333e; --pnl-kbd-rad:8px;
      --pnl-accent:#4a9eff; --pnl-mincol:140px; --pnl-gap:8px;
    }
    body[data-btn-theme="aura"]{
      --pnl-host-bg:transparent; --pnl-host-brd:transparent; --pnl-host-rad:16px; --pnl-host-sh:none;
      --pnl-card-bg:rgba(255,255,255,.035); --pnl-card-brd:transparent; --pnl-card-rad:14px; --pnl-card-sh:none;
      --pnl-title-c:rgba(255,255,255,.42); --pnl-title-ls:.02em; --pnl-title-brd:transparent;
      --pnl-field-bg:rgba(255,255,255,.05); --pnl-field-brd:transparent; --pnl-field-rad:9px; --pnl-field-c:#e8ebf1;
      --pnl-note-c:rgba(232,235,241,.55); --pnl-line:rgba(255,255,255,.07);
      --pnl-sub-bg:rgba(255,255,255,.04); --pnl-sub-brd:transparent; --pnl-sub-rad:10px;
      --pnl-list-bg:rgba(255,255,255,.035); --pnl-list-brd:transparent; --pnl-list-rad:10px;
      --pnl-chip-bg:rgba(255,255,255,.06); --pnl-chip-brd:transparent; --pnl-chip-c:#e8ebf1; --pnl-chip-on-bg:rgba(255,255,255,.17); --pnl-chip-on-c:#fff;
      --pnl-kbd-bg:rgba(255,255,255,.05); --pnl-kbd-brd:transparent; --pnl-kbd-c:#e8ebf1; --pnl-kbd-hover:rgba(255,255,255,.10); --pnl-kbd-rad:9px;
      --pnl-accent:rgba(255,255,255,.4); --pnl-mincol:140px; --pnl-gap:9px;
    }
    body[data-btn-theme="soft"]{
      --pnl-host-bg:transparent; --pnl-host-brd:transparent; --pnl-host-rad:20px; --pnl-host-sh:none;
      --pnl-card-bg:#242a34; --pnl-card-brd:transparent; --pnl-card-rad:18px; --pnl-card-sh:inset 0 1px 0 rgba(255,255,255,.05), 0 8px 22px rgba(0,0,0,.28);
      --pnl-title-c:#aab3c2; --pnl-title-ls:.10em; --pnl-title-brd:transparent;
      --pnl-field-bg:#2b313d; --pnl-field-brd:transparent; --pnl-field-rad:999px; --pnl-field-c:#e8ebf1;
      --pnl-note-c:#9aa6b8; --pnl-line:rgba(255,255,255,.06);
      --pnl-sub-bg:#2b313d; --pnl-sub-brd:transparent; --pnl-sub-rad:14px;
      --pnl-list-bg:#2b313d; --pnl-list-brd:transparent; --pnl-list-rad:16px;
      --pnl-chip-bg:#262b34; --pnl-chip-brd:transparent; --pnl-chip-c:#e8ebf1; --pnl-chip-on-bg:#4a9eff; --pnl-chip-on-c:#fff;
      --pnl-kbd-bg:#262b34; --pnl-kbd-brd:transparent; --pnl-kbd-c:#e8ebf1; --pnl-kbd-hover:#2f3542; --pnl-kbd-rad:999px;
      --pnl-accent:#4a9eff; --pnl-mincol:150px; --pnl-gap:9px;
    }
    body[data-btn-theme="noir"]{
      --pnl-host-bg:rgba(8,10,14,.66); --pnl-host-brd:#1d2330; --pnl-host-rad:18px; --pnl-host-sh:0 18px 44px rgba(0,0,0,.42);
      --pnl-card-bg:#12151c; --pnl-card-brd:#262c39; --pnl-card-rad:12px; --pnl-card-sh:0 8px 24px rgba(0,0,0,.35);
      --pnl-title-c:#8f9aab; --pnl-title-ls:.14em; --pnl-title-brd:transparent;
      --pnl-field-bg:#0b0e13; --pnl-field-brd:#262c39; --pnl-field-rad:9px; --pnl-field-c:#e8ebf1;
      --pnl-note-c:#77808f; --pnl-line:#1f2530;
      --pnl-sub-bg:#0b0e13; --pnl-sub-brd:#1f2530; --pnl-sub-rad:10px;
      --pnl-list-bg:#10131a; --pnl-list-brd:#232937; --pnl-list-rad:10px;
      --pnl-chip-bg:#141821; --pnl-chip-brd:#2c3442; --pnl-chip-c:#dfe4ec; --pnl-chip-on-bg:#f5f7fa; --pnl-chip-on-c:#0e1116;
      --pnl-kbd-bg:#141821; --pnl-kbd-brd:#2c3442; --pnl-kbd-c:#dfe4ec; --pnl-kbd-hover:#1c2230; --pnl-kbd-rad:9px;
      --pnl-accent:#45d6e6; --pnl-mincol:140px; --pnl-gap:8px;
    }

    /* ---------- Полоса-контейнер + слоты-окна ---------- */
    ${HOST}{
      background:var(--pnl-host-bg)!important;
      border:1px solid var(--pnl-host-brd)!important;
      border-radius:var(--pnl-host-rad)!important;
      box-shadow:var(--pnl-host-sh)!important;
      container-type:inline-size;
      container-name:pnl;
    }

    /* ---------- Карточки ---------- */
    ${HOST} .sidebar-card{
      background:var(--pnl-card-bg)!important;
      border:1px solid var(--pnl-card-brd)!important;
      border-radius:var(--pnl-card-rad)!important;
      box-shadow:var(--pnl-card-sh)!important;
    }

    /* ---------- Заголовки секций ---------- */
    ${HOST} .sidebar-title,
    ${HOST} .approved-split-title,
    ${HOST} .approved-export-title,
    ${HOST} .approved-split-concept-section-title,
    ${HOST} .aipc-title,
    ${HOST} .split-hotkeys-title{
      color:var(--pnl-title-c)!important;
      letter-spacing:var(--pnl-title-ls)!important;
      border-bottom:1px solid var(--pnl-title-brd)!important;
    }
    body[data-btn-theme="noir"] :is(.left-panel, .approved-dock-card, .aipc-panel) :is(.sidebar-title, .aipc-title, .approved-split-title){
      border-bottom:none!important;
      border-left:2px solid var(--pnl-accent)!important;
      padding-left:8px!important;
    }

    /* ---------- Поля: селекты, инпуты, textarea, color, range ---------- */
    ${HOST} select,
    ${HOST} input,
    ${HOST} textarea{
      background:var(--pnl-field-bg)!important;
      border:1px solid var(--pnl-field-brd)!important;
      border-radius:var(--pnl-field-rad)!important;
      color:var(--pnl-field-c)!important;
    }
    ${HOST} select option{ background:#15181f; color:#e8ebf1; }
    body[data-btn-theme="noir"] ${HOST} select option{ background:#0b0e13; color:#e8ebf1; }
    ${HOST} select:focus,
    ${HOST} input:focus,
    ${HOST} textarea:focus{ border-color:var(--pnl-accent)!important; outline:none!important; }
    ${HOST} input[type="color"]{
      background:var(--pnl-sub-bg)!important;
      border:1px solid var(--pnl-sub-brd)!important;
      border-radius:6px!important; padding:2px!important;
    }
    ${HOST} input[type="range"]{ accent-color:var(--pnl-accent)!important; }

    /* ---------- Подписи и заметки ---------- */
    ${HOST} :is(.mini-help, .selection-note, .json-meta, .hotkey-label, .pp-label, .pp-title,
      .tm-stats-label, .aipc-meta, .aipc-comment-label, .aipc-comment, .aipc-empty, .pp-empty-state,
      .tm-empty, .approved-export-missing, .tlib-detail-line, .tlib-statusline, .tlib-folder-path,
      .editor-sub, .approved-split-subtitle){
      color:var(--pnl-note-c)!important;
    }
    ${HOST} :is(.tm-stats-value, .aipc-id, .aipc-item-index, .pp-index){ color:var(--pnl-field-c)!important; }
    ${HOST} :is(.tm-badge, .tech-meta-badge){
      color:var(--pnl-note-c)!important;
      background:var(--pnl-sub-bg)!important;
      border:1px solid var(--pnl-sub-brd)!important;
    }

    /* ---------- Вложенные боксы: Memory, Radius, секции, summary ---------- */
    ${HOST} :is(.approved-inspector-empty, .memory-grid, .range-number-row, .loadbar,
      .approved-split-concept-section, .tlib-summary, .tlib-details, .aipc-thumb){
      background:var(--pnl-sub-bg)!important;
      border:1px solid var(--pnl-sub-brd)!important;
      border-radius:var(--pnl-sub-rad)!important;
    }
    ${HOST} .loadbar{ border:1px solid var(--pnl-sub-brd)!important; }

    /* ---------- Списки и строки: Pages Manager, TM, Collector ---------- */
    ${HOST} :is(.pp-item, .tm-item, .aipc-item, .tlib-lib){
      background:var(--pnl-list-bg)!important;
      border:1px solid var(--pnl-list-brd)!important;
      border-radius:var(--pnl-list-rad)!important;
    }
    ${HOST} :is(.pp-item, .tm-item, .aipc-item):hover{ border-color:var(--pnl-accent)!important; }
    /* Pages Manager: каждая страница — карточка с рамкой,
       внутри превью + подпись (логика старой системы) */
    ${HOST} .pp-item{
      display:flex!important; align-items:center!important; gap:10px!important;
      padding:8px!important;
    }
    ${HOST} .pp-item .pp-label,
    ${HOST} .pp-item .pp-title{ color:var(--pnl-field-c)!important; font-size:11px!important; }

    /* ---------- Разделители ---------- */
    ${HOST} :is(.aipc-head, .split-hotkeys-head){ border-bottom-color:var(--pnl-line)!important; }

    /* ---------- Чипы и пилюли ---------- */
    ${HOST} :is(.tm-chip, .mini-pill){
      background:var(--pnl-chip-bg)!important;
      border:1px solid var(--pnl-chip-brd)!important;
      color:var(--pnl-chip-c)!important;
      border-radius:999px!important;
    }
    ${HOST} .tm-chip.is-active{
      background:var(--pnl-chip-on-bg)!important;
      border-color:var(--pnl-chip-on-bg)!important;
      color:var(--pnl-chip-on-c)!important;
    }

    /* ---------- Кнопки кастомных словарей ---------- */
    ${HOST} :is(.aipc-btn, .aipc-icon-btn, .aipc-remove, .hotkey-capture, .hotkey-clear,
      .pp-multi-btn, .tlib-reload-btn, .split-hotkeys-launch){
      background:var(--pnl-kbd-bg)!important;
      border:1px solid var(--pnl-kbd-brd)!important;
      border-radius:var(--pnl-kbd-rad)!important;
      color:var(--pnl-kbd-c)!important;
    }
    ${HOST} :is(.aipc-btn, .aipc-icon-btn, .hotkey-capture, .hotkey-clear):hover{
      background:var(--pnl-kbd-hover)!important;
    }
    ${HOST} .hotkey-capture.capturing{
      background:var(--pnl-accent)!important;
      border-color:var(--pnl-accent)!important;
      color:#0e1116!important;
    }
    ${HOST} .aipc-btn.danger{ border-color:#a85959!important; color:#ff9c9c!important; }

    /* ---------- Гибкая перестройка сеток (flex-этап) ---------- */
    ${HOST} :is(.stack-actions, .tool-grid){
      grid-template-columns:repeat(auto-fill, minmax(var(--pnl-mincol), 1fr))!important;
      gap:var(--pnl-gap)!important;
    }
    ${HOST} .stack-actions.cols-1{ grid-template-columns:1fr!important; }
    ${HOST} :is(.align-pills, .gap-presets){
      grid-template-columns:repeat(auto-fill, minmax(64px, 1fr))!important;
    }
    /* узкая панель: компакт и одна колонка */
    @container pnl (max-width: 250px){
      ${HOST} :is(.btn, .small-btn, .aipc-btn, .hotkey-capture){
        padding-top:6px!important; padding-bottom:6px!important; font-size:11.5px!important;
      }
      ${HOST} .stack-actions:not(.cols-1),
      ${HOST} .tool-grid{ grid-template-columns:1fr!important; }
      ${HOST} .sidebar-card{ padding:12px!important; }
    }

    /* ---------- Ресайз полосы: без синей подсветки ---------- */
    .approved-split-outer-resize-handle:hover::before,
    body.approved-split-panel-is-resizing .approved-split-outer-resize-handle::before{
      border-color:rgba(205,214,225,.4)!important;
      box-shadow:0 8px 16px rgba(0,0,0,.26)!important;
    }
  `;

  function injectThemesStyle(){
    if (document.getElementById(THEMES_STYLE_ID)) return;
    const el = document.createElement("style");
    el.id = THEMES_STYLE_ID;
    el.textContent = THEMES_CSS + PANEL_SYSTEMS_CSS;
    document.head.appendChild(el);
  }

  function applyButtonTheme(theme){
    const aliased = THEME_ALIASES[theme] || theme;
    const safe = SAFE_THEMES.includes(aliased) ? aliased : "studio";
    document.body.dataset.btnTheme = safe;
    try { window.localStorage.setItem(BUTTON_THEME_KEY, safe); } catch (e) {}
    return safe;
  }
  function currentButtonTheme(){
    return document.body.dataset.btnTheme || "studio";
  }

  /* мост от Shell: живое переключение без перезагрузки */
  window.addEventListener("message", event => {
    if (event.source !== window.parent) return;
    const data = event.data;
    if (!data || data.type !== "SHELL_BUTTON_THEME") return;
    applyButtonTheme(data.theme);
  });

  /* старт: тема из localStorage (Shell применяет свою часть сам) */
  try { applyButtonTheme(window.localStorage.getItem(BUTTON_THEME_KEY) || "studio"); } catch (e) { applyButtonTheme("studio"); }
  injectThemesStyle();

  /* ---------- публичный API ---------- */
  window.__panelUiV1TogglePopup = togglePopup;
  window.PanelUI = {
    /* дизайн-системы */
    getTheme: currentButtonTheme,
    setTheme: applyButtonTheme,
    themes: SAFE_THEMES.slice(),
    /* поведение панели */
    fit: fitPanel,
    setAutoFit,
    isAutoFit(){ return !!st.autoFit; },
    togglePopup, openPopup, closePopup,
    getState(){ return Object.assign({},st); },
    setWidth(px){ st.w = px == null ? null : Math.min(Math.max(Number(px)||260,260),Math.max(280,(window.innerWidth||1280)*.6)); if(st.w)applyWidth();else clearWidth(); if(st.autoFit)fitPanel(); writeState(); syncHandles(); notifyShell(); },
    setScale(v){ st.scale = Math.min(1.6,Math.max(.5,Number(v)||1)); applyScale(); if(st.autoFit)fitPanel(); writeState(); syncHandles(); notifyShell(); },
    setOpacity(v){ const n=Number(v); st.opacity=Number.isFinite(n)?Math.min(1,Math.max(.15,n)):1; applyOpacity(); writeState(); syncPopupControls(); notifyShell(); },
    reset(){
      const keepAutoFit=!!st.autoFit;
      st = { w: null, scale: 1, opacity: 1, autoFit: keepAutoFit };
      clearWidth();
      panel.style.transform = "";
      panel.style.opacity = "";
      if(st.autoFit)fitPanel();else clearFit();
      writeState();
      syncPopupControls();
      syncHandles();
      notifyShell();
    }
  };
  window.addEventListener("message", event => {
    if (event.source !== window.parent || !event.data || event.data.type !== "PANEL_UI_COMMAND") return;
    const {action,value} = event.data;
    if (action === "getState") { notifyShell(); return; }
    if (action === "setOpacity") window.PanelUI.setOpacity(Number(value));
    else if (action === "setScale") window.PanelUI.setScale(Number(value));
    else if (action === "setAutoFit") window.PanelUI.setAutoFit(!!value);
    else if (action === "reset") window.PanelUI.reset();
  });
  window.__panelUiV1TestHooks = {
    getState(){ return Object.assign({}, st); },
    syncHandles,
    setWidth(px){ st.w = px == null ? null : Number(px); if(st.w)applyWidth();else clearWidth(); writeState(); syncHandles(); notifyShell(); },
    setScale(v){ st.scale = Math.min(1.6,Math.max(.5,Number(v)||1)); applyScale(); writeState(); syncHandles(); notifyShell(); },
    setOpacity(v){ const n=Number(v); st.opacity=Number.isFinite(n)?Math.min(1,Math.max(.15,n)):1; applyOpacity(); writeState(); notifyShell(); },
    togglePopup, isPopupOpen, openPopup, closePopup,
    fit: fitPanel,
    setAutoFit,
    isAutoFit(){ return !!st.autoFit; }
  };
})();

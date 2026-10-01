/*
  ============================================================
  TEMPLATE LIBRARY PANEL V1 (TEMPLATE_LIBRARIES_V1)
  ============================================================
  Отдельный UI-модуль панели управления внешними библиотеками
  шаблонов (папка Templates/, Reload, Library ON/OFF, ошибки).

  ГРАНИЦЫ МОДУЛЯ (важно сохранять):
    - здесь ТОЛЬКО UI: DOM, стили панели, обработчики кнопок,
      форматирование состояний;
    - вся бизнес-логика (сканирование папки, парсинг библиотек,
      дубликаты ID, реестр, фабрика страниц, favorites) живёт
      в presentation.html (TemplateLibrarySystem / TemplateRegistry /
      TemplateManager) и доступна панели через небольшой
      публичный API: window.TemplateLibraryAPI;
    - этот файл можно менять/перерисовывать независимо от ядра.

  Публичный интерфейс модуля:
    TemplateLibraryPanel.mount()
    TemplateLibraryPanel.render()
    TemplateLibraryPanel.refresh()
    TemplateLibraryPanel.destroy()
*/
(function TemplateLibraryPanel(){
  "use strict";

  /* PDF-экспорт грузит presentation.html вторым окном — панель там не нужна */
  if (window.__IS_PDF_EXPORT__) return;

  const PANEL_STYLE_ID = "templateLibraryPanelStyle";
  const MOUNT_ID = "templateLibraryCardMount";
  const CARD_ID = "templateLibraryCard";

  let state = {
    mounted: false,
    bound: false,
    unsubscribe: null,
    expanded: new Set(),     // libraryId → раскрытые детали
    statusMessage: null,     // { kind: "ok"|"error"|"info", text }
    busy: false
  };

  /* ---------- локальные стили панели (style injection) ---------- */
  function injectStyles(){
    if (document.getElementById(PANEL_STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = PANEL_STYLE_ID;
    style.textContent = `
      #${CARD_ID}{ margin-top:8px; }
      .tlib-folder-row{
        display:flex; gap:4px; align-items:stretch; margin:6px 0 4px;
      }
      .tlib-folder-row .btn{ flex:1 1 auto; min-width:0; }
      .tlib-reload-btn{ flex:0 0 34px !important; }
      .tlib-folder-path{
        font-size:10.5px; color:#8b93a1; word-break:break-all;
        margin-bottom:8px; line-height:1.4;
      }
      .tlib-folder-path.is-missing{ color:#e0a34a; }
      .tlib-summary{
        display:flex; flex-wrap:wrap; gap:4px 10px;
        background:#20232a; border:1px solid #3a3a3a; border-radius:6px;
        padding:6px 9px; margin-bottom:8px; font-size:10.5px; color:#8b93a1;
      }
      .tlib-summary b{ color:#f3f5f7; font-variant-numeric:tabular-nums; }
      .tlib-summary .has-errors b{ color:#e0a34a; }
      .tlib-list{
        display:flex; flex-direction:column; gap:6px;
        max-height:300px; overflow:auto; margin-bottom:8px; padding-right:2px;
      }
      .tlib-lib{
        background:#1d2026; border:1px solid #3a3a3a; border-radius:6px;
        padding:7px 9px;
      }
      .tlib-lib.is-error{ border-color:#7a4a3a; }
      .tlib-lib.is-off{ opacity:0.62; }
      .tlib-lib-head{
        display:flex; align-items:center; gap:6px;
      }
      .tlib-lib-main{ min-width:0; flex:1 1 auto; cursor:default; }
      .tlib-lib-name{
        font-size:12px; font-weight:700; color:#f3f5f7;
        white-space:nowrap; overflow:hidden; text-overflow:ellipsis;
      }
      .tlib-lib-meta{
        font-size:10.5px; color:#8b93a1; margin-top:2px;
        white-space:nowrap; overflow:hidden; text-overflow:ellipsis;
      }
      .tlib-lib-side{ display:flex; align-items:center; gap:6px; flex:0 0 auto; }
      .tlib-status{ font-size:12px; line-height:1; cursor:default; }
      .tlib-status.is-warn{ cursor:pointer; }
      .tlib-onoff{
        background:#20232a; border:1px solid #3a3a3a; border-radius:6px;
        color:#cbd0d8; font-size:10.5px; font-weight:700;
        padding:3px 10px; cursor:pointer; min-width:44px;
        transition:background .15s, border-color .15s, color .15s;
      }
      .tlib-onoff.is-on{ background:rgba(74,158,255,.16); border-color:rgba(74,158,255,.5); color:#4a9eff; }
      .tlib-onoff:hover{ background:#2c303b; }
      .tlib-details{
        margin-top:7px; border-top:1px solid #3a3a3a; padding-top:6px;
        font-size:10.5px; color:#c6ccd6; line-height:1.5;
      }
      .tlib-details .tlib-detail-title{
        color:#e0a34a; font-weight:700; margin:4px 0 2px;
      }
      .tlib-details .tlib-detail-line{ color:#aab2bf; }
      .tlib-statusline{
        font-size:10.5px; margin-top:6px; line-height:1.4; min-height:14px;
      }
      .tlib-statusline.ok{ color:#6fbf73; }
      .tlib-statusline.error{ color:#e08a7a; }
      .tlib-statusline.info{ color:#8b93a1; }
      .tlib-actions{ display:flex; gap:6px; }
      .tlib-actions .btn{ flex:1 1 0; min-width:0; }
    `;
    document.head.appendChild(style);
  }

  /* ---------- helpers ---------- */
  function api(){
    return window.TemplateLibraryAPI || null;
  }

  function el(tag, className, text){
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = text;
    return node;
  }

  function compactPath(folderPath){
    if (!folderPath) return "";
    const parts = String(folderPath).split(/[\\/]/).filter(Boolean);
    if (parts.length <= 3) return folderPath;
    return parts[0] + "/…/" + parts.slice(-2).join("/");
  }

  function setStatus(kind, text){
    state.statusMessage = { kind, text };
    renderStatusLine();
  }

  /* ---------- DOM construction ---------- */
  function buildCard(){
    const mount = document.getElementById(MOUNT_ID);
    if (!mount) return null;

    const card = el("div", "sidebar-card");
    card.id = CARD_ID;

    const title = el("h3", "sidebar-title", "Templates");

    const folderRow = el("div", "tlib-folder-row");
    const selectBtn = el("button", "btn", "Select Folder");
    selectBtn.type = "button";
    selectBtn.id = "tlibSelectFolderBtn";
    const reloadBtn = el("button", "btn tlib-reload-btn", "↻");
    reloadBtn.type = "button";
    reloadBtn.id = "tlibReloadBtn";
    reloadBtn.title = "Reload: пересканировать папку библиотек";
    folderRow.appendChild(selectBtn);
    folderRow.appendChild(reloadBtn);

    const folderPath = el("div", "tlib-folder-path");
    folderPath.id = "tlibFolderPath";

    const summary = el("div", "tlib-summary");
    summary.id = "tlibSummary";

    const list = el("div", "tlib-list");
    list.id = "tlibList";

    const statusLine = el("div", "tlib-statusline info");
    statusLine.id = "tlibStatusLine";

    const actions = el("div", "tlib-actions");
    const logBtn = el("button", "btn", "Download Error Log");
    logBtn.type = "button";
    logBtn.id = "tlibErrorLogBtn";
    actions.appendChild(logBtn);

    card.appendChild(title);
    card.appendChild(folderRow);
    card.appendChild(folderPath);
    card.appendChild(summary);
    card.appendChild(list);
    card.appendChild(statusLine);
    card.appendChild(actions);

    mount.appendChild(card);
    return card;
  }

  function renderFolder(){
    const host = document.getElementById("tlibFolderPath");
    if (!host) return;
    const bridge = api();
    if (!bridge || !bridge.isAvailable()) {
      host.textContent = "Сканирование папки доступно только в Electron.";
      host.classList.add("is-missing");
      return;
    }
    const folder = bridge.getSelectedFolder();
    if (folder) {
      host.textContent = folder;
      host.classList.remove("is-missing");
    } else {
      host.textContent = "Папка библиотек не выбрана. Нажмите Select Folder и укажите папку Templates.";
      host.classList.add("is-missing");
    }
  }

  function renderSummary(){
    const host = document.getElementById("tlibSummary");
    if (!host) return;
    const bridge = api();
    host.textContent = "";
    if (!bridge) return;
    const s = bridge.getSummary();
    const items = [
      ["Libraries", s.libraries],
      ["Templates", s.templates],
      ["Active", s.active],
      ["Errors", s.errors],
      ["Conflicts", s.conflicts]
    ];
    items.forEach(([label, value]) => {
      const cell = el("span", (label === "Errors" && value > 0) || (label === "Conflicts" && value > 0) ? "has-errors" : "");
      cell.appendChild(el("span", null, label + ": "));
      cell.appendChild(el("b", null, String(value)));
      host.appendChild(cell);
    });
  }

  function renderLibraryItem(lib){
    const item = el("div", "tlib-lib");
    if (lib.status === "error") item.classList.add("is-error");
    if (!lib.enabled && lib.status !== "error") item.classList.add("is-off");

    const head = el("div", "tlib-lib-head");

    const main = el("div", "tlib-lib-main");
    main.appendChild(el("div", "tlib-lib-name", lib.status === "error" ? (lib.file || lib.libraryId) : lib.name));
    const metaBits = [];
    if (lib.status === "error") {
      metaBits.push("библиотека не загружена");
    } else {
      metaBits.push(lib.templateCount + " templates");
      if (lib.categoryCount) metaBits.push(lib.categoryCount + " cat.");
      if (lib.styleCount) metaBits.push(lib.styleCount + " styles");
      if (lib.version) metaBits.push("v" + lib.version);
      if (lib.status === "new") metaBits.push("новая");
      if (lib.status === "changed") metaBits.push("изменена");
    }
    main.appendChild(el("div", "tlib-lib-meta", metaBits.join(" · ")));
    head.appendChild(main);

    const side = el("div", "tlib-lib-side");

    const problemCount = lib.problemCount || 0;
    const indicator = el("span", "tlib-status" + (problemCount ? " is-warn" : ""), problemCount ? "⚠" + problemCount : "✓");
    indicator.title = problemCount ? "Показать проблемы библиотеки" : "Проблем нет";
    if (problemCount) {
      indicator.addEventListener("click", () => {
        if (state.expanded.has(lib.libraryId)) state.expanded.delete(lib.libraryId);
        else state.expanded.add(lib.libraryId);
        render();
      });
    }
    side.appendChild(indicator);

    if (lib.status !== "error") {
      const onoff = el("button", "tlib-onoff" + (lib.enabled ? " is-on" : ""), lib.enabled ? "ON" : "OFF");
      onoff.type = "button";
      onoff.title = (lib.enabled ? "Выключить" : "Включить") + " библиотеку целиком";
      onoff.addEventListener("click", () => {
        const bridge = api();
        if (!bridge) return;
        bridge.setLibraryEnabled(lib.libraryId, !lib.enabled);
        setStatus("ok", lib.name + ": " + (!lib.enabled ? "ON" : "OFF"));
      });
      side.appendChild(onoff);
    }

    head.appendChild(side);
    item.appendChild(head);

    if (problemCount && state.expanded.has(lib.libraryId)) {
      const details = el("div", "tlib-details");
      (lib.errors || []).forEach(problem => {
        details.appendChild(el("div", "tlib-detail-title", "Error: " + (problem.code || "UNKNOWN")));
        details.appendChild(el("div", "tlib-detail-line", problem.message || ""));
      });
      (lib.conflicts || []).forEach(conflict => {
        details.appendChild(el("div", "tlib-detail-title", "Duplicate template ID: " + conflict.templateId));
        details.appendChild(el("div", "tlib-detail-line",
          "конфликт: \"" + (conflict.skippedLibrary || "?") + "\" ↔ \"" + (conflict.keptByLabel || conflict.keptBy || "?") +
          "\" — шаблон " + (conflict.resolution === "skipped" ? "пропущен (уже занят)" : "оставлен здесь")));
      });
      (lib.warnings || []).forEach(warning => {
        details.appendChild(el("div", "tlib-detail-title", "Warning: " + (warning.code || "UNKNOWN")));
        details.appendChild(el("div", "tlib-detail-line", warning.message || ""));
      });
      if (!details.childNodes.length) {
        details.appendChild(el("div", "tlib-detail-line", "Нет деталей."));
      }
      item.appendChild(details);
    }

    return item;
  }

  function renderList(){
    const host = document.getElementById("tlibList");
    if (!host) return;
    host.textContent = "";
    const bridge = api();
    if (!bridge) return;
    const libs = bridge.listLibraries();
    if (!libs.length) {
      host.appendChild(el("div", "tlib-detail-line",
        "Библиотеки не загружены. Выберите папку и нажмите ↻ Reload."));
      return;
    }
    libs.forEach(lib => host.appendChild(renderLibraryItem(lib)));
  }

  function renderStatusLine(){
    const host = document.getElementById("tlibStatusLine");
    if (!host) return;
    host.textContent = state.statusMessage ? state.statusMessage.text : "";
    host.className = "tlib-statusline " + (state.statusMessage ? state.statusMessage.kind : "info");
  }

  function render(){
    renderFolder();
    renderSummary();
    renderList();
    renderStatusLine();
  }

  /* ---------- handlers ---------- */
  function bindOnce(){
    if (state.bound) return;
    state.bound = true;

    const selectBtn = document.getElementById("tlibSelectFolderBtn");
    if (selectBtn) {
      selectBtn.addEventListener("click", async () => {
        const bridge = api();
        if (!bridge) return;
        setStatus("info", "Открываю диалог выбора папки…");
        try {
          const result = await bridge.selectFolder();
          if (result && result.ok) {
            setStatus("ok", "Папка выбрана: " + result.path);
            render();
            const reloadResult = await bridge.reload();
            if (reloadResult && reloadResult.ok) {
              setStatus("ok", describeReload(reloadResult));
            } else if (reloadResult && reloadResult.error) {
              setStatus("error", reloadResult.error);
            }
            render();
          } else if (result && result.canceled) {
            setStatus("info", "Выбор папки отменён.");
          } else {
            setStatus("error", (result && result.error) || "Не удалось выбрать папку.");
          }
        } catch (error) {
          setStatus("error", String(error && error.message || error));
        }
      });
    }

    const reloadBtn = document.getElementById("tlibReloadBtn");
    if (reloadBtn) {
      reloadBtn.addEventListener("click", async () => {
        const bridge = api();
        if (!bridge || state.busy) return;
        state.busy = true;
        setStatus("info", "Сканирование папки…");
        try {
          const result = await bridge.reload();
          if (result && result.ok) {
            setStatus("ok", describeReload(result));
          } else {
            setStatus("error", (result && result.error) || "Reload не удался.");
          }
        } catch (error) {
          setStatus("error", String(error && error.message || error));
        }
        state.busy = false;
        render();
      });
    }

    const logBtn = document.getElementById("tlibErrorLogBtn");
    if (logBtn) {
      logBtn.addEventListener("click", () => {
        const bridge = api();
        if (!bridge) return;
        try {
          const log = bridge.buildErrorLog();
          const stamp = new Date().toISOString().slice(0, 10);
          const blob = new Blob([JSON.stringify(log, null, 2)], { type: "application/json" });
          const a = document.createElement("a");
          a.href = URL.createObjectURL(blob);
          a.download = "template-library-errors-" + stamp + ".json";
          document.body.appendChild(a);
          a.click();
          a.remove();
          setTimeout(() => URL.revokeObjectURL(a.href), 10000);
          setStatus("ok", "Error Log скачан.");
        } catch (error) {
          setStatus("error", "Не удалось сформировать Error Log: " + String(error && error.message || error));
        }
      });
    }

    const bridge = api();
    if (bridge && typeof bridge.onChanged === "function") {
      state.unsubscribe = bridge.onChanged(() => render());
    }
  }

  function describeReload(result){
    const bits = [];
    bits.push("библиотек: " + result.libraries);
    if (result.activeTemplates != null) bits.push("активных шаблонов: " + result.activeTemplates);
    if (result.changed) bits.push("изменено: " + result.changed);
    if (result.removed) bits.push("удалено: " + result.removed);
    if (result.failed) bits.push("с ошибками: " + result.failed);
    if (result.conflicts) bits.push("конфликтов ID: " + result.conflicts);
    if (result.errors) bits.push("ошибок: " + result.errors);
    return "Reload выполнен (" + bits.join(", ") + ")";
  }

  /* ---------- public API ---------- */
  function mount(){
    if (state.mounted) return;
    if (!document.getElementById(MOUNT_ID)) return;
    injectStyles();
    const card = buildCard();
    if (!card) return;
    state.mounted = true;
    bindOnce();
    render();
  }

  function refresh(){
    render();
  }

  function destroy(){
    if (state.unsubscribe) { state.unsubscribe(); state.unsubscribe = null; }
    const card = document.getElementById(CARD_ID);
    if (card) card.remove();
    const style = document.getElementById(PANEL_STYLE_ID);
    if (style) style.remove();
    state.mounted = false;
    state.bound = false;
    state.expanded.clear();
  }

  window.TemplateLibraryPanel = { mount, render, refresh, destroy };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", mount, { once: true });
  } else {
    mount();
  }
})();

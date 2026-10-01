const { app, BrowserWindow, ipcMain, dialog, protocol, Menu } = require('electron');
const path = require('path');
const fs = require('fs');

let win;

// Директория для локального сохранения картинок внутри userData проекта
const imagesDir = path.join(app.getPath('userData'), 'project_images');
if (!fs.existsSync(imagesDir)) {
  fs.mkdirSync(imagesDir, { recursive: true });
}

function registerLocalResourceProtocol() {
  protocol.registerFileProtocol('media', (request, callback) => {
    const url = request.url.replace(/^media:\/\//, '');
    try {
      return callback(decodeURIComponent(url));
    } catch (error) {
      console.error('Ошибка чтения файла через протокол media:', error);
    }
  });
}

function createWindow() {
  win = new BrowserWindow({
    width: 1600,
    height: 950,
    webPreferences: {
      nodeIntegration: true,
      nodeIntegrationInSubFrames: true,
      contextIsolation: false,
      webSecurity: false
    }
  });
  win.loadFile(path.join(__dirname, 'shell.html'));

  // Предотвращаем стандартные глобальные перехваты Electron (Ctrl+M - сворачивание, Ctrl+F - поиск)
  // Это оставляет за страницей внутри BrowserWindow право обрабатывать эти сочетания самостоятельно.
  win.webContents.on('before-input-event', (event, input) => {
    if (input.type === 'keyDown') {
      const isControl = input.control || input.meta;
      const key = input.key.toLowerCase();
      if (isControl && (key === 'm' || key === 'f')) {
        event.preventDefault(); 
      }
    }
  });
}

// IPC-обработчик сохранения Base64 изображений на жесткий диск
ipcMain.handle('save-image-to-disk', async (event, base64Data) => {
  try {
    const matches = base64Data.match(/^data:image\/([A-Za-z+]+);base64,(.+)$/);
    if (!matches) {
      throw new Error('Некорректная строка Base64');
    }
    const ext = matches[1] === 'jpeg' ? 'jpg' : matches[1];
    const data = matches[2];
    const buffer = Buffer.from(data, 'base64');
    
    // Создаем уникальное имя файла
    const uniqueFilename = `${Date.now()}_${Math.random().toString(36).substring(2, 9)}.${ext}`;
    const fullPath = path.join(imagesDir, uniqueFilename);
    
    fs.writeFileSync(fullPath, buffer);
    
    // Возвращаем локальный путь через зарегистрированный протокол media://
    return `media://${fullPath}`;
  } catch (err) {
    console.error('Ошибка записи картинки на диск:', err);
    return null;
  }
});

ipcMain.handle('rescan-image-pool', async (event, rootPath) => {
  // Набор форматов, которые Chromium/Electron обычно может отобразить.
  const imageExtensions = new Set([
    '.jpg', '.jpeg', '.png', '.gif',
    '.webp', '.bmp', '.avif', '.svg', '.ico'
  ]);

  function walkDirectory(dirPath, rootDir, result) {
    let entries = [];

    try {
      entries = fs.readdirSync(dirPath, { withFileTypes: true });
    } catch (error) {
      console.error('Ошибка чтения папки image pool:', dirPath, error);
      return;
    }

    entries.forEach(entry => {
      const fullPath = path.join(dirPath, entry.name);

      if (entry.isDirectory()) {
        walkDirectory(fullPath, rootDir, result);
        return;
      }

      if (!entry.isFile()) return;

      const ext = path.extname(entry.name).toLowerCase();
      if (!imageExtensions.has(ext)) return;

      try {
        const stat = fs.statSync(fullPath);
        const relativeInsideRoot = path
          .relative(rootDir, fullPath)
          .split(path.sep)
          .join('/');

        // Формат повторяет webkitRelativePath:
        // RootFolder/22/01/image.jpg
        const rootFolderName = path.basename(rootDir);
        const relativePath = [rootFolderName, relativeInsideRoot]
          .filter(Boolean)
          .join('/');

        result.push({
          fullPath,
          name: entry.name,
          relativePath,
          lastModified: stat.mtimeMs || 0,
          size: stat.size || 0
        });
      } catch (error) {
        console.error('Ошибка чтения файла image pool:', fullPath, error);
      }
    });
  }

  try {
    const safeRootPath = String(rootPath || '').trim();

    if (!safeRootPath || !fs.existsSync(safeRootPath)) {
      return {
        ok: false,
        error: 'Корневая папка изображений больше не найдена.'
      };
    }

    const rootStat = fs.statSync(safeRootPath);

    if (!rootStat.isDirectory()) {
      return {
        ok: false,
        error: 'Сохранённый путь image pool не является папкой.'
      };
    }

    const files = [];
    walkDirectory(safeRootPath, safeRootPath, files);

    files.sort((a, b) => a.relativePath.localeCompare(
      b.relativePath,
      undefined,
      { numeric: true, sensitivity: 'base' }
    ));

    return {
      ok: true,
      files
    };
  } catch (error) {
    console.error('Ошибка пересчёта image pool:', error);

    return {
      ok: false,
      error: error.message || 'Не удалось пересчитать папку изображений.'
    };
  }
});

ipcMain.on('save-to-pdf', async (event, showTech, fullState) => {
  console.log('=== PDF EXPORT START ===');
  console.log('showTech:', showTech);
  console.log('fullState получен:', !!fullState, 'длина:', fullState ? fullState.length : 0);

  let filePath;
  try {
    const res = await dialog.showSaveDialog(win, {
      title: 'Сохранить презентацию в PDF',
      defaultPath: showTech ? 'presentation-tech.pdf' : 'presentation.pdf',
      filters: [{ name: 'PDF Files', extensions: ['pdf'] }]
    });
    filePath = res.filePath;
  } catch (e) {
    console.error('dialog error:', e);
    event.reply('pdf-save-finished', false, 'Ошибка диалога: ' + e.message);
    return;
  }

  if (!filePath) {
    event.reply('pdf-save-finished', false, 'Отменено пользователем');
    return;
  }

  const pdfOptions = {
    landscape: true,
    pageSize: 'A4',
    printBackground: true,
    margins: { top: 0, bottom: 0, left: 0, right: 0 }
  };

  const printWin = new BrowserWindow({
    show: true,
    x: -10000,
    y: -10000,
    width: 1600,
    height: 950,
    skipTaskbar: true,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      webSecurity: false,
      backgroundThrottling: false
    }
  });

  printWin.webContents.on('console-message', (e, level, message) => {
    console.log('[printWin]:', message);
  });

  try {
    console.log('Загружаю presentation.html...');
    await printWin.loadFile(path.join(__dirname, 'presentation.html'));
    console.log('presentation.html загружен');

    if (fullState) {
      await printWin.webContents.executeJavaScript(`
        (function(){
          try {
            window.__IS_PDF_EXPORT__ = true;
            localStorage.setItem("cinematic_portfolio_editor_state_v4", ${JSON.stringify(fullState)});
            console.log("localStorage записан, длина: " + localStorage.getItem("cinematic_portfolio_editor_state_v4").length);
          } catch(e){ console.error("LS ERROR: " + e.message); }
          return true;
        })();
      `);

      console.log('Перезагружаю окно...');
      const reloadDone = new Promise(r => printWin.webContents.once('did-finish-load', r));
      await printWin.webContents.reload();
      await reloadDone;
      console.log('Окно перезагружено');
    }

    if (showTech) {
      await printWin.webContents.executeJavaScript(`
        (function(){ try { document.body.classList.add('tech-info-printing'); } catch(e){} return true; })();
      `);
    }

    await printWin.webContents.executeJavaScript(`
      (async function(){
        const imgs = Array.from(document.images);
        imgs.forEach(img => {
          try {
            img.loading = "eager";
            if (!img.complete || img.naturalWidth === 0) {
              const s = img.src;
              img.src = "";
              img.src = s;
            }
          } catch(e){}
        });
        await Promise.all(imgs.map(img => {
          if (img.complete && img.naturalWidth > 0) return Promise.resolve();
          return new Promise(res => {
            img.addEventListener('load', res, { once:true });
            img.addEventListener('error', res, { once:true });
          });
        }));
        await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
        return document.images.length;
      })();
    `);

    // =========================================================
    // DOWNSCALE ИЗОБРАЖЕНИЙ ПОД ПЕЧАТЬ (200 DPI)
    // Работает ТОЛЬКО внутри printWin (presentation.html).
    // Экспорт сайта это НИКАК не затрагивает.
    // =========================================================
    const downscaleResult = await printWin.webContents.executeJavaScript(`
      (async function(){
        try {
          const PDF_DPI = 200;
          const PDF_JPEG_QUALITY = 0.92;
          // ширина A4 landscape при 200 DPI в пикселях
          const PDF_A4_LANDSCAPE_W_PX = Math.round(297 / 25.4 * PDF_DPI); // ≈ 2339

          // ширина одной страницы-канваса на экране (CSS px)
          const shell = document.querySelector('.page-shell') || document.querySelector('.page-canvas');
          const pageW = shell ? shell.getBoundingClientRect().width : 1123;
          const PRINT_SCALE = PDF_A4_LANDSCAPE_W_PX / (pageW || 1123); // ≈ 2.083

          function loadImg(src){
            return new Promise(resolve => {
              const im = new Image();
              im.onload = () => resolve(im);
              im.onerror = () => resolve(null);
              im.src = src;
            });
          }

          const imgs = Array.from(document.images);
          let processed = 0;
          let skipped = 0;

          for (const imgEl of imgs) {
            const originalSrc = imgEl.getAttribute("src");
            if (!originalSrc) { skipped++; continue; }
            if (originalSrc.startsWith("data:image/svg")) { skipped++; continue; }

            const rect = imgEl.getBoundingClientRect();
            const displayW = rect.width;
            const displayH = rect.height;
            if (displayW < 2 || displayH < 2) { skipped++; continue; }

            const targetW = Math.round(displayW * PRINT_SCALE);
            const targetH = Math.round(displayH * PRINT_SCALE);

            const isPng = /^data:image\\/png/i.test(originalSrc) || /\\.png(\\?|$)/i.test(originalSrc);

            const loaded = await loadImg(originalSrc);
            if (!loaded) { skipped++; continue; }

            const nw = loaded.naturalWidth || 0;
            const nh = loaded.naturalHeight || 0;
            if (!nw || !nh) { skipped++; continue; }

            // не растягиваем: если оригинал уже не больше цели — пропускаем
            if (nw <= targetW + 4) { skipped++; continue; }

            const finalW = Math.max(1, Math.min(nw, targetW));
            const finalH = Math.max(1, Math.min(nh, targetH));

            const canvas = document.createElement("canvas");
            canvas.width = finalW;
            canvas.height = finalH;
            const ctx = canvas.getContext("2d", { alpha: isPng });
            if (ctx && "imageSmoothingEnabled" in ctx) {
              ctx.imageSmoothingEnabled = true;
              ctx.imageSmoothingQuality = "high";
            }
            if (!isPng) {
              ctx.fillStyle = "#ffffff";
              ctx.fillRect(0, 0, finalW, finalH);
            }
            ctx.drawImage(loaded, 0, 0, finalW, finalH);

            const newSrc = isPng
              ? canvas.toDataURL("image/png")
              : canvas.toDataURL("image/jpeg", PDF_JPEG_QUALITY);

            if (newSrc && newSrc.length > 10) {
              imgEl.setAttribute("src", newSrc);
              processed++;
            } else {
              skipped++;
            }
          }

          // дать браузеру перерисовать
          await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
          console.log("DOWNSCALE: обработано " + processed + ", пропущено " + skipped + ", PRINT_SCALE=" + PRINT_SCALE.toFixed(3));
          return { processed: processed, skipped: skipped };
        } catch(e){
          console.error("DOWNSCALE ERROR: " + e.message);
          return { error: e.message };
        }
      })();
    `);

    console.log('=== РЕСАЙЗ КАРТИНОК ===');
    console.log(downscaleResult);
    console.log('======================');

    const diag = await printWin.webContents.executeJavaScript(`
      (function(){
        const result = {};
        result.bodyHasContent = document.body ? document.body.innerHTML.length : 0;
        result.pagesStack = document.getElementById('pagesStack') ? document.getElementById('pagesStack').children.length : 'НЕТ pagesStack';
        result.pageShells = document.querySelectorAll('.page-shell').length;
        result.imgCount = document.images.length;

        const imgInfo = [];
        Array.from(document.images).slice(0, 10).forEach((img, i) => {
          imgInfo.push({
            index: i,
            src: (img.src || '').substring(0, 50),
            complete: img.complete,
            naturalW: img.naturalWidth,
            naturalH: img.naturalHeight
          });
        });
        result.images = imgInfo;
        return result;
      })();
    `);

    console.log('=== ДИАГНОСТИКА СТРАНИЦЫ ===');
    console.log('Длина body:', diag.bodyHasContent);
    console.log('Детей в pagesStack:', diag.pagesStack);
    console.log('page-shell элементов:', diag.pageShells);
    console.log('Всего <img>:', diag.imgCount);
    console.log('Картинки (первые 10):');
    diag.images.forEach(im => {
      console.log('  [' + im.index + '] complete=' + im.complete + ' ' + im.naturalW + 'x' + im.naturalH + ' src=' + im.src);
    });
    console.log('===========================');

    const pdfData = await printWin.webContents.printToPDF(pdfOptions);
    fs.writeFileSync(filePath, pdfData);
    console.log('PDF записан:', filePath, 'размер:', pdfData.length);
    event.reply('pdf-save-finished', true, filePath);
  } catch (error) {
    console.error('PDF ERROR:', error);
    event.reply('pdf-save-finished', false, error.message);
  } finally {
    printWin.destroy();
  }
});
// IPC-обработчики для сохранения и чтения конфигурации приложения
const configPath = path.join(app.getPath('userData'), 'config.json');

ipcMain.handle('get-app-config', async () => {
  try {
    if (fs.existsSync(configPath)) {
      return JSON.parse(fs.readFileSync(configPath, 'utf8'));
    }
  } catch (e) {
    console.error('Ошибка чтения config.json:', e);
  }
  return {};
});

// =========================================================
// TEMPLATE LIBRARY IPC — ADDITIVE V1 (система внешних библиотек шаблонов)
// Новые каналы. Существующие обработчики и PDF-контракт не изменены.
//   template-library:select-folder — выбор папки Templates (dialog main-process)
//   template-library:scan-folder   — чтение папки библиотек (*.js / *.json)
// =========================================================
const TEMPLATE_LIBRARY_EXTENSIONS = new Set(['.js', '.json']);
const TEMPLATE_LIBRARY_MAX_FILE_BYTES = 5 * 1024 * 1024; // защита от случайных гигантских файлов

ipcMain.handle('template-library:select-folder', async () => {
  try {
    const res = await dialog.showOpenDialog(win, {
      title: 'Выбор папки с библиотеками шаблонов (Templates)',
      properties: ['openDirectory', 'createDirectory']
    });
    if (res.canceled || !res.filePaths || !res.filePaths.length) {
      return { ok: false, canceled: true };
    }
    return { ok: true, path: res.filePaths[0] };
  } catch (e) {
    console.error('template-library:select-folder error:', e);
    return { ok: false, error: e.message || 'dialog error' };
  }
});

ipcMain.handle('template-library:scan-folder', async (event, folderPath) => {
  const safePath = String(folderPath || '').trim();
  if (!safePath) {
    return { ok: false, error: 'Папка библиотек шаблонов не выбрана.' };
  }
  let entries = [];
  try {
    if (!fs.existsSync(safePath)) {
      return { ok: false, error: 'Папка библиотек шаблонов не найдена: ' + safePath, missing: true };
    }
    if (!fs.statSync(safePath).isDirectory()) {
      return { ok: false, error: 'Выбранный путь не является папкой: ' + safePath };
    }
    entries = fs.readdirSync(safePath, { withFileTypes: true });
  } catch (e) {
    console.error('template-library:scan-folder error:', e);
    return { ok: false, error: e.message || 'Не удалось прочитать папку библиотек.' };
  }

  const files = [];
  entries.forEach(entry => {
    try {
      if (!entry.isFile()) return;
      const ext = path.extname(entry.name).toLowerCase();
      if (!TEMPLATE_LIBRARY_EXTENSIONS.has(ext)) return;
      const fullPath = path.join(safePath, entry.name);
      const stat = fs.statSync(fullPath);
      if (stat.size > TEMPLATE_LIBRARY_MAX_FILE_BYTES) {
        files.push({
          file: entry.name,
          name: entry.name,
          mtimeMs: stat.mtimeMs || 0,
          size: stat.size,
          content: null,
          tooLarge: true
        });
        return;
      }
      files.push({
        file: entry.name,
        name: entry.name,
        mtimeMs: stat.mtimeMs || 0,
        size: stat.size,
        content: fs.readFileSync(fullPath, 'utf8')
      });
    } catch (e) {
      console.error('template-library:scan-folder file error:', entry.name, e);
      files.push({
        file: entry.name,
        name: entry.name,
        mtimeMs: 0,
        size: 0,
        content: null,
        readError: e.message || 'read error'
      });
    }
  });

  files.sort((a, b) => a.file.localeCompare(b.file, undefined, { numeric: true, sensitivity: 'base' }));

  return { ok: true, folderPath: safePath, files };
});
// END TEMPLATE LIBRARY IPC — ADDITIVE V1

ipcMain.on('save-app-config', (event, configObj) => {
  try {
    fs.writeFileSync(configPath, JSON.stringify(configObj, null, 2));
  } catch (e) {
    console.error('Ошибка записи config.json:', e);
  }
});
app.whenReady().then(() => {
  registerLocalResourceProtocol();
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
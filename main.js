const { app, BrowserWindow, ipcMain, shell, protocol, net, globalShortcut } = require('electron');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');
const { pathToFileURL } = require('url');

// Register custom scheme 'app' as standard and secure so that Fetch API can load resources
protocol.registerSchemesAsPrivileged([
  {
    scheme: 'app',
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      corsEnabled: true
    }
  }
]);

// Define execution directory matching Wails behavior
const execDir = app.isPackaged ? path.dirname(process.execPath) : __dirname;

// Paths for settings and python
const pythonDir = path.join(execDir, 'python');
const settingsPath = path.join(pythonDir, 'tenants', 'settings.json');
const pythonVenvPython = path.join(pythonDir, '.venv', 'Scripts', 'python.exe');

// Migrate settings from old location to new location if exists
const oldSettingsPath = path.join(execDir, 'settings.json');
if (fs.existsSync(oldSettingsPath) && !fs.existsSync(settingsPath)) {
  try {
    const dir = path.dirname(settingsPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.copyFileSync(oldSettingsPath, settingsPath);
    fs.unlinkSync(oldSettingsPath);
    console.log('Migrated settings.json to python/tenants/settings.json');
  } catch (err) {
    console.error('Failed to migrate settings:', err);
  }
}

let mainWindow;

// Register custom protocol to serve Next.js static files from 'frontend/out'
function registerAppProtocol() {
  protocol.handle('app', async (request) => {
    const url = new URL(request.url);
    let pathname = url.pathname;

    if (pathname === '/' || pathname === '') {
      pathname = '/index.html';
    }

    let filePath = path.join(execDir, 'frontend', 'out', pathname);

    // Append .html for extensionless routing (Next.js export)
    if (!fs.existsSync(filePath) && !path.extname(filePath)) {
      filePath += '.html';
    }

    try {
      const fileUrl = pathToFileURL(filePath).toString();
      const response = await net.fetch(fileUrl);
      const headers = new Headers(response.headers);
      headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
      headers.set('Pragma', 'no-cache');
      headers.set('Expires', '0');
      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers
      });
    } catch (err) {
      console.error(`Failed to serve: ${pathname}`, err);
      return new Response('Not Found', { status: 404 });
    }
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    title: 'Nexus-Desktop (Offline Edition)',
    backgroundColor: '#1b2636',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: false, // Disabled to expose window.go directly
      nodeIntegration: true,    // Enabled for direct ipc communication
      webviewTag: true,         // Crucial for embedding warehouse portals!
      nodeIntegrationInSubFrames: true // Enable preload script execution in subframes
    }
  });

  mainWindow.loadURL('app://./index.html');

  mainWindow.webContents.on('before-input-event', (event, input) => {
    if (input.control && input.shift && input.key.toLowerCase() === 'i') {
      mainWindow.webContents.openDevTools();
      event.preventDefault();
    }
  });

  mainWindow.webContents.on('console-message', (event, level, message, line, sourceId) => {
    console.log(`[Renderer Console] ${message} (from ${path.basename(sourceId)}:${line})`);
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url === 'about:blank' || url.startsWith('about:')) {
      return { action: 'allow' };
    }
    shell.openExternal(url);
    return { action: 'deny' };
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

let widgetWindow;

function createWidgetWindow() {
  if (widgetWindow) return;

  widgetWindow = new BrowserWindow({
    width: 480,
    height: 480,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    resizable: false,
    show: true,
    skipTaskbar: true,
    hasShadow: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: false,
      nodeIntegration: true,
      nodeIntegrationInSubFrames: true
    }
  });

  widgetWindow.webContents.session.clearCache().then(() => {
    widgetWindow.loadURL('app://./widget.html');
  });

  widgetWindow.webContents.on('before-input-event', (event, input) => {
    if (input.control && input.shift && input.key.toLowerCase() === 'i') {
      widgetWindow.webContents.openDevTools({ mode: 'detach' });
      event.preventDefault();
    }
  });

  widgetWindow.on('closed', () => {
    widgetWindow = null;
  });
}

// widget:resize is now a no-op — window size is fixed at 480px.
// The React component controls visible height via CSS. We use setIgnoreMouseEvents
// to make the transparent / invisible parts of the window click-through.
ipcMain.handle('widget:resize', async (event, height) => {
  // no-op kept for API compatibility
});

ipcMain.handle('widget:set-mouse', async (event, ignore) => {
  if (widgetWindow) {
    if (ignore) {
      widgetWindow.setIgnoreMouseEvents(true, { forward: true });
    } else {
      widgetWindow.setIgnoreMouseEvents(false);
    }
  }
});

ipcMain.handle('widget:hide', async () => {
  if (widgetWindow) {
    widgetWindow.hide();
  }
});

ipcMain.handle('widget:dev-tools', async () => {
  if (widgetWindow) {
    widgetWindow.webContents.openDevTools({ mode: 'detach' });
  }
});

ipcMain.on('widget:toggle', () => {
  if (!widgetWindow) {
    createWidgetWindow();
  }
  if (widgetWindow) {
    if (widgetWindow.isVisible()) {
      widgetWindow.hide();
    } else {
      widgetWindow.show();
      widgetWindow.focus();
    }
  }
});

ipcMain.on('widget:trigger-query', (event, data) => {
  if (mainWindow) {
    mainWindow.webContents.send('widget:trigger-query', data);
  }
});

ipcMain.on('widget:query-finished', (event, data) => {
  if (widgetWindow) {
    widgetWindow.webContents.send('widget:query-finished', data);
  }
});

// IPC Handlers matching Go App bindings
ipcMain.handle('wails:LoadSettings', async () => {
  try {
    if (fs.existsSync(settingsPath)) {
      return fs.readFileSync(settingsPath, 'utf8');
    }
    return '{}';
  } catch (err) {
    console.error('Error loading settings:', err);
    throw err;
  }
});

ipcMain.handle('wails:SaveSettings', async (event, settingsJSON) => {
  try {
    const dir = path.dirname(settingsPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(settingsPath, settingsJSON, 'utf8');
    return 'Settings saved successfully';
  } catch (err) {
    console.error('Error saving settings:', err);
    throw err;
  }
});

ipcMain.handle('wails:GetDashboardData', async (event, gln) => {
  try {
    const cachePath = path.join(pythonDir, 'tenants', gln, 'analysis_cache.json');
    if (fs.existsSync(cachePath)) {
      return fs.readFileSync(cachePath, 'utf8');
    }
    throw new Error('cache_not_found');
  } catch (err) {
    console.error('Error getting dashboard data:', err);
    throw err;
  }
});

ipcMain.handle('wails:LoadLocalJSON', async (event, gln, filename) => {
  try {
    const filePath = path.join(pythonDir, 'tenants', gln, path.basename(filename));
    if (fs.existsSync(filePath)) {
      return fs.readFileSync(filePath, 'utf8');
    }
    return '{}';
  } catch (err) {
    console.error('Error loading local JSON:', err);
    throw err;
  }
});

ipcMain.handle('wails:SaveLocalJSON', async (event, gln, filename, content) => {
  try {
    const tenantDir = path.join(pythonDir, 'tenants', gln);
    if (!fs.existsSync(tenantDir)) {
      fs.mkdirSync(tenantDir, { recursive: true });
    }
    const filePath = path.join(tenantDir, path.basename(filename));
    fs.writeFileSync(filePath, content, 'utf8');
    return 'JSON saved successfully';
  } catch (err) {
    console.error('Error saving local JSON:', err);
    throw err;
  }
});

ipcMain.handle('wails:SaveLocalBase64File', async (event, gln, filename, base64Data) => {
  try {
    const tenantDir = path.join(pythonDir, 'tenants', gln);
    if (!fs.existsSync(tenantDir)) {
      fs.mkdirSync(tenantDir, { recursive: true });
    }
    const filePath = path.join(tenantDir, path.basename(filename));
    const base64Content = base64Data.replace(/^data:.*?;base64,/, "");
    fs.writeFileSync(filePath, Buffer.from(base64Content, 'base64'));
    console.log(`[Base64 File] Saved: ${filePath}`);
    return 'File saved successfully';
  } catch (err) {
    console.error('Error saving base64 file:', err);
    throw err;
  }
});

ipcMain.handle('wails:ParseSelcukCampaigns', async (event, gln, depo = 'SELCUK') => {
  return new Promise((resolve, reject) => {
    const scriptPath = path.join(pythonDir, 'parse_selcuk_campaigns.py');
    let pythonProcess;
    if (fs.existsSync(pythonVenvPython)) {
      pythonProcess = spawn(pythonVenvPython, [scriptPath, '--gln', gln, '--depo', depo]);
    } else {
      pythonProcess = spawn('python', [scriptPath, '--gln', gln, '--depo', depo]);
    }

    let stdoutData = '';
    let stderrData = '';

    pythonProcess.stdout.on('data', (data) => {
      stdoutData += data.toString('utf8');
    });

    pythonProcess.stderr.on('data', (data) => {
      stderrData += data.toString('utf8');
    });

    pythonProcess.on('close', (code) => {
      if (code !== 0) {
        console.error(`parse_selcuk_campaigns.py failed with code ${code}. Stderr: ${stderrData}`);
        reject(new Error(stderrData || `Exit code ${code}`));
        return;
      }
      resolve(stdoutData.trim());
    });
  });
});

ipcMain.handle('wails:AppendOrderResult', async (event, gln, entry) => {
  try {
    const tenantDir = path.join(pythonDir, 'tenants', gln);
    if (!fs.existsSync(tenantDir)) {
      fs.mkdirSync(tenantDir, { recursive: true });
    }
    const filePath = path.join(tenantDir, 'as_siparisler.json');

    // Mevcut listeyi oku
    let orders = [];
    if (fs.existsSync(filePath)) {
      try {
        const raw = fs.readFileSync(filePath, 'utf8');
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) orders = parsed;
      } catch { orders = []; }
    }

    // Yeni kaydı parse et ve alanları normalize et
    const entryObj = typeof entry === 'string' ? JSON.parse(entry) : entry;
    
    // Tarihi YYYY-MM-DD formatına çevir
    if (entryObj.tarih) {
      if (entryObj.tarih.includes('T')) {
        entryObj.tarih = entryObj.tarih.split('T')[0];
      }
    } else {
      entryObj.tarih = new Date().toISOString().split('T')[0];
    }
    
    // Depo bilgisini normalize et
    if (!entryObj.depo) {
      entryObj.depo = 'AS ECZA';
    }

    // Mükerrer (duplicate) kontrolü: aynı tarih, aynı barkod, aynı depo
    const isDuplicate = orders.some(o => {
      const oDate = o.tarih && o.tarih.includes('T') ? o.tarih.split('T')[0] : o.tarih;
      const oDepo = o.depo || 'AS ECZA';
      return oDate === entryObj.tarih && o.barkod === entryObj.barkod && oDepo === entryObj.depo;
    });

    if (isDuplicate) {
      console.log(`[AS Sipariş] Mükerrer kayıt engellendi: Tarih=${entryObj.tarih}, Barkod=${entryObj.barkod}, Depo=${entryObj.depo}`);
      return 'duplicate';
    }

    orders.push(entryObj);
    fs.writeFileSync(filePath, JSON.stringify(orders, null, 2), 'utf8');
    console.log(`[AS Sipariş] Kaydedildi: ${filePath} (toplam ${orders.length} kayıt)`);
    return 'ok';
  } catch (err) {
    console.error('AppendOrderResult error:', err);
    throw err;
  }
});

ipcMain.handle('wails:OpenURLInBrowser', async (event, targetURL) => {
  shell.openExternal(targetURL);
  return true;
});

ipcMain.handle('wails:GetWebviewPreloadPath', async () => {
  return path.join(execDir, 'webview-preload.js');
});

ipcMain.handle('wails:RunCategoryAction', async (event, action, paramsJSON) => {
  return new Promise((resolve, reject) => {
    const scriptPath = path.join(pythonDir, 'manage_categories.py');
    const exePath = path.join(pythonDir, 'dist', 'manage_categories.exe');
    let pythonProcess;
    if (fs.existsSync(exePath)) {
      pythonProcess = spawn(exePath, [action, paramsJSON]);
    } else if (fs.existsSync(pythonVenvPython)) {
      pythonProcess = spawn(pythonVenvPython, [scriptPath, action, paramsJSON]);
    } else {
      pythonProcess = spawn('python', [scriptPath, action, paramsJSON]);
    }

    let stdoutData = '';
    let stderrData = '';

    pythonProcess.stdout.on('data', (data) => {
      stdoutData += data.toString('utf8');
    });

    pythonProcess.stderr.on('data', (data) => {
      stderrData += data.toString('utf8');
    });

    pythonProcess.on('close', (code) => {
      if (code !== 0) {
        console.error(`manage_categories.py failed with code ${code}. Stderr: ${stderrData}`);
        reject(new Error(stderrData || `Exit code ${code}`));
        return;
      }
      resolve(stdoutData.trim());
    });
  });
});

// IPC Handler for TriggerSyncAndAnalysis (Offline execution of Python script)
ipcMain.handle('wails:TriggerSyncAndAnalysis', async (event, gln, fullSync) => {
  return new Promise((resolve, reject) => {
    console.log(`Starting sync & analysis for GLN: ${gln}, fullSync: ${fullSync}`);
    
    mainWindow.webContents.send('wails-event', 'sync:status', 'connecting');

    const scriptPath = path.join(pythonDir, 'sync_and_run.py');
    const exePath = path.join(pythonDir, 'dist', 'sync_and_run.exe');
    
    let pythonProcess;
    if (fs.existsSync(exePath)) {
      pythonProcess = spawn(exePath, [gln, fullSync ? '--full' : '']);
    } else if (fs.existsSync(pythonVenvPython)) {
      pythonProcess = spawn(pythonVenvPython, [scriptPath, gln, fullSync ? '--full' : '']);
    } else {
      pythonProcess = spawn('python', [scriptPath, gln, fullSync ? '--full' : '']);
    }

    let stdoutData = '';
    let stderrData = '';

    pythonProcess.stdout.on('data', (data) => {
      const text = data.toString();
      stdoutData += text;
      
      const lines = text.split('\n');
      for (const line of lines) {
        if (line.includes('[STATUS]')) {
          const status = line.split('[STATUS]')[1].trim();
          mainWindow.webContents.send('wails-event', 'sync:status', status);
        }
      }
    });

    pythonProcess.stderr.on('data', (data) => {
      stderrData += data.toString();
      console.warn(`[Python stderr] ${data.toString().trim()}`);
    });

    pythonProcess.on('close', (code) => {
      if (code !== 0) {
        const errMsg = `Python script failed with code ${code}. Stderr: ${stderrData}`;
        console.error(errMsg);
        mainWindow.webContents.send('wails-event', 'sync:status', `error: ${stderrData.slice(0, 100)}`);
        reject(new Error(errMsg));
        return;
      }

      console.log('Python offline analysis finished successfully.');
      
      try {
        const cachePath = path.join(pythonDir, 'tenants', gln, 'analysis_cache.json');
        if (fs.existsSync(cachePath)) {
          const result = fs.readFileSync(cachePath, 'utf8');
          mainWindow.webContents.send('wails-event', 'sync:status', 'completed');
          resolve(result);
        } else {
          const errMsg = 'analysis_cache.json was not generated';
          mainWindow.webContents.send('wails-event', 'sync:status', `error: ${errMsg}`);
          reject(new Error(errMsg));
        }
      } catch (err) {
        mainWindow.webContents.send('wails-event', 'sync:status', `error: ${err.message}`);
        reject(err);
      }
    });
  });
});

ipcMain.handle('wails:RunDbQuery', async (event, query, paramsJSON) => {
  return new Promise((resolve, reject) => {
    const scriptPath = path.join(pythonDir, 'db_tool.py');
    const exePath = path.join(pythonDir, 'dist', 'db_tool.exe');
    let pythonProcess;
    if (fs.existsSync(exePath)) {
      pythonProcess = spawn(exePath, ['execute', query, paramsJSON || '[]']);
    } else if (fs.existsSync(pythonVenvPython)) {
      pythonProcess = spawn(pythonVenvPython, [scriptPath, 'execute', query, paramsJSON || '[]']);
    } else {
      pythonProcess = spawn('python', [scriptPath, 'execute', query, paramsJSON || '[]']);
    }

    let stdoutData = '';
    let stderrData = '';

    pythonProcess.stdout.on('data', (data) => {
      stdoutData += data.toString('utf8');
    });

    pythonProcess.stderr.on('data', (data) => {
      stderrData += data.toString('utf8');
    });

    pythonProcess.on('close', (code) => {
      if (code !== 0) {
        console.error(`db_tool.py failed with code ${code}. Stderr: ${stderrData}`);
        reject(new Error(stderrData || `Exit code ${code}`));
        return;
      }
      resolve(stdoutData.trim());
    });
  });
});

app.whenReady().then(() => {
  registerAppProtocol();
  createWindow();
  createWidgetWindow();

  globalShortcut.register('Ctrl+Alt+S', () => {
    if (!widgetWindow) {
      createWidgetWindow();
    }
    if (widgetWindow) {
      if (widgetWindow.isVisible()) {
        widgetWindow.hide();
      } else {
        widgetWindow.show();
        widgetWindow.focus();
      }
    }
  });

  // ── GEK Network Interceptor (debug) ─────────────────────────────────────
  // Capture ALL requests/responses to GEK's MainService API for diagnosis
  try {
    const { session } = require('electron');
    const ALL_SESSIONS = [
      session.defaultSession,
      session.fromPartition('persist:depolar'),
    ];
    const gekLogPath = path.join(pythonDir, 'tenants', 'local', 'gek_network_log.json');
    let gekLogs = [];
    try { if (fs.existsSync(gekLogPath)) gekLogs = JSON.parse(fs.readFileSync(gekLogPath, 'utf8')); } catch {}

    const GEK_URL_FILTER = { urls: ['*://esube.gek.org.tr/MainService/api/rfc/*'] };

    ALL_SESSIONS.forEach(sess => {
      sess.webRequest.onSendHeaders(GEK_URL_FILTER, (details) => {
        const entry = {
          t: new Date().toISOString(),
          phase: 'request',
          method: details.method,
          url: details.url,
          requestHeaders: details.requestHeaders,
        };
        gekLogs.push(entry);
        if (gekLogs.length > 500) gekLogs = gekLogs.slice(-500);
        try { fs.writeFileSync(gekLogPath, JSON.stringify(gekLogs, null, 2)); } catch {}
        console.log('[GEK Intercept] →', details.method, details.url);
      });

      sess.webRequest.onCompleted(GEK_URL_FILTER, (details) => {
        const entry = {
          t: new Date().toISOString(),
          phase: 'response',
          method: details.method,
          url: details.url,
          statusCode: details.statusCode,
          responseHeaders: details.responseHeaders,
        };
        gekLogs.push(entry);
        if (gekLogs.length > 500) gekLogs = gekLogs.slice(-500);
        try { fs.writeFileSync(gekLogPath, JSON.stringify(gekLogs, null, 2)); } catch {}
        console.log('[GEK Intercept] ←', details.statusCode, details.url);
      });
    });
    console.log('[GEK Intercept] webRequest interceptors registered for GEK MainService API');
  } catch (e) {
    console.error('[GEK Intercept] Failed to register webRequest interceptors:', e);
  }
  // ────────────────────────────────────────────────────────────────────────

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});


app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
});

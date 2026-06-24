const { app, BrowserWindow, ipcMain, shell, protocol, net } = require('electron');
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
const settingsPath = path.join(execDir, 'settings.json');
const pythonDir = path.join(execDir, 'python');
const pythonVenvPython = path.join(pythonDir, '.venv', 'Scripts', 'python.exe');

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
      return net.fetch(fileUrl);
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
      webviewTag: true         // Crucial for embedding warehouse portals!
    }
  });

  mainWindow.loadURL('app://./index.html');

  mainWindow.webContents.on('console-message', (event, level, message, line, sourceId) => {
    console.log(`[Renderer Console] ${message} (from ${path.basename(sourceId)}:${line})`);
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

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
    let pythonProcess;
    if (fs.existsSync(pythonVenvPython)) {
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
    
    let pythonProcess;
    if (fs.existsSync(pythonVenvPython)) {
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

app.whenReady().then(() => {
  registerAppProtocol();
  createWindow();

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

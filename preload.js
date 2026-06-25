const { ipcRenderer } = require('electron');

const eventListeners = {};

ipcRenderer.on('wails-event', (event, eventName, ...args) => {
  if (eventListeners[eventName]) {
    eventListeners[eventName].forEach(cb => {
      try {
        cb(...args);
      } catch (err) {
        console.error(`Error in event listener for ${eventName}:`, err);
      }
    });
  }
});

// Inject Wails-compatible APIs directly into window object (no context isolation)
window.go = {
  main: {
    App: {
      LoadSettings: () => ipcRenderer.invoke('wails:LoadSettings'),
      SaveSettings: (settingsJSON) => ipcRenderer.invoke('wails:SaveSettings', settingsJSON),
      GetDashboardData: (gln) => ipcRenderer.invoke('wails:GetDashboardData', gln),
      LoadLocalJSON: (gln, filename) => ipcRenderer.invoke('wails:LoadLocalJSON', gln, filename),
      SaveLocalJSON: (gln, filename, content) => ipcRenderer.invoke('wails:SaveLocalJSON', gln, filename, content),
      TriggerSyncAndAnalysis: (gln, fullSync) => ipcRenderer.invoke('wails:TriggerSyncAndAnalysis', gln, fullSync),
      RunCategoryAction: (action, paramsJSON) => ipcRenderer.invoke('wails:RunCategoryAction', action, paramsJSON),
      StartDepoProxy: (targetRaw) => Promise.resolve(targetRaw), // In Electron, <webview> handles original URL directly!
      StopDepoProxy: (proxyURL) => Promise.resolve(),
      OpenURLInBrowser: (targetURL) => ipcRenderer.invoke('wails:OpenURLInBrowser', targetURL),
      GetWebviewPreloadPath: () => ipcRenderer.invoke('wails:GetWebviewPreloadPath'),
      AppendOrderResult: (gln, entry) => ipcRenderer.invoke('wails:AppendOrderResult', gln, entry)
    }
  }
};

window.runtime = {
  EventsOn: (eventName, callback) => {
    if (!eventListeners[eventName]) eventListeners[eventName] = [];
    eventListeners[eventName].push(callback);
  },
  EventsOff: (eventName) => {
    delete eventListeners[eventName];
  }
};

console.log("Wails bindings successfully injected into window object.");

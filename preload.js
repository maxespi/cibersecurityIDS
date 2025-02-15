const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    runScript: (scriptName) => ipcRenderer.invoke('run-script', scriptName),
    loadLogContent: () => ipcRenderer.send('load-log-content'),
    loadLogContent2: () => ipcRenderer.send('load-log-content2'),
    onLogContent: (callback) => ipcRenderer.on('log-content', (event, content) => callback(content)),
    onLogContent2: (callback) => ipcRenderer.on('log-content2', (event, content) => callback(content)),
    onLogData: (callback) => ipcRenderer.on('log-data', (event, data) => callback(data)),
    onLogError: (callback) => ipcRenderer.on('log-error', (event, data) => callback(data)),
    onLogClose: (callback) => ipcRenderer.on('log-close', (event, message) => callback(message)),
    onAppOpened: (callback) => ipcRenderer.on('app-opened', callback),
    onUserLoggedIn: (callback) => ipcRenderer.on('user-logged-in', (event, username) => callback(username)),
    login: (username, password) => ipcRenderer.invoke('login', username, password),
    navigateToScripts: () => ipcRenderer.invoke('navigate-to-scripts'),
    navigateToLogs: () => ipcRenderer.invoke('navigate-to-logs')
});
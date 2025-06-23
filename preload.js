const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    // Scripts
    runScript: (scriptName) => ipcRenderer.invoke('run-script', scriptName),
    getScriptStatus: () => ipcRenderer.invoke('get-script-status'),  // ← AGREGAR ESTA LÍNEA
    onScriptOutput: (callback) => {
        const unsubscribe = () => ipcRenderer.removeAllListeners('script-output');
        ipcRenderer.on('script-output', callback);
        return unsubscribe;
    },

    // Logs
    loadLogContent: () => ipcRenderer.send('load-log-content'),
    loadLogContent2: () => ipcRenderer.send('load-log-content2'),
    onLogContent: (callback) => ipcRenderer.on('log-content', (event, content) => callback(content)),
    onLogContent2: (callback) => ipcRenderer.on('log-content2', (event, content) => callback(content)),
    onLogData: (callback) => ipcRenderer.on('log-data', (event, data) => callback(data)),
    onLogError: (callback) => ipcRenderer.on('log-error', (event, data) => callback(data)),
    onLogClose: (callback) => ipcRenderer.on('log-close', (event, message) => callback(message)),

    // Authentication & Events
    login: (username, password) => ipcRenderer.invoke('login', username, password),
    onAppOpened: (callback) => ipcRenderer.on('app-opened', callback),
    onUserLoggedIn: (callback) => ipcRenderer.on('user-logged-in', (event, username) => callback(username)),

    // Navigation
    navigateToScripts: () => ipcRenderer.invoke('navigate-to-scripts'),
    navigateToLogs: () => ipcRenderer.invoke('navigate-to-logs'),
    navigateToFirewall: () => ipcRenderer.invoke('navigate-to-firewall'),

    // Firewall
    getBlockedIPs: () => ipcRenderer.invoke('get-blocked-ips'),
    getFirewallStats: () => ipcRenderer.invoke('get-firewall-stats'),
    removeIPFromFirewall: (ip) => ipcRenderer.invoke('remove-ip-from-firewall', ip),
    removeMultipleIPsFromFirewall: (ips) => ipcRenderer.invoke('remove-multiple-ips-from-firewall', ips),
    getIPGeolocation: (ip) => ipcRenderer.invoke('get-ip-geolocation', ip),
    checkAdminPrivileges: () => ipcRenderer.invoke('check-admin-privileges'),

    // Eventos adicionales que faltan
    onFirewallUpdate: (callback) => {
        const unsubscribe = () => ipcRenderer.removeAllListeners('firewall-update');
        ipcRenderer.on('firewall-update', callback);
        return unsubscribe;
    },

    // Logs adicionales que faltan
    getLogs: (type) => ipcRenderer.invoke('get-logs', type),
    getRecentLogs: (limit) => ipcRenderer.invoke('get-recent-logs', limit),
    searchLogs: (query, exactMatch) => ipcRenderer.invoke('search-logs', query, exactMatch),
    onLogUpdate: (callback) => {
        const unsubscribe = () => ipcRenderer.removeAllListeners('log-update');
        ipcRenderer.on('log-update', callback);
        return unsubscribe;
    }
});
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    runScript: (scriptName) => ipcRenderer.invoke('run-script', scriptName),
    startScriptExecution: (scriptName) => ipcRenderer.invoke('run-script', scriptName),
    getScriptStatus: () => ipcRenderer.invoke('get-script-status'),

    onLogData: (callback) => {
        ipcRenderer.on('log-data', callback);
        return () => ipcRenderer.removeAllListeners('log-data');
    },
    onLogError: (callback) => {
        ipcRenderer.on('log-error', callback);
        return () => ipcRenderer.removeAllListeners('log-error');
    },
    onLogClose: (callback) => {
        ipcRenderer.on('log-close', callback);
        return () => ipcRenderer.removeAllListeners('log-close');
    },

    // Logs
    loadLogContent: () => ipcRenderer.send('load-log-content'),
    loadLogContent2: () => ipcRenderer.send('load-log-content2'),
    onLogContent: (callback) => ipcRenderer.on('log-content', (event, content) => callback(content)),
    onLogContent2: (callback) => ipcRenderer.on('log-content2', (event, content) => callback(content)),

    // Authentication & Events
    login: (username, password) => ipcRenderer.invoke('login', username, password),
    onAppOpened: (callback) => ipcRenderer.on('app-opened', callback),

    // ✅ User logged in SIN navegación automática
    onUserLoggedIn: (callback) => {
        console.log('🔧 [PRELOAD] Registrando onUserLoggedIn listener');
        ipcRenderer.on('user-logged-in', (event, username) => {
            console.log('🔧 [PRELOAD] User logged in:', username);
            callback(username);
        });
        return () => ipcRenderer.removeAllListeners('user-logged-in');
    },

    // Firewall
    getBlockedIPs: () => ipcRenderer.invoke('get-blocked-ips'),
    getFirewallStats: () => ipcRenderer.invoke('get-firewall-stats'),
    removeIPFromFirewall: (ip) => ipcRenderer.invoke('remove-ip-from-firewall', ip),
    removeMultipleIPsFromFirewall: (ips) => ipcRenderer.invoke('remove-multiple-ips-from-firewall', ips),
    getIPGeolocation: (ip) => ipcRenderer.invoke('get-ip-geolocation', ip),
    checkAdminPrivileges: () => ipcRenderer.invoke('check-admin-privileges'),

    // Eventos adicionales
    onFirewallUpdate: (callback) => {
        ipcRenderer.on('firewall-update', callback);
        return () => ipcRenderer.removeAllListeners('firewall-update');
    },

    // Logs adicionales
    getLogs: (type) => ipcRenderer.invoke('get-logs', type),
    getRecentLogs: (limit) => ipcRenderer.invoke('get-recent-logs', limit),
    searchLogs: (query, exactMatch) => ipcRenderer.invoke('search-logs', query, exactMatch),
    onLogUpdate: (callback) => {
        ipcRenderer.on('log-update', callback);
        return () => ipcRenderer.removeAllListeners('log-update');
    },

    // Windows Event Analysis
    analyzeWindowsEvents: (options) => ipcRenderer.invoke('analyze-windows-events', options),
    updateFirewallRules: (options) => ipcRenderer.invoke('update-firewall-rules', options),

    // Whitelist
    getWhitelistIPs: () => ipcRenderer.invoke('get-whitelist-ips'),
    addWhitelistIP: (data) => ipcRenderer.invoke('add-whitelist-ip', data),
    removeWhitelistIP: (ipId) => ipcRenderer.invoke('remove-whitelist-ip', ipId),

    // Advanced IP management
    getDetectedIPsHistory: (filters) => ipcRenderer.invoke('get-detected-ips-history', filters),
    getIPStatistics: () => ipcRenderer.invoke('get-ip-statistics'),
    updateIPStatus: (ip, status) => ipcRenderer.invoke('update-ip-status', ip, status),
});
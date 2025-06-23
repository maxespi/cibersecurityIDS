const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    // ================ SCRIPTS ================
    runScript: (scriptName) => ipcRenderer.invoke('run-script', scriptName),
    startScriptExecution: (scriptName) => ipcRenderer.invoke('run-script', scriptName), // Alias
    getScriptStatus: () => ipcRenderer.invoke('get-script-status'),

    // ================ EVENTOS DE SCRIPTS ================
    onLogData: (callback) => {
        const handler = (event, data) => callback(data);
        ipcRenderer.on('log-data', handler);
        return () => ipcRenderer.removeListener('log-data', handler);
    },
    onLogError: (callback) => {
        const handler = (event, data) => callback(data);
        ipcRenderer.on('log-error', handler);
        return () => ipcRenderer.removeListener('log-error', handler);
    },
    onLogClose: (callback) => {
        const handler = (event, message) => callback(message);
        ipcRenderer.on('log-close', handler);
        return () => ipcRenderer.removeListener('log-close', handler);
    },

    // ================ LOGS ================
    loadLogContent: () => ipcRenderer.send('load-log-content'),
    loadLogContent2: () => ipcRenderer.send('load-log-content2'),
    onLogContent: (callback) => {
        const handler = (event, content) => callback(content);
        ipcRenderer.on('log-content', handler);
        return () => ipcRenderer.removeListener('log-content', handler);
    },
    onLogContent2: (callback) => {
        const handler = (event, content) => callback(content);
        ipcRenderer.on('log-content2', handler);
        return () => ipcRenderer.removeListener('log-content2', handler);
    },

    // ================ AUTENTICACIÓN ================
    login: (username, password) => ipcRenderer.invoke('login', username, password),

    // ================ FIREWALL ================
    getBlockedIPs: () => ipcRenderer.invoke('get-blocked-ips'),
    getFirewallStats: () => ipcRenderer.invoke('get-firewall-stats'),
    removeIPFromFirewall: (ip) => ipcRenderer.invoke('remove-ip-from-firewall', ip),
    removeMultipleIPsFromFirewall: (ips) => ipcRenderer.invoke('remove-multiple-ips-from-firewall', ips),
    getIPGeolocation: (ip) => ipcRenderer.invoke('get-ip-geolocation', ip),
    checkAdminPrivileges: () => ipcRenderer.invoke('check-admin-privileges'),

    // ================ ANÁLISIS DE EVENTOS WINDOWS ================
    analyzeWindowsEvents: (options) => ipcRenderer.invoke('analyze-windows-events', options),
    updateFirewallRules: (options) => ipcRenderer.invoke('update-firewall-rules', options),

    // ================ WHITELIST ================
    getWhitelistIPs: () => ipcRenderer.invoke('get-whitelist-ips'),
    addWhitelistIP: (data) => ipcRenderer.invoke('add-whitelist-ip', data),
    removeWhitelistIP: (ipId) => ipcRenderer.invoke('remove-whitelist-ip', ipId),

    // ================ GESTIÓN AVANZADA DE IPs ================
    getDetectedIPsHistory: (filters) => ipcRenderer.invoke('get-detected-ips-history', filters),
    getIPStatistics: () => ipcRenderer.invoke('get-ip-statistics'),

    // ================ LOGS AVANZADOS ================
    getLogs: (type) => ipcRenderer.invoke('get-logs', type),
    getRecentLogs: (limit) => ipcRenderer.invoke('get-recent-logs', limit),
    searchLogs: (query, exactMatch) => ipcRenderer.invoke('search-logs', query, exactMatch),

    // ================ CONTROL DE SCRIPTS AVANZADO ================
    executeFullScanAndBlock: () => ipcRenderer.invoke('execute-full-scan-and-block'),
    executeSingleScan: () => ipcRenderer.invoke('execute-single-scan'),
    executeFirewallUpdate: () => ipcRenderer.invoke('execute-firewall-update'),
    clearDetectedIPs: () => ipcRenderer.invoke('clear-detected-ips')
});
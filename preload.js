const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    // ✅ SCRIPTS - AMBAS FUNCIONES FUNCIONAN
    runScript: (scriptName) => ipcRenderer.invoke('run-script', scriptName),
    startScriptExecution: (scriptName) => ipcRenderer.invoke('run-script', scriptName),
    getScriptStatus: () => ipcRenderer.invoke('get-script-status'),

    // ✅ SCRIPT EVENTS - CORREGIDOS para extraer solo los datos
    onLogData: (callback) => {
        const handler = (event, data) => callback(data); // ✅ Solo pasar los datos
        ipcRenderer.on('log-data', handler);
        return () => ipcRenderer.removeListener('log-data', handler);
    },
    onLogError: (callback) => {
        const handler = (event, data) => callback(data); // ✅ Solo pasar los datos
        ipcRenderer.on('log-error', handler);
        return () => ipcRenderer.removeListener('log-error', handler);
    },
    onLogClose: (callback) => {
        const handler = (event, message) => callback(message); // ✅ Solo pasar el mensaje
        ipcRenderer.on('log-close', handler);
        return () => ipcRenderer.removeListener('log-close', handler);
    },

    // ✅ LOGS
    loadLogContent: () => ipcRenderer.send('load-log-content'),
    loadLogContent2: () => ipcRenderer.send('load-log-content2'),
    onLogContent: (callback) => {
        const handler = (event, content) => callback(content); // ✅ Solo pasar el contenido
        ipcRenderer.on('log-content', handler);
        return () => ipcRenderer.removeListener('log-content', handler);
    },
    onLogContent2: (callback) => {
        const handler = (event, content) => callback(content); // ✅ Solo pasar el contenido
        ipcRenderer.on('log-content2', handler);
        return () => ipcRenderer.removeListener('log-content2', handler);
    },

    // ✅ AUTHENTICATION & EVENTS
    login: (username, password) => ipcRenderer.invoke('login', username, password),
    onAppOpened: (callback) => {
        const handler = () => callback(); // ✅ Sin parámetros
        ipcRenderer.on('app-opened', handler);
        return () => ipcRenderer.removeListener('app-opened', handler);
    },

    // ✅ USER LOGGED IN - CORREGIDO
    onUserLoggedIn: (callback) => {
        console.log('🔧 [PRELOAD] Registrando onUserLoggedIn listener');
        const handler = (event, username) => {
            console.log('🔧 [PRELOAD] User logged in:', username);
            callback(username); // ✅ Solo pasar el username
        };
        ipcRenderer.on('user-logged-in', handler);
        return () => ipcRenderer.removeListener('user-logged-in', handler);
    },

    // ✅ FIREWALL
    getBlockedIPs: () => ipcRenderer.invoke('get-blocked-ips'),
    getFirewallStats: () => ipcRenderer.invoke('get-firewall-stats'),
    removeIPFromFirewall: (ip) => ipcRenderer.invoke('remove-ip-from-firewall', ip),
    removeMultipleIPsFromFirewall: (ips) => ipcRenderer.invoke('remove-multiple-ips-from-firewall', ips),
    getIPGeolocation: (ip) => ipcRenderer.invoke('get-ip-geolocation', ip),
    checkAdminPrivileges: () => ipcRenderer.invoke('check-admin-privileges'),

    // ✅ FIREWALL EVENTS - CORREGIDO
    onFirewallUpdate: (callback) => {
        const handler = () => callback(); // ✅ Sin parámetros
        ipcRenderer.on('firewall-update', handler);
        return () => ipcRenderer.removeListener('firewall-update', handler);
    },

    // ✅ LOGS ADICIONALES
    getLogs: (type) => ipcRenderer.invoke('get-logs', type),
    getRecentLogs: (limit) => ipcRenderer.invoke('get-recent-logs', limit),
    searchLogs: (query, exactMatch) => ipcRenderer.invoke('search-logs', query, exactMatch),
    onLogUpdate: (callback) => {
        const handler = (event, log) => callback(log); // ✅ Solo pasar el log
        ipcRenderer.on('log-update', handler);
        return () => ipcRenderer.removeListener('log-update', handler);
    },

    // ✅ WINDOWS EVENT ANALYSIS
    analyzeWindowsEvents: (options) => ipcRenderer.invoke('analyze-windows-events', options),
    updateFirewallRules: (options) => ipcRenderer.invoke('update-firewall-rules', options),

    // ✅ WHITELIST
    getWhitelistIPs: () => ipcRenderer.invoke('get-whitelist-ips'),
    addWhitelistIP: (data) => ipcRenderer.invoke('add-whitelist-ip', data),
    removeWhitelistIP: (ipId) => ipcRenderer.invoke('remove-whitelist-ip', ipId),

    // ✅ ADVANCED IP MANAGEMENT
    getDetectedIPsHistory: (filters) => ipcRenderer.invoke('get-detected-ips-history', filters),
    getIPStatistics: () => ipcRenderer.invoke('get-ip-statistics'),
    updateIPStatus: (ip, status) => ipcRenderer.invoke('update-ip-status', ip, status),

    // ✅ SCRIPT CONTROL ADICIONAL
    stopScriptExecution: () => {
        console.log('🔧 [PRELOAD] stopScriptExecution called - implementar si es necesario');
        // Implementar si tienes un handler para detener scripts
        // return ipcRenderer.invoke('stop-script');
    },

    // Script control adicional
    executeFullScanAndBlock: () => ipcRenderer.invoke('execute-full-scan-and-block'),
    executeSingleScan: () => ipcRenderer.invoke('execute-single-scan'),
    executeFirewallUpdate: () => ipcRenderer.invoke('execute-firewall-update'),
    clearDetectedIPs: () => ipcRenderer.invoke('clear-detected-ips'),
});
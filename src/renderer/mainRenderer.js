// src/renderer/mainRenderer.js - Versión completa actualizada

let scriptInterval;
let isRunning = false;
let currentPage = 1;
const rowsPerPage = 25;
let tableRows = [];
let filteredRows = [];
let tableHeaders = [];

// Initialize when app opens
window.electronAPI.onAppOpened(() => {
    console.log('Aplicación principal iniciada');
    updateSystemStatus();
    window.electronAPI.loadLogContent();
});

// Handle log content loading
window.electronAPI.onLogContent((content) => {
    if (!content || content.trim() === '') {
        showEmptyState('recentTableLogs', 'No hay registros disponibles');
        return;
    }

    try {
        const rows = content.trim().split('\n').map(row => row.split(','));
        if (rows.length > 0) {
            tableHeaders = rows.shift(); // Remove header row
            rows.reverse(); // Show newest first

            tableRows = rows;
            filteredRows = rows;
            currentPage = 1;
            renderRecentActivity(filteredRows.slice(0, rowsPerPage));
        }
    } catch (error) {
        console.error('Error parsing log content:', error);
        showEmptyState('recentTableLogs', 'Error al cargar los registros');
    }
});

// Handle user login
window.electronAPI.onUserLoggedIn((username) => {
    document.getElementById('loggedInUser').textContent = `👤 Usuario: ${username}`;
    addLogEntry(`Usuario ${username} ha iniciado sesión`);
});

// Navigation event listeners
document.getElementById('showScripts').addEventListener('click', () => {
    addLogEntry('Navegando a Scripts');
    window.electronAPI.navigateToScripts();
});

document.getElementById('showLogs').addEventListener('click', () => {
    addLogEntry('Navegando a Logs');
    window.electronAPI.navigateToLogs();
});

document.getElementById('showSalidaIpsLogs').addEventListener('click', () => {
    addLogEntry('Navegando a IPs Detectadas');
    window.electronAPI.navigateToLogs();
});

document.getElementById('showFirewall').addEventListener('click', () => {
    addLogEntry('Navegando a Firewall');
    window.electronAPI.navigateToFirewall();
});

// Control panel event listeners
document.getElementById('startLogging').addEventListener('click', () => {
    const intervalSeconds = parseInt(document.getElementById('intervalInput').value, 10);

    if (!isNaN(intervalSeconds) && intervalSeconds > 0) {
        addLogEntry(`Iniciando escaneo automático cada ${intervalSeconds} segundos`);
        startScriptExecution(intervalSeconds);
    } else {
        addLogEntry('Iniciando escaneo único');
        executeSingleScan();
    }
});

document.getElementById('stopLogging').addEventListener('click', () => {
    addLogEntry('Deteniendo escaneo automático');
    stopScriptExecution();
});

document.getElementById('addFirewallRules').addEventListener('click', () => {
    addLogEntry('Agregando reglas al firewall');
    executeFirewallRules();
});

document.getElementById('clearLog').addEventListener('click', () => {
    clearLogs();
});

// Script execution functions
function executeSingleScan() {
    if (isRunning) {
        addLogEntry('⚠️ Ya hay un escaneo en ejecución');
        return;
    }

    isRunning = true;
    updateButtonStates();

    window.electronAPI.runScript('logs_for_ips_4625.ps1').then(() => {
        const runFirewallOnce = document.getElementById('runFirewallOnce').checked;
        const runFirewallAlways = document.getElementById('runFirewallAlways').checked;

        if (runFirewallOnce || runFirewallAlways) {
            return executeFirewallRules();
        }
    }).then(() => {
        addLogEntry('✅ Escaneo completado exitosamente');
        if (document.getElementById('runFirewallOnce').checked) {
            document.getElementById('runFirewallOnce').checked = false;
        }
    }).catch((error) => {
        addLogEntry(`❌ Error en el escaneo: ${error.message}`);
    }).finally(() => {
        isRunning = false;
        updateButtonStates();
        window.electronAPI.loadLogContent(); // Refresh recent activity
    });
}

function executeFirewallRules() {
    return window.electronAPI.runScript('BlockIpAndUpdateForOneRule.ps1').then(() => {
        addLogEntry('✅ Reglas de firewall aplicadas');
    }).catch((error) => {
        addLogEntry(`❌ Error al aplicar reglas: ${error.message}`);
        throw error;
    });
}

function startScriptExecution(intervalSeconds) {
    if (scriptInterval) {
        clearInterval(scriptInterval);
    }

    const intervalMilliseconds = intervalSeconds * 1000;
    let executionCount = 0;

    scriptInterval = setInterval(() => {
        if (!isRunning) {
            executionCount++;
            addLogEntry(`🔄 Ejecutando escaneo automático #${executionCount}`);
            executeSingleScan();
        } else {
            addLogEntry('⏭️ Saltando ejecución - escaneo en progreso');
        }
    }, intervalMilliseconds);

    updateButtonStates();
    addLogEntry(`⏰ Escaneo automático configurado (cada ${intervalSeconds}s)`);
}

function stopScriptExecution() {
    if (scriptInterval) {
        clearInterval(scriptInterval);
        scriptInterval = null;
    }
    isRunning = false;
    updateButtonStates();
    addLogEntry('⏹️ Escaneo automático detenido');
}

function clearLogs() {
    const logElement = document.getElementById('log');
    const actionsElement = document.getElementById('actions');

    logElement.innerHTML = '<div class="text-white text-opacity-70 text-center mt-8"><p>Esperando ejecución de scripts...</p></div>';
    actionsElement.innerHTML = '<div class="text-white text-opacity-70 text-center mt-6"><p>Sin acciones registradas</p></div>';

    addLogEntry('🧹 Logs limpiados');
}

// UI Helper functions
function addLogEntry(message) {
    const log = document.getElementById('actions');
    const timestamp = new Date().toLocaleString('es-ES', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });

    // Remove empty state if present
    if (log.querySelector('.text-center')) {
        log.innerHTML = '';
    }

    const logEntry = document.createElement('div');
    logEntry.className = 'flex items-start space-x-2 mb-2 p-2 bg-white bg-opacity-5 rounded text-xs text-white';
    logEntry.innerHTML = `
        <span class="text-blue-300 font-mono">[${timestamp}]</span>
        <span class="flex-1">${message}</span>
    `;

    log.prepend(logEntry);

    // Keep only last 50 entries
    const entries = log.children;
    if (entries.length > 50) {
        for (let i = entries.length - 1; i >= 50; i--) {
            entries[i].remove();
        }
    }
}

function updateButtonStates() {
    const startBtn = document.getElementById('startLogging');
    const stopBtn = document.getElementById('stopLogging');

    if (isRunning) {
        startBtn.disabled = true;
        startBtn.classList.add('opacity-50', 'cursor-not-allowed');
        stopBtn.disabled = false;
        stopBtn.classList.remove('opacity-50', 'cursor-not-allowed');
    } else {
        startBtn.disabled = false;
        startBtn.classList.remove('opacity-50', 'cursor-not-allowed');
        stopBtn.disabled = !!scriptInterval;
        if (scriptInterval) {
            stopBtn.classList.remove('opacity-50', 'cursor-not-allowed');
        } else {
            stopBtn.classList.add('opacity-50', 'cursor-not-allowed');
        }
    }
}

function renderRecentActivity(rows) {
    const container = document.getElementById('recentTableLogs');

    if (!rows || rows.length === 0) {
        showEmptyState('recentTableLogs', 'No hay actividad reciente');
        return;
    }

    let tableHTML = `
        <div class="overflow-hidden">
            <table class="w-full text-xs">
                <thead>
                    <tr class="text-white text-opacity-70 border-b border-white border-opacity-20">
                        <th class="text-left py-2 px-2">IP</th>
                        <th class="text-left py-2 px-2">Fecha</th>
                        <th class="text-left py-2 px-2">Usuario</th>
                        <th class="text-left py-2 px-2">Dominio</th>
                    </tr>
                </thead>
                <tbody>
    `;

    rows.slice(0, 10).forEach((row, index) => {
        if (row.length >= 4) {
            const ip = row[0] || 'N/A';
            const fecha = row[1] ? formatDate(row[1]) : 'N/A';
            const usuario = row[2] || 'N/A';
            const dominio = row[5] || 'N/A';

            tableHTML += `
                <tr class="text-white text-opacity-80 hover:bg-white hover:bg-opacity-5 transition-colors">
                    <td class="py-2 px-2 font-mono">${ip}</td>
                    <td class="py-2 px-2">${fecha}</td>
                    <td class="py-2 px-2">${usuario}</td>
                    <td class="py-2 px-2">${dominio}</td>
                </tr>
            `;
        }
    });

    tableHTML += `
                </tbody>
            </table>
        </div>
    `;

    container.innerHTML = tableHTML;
}

function showEmptyState(containerId, message) {
    const container = document.getElementById(containerId);
    container.innerHTML = `
        <div class="text-center text-white text-opacity-70 mt-20">
            <i class="material-icons text-4xl mb-2">inbox</i>
            <p>${message}</p>
        </div>
    `;
}

function formatDate(dateString) {
    try {
        const date = new Date(dateString);
        return date.toLocaleDateString('es-ES', {
            day: '2-digit',
            month: '2-digit',
            year: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });
    } catch (error) {
        return dateString;
    }
}

function updateSystemStatus() {
    // This could be enhanced to check actual system status
    addLogEntry('🚀 Sistema iniciado correctamente');
}

// Handle script output
window.electronAPI.onLogData((data) => {
    const logElement = document.getElementById('log');

    // Remove empty state if present
    if (logElement.querySelector('.text-center')) {
        logElement.innerHTML = '';
    }

    const timestamp = new Date().toLocaleString('es-ES', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });

    const logEntry = document.createElement('div');
    logEntry.className = 'mb-1 p-1 text-xs text-green-300';
    logEntry.innerHTML = `<span class="text-blue-300">[${timestamp}]</span> ${data.trim()}`;

    logElement.prepend(logEntry);

    // Keep only last 100 entries
    const entries = logElement.children;
    if (entries.length > 100) {
        for (let i = entries.length - 1; i >= 100; i--) {
            entries[i].remove();
        }
    }
});

window.electronAPI.onLogError((data) => {
    const logElement = document.getElementById('log');

    if (logElement.querySelector('.text-center')) {
        logElement.innerHTML = '';
    }

    const timestamp = new Date().toLocaleString('es-ES', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });

    const logEntry = document.createElement('div');
    logEntry.className = 'mb-1 p-1 text-xs text-red-300';
    logEntry.innerHTML = `<span class="text-blue-300">[${timestamp}]</span> ERROR: ${data.trim()}`;

    logElement.prepend(logEntry);
});

window.electronAPI.onLogClose((message) => {
    const logElement = document.getElementById('log');

    if (logElement.querySelector('.text-center')) {
        logElement.innerHTML = '';
    }

    const timestamp = new Date().toLocaleString('es-ES', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });

    const logEntry = document.createElement('div');
    logEntry.className = 'mb-1 p-1 text-xs text-yellow-300';
    logEntry.innerHTML = `<span class="text-blue-300">[${timestamp}]</span> ${message}`;

    logElement.prepend(logEntry);
});

// Initialize button states on load
document.addEventListener('DOMContentLoaded', () => {
    updateButtonStates();

    // Add some visual feedback for card interactions
    const cards = document.querySelectorAll('.card-hover');
    cards.forEach(card => {
        card.addEventListener('mouseenter', () => {
            card.style.transform = 'translateY(-8px)';
        });

        card.addEventListener('mouseleave', () => {
            card.style.transform = 'translateY(0)';
        });
    });

    // Initialize tooltips if needed
    initializeTooltips();

    // Set up keyboard shortcuts
    document.addEventListener('keydown', handleKeyboardShortcuts);
});

// Additional utility functions
function initializeTooltips() {
    // Add tooltips to buttons for better UX
    const buttons = document.querySelectorAll('button[id]');
    buttons.forEach(button => {
        if (!button.title) {
            switch (button.id) {
                case 'startLogging':
                    button.title = 'Iniciar escaneo de eventos 4625';
                    break;
                case 'stopLogging':
                    button.title = 'Detener escaneo automático';
                    break;
                case 'addFirewallRules':
                    button.title = 'Aplicar reglas de bloqueo al firewall';
                    break;
                case 'clearLog':
                    button.title = 'Limpiar todos los logs';
                    break;
            }
        }
    });
}

function handleKeyboardShortcuts(event) {
    // Ctrl/Cmd + R: Refresh recent activity
    if ((event.ctrlKey || event.metaKey) && event.key === 'r') {
        event.preventDefault();
        window.electronAPI.loadLogContent();
        addLogEntry('🔄 Actividad reciente actualizada manualmente');
    }

    // Ctrl/Cmd + L: Clear logs
    if ((event.ctrlKey || event.metaKey) && event.key === 'l') {
        event.preventDefault();
        clearLogs();
    }

    // Space: Start/Stop scanning (when not in input field)
    if (event.code === 'Space' && !event.target.matches('input, textarea')) {
        event.preventDefault();
        if (isRunning || scriptInterval) {
            stopScriptExecution();
        } else {
            executeSingleScan();
        }
    }
}

// Performance monitoring
function logPerformance(action, startTime) {
    const duration = performance.now() - startTime;
    if (duration > 100) { // Log slow operations
        console.warn(`Slow operation detected: ${action} took ${duration.toFixed(2)}ms`);
    }
}

// Auto-refresh recent activity every 30 seconds
setInterval(() => {
    if (!isRunning && document.visibilityState === 'visible') {
        const startTime = performance.now();
        window.electronAPI.loadLogContent();
        logPerformance('Auto-refresh', startTime);
    }
}, 30000);

// Handle visibility change to pause auto-refresh when tab is not visible
document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
        addLogEntry('🔄 Aplicación visible - reanudando actualizaciones');
        window.electronAPI.loadLogContent();
    } else {
        addLogEntry('⏸️ Aplicación en segundo plano - pausando actualizaciones');
    }
});

// Cleanup on beforeunload
window.addEventListener('beforeunload', () => {
    if (scriptInterval) {
        clearInterval(scriptInterval);
    }
});

// Export functions for testing or external use (optional)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        addLogEntry,
        formatDate,
        updateButtonStates,
        renderRecentActivity
    };
}
let scriptInterval;
let isRunning = false;
let currentPage = 1;
const rowsPerPage = 25;
let tableRows = [];
let filteredRows = [];
let tableHeaders = [];

window.electronAPI.onAppOpened(() => {
    console.log('La aplicación se ha abierto.');
    // Aquí puedes ejecutar cualquier otra función que necesites
    // Por ejemplo, cargar contenido inicial
    window.electronAPI.loadLogContent();
});

window.electronAPI.onLogContent((content) => {
    const rows = content.trim().split('\n').map(row => row.split(','));
    tableHeaders = rows.shift(); // Eliminar la primera fila que contiene los encabezados

    // Invertir el orden de las filas para mostrar del más nuevo al más antiguo
    rows.reverse();

    tableRows = rows;
    filteredRows = rows;
    currentPage = 1;
    renderTablePage(filteredRows, currentPage, rowsPerPage, tableHeaders, document.getElementById('logContent'));
    updatePaginationControls();
});

/* Navigate */

document.getElementById('showLogs').addEventListener('click', () => {
    window.electronAPI.navigateToLogs();
});

document.getElementById('showSalidaIpsLogs').addEventListener('click', () => {
    window.electronAPI.navigateToLogs();
});

/* Table navigation */

document.getElementById('prevPage').addEventListener('click', () => {
    if (currentPage > 1) {
        currentPage--;
        renderTablePage(filteredRows, currentPage, rowsPerPage, tableHeaders, document.getElementById('logContent'));
        updatePaginationControls();
    }
});

document.getElementById('nextPage').addEventListener('click', () => {
    const totalPages = Math.ceil(filteredRows.length / rowsPerPage);
    if (currentPage < totalPages) {
        currentPage++;
        renderTablePage(filteredRows, currentPage, rowsPerPage, tableHeaders, document.getElementById('logContent'));
        updatePaginationControls();
    }
});

/* Scripting */

document.getElementById('startLogging').addEventListener('click', () => {
    const intervalSeconds = parseInt(document.getElementById('intervalInput').value, 10);
    if (!isNaN(intervalSeconds) && intervalSeconds > 0) {
        addLogEntry(`Inicio de escaneo e identificación de IPs cada ${intervalSeconds} segundos.`);
        startScriptExecution(intervalSeconds);
    } else {
        addLogEntry('Inicio de escaneo e identificación de IPs.');
        window.electronAPI.runScript('logs_for_ips_4625.ps1').then(() => {
            // Verificar si se debe ejecutar "Agregar Reglas al Firewall"
            const runFirewallOnce = document.getElementById('runFirewallOnce').checked;
            const runFirewallAlways = document.getElementById('runFirewallAlways').checked;

            if (runFirewallOnce || runFirewallAlways) {
                window.electronAPI.runScript('BlockIpAndUpdateForOneRule.ps1').then(() => {
                    addLogEntry('Reglas del firewall agregadas.');
                }).catch((error) => {
                    addLogEntry(`Error al agregar reglas del firewall: ${error.message}`);
                });

                // Desmarcar "Ejecutar una vez" después de la ejecución
                if (runFirewallOnce) {
                    document.getElementById('runFirewallOnce').checked = false;
                }
            }
        }).catch((error) => {
            addLogEntry(`Error al ejecutar el script: ${error.message}`);
        });
    }
});

document.getElementById('stopLogging').addEventListener('click', () => {
    addLogEntry('Deteniendo el registro de eventos.');
    console.log('Stopping script execution.');
    stopScriptExecution();
});

document.getElementById('addFirewallRules').addEventListener('click', () => {
    addLogEntry('Agregando reglas al firewall.');
    window.electronAPI.runScript('BlockIpAndUpdateForOneRule.ps1');
});

document.getElementById('clearLog').addEventListener('click', () => {
    document.getElementById('log').innerText = '';
    addLogEntry('Log limpiado.');
});

window.electronAPI.onLogData((data) => {
    const logElement = document.getElementById('log');
    logElement.innerText += `LOG: ${data}\n`;
});

window.electronAPI.onLogError((data) => {
    const logElement = document.getElementById('log');
    logElement.innerText += `ERROR: ${data}\n`;
});

window.electronAPI.onLogClose((message) => {
    const logElement = document.getElementById('log');
    logElement.innerText += `PROCESS CLOSED: ${message}\n`;
});


function addLogEntry(message) {
    const log = document.getElementById('actions');
    const timestamp = new Date().toLocaleString();
    const logEntry = document.createElement('div');
    logEntry.textContent = `[${timestamp}] ${message}`;

    // Insertar la nueva entrada al principio del log
    log.prepend(logEntry);
}

function startScriptExecution(intervalSeconds) {
    const intervalMilliseconds = intervalSeconds * 1000;
    scriptInterval = setInterval(() => {
        if (!isRunning) {
            isRunning = true;
            const scriptPromise = window.electronAPI.runScript('logs_for_ips_4625.ps1');
            if (scriptPromise && typeof scriptPromise.then === 'function') {
                scriptPromise.then(() => {
                    isRunning = false;

                    // Verificar si se debe ejecutar "Agregar Reglas al Firewall"
                    const runFirewallOnce = document.getElementById('runFirewallOnce').checked;
                    const runFirewallAlways = document.getElementById('runFirewallAlways').checked;

                    if (runFirewallOnce || runFirewallAlways) {
                        window.electronAPI.runScript('BlockIpAndUpdateForOneRule.ps1').then(() => {
                            addLogEntry('Reglas del firewall agregadas.');
                        }).catch((error) => {
                            addLogEntry(`Error al agregar reglas del firewall: ${error.message}`);
                        });

                        // Desmarcar "Ejecutar una vez" después de la ejecución
                        if (runFirewallOnce) {
                            document.getElementById('runFirewallOnce').checked = false;
                        }
                    }
                }).catch((error) => {
                    addLogEntry(`Error al ejecutar el script: ${error.message}`);
                    isRunning = false;
                });
            } else {
                addLogEntry('Error: runScript did not return a promise.');
                isRunning = false;
            }
        } else {
            addLogEntry('Script is already running, skipping execution.');
        }
    }, intervalMilliseconds);
}

function stopScriptExecution() {
    console.log('Stopping script execution...');
    clearInterval(scriptInterval);
    isRunning = false;
}

/* function renderTablePage(rows, page) {
    const start = (page - 1) * rowsPerPage;
    const end = start + rowsPerPage;
    const rowsToDisplay = rows.slice(start, end);

    const logContentElement = document.getElementById('logContent');
    const table = document.createElement('table');
    const thead = document.createElement('thead');
    const tbody = document.createElement('tbody');

    // Crear fila de encabezados
    const headerRow = document.createElement('tr');
    const headers = ['N°', ...tableHeaders]; // Agregar encabezado para la numeración

    headers.forEach(header => {
        const th = document.createElement('th');
        th.textContent = header;
        headerRow.appendChild(th);
    });
    thead.appendChild(headerRow);

    // Crear filas de datos
    rowsToDisplay.forEach((row, rowIndex) => {
        const tr = document.createElement('tr');
        const tdIndex = document.createElement('td');
        tdIndex.textContent = start + rowIndex + 1; // Numeración de la fila
        tr.appendChild(tdIndex);

        row.forEach((cell, index) => {
            const td = document.createElement('td');
            if (index === 1) { // Asumiendo que la fecha está en la segunda columna
                td.textContent = formatDate(cell); // Formato de fecha deseado
            } else {
                td.textContent = cell;
            }
            tr.appendChild(td);
        });
        tbody.appendChild(tr);
    });

    table.appendChild(thead);
    table.appendChild(tbody);
    logContentElement.innerHTML = '';
    logContentElement.appendChild(table);
} */

function updatePaginationControls() {
    const totalPages = Math.ceil(filteredRows.length / rowsPerPage);
    document.getElementById('prevPage').disabled = currentPage === 1;
    document.getElementById('nextPage').disabled = currentPage === totalPages;
}
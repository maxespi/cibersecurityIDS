
let scriptInterval;
let isRunning = false;

// Función para agregar una entrada al log
function addLogEntry(message) {
    const log = document.getElementById('actions');
    const timestamp = new Date().toLocaleString();
    const logEntry = document.createElement('div');
    logEntry.textContent = `[${timestamp}] ${message}`;

    // Insertar la nueva entrada al principio del log
    log.prepend(logEntry);
    // Actualizar los logs recientes
}

function startScriptExecution(intervalSeconds) {
    const intervalMilliseconds = intervalSeconds * 1000;
    scriptInterval = setInterval(() => {
        if (!isRunning) {
            console.log('Script is not running, starting new execution...');
            isRunning = true;
            const scriptPromise = window.electronAPI.runScript('logs_for_ips_4625.ps1');
            if (scriptPromise && typeof scriptPromise.then === 'function') {
                scriptPromise.then(() => {
                    console.log('Script execution completed.');
                    isRunning = false;

                    // Verificar si se debe ejecutar "Agregar Reglas al Firewall"
                    const runFirewallOnce = document.getElementById('runFirewallOnce').checked;
                    const runFirewallAlways = document.getElementById('runFirewallAlways').checked;

                    if (runFirewallOnce || runFirewallAlways) {
                        window.electronAPI.runScript('BlockIpAndUpdateForOneRule.ps1').then(() => {
                            console.log('Firewall rules added.');
                            addLogEntry('Reglas del firewall agregadas.');
                        }).catch((error) => {
                            console.log('Error during firewall rules execution:', error.message);
                            addLogEntry(`Error al agregar reglas del firewall: ${error.message}`);
                        });

                        // Desmarcar "Ejecutar una vez" después de la ejecución
                        if (runFirewallOnce) {
                            document.getElementById('runFirewallOnce').checked = false;
                        }
                    }
                }).catch((error) => {
                    console.log('Error during script execution:', error.message);
                    addLogEntry(`Error al ejecutar el script: ${error.message}`);
                    isRunning = false;
                });
            } else {
                console.log('Error: runScript did not return a promise.');
                isRunning = false;
            }
        } else {
            console.log('Script is already running, skipping execution.');
        }
    }, intervalMilliseconds);
}

function stopScriptExecution() {
    console.log('Stopping script execution...');
    clearInterval(scriptInterval);
    isRunning = false;
}

document.getElementById('startLogging').addEventListener('click', () => {
    const intervalSeconds = parseInt(document.getElementById('intervalInput').value, 10);
    if (!isNaN(intervalSeconds) && intervalSeconds > 0) {
        addLogEntry(`Inicio de escaneo e identificación de IPs cada ${intervalSeconds} segundos.`);
        console.log(`Starting script execution every ${intervalSeconds} seconds.`);
        startScriptExecution(intervalSeconds);
    } else {
        addLogEntry('Inicio de escaneo e identificación de IPs.');
        console.log('Running script once.');
        window.electronAPI.runScript('logs_for_ips_4625.ps1').then(() => {
            console.log('Script execution completed.');

            // Verificar si se debe ejecutar "Agregar Reglas al Firewall"
            const runFirewallOnce = document.getElementById('runFirewallOnce').checked;
            const runFirewallAlways = document.getElementById('runFirewallAlways').checked;

            if (runFirewallOnce || runFirewallAlways) {
                window.electronAPI.runScript('BlockIpAndUpdateForOneRule.ps1').then(() => {
                    console.log('Firewall rules added.');
                    addLogEntry('Reglas del firewall agregadas.');
                }).catch((error) => {
                    console.log('Error during firewall rules execution:', error.message);
                    addLogEntry(`Error al agregar reglas del firewall: ${error.message}`);
                });

                // Desmarcar "Ejecutar una vez" después de la ejecución
                if (runFirewallOnce) {
                    document.getElementById('runFirewallOnce').checked = false;
                }
            }
        }).catch((error) => {
            console.log('Error during script execution:', error.message);
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

// Manejar la navegación entre vistas
document.getElementById('showScripts').addEventListener('click', () => {
    document.getElementById('scriptsView').classList.remove('hidden');
    document.getElementById('logsView').classList.add('hidden');
});

document.getElementById('showLogs').addEventListener('click', () => {
    document.getElementById('scriptsView').classList.add('hidden');
    document.getElementById('logsView').classList.remove('hidden');
    window.electronAPI.loadLogContent();
});

document.getElementById('showSalidaIpsLogs').addEventListener('click', () => {
    document.getElementById('scriptsView').classList.add('hidden');
    document.getElementById('logsView').classList.remove('hidden');
    window.electronAPI.loadLogContent2();
});

window.electronAPI.onAppOpened(() => {
    console.log('La aplicación se ha abierto.');
    // Aquí puedes ejecutar cualquier otra función que necesites
    // Por ejemplo, cargar contenido inicial
    window.electronAPI.loadLogContent();
});

// Función para formatear la fecha
function formatDate(dateString) {
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0'); // Los meses en JavaScript son 0-11
    const year = date.getFullYear();
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
}

// Función para convertir la fecha formateada al formato original
function parseFormattedDate(formattedDate) {
    const [day, month, year, hours, minutes, seconds] = formattedDate.match(/\d+/g);
    return new Date(`${year}-${month}-${day}T${hours}:${minutes}:${seconds}`);
}

let currentPage = 1;
const rowsPerPage = 100;
let tableRows = [];
let filteredRows = [];
let tableHeaders = [];


function renderTablePage(rows, page) {
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
}

function updateRecentTableLogs(rows) {
    const recentTableLogsElement = document.getElementById('recentTableLogs');
    recentTableLogsElement.innerHTML = '';

    const recentRows = rows.slice(0, 25); // Obtener los últimos 25 registros
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
    recentRows.forEach((row, rowIndex) => {
        const tr = document.createElement('tr');
        const tdIndex = document.createElement('td');
        tdIndex.textContent = rowIndex + 1; // Numeración de la fila
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
    recentTableLogsElement.appendChild(table);
}

function updatePaginationControls() {
    const totalPages = Math.ceil(filteredRows.length / rowsPerPage);
    document.getElementById('prevPage').disabled = currentPage === 1;
    document.getElementById('nextPage').disabled = currentPage === totalPages;
}

document.getElementById('prevPage').addEventListener('click', () => {
    if (currentPage > 1) {
        currentPage--;
        renderTablePage(filteredRows, currentPage);
        updatePaginationControls();
    }
});

document.getElementById('nextPage').addEventListener('click', () => {
    const totalPages = Math.ceil(filteredRows.length / rowsPerPage);
    if (currentPage < totalPages) {
        currentPage++;
        renderTablePage(filteredRows, currentPage);
        updatePaginationControls();
    }
});

window.electronAPI.onLogContent((content) => {
    const rows = content.trim().split('\n').map(row => row.split(','));
    tableHeaders = rows.shift(); // Eliminar la primera fila que contiene los encabezados

    // Invertir el orden de las filas para mostrar del más nuevo al más antiguo
    rows.reverse();

    tableRows = rows;
    filteredRows = rows;
    currentPage = 1;
    renderTablePage(filteredRows, currentPage);
    updatePaginationControls();

    // Actualizar los logs recientes
    updateRecentTableLogs(rows);
});

window.electronAPI.onLogContent2((content) => {
    const rows = content.trim().split('\n').map(row => [row]);
    tableHeaders = ['IP'];


    rows.reverse();

    tableRows = rows;
    filteredRows = rows;
    currentPage = 1;
    renderTablePage(filteredRows, currentPage);
    updatePaginationControls();
});


// Manejar la búsqueda en los logs
document.getElementById('searchInput').addEventListener('input', (event) => {
    const filter = event.target.value.toLowerCase();
    const exactMatch = document.getElementById('exactMatch').checked;

    filteredRows = tableRows.filter(row => {
        return row.some((cell, index) => {
            const cellText = cell.toLowerCase();
            if (index === 1) { // Asumiendo que la fecha está en la segunda columna
                const formattedDate = formatDate(cell).toLowerCase();
                return exactMatch ? formattedDate === filter : formattedDate.includes(filter);
            }
            return exactMatch ? cellText === filter : cellText.includes(filter);
        });
    });

    currentPage = 1;
    renderTablePage(filteredRows, currentPage);
    updatePaginationControls();

    document.getElementById('searchCount').textContent = `Resultados encontrados: ${filteredRows.length}`;
});

document.getElementById('exactMatch').addEventListener('change', () => {
    const filter = document.getElementById('searchInput').value.toLowerCase();
    const exactMatch = document.getElementById('exactMatch').checked;

    filteredRows = tableRows.filter(row => {
        return row.some((cell, index) => {
            const cellText = cell.toLowerCase();
            if (index === 1) { // Asumiendo que la fecha está en la segunda columna
                const formattedDate = formatDate(cell).toLowerCase();
                return exactMatch ? formattedDate === filter : formattedDate.includes(filter);
            }
            return exactMatch ? cellText === filter : cellText.includes(filter);
        });
    });

    currentPage = 1;
    renderTablePage(filteredRows, currentPage);
    updatePaginationControls();

    document.getElementById('searchCount').textContent = `Resultados encontrados: ${filteredRows.length}`;
});

window.electronAPI.onUserLoggedIn((username) => {
    const userPanel = document.getElementById('loggedInUser');
    userPanel.textContent = `Usuario: ${username}`;
});

window.electronAPI.onLogClose((message) => {
    addLogEntry(message);
});



document.addEventListener('DOMContentLoaded', () => {
    window.electronAPI.onUserLoggedIn((username) => {
        const userPanel = document.getElementById('loggedInUser');
        if (userPanel) {
            userPanel.textContent = `Usuario: ${username}`;
        }
    });

    window.electronAPI.onAppOpened(() => {
        console.log('Aplicación abierta en main.html');
        // Aquí puedes cargar el contenido necesario para main.html
    });
});
let currentPage = 1;
const rowsPerPage = 100;
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

document.getElementById('showScripts').addEventListener('click', () => {
    window.electronAPI.navigateToScripts();
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
    renderTablePage(filteredRows, currentPage, rowsPerPage, tableHeaders, document.getElementById('logContent'));
    updatePaginationControls();

    document.getElementById('searchCount').textContent = `Resultados encontrados: ${filteredRows.length}`;
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
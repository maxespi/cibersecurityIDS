function renderTablePage(rows, page, rowsPerPage, tableHeaders, logContentElement) {
    const start = (page - 1) * rowsPerPage;
    const end = start + rowsPerPage;
    const rowsToDisplay = rows.slice(start, end);

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
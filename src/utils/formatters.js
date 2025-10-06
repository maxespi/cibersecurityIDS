// src/utils/formatters.js

/**
 * Funciones de formateo reutilizables
 * Elimina duplicación de lógica de formateo en componentes
 */

/**
 * Formatea una fecha de manera legible
 */
function formatDate(date, options = {}) {
    if (!date) return 'N/A';

    const defaultOptions = {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        ...options
    };

    try {
        const dateObj = typeof date === 'string' ? new Date(date) : date;
        return dateObj.toLocaleDateString('es-ES', defaultOptions);
    } catch (error) {
        return 'Fecha inválida';
    }
}

/**
 * Formatea una fecha relativa (hace X tiempo)
 */
function formatRelativeDate(date) {
    if (!date) return 'N/A';

    try {
        const dateObj = typeof date === 'string' ? new Date(date) : date;
        const now = new Date();
        const diffMs = now - dateObj;
        const diffMinutes = Math.floor(diffMs / (1000 * 60));
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

        if (diffMinutes < 1) return 'Ahora mismo';
        if (diffMinutes < 60) return `Hace ${diffMinutes} minuto${diffMinutes > 1 ? 's' : ''}`;
        if (diffHours < 24) return `Hace ${diffHours} hora${diffHours > 1 ? 's' : ''}`;
        if (diffDays < 7) return `Hace ${diffDays} día${diffDays > 1 ? 's' : ''}`;

        return formatDate(dateObj, { year: 'numeric', month: 'short', day: 'numeric' });
    } catch (error) {
        return 'Fecha inválida';
    }
}

/**
 * Formatea números grandes con separadores de miles
 */
function formatNumber(number) {
    if (typeof number !== 'number') return 'N/A';
    return number.toLocaleString('es-ES');
}

/**
 * Formatea bytes en unidades legibles
 */
function formatBytes(bytes, decimals = 2) {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];

    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

/**
 * Capitaliza la primera letra de una cadena
 */
function capitalize(str) {
    if (!str || typeof str !== 'string') return '';
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

/**
 * Trunca texto con elipsis
 */
function truncateText(text, maxLength = 50) {
    if (!text || typeof text !== 'string') return '';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
}

/**
 * Formatea una dirección IP para mostrar
 */
function formatIP(ip) {
    if (!ip || typeof ip !== 'string') return 'IP inválida';

    // Validar formato básico de IP
    const ipRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
    if (!ipRegex.test(ip)) return 'IP inválida';

    return ip;
}

/**
 * Formatea un nivel de amenaza con color
 */
function formatThreatLevel(level) {
    const levels = {
        low: { text: 'Bajo', color: 'green' },
        medium: { text: 'Medio', color: 'yellow' },
        high: { text: 'Alto', color: 'orange' },
        critical: { text: 'Crítico', color: 'red' }
    };

    return levels[level] || { text: 'Desconocido', color: 'gray' };
}

/**
 * Formatea un estado booleano a texto
 */
function formatBoolean(value, trueText = 'Sí', falseText = 'No') {
    if (typeof value !== 'boolean') return 'N/A';
    return value ? trueText : falseText;
}

/**
 * Formatea duración en milisegundos a texto legible
 */
function formatDuration(ms) {
    if (typeof ms !== 'number' || ms < 0) return 'N/A';

    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ${hours % 24}h`;
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
}

/**
 * Formatea un código de país a nombre
 */
function formatCountryCode(code) {
    const countries = {
        'ES': 'España',
        'US': 'Estados Unidos',
        'CN': 'China',
        'RU': 'Rusia',
        'GB': 'Reino Unido',
        'DE': 'Alemania',
        'FR': 'Francia',
        'IT': 'Italia',
        'BR': 'Brasil',
        'MX': 'México',
        'AR': 'Argentina',
        'CO': 'Colombia',
        'PE': 'Perú',
        'CL': 'Chile'
    };

    return countries[code] || code || 'Desconocido';
}

/**
 * Formatea estado de firewall
 */
function formatFirewallStatus(status) {
    const statuses = {
        'detected': { text: 'Detectado', color: 'blue' },
        'blocked': { text: 'Bloqueado', color: 'red' },
        'ignored': { text: 'Ignorado', color: 'gray' },
        'allowed': { text: 'Permitido', color: 'green' }
    };

    return statuses[status] || { text: capitalize(status), color: 'gray' };
}

module.exports = {
    formatDate,
    formatRelativeDate,
    formatNumber,
    formatBytes,
    capitalize,
    truncateText,
    formatIP,
    formatThreatLevel,
    formatBoolean,
    formatDuration,
    formatCountryCode,
    formatFirewallStatus
};
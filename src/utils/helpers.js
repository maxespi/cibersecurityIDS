// src/utils/helpers.js
const logger = require('./logger');

/**
 * Funciones helper reutilizables
 * Elimina duplicación de lógica común en toda la aplicación
 */

/**
 * Debounce function para optimizar llamadas frecuentes
 */
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

/**
 * Throttle function para limitar llamadas por tiempo
 */
function throttle(func, limit) {
    let inThrottle;
    return function executedFunction(...args) {
        if (!inThrottle) {
            func.apply(this, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}

/**
 * Pausa la ejecución por un tiempo determinado
 */
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Retry function para reintentar operaciones fallidas
 */
async function retry(operation, maxAttempts = 3, delay = 1000) {
    let lastError;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
            return await operation();
        } catch (error) {
            lastError = error;
            logger.warn(`Intento ${attempt} fallido`, {
                operation: operation.name,
                error: error.message
            });

            if (attempt < maxAttempts) {
                await sleep(delay * attempt); // Exponential backoff
            }
        }
    }

    throw lastError;
}

/**
 * Agrupa elementos de un array por una propiedad
 */
function groupBy(array, key) {
    return array.reduce((groups, item) => {
        const group = typeof key === 'function' ? key(item) : item[key];
        groups[group] = groups[group] || [];
        groups[group].push(item);
        return groups;
    }, {});
}

/**
 * Elimina duplicados de un array por una propiedad
 */
function uniqueBy(array, key) {
    const seen = new Set();
    return array.filter(item => {
        const keyValue = typeof key === 'function' ? key(item) : item[key];
        return seen.has(keyValue) ? false : seen.add(keyValue);
    });
}

/**
 * Ordena array por múltiples criterios
 */
function sortBy(array, ...criteria) {
    return array.slice().sort((a, b) => {
        for (const criterion of criteria) {
            let aVal, bVal, reverse = false;

            if (typeof criterion === 'string') {
                aVal = a[criterion];
                bVal = b[criterion];
            } else if (typeof criterion === 'function') {
                aVal = criterion(a);
                bVal = criterion(b);
            } else if (criterion.key) {
                aVal = typeof criterion.key === 'function' ? criterion.key(a) : a[criterion.key];
                bVal = typeof criterion.key === 'function' ? criterion.key(b) : b[criterion.key];
                reverse = criterion.reverse || false;
            }

            if (aVal < bVal) return reverse ? 1 : -1;
            if (aVal > bVal) return reverse ? -1 : 1;
        }
        return 0;
    });
}

/**
 * Clamp: restringe un valor entre min y max
 */
function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
}

/**
 * Genera un ID único simple
 */
function generateId(prefix = 'id') {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Verifica si un objeto está vacío
 */
function isEmpty(obj) {
    if (obj == null) return true;
    if (Array.isArray(obj)) return obj.length === 0;
    if (typeof obj === 'object') return Object.keys(obj).length === 0;
    if (typeof obj === 'string') return obj.trim().length === 0;
    return false;
}

/**
 * Deep clone de un objeto
 */
function deepClone(obj) {
    if (obj === null || typeof obj !== 'object') return obj;
    if (obj instanceof Date) return new Date(obj.getTime());
    if (obj instanceof Array) return obj.map(item => deepClone(item));
    if (typeof obj === 'object') {
        const cloned = {};
        Object.keys(obj).forEach(key => {
            cloned[key] = deepClone(obj[key]);
        });
        return cloned;
    }
    return obj;
}

/**
 * Merge profundo de objetos
 */
function deepMerge(target, ...sources) {
    if (!sources.length) return target;
    const source = sources.shift();

    if (isObject(target) && isObject(source)) {
        for (const key in source) {
            if (isObject(source[key])) {
                if (!target[key]) Object.assign(target, { [key]: {} });
                deepMerge(target[key], source[key]);
            } else {
                Object.assign(target, { [key]: source[key] });
            }
        }
    }

    return deepMerge(target, ...sources);
}

/**
 * Verifica si un valor es un objeto plano
 */
function isObject(item) {
    return item && typeof item === 'object' && !Array.isArray(item);
}

/**
 * Obtiene el valor de una propiedad anidada de forma segura
 */
function get(obj, path, defaultValue = undefined) {
    const keys = Array.isArray(path) ? path : path.split('.');
    let result = obj;

    for (const key of keys) {
        if (result == null || typeof result !== 'object') {
            return defaultValue;
        }
        result = result[key];
    }

    return result !== undefined ? result : defaultValue;
}

/**
 * Establece el valor de una propiedad anidada
 */
function set(obj, path, value) {
    const keys = Array.isArray(path) ? path : path.split('.');
    const lastKey = keys.pop();
    let current = obj;

    for (const key of keys) {
        if (!(key in current) || typeof current[key] !== 'object') {
            current[key] = {};
        }
        current = current[key];
    }

    current[lastKey] = value;
    return obj;
}

/**
 * Filtra un array de objetos por múltiples criterios
 */
function filterBy(array, filters) {
    return array.filter(item => {
        return Object.entries(filters).every(([key, value]) => {
            const itemValue = get(item, key);

            if (Array.isArray(value)) {
                return value.includes(itemValue);
            }

            if (typeof value === 'function') {
                return value(itemValue);
            }

            if (typeof value === 'object' && value.regex) {
                return new RegExp(value.regex, value.flags || 'i').test(itemValue);
            }

            return itemValue === value;
        });
    });
}

/**
 * Convierte un objeto en query string
 */
function toQueryString(obj) {
    return Object.entries(obj)
        .filter(([, value]) => value !== undefined && value !== null)
        .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
        .join('&');
}

/**
 * Convierte query string en objeto
 */
function fromQueryString(queryString) {
    const params = new URLSearchParams(queryString);
    const result = {};

    for (const [key, value] of params.entries()) {
        result[key] = value;
    }

    return result;
}

module.exports = {
    debounce,
    throttle,
    sleep,
    retry,
    groupBy,
    uniqueBy,
    sortBy,
    clamp,
    generateId,
    isEmpty,
    deepClone,
    deepMerge,
    isObject,
    get,
    set,
    filterBy,
    toQueryString,
    fromQueryString
};
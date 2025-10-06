// src/services/APIService.js
const logger = require('../utils/logger');
const { retry } = require('../utils/helpers');

/**
 * Servicio centralizado para todas las llamadas a APIs
 * Elimina duplicación de lógica de red en toda la aplicación
 */
class APIService {
    constructor() {
        this.defaultTimeout = 5000;
        this.defaultRetries = 3;
    }

    /**
     * Realiza una petición HTTP genérica
     */
    async request(url, options = {}) {
        const {
            method = 'GET',
            timeout = this.defaultTimeout,
            retries = this.defaultRetries,
            headers = {},
            body = null,
            ...fetchOptions
        } = options;

        const requestOptions = {
            method,
            headers: {
                'Content-Type': 'application/json',
                'User-Agent': 'CyberSecurity-IDS/1.0',
                ...headers
            },
            timeout,
            ...fetchOptions
        };

        if (body && ['POST', 'PUT', 'PATCH'].includes(method.toUpperCase())) {
            requestOptions.body = typeof body === 'string' ? body : JSON.stringify(body);
        }

        const makeRequest = async () => {
            try {
                logger.debug('Realizando petición HTTP', { url, method });

                const response = await fetch(url, requestOptions);

                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }

                const contentType = response.headers.get('content-type');
                let data;

                if (contentType && contentType.includes('application/json')) {
                    data = await response.json();
                } else {
                    data = await response.text();
                }

                logger.debug('Petición HTTP exitosa', {
                    url,
                    method,
                    status: response.status
                });

                return {
                    success: true,
                    data,
                    status: response.status,
                    headers: Object.fromEntries(response.headers.entries())
                };

            } catch (error) {
                logger.error('Error en petición HTTP', {
                    url,
                    method,
                    error: error.message
                });

                throw error;
            }
        };

        try {
            return await retry(makeRequest, retries, 1000);
        } catch (error) {
            return {
                success: false,
                error: error.message || 'Error desconocido en petición HTTP',
                url,
                method
            };
        }
    }

    /**
     * GET request
     */
    async get(url, options = {}) {
        return this.request(url, { ...options, method: 'GET' });
    }

    /**
     * POST request
     */
    async post(url, body, options = {}) {
        return this.request(url, { ...options, method: 'POST', body });
    }

    /**
     * PUT request
     */
    async put(url, body, options = {}) {
        return this.request(url, { ...options, method: 'PUT', body });
    }

    /**
     * DELETE request
     */
    async delete(url, options = {}) {
        return this.request(url, { ...options, method: 'DELETE' });
    }

    /**
     * PATCH request
     */
    async patch(url, body, options = {}) {
        return this.request(url, { ...options, method: 'PATCH', body });
    }

    /**
     * Descarga un archivo
     */
    async downloadFile(url, options = {}) {
        try {
            const response = await this.request(url, {
                ...options,
                method: 'GET'
            });

            if (!response.success) {
                return response;
            }

            return {
                success: true,
                data: response.data,
                filename: this.extractFilename(response.headers, url),
                contentType: response.headers['content-type'] || 'application/octet-stream'
            };

        } catch (error) {
            logger.error('Error descargando archivo', { url, error: error.message });
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Extrae el nombre del archivo de los headers o URL
     */
    extractFilename(headers, url) {
        // Intentar extraer de Content-Disposition header
        const disposition = headers['content-disposition'];
        if (disposition) {
            const filenameMatch = disposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
            if (filenameMatch && filenameMatch[1]) {
                return filenameMatch[1].replace(/['"]/g, '');
            }
        }

        // Fallback: extraer de la URL
        const urlParts = url.split('/');
        return urlParts[urlParts.length - 1] || 'downloaded_file';
    }

    /**
     * Realiza múltiples peticiones en paralelo
     */
    async requestAll(requests, options = {}) {
        const { concurrency = 5 } = options;

        const executeRequest = async (request) => {
            const { url, options: reqOptions = {} } = request;
            const result = await this.request(url, reqOptions);
            return { ...result, originalRequest: request };
        };

        // Ejecutar en lotes para controlar concurrencia
        const results = [];
        for (let i = 0; i < requests.length; i += concurrency) {
            const batch = requests.slice(i, i + concurrency);
            const batchResults = await Promise.all(batch.map(executeRequest));
            results.push(...batchResults);
        }

        const successful = results.filter(r => r.success);
        const failed = results.filter(r => !r.success);

        logger.info('Peticiones múltiples completadas', {
            total: requests.length,
            successful: successful.length,
            failed: failed.length
        });

        return {
            results,
            successful,
            failed,
            stats: {
                total: requests.length,
                successful: successful.length,
                failed: failed.length,
                successRate: (successful.length / requests.length) * 100
            }
        };
    }

    /**
     * Interceptor para requests (middleware)
     */
    addRequestInterceptor(interceptor) {
        // TODO: Implementar sistema de interceptors si es necesario
        logger.debug('Request interceptor agregado');
    }

    /**
     * Interceptor para responses (middleware)
     */
    addResponseInterceptor(interceptor) {
        // TODO: Implementar sistema de interceptors si es necesario
        logger.debug('Response interceptor agregado');
    }

    /**
     * Configura timeouts por defecto
     */
    setDefaultTimeout(timeout) {
        this.defaultTimeout = timeout;
        logger.debug('Timeout por defecto actualizado', { timeout });
    }

    /**
     * Configura reintentos por defecto
     */
    setDefaultRetries(retries) {
        this.defaultRetries = retries;
        logger.debug('Reintentos por defecto actualizados', { retries });
    }

    /**
     * Verifica la conectividad de red
     */
    async checkConnectivity(url = 'https://www.google.com', timeout = 3000) {
        try {
            const result = await this.get(url, { timeout, retries: 1 });
            return {
                online: result.success,
                latency: result.success ? Date.now() - performance.now() : null
            };
        } catch (error) {
            return {
                online: false,
                error: error.message
            };
        }
    }

    /**
     * Obtiene estadísticas de rendimiento
     */
    getStats() {
        // TODO: Implementar tracking de estadísticas si es necesario
        return {
            requests: 0,
            successful: 0,
            failed: 0,
            averageResponseTime: 0
        };
    }
}

// Singleton instance
const apiService = new APIService();

module.exports = apiService;
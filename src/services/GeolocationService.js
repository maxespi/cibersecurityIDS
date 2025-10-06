// src/services/GeolocationService.js
const fetch = require('node-fetch');
const logger = require('../utils/logger');
const { API } = require('../config/constants');

/**
 * Servicio centralizado para operaciones de geolocalización
 * Maneja rate limiting y cache para optimizar consultas
 */
class GeolocationService {
    constructor() {
        this.cache = new Map();
        this.lastRequest = 0;
        this.requestCount = 0;
        this.requestWindow = 60000; // 1 minuto
    }

    /**
     * Obtiene información de geolocalización para una IP
     */
    async getLocation(ip) {
        try {
            // Verificar cache primero
            if (this.cache.has(ip)) {
                const cached = this.cache.get(ip);
                logger.debug('Geolocalización obtenida del cache', { ip });
                return { success: true, data: cached };
            }

            // Verificar rate limiting
            if (!this.canMakeRequest()) {
                logger.warn('Rate limit alcanzado para geolocalización', { ip });
                return {
                    success: false,
                    error: 'Rate limit alcanzado. Intente más tarde.'
                };
            }

            // Realizar consulta
            const response = await fetch(`${API.GEOLOCATION.BASE_URL}${ip}`, {
                timeout: API.GEOLOCATION.TIMEOUT,
                headers: {
                    'User-Agent': 'CyberSecurity-IDS/1.0'
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();

            // Validar respuesta
            if (data.status === 'fail') {
                logger.warn('Geolocalización fallida', { ip, error: data.message });
                return { success: false, error: data.message || 'IP no válida' };
            }

            // Normalizar datos
            const locationData = {
                ip: data.query || ip,
                country: data.country || 'Desconocido',
                countryCode: data.countryCode || '',
                region: data.regionName || '',
                city: data.city || 'Desconocido',
                zip: data.zip || '',
                lat: data.lat || 0,
                lon: data.lon || 0,
                timezone: data.timezone || '',
                isp: data.isp || 'Desconocido',
                org: data.org || '',
                as: data.as || '',
                mobile: data.mobile || false,
                proxy: data.proxy || false,
                hosting: data.hosting || false,
                timestamp: new Date().toISOString()
            };

            // Guardar en cache
            this.cache.set(ip, locationData);

            // Limpiar cache si es muy grande
            if (this.cache.size > 1000) {
                this.cleanupCache();
            }

            this.updateRequestTracking();

            logger.info('Geolocalización obtenida exitosamente', {
                ip,
                country: locationData.country,
                city: locationData.city
            });

            return { success: true, data: locationData };

        } catch (error) {
            logger.error('Error obteniendo geolocalización', {
                ip,
                error: error.message
            });

            return {
                success: false,
                error: error.message || 'Error desconocido en geolocalización'
            };
        }
    }

    /**
     * Obtiene geolocalización para múltiples IPs
     */
    async getMultipleLocations(ips, delayMs = 1500) {
        const results = [];

        for (const ip of ips) {
            const result = await this.getLocation(ip);
            results.push({ ip, ...result });

            // Delay entre requests para respetar rate limits
            if (delayMs > 0) {
                await new Promise(resolve => setTimeout(resolve, delayMs));
            }
        }

        logger.info('Geolocalización múltiple completada', {
            total: ips.length,
            successful: results.filter(r => r.success).length
        });

        return results;
    }

    /**
     * Verifica si se puede hacer una request considerando rate limits
     */
    canMakeRequest() {
        const now = Date.now();

        // Reset counter si ha pasado la ventana de tiempo
        if (now - this.lastRequest > this.requestWindow) {
            this.requestCount = 0;
        }

        return this.requestCount < API.GEOLOCATION.RATE_LIMIT;
    }

    /**
     * Actualiza el tracking de requests
     */
    updateRequestTracking() {
        const now = Date.now();

        if (now - this.lastRequest > this.requestWindow) {
            this.requestCount = 1;
        } else {
            this.requestCount++;
        }

        this.lastRequest = now;
    }

    /**
     * Limpia el cache eliminando entradas más antiguas
     */
    cleanupCache() {
        const entries = Array.from(this.cache.entries());

        // Mantener solo las últimas 500 entradas
        const entriesToKeep = entries.slice(-500);

        this.cache.clear();
        entriesToKeep.forEach(([key, value]) => {
            this.cache.set(key, value);
        });

        logger.debug('Cache de geolocalización limpiado', {
            remaining: this.cache.size
        });
    }

    /**
     * Obtiene estadísticas del servicio
     */
    getStats() {
        return {
            cacheSize: this.cache.size,
            requestCount: this.requestCount,
            canMakeRequest: this.canMakeRequest(),
            lastRequest: this.lastRequest
        };
    }

    /**
     * Limpia el cache completamente
     */
    clearCache() {
        this.cache.clear();
        logger.info('Cache de geolocalización limpiado completamente');
    }

    /**
     * Valida si una IP es válida para geolocalización
     */
    isValidIP(ip) {
        // IPs privadas no se pueden geolocalizar
        const privateRanges = [
            /^10\./,
            /^172\.(1[6-9]|2[0-9]|3[01])\./,
            /^192\.168\./,
            /^127\./,
            /^169\.254\./
        ];

        return !privateRanges.some(range => range.test(ip));
    }
}

// Singleton instance
const geolocationService = new GeolocationService();

module.exports = geolocationService;
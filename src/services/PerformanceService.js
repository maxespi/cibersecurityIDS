// src/services/PerformanceService.js
const logger = require('../utils/logger');
const { debounce, throttle } = require('../utils/helpers');

/**
 * Servicio de optimización de rendimiento
 * Implementa técnicas de optimización para mejorar la performance de la aplicación
 */
class PerformanceService {
    constructor() {
        this.metrics = new Map();
        this.memoryUsage = [];
        this.cpuUsage = [];
        this.requestCount = 0;
        this.isMonitoring = false;

        // Funciones throttled para operaciones frecuentes
        this.logPerformanceThrottled = throttle(this.logPerformance.bind(this), 10000); // 10 segundos
        this.cleanupMemoryThrottled = throttle(this.cleanupMemory.bind(this), 30000); // 30 segundos
    }

    /**
     * Inicia el monitoreo de rendimiento
     */
    startMonitoring() {
        if (this.isMonitoring) return;

        this.isMonitoring = true;
        logger.info('📊 Monitoreo de rendimiento iniciado');

        // Monitorear cada 30 segundos
        this.monitoringInterval = setInterval(() => {
            this.collectMetrics();
            this.checkMemoryUsage();
            this.cleanupMemoryThrottled();
        }, 30000);

        // Limpieza de métricas cada 5 minutos
        this.cleanupInterval = setInterval(() => {
            this.cleanupOldMetrics();
        }, 300000);
    }

    /**
     * Detiene el monitoreo de rendimiento
     */
    stopMonitoring() {
        if (!this.isMonitoring) return;

        this.isMonitoring = false;

        if (this.monitoringInterval) {
            clearInterval(this.monitoringInterval);
        }

        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
        }

        logger.info('📊 Monitoreo de rendimiento detenido');
    }

    /**
     * Recolecta métricas del sistema
     */
    collectMetrics() {
        try {
            const memUsage = process.memoryUsage();
            const cpuUsage = process.cpuUsage();

            // Almacenar métricas de memoria
            this.memoryUsage.push({
                timestamp: Date.now(),
                rss: memUsage.rss,
                heapUsed: memUsage.heapUsed,
                heapTotal: memUsage.heapTotal,
                external: memUsage.external
            });

            // Almacenar métricas de CPU
            this.cpuUsage.push({
                timestamp: Date.now(),
                user: cpuUsage.user,
                system: cpuUsage.system
            });

            // Mantener solo las últimas 100 métricas
            if (this.memoryUsage.length > 100) {
                this.memoryUsage = this.memoryUsage.slice(-100);
            }

            if (this.cpuUsage.length > 100) {
                this.cpuUsage = this.cpuUsage.slice(-100);
            }

        } catch (error) {
            logger.error('Error recolectando métricas', { error: error.message });
        }
    }

    /**
     * Verifica el uso de memoria y alerta si es alto
     */
    checkMemoryUsage() {
        const memUsage = process.memoryUsage();
        const heapUsedMB = memUsage.heapUsed / 1024 / 1024;
        const rssMB = memUsage.rss / 1024 / 1024;

        // Alertar si el uso de memoria es muy alto
        if (heapUsedMB > 100) { // Más de 100MB
            logger.warn('Uso de memoria heap alto', {
                heapUsed: `${heapUsedMB.toFixed(2)} MB`,
                rss: `${rssMB.toFixed(2)} MB`
            });
        }

        if (rssMB > 200) { // Más de 200MB
            logger.warn('Uso de memoria RSS alto', {
                rss: `${rssMB.toFixed(2)} MB`,
                heap: `${heapUsedMB.toFixed(2)} MB`
            });

            // Intentar limpieza de memoria
            this.cleanupMemory();
        }
    }

    /**
     * Limpia memoria y ejecuta garbage collection
     */
    cleanupMemory() {
        try {
            // Forzar garbage collection si está disponible
            if (global.gc) {
                global.gc();
                logger.debug('Garbage collection ejecutado');
            }

            // Limpiar caches si existen
            this.clearCaches();

            const memUsage = process.memoryUsage();
            logger.debug('Limpieza de memoria completada', {
                heapUsed: `${(memUsage.heapUsed / 1024 / 1024).toFixed(2)} MB`,
                rss: `${(memUsage.rss / 1024 / 1024).toFixed(2)} MB`
            });

        } catch (error) {
            logger.error('Error en limpieza de memoria', { error: error.message });
        }
    }

    /**
     * Limpia caches de servicios
     */
    clearCaches() {
        try {
            // Limpiar cache de DatabaseService si existe
            const DatabaseService = require('./DatabaseService');
            if (DatabaseService.clearCache) {
                DatabaseService.clearCache();
            }

            // Limpiar cache de GeolocationService si existe
            const GeolocationService = require('./GeolocationService');
            if (GeolocationService.clearCache) {
                GeolocationService.clearCache();
            }

            logger.debug('Caches de servicios limpiados');

        } catch (error) {
            logger.debug('Error limpiando caches', { error: error.message });
        }
    }

    /**
     * Mide el tiempo de ejecución de una función
     */
    static async measureExecutionTime(name, func) {
        const startTime = performance.now();

        try {
            const result = await func();
            const endTime = performance.now();
            const duration = endTime - startTime;

            logger.debug('Tiempo de ejecución medido', {
                operation: name,
                duration: `${duration.toFixed(2)}ms`
            });

            return { result, duration };

        } catch (error) {
            const endTime = performance.now();
            const duration = endTime - startTime;

            logger.error('Error en operación medida', {
                operation: name,
                duration: `${duration.toFixed(2)}ms`,
                error: error.message
            });

            throw error;
        }
    }

    /**
     * Ejecuta una función con retry y backoff exponencial
     */
    static async executeWithRetry(func, maxRetries = 3, baseDelay = 1000) {
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                return await func();
            } catch (error) {
                if (attempt === maxRetries) {
                    throw error;
                }

                const delay = baseDelay * Math.pow(2, attempt - 1);
                logger.warn(`Intento ${attempt} fallido, reintentando en ${delay}ms`, {
                    error: error.message
                });

                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
    }

    /**
     * Crea una versión optimizada de una función con cache
     */
    static createCachedFunction(func, cacheTimeout = 60000) {
        const cache = new Map();

        return async (...args) => {
            const key = JSON.stringify(args);
            const cached = cache.get(key);

            if (cached && Date.now() - cached.timestamp < cacheTimeout) {
                return cached.result;
            }

            const result = await func(...args);

            cache.set(key, {
                result,
                timestamp: Date.now()
            });

            // Limpiar cache si es muy grande
            if (cache.size > 50) {
                const entries = Array.from(cache.entries());
                const oldEntries = entries.filter(([, value]) =>
                    Date.now() - value.timestamp > cacheTimeout
                );

                oldEntries.forEach(([key]) => cache.delete(key));
            }

            return result;
        };
    }

    /**
     * Optimiza el procesamiento de arrays grandes
     */
    static async processLargeArray(array, processor, batchSize = 100) {
        const results = [];

        for (let i = 0; i < array.length; i += batchSize) {
            const batch = array.slice(i, i + batchSize);

            // Procesar lote
            const batchResults = await Promise.all(
                batch.map(item => processor(item))
            );

            results.push(...batchResults);

            // Pequeña pausa entre lotes para no bloquear el event loop
            if (i + batchSize < array.length) {
                await new Promise(resolve => setImmediate(resolve));
            }
        }

        return results;
    }

    /**
     * Crea funciones debounced para operaciones frecuentes
     */
    static createDebouncedFunction(func, delay = 300) {
        return debounce(func, delay);
    }

    /**
     * Crea funciones throttled para operaciones de alta frecuencia
     */
    static createThrottledFunction(func, limit = 1000) {
        return throttle(func, limit);
    }

    /**
     * Obtiene estadísticas de rendimiento
     */
    getPerformanceStats() {
        const memUsage = process.memoryUsage();
        const cpuUsage = process.cpuUsage();

        // Calcular promedios de memoria de los últimos datos
        const recentMemory = this.memoryUsage.slice(-10);
        const avgHeapUsed = recentMemory.length > 0
            ? recentMemory.reduce((sum, m) => sum + m.heapUsed, 0) / recentMemory.length
            : memUsage.heapUsed;

        return {
            memory: {
                current: {
                    rss: Math.round(memUsage.rss / 1024 / 1024 * 100) / 100,
                    heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024 * 100) / 100,
                    heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024 * 100) / 100,
                    external: Math.round(memUsage.external / 1024 / 1024 * 100) / 100
                },
                average: {
                    heapUsed: Math.round(avgHeapUsed / 1024 / 1024 * 100) / 100
                }
            },
            cpu: {
                user: cpuUsage.user,
                system: cpuUsage.system
            },
            uptime: process.uptime(),
            requests: this.requestCount,
            monitoring: this.isMonitoring
        };
    }

    /**
     * Registra el rendimiento actual
     */
    logPerformance() {
        const stats = this.getPerformanceStats();

        logger.info('📊 Estadísticas de rendimiento', {
            memory: `${stats.memory.current.heapUsed}MB heap, ${stats.memory.current.rss}MB RSS`,
            uptime: `${Math.round(stats.uptime)}s`,
            requests: stats.requests
        });
    }

    /**
     * Incrementa el contador de requests
     */
    incrementRequestCount() {
        this.requestCount++;

        // Log throttled cada cierto número de requests
        if (this.requestCount % 100 === 0) {
            this.logPerformanceThrottled();
        }
    }

    /**
     * Limpia métricas antiguas
     */
    cleanupOldMetrics() {
        const maxAge = 60 * 60 * 1000; // 1 hora
        const now = Date.now();

        this.memoryUsage = this.memoryUsage.filter(
            metric => now - metric.timestamp < maxAge
        );

        this.cpuUsage = this.cpuUsage.filter(
            metric => now - metric.timestamp < maxAge
        );

        logger.debug('Métricas antiguas limpiadas', {
            memoryMetrics: this.memoryUsage.length,
            cpuMetrics: this.cpuUsage.length
        });
    }

    /**
     * Optimiza la configuración de Node.js
     */
    static optimizeNodeJS() {
        // Configurar límites de memoria si es necesario
        if (process.env.NODE_ENV === 'production') {
            // Configuraciones de producción
            process.setMaxListeners(20);
        }

        logger.info('🚀 Optimizaciones de Node.js aplicadas');
    }
}

module.exports = PerformanceService;
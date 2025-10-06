// src/services/DatabaseService.js
const { Op } = require('sequelize');
const logger = require('../utils/logger');
const { DATABASE } = require('../config/constants');

/**
 * Servicio optimizado para operaciones de base de datos
 * Implementa patrones de optimización y cache para mejor rendimiento
 */
class DatabaseService {
    constructor() {
        this.queryCache = new Map();
        this.cacheTimeout = 5 * 60 * 1000; // 5 minutos
        this.batchSize = 100;
    }

    /**
     * Operaciones optimizadas para DetectedIP
     */
    static get DetectedIPQueries() {
        return {
            /**
             * Busca IPs con joins optimizados
             */
            async findWithStats(options = {}) {
                const {
                    limit = 100,
                    offset = 0,
                    status = null,
                    threatLevel = null,
                    sortBy = 'lastSeen',
                    sortOrder = 'DESC'
                } = options;

                const DetectedIP = require('../../db/models/DetectedIP');

                const where = {};
                if (status) where.status = status;
                if (threatLevel) where.threatLevel = threatLevel;

                try {
                    const result = await DetectedIP.findAndCountAll({
                        where,
                        limit,
                        offset,
                        order: [[sortBy, sortOrder]],
                        attributes: [
                            'id', 'ip', 'firstDetected', 'lastSeen',
                            'attempts', 'status', 'threatLevel', 'country', 'city'
                        ]
                    });

                    logger.debug('IPs detectadas obtenidas con estadísticas', {
                        count: result.count,
                        returned: result.rows.length
                    });

                    return {
                        success: true,
                        data: result.rows,
                        total: result.count,
                        pagination: {
                            limit,
                            offset,
                            totalPages: Math.ceil(result.count / limit)
                        }
                    };

                } catch (error) {
                    logger.error('Error obteniendo IPs detectadas', { error: error.message });
                    return { success: false, error: error.message };
                }
            },

            /**
             * Actualiza estado de múltiples IPs en lote
             */
            async updateBulkStatus(ips, status, additionalData = {}) {
                const DetectedIP = require('../../db/models/DetectedIP');

                try {
                    const updateData = { status, ...additionalData };
                    if (status === 'blocked') {
                        updateData.blockedAt = new Date();
                    }

                    const [affectedCount] = await DetectedIP.update(updateData, {
                        where: {
                            ip: { [Op.in]: ips }
                        }
                    });

                    logger.info('Estado actualizado en lote', {
                        ips: ips.length,
                        affected: affectedCount,
                        status
                    });

                    return { success: true, affectedCount };

                } catch (error) {
                    logger.error('Error actualizando estado en lote', { error: error.message });
                    return { success: false, error: error.message };
                }
            },

            /**
             * Obtiene estadísticas agregadas
             */
            async getAggregatedStats() {
                const DetectedIP = require('../../db/models/DetectedIP');
                const sequelize = require('../../db/config/db');

                try {
                    const result = await DetectedIP.findAll({
                        attributes: [
                            'status',
                            'threatLevel',
                            [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
                            [sequelize.fn('SUM', sequelize.col('attempts')), 'totalAttempts']
                        ],
                        group: ['status', 'threatLevel'],
                        raw: true
                    });

                    const stats = {
                        byStatus: {},
                        byThreatLevel: {},
                        total: 0,
                        totalAttempts: 0
                    };

                    result.forEach(row => {
                        const count = parseInt(row.count) || 0;
                        const attempts = parseInt(row.totalAttempts) || 0;

                        stats.byStatus[row.status] = (stats.byStatus[row.status] || 0) + count;
                        stats.byThreatLevel[row.threatLevel] = (stats.byThreatLevel[row.threatLevel] || 0) + count;
                        stats.total += count;
                        stats.totalAttempts += attempts;
                    });

                    return { success: true, data: stats };

                } catch (error) {
                    logger.error('Error obteniendo estadísticas agregadas', { error: error.message });
                    return { success: false, error: error.message };
                }
            }
        };
    }

    /**
     * Operaciones optimizadas para WhitelistIP
     */
    static get WhitelistQueries() {
        return {
            /**
             * Obtiene whitelist activa con cache
             */
            async getActiveIPs() {
                const WhitelistIP = require('../../db/models/WhitelistIP');

                try {
                    const ips = await WhitelistIP.findAll({
                        where: { active: true },
                        attributes: ['ip', 'description', 'createdAt'],
                        order: [['createdAt', 'DESC']]
                    });

                    const ipSet = new Set(ips.map(item => item.ip));

                    logger.debug('Whitelist obtenida', { count: ipSet.size });

                    return {
                        success: true,
                        data: ips,
                        ipSet
                    };

                } catch (error) {
                    logger.error('Error obteniendo whitelist', { error: error.message });
                    return { success: false, error: error.message };
                }
            },

            /**
             * Agrega múltiples IPs a whitelist
             */
            async addBulkIPs(ips, description = 'Agregado en lote') {
                const WhitelistIP = require('../../db/models/WhitelistIP');

                try {
                    const records = ips.map(ip => ({
                        ip,
                        description,
                        active: true,
                        createdAt: new Date(),
                        updatedAt: new Date()
                    }));

                    const result = await WhitelistIP.bulkCreate(records, {
                        ignoreDuplicates: true
                    });

                    logger.info('IPs agregadas a whitelist en lote', { count: result.length });

                    return { success: true, addedCount: result.length };

                } catch (error) {
                    logger.error('Error agregando IPs a whitelist', { error: error.message });
                    return { success: false, error: error.message };
                }
            }
        };
    }

    /**
     * Operaciones optimizadas para WindowsEvent
     */
    static get WindowsEventQueries() {
        return {
            /**
             * Obtiene eventos recientes con paginación
             */
            async getRecent(options = {}) {
                const {
                    limit = 50,
                    offset = 0,
                    hours = 24,
                    eventId = null,
                    sourceIP = null
                } = options;

                const WindowsEvent = require('../../db/models/WindowsEvent');

                const where = {
                    timestamp: {
                        [Op.gte]: new Date(Date.now() - hours * 60 * 60 * 1000)
                    }
                };

                if (eventId) where.eventId = eventId;
                if (sourceIP) where.sourceIP = sourceIP;

                try {
                    const result = await WindowsEvent.findAndCountAll({
                        where,
                        limit,
                        offset,
                        order: [['timestamp', 'DESC']],
                        attributes: [
                            'id', 'timestamp', 'sourceIP', 'username',
                            'domain', 'eventId', 'logonType'
                        ]
                    });

                    return {
                        success: true,
                        data: result.rows,
                        total: result.count
                    };

                } catch (error) {
                    logger.error('Error obteniendo eventos recientes', { error: error.message });
                    return { success: false, error: error.message };
                }
            },

            /**
             * Limpia eventos antiguos
             */
            async cleanupOldEvents(daysToKeep = 30) {
                const WindowsEvent = require('../../db/models/WindowsEvent');

                try {
                    const cutoffDate = new Date(Date.now() - daysToKeep * 24 * 60 * 60 * 1000);

                    const deletedCount = await WindowsEvent.destroy({
                        where: {
                            timestamp: {
                                [Op.lt]: cutoffDate
                            }
                        }
                    });

                    logger.info('Eventos antiguos limpiados', {
                        deletedCount,
                        cutoffDate: cutoffDate.toISOString()
                    });

                    return { success: true, deletedCount };

                } catch (error) {
                    logger.error('Error limpiando eventos antiguos', { error: error.message });
                    return { success: false, error: error.message };
                }
            }
        };
    }

    /**
     * Operaciones de mantenimiento de base de datos
     */
    static get MaintenanceQueries() {
        return {
            /**
             * Ejecuta mantenimiento de base de datos
             */
            async performMaintenance() {
                const sequelize = require('../../db/config/db');

                try {
                    logger.info('🔧 Iniciando mantenimiento de base de datos');

                    // 1. Limpiar eventos antiguos (más de 30 días)
                    const eventCleanup = await this.WindowsEventQueries.cleanupOldEvents(30);

                    // 2. Actualizar estadísticas de IPs detectadas
                    await this.updateDetectedIPStats();

                    // 3. Optimizar base de datos (SQLite)
                    if (DATABASE.DIALECT === 'sqlite') {
                        await sequelize.query('VACUUM');
                        await sequelize.query('ANALYZE');
                        logger.info('Base de datos SQLite optimizada');
                    }

                    logger.info('✅ Mantenimiento de base de datos completado', {
                        eventsDeleted: eventCleanup.deletedCount
                    });

                    return { success: true };

                } catch (error) {
                    logger.error('Error en mantenimiento de base de datos', { error: error.message });
                    return { success: false, error: error.message };
                }
            },

            /**
             * Actualiza estadísticas de IPs detectadas
             */
            async updateDetectedIPStats() {
                const DetectedIP = require('../../db/models/DetectedIP');
                const WindowsEvent = require('../../db/models/WindowsEvent');
                const sequelize = require('../../db/config/db');

                try {
                    // Actualizar conteo de intentos basado en eventos
                    const query = `
                        UPDATE DetectedIPs
                        SET attempts = (
                            SELECT COUNT(*)
                            FROM WindowsEvents
                            WHERE WindowsEvents.sourceIP = DetectedIPs.ip
                        ),
                        lastSeen = (
                            SELECT MAX(timestamp)
                            FROM WindowsEvents
                            WHERE WindowsEvents.sourceIP = DetectedIPs.ip
                        )
                        WHERE EXISTS (
                            SELECT 1
                            FROM WindowsEvents
                            WHERE WindowsEvents.sourceIP = DetectedIPs.ip
                        )
                    `;

                    await sequelize.query(query);
                    logger.info('Estadísticas de IPs detectadas actualizadas');

                } catch (error) {
                    logger.error('Error actualizando estadísticas de IPs', { error: error.message });
                    throw error;
                }
            },

            /**
             * Obtiene estadísticas generales de la base de datos
             */
            async getGeneralStats() {
                const sequelize = require('../../db/config/db');

                try {
                    const [detectedCount] = await sequelize.query(
                        'SELECT COUNT(*) as count FROM DetectedIPs'
                    );

                    const [whitelistCount] = await sequelize.query(
                        'SELECT COUNT(*) as count FROM WhitelistIPs WHERE active = 1'
                    );

                    const [eventsCount] = await sequelize.query(
                        'SELECT COUNT(*) as count FROM WindowsEvents WHERE timestamp > datetime("now", "-24 hours")'
                    );

                    return {
                        success: true,
                        data: {
                            detectedIPs: detectedCount[0].count,
                            whitelistIPs: whitelistCount[0].count,
                            recentEvents: eventsCount[0].count,
                            timestamp: new Date().toISOString()
                        }
                    };

                } catch (error) {
                    logger.error('Error obteniendo estadísticas generales', { error: error.message });
                    return { success: false, error: error.message };
                }
            }
        };
    }

    /**
     * Cache de consultas para mejor rendimiento
     */
    static getCachedQuery(key, queryFunction, timeout = 300000) { // 5 minutos por defecto
        const cached = this.queryCache.get(key);

        if (cached && Date.now() - cached.timestamp < timeout) {
            logger.debug('Consulta obtenida del cache', { key });
            return Promise.resolve(cached.data);
        }

        return queryFunction().then(result => {
            this.queryCache.set(key, {
                data: result,
                timestamp: Date.now()
            });

            // Limpiar cache si es muy grande
            if (this.queryCache.size > 100) {
                this.clearOldCacheEntries();
            }

            return result;
        });
    }

    /**
     * Limpia entradas antiguas del cache
     */
    static clearOldCacheEntries() {
        const now = Date.now();
        const timeout = this.cacheTimeout;

        for (const [key, value] of this.queryCache) {
            if (now - value.timestamp > timeout) {
                this.queryCache.delete(key);
            }
        }

        logger.debug('Cache de consultas limpiado', {
            remaining: this.queryCache.size
        });
    }

    /**
     * Limpia todo el cache
     */
    static clearCache() {
        this.queryCache.clear();
        logger.info('Cache de consultas limpiado completamente');
    }
}

// Inicializar cache estático
DatabaseService.queryCache = new Map();
DatabaseService.cacheTimeout = 5 * 60 * 1000;

module.exports = DatabaseService;
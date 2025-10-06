// src/utils/scanForIpIn4625_optimized.js - Versión optimizada y simplificada
const { execSync } = require('child_process');
const { Op } = require('sequelize');

// Importar servicios centralizados
const logger = require('./logger');
const { retry } = require('./helpers');
const { WINDOWS_EVENTS, SECURITY, IS_DEVELOPMENT } = require('../config/constants');
const DevelopmentModeManager = require('./DevelopmentModeManager');

// Importar modelos
const DetectedIP = require('../../db/models/DetectedIP');
const WhitelistIP = require('../../db/models/WhitelistIP');
const WindowsEvent = require('../../db/models/WindowsEvent');

/**
 * Analizador de eventos Windows simplificado
 * Dividido en funciones pequeñas y especializadas para mejor mantenimiento
 */
class WindowsEventAnalyzer {
    constructor() {
        this.eventId = WINDOWS_EVENTS.EVENT_ID_FAILED_LOGON;
        this.maxEvents = WINDOWS_EVENTS.MAX_EVENTS_PER_SCAN;
        this.ipRegex = SECURITY.IP_VALIDATION_REGEX;
        this.devManager = new DevelopmentModeManager();
        this.featureConfig = this.devManager.getFeatureConfig();
    }

    /**
     * Función principal de análisis
     */
    async analyze() {
        try {
            logger.info('🔍 Iniciando análisis de eventos Windows 4625');

            // 1. Verificar compatibilidad del sistema
            const compatibility = await this.devManager.isSystemCompatible();
            if (!compatibility.compatible) {
                return this.createErrorResult(compatibility.message);
            }

            logger.info('🖥️ Sistema compatible detectado', {
                isServer: compatibility.isServer,
                devMode: this.featureConfig.mockData
            });

            // 2. Obtener whitelist
            const whitelistIPs = await this.getWhitelistIPs();
            logger.debug(`📋 Whitelist cargada: ${whitelistIPs.size} IPs`);

            // 3. Obtener eventos recientes (reales o simulados)
            const events = this.featureConfig.simulatedEvents && !this.featureConfig.securityLogAccess
                ? this.devManager.generateMockEvents(20)
                : await this.getRecentEvents();

            logger.info(`📊 Eventos obtenidos: ${events.length}`, {
                source: this.featureConfig.simulatedEvents && !this.featureConfig.securityLogAccess
                    ? 'mock data'
                    : 'sistema real'
            });

            if (events.length === 0) {
                return this.createSuccessResult([], [], 0);
            }

            // 4. Procesar eventos
            const { validEvents, detectedIPs } = await this.processEvents(events, whitelistIPs);

            // 5. Guardar en base de datos
            await this.saveResults(validEvents, detectedIPs);

            // 6. Retornar resultados
            return this.createSuccessResult(detectedIPs, validEvents, events.length - validEvents.length);

        } catch (error) {
            logger.error('❌ Error en análisis de eventos', { error: error.message });
            return this.createErrorResult(error.message);
        }
    }

    /**
     * Verifica si el sistema es Windows
     */
    async isWindowsSystem() {
        try {
            const command = 'wmic os get Caption /format:list';
            const result = await retry(() => {
                return execSync(command, { encoding: 'utf8', timeout: 5000 });
            }, 2, 1000);

            const isWindows = result.includes('Windows');
            logger.debug(`Sistema detectado: ${isWindows ? 'Windows' : 'No Windows'}`);
            return isWindows;

        } catch (error) {
            logger.warn('No se pudo verificar el sistema operativo', { error: error.message });
            return true; // Asumir Windows si no se puede verificar
        }
    }

    /**
     * Obtiene IPs de la whitelist
     */
    async getWhitelistIPs() {
        try {
            const whitelistEntries = await WhitelistIP.findAll({
                attributes: ['ip'],
                where: {
                    active: true // Solo IPs activas
                }
            });

            return new Set(whitelistEntries.map(entry => entry.ip));

        } catch (error) {
            logger.error('Error obteniendo whitelist', { error: error.message });
            return new Set(); // Retornar set vacío en caso de error
        }
    }

    /**
     * Obtiene eventos recientes del log de Windows
     */
    async getRecentEvents() {
        try {
            const command = this.buildEventLogCommand();

            const result = await retry(() => {
                return execSync(command, {
                    encoding: 'utf8',
                    timeout: 30000,
                    maxBuffer: 1024 * 1024 * 10 // 10MB buffer
                });
            }, 3, 2000);

            return this.parseEventLogOutput(result);

        } catch (error) {
            logger.error('Error obteniendo eventos del sistema', { error: error.message });
            return [];
        }
    }

    /**
     * Construye el comando para obtener eventos del log
     */
    buildEventLogCommand() {
        const hours = WINDOWS_EVENTS.SCAN_INTERVAL_HOURS;
        const startTime = new Date(Date.now() - hours * 60 * 60 * 1000);

        const timeFilter = startTime.toISOString().replace(/[:.]/g, '').slice(0, -4);

        return `wevtutil qe Security /c:${this.maxEvents} /rd:true /f:text /q:"Event[System[EventID=${this.eventId}] and System[TimeCreated[@SystemTime>='${timeFilter}']]]"`;
    }

    /**
     * Parsea la salida del log de eventos
     */
    parseEventLogOutput(output) {
        try {
            const events = [];
            const eventBlocks = output.split('\n\n').filter(block => block.trim());

            for (const block of eventBlocks) {
                const event = this.parseEventBlock(block);
                if (event) {
                    events.push(event);
                }
            }

            logger.debug(`📊 Eventos parseados: ${events.length}`);
            return events;

        } catch (error) {
            logger.error('Error parseando eventos', { error: error.message });
            return [];
        }
    }

    /**
     * Parsea un bloque individual de evento
     */
    parseEventBlock(block) {
        try {
            const lines = block.split('\n').map(line => line.trim());

            // Extraer información básica
            const timestamp = this.extractField(lines, 'Date and Time:') || new Date().toISOString();
            const sourceIP = this.extractSourceIP(lines);
            const username = this.extractField(lines, 'Account Name:') || 'Unknown';
            const domain = this.extractField(lines, 'Account Domain:') || 'Unknown';

            // Validar IP
            if (!sourceIP || !this.ipRegex.test(sourceIP)) {
                return null;
            }

            // Filtrar IPs privadas/locales
            if (this.isPrivateIP(sourceIP)) {
                return null;
            }

            return {
                timestamp: new Date(timestamp),
                sourceIP,
                username,
                domain,
                eventId: this.eventId,
                logonType: this.extractField(lines, 'Logon Type:') || 'Unknown',
                failureReason: this.extractField(lines, 'Failure Reason:') || 'Unknown'
            };

        } catch (error) {
            logger.debug('Error parseando bloque de evento', { error: error.message });
            return null;
        }
    }

    /**
     * Extrae un campo específico de las líneas del evento
     */
    extractField(lines, fieldName) {
        const line = lines.find(l => l.includes(fieldName));
        if (!line) return null;

        const parts = line.split(fieldName);
        return parts.length > 1 ? parts[1].trim() : null;
    }

    /**
     * Extrae la IP de origen de varias posibles ubicaciones
     */
    extractSourceIP(lines) {
        const ipFields = [
            'Source Network Address:',
            'Source IP:',
            'Network Address:',
            'Client Address:'
        ];

        for (const field of ipFields) {
            const ip = this.extractField(lines, field);
            if (ip && this.ipRegex.test(ip)) {
                return ip;
            }
        }

        // Buscar IP en cualquier línea como fallback
        for (const line of lines) {
            const ipMatch = line.match(this.ipRegex);
            if (ipMatch) {
                return ipMatch[0];
            }
        }

        return null;
    }

    /**
     * Verifica si una IP es privada/local
     */
    isPrivateIP(ip) {
        const privateRanges = [
            /^10\./,
            /^172\.(1[6-9]|2[0-9]|3[01])\./,
            /^192\.168\./,
            /^127\./,
            /^169\.254\./,
            /^::1$/,
            /^fe80:/i
        ];

        return privateRanges.some(range => range.test(ip));
    }

    /**
     * Procesa eventos y detecta IPs maliciosas
     */
    async processEvents(events, whitelistIPs) {
        const validEvents = [];
        const ipCounts = new Map();

        // Filtrar eventos válidos y contar IPs
        for (const event of events) {
            // Saltar IPs en whitelist
            if (whitelistIPs.has(event.sourceIP)) {
                continue;
            }

            validEvents.push(event);

            // Contar intentos por IP
            const count = ipCounts.get(event.sourceIP) || 0;
            ipCounts.set(event.sourceIP, count + 1);
        }

        // Obtener IPs ya detectadas
        const existingIPs = await this.getExistingDetectedIPs(Array.from(ipCounts.keys()));

        // Determinar nuevas IPs a agregar
        const detectedIPs = [];
        for (const [ip, attempts] of ipCounts) {
            const existing = existingIPs.get(ip);

            if (existing) {
                // Actualizar intentos existentes
                existing.attempts += attempts;
                existing.lastSeen = new Date();
                await existing.save();
            } else {
                // Nueva IP detectada
                detectedIPs.push({
                    ip,
                    attempts,
                    firstDetected: new Date(),
                    lastSeen: new Date(),
                    status: 'detected',
                    threatLevel: this.calculateThreatLevel(attempts)
                });
            }
        }

        logger.info(`🔍 Procesamiento completado`, {
            validEvents: validEvents.length,
            newIPs: detectedIPs.length,
            updatedIPs: ipCounts.size - detectedIPs.length
        });

        return { validEvents, detectedIPs };
    }

    /**
     * Obtiene IPs ya detectadas de la base de datos
     */
    async getExistingDetectedIPs(ips) {
        try {
            const existing = await DetectedIP.findAll({
                where: {
                    ip: {
                        [Op.in]: ips
                    }
                }
            });

            const map = new Map();
            existing.forEach(ip => map.set(ip.ip, ip));
            return map;

        } catch (error) {
            logger.error('Error obteniendo IPs detectadas existentes', { error: error.message });
            return new Map();
        }
    }

    /**
     * Calcula el nivel de amenaza basado en intentos
     */
    calculateThreatLevel(attempts) {
        if (attempts >= 50) return 'critical';
        if (attempts >= 20) return 'high';
        if (attempts >= 10) return 'medium';
        return 'low';
    }

    /**
     * Guarda resultados en base de datos
     */
    async saveResults(events, detectedIPs) {
        try {
            // Guardar eventos en lotes
            if (events.length > 0) {
                await this.saveEventsInBatches(events);
            }

            // Guardar nuevas IPs detectadas
            if (detectedIPs.length > 0) {
                await DetectedIP.bulkCreate(detectedIPs, {
                    ignoreDuplicates: true
                });
                logger.info(`💾 ${detectedIPs.length} nuevas IPs guardadas`);
            }

        } catch (error) {
            logger.error('Error guardando resultados', { error: error.message });
            throw error;
        }
    }

    /**
     * Guarda eventos en lotes para mejor rendimiento
     */
    async saveEventsInBatches(events, batchSize = 100) {
        for (let i = 0; i < events.length; i += batchSize) {
            const batch = events.slice(i, i + batchSize);

            try {
                await WindowsEvent.bulkCreate(batch, {
                    ignoreDuplicates: true
                });
            } catch (error) {
                logger.warn(`Error guardando lote de eventos ${i}-${i + batch.length}`, {
                    error: error.message
                });
            }
        }

        logger.info(`💾 ${events.length} eventos guardados`);
    }

    /**
     * Crea resultado exitoso estandarizado
     */
    createSuccessResult(detectedIPs, events, whitelistFiltered) {
        return {
            success: true,
            message: 'Análisis completado exitosamente',
            data: {
                events: events.length,
                newIPs: detectedIPs.map(ip => ip.ip || ip),
                timestamp: new Date().toISOString(),
                whitelistFiltered
            }
        };
    }

    /**
     * Crea resultado de error estandarizado
     */
    createErrorResult(message) {
        return {
            success: false,
            error: message,
            data: {
                events: 0,
                newIPs: [],
                timestamp: new Date().toISOString(),
                whitelistFiltered: 0
            }
        };
    }
}

// Instancia singleton del analizador
const analyzer = new WindowsEventAnalyzer();

/**
 * Función principal exportada (mantiene compatibilidad)
 */
async function scanForIpIn4625() {
    return await analyzer.analyze();
}

module.exports = scanForIpIn4625;
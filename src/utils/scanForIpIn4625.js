const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { Op } = require('sequelize');

// Importar modelos SQLite
const DetectedIP = require('../../db/models/DetectedIP');
const WhitelistIP = require('../../db/models/WhitelistIP');
const WindowsEvent = require('../../db/models/WindowsEvent');

/**
 * Función nativa para escanear eventos 4625 de Windows y detectar IPs maliciosas
 * Reemplaza completamente los scripts PowerShell y archivos CSV
 */
async function scanForIpIn4625() {
    console.log('🔍 [NATIVE] Iniciando análisis nativo de eventos 4625...');

    try {
        // 1. Verificar sistema operativo
        if (!await isWindowsServer()) {
            console.log('⚠️ Este sistema no es Windows Server');
            return {
                success: false,
                message: 'Solo compatible con Windows Server',
                data: { events: 0, newIPs: [], timestamp: new Date().toISOString() }
            };
        }

        console.log('✅ Sistema Windows Server verificado');

        // 2. Obtener whitelist desde SQLite
        const whitelistIPs = await getWhitelistFromDatabase();
        console.log(`📋 IPs en whitelist: ${whitelistIPs.length}`);

        // 3. Obtener último timestamp procesado desde SQLite
        const lastTimestamp = await getLastProcessedTimestamp();
        console.log(`⏰ Último análisis: ${lastTimestamp}`);

        // 4. Obtener eventos 4625 nativamente
        const eventos = await getWindowsEvents4625Native(lastTimestamp);
        console.log(`📊 Eventos encontrados: ${eventos.length}`);

        if (eventos.length === 0) {
            console.log('ℹ️ No se encontraron eventos nuevos');
            return {
                success: true,
                message: 'No hay eventos nuevos para procesar',
                data: { events: 0, newIPs: [], timestamp: new Date().toISOString() }
            };
        }

        // 5. Procesar eventos y detectar IPs
        const { newIPs, processedEvents } = await processEvents(eventos, whitelistIPs);

        // 6. Guardar en base de datos
        await saveEventsToDatabase(processedEvents);
        await saveDetectedIPsToDatabase(newIPs);

        // 7. Actualizar timestamp del último evento procesado
        if (eventos.length > 0) {
            await updateLastProcessedTimestamp(eventos[0].timestamp);
        }

        console.log('✅ Análisis completado exitosamente');
        console.log(`📈 Estadísticas:
        - Eventos procesados: ${processedEvents.length}
        - IPs nuevas detectadas: ${newIPs.length}
        - IPs filtradas por whitelist: ${eventos.length - processedEvents.length}`);

        return {
            success: true,
            message: 'Análisis completado exitosamente',
            data: {
                events: processedEvents.length,
                newIPs: newIPs,
                timestamp: new Date().toISOString(),
                whitelistFiltered: eventos.length - processedEvents.length
            }
        };

    } catch (error) {
        console.error('❌ Error en análisis nativo:', error);
        return {
            success: false,
            error: error.message,
            data: { events: 0, newIPs: [], timestamp: new Date().toISOString() }
        };
    }
}

/**
 * Verificar si el sistema es Windows Server (sin PowerShell)
 */
async function isWindowsServer() {
    try {
        // Usar WMIC nativo de Windows en lugar de PowerShell
        const os = execSync('wmic os get Caption', { encoding: 'utf8', timeout: 5000 });
        return os.includes('Server');
    } catch (error) {
        console.warn('⚠️ No se pudo verificar el sistema operativo, asumiendo compatibilidad');
        return true; // Asumir compatibilidad si no se puede verificar
    }
}

/**
 * Obtener whitelist desde base de datos SQLite
 */
async function getWhitelistFromDatabase() {
    try {
        const whitelistEntries = await WhitelistIP.findAll({
            where: {
                [Op.or]: [
                    { expiresAt: null },
                    { expiresAt: { [Op.gt]: new Date() } }
                ]
            },
            attributes: ['ip']
        });

        return whitelistEntries.map(entry => entry.ip);
    } catch (error) {
        console.error('❌ Error obteniendo whitelist:', error);
        return [];
    }
}

/**
 * Obtener último timestamp procesado desde SQLite
 */
async function getLastProcessedTimestamp() {
    try {
        const lastEvent = await WindowsEvent.findOne({
            where: { eventId: 4625 },
            order: [['timestamp', 'DESC']],
            attributes: ['timestamp']
        });

        return lastEvent ? lastEvent.timestamp : new Date(0);
    } catch (error) {
        console.error('❌ Error obteniendo último timestamp:', error);
        return new Date(0);
    }
}

/**
 * Obtener eventos 4625 usando implementación nativa de Node.js
 * Reemplaza completamente Get-WinEvent de PowerShell
 */
async function getWindowsEvents4625Native(lastTimestamp) {
    try {
        console.log('🔍 Obteniendo eventos 4625 nativamente...');

        // Construir comando WEVTUTIL nativo (reemplaza PowerShell)
        const startTime = lastTimestamp.toISOString().replace(/\.\d{3}Z$/, '');
        const command = `wevtutil qe Security "/q:*[System[EventID=4625 and TimeCreated[@SystemTime>'${startTime}']]]" /f:xml /c:40000`;

        const xmlOutput = execSync(command, {
            encoding: 'utf8',
            timeout: 60000, // 60 segundos timeout
            maxBuffer: 50 * 1024 * 1024 // 50MB buffer
        });

        // Parsear XML nativamente
        const eventos = await parseWindowsEventsXML(xmlOutput);
        console.log(`📊 Eventos parseados: ${eventos.length}`);

        return eventos;

    } catch (error) {
        console.error('❌ Error obteniendo eventos nativamente:', error);

        // Fallback: intentar con método alternativo
        console.log('🔄 Intentando método alternativo...');
        return await getEventsAlternativeMethod(lastTimestamp);
    }
}

/**
 * Método alternativo para obtener eventos (sin PowerShell)
 */
async function getEventsAlternativeMethod(lastTimestamp) {
    try {
        // Usar WMIC para obtener eventos de seguridad básicos
        const command = `wmic ntevent where "LogFile='Security' and EventCode=4625" get TimeGenerated,Message /format:csv`;
        const csvOutput = execSync(command, { encoding: 'utf8', timeout: 30000 });

        // Parsear salida CSV básica
        const lines = csvOutput.split('\n').filter(line => line.trim() && !line.startsWith('Node'));
        const eventos = [];

        for (const line of lines) {
            const parts = line.split(',');
            if (parts.length >= 2) {
                const timeGenerated = new Date(parts[1]);
                if (timeGenerated > lastTimestamp) {
                    eventos.push({
                        timestamp: timeGenerated,
                        eventId: 4625,
                        message: parts[2] || '',
                        sourceIP: extractIPFromMessage(parts[2] || ''),
                        username: extractUsernameFromMessage(parts[2] || '')
                    });
                }
            }
        }

        return eventos;
    } catch (error) {
        console.error('❌ Método alternativo falló:', error);
        return [];
    }
}

/**
 * Parsear XML de eventos de Windows nativamente
 */
async function parseWindowsEventsXML(xmlOutput) {
    const eventos = [];

    try {
        // Dividir eventos individuales
        const eventMatches = xmlOutput.match(/<Event[^>]*>[\s\S]*?<\/Event>/g);

        if (!eventMatches) {
            console.log('⚠️ No se encontraron eventos en el XML');
            return [];
        }

        for (const eventXml of eventMatches) {
            try {
                const evento = parseIndividualEvent(eventXml);
                if (evento) {
                    eventos.push(evento);
                }
            } catch (parseError) {
                console.warn('⚠️ Error parseando evento individual:', parseError.message);
            }
        }

    } catch (error) {
        console.error('❌ Error parseando XML de eventos:', error);
    }

    return eventos;
}

/**
 * Parsear un evento individual del XML
 */
function parseIndividualEvent(eventXml) {
    try {
        // Extraer timestamp
        const timeMatch = eventXml.match(/TimeCreated SystemTime=['"]([^'"]+)['"]/);
        const timestamp = timeMatch ? new Date(timeMatch[1]) : new Date();

        // Extraer IP (buscar en múltiples formatos)
        const ipMatches = [
            /IpAddress>([^<]+)</,
            /Name=['"]IpAddress['"][^>]*>([^<]+)</,
            /(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})/
        ];

        let sourceIP = null;
        for (const regex of ipMatches) {
            const match = eventXml.match(regex);
            if (match && match[1] && isValidIP(match[1])) {
                sourceIP = match[1];
                break;
            }
        }

        // Extraer otros campos
        const usernameMatch = eventXml.match(/TargetUserName>([^<]+)</);
        const workstationMatch = eventXml.match(/WorkstationName>([^<]+)</);
        const logonTypeMatch = eventXml.match(/LogonType>([^<]+)</);
        const statusMatch = eventXml.match(/Status>([^<]+)</);

        return {
            eventId: 4625,
            timestamp: timestamp,
            sourceIP: sourceIP,
            username: usernameMatch ? usernameMatch[1] : null,
            workstation: workstationMatch ? workstationMatch[1] : null,
            logonType: logonTypeMatch ? logonTypeMatch[1] : null,
            failureReason: statusMatch ? statusMatch[1] : null,
            rawData: eventXml
        };

    } catch (error) {
        console.warn('⚠️ Error parseando evento:', error.message);
        return null;
    }
}

/**
 * Procesar eventos y filtrar por whitelist
 */
async function processEvents(eventos, whitelistIPs) {
    const newIPs = [];
    const processedEvents = [];

    for (const evento of eventos) {
        // Filtrar eventos sin IP o con IP en whitelist
        if (!evento.sourceIP || whitelistIPs.includes(evento.sourceIP)) {
            continue;
        }

        // Verificar si la IP ya existe en la base de datos
        const existingIP = await DetectedIP.findOne({
            where: { ip: evento.sourceIP }
        });

        if (!existingIP) {
            newIPs.push(evento.sourceIP);
        }

        processedEvents.push(evento);
    }

    return { newIPs: [...new Set(newIPs)], processedEvents };
}

/**
 * Guardar eventos en base de datos SQLite
 */
async function saveEventsToDatabase(events) {
    try {
        for (const evento of events) {
            await WindowsEvent.findOrCreate({
                where: {
                    eventId: evento.eventId,
                    timestamp: evento.timestamp,
                    sourceIP: evento.sourceIP
                },
                defaults: {
                    eventId: evento.eventId,
                    timestamp: evento.timestamp,
                    sourceIP: evento.sourceIP,
                    username: evento.username,
                    workstation: evento.workstation,
                    logonType: evento.logonType,
                    failureReason: evento.failureReason,
                    rawData: evento.rawData,
                    processed: true
                }
            });
        }
        console.log(`💾 ${events.length} eventos guardados en base de datos`);
    } catch (error) {
        console.error('❌ Error guardando eventos:', error);
    }
}

/**
 * Guardar IPs detectadas en base de datos SQLite
 */
async function saveDetectedIPsToDatabase(newIPs) {
    try {
        for (const ip of newIPs) {
            await DetectedIP.findOrCreate({
                where: { ip: ip },
                defaults: {
                    ip: ip,
                    firstDetected: new Date(),
                    lastSeen: new Date(),
                    attempts: 1,
                    status: 'detected',
                    threatLevel: 'medium'
                }
            });
        }
        console.log(`🛡️ ${newIPs.length} IPs detectadas guardadas en base de datos`);
    } catch (error) {
        console.error('❌ Error guardando IPs detectadas:', error);
    }
}

/**
 * Actualizar timestamp del último evento procesado
 */
async function updateLastProcessedTimestamp(timestamp) {
    try {
        // Guardar en base de datos para referencia futura
        // Podrías crear una tabla de configuración o usar los eventos existentes
        console.log(`⏰ Último evento procesado: ${timestamp}`);
    } catch (error) {
        console.error('❌ Error actualizando timestamp:', error);
    }
}

/**
 * Validar formato de IP
 */
function isValidIP(ip) {
    const ipRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
    return ipRegex.test(ip) && ip !== '0.0.0.0' && ip !== '127.0.0.1';
}

/**
 * Extraer IP de mensaje de texto (método alternativo)
 */
function extractIPFromMessage(message) {
    const ipMatch = message.match(/(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})/);
    return ipMatch && isValidIP(ipMatch[1]) ? ipMatch[1] : null;
}

/**
 * Extraer username de mensaje de texto (método alternativo)
 */
function extractUsernameFromMessage(message) {
    const usernameMatch = message.match(/Account Name:\s*([^\s\r\n]+)/i);
    return usernameMatch ? usernameMatch[1] : null;
}

module.exports = scanForIpIn4625;
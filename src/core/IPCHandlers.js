// src/core/IPCHandlers.js
const { ipcMain } = require('electron');
const logger = require('../utils/logger');
const Validator = require('../utils/validation');
const FileService = require('../services/FileService');
const GeolocationService = require('../services/GeolocationService');
const pathManager = require('../config/paths');

// Importar modelos
const User = require('../../db/models/User');
const DetectedIP = require('../../db/models/DetectedIP');
const WhitelistIP = require('../../db/models/WhitelistIP');

// Importar funciones específicas
const scanForIpIn4625 = require('../utils/scanForIpIn4625');

/**
 * Manejadores IPC centralizados
 * Separa la lógica de IPC del archivo main.js principal
 */
class IPCHandlers {
    constructor(firewallManager) {
        this.firewallManager = firewallManager;
        this.appPaths = pathManager.getAppFilePaths();
        this.setupHandlers();
    }

    setupHandlers() {
        this.setupAuthHandlers();
        this.setupFirewallHandlers();
        this.setupLogHandlers();
        this.setupScriptHandlers();
        this.setupSystemHandlers();
        this.setupDataHandlers();
    }

    /**
     * Manejadores de autenticación
     */
    setupAuthHandlers() {
        ipcMain.handle('login', Validator.createIPCHandler('login', async (event, { username, password }) => {
            try {
                const user = await User.findOne({ where: { username, password } });
                const success = !!user;

                if (success) {
                    logger.info('Login exitoso', { username });
                } else {
                    logger.warn('Intento de login fallido', { username });
                }

                return { success };
            } catch (error) {
                logger.error('Error durante login', { username, error: error.message });
                return { success: false };
            }
        }));
    }

    /**
     * Manejadores de firewall
     */
    setupFirewallHandlers() {
        ipcMain.handle('get-blocked-ips', async (event) => {
            try {
                const result = await this.firewallManager.getBlockedIPs();
                return result;
            } catch (error) {
                logger.error('Error al obtener IPs bloqueadas', { error: error.message });
                return { success: false, error: error.message };
            }
        });

        ipcMain.handle('get-firewall-stats', async (event) => {
            try {
                const result = await this.firewallManager.getFirewallStats();
                return result;
            } catch (error) {
                logger.error('Error al obtener estadísticas del firewall', { error: error.message });
                return { success: false, error: error.message };
            }
        });

        ipcMain.handle('firewall-remove-ip', Validator.createIPCHandler('firewall-remove-ip', async (event, { ip }) => {
            try {
                const result = await this.firewallManager.removeIP(ip);
                if (result.success) {
                    logger.info('IP removida del firewall', { ip });
                }
                return result;
            } catch (error) {
                logger.error('Error al eliminar IP del firewall', { ip, error: error.message });
                return { success: false, error: error.message };
            }
        }));

        ipcMain.handle('get-ip-geolocation', Validator.createIPCHandler('get-geolocation', async (event, { ip }) => {
            try {
                const result = await GeolocationService.getLocation(ip);
                return result;
            } catch (error) {
                logger.error('Error al obtener geolocalización', { ip, error: error.message });
                return { success: false, error: error.message };
            }
        }));
    }

    /**
     * Manejadores de logs
     */
    setupLogHandlers() {
        ipcMain.on('load-log-content', async (event) => {
            const logFilePath = this.appPaths.registroIntentos;

            // Verificar si el archivo existe, si no, crearlo con headers
            if (!await FileService.fileExists(logFilePath)) {
                const headers = 'IP,Fecha,Usuario,TipoInicioSesion,CodigoError,Dominio,NombreEquipo\n';
                await FileService.writeFile(logFilePath, headers);
            }

            const result = await FileService.readFile(logFilePath);
            if (result.success) {
                event.reply('log-content', result.content);
            } else {
                event.reply('log-content', `Error al leer el archivo de log: ${result.error}`);
                logger.error('Error cargando contenido de log', { error: result.error });
            }
        });

        ipcMain.on('load-log-content2', async (event) => {
            const logFilePath = this.appPaths.salidaIps;

            // Crear archivo si no existe
            if (!await FileService.fileExists(logFilePath)) {
                await FileService.writeFile(logFilePath, '');
            }

            const result = await FileService.readFile(logFilePath);
            if (result.success) {
                const lines = result.content.split('\n').filter(line => line.trim());
                for (const line of lines) {
                    event.reply('log-content2', line);
                }
            } else {
                event.reply('log-content2', `Error: ${result.error}`);
                logger.error('Error cargando contenido de log2', { error: result.error });
            }
        });
    }

    /**
     * Manejadores de scripts
     */
    setupScriptHandlers() {
        ipcMain.handle('run-script', Validator.createIPCHandler('run-script', async (event, scriptName) => {
            logger.debug(`Ejecutando script nativo: ${scriptName}`);

            try {
                let result;

                switch (scriptName) {
                    case 'detectIntrusos':
                    case 'logs_for_ips_4625':
                        logger.security('Ejecutando análisis de IPs nativo...');
                        result = await this.executeIPAnalysis(event);
                        break;

                    case 'extractIPs':
                    case 'extraer_ips_4625':
                        logger.security('Ejecutando extracción de IPs nativo...');
                        result = await this.executeIPExtraction(event);
                        break;

                    case 'blockIPs':
                    case 'BlockIpAndUpdateForOneRule':
                        logger.firewall('Ejecutando bloqueo de IPs nativo...');
                        result = await this.executeFirewallUpdate(event);
                        break;

                    default:
                        throw new Error(`Script ${scriptName} no reconocido`);
                }

                return {
                    success: true,
                    message: `Script ${scriptName} ejecutado correctamente con función nativa`,
                    data: result
                };

            } catch (error) {
                logger.error('Error ejecutando script nativo', { script: scriptName, error: error.message });
                event.sender.send('log-error', `Error: ${error.message}`);

                return {
                    success: false,
                    error: error.message || 'Error desconocido ejecutando script nativo'
                };
            }
        }));
    }

    /**
     * Manejadores del sistema
     */
    setupSystemHandlers() {
        ipcMain.handle('check-admin-privileges', async (event) => {
            return new Promise((resolve) => {
                const { spawn } = require('child_process');
                const ps = spawn('powershell.exe', [
                    '-Command',
                    '([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole] "Administrator")'
                ]);

                let output = '';
                ps.stdout.on('data', (data) => {
                    output += data.toString();
                });

                ps.on('close', () => {
                    const isAdmin = output.trim().toLowerCase() === 'true';
                    logger.info('Verificación de privilegios admin', { isAdmin });
                    resolve({ isAdmin });
                });

                ps.on('error', (error) => {
                    logger.error('Error verificando privilegios admin', { error: error.message });
                    resolve({ isAdmin: false, error: error.message });
                });
            });
        });
    }

    /**
     * Manejadores de datos
     */
    setupDataHandlers() {
        // Obtener estadísticas generales
        ipcMain.handle('get-dashboard-stats', async () => {
            try {
                const [detectedCount, whitelistCount, firewallResult] = await Promise.all([
                    DetectedIP.count(),
                    WhitelistIP.count(),
                    this.firewallManager.getFirewallStats()
                ]);

                const stats = {
                    detectedIPs: detectedCount,
                    whitelistedIPs: whitelistCount,
                    blockedIPs: firewallResult.success ? firewallResult.data.totalBlocked : 0,
                    totalEvents: 0 // Se actualizará desde los logs
                };

                logger.debug('Estadísticas del dashboard obtenidas', stats);
                return { success: true, data: stats };

            } catch (error) {
                logger.error('Error obteniendo estadísticas', { error: error.message });
                return { success: false, error: error.message };
            }
        });
    }

    /**
     * Ejecuta análisis de IPs
     */
    async executeIPAnalysis(event) {
        try {
            event.sender.send('log-data', 'Iniciando análisis nativo de eventos 4625...');

            const result = await scanForIpIn4625();

            if (result.success) {
                event.sender.send('log-data', `✅ Análisis completado: ${result.data.events} eventos procesados`);
                event.sender.send('log-data', `🛡️ IPs nuevas detectadas: ${result.data.newIPs.length}`);

                if (result.data.newIPs.length > 0) {
                    const preview = result.data.newIPs.slice(0, 5).join(', ');
                    const more = result.data.newIPs.length > 5 ? '...' : '';
                    event.sender.send('log-data', `📋 Nuevas IPs: ${preview}${more}`);
                }

                return {
                    success: true,
                    detectedIPs: result.data.newIPs,
                    totalEvents: result.data.events,
                    whitelistFiltered: result.data.whitelistFiltered,
                    timestamp: result.data.timestamp
                };
            } else {
                throw new Error(result.error || result.message);
            }

        } catch (error) {
            event.sender.send('log-error', `❌ Error en análisis nativo: ${error.message}`);
            return {
                success: false,
                error: error.message,
                detectedIPs: [],
                totalEvents: 0
            };
        }
    }

    /**
     * Ejecuta extracción de IPs
     */
    async executeIPExtraction(event) {
        try {
            event.sender.send('log-data', 'Iniciando extracción nativa de IPs...');

            const result = await scanForIpIn4625();

            if (result.success) {
                event.sender.send('log-data', '✅ Extracción completada');

                return {
                    success: true,
                    extractedIPs: result.data.newIPs,
                    totalEvents: result.data.events
                };
            } else {
                throw new Error(result.error || result.message);
            }

        } catch (error) {
            event.sender.send('log-error', `❌ Error en extracción: ${error.message}`);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Ejecuta actualización de firewall
     */
    async executeFirewallUpdate(event) {
        try {
            event.sender.send('log-data', 'Iniciando actualización de firewall...');

            // Obtener IPs detectadas que no están en whitelist
            const detectedIPs = await DetectedIP.findAll({
                where: { status: 'detected' }
            });

            const whitelistIPs = await WhitelistIP.findAll();
            const whitelistSet = new Set(whitelistIPs.map(w => w.ip));

            const ipsToBlock = detectedIPs
                .filter(ip => !whitelistSet.has(ip.ip))
                .map(ip => ip.ip);

            if (ipsToBlock.length === 0) {
                event.sender.send('log-data', 'No hay IPs nuevas para bloquear');
                return { success: true, blockedCount: 0 };
            }

            const result = await this.firewallManager.blockMultipleIPs(ipsToBlock);

            if (result.success) {
                // Actualizar estado en base de datos
                await DetectedIP.update(
                    { status: 'blocked', blockedAt: new Date() },
                    { where: { ip: ipsToBlock } }
                );

                event.sender.send('log-data', `✅ ${ipsToBlock.length} IPs bloqueadas correctamente`);
            }

            return result;

        } catch (error) {
            event.sender.send('log-error', `❌ Error actualizando firewall: ${error.message}`);
            return {
                success: false,
                error: error.message
            };
        }
    }
}

module.exports = IPCHandlers;
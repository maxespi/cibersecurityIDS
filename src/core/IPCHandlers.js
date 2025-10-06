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
const MockDataService = require('../services/MockDataService');

/**
 * Manejadores IPC centralizados
 * Separa la lógica de IPC del archivo main.js principal
 */
class IPCHandlers {
    constructor(firewallManager, windowManager = null) {
        this.firewallManager = firewallManager;
        this.windowManager = windowManager;
        this.appPaths = pathManager.getAppFilePaths();
        this.mockDataService = new MockDataService();
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
        ipcMain.handle('login', async (event, data) => {
            // Debug logging para troubleshooting
            logger.debug('Handler login llamado', {
                data: data,
                dataType: typeof data,
                keys: Object.keys(data || {})
            });

            // Extraer username y password
            const { username, password } = data || {};

            logger.debug('Credenciales extraídas', {
                username: username,
                password: password ? '***' : undefined,
                usernameType: typeof username,
                passwordType: typeof password
            });

            // Validación manual simple
            if (!username || !password) {
                logger.warn('Credenciales faltantes', { username: !!username, password: !!password });
                return { success: false, error: 'Credenciales faltantes' };
            }
            try {
                const user = await User.findOne({ where: { username, password } });
                const success = !!user;

                if (success) {
                    logger.info('Login exitoso', { username });

                    // Activar transición automáticamente después del login exitoso
                    setTimeout(() => {
                        logger.info('🔄 Activando transición automática...');

                        try {
                            // Usar el windowManager de la instancia que ya está disponible
                            if (this.windowManager) {
                                this.windowManager.onLoginSuccess(username);
                                logger.info('✅ Transición automática ejecutada');
                            } else {
                                logger.error('❌ WindowManager no disponible en IPCHandlers');
                            }
                        } catch (error) {
                            logger.error('❌ Error en transición automática:', error.message);
                        }
                    }, 2000); // 2 segundos para que se vea el mensaje de éxito

                } else {
                    logger.warn('Intento de login fallido', { username });
                }

                return { success };
            } catch (error) {
                logger.error('Error durante login', { username, error: error.message });
                return { success: false };
            }
        });

        // Handler para login exitoso
        ipcMain.handle('on-login-success', async (event, username) => {
            try {
                logger.info('Procesando login exitoso', { username });

                // Notificar al WindowManager
                const { BrowserWindow } = require('electron');
                const mainWindow = BrowserWindow.getFocusedWindow();

                if (mainWindow) {
                    mainWindow.webContents.send('login-success', { username });
                }

                return { success: true };
            } catch (error) {
                logger.error('Error procesando login exitoso', { error: error.message });
                return { success: false };
            }
        });

        // Handler para cerrar aplicación
        ipcMain.handle('close-app', async (event) => {
            try {
                logger.info('🔒 Usuario solicitó cerrar la aplicación desde login');

                const { app } = require('electron');
                app.quit();

                return { success: true };
            } catch (error) {
                logger.error('Error cerrando aplicación', { error: error.message });
                return { success: false };
            }
        });
    }

    /**
     * Manejadores de firewall
     */
    setupFirewallHandlers() {
        ipcMain.handle('get-blocked-ips', async (event) => {
            try {
                // Verificar si mock data está habilitado
                const useMockData = process.env.ENABLE_MOCK_DATA === 'true';

                if (useMockData) {
                    logger.info('🔥 Usando IPs bloqueadas simuladas');
                    return this.mockDataService.generateBlockedIPs();
                }

                const result = await this.firewallManager.getBlockedIPs();
                return result;
            } catch (error) {
                logger.error('Error al obtener IPs bloqueadas', { error: error.message });
                return { success: false, error: error.message };
            }
        });

        ipcMain.handle('get-firewall-stats', async (event) => {
            try {
                // Verificar si mock data está habilitado
                const useMockData = process.env.ENABLE_MOCK_DATA === 'true';

                if (useMockData) {
                    logger.info('🔥 Usando estadísticas de firewall simuladas');
                    return this.mockDataService.generateFirewallStats();
                }

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
            try {
                const useMockData = process.env.ENABLE_MOCK_DATA === 'true';

                if (useMockData) {
                    logger.info('📝 Generando contenido de log simulado');

                    // Generar CSV simulado
                    const mockEvents = this.mockDataService.generateFailedLoginEvents(15);
                    const headers = 'IP,Fecha,Usuario,TipoInicioSesion,CodigoError,Dominio,NombreEquipo\n';

                    const csvLines = mockEvents.map(event => {
                        const date = event.timestamp.toISOString().split('T')[0];
                        const time = event.timestamp.toTimeString().split(' ')[0];
                        return `${event.sourceIP},${date} ${time},${event.username},${event.logonType},4625,${event.domain},${event.workstation}`;
                    });

                    const csvContent = headers + csvLines.join('\n');
                    event.reply('log-content', csvContent);
                    return;
                }

                // Lógica original para datos reales
                const logFilePath = this.appPaths.registroIntentos;

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
            } catch (error) {
                logger.error('Error en load-log-content', { error: error.message });
                event.reply('log-content', 'Error loading log content');
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
        // Gestión de whitelist
        this.setupWhitelistHandlers();

        // Obtener estadísticas generales
        ipcMain.handle('get-dashboard-stats', async () => {
            try {
                // Verificar si mock data está habilitado
                const useMockData = process.env.ENABLE_MOCK_DATA === 'true';

                if (useMockData) {
                    logger.info('📊 Usando estadísticas simuladas para dashboard');
                    const mockStats = {
                        detectedIPs: Math.floor(Math.random() * 50) + 20,
                        whitelistedIPs: Math.floor(Math.random() * 15) + 5,
                        blockedIPs: Math.floor(Math.random() * 30) + 10,
                        totalEvents: Math.floor(Math.random() * 500) + 100,
                        recentThreats: Math.floor(Math.random() * 10) + 2,
                        isMockData: true,
                        lastUpdate: new Date().toISOString()
                    };

                    return { success: true, data: mockStats };
                }

                // Datos reales
                const [detectedCount, whitelistCount, firewallResult] = await Promise.all([
                    DetectedIP.count(),
                    WhitelistIP.count(),
                    this.firewallManager.getFirewallStats()
                ]);

                const stats = {
                    detectedIPs: detectedCount,
                    whitelistedIPs: whitelistCount,
                    blockedIPs: firewallResult.success ? firewallResult.data.totalBlocked : 0,
                    totalEvents: 0,
                    isMockData: false
                };

                logger.debug('Estadísticas del dashboard obtenidas', stats);
                return { success: true, data: stats };

            } catch (error) {
                logger.error('Error obteniendo estadísticas', { error: error.message });
                return { success: false, error: error.message };
            }
        });

        // Obtener datos mock para testing
        ipcMain.handle('get-mock-data', async (event, type) => {
            try {
                logger.info('🎭 Solicitando datos mock', { type });

                switch (type) {
                    case 'events':
                        return {
                            success: true,
                            data: this.mockDataService.generateFailedLoginEvents(20)
                        };

                    case 'geolocation':
                        const testIPs = ['185.220.101.5', '91.240.118.172', '45.142.214.219'];
                        const geoData = testIPs.map(ip => this.mockDataService.generateMockGeolocation(ip));
                        return { success: true, data: geoData };

                    case 'firewall':
                        return this.mockDataService.generateFirewallStats();

                    case 'blocked-ips':
                        return this.mockDataService.generateBlockedIPs();

                    case 'analysis':
                        return this.mockDataService.generateSecurityAnalysis();

                    default:
                        return { success: false, error: 'Tipo de mock data no válido' };
                }

            } catch (error) {
                logger.error('Error generando mock data', { type, error: error.message });
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

    /**
     * Manejadores de whitelist
     */
    setupWhitelistHandlers() {
        const { Op } = require('sequelize');

        // Obtener IPs de whitelist
        ipcMain.handle('get-whitelist-ips', async (event) => {
            try {
                // Verificar si mock data está habilitado
                const useMockData = process.env.ENABLE_MOCK_DATA === 'true';

                if (useMockData) {
                    logger.info('📋 Usando whitelist simulada');
                    return this.mockDataService.generateWhitelistIPs();
                }

                const whitelistEntries = await WhitelistIP.findAll({
                    where: {
                        [Op.or]: [
                            { expiresAt: null },
                            { expiresAt: { [Op.gt]: new Date() } }
                        ]
                    },
                    order: [['createdAt', 'DESC']]
                });

                return {
                    success: true,
                    data: whitelistEntries.map(entry => ({
                        id: entry.id,
                        ip: entry.ip,
                        description: entry.description,
                        addedBy: entry.addedBy,
                        permanent: entry.permanent,
                        createdAt: entry.createdAt,
                        expiresAt: entry.expiresAt
                    }))
                };
            } catch (error) {
                logger.error('Error obteniendo whitelist', { error: error.message });
                return { success: false, error: error.message };
            }
        });

        // Agregar IP a whitelist
        ipcMain.handle('add-whitelist-ip', Validator.createIPCHandler('add-whitelist-ip', async (event, data) => {
            try {
                const { ip, description, permanent, expiresAt } = data;

                // Verificar si mock data está habilitado
                const useMockData = process.env.ENABLE_MOCK_DATA === 'true';

                if (useMockData) {
                    logger.info('📋 Simulando agregar IP a whitelist', { ip });
                    return {
                        success: true,
                        data: { id: Date.now(), ip, description, permanent },
                        message: 'IP agregada a whitelist simulada'
                    };
                }

                const whitelistEntry = await WhitelistIP.create({
                    ip,
                    description,
                    addedBy: 'admin',
                    permanent,
                    expiresAt: permanent ? null : expiresAt
                });

                logger.info('IP agregada a whitelist', { ip, description });
                return { success: true, data: whitelistEntry };

            } catch (error) {
                logger.error('Error agregando IP a whitelist', { error: error.message });
                return { success: false, error: error.message };
            }
        }));

        // Remover IP de whitelist
        ipcMain.handle('remove-whitelist-ip', Validator.createIPCHandler('remove-whitelist-ip', async (event, ipId) => {
            try {
                // Verificar si mock data está habilitado
                const useMockData = process.env.ENABLE_MOCK_DATA === 'true';

                if (useMockData) {
                    logger.info('📋 Simulando remover IP de whitelist', { ipId });
                    return {
                        success: true,
                        message: 'IP removida de whitelist simulada'
                    };
                }

                await WhitelistIP.destroy({ where: { id: ipId } });
                logger.info('IP removida de whitelist', { ipId });
                return { success: true };

            } catch (error) {
                logger.error('Error removiendo IP de whitelist', { error: error.message });
                return { success: false, error: error.message };
            }
        }));
    }
}

module.exports = IPCHandlers;
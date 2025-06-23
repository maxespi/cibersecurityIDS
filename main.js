const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const fs = require('fs');
const { Op } = require('sequelize'); // ← AGREGAR ESTA LÍNEA
const sequelize = require('./db/config/db');
const User = require('./db/models/User');
const scanForIpIn4625 = require('./src/utils/scanForIpIn4625');

// Importar el FirewallManager
const FirewallManager = require('./src/utils/firewallManager');
const firewallManager = new FirewallManager();

// Importar nuevos modelos
const DetectedIP = require('./db/models/DetectedIP');
const WhitelistIP = require('./db/models/WhitelistIP');
const WindowsEvent = require('./db/models/WindowsEvent');

const userDataPath = app.getPath('userData');

// Habilitar recarga automática en desarrollo
if (process.env.NODE_ENV === 'development') {
    require('electron-reload')(__dirname, {
        electron: path.join(__dirname, 'node_modules', '.bin', 'electron'),
    });
}

// Leer configuración del archivo config.json
const config = JSON.parse(fs.readFileSync(path.join(__dirname, 'config.json'), 'utf-8'));
const environment = process.env.NODE_ENV || 'development';
const scriptRoot = config[environment].scriptRoot;
const logRoot = path.join(userDataPath, 'logs');
const configRoot = config[environment].configRoot;

function createWindow() {
    const mainWindow = new BrowserWindow({
        width: 1200,
        height: 900,
        minWidth: 1000,
        minHeight: 700,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            enableRemoteModule: false,
            nodeIntegration: false,
            webSecurity: false // Necesario para cargar React desde CDN
        },
        autoHideMenuBar: true,
        icon: path.join(__dirname, 'hacker.ico') // Si tienes un icono
    });

    /* mainWindow.loadFile(path.join(__dirname, 'src', 'views', 'main.html')).catch((err) => {
        console.error('Error loading main.html:', err);
    }); */
    mainWindow.loadFile(path.join(__dirname, 'src', 'views', 'main-react.html'))


    mainWindow.setMenuBarVisibility(false);

    // En desarrollo, abrir DevTools
    if (process.env.NODE_ENV === 'development') {
        mainWindow.webContents.openDevTools();
    }

    return mainWindow;
}

// ================ INICIALIZACIÓN ================
app.whenReady().then(async () => {
    try {
        await sequelize.authenticate();

        await sequelize.sync({
            alter: process.env.FORCE_SYNC === 'true',
            logging: process.env.NODE_ENV !== 'development'
        });

        // Verificar usuario admin
        const existingUser = await User.findOne({ where: { username: 'admin' } });
        if (!existingUser) {
            await User.create({ username: 'admin', password: 'admin' });
            console.log('New user created');
        } else {
            console.log('User "admin" already exists.');
        }

        // Crear ventana principal
        const mainWindow = createWindow();

        // Handlers de navegación
        /*   ipcMain.handle('navigate-to-scripts', () => {
              mainWindow.loadFile(path.join(__dirname, 'src', 'views', 'scriptsView.html'));
          });
  
          ipcMain.handle('navigate-to-logs', () => {
              mainWindow.loadFile(path.join(__dirname, 'src', 'views', 'logsView.html'));
          });
  
          ipcMain.handle('navigate-to-firewall', () => {
              mainWindow.loadFile(path.join(__dirname, 'src', 'views', 'firewallView.html'));
          }); */

    } catch (error) {
        console.error('Unable to connect to the database:', error);
        createWindow();
    }

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

// Manejo de errores
process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
    if (!fs.existsSync(logRoot)) {
        fs.mkdirSync(logRoot, { recursive: true });
    }
    fs.writeFileSync(path.join(logRoot, 'error.log'), `Uncaught Exception: ${error.message}\n${error.stack}`);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection:', reason);
    if (!fs.existsSync(logRoot)) {
        fs.mkdirSync(logRoot, { recursive: true });
    }
    fs.writeFileSync(path.join(logRoot, 'error.log'), `Unhandled Rejection: ${reason}\n${promise}`);
});

// ================ HANDLERS EXISTENTES ================

// Script execution
ipcMain.handle('run-script', async (event, scriptName) => {
    console.log(`🔧 [BACKEND] Ejecutando script NATIVO: ${scriptName}`);

    try {
        let result;

        switch (scriptName) {
            case 'detectIntrusos':
            case 'logs_for_ips_4625':
                console.log('🔧 [BACKEND] Ejecutando análisis de IPs nativo...');

                // ✅ USAR FUNCIÓN JAVASCRIPT NATIVA
                result = await executeIPAnalysis(event);
                break;

            case 'extractIPs':
            case 'extraer_ips_4625':
                console.log('🔧 [BACKEND] Ejecutando extracción de IPs nativo...');

                // ✅ USAR FUNCIÓN JAVASCRIPT NATIVA
                result = await executeIPExtraction(event);
                break;

            case 'blockIPs':
            case 'BlockIpAndUpdateForOneRule':
                console.log('🔧 [BACKEND] Ejecutando bloqueo de IPs nativo...');

                // ✅ USAR FIREWALL MANAGER NATIVO
                result = await executeFirewallUpdate(event);
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
        console.error('🔧 [BACKEND] Error executing native script:', error);
        event.sender.send('log-error', `Error: ${error.message}`);

        return {
            success: false,
            error: error.message || 'Error desconocido ejecutando script nativo'
        };
    }
});

async function executeIPAnalysis(event) {
    try {
        event.sender.send('log-data', 'Iniciando análisis de eventos 4625...');

        // Usar la función JavaScript nativa
        const result = await scanForIpIn4625(logRoot, configRoot);

        event.sender.send('log-data', 'Análisis de eventos completado');
        event.sender.send('log-data', `Resultado: ${result}`);

        // Leer IPs detectadas del archivo generado
        const ipsFile = path.join(logRoot, 'salida_ips.txt');
        let detectedIPs = [];

        if (fs.existsSync(ipsFile)) {
            const ipsContent = fs.readFileSync(ipsFile, 'utf-8');
            detectedIPs = ipsContent.split('\n').filter(ip => ip.trim());

            event.sender.send('log-data', `IPs detectadas: ${detectedIPs.length}`);

            // Enviar IPs detectadas al frontend
            if (detectedIPs.length > 0) {
                event.sender.send('log-data', `Nuevas IPs: ${detectedIPs.slice(-5).join(', ')}`);
            }
        }

        return {
            detectedIPs: detectedIPs,
            totalEvents: 'Procesados exitosamente',
            logFile: path.join(logRoot, 'registro_intentos.csv')
        };

    } catch (error) {
        event.sender.send('log-error', `Error en análisis de IPs: ${error.message}`);
        throw error;
    }
}

// ✅ FUNCIÓN PARA EXTRACCIÓN DE IPs (reemplaza extraer_ips_4625.ps1)
async function executeIPExtraction(event) {
    try {
        event.sender.send('log-data', 'Iniciando extracción rápida de IPs...');

        // Esta función puede usar una versión simplificada del scanForIpIn4625
        // o implementar lógica específica para extracción rápida
        const result = await scanForIpIn4625(logRoot, configRoot);

        event.sender.send('log-data', 'Extracción de IPs completada');

        return {
            extractedIPs: result,
            operation: 'IP extraction'
        };

    } catch (error) {
        event.sender.send('log-error', `Error en extracción de IPs: ${error.message}`);
        throw error;
    }
}

// ✅ FUNCIÓN PARA ACTUALIZACIÓN DE FIREWALL (reemplaza BlockIpAndUpdateForOneRule.ps1)
async function executeFirewallUpdate(event) {
    try {
        event.sender.send('log-data', 'Iniciando actualización del firewall...');

        // Leer IPs detectadas
        const ipsFile = path.join(logRoot, 'salida_ips.txt');

        if (!fs.existsSync(ipsFile)) {
            throw new Error('No hay archivo de IPs detectadas. Ejecute primero el análisis.');
        }

        const ipsContent = fs.readFileSync(ipsFile, 'utf-8');
        const detectedIPs = ipsContent.split('\n').filter(ip => ip.trim());

        if (detectedIPs.length === 0) {
            event.sender.send('log-data', 'No hay IPs para bloquear');
            return { blockedIPs: [], message: 'No hay IPs para bloquear' };
        }

        event.sender.send('log-data', `Bloqueando ${detectedIPs.length} IPs...`);

        // 1. Verificar whitelist desde base de datos
        const whitelistEntries = await WhitelistIP.findAll();
        const whitelistIPs = whitelistEntries.map(entry => entry.ip);
        const ipsToBlock = detectedIPs.filter(ip => !whitelistIPs.includes(ip));

        if (ipsToBlock.length === 0) {
            event.sender.send('log-data', 'Todas las IPs están en whitelist');
            return { blockedIPs: [], message: 'Todas las IPs están en whitelist' };
        }

        event.sender.send('log-data', `IPs a bloquear (después de whitelist): ${ipsToBlock.length}`);

        // 2. Usar FirewallManager nativo para bloquear IPs
        const firewallResult = await firewallManager.blockMultipleIPs(ipsToBlock);

        if (firewallResult.success) {
            event.sender.send('log-data', `Firewall actualizado: ${ipsToBlock.length} IPs bloqueadas`);

            // 3. Registrar en base de datos
            for (const ip of ipsToBlock) {
                await DetectedIP.upsert({
                    ip: ip,
                    attempts: 1,
                    status: 'blocked',
                    firstDetected: new Date(),
                    lastSeen: new Date(),
                    source: 'auto-analysis'
                });
            }

            event.sender.send('log-data', 'IPs registradas en base de datos');

            return {
                blockedIPs: ipsToBlock,
                firewallResult: firewallResult,
                message: `${ipsToBlock.length} IPs bloqueadas exitosamente`
            };
        } else {
            throw new Error(`Error del firewall: ${firewallResult.error}`);
        }

    } catch (error) {
        event.sender.send('log-error', `Error en actualización del firewall: ${error.message}`);
        throw error;
    }
}

// ✅ FUNCIÓN AUXILIAR PARA VERIFICAR SISTEMA OPERATIVO
function checkWindowsServer() {
    try {
        const { execSync } = require('child_process');
        const os = execSync('wmic os get Caption', { encoding: 'utf8' });
        return os.includes('Server');
    } catch (error) {
        console.warn('No se pudo verificar el sistema operativo:', error.message);
        return true; // Asumir que es compatible si no se puede verificar
    }
}

// Log content loading
ipcMain.on('load-log-content', (event) => {
    const logFilePath = path.join(logRoot, 'registro_intentos.csv');
    const logDir = path.dirname(logFilePath);

    if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir, { recursive: true });
    }

    if (!fs.existsSync(logFilePath)) {
        fs.writeFileSync(logFilePath, 'IP,Fecha,Usuario,TipoInicioSesion,CodigoError,Dominio,NombreEquipo\n');
    }

    fs.readFile(logFilePath, 'utf-8', (err, data) => {
        if (err) {
            event.reply('log-content', `Error al leer el archivo de log: ${err.message}`);
        } else {
            event.reply('log-content', data);
        }
    });
});

ipcMain.on('load-log-content2', (event) => {
    const logFilePath = path.join(logRoot, 'salida_ips.txt');
    const logDir = path.dirname(logFilePath);

    if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir, { recursive: true });
    }

    if (!fs.existsSync(logFilePath)) {
        fs.writeFileSync(logFilePath, '');
    }

    fs.readFile(logFilePath, 'utf-8', (err, data) => {
        if (err) {
            event.reply('log-content2', `Error al leer el archivo de log: ${err.message}`);
        } else {
            event.reply('log-content2', data);
        }
    });
});

// Authentication
ipcMain.handle('login', async (event, username, password) => {
    try {
        const user = await User.findOne({ where: { username, password } });
        return { success: !!user };
    } catch (error) {
        console.error('Error during login:', error);
        return { success: false };
    }
});

// ================ FIREWALL HANDLERS ================

ipcMain.handle('get-blocked-ips', async (event) => {
    try {
        const result = await firewallManager.getBlockedIPs();
        return result;
    } catch (error) {
        console.error('Error al obtener IPs bloqueadas:', error);
        return { success: false, error: error.message };
    }
});

ipcMain.handle('get-firewall-stats', async (event) => {
    try {
        const stats = await firewallManager.getFirewallStats();
        return { success: true, data: stats };
    } catch (error) {
        console.error('Error al obtener estadísticas del firewall:', error);
        return { success: false, error: error.message };
    }
});

ipcMain.handle('remove-ip-from-firewall', async (event, ip) => {
    try {
        const result = await firewallManager.removeIPFromFirewall(ip);
        return result;
    } catch (error) {
        console.error('Error al eliminar IP del firewall:', error);
        return { success: false, error: error.message };
    }
});

ipcMain.handle('get-ip-geolocation', async (event, ip) => {
    try {
        const result = await firewallManager.getIPGeolocation(ip);
        return result;
    } catch (error) {
        console.error('Error al obtener geolocalización:', error);
        return { success: false, error: error.message };
    }
});

ipcMain.handle('check-admin-privileges', async (event) => {
    return new Promise((resolve) => {
        const ps = spawn('powershell.exe', [
            '-Command',
            '([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole] "Administrator")'
        ]);

        let output = '';
        ps.stdout.on('data', (data) => {
            output += data.toString().trim();
        });

        ps.on('close', (code) => {
            const isAdmin = output.toLowerCase() === 'true';
            resolve({
                success: true,
                data: {
                    isAdmin: isAdmin
                },
                message: isAdmin ? 'Running with administrator privileges' : 'Administrator privileges required'
            });
        });

        ps.on('error', (error) => {
            resolve({ isAdmin: false, message: 'Error checking privileges' });
        });
    });
});

// ================ NUEVOS HANDLERS SQLite ================

// Analizar eventos de Windows
ipcMain.handle('analyze-windows-events', async (event, options) => {
    try {
        const { eventId, maxEvents, lastTimestamp } = options;

        // 1. Obtener whitelist desde SQLite
        const whitelistEntries = await WhitelistIP.findAll({
            where: {
                [Op.or]: [
                    { expiresAt: null },
                    { expiresAt: { [Op.gt]: new Date() } }
                ]
            }
        });
        const whitelistIPs = whitelistEntries.map(entry => entry.ip);

        // 2. Simular análisis de eventos (reemplazar con lógica real)
        const mockEvents = [
            {
                eventId: eventId,
                timestamp: new Date(),
                sourceIP: '192.168.1.100',
                username: 'testuser',
                workstation: 'TEST-PC',
                logonType: '3',
                failureReason: 'Unknown user name or bad password'
            }
        ];

        // 3. Procesar eventos
        const detectedIPs = [];
        for (const event of mockEvents) {
            if (event.sourceIP && !whitelistIPs.includes(event.sourceIP)) {
                // Guardar evento
                await WindowsEvent.create({
                    eventId: event.eventId,
                    timestamp: event.timestamp,
                    sourceIP: event.sourceIP,
                    username: event.username,
                    workstation: event.workstation,
                    logonType: event.logonType,
                    failureReason: event.failureReason,
                    rawData: JSON.stringify(event)
                });

                // Crear o actualizar IP detectada
                const [detectedIP, created] = await DetectedIP.findOrCreate({
                    where: { ip: event.sourceIP },
                    defaults: {
                        ip: event.sourceIP,
                        firstDetected: event.timestamp,
                        lastSeen: event.timestamp,
                        attempts: 1,
                        status: 'detected'
                    }
                });

                if (!created) {
                    await detectedIP.update({
                        lastSeen: event.timestamp,
                        attempts: detectedIP.attempts + 1
                    });
                }

                if (created) {
                    detectedIPs.push(event.sourceIP);
                }
            }
        }

        return {
            success: true,
            data: {
                events: mockEvents.length,
                newIPs: detectedIPs,
                timestamp: new Date().toISOString()
            }
        };

    } catch (error) {
        console.error('Error analyzing Windows events:', error);
        return { success: false, error: error.message };
    }
});

// Actualizar reglas de firewall
ipcMain.handle('update-firewall-rules', async (event, options) => {
    try {
        const { ipsToBlock, ruleName } = options;

        if (!ipsToBlock || ipsToBlock.length === 0) {
            return { success: true, data: { newlyBlocked: [], totalBlocked: 0 } };
        }

        // 1. Verificar whitelist
        const whitelistEntries = await WhitelistIP.findAll();
        const whitelistIPs = whitelistEntries.map(entry => entry.ip);
        const ipsToActuallyBlock = ipsToBlock.filter(ip => !whitelistIPs.includes(ip));

        if (ipsToActuallyBlock.length === 0) {
            return { success: true, data: { newlyBlocked: [], totalBlocked: 0 } };
        }

        // 2. Actualizar firewall (usar script PowerShell existente)
        const scriptPath = path.join(scriptRoot, 'BlockIpAndUpdateForOneRule.ps1');
        const tempIpsFile = path.join(logRoot, 'temp_ips_to_block.txt');
        fs.writeFileSync(tempIpsFile, ipsToActuallyBlock.join('\n'));

        await new Promise((resolve, reject) => {
            const powershellProcess = spawn('powershell.exe', [
                '-ExecutionPolicy', 'Bypass',
                '-File', scriptPath,
                '-LogPath', logRoot,
                '-ConfigPath', configRoot
            ]);

            powershellProcess.on('close', (code) => {
                if (code === 0) resolve();
                else reject(new Error(`Firewall script failed with code ${code}`));
            });
        });

        // 3. Actualizar estado en SQLite
        for (const ip of ipsToActuallyBlock) {
            await DetectedIP.update(
                { status: 'blocked', blockedAt: new Date() },
                { where: { ip: ip.trim() } }
            );
        }

        // Limpiar archivo temporal
        if (fs.existsSync(tempIpsFile)) {
            fs.unlinkSync(tempIpsFile);
        }

        return {
            success: true,
            data: {
                newlyBlocked: ipsToActuallyBlock,
                totalBlocked: ipsToActuallyBlock.length
            }
        };

    } catch (error) {
        console.error('Error updating firewall rules:', error);
        return { success: false, error: error.message };
    }
});

// Gestión de whitelist
ipcMain.handle('get-whitelist-ips', async (event) => {
    try {
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
        return { success: false, error: error.message };
    }
});

ipcMain.handle('add-whitelist-ip', async (event, data) => {
    try {
        const { ip, description, permanent, expiresAt } = data;
        const whitelistEntry = await WhitelistIP.create({
            ip,
            description,
            addedBy: 'admin', // agregar usuario actual
            permanent,
            expiresAt: permanent ? null : expiresAt
        });
        return { success: true, data: whitelistEntry };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

ipcMain.handle('remove-whitelist-ip', async (event, ipId) => {
    try {
        await WhitelistIP.destroy({ where: { id: ipId } });
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

ipcMain.handle('get-detected-ips-history', async (event, filters) => {
    try {
        const where = {};
        if (filters?.status) where.status = filters.status;
        if (filters?.dateFrom) where.firstDetected = { [Op.gte]: filters.dateFrom };
        if (filters?.dateTo) where.firstDetected = { [Op.lte]: filters.dateTo };

        const detectedIPs = await DetectedIP.findAll({
            where,
            order: [['lastSeen', 'DESC']],
            limit: filters?.limit || 100
        });

        return { success: true, data: detectedIPs };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

ipcMain.handle('get-ip-statistics', async (event) => {
    try {
        const stats = await DetectedIP.findAll({
            attributes: [
                'status',
                [sequelize.fn('COUNT', sequelize.col('id')), 'count']
            ],
            group: 'status'
        });

        const totalAttempts = await DetectedIP.sum('attempts');
        const recentDetections = await DetectedIP.count({
            where: {
                firstDetected: {
                    [Op.gte]: new Date(Date.now() - 24 * 60 * 60 * 1000)
                }
            }
        });

        return {
            success: true,
            data: {
                statusBreakdown: stats,
                totalAttempts,
                recentDetections
            }
        };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

// Script status
ipcMain.handle('get-script-status', async (event) => {
    // Aquí puedes implementar lógica para verificar si hay scripts corriendo
    return {
        success: true,
        data: {
            isRunning: false,
            lastRun: new Date().toISOString(),
            interval: 30
        }
    };
});

ipcMain.handle('get-logs', async (event, type) => {
    try {
        console.log(`🔧 [BACKEND] Obteniendo logs tipo: ${type}`);

        let logs = [];

        switch (type) {
            case 'user':
                // Logs de acciones de usuario (desde una tabla de logs si existe)
                logs = await getUserLogs();
                break;

            case 'script':
                // Logs de scripts desde archivos
                logs = await getScriptLogs();
                break;

            case 'system':
                // Logs del sistema y eventos Windows
                logs = await getSystemLogs();
                break;

            default:
                // Todos los logs combinados
                const userLogs = await getUserLogs();
                const scriptLogs = await getScriptLogs();
                const systemLogs = await getSystemLogs();
                logs = [...userLogs, ...scriptLogs, ...systemLogs];
        }

        // Ordenar por fecha descendente
        logs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

        return {
            success: true,
            data: logs
        };
    } catch (error) {
        console.error('🔧 [BACKEND] Error obteniendo logs:', error);
        return {
            success: false,
            error: error.message
        };
    }
});

ipcMain.handle('get-recent-logs', async (event, limit = 50) => {
    try {
        console.log(`🔧 [BACKEND] Obteniendo últimos ${limit} logs`);

        // Obtener logs recientes de múltiples fuentes
        const detectedIPs = await DetectedIP.findAll({
            order: [['lastSeen', 'DESC']],
            limit: Math.floor(limit / 2)
        });

        const whitelistChanges = await WhitelistIP.findAll({
            order: [['createdAt', 'DESC']],
            limit: Math.floor(limit / 4)
        });

        const windowsEvents = await WindowsEvent.findAll({
            order: [['timestamp', 'DESC']],
            limit: Math.floor(limit / 4)
        });

        // Convertir a formato LogEntry
        const logs = [
            ...detectedIPs.map(ip => ({
                id: `detected-${ip.id}`,
                timestamp: ip.lastSeen,
                level: 'warning',
                source: 'system',
                message: `IP sospechosa detectada: ${ip.ip} (${ip.attempts} intentos)`,
                metadata: { ip: ip.ip, attempts: ip.attempts, status: ip.status }
            })),
            ...whitelistChanges.map(wl => ({
                id: `whitelist-${wl.id}`,
                timestamp: wl.createdAt,
                level: 'info',
                source: 'user',
                message: `IP agregada a whitelist: ${wl.ip}`,
                metadata: { ip: wl.ip, user: wl.addedBy }
            })),
            ...windowsEvents.map(we => ({
                id: `windows-${we.id}`,
                timestamp: we.timestamp,
                level: 'warning',
                source: 'system',
                message: `Evento Windows ${we.eventId}: ${we.description}`,
                metadata: { eventId: we.eventId, sourceIP: we.sourceIP }
            }))
        ];

        // Ordenar y limitar
        logs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

        return {
            success: true,
            data: logs.slice(0, limit)
        };
    } catch (error) {
        console.error('🔧 [BACKEND] Error obteniendo logs recientes:', error);
        return {
            success: false,
            error: error.message
        };
    }
});

ipcMain.handle('search-logs', async (event, query, exactMatch = false) => {
    try {
        console.log(`🔧 [BACKEND] Buscando logs: "${query}"`);

        const searchCondition = exactMatch
            ? { ip: query }
            : { ip: { [Op.like]: `%${query}%` } };

        const detectedIPs = await DetectedIP.findAll({
            where: searchCondition,
            order: [['lastSeen', 'DESC']],
            limit: 100
        });

        const logs = detectedIPs.map(ip => ({
            id: `search-${ip.id}`,
            timestamp: ip.lastSeen,
            level: 'warning',
            source: 'system',
            message: `IP encontrada: ${ip.ip} (${ip.attempts} intentos)`,
            metadata: { ip: ip.ip, attempts: ip.attempts, status: ip.status }
        }));

        return {
            success: true,
            data: logs
        };
    } catch (error) {
        console.error('🔧 [BACKEND] Error buscando logs:', error);
        return {
            success: false,
            error: error.message
        };
    }
});

// ✅ FUNCIONES AUXILIARES:
async function getUserLogs() {
    // Implementar logs de usuario si tienes una tabla de logs
    return [
        {
            id: 'user-login',
            timestamp: new Date(),
            level: 'info',
            source: 'user',
            message: 'Usuario admin inició sesión',
            metadata: { username: 'admin' }
        }
    ];
}

async function getScriptLogs() {
    try {
        // Leer logs de script desde archivo
        const logFile = path.join(logRoot, 'registro_intentos.csv');

        if (!fs.existsSync(logFile)) {
            return [];
        }

        const logContent = fs.readFileSync(logFile, 'utf-8');
        const lines = logContent.split('\n').slice(1).filter(line => line.trim()); // Skip header

        return lines.slice(-50).map((line, index) => {
            const [ip, fecha, usuario, tipoLogin, codigoError, dominio, equipo] = line.split(',');

            return {
                id: `script-${index}`,
                timestamp: new Date(fecha),
                level: 'warning',
                source: 'script',
                message: `Intento fallido desde ${ip} - Usuario: ${usuario}`,
                metadata: { ip, usuario, tipoLogin, codigoError, dominio, equipo }
            };
        });
    } catch (error) {
        console.error('Error leyendo logs de script:', error);
        return [];
    }
}

async function getSystemLogs() {
    try {
        // Logs desde base de datos SQLite
        const windowsEvents = await WindowsEvent.findAll({
            order: [['timestamp', 'DESC']],
            limit: 30
        });

        return windowsEvents.map(event => ({
            id: `system-${event.id}`,
            timestamp: event.timestamp,
            level: 'info',
            source: 'system',
            message: `Evento Windows ${event.eventId}: ${event.description}`,
            metadata: {
                eventId: event.eventId,
                sourceIP: event.sourceIP,
                username: event.username
            }
        }));
    } catch (error) {
        console.error('Error obteniendo logs del sistema:', error);
        return [];
    }
}

// Handler para escaneo completo + bloqueo
ipcMain.handle('execute-full-scan-and-block', async (event) => {
    try {
        console.log('🔧 [BACKEND] Ejecutando escaneo completo + bloqueo...');

        // 1. Ejecutar análisis de IPs
        const analysisResult = await executeIPAnalysis(event);

        if (analysisResult && analysisResult.detectedIPs.length > 0) {
            // 2. Ejecutar bloqueo automático
            const firewallResult = await executeFirewallUpdate(event);

            return {
                success: true,
                data: {
                    analysis: analysisResult,
                    firewall: firewallResult,
                    message: `Escaneo completado: ${analysisResult.detectedIPs.length} IPs detectadas y bloqueadas`
                }
            };
        } else {
            return {
                success: true,
                data: {
                    analysis: analysisResult,
                    message: 'Escaneo completado: No se detectaron nuevas amenazas'
                }
            };
        }
    } catch (error) {
        console.error('🔧 [BACKEND] Error en escaneo completo:', error);
        event.sender.send('log-error', `Error en escaneo completo: ${error.message}`);
        return { success: false, error: error.message };
    }
});

// Handler para escaneo simple
ipcMain.handle('execute-single-scan', async (event) => {
    try {
        console.log('🔧 [BACKEND] Ejecutando escaneo simple...');

        const result = await executeIPAnalysis(event);

        return {
            success: true,
            data: result,
            message: `Escaneo simple completado: ${result?.detectedIPs?.length || 0} IPs detectadas`
        };
    } catch (error) {
        console.error('🔧 [BACKEND] Error en escaneo simple:', error);
        event.sender.send('log-error', `Error en escaneo simple: ${error.message}`);
        return { success: false, error: error.message };
    }
});

// Handler para actualización de firewall
ipcMain.handle('execute-firewall-update', async (event) => {
    try {
        console.log('🔧 [BACKEND] Ejecutando actualización de firewall...');

        const result = await executeFirewallUpdate(event);

        return {
            success: true,
            data: result,
            message: 'Firewall actualizado correctamente'
        };
    } catch (error) {
        console.error('🔧 [BACKEND] Error actualizando firewall:', error);
        event.sender.send('log-error', `Error actualizando firewall: ${error.message}`);
        return { success: false, error: error.message };
    }
});

// Handler para limpiar IPs detectadas
ipcMain.handle('clear-detected-ips', async (event) => {
    try {
        console.log('🔧 [BACKEND] Limpiando IPs detectadas...');

        // Limpiar archivo de IPs
        const ipsFile = path.join(logRoot, 'salida_ips.txt');

        if (fs.existsSync(ipsFile)) {
            fs.writeFileSync(ipsFile, '');
            console.log('🔧 [BACKEND] Archivo de IPs limpiado');
        }

        // Limpiar IPs con estado 'detected' de la base de datos
        await DetectedIP.update(
            { status: 'cleared' },
            { where: { status: 'detected' } }
        );

        event.sender.send('log-data', 'IPs detectadas limpiadas exitosamente');

        return {
            success: true,
            message: 'IPs detectadas limpiadas exitosamente'
        };
    } catch (error) {
        console.error('🔧 [BACKEND] Error limpiando IPs:', error);
        event.sender.send('log-error', `Error limpiando IPs: ${error.message}`);
        return { success: false, error: error.message };
    }
});

ipcMain.handle('remove-multiple-ips-from-firewall', async (event, ips) => {
    try {
        let removedCount = 0;

        for (const ip of ips) {
            const result = await firewallManager.removeIPFromFirewall(ip);
            if (result.success) removedCount++;
        }

        return {
            success: true,
            data: { removed: removedCount, total: ips.length },
            message: `${removedCount} de ${ips.length} IPs removidas`
        };
    } catch (error) {
        return { success: false, error: error.message };
    }
});
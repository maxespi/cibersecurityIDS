const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const fs = require('fs');
const { Op } = require('sequelize'); // ← AGREGAR ESTA LÍNEA
const sequelize = require('./db/config/db');
const User = require('./db/models/User');

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

    mainWindow.webContents.on('did-finish-load', () => {
        console.log('La aplicación se ha abierto.');
        //mainWindow.webContents.send('user-logged-in', 'admin');
    });

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
        ipcMain.handle('navigate-to-scripts', () => {
            mainWindow.loadFile(path.join(__dirname, 'src', 'views', 'scriptsView.html'));
        });

        ipcMain.handle('navigate-to-logs', () => {
            mainWindow.loadFile(path.join(__dirname, 'src', 'views', 'logsView.html'));
        });

        ipcMain.handle('navigate-to-firewall', () => {
            mainWindow.loadFile(path.join(__dirname, 'src', 'views', 'firewallView.html'));
        });

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
    const scriptPath = path.join(scriptRoot, scriptName);
    const logPath = logRoot;
    const configPath = configRoot;

    return new Promise((resolve, reject) => {
        const script = spawn('powershell.exe', [
            '-File', scriptPath,
            '-LogPath', logPath,
            '-ConfigPath', configPath
        ], { env: { ...process.env, LANG: 'en_US.UTF-8' } });

        script.stdout.on('data', (data) => {
            event.sender.send('log-data', data.toString());
        });

        script.stderr.on('data', (data) => {
            event.sender.send('log-error', data.toString());
        });

        script.on('close', (code) => {
            event.sender.send('log-close', `Proceso terminado, codigo: ${code}`);
            if (code === 0) {
                resolve({ success: true });
            } else {
                reject(new Error(`Script exited with code ${code}`));
            }
        });

        script.on('error', (error) => {
            reject(error);
        });
    });
});

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
                isAdmin: isAdmin,
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
    try {
        return {
            success: true,
            data: {
                isRunning: false,
                lastRun: new Date().toISOString(),
                interval: 30
            }
        };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

// AGREGAR HANDLER FALTANTE PARA LOGS
ipcMain.handle('get-logs', async (event, type) => {
    try {
        // Implementar lógica para obtener logs según el tipo
        return {
            success: true,
            data: []
        };
    } catch (error) {
        return { success: false, error: error.message };
    }
});
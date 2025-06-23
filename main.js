const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const fs = require('fs');
const sequelize = require('./db/config/db');
const User = require('./db/models/User');
const scanForIpIn4625 = require('./src/utils/scanForIpIn4625');

// Importar el FirewallManager
const FirewallManager = require('./src/utils/firewallManager');
const firewallManager = new FirewallManager();

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
        mainWindow.webContents.send('user-logged-in', 'admin');
    });

    // En desarrollo, abrir DevTools
    if (process.env.NODE_ENV === 'development') {
        mainWindow.webContents.openDevTools();
    }

    return mainWindow;
}

app.whenReady().then(async () => {
    try {
        console.log('Iniciando la aplicación...');

        // Verificar la conexión a la base de datos
        console.log('Intentando conectar a la base de datos...');
        await sequelize.authenticate();
        console.log('Connection has been established successfully.');

        // Sincronizar la base de datos
        console.log('Sincronizando la base de datos...');
        await sequelize.sync();
        console.log('Database synchronized.');

        // Verificar si el usuario 'admin' ya existe
        console.log('Verificando si el usuario "admin" ya existe...');
        const existingUser = await User.findOne({ where: { username: 'admin' } });
        if (!existingUser) {
            console.log('Creando un nuevo usuario "admin"...');
            const newUser = await User.create({ username: 'admin', password: 'admin' });
            console.log('New user created:', newUser.toJSON());
        } else {
            console.log('User "admin" already exists.');
        }

        // Crear la ventana principal
        const mainWindow = createWindow();

        // Handlers de navegación
        ipcMain.handle('navigate-to-scripts', () => {
            mainWindow.loadFile(path.join(__dirname, 'src', 'views', 'scriptsView.html')).catch((err) => {
                console.error('Error loading scriptsView.html:', err);
            });
        });

        ipcMain.handle('navigate-to-logs', () => {
            mainWindow.loadFile(path.join(__dirname, 'src', 'views', 'logsView.html')).catch((err) => {
                console.error('Error loading logsView.html:', err);
            });
        });

        ipcMain.handle('navigate-to-firewall', () => {
            mainWindow.loadFile(path.join(__dirname, 'src', 'views', 'firewallView.html')).catch((err) => {
                console.error('Error loading firewallView.html:', err);
            });
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

// Manejar errores globales
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

// Manejar la ejecución de scripts
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
                resolve();
            } else {
                reject(new Error(`Script exited with code ${code}`));
            }
        });

        script.on('error', (error) => {
            reject(error);
        });
    });
});

// Cargar contenido de logs
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

// Login handler
ipcMain.handle('login', async (event, username, password) => {
    console.log(`Intentando iniciar sesión con usuario: ${username}`);
    try {
        const user = await User.findOne({ where: { username, password } });
        if (user) {
            console.log('Inicio de sesión exitoso');
            return { success: true };
        } else {
            console.log('Inicio de sesión fallido: usuario no encontrado');
            return { success: false };
        }
    } catch (error) {
        console.error('Error during login:', error);
        return { success: false };
    }
});

// ================ NUEVOS HANDLERS DE FIREWALL ================

// Obtener IPs bloqueadas en el firewall
ipcMain.handle('get-blocked-ips', async (event) => {
    try {
        console.log('Obteniendo IPs bloqueadas del firewall...');
        const result = await firewallManager.getBlockedIPs();
        console.log(`Resultado: ${result.success ? 'Éxito' : 'Error'}`);
        return result;
    } catch (error) {
        console.error('Error al obtener IPs bloqueadas:', error);
        return {
            success: false,
            error: error.message
        };
    }
});

// Obtener estadísticas del firewall
ipcMain.handle('get-firewall-stats', async (event) => {
    try {
        console.log('Obteniendo estadísticas del firewall...');
        const stats = await firewallManager.getFirewallStats();
        return {
            success: true,
            data: stats
        };
    } catch (error) {
        console.error('Error al obtener estadísticas del firewall:', error);
        return {
            success: false,
            error: error.message
        };
    }
});

// Eliminar IP específica del firewall
ipcMain.handle('remove-ip-from-firewall', async (event, ip) => {
    try {
        console.log(`Eliminando IP ${ip} del firewall...`);
        const result = await firewallManager.removeIPFromFirewall(ip);
        console.log(`Resultado: ${result.success ? 'Éxito' : 'Error'}`);
        return result;
    } catch (error) {
        console.error('Error al eliminar IP del firewall:', error);
        return {
            success: false,
            error: error.message
        };
    }
});

// Obtener información geográfica de IPs
ipcMain.handle('get-ip-geolocation', async (event, ip) => {
    try {
        const result = await firewallManager.getIPGeolocation(ip);
        return result;
    } catch (error) {
        console.error('Error al obtener geolocalización:', error);
        return {
            success: false,
            error: error.message
        };
    }
});

// Verificar si la aplicación tiene permisos de administrador
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
            console.log(`Permisos de administrador: ${isAdmin ? 'SÍ' : 'NO'}`);
            resolve({
                isAdmin: isAdmin,
                message: isAdmin ? 'Running with administrator privileges' : 'Administrator privileges required'
            });
        });

        ps.on('error', (error) => {
            console.error('Error checking admin privileges:', error);
            resolve({
                isAdmin: false,
                message: 'Error checking privileges'
            });
        });
    });
});

// ================ AGREGAR ESTE HANDLER ================
// Obtener estado del script
ipcMain.handle('get-script-status', async (event) => {
    try {
        // Aquí puedes implementar la lógica para verificar si el script está ejecutándose
        // Por ejemplo, verificar si hay un proceso activo o una variable de estado
        return {
            success: true,
            data: {
                isRunning: false, // Cambiar según tu lógica
                lastRun: new Date().toISOString(),
                interval: 30
            }
        };
    } catch (error) {
        console.error('Error getting script status:', error);
        return {
            success: false,
            error: error.message
        };
    }
});
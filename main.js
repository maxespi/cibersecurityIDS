const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const fs = require('fs');
const sequelize = require('./db/config/db');
const User = require('./db/models/User');
const scanForIpIn4625 = require('./src/utils/scanForIpIn4625');

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
const logRoot = config[environment].logRoot;
const configRoot = config[environment].configRoot;

function createWindow() {
    const mainWindow = new BrowserWindow({
        width: 1100,
        height: 800,
        minWidth: 800,
        minHeight: 600,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            enableRemoteModule: false,
            nodeIntegration: false
        },
        //autoHideMenuBar: true // Ocultar la barra de menú automáticamente
    });
    //mainWindow.maximize();
    mainWindow.loadFile(path.join(__dirname, 'src/views/main.html')); // Cargar login.html inicialmente
    mainWindow.setMenuBarVisibility(false);

    // Enviar un evento al proceso de renderizado cuando la aplicación se abre
    mainWindow.webContents.on('did-finish-load', () => {
        mainWindow.webContents.send('app-opened');
    });

    /*   if (process.env.NODE_ENV === 'development') {
        mainWindow.webContents.openDevTools();
      } */
    return mainWindow; // Asegúrate de devolver la instancia de la ventana
}

app.whenReady().then(async () => {
    try {
        // Verificar la conexión a la base de datos
        await sequelize.authenticate();
        console.log('Connection has been established successfully.');

        // Sincronizar la base de datos
        await sequelize.sync();
        console.log('Database synchronized.');

        // Verificar si el usuario 'admin' ya existe
        const existingUser = await User.findOne({ where: { username: 'admin' } });
        if (!existingUser) {
            // Crear un nuevo usuario si no existe
            const newUser = await User.create({ username: 'admin', password: 'admin' });
            console.log('New user created:', newUser.toJSON());
        } else {
            console.log('User "admin" already exists.');
        }

        // Crear la ventana principal
        const mainWindow = createWindow();

        mainWindow.webContents.on('did-finish-load', () => {
            mainWindow.webContents.send('user-logged-in', 'admin');
        });

        ipcMain.handle('navigate-to-scripts', () => {
            mainWindow.loadFile(path.join(__dirname, 'src/views/scriptsView.html'));
        });

        ipcMain.handle('navigate-to-logs', () => {
            mainWindow.loadFile(path.join(__dirname, 'src/views/logsView.html'));
        });


    } catch (error) {
        console.error('Unable to connect to the database:', error);
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

// Manejar la comunicación con el proceso de renderizado
ipcMain.handle('run-script', async (event, scriptName) => {
    const scriptPath = path.join(scriptRoot, scriptName);
    const logPath = logRoot;
    const configPath = configRoot;

    //console.log(`Ejecutando script en la ruta: ${scriptPath}`);  // Mensaje de depuración

    /*   try {
          const logData = await scanForIpIn4625(logPath, configPath);
          event.sender.send('log-data', logData);
          return Promise.resolve();
      } catch (error) {
          event.sender.send('log-error', error.message);
          return Promise.reject(error);
      } */

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

ipcMain.on('load-log-content', (event) => {
    const logFilePath = path.join(logRoot, 'registro_intentos.csv');

    // Asegurarse de que el directorio del archivo de log exista
    const logDir = path.dirname(logFilePath);
    if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir, { recursive: true });
    }


    // Asegurarse de que el archivo de log exista
    // el file tiene estos encabezados IP,Fecha,Usuario,TipoInicioSesion,CodigoError,Dominio,NombreEquipo
    if (!fs.existsSync(logFilePath)) {
        fs.writeFileSync(logFilePath, '');
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
    fs.readFile(logFilePath, 'utf-8', (err, data) => {
        if (err) {
            event.reply('log-content2', `Error al leer el archivo de log: ${err.message}`);
        } else {
            event.reply('log-content2', data);
        }
    });
});

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
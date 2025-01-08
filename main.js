const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const fs = require('fs');

// Habilitar recarga automática en desarrollo
if (process.env.NODE_ENV === 'development') {
    require('electron-reload')(__dirname, {
        electron: path.join(__dirname, 'node_modules', '.bin', 'electron')
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
        autoHideMenuBar: true // Ocultar la barra de menú automáticamente

    });

    mainWindow.loadFile('index.html');

    // Asegurarse de que la barra de menú esté oculta
    mainWindow.setMenuBarVisibility(false);

    // Enviar un evento al proceso de renderizado cuando la aplicación se abre
    mainWindow.webContents.on('did-finish-load', () => {
        mainWindow.webContents.send('app-opened');
    });

    // Abrir las herramientas de desarrollo (opcional)
    //mainWindow.webContents.openDevTools();
}

app.whenReady().then(() => {
    createWindow();

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

    console.log(`Ejecutando script en la ruta: ${scriptPath}`);  // Mensaje de depuración

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
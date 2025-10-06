// src/core/WindowManager.js
const { BrowserWindow } = require('electron');
const path = require('path');
const logger = require('../utils/logger');
const { IS_DEVELOPMENT } = require('../config/constants');

/**
 * Gestión centralizada de ventanas de Electron
 * Separa la lógica de ventanas del archivo main.js
 */
class WindowManager {
    constructor() {
        this.windows = new Map();
    }

    /**
     * Crea la ventana de login
     */
    createLoginWindow() {
        const loginWindow = new BrowserWindow({
            width: 500,
            height: 600,
            resizable: false,
            webPreferences: {
                preload: path.join(__dirname, '../../preload.js'),
                contextIsolation: true,
                enableRemoteModule: false,
                nodeIntegration: false,
                webSecurity: true
            },
            autoHideMenuBar: true,
            icon: path.join(__dirname, '../../hacker.ico'),
            show: false,
            frame: false, // Sin borde para look más moderno
            transparent: true,
            alwaysOnTop: false,
            center: true
        });

        // Mostrar cuando esté listo
        loginWindow.once('ready-to-show', () => {
            loginWindow.show();
            logger.info('Ventana de login mostrada');
        });

        // Cargar la pantalla de login
        loginWindow.loadFile(path.join(__dirname, '../views/login-hades.html'))
            .catch((err) => {
                logger.error('Error cargando login.html', { error: err.message });
            });

        // Manejar cierre de ventana (solo limpieza, no cerrar app)
        loginWindow.on('closed', () => {
            this.windows.delete('login');
            logger.info('Ventana de login cerrada');

            // Si no hay ventana principal abierta, cerrar app
            const mainWindow = this.windows.get('main');
            if (!mainWindow || mainWindow.isDestroyed()) {
                logger.info('No hay ventana principal, cerrando aplicación');
                const { app } = require('electron');
                app.quit();
            }
        });

        this.windows.set('login', loginWindow);
        return loginWindow;
    }

    /**
     * Crea la ventana principal de la aplicación
     */
    createMainWindow() {
        const mainWindow = new BrowserWindow({
            width: 1200,
            height: 900,
            minWidth: 1000,
            minHeight: 700,
            webPreferences: {
                preload: path.join(__dirname, '../../preload.js'),
                contextIsolation: true,
                enableRemoteModule: false,
                nodeIntegration: false,
                webSecurity: true, // SECURITY FIX: Enable web security
                allowRunningInsecureContent: false,
                experimentalFeatures: false
            },
            autoHideMenuBar: true,
            icon: path.join(__dirname, '../../hacker.ico'), // Si tienes un icono
            show: false // No mostrar hasta que esté listo
        });

        // Mostrar cuando esté listo para prevenir flash
        mainWindow.once('ready-to-show', () => {
            mainWindow.show();
            logger.info('Ventana principal mostrada');
        });

        // Cargar la interfaz
        if (IS_DEVELOPMENT) {
            // En desarrollo, cargar desde el servidor de desarrollo si existe
            mainWindow.loadFile(path.join(__dirname, '../../src/views/main-react.html'))
                .catch((err) => {
                    logger.error('Error cargando main.html', { error: err.message });
                });
        } else {
            // En producción, cargar desde archivos empaquetados
            mainWindow.loadFile(path.join(__dirname, '../../src/views/main-react.html'))
                .catch((err) => {
                    logger.error('Error cargando main.html', { error: err.message });
                });
        }

        // Guardar referencia
        this.windows.set('main', mainWindow);

        // Configurar eventos de ventana
        this.setupWindowEvents(mainWindow);

        logger.info('Ventana principal creada', {
            width: mainWindow.getBounds().width,
            height: mainWindow.getBounds().height
        });

        return mainWindow;
    }

    /**
     * Cierra la ventana de login y abre la principal
     */
    onLoginSuccess(username) {
        logger.info('🔄 onLoginSuccess iniciado para usuario:', username);

        try {
            // Crear ventana principal PRIMERO
            logger.info('🏗️ Creando ventana principal...');
            const mainWindow = this.createMainWindow();

            if (mainWindow) {
                logger.info('✅ Ventana principal creada exitosamente');

                // Solo después de que la ventana principal esté lista, cerrar login
                mainWindow.once('ready-to-show', () => {
                    const loginWindow = this.windows.get('login');
                    logger.info('🔍 Buscando ventana de login para cerrar...');

                    if (loginWindow && !loginWindow.isDestroyed()) {
                        logger.info('✅ Ventana de login encontrada, cerrando...');

                        // Desconectar eventos para evitar que cierre la app
                        loginWindow.removeAllListeners('closed');

                        // Cerrar y destruir la ventana de login
                        loginWindow.destroy();
                        this.windows.delete('login');

                        logger.info('🔐 Ventana de login cerrada y destruida');
                    } else {
                        logger.warn('⚠️ Ventana de login no encontrada o ya destruida');
                    }
                });
            } else {
                logger.error('❌ Error creando ventana principal');
            }

        } catch (error) {
            logger.error('❌ Error en onLoginSuccess:', error.message);
        }
    }

    /**
     * Obtiene la ventana de login
     */
    getLoginWindow() {
        return this.windows.get('login');
    }

    /**
     * Configura eventos comunes de ventana
     */
    setupWindowEvents(window) {
        // Identificar si es la ventana principal
        const isMainWindow = this.windows.get('main') === window;

        window.on('closed', () => {
            logger.info('Ventana cerrada');
            this.removeWindow(window);

            // Si es la ventana principal, cerrar toda la aplicación
            if (isMainWindow) {
                logger.info('Ventana principal cerrada, cerrando aplicación');
                const { app } = require('electron');
                app.quit();
            }
        });

        window.on('minimize', () => {
            logger.debug('Ventana minimizada');
        });

        window.on('maximize', () => {
            logger.debug('Ventana maximizada');
        });

        window.on('unresponsive', () => {
            logger.warn('Ventana no responde');
        });

        window.on('responsive', () => {
            logger.info('Ventana responde nuevamente');
        });

        // Prevenir navegación no autorizada
        window.webContents.on('will-navigate', (event, navigationUrl) => {
            const parsedUrl = new URL(navigationUrl);

            // Solo permitir navegación a archivos locales y HTTPS
            if (parsedUrl.origin !== 'file://' && !parsedUrl.protocol.startsWith('https:')) {
                event.preventDefault();
                logger.warn('Navegación bloqueada por seguridad', { url: navigationUrl });
            }
        });

        // Prevenir ventanas emergentes no autorizadas
        window.webContents.setWindowOpenHandler(({ url }) => {
            logger.warn('Ventana emergente bloqueada', { url });
            return { action: 'deny' };
        });

        // DevTools solo en desarrollo
        if (IS_DEVELOPMENT) {
            window.webContents.openDevTools();
        }
    }

    /**
     * Obtiene una ventana por nombre
     */
    getWindow(name) {
        return this.windows.get(name);
    }

    /**
     * Obtiene la ventana principal
     */
    getMainWindow() {
        return this.getWindow('main');
    }

    /**
     * Cierra una ventana específica
     */
    closeWindow(name) {
        const window = this.windows.get(name);
        if (window && !window.isDestroyed()) {
            window.close();
        }
    }

    /**
     * Cierra todas las ventanas
     */
    closeAllWindows() {
        for (const [name, window] of this.windows) {
            if (window && !window.isDestroyed()) {
                window.close();
            }
        }
        this.windows.clear();
    }

    /**
     * Elimina referencia de ventana cerrada
     */
    removeWindow(window) {
        for (const [name, win] of this.windows) {
            if (win === window) {
                this.windows.delete(name);
                break;
            }
        }
    }

    /**
     * Minimiza todas las ventanas
     */
    minimizeAll() {
        for (const window of this.windows.values()) {
            if (window && !window.isDestroyed()) {
                window.minimize();
            }
        }
    }

    /**
     * Restaura todas las ventanas
     */
    restoreAll() {
        for (const window of this.windows.values()) {
            if (window && !window.isDestroyed()) {
                window.restore();
            }
        }
    }

    /**
     * Obtiene estadísticas de ventanas
     */
    getStats() {
        const stats = {
            total: this.windows.size,
            visible: 0,
            minimized: 0,
            maximized: 0
        };

        for (const window of this.windows.values()) {
            if (window && !window.isDestroyed()) {
                if (window.isVisible()) stats.visible++;
                if (window.isMinimized()) stats.minimized++;
                if (window.isMaximized()) stats.maximized++;
            }
        }

        return stats;
    }

    /**
     * Configura shortcuts globales para ventanas
     */
    setupGlobalShortcuts() {
        const { globalShortcut } = require('electron');

        // Solo en desarrollo
        if (IS_DEVELOPMENT) {
            // F12 para abrir DevTools
            globalShortcut.register('F12', () => {
                const mainWindow = this.getMainWindow();
                if (mainWindow) {
                    mainWindow.webContents.toggleDevTools();
                }
            });

            // Ctrl+R para recargar
            globalShortcut.register('CommandOrControl+R', () => {
                const mainWindow = this.getMainWindow();
                if (mainWindow) {
                    mainWindow.webContents.reload();
                }
            });
        }

        logger.info('Shortcuts globales configurados');
    }

    /**
     * Limpia shortcuts globales
     */
    cleanupGlobalShortcuts() {
        const { globalShortcut } = require('electron');
        globalShortcut.unregisterAll();
        logger.info('Shortcuts globales limpiados');
    }
}

module.exports = WindowManager;
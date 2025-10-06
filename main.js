// main.js - Versión simplificada y modularizada
const { app } = require('electron');
const path = require('path');

// Cargar variables de entorno PRIMERO
const { loadEnvironmentVariables } = require('./src/utils/envLoader');
loadEnvironmentVariables();

// Importar módulos centralizados
const logger = require('./src/utils/logger');
const { IS_DEVELOPMENT } = require('./src/config/constants');
const pathManager = require('./src/config/paths');

// Importar gestores especializados
const WindowManager = require('./src/core/WindowManager');
const IPCHandlers = require('./src/core/IPCHandlers');

// Importar base de datos y modelos
const sequelize = require('./db/config/db');
const User = require('./db/models/User');

// Importar servicios
const FirewallManager = require('./src/utils/firewallManager');

/**
 * Clase principal de la aplicación
 * Gestiona el ciclo de vida y coordina componentes
 */
class ElectronApp {
    constructor() {
        this.windowManager = new WindowManager();
        this.firewallManager = new FirewallManager();
        this.ipcHandlers = null;
        this.isInitialized = false;
    }

    /**
     * Inicializa la aplicación
     */
    async initialize() {
        try {
            logger.initialize(pathManager.getLogPath());
            logger.info('🚀 Aplicación iniciando...');

            // Ejecutar migraciones antes de inicializar
            const MigrationManager = require('./src/utils/migrationManager');
            const migrationManager = new MigrationManager();
            const migrationResult = await migrationManager.runMigrations();

            if (!migrationResult.success) {
                logger.warn('⚠️ Migración falló, continuando con configuración actual', { error: migrationResult.error });
            }

            // Configurar recarga automática en desarrollo
            if (IS_DEVELOPMENT) {
                require('electron-reload')(__dirname, {
                    electron: path.join(__dirname, 'node_modules', '.bin', 'electron'),
                });
                logger.debug('Recarga automática habilitada para desarrollo');
            }

            // Inicializar base de datos
            await this.initializeDatabase();

            // Crear ventana de login primero
            const loginWindow = this.windowManager.createLoginWindow();

            // Configurar manejadores IPC
            this.ipcHandlers = new IPCHandlers(this.firewallManager, this.windowManager);

            // Configurar evento de login exitoso
            this.setupLoginEvents();

            // Configurar shortcuts globales
            this.windowManager.setupGlobalShortcuts();

            // Configurar manejadores de errores globales
            this.setupErrorHandlers();

            this.isInitialized = true;
            logger.info('✅ Aplicación inicializada correctamente');

            return mainWindow;

        } catch (error) {
            logger.error('❌ Error durante inicialización', { error: error.message });
            throw error;
        }
    }

    /**
     * Configura eventos de login
     */
    setupLoginEvents() {
        const { ipcMain } = require('electron');

        ipcMain.handle('on-login-success', async (event, username) => {
            try {
                logger.info('🔑 Login exitoso para:', username);

                // Cerrar ventana de login y abrir principal
                logger.info('🔄 Activando transición de ventanas...');

                // Obtener referencia correcta al windowManager
                const windowManager = electronApp.windowManager;
                if (windowManager && typeof windowManager.onLoginSuccess === 'function') {
                    windowManager.onLoginSuccess(username);
                    logger.info('✅ Transición de ventanas activada');
                } else {
                    logger.error('❌ WindowManager no disponible');
                    // Fallback directo
                    const loginWindow = windowManager.getLoginWindow();
                    if (loginWindow) {
                        loginWindow.close();
                    }
                    windowManager.createMainWindow();
                }

                return { success: true };
            } catch (error) {
                logger.error('Error manejando login exitoso', { error: error.message });
                return { success: false };
            }
        });
    }

    /**
     * Inicializa la base de datos
     */
    async initializeDatabase() {
        try {
            await sequelize.authenticate();
            logger.info('🗄️ Conexión a base de datos establecida');

            await sequelize.sync({
                alter: process.env.FORCE_SYNC === 'true',
                logging: !IS_DEVELOPMENT
            });

            // Verificar/crear usuario admin
            await this.ensureAdminUser();

            logger.info('📊 Base de datos sincronizada');

        } catch (error) {
            logger.error('❌ Error inicializando base de datos', { error: error.message });
            throw error;
        }
    }

    /**
     * Asegura que existe el usuario admin
     */
    async ensureAdminUser() {
        try {
            const existingUser = await User.findOne({ where: { username: 'admin' } });

            if (!existingUser) {
                await User.create({ username: 'admin', password: '123' });
                logger.info('👤 Usuario admin creado con credenciales: admin/123');
            } else {
                // Verificar si necesita actualizar password
                if (existingUser.password === 'admin') {
                    await User.update({ password: '123' }, { where: { username: 'admin' } });
                    logger.info('👤 Password de admin actualizada a 123');
                } else {
                    logger.info('👤 Usuario admin ya existe con password:', existingUser.password);
                }
            }
        } catch (error) {
            logger.error('Error gestionando usuario admin', { error: error.message });
            throw error;
        }
    }

    /**
     * Configura manejadores de errores globales
     */
    setupErrorHandlers() {
        // Excepciones no capturadas
        process.on('uncaughtException', (error) => {
            logger.error('Excepción no capturada', {
                error: error.message,
                stack: error.stack
            });

            pathManager.ensureDirectoryExists(pathManager.getLogPath());
            const fs = require('fs');
            fs.appendFileSync(
                pathManager.getAppFilePaths().errorLog,
                `Uncaught Exception: ${error.message}\n${error.stack}\n`
            );

            // En producción, cerrar la aplicación gracefully
            if (!IS_DEVELOPMENT) {
                app.quit();
            }
        });

        // Promesas rechazadas no manejadas
        process.on('unhandledRejection', (reason, promise) => {
            logger.error('Promesa rechazada no manejada', { reason: reason });

            pathManager.ensureDirectoryExists(pathManager.getLogPath());
            const fs = require('fs');
            fs.appendFileSync(
                pathManager.getAppFilePaths().errorLog,
                `Unhandled Rejection: ${reason}\n${promise}\n`
            );
        });

        logger.info('🛡️ Manejadores de errores globales configurados');
    }

    /**
     * Limpia recursos antes de cerrar
     */
    async cleanup() {
        try {
            logger.info('🧹 Iniciando limpieza de recursos...');

            // Limpiar shortcuts globales
            this.windowManager.cleanupGlobalShortcuts();

            // Cerrar conexión de base de datos
            await sequelize.close();

            // Limpiar archivos temporales
            pathManager.cleanupTempFiles();

            logger.info('✅ Limpieza completada');

        } catch (error) {
            logger.error('Error durante limpieza', { error: error.message });
        }
    }

    /**
     * Obtiene estadísticas de la aplicación
     */
    getStats() {
        return {
            initialized: this.isInitialized,
            windows: this.windowManager.getStats(),
            environment: IS_DEVELOPMENT ? 'development' : 'production',
            uptime: process.uptime()
        };
    }
}

// Instancia única de la aplicación
const electronApp = new ElectronApp();

// ================ EVENTOS DE ELECTRON ================

app.whenReady().then(async () => {
    try {
        await electronApp.initialize();
    } catch (error) {
        logger.error('Error fatal durante inicialización', { error: error.message });
        electronApp.windowManager.createLoginWindow(); // Crear ventana de login como fallback
    }
});

app.on('window-all-closed', () => {
    logger.info('Todas las ventanas cerradas');

    // En macOS, mantener la aplicación activa cuando se cierran todas las ventanas
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    // En macOS, recrear ventana cuando se hace clic en el dock
    if (electronApp.windowManager.getMainWindow() === null && electronApp.windowManager.getLoginWindow() === null) {
        electronApp.windowManager.createLoginWindow();
    }
});

app.on('before-quit', async (event) => {
    logger.info('Aplicación cerrándose...');

    // Prevenir cierre inmediato para permitir limpieza
    event.preventDefault();

    try {
        await electronApp.cleanup();
    } finally {
        // Cerrar definitivamente
        app.exit(0);
    }
});

// Configuración de seguridad adicional
app.on('web-contents-created', (event, contents) => {
    // Prevenir navegación a URLs externas
    contents.on('will-navigate', (navigationEvent, navigationUrl) => {
        const parsedUrl = new URL(navigationUrl);

        if (parsedUrl.origin !== 'file://') {
            navigationEvent.preventDefault();
            logger.warn('Navegación externa bloqueada', { url: navigationUrl });
        }
    });

    // Prevenir ventanas emergentes
    contents.setWindowOpenHandler(({ url }) => {
        logger.warn('Ventana emergente bloqueada', { url });
        return { action: 'deny' };
    });
});

// Exportar para testing
module.exports = electronApp;
// src/config/paths.js
const path = require('path');
const fs = require('fs');
const { PATHS, ENVIRONMENT } = require('./constants');
const logger = require('../utils/logger');

/**
 * Gestor centralizado de rutas de archivos
 * Elimina duplicación de lógica de paths en toda la aplicación
 */
class PathManager {
    constructor() {
        this.environment = ENVIRONMENT;
        this.ensureDirectories();
    }

    /**
     * Obtiene las rutas de configuración según el environment
     */
    getConfigPaths() {
        return PATHS.CONFIG[this.environment];
    }

    /**
     * Obtiene la ruta de scripts según el environment
     */
    getScriptPath(scriptName = '') {
        const configPaths = this.getConfigPaths();
        return scriptName ?
            path.join(configPaths.scriptRoot, scriptName) :
            configPaths.scriptRoot;
    }

    /**
     * Obtiene la ruta de logs según el environment
     */
    getLogPath(logName = '') {
        return logName ?
            path.join(PATHS.LOGS, logName) :
            PATHS.LOGS;
    }

    /**
     * Obtiene la ruta de configuración según el environment
     */
    getConfigPath(configName = '') {
        const configPaths = this.getConfigPaths();
        return configName ?
            path.join(configPaths.configRoot, configName) :
            configPaths.configRoot;
    }

    /**
     * Obtiene la ruta temporal
     */
    getTempPath(fileName = '') {
        return fileName ?
            path.join(PATHS.TEMP, fileName) :
            PATHS.TEMP;
    }

    /**
     * Rutas específicas para archivos de la aplicación
     */
    getAppFilePaths() {
        return {
            // Archivos de log específicos
            errorLog: this.getLogPath('error.log'),
            applicationLog: this.getLogPath('application.log'),
            securityLog: this.getLogPath('security.log'),
            firewallLog: this.getLogPath('firewall.log'),

            // Archivos CSV de registro
            registroIntentos: this.getLogPath('registro_intentos.csv'),
            salidaIps: this.getLogPath('salida_ips.txt'),

            // Archivos temporales
            tempIpsToBlock: this.getTempPath('temp_ips_to_block.txt'),
            tempEventData: this.getTempPath('temp_event_data.json'),

            // Scripts PowerShell
            blockIpScript: this.getScriptPath('BlockIpAndUpdateForOneRule.ps1'),

            // Archivos de configuración
            mainConfig: path.join(process.cwd(), 'config.json')
        };
    }

    /**
     * Asegura que todos los directorios necesarios existan
     */
    ensureDirectories() {
        const dirsToCreate = [
            PATHS.LOGS,
            PATHS.TEMP,
            this.getScriptPath(),
            this.getConfigPath()
        ];

        dirsToCreate.forEach(dir => {
            this.ensureDirectoryExists(dir);
        });
    }

    /**
     * Crea un directorio si no existe
     */
    ensureDirectoryExists(dirPath) {
        try {
            if (!fs.existsSync(dirPath)) {
                fs.mkdirSync(dirPath, { recursive: true });
                logger.info('Directorio creado', { path: dirPath });
            }
        } catch (error) {
            logger.error('Error creando directorio', {
                path: dirPath,
                error: error.message
            });
        }
    }

    /**
     * Verifica si un archivo existe
     */
    fileExists(filePath) {
        try {
            return fs.existsSync(filePath);
        } catch (error) {
            logger.warn('Error verificando archivo', {
                path: filePath,
                error: error.message
            });
            return false;
        }
    }

    /**
     * Obtiene información de un archivo
     */
    getFileInfo(filePath) {
        try {
            if (this.fileExists(filePath)) {
                const stats = fs.statSync(filePath);
                return {
                    exists: true,
                    size: stats.size,
                    modified: stats.mtime,
                    isDirectory: stats.isDirectory(),
                    isFile: stats.isFile()
                };
            }
            return { exists: false };
        } catch (error) {
            logger.error('Error obteniendo información del archivo', {
                path: filePath,
                error: error.message
            });
            return { exists: false, error: error.message };
        }
    }

    /**
     * Limpia archivos temporales antiguos
     */
    cleanupTempFiles(maxAgeHours = 24) {
        try {
            const tempDir = PATHS.TEMP;
            if (!fs.existsSync(tempDir)) return;

            const files = fs.readdirSync(tempDir);
            const maxAge = maxAgeHours * 60 * 60 * 1000; // Convert to milliseconds
            const now = Date.now();

            files.forEach(file => {
                const filePath = path.join(tempDir, file);
                const stats = fs.statSync(filePath);

                if (now - stats.mtime.getTime() > maxAge) {
                    fs.unlinkSync(filePath);
                    logger.info('Archivo temporal eliminado', { file: filePath });
                }
            });
        } catch (error) {
            logger.error('Error limpiando archivos temporales', {
                error: error.message
            });
        }
    }
}

// Singleton instance
const pathManager = new PathManager();

module.exports = pathManager;
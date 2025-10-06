// src/utils/migrationManager.js
const fs = require('fs');
const path = require('path');
const { app } = require('electron');
const logger = require('./logger');

/**
 * Gestor de migración de datos entre versiones
 * Soluciona el problema de pérdida de datos en actualizaciones
 */
class MigrationManager {
    constructor() {
        this.appVersion = require('../../package.json').version;
        this.userDataPath = app.getPath('userData');
        this.oldDbPath = path.join(__dirname, '../../db/config/database.sqlite');
        this.newDbPath = path.join(this.userDataPath, 'database.sqlite');
        this.migrationLogPath = path.join(this.userDataPath, 'migration.log');
    }

    /**
     * Ejecuta todas las migraciones necesarias
     */
    async runMigrations() {
        try {
            logger.info('🔄 Iniciando proceso de migración...');

            // Verificar si es primera instalación
            const isFirstInstall = await this.isFirstInstallation();

            if (isFirstInstall) {
                logger.info('📦 Primera instalación detectada');
                await this.setupFreshInstallation();
            } else {
                logger.info('🔄 Actualización detectada');
                await this.handleUpdate();
            }

            // Registrar migración completada
            await this.recordMigration();

            logger.info('✅ Migración completada exitosamente');
            return { success: true };

        } catch (error) {
            logger.error('❌ Error durante migración', { error: error.message });
            return { success: false, error: error.message };
        }
    }

    /**
     * Verifica si es la primera instalación
     */
    async isFirstInstallation() {
        // Verificar si existe base de datos en userData
        const newDbExists = fs.existsSync(this.newDbPath);

        // Verificar si existe archivo de migración
        const migrationExists = fs.existsSync(this.migrationLogPath);

        return !newDbExists && !migrationExists;
    }

    /**
     * Configura una instalación limpia
     */
    async setupFreshInstallation() {
        logger.info('🏗️ Configurando instalación limpia...');

        // Asegurar que el directorio userData existe
        if (!fs.existsSync(this.userDataPath)) {
            fs.mkdirSync(this.userDataPath, { recursive: true });
        }

        // Si existe base de datos en ubicación antigua, migrarla
        if (fs.existsSync(this.oldDbPath)) {
            logger.info('📋 Migrando base de datos desde instalación anterior...');
            await this.migrateDatabaseToUserData();
        }

        logger.info('✅ Instalación limpia configurada');
    }

    /**
     * Maneja actualización de versión existente
     */
    async handleUpdate() {
        logger.info('🔄 Procesando actualización...');

        const lastVersion = await this.getLastMigratedVersion();
        logger.info('📊 Última versión migrada:', { lastVersion });

        // Si la base de datos aún está en la ubicación antigua, migrarla
        if (fs.existsSync(this.oldDbPath) && !fs.existsSync(this.newDbPath)) {
            logger.info('📋 Migración de base de datos requerida');
            await this.migrateDatabaseToUserData();
        }

        // Ejecutar migraciones específicas por versión
        await this.runVersionMigrations(lastVersion, this.appVersion);

        logger.info('✅ Actualización procesada');
    }

    /**
     * Migra la base de datos a userData
     */
    async migrateDatabaseToUserData() {
        try {
            logger.info('🚀 Iniciando migración de base de datos...');
            logger.info(`📂 Origen: ${this.oldDbPath}`);
            logger.info(`📂 Destino: ${this.newDbPath}`);

            // Verificar que el archivo origen existe
            if (!fs.existsSync(this.oldDbPath)) {
                logger.warn('⚠️ No se encontró base de datos en ubicación antigua');
                return { success: true, message: 'No migration needed' };
            }

            // Verificar si el destino ya existe
            if (fs.existsSync(this.newDbPath)) {
                logger.info('📋 Base de datos ya existe en nueva ubicación');

                // Crear backup de la base de datos actual
                const backupPath = `${this.newDbPath}.backup.${Date.now()}`;
                fs.copyFileSync(this.newDbPath, backupPath);
                logger.info('💾 Backup creado:', { backupPath });
            }

            // Copiar base de datos
            fs.copyFileSync(this.oldDbPath, this.newDbPath);

            // Verificar integridad de la copia
            const originalSize = fs.statSync(this.oldDbPath).size;
            const copiedSize = fs.statSync(this.newDbPath).size;

            if (originalSize !== copiedSize) {
                throw new Error('Error en integridad de migración - tamaños no coinciden');
            }

            logger.info('✅ Base de datos migrada exitosamente', {
                originalSize,
                copiedSize,
                path: this.newDbPath
            });

            return { success: true };

        } catch (error) {
            logger.error('❌ Error migrando base de datos', { error: error.message });
            throw error;
        }
    }

    /**
     * Ejecuta migraciones específicas por versión
     */
    async runVersionMigrations(fromVersion, toVersion) {
        logger.info('🔄 Ejecutando migraciones de versión...', { fromVersion, toVersion });

        // Aquí se pueden agregar migraciones específicas por versión
        const migrations = [
            {
                version: '1.0.1',
                migration: this.migration_1_0_1.bind(this)
            },
            {
                version: '1.1.0',
                migration: this.migration_1_1_0.bind(this)
            }
        ];

        for (const migration of migrations) {
            if (this.shouldRunMigration(fromVersion, migration.version, toVersion)) {
                logger.info(`🔧 Ejecutando migración ${migration.version}...`);
                await migration.migration();
                logger.info(`✅ Migración ${migration.version} completada`);
            }
        }
    }

    /**
     * Determina si una migración debe ejecutarse
     */
    shouldRunMigration(fromVersion, migrationVersion, toVersion) {
        // Lógica simplificada - en producción usar semver
        return fromVersion < migrationVersion && migrationVersion <= toVersion;
    }

    /**
     * Migración para versión 1.0.1
     */
    async migration_1_0_1() {
        logger.info('🔧 Aplicando migración 1.0.1...');
        // Ejemplo: agregar nueva columna, actualizar configuraciones, etc.
    }

    /**
     * Migración para versión 1.1.0
     */
    async migration_1_1_0() {
        logger.info('🔧 Aplicando migración 1.1.0...');
        // Ejemplo: nueva funcionalidad, cambios de esquema, etc.
    }

    /**
     * Obtiene la última versión migrada
     */
    async getLastMigratedVersion() {
        try {
            if (!fs.existsSync(this.migrationLogPath)) {
                return '0.0.0';
            }

            const content = fs.readFileSync(this.migrationLogPath, 'utf8');
            const lines = content.trim().split('\n');
            const lastLine = lines[lines.length - 1];

            if (lastLine) {
                const match = lastLine.match(/version:\s*(\d+\.\d+\.\d+)/);
                return match ? match[1] : '0.0.0';
            }

            return '0.0.0';
        } catch (error) {
            logger.warn('⚠️ Error leyendo log de migración', { error: error.message });
            return '0.0.0';
        }
    }

    /**
     * Registra la migración completada
     */
    async recordMigration() {
        try {
            const timestamp = new Date().toISOString();
            const logEntry = `${timestamp} - Migration completed - version: ${this.appVersion}\n`;

            fs.appendFileSync(this.migrationLogPath, logEntry);
            logger.info('📝 Migración registrada en log');
        } catch (error) {
            logger.warn('⚠️ Error registrando migración', { error: error.message });
        }
    }

    /**
     * Crea backup de seguridad antes de migración
     */
    async createBackup() {
        try {
            if (!fs.existsSync(this.newDbPath)) {
                return { success: true, message: 'No backup needed - no existing database' };
            }

            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const backupPath = path.join(this.userDataPath, `database_backup_${timestamp}.sqlite`);

            fs.copyFileSync(this.newDbPath, backupPath);

            logger.info('💾 Backup creado', { backupPath });
            return { success: true, backupPath };

        } catch (error) {
            logger.error('❌ Error creando backup', { error: error.message });
            return { success: false, error: error.message };
        }
    }

    /**
     * Limpia backups antiguos
     */
    async cleanupOldBackups(keepDays = 30) {
        try {
            const files = fs.readdirSync(this.userDataPath);
            const backupFiles = files.filter(file => file.startsWith('database_backup_'));
            const cutoffTime = Date.now() - (keepDays * 24 * 60 * 60 * 1000);

            for (const file of backupFiles) {
                const filePath = path.join(this.userDataPath, file);
                const stats = fs.statSync(filePath);

                if (stats.mtime.getTime() < cutoffTime) {
                    fs.unlinkSync(filePath);
                    logger.info('🗑️ Backup antiguo eliminado', { file });
                }
            }

        } catch (error) {
            logger.warn('⚠️ Error limpiando backups antiguos', { error: error.message });
        }
    }

    /**
     * Obtiene información de migración
     */
    getMigrationInfo() {
        return {
            appVersion: this.appVersion,
            userDataPath: this.userDataPath,
            oldDbPath: this.oldDbPath,
            newDbPath: this.newDbPath,
            oldDbExists: fs.existsSync(this.oldDbPath),
            newDbExists: fs.existsSync(this.newDbPath),
            migrationLogExists: fs.existsSync(this.migrationLogPath)
        };
    }
}

module.exports = MigrationManager;
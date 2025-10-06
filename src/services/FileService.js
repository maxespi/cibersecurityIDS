// src/services/FileService.js
const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');
const logger = require('../utils/logger');
const pathManager = require('../config/paths');

/**
 * Servicio centralizado para operaciones de archivos
 * Elimina duplicación de lógica de archivos en toda la aplicación
 */
class FileService {
    /**
     * Lee un archivo de forma segura
     */
    static async readFile(filePath, options = {}) {
        try {
            const content = await fs.readFile(filePath, { encoding: 'utf-8', ...options });
            logger.debug('Archivo leído exitosamente', { filePath, size: content.length });
            return { success: true, content };
        } catch (error) {
            logger.error('Error leyendo archivo', { filePath, error: error.message });
            return { success: false, error: error.message };
        }
    }

    /**
     * Escribe un archivo de forma segura
     */
    static async writeFile(filePath, content, options = {}) {
        try {
            // Asegurar que el directorio existe
            const dir = path.dirname(filePath);
            pathManager.ensureDirectoryExists(dir);

            await fs.writeFile(filePath, content, { encoding: 'utf-8', ...options });
            logger.debug('Archivo escrito exitosamente', { filePath, size: content.length });
            return { success: true };
        } catch (error) {
            logger.error('Error escribiendo archivo', { filePath, error: error.message });
            return { success: false, error: error.message };
        }
    }

    /**
     * Añade contenido a un archivo
     */
    static async appendFile(filePath, content, options = {}) {
        try {
            const dir = path.dirname(filePath);
            pathManager.ensureDirectoryExists(dir);

            await fs.appendFile(filePath, content, { encoding: 'utf-8', ...options });
            logger.debug('Contenido añadido al archivo', { filePath, size: content.length });
            return { success: true };
        } catch (error) {
            logger.error('Error añadiendo al archivo', { filePath, error: error.message });
            return { success: false, error: error.message };
        }
    }

    /**
     * Lee un archivo CSV y devuelve las líneas
     */
    static async readCSVFile(filePath) {
        try {
            const result = await this.readFile(filePath);
            if (!result.success) return result;

            const lines = result.content.split('\n').filter(line => line.trim());
            const headers = lines.length > 0 ? lines[0].split(',') : [];
            const data = lines.slice(1).map(line => {
                const values = line.split(',');
                const row = {};
                headers.forEach((header, index) => {
                    row[header.trim()] = values[index] ? values[index].trim() : '';
                });
                return row;
            });

            logger.debug('Archivo CSV procesado', { filePath, rows: data.length });
            return { success: true, headers, data };
        } catch (error) {
            logger.error('Error procesando CSV', { filePath, error: error.message });
            return { success: false, error: error.message };
        }
    }

    /**
     * Escribe datos a un archivo CSV
     */
    static async writeCSVFile(filePath, data, headers = null) {
        try {
            if (!Array.isArray(data) || data.length === 0) {
                return { success: false, error: 'No hay datos para escribir' };
            }

            // Si no se proporcionan headers, usar las keys del primer objeto
            const csvHeaders = headers || Object.keys(data[0]);

            let csvContent = csvHeaders.join(',') + '\n';

            data.forEach(row => {
                const values = csvHeaders.map(header => {
                    const value = row[header] || '';
                    // Escapar comas y comillas en CSV
                    return typeof value === 'string' && value.includes(',')
                        ? `"${value.replace(/"/g, '""')}"`
                        : value;
                });
                csvContent += values.join(',') + '\n';
            });

            const result = await this.writeFile(filePath, csvContent);
            if (result.success) {
                logger.info('Archivo CSV creado', { filePath, rows: data.length });
            }
            return result;
        } catch (error) {
            logger.error('Error creando CSV', { filePath, error: error.message });
            return { success: false, error: error.message };
        }
    }

    /**
     * Lee un archivo de texto y devuelve las líneas
     */
    static async readLines(filePath) {
        try {
            const result = await this.readFile(filePath);
            if (!result.success) return result;

            const lines = result.content.split('\n')
                .map(line => line.trim())
                .filter(line => line.length > 0);

            logger.debug('Líneas leídas del archivo', { filePath, count: lines.length });
            return { success: true, lines };
        } catch (error) {
            logger.error('Error leyendo líneas', { filePath, error: error.message });
            return { success: false, error: error.message };
        }
    }

    /**
     * Escribe líneas a un archivo de texto
     */
    static async writeLines(filePath, lines) {
        try {
            if (!Array.isArray(lines)) {
                lines = [lines];
            }

            const content = lines.join('\n') + '\n';
            return await this.writeFile(filePath, content);
        } catch (error) {
            logger.error('Error escribiendo líneas', { filePath, error: error.message });
            return { success: false, error: error.message };
        }
    }

    /**
     * Copia un archivo
     */
    static async copyFile(source, destination) {
        try {
            const dir = path.dirname(destination);
            pathManager.ensureDirectoryExists(dir);

            await fs.copyFile(source, destination);
            logger.info('Archivo copiado', { source, destination });
            return { success: true };
        } catch (error) {
            logger.error('Error copiando archivo', { source, destination, error: error.message });
            return { success: false, error: error.message };
        }
    }

    /**
     * Elimina un archivo
     */
    static async deleteFile(filePath) {
        try {
            await fs.unlink(filePath);
            logger.info('Archivo eliminado', { filePath });
            return { success: true };
        } catch (error) {
            logger.error('Error eliminando archivo', { filePath, error: error.message });
            return { success: false, error: error.message };
        }
    }

    /**
     * Verifica si un archivo existe
     */
    static async fileExists(filePath) {
        try {
            await fs.access(filePath);
            return true;
        } catch {
            return false;
        }
    }

    /**
     * Obtiene estadísticas de un archivo
     */
    static async getFileStats(filePath) {
        try {
            const stats = await fs.stat(filePath);
            return {
                success: true,
                stats: {
                    size: stats.size,
                    created: stats.birthtime,
                    modified: stats.mtime,
                    isFile: stats.isFile(),
                    isDirectory: stats.isDirectory()
                }
            };
        } catch (error) {
            logger.error('Error obteniendo estadísticas', { filePath, error: error.message });
            return { success: false, error: error.message };
        }
    }

    /**
     * Limpia archivos antiguos de un directorio
     */
    static async cleanupOldFiles(directory, maxAgeHours = 24, pattern = null) {
        try {
            if (!await this.fileExists(directory)) {
                return { success: true, cleaned: 0 };
            }

            const files = await fs.readdir(directory);
            const maxAge = maxAgeHours * 60 * 60 * 1000;
            const now = Date.now();
            let cleaned = 0;

            for (const file of files) {
                if (pattern && !file.match(pattern)) continue;

                const filePath = path.join(directory, file);
                const stats = await fs.stat(filePath);

                if (now - stats.mtime.getTime() > maxAge) {
                    await fs.unlink(filePath);
                    cleaned++;
                    logger.debug('Archivo antiguo eliminado', { filePath });
                }
            }

            logger.info('Limpieza de archivos completada', { directory, cleaned });
            return { success: true, cleaned };
        } catch (error) {
            logger.error('Error en limpieza de archivos', { directory, error: error.message });
            return { success: false, error: error.message };
        }
    }
}

module.exports = FileService;
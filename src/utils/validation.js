// src/utils/validation.js
const logger = require('./logger');

/**
 * Validador centralizado para entradas de IPC y datos de usuario
 */
class Validator {
    static isValidIP(ip) {
        if (!ip || typeof ip !== 'string') return false;

        const ipRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
        return ipRegex.test(ip.trim());
    }

    static isValidIPArray(ips) {
        if (!Array.isArray(ips)) return false;
        if (ips.length === 0) return false;
        if (ips.length > 1000) return false; // Límite de seguridad

        return ips.every(ip => this.isValidIP(ip));
    }

    static sanitizeString(str) {
        if (typeof str !== 'string') return '';

        // Remover caracteres potencialmente peligrosos
        return str.replace(/[<>\"'&]/g, '').trim();
    }

    static isValidUsername(username) {
        if (!username || typeof username !== 'string') return false;

        const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;
        return usernameRegex.test(username);
    }

    static isValidPassword(password) {
        if (!password || typeof password !== 'string') return false;

        return password.length >= 4 && password.length <= 50;
    }

    static isValidScriptName(scriptName) {
        if (!scriptName || typeof scriptName !== 'string') return false;

        const allowedScripts = [
            'detectIntrusos',
            'logs_for_ips_4625',
            'extractIPs',
            'extraer_ips_4625',
            'blockIPs',
            'BlockIpAndUpdateForOneRule'
        ];

        return allowedScripts.includes(scriptName);
    }

    static validateIPCData(channel, data) {
        const validationRules = {
            'login': (data) => {
                return this.isValidUsername(data.username) &&
                       this.isValidPassword(data.password);
            },
            'run-script': (data) => {
                return this.isValidScriptName(data);
            },
            'firewall-remove-ip': (data) => {
                return this.isValidIP(data.ip);
            },
            'firewall-block-ips': (data) => {
                return this.isValidIPArray(data.ips);
            },
            'get-geolocation': (data) => {
                return this.isValidIP(data.ip);
            }
        };

        const rule = validationRules[channel];
        if (!rule) {
            logger.warn('Canal IPC sin validación', { channel });
            return true; // Permitir canales no especificados por ahora
        }

        const isValid = rule(data);
        if (!isValid) {
            logger.security('Datos IPC inválidos rechazados', {
                channel,
                data: typeof data === 'object' ? Object.keys(data) : data
            });
        }

        return isValid;
    }

    static createIPCHandler(channel, handler) {
        return async (event, data) => {
            try {
                // Validar datos de entrada
                if (!this.validateIPCData(channel, data)) {
                    const error = 'Datos de entrada inválidos';
                    logger.security('IPC rechazado por validación', { channel, error });
                    return { success: false, error };
                }

                // Ejecutar handler original
                return await handler(event, data);

            } catch (error) {
                logger.error('Error en handler IPC', {
                    channel,
                    error: error.message,
                    stack: error.stack
                });

                return {
                    success: false,
                    error: 'Error interno del servidor'
                };
            }
        };
    }
}

module.exports = Validator;
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

        // Más permisivo para admin por defecto
        const usernameRegex = /^[a-zA-Z0-9_]{2,20}$/;
        return usernameRegex.test(username);
    }

    static isValidPassword(password) {
        if (!password || typeof password !== 'string') return false;

        // Permitir passwords más cortas para admin por defecto
        return password.length >= 1 && password.length <= 50;
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
                // Debug logging para entender qué se está enviando
                logger.debug('Validando datos de login', {
                    data: data,
                    dataType: typeof data,
                    username: data?.username,
                    password: data?.password ? '***' : undefined
                });

                if (!data || typeof data !== 'object') {
                    logger.debug('Datos de login no son objeto válido');
                    return false;
                }

                const usernameValid = this.isValidUsername(data.username);
                const passwordValid = this.isValidPassword(data.password);

                logger.debug('Resultado validación', {
                    usernameValid,
                    passwordValid,
                    username: data.username,
                    passwordLength: data.password ? data.password.length : 0
                });

                return usernameValid && passwordValid;
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
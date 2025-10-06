// src/config/constants.js
const path = require('path');
const { app } = require('electron');

/**
 * Configuración centralizada para toda la aplicación
 * SSOT (Single Source of Truth) para constantes y configuraciones
 */

// Environment configuration
const ENVIRONMENT = process.env.NODE_ENV || 'development';
const IS_DEVELOPMENT = ENVIRONMENT === 'development';
const IS_PRODUCTION = ENVIRONMENT === 'production';

// Application paths
const APP_ROOT = path.resolve(__dirname, '../..');
const USER_DATA_PATH = app ? app.getPath('userData') : '';

// Database configuration
const DATABASE = {
    DIALECT: 'sqlite',
    STORAGE: path.join(APP_ROOT, 'db/config/database.sqlite'),
    LOGGING: !IS_DEVELOPMENT,
    POOL: {
        max: 5,
        min: 0,
        acquire: 30000,
        idle: 10000
    }
};

// File paths configuration
const PATHS = {
    LOGS: path.join(USER_DATA_PATH, 'logs'),
    TEMP: path.join(USER_DATA_PATH, 'temp'),
    CONFIG: {
        development: {
            scriptRoot: path.join(APP_ROOT, 'files/script'),
            logRoot: path.join(APP_ROOT, 'files/logs'),
            configRoot: path.join(APP_ROOT, 'files/config')
        },
        production: {
            scriptRoot: path.join(process.resourcesPath, 'files/script'),
            logRoot: path.join(process.resourcesPath, 'files/logs'),
            configRoot: path.join(process.resourcesPath, 'files/config')
        }
    }
};

// Security configuration
const SECURITY = {
    MAX_LOGIN_ATTEMPTS: 3,
    SESSION_TIMEOUT: 3600000, // 1 hour
    MAX_IPS_PER_BATCH: 1000,
    ALLOWED_SCRIPT_NAMES: [
        'detectIntrusos',
        'logs_for_ips_4625',
        'extractIPs',
        'extraer_ips_4625',
        'blockIPs',
        'BlockIpAndUpdateForOneRule'
    ],
    IP_VALIDATION_REGEX: /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/
};

// Windows Event Log configuration
const WINDOWS_EVENTS = {
    EVENT_ID_FAILED_LOGON: 4625,
    EVENT_ID_SUCCESSFUL_LOGON: 4624,
    LOG_NAME: 'Security',
    MAX_EVENTS_PER_SCAN: 10000,
    SCAN_INTERVAL_HOURS: 24
};

// Firewall configuration
const FIREWALL = {
    RULE_NAME: 'Bloquear IPs seleccionadas',
    DIRECTIONS: {
        INBOUND: 'Inbound',
        OUTBOUND: 'Outbound'
    },
    ACTIONS: {
        BLOCK: 'Block',
        ALLOW: 'Allow'
    },
    PROFILES: {
        DOMAIN: 'Domain',
        PRIVATE: 'Private',
        PUBLIC: 'Public'
    }
};

// API configuration
const API = {
    GEOLOCATION: {
        BASE_URL: 'http://ip-api.com/json/',
        TIMEOUT: 5000,
        RATE_LIMIT: 45 // requests per minute
    },
    WINDOWS_EVENTS: {
        TIMEOUT: 30000
    }
};

// Logging configuration
const LOGGING = {
    LEVELS: {
        ERROR: 'error',
        WARN: 'warn',
        INFO: 'info',
        DEBUG: 'debug',
        SECURITY: 'security',
        FIREWALL: 'firewall'
    },
    MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
    MAX_FILES: 5
};

// Application metadata
const APP_INFO = {
    NAME: 'CyberSecurity IDS',
    VERSION: '1.0.0',
    DESCRIPTION: 'Sistema de Detección de Intrusos para Windows Server',
    AUTHOR: 'Security Team'
};

module.exports = {
    ENVIRONMENT,
    IS_DEVELOPMENT,
    IS_PRODUCTION,
    APP_ROOT,
    USER_DATA_PATH,
    DATABASE,
    PATHS,
    SECURITY,
    WINDOWS_EVENTS,
    FIREWALL,
    API,
    LOGGING,
    APP_INFO
};
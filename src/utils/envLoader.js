// src/utils/envLoader.js
const fs = require('fs');
const path = require('path');

/**
 * Cargador de variables de entorno para Electron
 * Asegura que las variables se carguen correctamente desde .env
 */
function loadEnvironmentVariables() {
    const envPath = path.join(__dirname, '../../.env');

    try {
        if (fs.existsSync(envPath)) {
            const envContent = fs.readFileSync(envPath, 'utf8');
            const lines = envContent.split('\n');

            lines.forEach(line => {
                const trimmedLine = line.trim();
                if (trimmedLine && !trimmedLine.startsWith('#')) {
                    const [key, ...valueParts] = trimmedLine.split('=');
                    if (key && valueParts.length > 0) {
                        const value = valueParts.join('=').trim();
                        process.env[key.trim()] = value;
                    }
                }
            });

            console.log('🔧 Variables de entorno cargadas desde .env');
            console.log('Environment variables:', {
                NODE_ENV: process.env.NODE_ENV,
                FORCE_DEV_MODE: process.env.FORCE_DEV_MODE,
                ENABLE_MOCK_DATA: process.env.ENABLE_MOCK_DATA,
                USE_MOCK_GEOLOCATION: process.env.USE_MOCK_GEOLOCATION,
                MOCK_SCENARIO: process.env.MOCK_SCENARIO
            });
        } else {
            console.log('⚠️ Archivo .env no encontrado, usando variables por defecto');
        }
    } catch (error) {
        console.error('❌ Error cargando .env:', error.message);
    }
}

module.exports = { loadEnvironmentVariables };
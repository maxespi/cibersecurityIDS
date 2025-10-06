// src/utils/DevelopmentModeManager.js
const logger = require('./logger');
const { IS_DEVELOPMENT } = require('../config/constants');

/**
 * Gestor de modo de desarrollo para testing en Windows 11
 * Permite simular funcionalidades de Windows Server para desarrollo
 */
class DevelopmentModeManager {
    constructor() {
        this.isDevMode = IS_DEVELOPMENT || process.env.FORCE_DEV_MODE === 'true';
        this.mockDataEnabled = process.env.ENABLE_MOCK_DATA === 'true' || this.isDevMode;
        this.simulateWindowsServer = process.env.SIMULATE_WINDOWS_SERVER === 'true';
    }

    /**
     * Verifica si el sistema es compatible para desarrollo
     */
    async isSystemCompatible() {
        const os = require('os');
        const platform = os.platform();
        const release = os.release();

        // En modo desarrollo, permitir Windows 11/10
        if (this.isDevMode && platform === 'win32') {
            logger.info('🔧 Modo desarrollo: Sistema Windows detectado', {
                platform,
                release,
                devMode: true
            });
            return {
                compatible: true,
                isServer: this.simulateWindowsServer,
                message: 'Modo desarrollo activo - Windows compatible'
            };
        }

        // Verificación normal para producción
        try {
            const { execSync } = require('child_process');
            const osInfo = execSync('wmic os get Caption', { encoding: 'utf8', timeout: 5000 });
            const isServer = osInfo.includes('Server');

            return {
                compatible: isServer || this.isDevMode,
                isServer,
                message: isServer ? 'Windows Server detectado' : 'Sistema no es Windows Server'
            };

        } catch (error) {
            logger.warn('No se pudo verificar el sistema operativo', { error: error.message });

            // En caso de error, permitir en modo desarrollo
            return {
                compatible: this.isDevMode,
                isServer: false,
                message: 'Verificación fallida - usando modo desarrollo'
            };
        }
    }

    /**
     * Habilita características específicas según el entorno
     */
    getFeatureConfig() {
        const config = {
            realEventLogging: true,
            realFirewallManagement: true,
            adminRequired: true,
            securityLogAccess: true,
            mockData: false,
            simulatedEvents: false
        };

        // Ajustes para modo desarrollo en Windows 11
        if (this.isDevMode && !this.isWindowsServer()) {
            config.realEventLogging = false;
            config.realFirewallManagement = this.canAccessFirewall();
            config.adminRequired = false;
            config.securityLogAccess = this.canAccessSecurityLog();
            config.mockData = this.mockDataEnabled;
            config.simulatedEvents = true;

            logger.info('🔧 Configuración de desarrollo activada', config);
        }

        return config;
    }

    /**
     * Verifica si se puede acceder al Security Log
     */
    canAccessSecurityLog() {
        try {
            const { execSync } = require('child_process');

            // Intentar acceder al log de seguridad
            execSync('wevtutil qe Security /c:1 /rd:true', {
                encoding: 'utf8',
                timeout: 5000,
                stdio: 'pipe'
            });

            logger.info('✅ Acceso al Security Log disponible');
            return true;

        } catch (error) {
            logger.warn('❌ Sin acceso al Security Log', {
                error: error.message,
                suggestion: 'Ejecutar como administrador o habilitar auditoría'
            });
            return false;
        }
    }

    /**
     * Verifica si se puede acceder al firewall
     */
    canAccessFirewall() {
        try {
            const { execSync } = require('child_process');

            // Intentar listar reglas del firewall
            execSync('netsh advfirewall firewall show rule name=all', {
                encoding: 'utf8',
                timeout: 5000,
                stdio: 'pipe'
            });

            logger.info('✅ Acceso al Firewall disponible');
            return true;

        } catch (error) {
            logger.warn('❌ Sin acceso al Firewall', {
                error: error.message,
                suggestion: 'Ejecutar como administrador'
            });
            return false;
        }
    }

    /**
     * Verifica si el sistema actual es Windows Server
     */
    isWindowsServer() {
        try {
            const { execSync } = require('child_process');
            const osInfo = execSync('wmic os get Caption', { encoding: 'utf8', timeout: 5000 });
            return osInfo.includes('Server');
        } catch {
            return false;
        }
    }

    /**
     * Genera eventos mock para desarrollo
     */
    generateMockEvents(count = 10) {
        const mockEvents = [];
        const baseTime = Date.now();

        // IPs maliciosas comunes para testing
        const maliciousIPs = [
            '192.168.1.100', '10.0.0.50', '172.16.0.25',
            '203.0.113.10', '198.51.100.20', '185.220.101.5',
            '91.240.118.172', '45.142.214.219', '194.147.140.123'
        ];

        const usernames = ['administrator', 'admin', 'user', 'guest', 'test', 'scanner'];
        const domains = ['WORKGROUP', 'DOMAIN', 'LOCAL', ''];

        for (let i = 0; i < count; i++) {
            mockEvents.push({
                timestamp: new Date(baseTime - (i * 60000)), // 1 minuto de diferencia
                sourceIP: maliciousIPs[Math.floor(Math.random() * maliciousIPs.length)],
                username: usernames[Math.floor(Math.random() * usernames.length)],
                domain: domains[Math.floor(Math.random() * domains.length)],
                eventId: 4625,
                logonType: Math.floor(Math.random() * 10) + 1,
                failureReason: 'Unknown user name or bad password'
            });
        }

        logger.info('🎭 Eventos mock generados', { count: mockEvents.length });
        return mockEvents;
    }

    /**
     * Simula datos de geolocalización para desarrollo
     */
    generateMockGeolocation(ip) {
        const mockLocations = {
            '192.168.1.100': { country: 'España', city: 'Madrid', isp: 'Local Network' },
            '203.0.113.10': { country: 'Estados Unidos', city: 'New York', isp: 'Example ISP' },
            '198.51.100.20': { country: 'Reino Unido', city: 'London', isp: 'Test Provider' },
            '185.220.101.5': { country: 'Alemania', city: 'Berlin', isp: 'German ISP' },
            '91.240.118.172': { country: 'Rusia', city: 'Moscow', isp: 'Russian Provider' }
        };

        return mockLocations[ip] || {
            country: 'Desconocido',
            city: 'Desconocido',
            isp: 'ISP Desconocido'
        };
    }

    /**
     * Proporciona instrucciones para habilitar funcionalidades en Windows 11
     */
    getWindows11Instructions() {
        return {
            securityAuditing: {
                title: 'Habilitar Auditoría de Seguridad',
                steps: [
                    '1. Abrir "Directiva de Grupo Local" (gpedit.msc)',
                    '2. Navegar a: Configuración del equipo > Directivas > Configuración de Windows > Configuración de seguridad > Directivas locales > Directiva de auditoría',
                    '3. Habilitar "Auditar eventos de inicio de sesión" - Correcto y Error',
                    '4. Ejecutar: gpupdate /force'
                ],
                alternative: 'Alternativamente, usar auditpol.exe:\nauditpol /set /category:"Logon/Logoff" /success:enable /failure:enable'
            },
            adminRights: {
                title: 'Ejecutar como Administrador',
                steps: [
                    '1. Cerrar la aplicación',
                    '2. Clic derecho en el ejecutable',
                    '3. Seleccionar "Ejecutar como administrador"',
                    '4. Confirmar el UAC prompt'
                ]
            },
            firewallAccess: {
                title: 'Verificar Acceso al Firewall',
                steps: [
                    '1. Abrir PowerShell como administrador',
                    '2. Ejecutar: Get-NetFirewallRule | Select-Object -First 5',
                    '3. Si funciona, el acceso está disponible'
                ]
            }
        };
    }

    /**
     * Muestra el estado de compatibilidad actual
     */
    async showCompatibilityStatus() {
        const compatibility = await this.isSystemCompatible();
        const features = this.getFeatureConfig();
        const instructions = this.getWindows11Instructions();

        const status = {
            system: compatibility,
            features,
            devMode: this.isDevMode,
            recommendations: []
        };

        // Generar recomendaciones
        if (!compatibility.isServer && !this.isDevMode) {
            status.recommendations.push('Habilitar modo desarrollo para testing en Windows 11');
        }

        if (!features.securityLogAccess) {
            status.recommendations.push('Configurar auditoría de seguridad para eventos de login');
        }

        if (!features.realFirewallManagement) {
            status.recommendations.push('Ejecutar como administrador para gestión de firewall');
        }

        if (this.isDevMode) {
            status.instructions = instructions;
        }

        logger.info('💻 Estado de compatibilidad', status);
        return status;
    }
}

module.exports = DevelopmentModeManager;
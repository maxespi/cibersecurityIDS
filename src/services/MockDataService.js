// src/services/MockDataService.js
const logger = require('../utils/logger');

/**
 * Servicio de datos simulados para desarrollo y testing
 * Permite probar la aplicación sin Windows Server real
 */
class MockDataService {
    constructor() {
        this.isEnabled = process.env.ENABLE_MOCK_DATA === 'true';
        this.scenarios = {
            light: { eventsPerHour: 5, maliciousRatio: 0.2 },
            moderate: { eventsPerHour: 25, maliciousRatio: 0.4 },
            heavy: { eventsPerHour: 100, maliciousRatio: 0.6 },
            attack: { eventsPerHour: 500, maliciousRatio: 0.8 }
        };
    }

    /**
     * Genera eventos de login fallidos simulados
     */
    generateFailedLoginEvents(count = 20, scenario = 'moderate') {
        const config = this.scenarios[scenario] || this.scenarios.moderate;
        const events = [];
        const baseTime = Date.now();

        // Pool de IPs maliciosas reales (conocidas)
        const maliciousIPs = [
            '185.220.101.5',   // Tor exit node
            '91.240.118.172',  // VPN común para ataques
            '45.142.214.219',  // Hosting sospechoso
            '194.147.140.123', // Proxy anónimo
            '203.0.113.10',    // Red de documentación (RFC)
            '198.51.100.20',   // Red de prueba
            '89.248.171.25',   // Botnet conocida
            '176.123.26.55',   // Scanner automático
            '142.93.156.78',   // Cloud comprometido
            '167.99.83.101'    // VPS malicioso
        ];

        // Pool de IPs legítimas para simular falsos positivos
        const legitimateIPs = [
            '192.168.1.100',
            '192.168.1.50',
            '10.0.0.25',
            '172.16.0.100',
            '172.16.1.50'
        ];

        const usernames = [
            'administrator', 'admin', 'root', 'user', 'guest',
            'test', 'backup', 'service', 'scanner', 'bot',
            'oracle', 'postgres', 'mysql', 'ftp', 'www'
        ];

        const domains = ['WORKGROUP', 'DOMAIN', 'LOCAL', 'CORP', ''];

        const failureReasons = [
            'Unknown user name or bad password',
            'Account logon time restriction violation',
            'Account currently disabled',
            'The specified account password has expired',
            'User not allowed to log on at this computer'
        ];

        for (let i = 0; i < count; i++) {
            const isMalicious = Math.random() < config.maliciousRatio;
            const ipPool = isMalicious ? maliciousIPs : legitimateIPs;
            const timeOffset = Math.random() * 3600000 * 24; // Últimas 24 horas

            const event = {
                id: `mock_${Date.now()}_${i}`,
                timestamp: new Date(baseTime - timeOffset),
                sourceIP: ipPool[Math.floor(Math.random() * ipPool.length)],
                username: usernames[Math.floor(Math.random() * usernames.length)],
                domain: domains[Math.floor(Math.random() * domains.length)],
                eventId: 4625,
                logonType: Math.floor(Math.random() * 10) + 1,
                failureReason: failureReasons[Math.floor(Math.random() * failureReasons.length)],
                workstation: `WS-${Math.floor(Math.random() * 999).toString().padStart(3, '0')}`,
                processName: 'winlogon.exe',
                isMockData: true,
                scenario: scenario,
                isMalicious: isMalicious
            };

            events.push(event);
        }

        // Ordenar por timestamp descendente (más recientes primero)
        events.sort((a, b) => b.timestamp - a.timestamp);

        logger.info('🎭 Eventos mock generados', {
            count: events.length,
            scenario,
            maliciousCount: events.filter(e => e.isMalicious).length,
            timeRange: `${new Date(baseTime - 86400000).toISOString()} - ${new Date(baseTime).toISOString()}`
        });

        return events;
    }

    /**
     * Genera datos de geolocalización simulados
     */
    generateMockGeolocation(ip) {
        // Base de datos de geolocalización simulada
        const geoDatabase = {
            // IPs maliciosas con ubicaciones reales de amenazas
            '185.220.101.5': {
                ip,
                country: 'Alemania',
                countryCode: 'DE',
                region: 'Hesse',
                city: 'Frankfurt',
                lat: 50.1109,
                lon: 8.6821,
                timezone: 'Europe/Berlin',
                isp: 'Tor Network',
                org: 'Tor Exit Node',
                as: 'AS51167',
                mobile: false,
                proxy: true,
                hosting: true,
                threatLevel: 'high'
            },
            '91.240.118.172': {
                ip,
                country: 'Países Bajos',
                countryCode: 'NL',
                region: 'North Holland',
                city: 'Amsterdam',
                lat: 52.3702,
                lon: 4.8952,
                timezone: 'Europe/Amsterdam',
                isp: 'VPN Provider',
                org: 'Anonymous VPN',
                as: 'AS60781',
                mobile: false,
                proxy: true,
                hosting: true,
                threatLevel: 'medium'
            },
            '45.142.214.219': {
                ip,
                country: 'Estados Unidos',
                countryCode: 'US',
                region: 'Virginia',
                city: 'Ashburn',
                lat: 39.0458,
                lon: -77.5016,
                timezone: 'America/New_York',
                isp: 'DigitalOcean',
                org: 'Cloud Hosting',
                as: 'AS14061',
                mobile: false,
                proxy: false,
                hosting: true,
                threatLevel: 'high'
            },
            // IPs locales/privadas
            '192.168.1.100': {
                ip,
                country: 'España',
                countryCode: 'ES',
                region: 'Red Local',
                city: 'Red Privada',
                lat: 40.4168,
                lon: -3.7038,
                timezone: 'Europe/Madrid',
                isp: 'Red Local',
                org: 'Red Privada',
                as: 'Private',
                mobile: false,
                proxy: false,
                hosting: false,
                threatLevel: 'low'
            }
        };

        // Si la IP está en la base de datos, devolverla
        if (geoDatabase[ip]) {
            return {
                success: true,
                data: {
                    ...geoDatabase[ip],
                    timestamp: new Date().toISOString(),
                    isMockData: true
                }
            };
        }

        // Generar datos aleatorios para IPs no conocidas
        const countries = [
            { name: 'China', code: 'CN', threat: 'high' },
            { name: 'Rusia', code: 'RU', threat: 'high' },
            { name: 'Estados Unidos', code: 'US', threat: 'medium' },
            { name: 'Brasil', code: 'BR', threat: 'medium' },
            { name: 'India', code: 'IN', threat: 'medium' },
            { name: 'Reino Unido', code: 'GB', threat: 'low' },
            { name: 'Francia', code: 'FR', threat: 'low' },
            { name: 'Alemania', code: 'DE', threat: 'low' }
        ];

        const randomCountry = countries[Math.floor(Math.random() * countries.length)];

        return {
            success: true,
            data: {
                ip,
                country: randomCountry.name,
                countryCode: randomCountry.code,
                region: 'Región Simulada',
                city: 'Ciudad Simulada',
                lat: Math.random() * 180 - 90,
                lon: Math.random() * 360 - 180,
                timezone: 'UTC',
                isp: 'ISP Simulado',
                org: 'Organización Simulada',
                as: `AS${Math.floor(Math.random() * 99999)}`,
                mobile: Math.random() > 0.8,
                proxy: Math.random() > 0.7,
                hosting: Math.random() > 0.6,
                threatLevel: randomCountry.threat,
                timestamp: new Date().toISOString(),
                isMockData: true
            }
        };
    }

    /**
     * Simula estadísticas del firewall
     */
    generateFirewallStats() {
        const stats = {
            totalRules: Math.floor(Math.random() * 50) + 10,
            inboundRules: Math.floor(Math.random() * 25) + 5,
            outboundRules: Math.floor(Math.random() * 25) + 5,
            blockedIPs: Math.floor(Math.random() * 100) + 20,
            allowedConnections: Math.floor(Math.random() * 1000) + 500,
            blockedConnections: Math.floor(Math.random() * 200) + 50,
            lastUpdated: new Date().toISOString(),
            isActive: true,
            profile: 'Domain',
            isMockData: true
        };

        logger.debug('🔥 Estadísticas de firewall simuladas', stats);
        return { success: true, data: stats };
    }

    /**
     * Simula IPs bloqueadas en el firewall
     */
    generateBlockedIPs(count = 15) {
        const blockedIPs = [];
        const maliciousIPs = [
            '185.220.101.5', '91.240.118.172', '45.142.214.219',
            '194.147.140.123', '89.248.171.25', '176.123.26.55',
            '142.93.156.78', '167.99.83.101', '103.94.190.25',
            '159.65.142.115', '134.195.101.26', '78.128.112.15'
        ];

        for (let i = 0; i < count && i < maliciousIPs.length; i++) {
            const ip = maliciousIPs[i];
            const geo = this.generateMockGeolocation(ip);

            blockedIPs.push({
                ip,
                ruleName: 'Bloquear IPs seleccionadas',
                direction: Math.random() > 0.5 ? 'Inbound' : 'Outbound',
                action: 'Block',
                enabled: true,
                profile: 'Any',
                blockedAt: new Date(Date.now() - Math.random() * 86400000),
                attempts: Math.floor(Math.random() * 100) + 1,
                country: geo.data.country,
                city: geo.data.city,
                threatLevel: geo.data.threatLevel,
                isMockData: true
            });
        }

        logger.debug('🚫 IPs bloqueadas simuladas', { count: blockedIPs.length });
        return {
            success: true,
            data: {
                inbound: blockedIPs.filter(ip => ip.direction === 'Inbound'),
                outbound: blockedIPs.filter(ip => ip.direction === 'Outbound'),
                total: blockedIPs,
                count: blockedIPs.length
            }
        };
    }

    /**
     * Simula resultados de análisis de seguridad
     */
    generateSecurityAnalysis() {
        const analysis = {
            timestamp: new Date().toISOString(),
            eventsAnalyzed: Math.floor(Math.random() * 1000) + 100,
            newThreats: Math.floor(Math.random() * 10) + 1,
            blockedAttacks: Math.floor(Math.random() * 25) + 5,
            countries: ['China', 'Rusia', 'Brasil', 'Estados Unidos'],
            topAttackers: [
                { ip: '185.220.101.5', attempts: 156, country: 'Alemania' },
                { ip: '91.240.118.172', attempts: 89, country: 'Países Bajos' },
                { ip: '45.142.214.219', attempts: 67, country: 'Estados Unidos' }
            ],
            riskLevel: ['low', 'medium', 'high'][Math.floor(Math.random() * 3)],
            recommendations: [
                'Revisar configuración de firewall',
                'Actualizar reglas de bloqueo',
                'Monitorear tráfico de países de alto riesgo'
            ],
            isMockData: true
        };

        return { success: true, data: analysis };
    }

    /**
     * Genera IPs de whitelist simuladas
     */
    generateWhitelistIPs() {
        const whitelistIPs = [
            {
                id: 1,
                ip: '192.168.1.1',
                description: 'Router principal',
                addedBy: 'admin',
                permanent: true,
                createdAt: new Date(Date.now() - 86400000).toISOString(), // 1 día atrás
                expiresAt: null
            },
            {
                id: 2,
                ip: '10.0.0.0/8',
                description: 'Red interna corporativa',
                addedBy: 'admin',
                permanent: true,
                createdAt: new Date(Date.now() - 172800000).toISOString(), // 2 días atrás
                expiresAt: null
            },
            {
                id: 3,
                ip: '172.16.0.0/12',
                description: 'Red privada desarrollo',
                addedBy: 'admin',
                permanent: true,
                createdAt: new Date(Date.now() - 259200000).toISOString(), // 3 días atrás
                expiresAt: null
            },
            {
                id: 4,
                ip: '8.8.8.8',
                description: 'DNS Google (temporal)',
                addedBy: 'admin',
                permanent: false,
                createdAt: new Date(Date.now() - 3600000).toISOString(), // 1 hora atrás
                expiresAt: new Date(Date.now() + 86400000).toISOString() // Expira en 1 día
            },
            {
                id: 5,
                ip: '1.1.1.1',
                description: 'DNS Cloudflare',
                addedBy: 'admin',
                permanent: false,
                createdAt: new Date(Date.now() - 7200000).toISOString(), // 2 horas atrás
                expiresAt: new Date(Date.now() + 172800000).toISOString() // Expira en 2 días
            }
        ];

        logger.info('📋 Generando whitelist simulada', { count: whitelistIPs.length });

        return {
            success: true,
            data: whitelistIPs,
            count: whitelistIPs.length,
            isMockData: true
        };
    }

    /**
     * Obtiene la configuración actual de mock data
     */
    getConfiguration() {
        return {
            enabled: this.isEnabled,
            scenarios: Object.keys(this.scenarios),
            currentScenario: process.env.MOCK_SCENARIO || 'moderate',
            features: {
                events: true,
                geolocation: true,
                firewall: true,
                analysis: true,
                whitelist: true
            }
        };
    }

    /**
     * Habilita o deshabilita mock data
     */
    setEnabled(enabled) {
        this.isEnabled = enabled;
        logger.info(`Mock data ${enabled ? 'habilitado' : 'deshabilitado'}`);
    }
}

module.exports = MockDataService;
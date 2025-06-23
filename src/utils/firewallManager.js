// src/utils/firewallManager.js
const { spawn } = require('child_process');
const { promisify } = require('util');

class FirewallManager {
    constructor() {
        this.ruleName = 'Bloquear IPs seleccionadas';
    }

    /**
     * Obtiene todas las IPs bloqueadas en las reglas del firewall
     */
    async getBlockedIPs() {
        try {
            const inboundIPs = await this.getRuleIPs('Inbound');
            const outboundIPs = await this.getRuleIPs('Outbound');

            // Combinar y eliminar duplicados
            const allIPs = [...new Set([...inboundIPs, ...outboundIPs])];

            return {
                success: true,
                data: {
                    inbound: inboundIPs,
                    outbound: outboundIPs,
                    total: allIPs,
                    count: allIPs.length
                }
            };
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
    * Bloquea múltiples IPs siguiendo la lógica de BlockIpAndUpdateForOneRule.ps1
    */
    async blockMultipleIPs(ipsToBlock) {
        try {
            console.log(`🔧 [FIREWALL] Bloqueando ${ipsToBlock.length} IPs...`);

            // Validar IPs
            const validIPs = ipsToBlock.filter(ip => this.isValidIP(ip));

            if (validIPs.length === 0) {
                return { success: false, error: 'No hay IPs válidas para bloquear' };
            }

            // ✅ LÓGICA IGUAL A TU SCRIPT PS1:

            // 1. Verificar si existe regla Inbound
            const existingInboundRule = await this.checkRuleExists('Inbound');

            if (!existingInboundRule) {
                // Crear nueva regla Inbound
                console.log('🔧 [FIREWALL] Creando nueva regla Inbound');
                await this.createFirewallRule(validIPs, 'Inbound');
            } else {
                // Actualizar regla Inbound existente
                console.log('🔧 [FIREWALL] Actualizando regla Inbound');
                await this.updateExistingRule(validIPs, 'Inbound');
            }

            // 2. Verificar si existe regla Outbound
            const existingOutboundRule = await this.checkRuleExists('Outbound');

            if (!existingOutboundRule) {
                // Crear nueva regla Outbound
                console.log('🔧 [FIREWALL] Creando nueva regla Outbound');
                await this.createFirewallRule(validIPs, 'Outbound');
            } else {
                // Actualizar regla Outbound existente
                console.log('🔧 [FIREWALL] Actualizando regla Outbound');
                await this.updateExistingRule(validIPs, 'Outbound');
            }

            return {
                success: true,
                data: {
                    newlyBlocked: validIPs,
                    totalBlocked: validIPs.length,
                    message: `${validIPs.length} IPs bloqueadas exitosamente`
                }
            };

        } catch (error) {
            console.error('🔧 [FIREWALL] Error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Obtiene IPs de una regla específica (Inbound/Outbound)
     */
    async getRuleIPs(direction) {
        return new Promise((resolve, reject) => {
            const ruleName = `${this.ruleName} ${direction}`;

            const ps = spawn('powershell.exe', [
                '-Command',
                `Get-NetFirewallRule -DisplayName "${ruleName}" | Get-NetFirewallAddressFilter | Select-Object -ExpandProperty RemoteAddress`
            ]);

            let output = '';
            let errorOutput = '';

            ps.stdout.on('data', (data) => {
                output += data.toString();
            });

            ps.stderr.on('data', (data) => {
                errorOutput += data.toString();
            });

            ps.on('close', (code) => {
                if (code === 0) {
                    const ips = output
                        .split('\n')
                        .map(line => line.trim())
                        .filter(line => line && this.isValidIP(line));
                    resolve(ips);
                } else {
                    reject(new Error(`PowerShell error: ${errorOutput}`));
                }
            });

            ps.on('error', (error) => {
                reject(error);
            });
        });
    }

    /**
     * Obtiene estadísticas detalladas de las reglas
     */
    async getFirewallStats() {
        return new Promise((resolve, reject) => {
            const ps = spawn('powershell.exe', [
                '-Command',
                `
                $inboundRule = Get-NetFirewallRule -DisplayName "${this.ruleName} Inbound" -ErrorAction SilentlyContinue
                $outboundRule = Get-NetFirewallRule -DisplayName "${this.ruleName} Outbound" -ErrorAction SilentlyContinue
                
                $result = @{
                    InboundExists = $null -ne $inboundRule
                    OutboundExists = $null -ne $outboundRule
                    InboundEnabled = if($inboundRule) { $inboundRule.Enabled } else { $false }
                    OutboundEnabled = if($outboundRule) { $outboundRule.Enabled } else { $false }
                    InboundAction = if($inboundRule) { $inboundRule.Action } else { "None" }
                    OutboundAction = if($outboundRule) { $outboundRule.Action } else { "None" }
                }
                
                $result | ConvertTo-Json
                `
            ]);

            let output = '';
            let errorOutput = '';

            ps.stdout.on('data', (data) => {
                output += data.toString();
            });

            ps.stderr.on('data', (data) => {
                errorOutput += data.toString();
            });

            ps.on('close', (code) => {
                if (code === 0) {
                    try {
                        const stats = JSON.parse(output);
                        resolve(stats);
                    } catch (parseError) {
                        reject(new Error(`Failed to parse JSON: ${parseError.message}`));
                    }
                } else {
                    reject(new Error(`PowerShell error: ${errorOutput}`));
                }
            });
        });
    }

    /**
     * Elimina una IP específica de las reglas del firewall
     */
    async removeIPFromFirewall(ipToRemove) {
        try {
            const blockedIPs = await this.getBlockedIPs();
            if (!blockedIPs.success) {
                throw new Error('Failed to get current blocked IPs');
            }

            const updatedInbound = blockedIPs.data.inbound.filter(ip => ip !== ipToRemove);
            const updatedOutbound = blockedIPs.data.outbound.filter(ip => ip !== ipToRemove);

            await this.updateFirewallRules(updatedInbound, 'Inbound');
            await this.updateFirewallRules(updatedOutbound, 'Outbound');

            return {
                success: true,
                message: `IP ${ipToRemove} removed from firewall rules`
            };
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Actualiza las reglas del firewall con nuevas IPs
     */
    async updateFirewallRules(ips, direction) {
        return new Promise((resolve, reject) => {
            const ruleName = `${this.ruleName} ${direction}`;
            const ipList = ips.join(',');

            const ps = spawn('powershell.exe', [
                '-Command',
                `Set-NetFirewallRule -DisplayName "${ruleName}" -RemoteAddress "${ipList}"`
            ]);

            let errorOutput = '';

            ps.stderr.on('data', (data) => {
                errorOutput += data.toString();
            });

            ps.on('close', (code) => {
                if (code === 0) {
                    resolve();
                } else {
                    reject(new Error(`Failed to update ${direction} rule: ${errorOutput}`));
                }
            });

            ps.on('error', (error) => {
                reject(error);
            });
        });
    }

    /**
     * Verifica si una regla existe
     */
    async checkRuleExists(direction) {
        return new Promise((resolve, reject) => {
            const ruleName = `${this.ruleName} ${direction}`;

            const ps = spawn('powershell.exe', [
                '-Command',
                `Get-NetFirewallRule | Where-Object { $_.DisplayName -eq "${ruleName}" }`
            ]);

            let output = '';
            ps.stdout.on('data', (data) => output += data.toString());

            ps.on('close', (code) => {
                if (code === 0) {
                    resolve(output.trim().length > 0);
                } else {
                    resolve(false);
                }
            });

            ps.on('error', () => resolve(false));
        });
    }

    /**
     * Crea nueva regla de firewall
     */
    async createFirewallRule(ips, direction) {
        return new Promise((resolve, reject) => {
            const ruleName = `${this.ruleName} ${direction}`;
            const ipList = ips.join(',');

            const ps = spawn('powershell.exe', [
                '-Command',
                `New-NetFirewallRule -DisplayName "${ruleName}" -Direction ${direction} -Action Block -RemoteAddress "${ipList}" -Protocol Any`
            ]);

            let errorOutput = '';
            ps.stderr.on('data', (data) => errorOutput += data.toString());

            ps.on('close', (code) => {
                if (code === 0) {
                    resolve();
                } else {
                    reject(new Error(`Failed to create ${direction} rule: ${errorOutput}`));
                }
            });

            ps.on('error', (error) => reject(error));
        });
    }

    /**
     * Actualiza regla existente siguiendo lógica PS1
     */
    async updateExistingRule(newIPs, direction) {
        try {
            // Obtener IPs existentes
            const existingIPs = await this.getRuleIPs(direction);

            // Encontrar IPs nuevas que no están en la regla
            const ipsToAdd = newIPs.filter(ip => !existingIPs.includes(ip));

            if (ipsToAdd.length === 0) {
                console.log(`🔧 [FIREWALL] No hay IPs nuevas para agregar en regla ${direction}`);
                return;
            }

            // Combinar IPs existentes + nuevas
            const allIPs = [...existingIPs, ...ipsToAdd];

            // Actualizar la regla con todas las IPs
            await this.updateFirewallRules(allIPs, direction);

            console.log(`🔧 [FIREWALL] ${ipsToAdd.length} IPs agregadas a regla ${direction}`);

        } catch (error) {
            throw new Error(`Error updating ${direction} rule: ${error.message}`);
        }
    }

    /**
     * Valida si una cadena es una IP válida
     */
    isValidIP(ip) {
        const ipRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
        return ipRegex.test(ip);
    }

    /**
     * Obtiene información geográfica de una IP (requiere API externa)
     */
    async getIPGeolocation(ip) {
        try {
            const fetch = require('node-fetch'); // Instalar: npm install node-fetch@2
            const response = await fetch(`http://ip-api.com/json/${ip}`);
            const data = await response.json();

            return {
                success: true,
                data: {
                    ip: ip,
                    country: data.country || 'Unknown',
                    city: data.city || 'Unknown',
                    isp: data.isp || 'Unknown',
                    threat: data.proxy || data.hosting ? 'High' : 'Low'
                }
            };
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }
}

module.exports = FirewallManager;
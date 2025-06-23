// src/renderer/components/scripts/ScriptControl.tsx
import React, { useState } from 'react';
import { Play, Square, Settings, RefreshCw, Clock, Shield, Target, Zap } from 'lucide-react';
import { ScriptConfig } from '@/renderer/types';

const ScriptControl: React.FC<{ electronAPI: any }> = ({ electronAPI }) => {
    const [config, setConfig] = useState<ScriptConfig>({
        interval: 30,
        enabled: false,
        runOnce: false,
        autoFirewall: true
    });

    // Usar directamente el estado del hook
    const isRunning = electronAPI.scriptState.isRunning;
    const scriptOutput = electronAPI.scriptState.logs;
    const detectedIPs = electronAPI.scriptState.detectedIPs;
    const blockedIPs = electronAPI.scriptState.blockedIPs;

    const handleStartScript = async () => {
        try {
            console.log('🔧 [FRONTEND] Iniciando script...');

            // ✅ AHORA startScriptExecution ESTARÁ DISPONIBLE
            const result = await electronAPI.startScriptExecution('detectIntrusos');

            if (result.success) {
                console.log('🔧 [FRONTEND] Script iniciado:', result.message);
            } else {
                console.error('🔧 [FRONTEND] Error iniciando script:', result.error);
            }
        } catch (error) {
            console.error('🔧 [FRONTEND] Excepción iniciando script:', error);
        }
    };

    const handleStopScript = () => {
        electronAPI.stopScriptExecution();
    };

    const handleSingleScan = async () => {
        try {
            console.log('🔧 [FRONTEND] Ejecutando escaneo único...');

            let result;
            if (config.autoFirewall) {
                result = await electronAPI.executeFullScanAndBlock();
            } else {
                result = await electronAPI.executeSingleScan();
            }

            if (result?.success) {
                console.log('🔧 [FRONTEND] Escaneo completado:', result.message);
            }
        } catch (error) {
            console.error('🔧 [FRONTEND] Error en escaneo:', error);
        }
    };


    const handleFirewallUpdate = async () => {
        try {
            const result = await electronAPI.executeFirewallUpdate();
            if (result?.success) {
                console.log('🔧 [FRONTEND] Firewall actualizado');
            }
        } catch (error) {
            console.error('🔧 [FRONTEND] Error actualizando firewall:', error);
        }
    };

    const handleClearDetectedIPs = async () => {
        try {
            const result = await electronAPI.clearDetectedIPs();
            if (result?.success) {
                console.log('🔧 [FRONTEND] IPs limpiadas');
            }
        } catch (error) {
            console.error('🔧 [FRONTEND] Error limpiando IPs:', error);
        }
    };

    const handleAnalyzeOnly = () => {
        electronAPI.analyzeFailedLogins();
    };

    const handleConfigChange = (key: keyof ScriptConfig, value: any) => {
        setConfig(prev => ({ ...prev, [key]: value }));
    };

    return (
        <div className="space-y-8">
            {/* Control Panel */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Automated Scanning */}
                <div className="glass-effect rounded-2xl p-6">
                    <h3 className="text-xl font-semibold text-white mb-4 flex items-center">
                        <Clock className="w-5 h-5 mr-3 text-green-400" />
                        Escaneo Automático
                    </h3>

                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-white mb-2">
                                Intervalo (segundos)
                            </label>
                            <input
                                type="number"
                                min="10"
                                max="3600"
                                value={config.interval}
                                onChange={(e) => handleConfigChange('interval', parseInt(e.target.value))}
                                className="w-full px-3 py-2 bg-white bg-opacity-20 text-white placeholder-white placeholder-opacity-50 rounded-lg border border-white border-opacity-20 focus:border-opacity-50 focus:outline-none"
                            />
                        </div>

                        <div className="flex items-center space-x-3">
                            <input
                                type="checkbox"
                                id="autoFirewall"
                                checked={config.autoFirewall}
                                onChange={(e) => handleConfigChange('autoFirewall', e.target.checked)}
                                className="rounded"
                            />
                            <label htmlFor="autoFirewall" className="text-sm text-white">
                                Bloqueo automático en firewall
                            </label>
                        </div>

                        <div className="flex items-center space-x-3">
                            <input
                                type="checkbox"
                                id="runOnce"
                                checked={config.runOnce}
                                onChange={(e) => handleConfigChange('runOnce', e.target.checked)}
                                className="rounded"
                            />
                            <label htmlFor="runOnce" className="text-sm text-white">
                                Ejecutar una vez y detener
                            </label>
                        </div>

                        <div className="pt-4 space-y-3">
                            <button
                                onClick={isRunning ? handleStopScript : handleStartScript}
                                className={`w-full flex items-center justify-center px-4 py-2 rounded-lg font-medium transition-all ${isRunning
                                    ? 'bg-red-500 hover:bg-red-600 text-white'
                                    : 'bg-green-500 hover:bg-green-600 text-white'
                                    }`}
                            >
                                {isRunning ? (
                                    <>
                                        <Square className="w-4 h-4 mr-2" />
                                        Detener Script
                                    </>
                                ) : (
                                    <>
                                        <Play className="w-4 h-4 mr-2" />
                                        Iniciar Script
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Manual Actions */}
                <div className="glass-effect rounded-2xl p-6">
                    <h3 className="text-xl font-semibold text-white mb-4 flex items-center">
                        <Target className="w-5 h-5 mr-3 text-blue-400" />
                        Acciones Manuales
                    </h3>

                    <div className="space-y-3">
                        <button
                            onClick={handleSingleScan}
                            className="w-full flex items-center justify-center px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-all"
                        >
                            <RefreshCw className="w-4 h-4 mr-2" />
                            {config.autoFirewall ? 'Escaneo + Bloqueo' : 'Solo Escaneo'}
                        </button>

                        <button
                            onClick={handleAnalyzeOnly}
                            className="w-full flex items-center justify-center px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg font-medium transition-all"
                        >
                            <Settings className="w-4 h-4 mr-2" />
                            Analizar Logs
                        </button>

                        <button
                            onClick={handleFirewallUpdate}
                            className="w-full flex items-center justify-center px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg font-medium transition-all"
                            disabled={detectedIPs.length === 0}
                        >
                            <Shield className="w-4 h-4 mr-2" />
                            Actualizar Firewall
                        </button>

                        <button
                            onClick={() => electronAPI.clearDetectedIPs()}
                            className="w-full flex items-center justify-center px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg font-medium transition-all"
                        >
                            <Zap className="w-4 h-4 mr-2" />
                            Limpiar IPs Detectadas
                        </button>
                    </div>
                </div>

                {/* Statistics */}
                <div className="glass-effect rounded-2xl p-6">
                    <h3 className="text-xl font-semibold text-white mb-4 flex items-center">
                        <Settings className="w-5 h-5 mr-3 text-yellow-400" />
                        Estadísticas
                    </h3>

                    <div className="space-y-4">
                        <div className="bg-white bg-opacity-10 rounded-lg p-4">
                            <div className="text-2xl font-bold text-red-400">{detectedIPs.length}</div>
                            <div className="text-sm text-white text-opacity-70">IPs detectadas</div>
                        </div>

                        <div className="bg-white bg-opacity-10 rounded-lg p-4">
                            <div className="text-2xl font-bold text-orange-400">{blockedIPs.length}</div>
                            <div className="text-sm text-white text-opacity-70">IPs bloqueadas</div>
                        </div>

                        <div className="bg-white bg-opacity-10 rounded-lg p-4">
                            <div className="text-2xl font-bold text-blue-400">{scriptOutput.length}</div>
                            <div className="text-sm text-white text-opacity-70">Eventos de script</div>
                        </div>

                        <div className="bg-white bg-opacity-10 rounded-lg p-4">
                            <div className="flex items-center space-x-2">
                                <div className={`w-3 h-3 rounded-full ${electronAPI.systemStatus.firewallEnabled ? 'bg-green-500' : 'bg-red-500'
                                    }`}></div>
                                <span className="text-sm text-white">
                                    Firewall: {electronAPI.systemStatus.firewallEnabled ? 'Activo' : 'Inactivo'}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Live Logs and Detected IPs */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Script Output */}
                <div className="glass-effect rounded-2xl p-6">
                    <h3 className="text-xl font-semibold text-white mb-4 flex items-center">
                        <RefreshCw className={`w-5 h-5 mr-3 text-orange-400 ${isRunning ? 'animate-spin' : ''}`} />
                        Salida del Script
                    </h3>

                    <div className="bg-white bg-opacity-10 rounded-lg p-4 h-64 overflow-y-auto custom-scrollbar font-mono text-sm">
                        {scriptOutput.length === 0 ? (
                            <div className="text-center text-white text-opacity-70 mt-20">
                                <RefreshCw className="w-12 h-12 mx-auto mb-4 text-white text-opacity-30" />
                                <p>Esperando salida del script...</p>
                            </div>
                        ) : (
                            <div className="space-y-1">
                                {scriptOutput.map((line, index) => (
                                    <div key={index} className="text-white text-opacity-90 break-words">
                                        {line}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Detected IPs */}
                <div className="glass-effect rounded-2xl p-6">
                    <h3 className="text-xl font-semibold text-white mb-4 flex items-center">
                        <Target className="w-5 h-5 mr-3 text-red-400" />
                        IPs Detectadas ({detectedIPs.length})
                    </h3>

                    <div className="bg-white bg-opacity-10 rounded-lg p-4 h-64 overflow-y-auto custom-scrollbar">
                        {detectedIPs.length === 0 ? (
                            <div className="text-center text-white text-opacity-70 mt-20">
                                <Target className="w-12 h-12 mx-auto mb-4 text-white text-opacity-30" />
                                <p>No se han detectado IPs sospechosas</p>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {detectedIPs.map((ip, index) => (
                                    <div key={index} className="flex items-center justify-between bg-white bg-opacity-10 rounded-lg p-2">
                                        <span className="text-white font-mono text-sm">{ip}</span>
                                        <span className={`text-xs px-2 py-1 rounded ${blockedIPs.includes(ip)
                                            ? 'bg-red-500 text-white'
                                            : 'bg-yellow-500 text-black'
                                            }`}>
                                            {blockedIPs.includes(ip) ? 'Bloqueada' : 'Detectada'}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default React.memo(ScriptControl);
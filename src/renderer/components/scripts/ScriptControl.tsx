// src/renderer/components/scripts/ScriptControl.tsx
import React, { useState, useEffect } from 'react';
import { Play, Square, Settings, RefreshCw, Clock, Shield } from 'lucide-react';
import { ScriptConfig } from '@types/index';
import LogsComponent from '@components/shared/LogsComponent';

const ScriptControl: React.FC = () => {
    const [isRunning, setIsRunning] = useState(false);
    const [config, setConfig] = useState<ScriptConfig>({
        interval: 30,
        enabled: false,
        runOnce: false,
        autoFirewall: true
    });
    const [scriptOutput, setScriptOutput] = useState<string[]>([]);

    useEffect(() => {
        // Verificar estado inicial del script
        checkScriptStatus();

        // Escuchar salida del script
        const unsubscribe = window.electronAPI.onScriptOutput((output: string) => {
            setScriptOutput(prev => [output, ...prev.slice(0, 49)]); // Mantener últimas 50 líneas
        });

        return unsubscribe;
    }, []);

    const checkScriptStatus = async () => {
        try {
            const result = await window.electronAPI.getScriptStatus();
            if (result.success) {
                setIsRunning(result.data.isRunning);
            }
        } catch (error) {
            console.error('Error checking script status:', error);
        }
    };

    const handleStartScript = async () => {
        try {
            const result = await window.electronAPI.runScript('scanForIpIn4625.ps1');
            if (result.success) {
                setIsRunning(true);
                setScriptOutput(prev => [`Script iniciado: ${new Date().toLocaleTimeString()}`, ...prev]);
            }
        } catch (error) {
            console.error('Error starting script:', error);
            setScriptOutput(prev => [`Error al iniciar script: ${error}`, ...prev]);
        }
    };

    const handleStopScript = async () => {
        try {
            const result = await window.electronAPI.stopScript();
            if (result.success) {
                setIsRunning(false);
                setScriptOutput(prev => [`Script detenido: ${new Date().toLocaleTimeString()}`, ...prev]);
            }
        } catch (error) {
            console.error('Error stopping script:', error);
        }
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
                                Agregar automáticamente al firewall
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
                                Ejecutar una vez
                            </label>
                        </div>

                        <div className="pt-4 space-y-3">
                            <button
                                onClick={isRunning ? handleStopScript : handleStartScript}
                                disabled={false}
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

                            <button
                                onClick={checkScriptStatus}
                                className="w-full flex items-center justify-center px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-all"
                            >
                                <RefreshCw className="w-4 h-4 mr-2" />
                                Verificar Estado
                            </button>
                        </div>
                    </div>
                </div>

                {/* Firewall Integration */}
                <div className="glass-effect rounded-2xl p-6">
                    <h3 className="text-xl font-semibold text-white mb-4 flex items-center">
                        <Shield className="w-5 h-5 mr-3 text-red-400" />
                        Integración Firewall
                    </h3>

                    <div className="space-y-4">
                        <div className="bg-white bg-opacity-10 rounded-lg p-4">
                            <h4 className="text-sm font-medium text-white mb-2">Estado</h4>
                            <div className="flex items-center space-x-2">
                                <div className={`w-3 h-3 rounded-full ${isRunning ? 'bg-green-500' : 'bg-gray-500'}`}></div>
                                <span className="text-sm text-white">
                                    {isRunning ? 'Activo' : 'Inactivo'}
                                </span>
                            </div>
                        </div>

                        <div className="bg-white bg-opacity-10 rounded-lg p-4">
                            <h4 className="text-sm font-medium text-white mb-2">Configuración</h4>
                            <div className="space-y-2 text-sm text-white text-opacity-70">
                                <div>Intervalo: {config.interval}s</div>
                                <div>Auto-bloqueo: {config.autoFirewall ? 'Sí' : 'No'}</div>
                                <div>Ejecución única: {config.runOnce ? 'Sí' : 'No'}</div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Recent Activity Summary */}
                <div className="glass-effect rounded-2xl p-6">
                    <h3 className="text-xl font-semibold text-white mb-4 flex items-center">
                        <Settings className="w-5 h-5 mr-3 text-blue-400" />
                        Resumen de Actividad
                    </h3>

                    <div className="space-y-4">
                        <div className="bg-white bg-opacity-10 rounded-lg p-4">
                            <div className="text-2xl font-bold text-green-400">0</div>
                            <div className="text-sm text-white text-opacity-70">IPs detectadas hoy</div>
                        </div>

                        <div className="bg-white bg-opacity-10 rounded-lg p-4">
                            <div className="text-2xl font-bold text-red-400">0</div>
                            <div className="text-sm text-white text-opacity-70">IPs bloqueadas</div>
                        </div>

                        <div className="bg-white bg-opacity-10 rounded-lg p-4">
                            <div className="text-2xl font-bold text-blue-400">
                                {scriptOutput.length}
                            </div>
                            <div className="text-sm text-white text-opacity-70">Eventos de script</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Live Logs */}
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

                {/* User Actions Log */}
                <LogsComponent
                    title="Acciones de Usuario"
                    logType="user"
                    height="h-64"
                    showControls={true}
                />
            </div>

            <style jsx>{`
        .glass-effect {
          background: rgba(255, 255, 255, 0.1);
          backdrop-filter: blur(10px);
          border: 1px solid rgba(255, 255, 255, 0.2);
        }

        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }

        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 3px;
        }

        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.3);
          border-radius: 3px;
        }

        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.5);
        }
      `}</style>
        </div>
    );
};

export default ScriptControl;
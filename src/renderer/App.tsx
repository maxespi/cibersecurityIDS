// src/renderer/App.tsx
import React, { useState, useEffect } from 'react';
import Header from './components/layout/Header';
import Navigation from './components/layout/Navigation';
import DashboardHome from './components/dashboard/DashboardHome';
import FirewallDashboard from './components/firewall/FirewallDashboard';
import ScriptControl from './components/scripts/ScriptControl';
import LogsViewer from './components/logs/LogsViewer';
import WhitelistManager from './components/whitelist/WhitelistManager';

import { ActiveView } from './types';
import { useElectronAPI } from './hooks/useElectronAPI';

const App: React.FC = () => {
    const [activeView, setActiveView] = useState<ActiveView>('dashboard');

    // Integrar todas las funcionalidades de mainRenderer
    const electronAPI = useElectronAPI();

    useEffect(() => {
        // Inicialización adicional si es necesaria
        console.log('CyberGuard IDS React App iniciado con API completa');
    }, []);

    const renderCurrentView = () => {
        switch (activeView) {
            case 'dashboard':
                return (
                    <DashboardHome
                        onNavigate={setActiveView}
                        electronAPI={electronAPI}
                    />
                );
            case 'scripts':
                return (
                    <ScriptControl
                        electronAPI={electronAPI}
                    />
                );
            case 'logs':
                return (
                    <LogsViewer
                        electronAPI={electronAPI}
                    />
                );
            case 'firewall':
                return <FirewallDashboard />;
            case 'whitelist':
                return <WhitelistManager />;
            default:
                return (
                    <DashboardHome
                        onNavigate={setActiveView}
                        electronAPI={electronAPI}
                    />
                );
        }
    };

    return (
        <div className="min-h-screen app-background">
            <Header />
            <Navigation
                activeView={activeView}
                onViewChange={setActiveView}
                electronAPI={electronAPI}
            />

            <main className="max-w-7xl mx-auto px-6 pb-8">
                {renderCurrentView()}
            </main>

            {/* System Status Bar */}
            <div className="fixed bottom-4 right-4 glass-effect rounded-lg p-3 text-sm text-white">
                <div className="flex items-center space-x-4">
                    <span className={`w-2 h-2 rounded-full ${electronAPI.systemStatus.firewallEnabled ? 'bg-green-400' : 'bg-red-400'
                        }`}></span>
                    <span>Firewall: {electronAPI.systemStatus.firewallEnabled ? 'Activo' : 'Inactivo'}</span>

                    <span className={`w-2 h-2 rounded-full ${electronAPI.scriptState.isRunning ? 'bg-blue-400' : 'bg-gray-400'
                        }`}></span>
                    <span>Script: {electronAPI.scriptState.isRunning ? 'Ejecutándose' : 'Detenido'}</span>
                </div>
            </div>

            <footer className="mt-12 pb-8">
                <div className="max-w-7xl mx-auto px-6">
                    <div className="glass-effect rounded-xl p-4 text-center">
                        <p className="text-white text-opacity-70 text-sm">
                            © 2024 CyberGuard IDS - Sistema de Detección de Intrusos
                            <span className="mx-2">•</span>
                            <span className="text-green-400">v1.0.0</span>
                        </p>
                    </div>
                </div>
            </footer>
        </div>
    );
};

// Exportar para uso global (compatibilidad)
if (typeof window !== 'undefined') {
    (window as any).App = App;
}

export default App;
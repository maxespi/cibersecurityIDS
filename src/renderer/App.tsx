// src/renderer/App.tsx
import React, { useState, useEffect } from 'react';
import { ActiveView } from '@types/index';
import Header from '@components/layout/Header';
import Navigation from '@components/layout/Navigation';
import DashboardHome from '@components/dashboard/DashboardHome';
import ScriptControl from '@components/scripts/ScriptControl';
import LogsViewer from '@components/logs/LogsViewer';
import FirewallDashboard from '@components/firewall/FirewallDashboard';

const App: React.FC = () => {
    const [activeView, setActiveView] = useState<ActiveView>('dashboard');

    useEffect(() => {
        // Notificar que la app se ha abierto
        window.electronAPI.onAppOpened(() => {
            console.log('CyberGuard IDS iniciado');
        });
    }, []);

    const renderCurrentView = () => {
        switch (activeView) {
            case 'dashboard':
                return <DashboardHome onNavigate={setActiveView} />;
            case 'scripts':
                return <ScriptControl />;
            case 'logs':
                return <LogsViewer />;
            case 'firewall':
                return <FirewallDashboard />;
            default:
                return <DashboardHome onNavigate={setActiveView} />;
        }
    };

    return (
        <div className="min-h-screen app-background">
            <Header />
            <Navigation activeView={activeView} onViewChange={setActiveView} />

            <main className="max-w-7xl mx-auto px-6 pb-8">
                {renderCurrentView()}
            </main>

            {/* Footer */}
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

            <style jsx>{`
        .app-background {
          background: linear-gradient(135deg, #1e3a8a 0%, #7c3aed 50%, #1e40af 100%);
          min-height: 100vh;
        }

        .glass-effect {
          background: rgba(255, 255, 255, 0.1);
          backdrop-filter: blur(10px);
          border: 1px solid rgba(255, 255, 255, 0.2);
        }
      `}</style>
        </div>
    );
};

// Exportar para uso global (compatibilidad)
if (typeof window !== 'undefined') {
    (window as any).App = App;
}

export default App;
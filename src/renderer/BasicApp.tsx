
// src/renderer/BasicApp.tsx
import React, { useState } from 'react';

type ActiveView = 'dashboard' | 'scripts' | 'logs' | 'firewall';

const BasicApp: React.FC = () => {
    const [activeView, setActiveView] = useState<ActiveView>('dashboard');

    const renderView = () => {
        switch (activeView) {
            case 'dashboard':
                return (
                    <div className="glass-effect rounded-2xl p-8 text-center">
                        <h2 className="text-2xl font-bold text-white mb-4">Dashboard</h2>
                        <p className="text-white text-opacity-70">Panel principal del sistema</p>
                    </div>
                );
            case 'scripts':
                return (
                    <div className="glass-effect rounded-2xl p-8 text-center">
                        <h2 className="text-2xl font-bold text-white mb-4">Scripts</h2>
                        <p className="text-white text-opacity-70">Control de scripts automáticos</p>
                    </div>
                );
            case 'logs':
                return (
                    <div className="glass-effect rounded-2xl p-8 text-center">
                        <h2 className="text-2xl font-bold text-white mb-4">Logs</h2>
                        <p className="text-white text-opacity-70">Visor de logs del sistema</p>
                    </div>
                );
            case 'firewall':
                return (
                    <div className="glass-effect rounded-2xl p-8 text-center">
                        <h2 className="text-2xl font-bold text-white mb-4">Firewall</h2>
                        <p className="text-white text-opacity-70">Gestión del firewall</p>
                    </div>
                );
            default:
                return null;
        }
    };

    return (
        <div className="min-h-screen app-background">
            {/* Header */}
            <header className="glass-effect">
                <div className="max-w-7xl mx-auto px-6 py-4">
                    <div className="flex justify-between items-center">
                        <div className="flex items-center space-x-3">
                            <div className="relative">
                                <div className="absolute inset-0 bg-blue-500 rounded-full pulse-ring"></div>
                                <div className="relative bg-blue-500 text-white p-3 rounded-full">
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.18-1.37a2.4 2.4 0 01-1.85 2.06L18 12.5a2.4 2.4 0 01-1.44 2.19L15 15.5a2.4 2.4 0 01-1.85 2.06L12 17.5a2.4 2.4 0 01-1.44 2.19L9 20.5a2.4 2.4 0 01-1.85 2.06L6 22.5a2.4 2.4 0 01-1.44 2.19L3 25.5a2.4 2.4 0 01-1.85 2.06"></path>
                                    </svg>
                                </div>
                            </div>
                            <div>
                                <h1 className="text-2xl font-bold text-white">CyberGuard IDS</h1>
                                <p className="text-blue-100 text-sm">Sistema de Detección de Intrusos</p>
                            </div>
                        </div>
                        <div className="text-right">
                            <div className="bg-white bg-opacity-20 backdrop-filter backdrop-blur-lg rounded-lg px-4 py-2">
                                <span className="text-white font-medium">👤 Usuario: Admin</span>
                            </div>
                        </div>
                    </div>
                </div>
            </header>

            {/* Navigation */}
            <nav className="max-w-7xl mx-auto px-6 py-4">
                <div className="flex justify-center space-x-4">
                    {[
                        { view: 'dashboard' as ActiveView, label: 'Dashboard', icon: '📊' },
                        { view: 'scripts' as ActiveView, label: 'Scripts', icon: '⚙️' },
                        { view: 'logs' as ActiveView, label: 'Logs', icon: '📝' },
                        { view: 'firewall' as ActiveView, label: 'Firewall', icon: '🛡️' }
                    ].map(({ view, label, icon }) => (
                        <button
                            key={view}
                            onClick={() => setActiveView(view)}
                            className={`flex items-center px-6 py-3 rounded-lg font-medium transition-all duration-200 ${activeView === view
                                ? 'bg-white text-blue-900 shadow-lg transform scale-105'
                                : 'bg-white bg-opacity-20 text-white hover:bg-opacity-30 hover:scale-102'
                                }`}
                        >
                            <span className="mr-2">{icon}</span>
                            {label}
                        </button>
                    ))}
                </div>
            </nav>

            {/* Main Content */}
            <main className="max-w-7xl mx-auto px-6 pb-8">
                {renderView()}
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

        .pulse-ring {
          animation: pulse 2s infinite;
        }

        @keyframes pulse {
          0% {
            transform: scale(0.95);
            box-shadow: 0 0 0 0 rgba(59, 130, 246, 0.7);
          }
          70% {
            transform: scale(1);
            box-shadow: 0 0 0 10px rgba(59, 130, 246, 0);
          }
          100% {
            transform: scale(0.95);
            box-shadow: 0 0 0 0 rgba(59, 130, 246, 0);
          }
        }

        .hover\\:scale-102:hover {
          transform: scale(1.02);
        }
      `}</style>
        </div>
    );
};

// Exportar para uso global
if (typeof window !== 'undefined') {
    (window as any).BasicApp = BasicApp;
}

export default BasicApp;
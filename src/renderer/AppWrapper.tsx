// src/renderer/AppWrapper.tsx
import React from 'react';

// Importación sin hooks para testing
const AppWrapper: React.FC = () => {
    console.log('AppWrapper renderizado');

    return (
        <div className="min-h-screen app-background">
            <div className="flex items-center justify-center min-h-screen">
                <div className="glass-effect rounded-2xl p-8 max-w-md mx-auto text-center">
                    <div className="text-blue-400 mb-4">
                        <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                        </svg>
                    </div>
                    <h2 className="text-white text-xl font-bold mb-2">CyberGuard IDS</h2>
                    <p className="text-white text-opacity-70 mb-4">
                        Aplicación React cargada correctamente
                    </p>
                    <div className="text-green-400 text-sm">
                        ✓ Sistema funcionando
                    </div>
                </div>
            </div>

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

// Exportar para uso global
if (typeof window !== 'undefined') {
    (window as any).AppWrapper = AppWrapper;
}

export default AppWrapper;
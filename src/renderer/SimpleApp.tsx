// src/renderer/SimpleApp.tsx
import React from 'react';

// Componente simple sin hooks para testing
const SimpleApp: React.FC = () => {
    return (
        <div style={{
            minHeight: '100vh',
            background: 'linear-gradient(135deg, #1e3a8a 0%, #7c3aed 50%, #1e40af 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: 'Arial, sans-serif'
        }}>
            <div style={{
                background: 'rgba(255, 255, 255, 0.1)',
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                borderRadius: '16px',
                padding: '32px',
                textAlign: 'center',
                maxWidth: '400px'
            }}>
                <div style={{ color: '#60a5fa', marginBottom: '16px' }}>
                    <svg style={{ width: '64px', height: '64px', margin: '0 auto' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.18-1.37a2.4 2.4 0 01-1.85 2.06L18 12.5a2.4 2.4 0 01-1.44 2.19L15 15.5a2.4 2.4 0 01-1.85 2.06L12 17.5a2.4 2.4 0 01-1.44 2.19L9 20.5a2.4 2.4 0 01-1.85 2.06L6 22.5a2.4 2.4 0 01-1.44 2.19L3 25.5a2.4 2.4 0 01-1.85 2.06"></path>
                    </svg>
                </div>
                <h1 style={{ color: 'white', fontSize: '24px', fontWeight: 'bold', marginBottom: '8px' }}>
                    CyberGuard IDS
                </h1>
                <p style={{ color: 'rgba(255, 255, 255, 0.7)', marginBottom: '16px' }}>
                    Sistema de Detección de Intrusos
                </p>
                <div style={{ color: '#22c55e', fontSize: '14px' }}>
                    ✓ React funcionando correctamente
                </div>
                <div style={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: '12px', marginTop: '8px' }}>
                    Versión: 1.0.0
                </div>
            </div>
        </div>
    );
};

// Exportar para uso global
if (typeof window !== 'undefined') {
    (window as any).SimpleApp = SimpleApp;
}

export default SimpleApp;
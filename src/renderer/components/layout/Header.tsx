// src/renderer/components/layout/Header.tsx
import React, { useState, useEffect } from 'react';
import { Shield } from 'lucide-react';

interface HeaderProps {
    className?: string;
}

const Header: React.FC<HeaderProps> = ({ className = '' }) => {
    const [username, setUsername] = useState<string>('No logueado');

    useEffect(() => {
        // Escuchar eventos de login
        const unsubscribe = window.electronAPI.onUserLoggedIn((user: string) => {
            setUsername(user);
        });

        return unsubscribe;
    }, []);

    return (
        <header className={`glass-effect ${className}`}>
            <div className="max-w-7xl mx-auto px-6 py-4">
                <div className="flex justify-between items-center">
                    <div className="flex items-center space-x-3">
                        <div className="relative">
                            <div className="absolute inset-0 bg-blue-500 rounded-full pulse-ring"></div>
                            <div className="relative bg-blue-500 text-white p-3 rounded-full">
                                <Shield className="w-6 h-6" />
                            </div>
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-white">CyberGuard IDS</h1>
                            <p className="text-blue-100 text-sm">
                                Sistema de Detección de Intrusos
                            </p>
                        </div>
                    </div>

                    <div id="userPanel" className="text-right">
                        <div className="bg-white bg-opacity-20 backdrop-filter backdrop-blur-lg rounded-lg px-4 py-2">
                            <span className="text-white font-medium">
                                👤 Usuario: {username}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            <style jsx>{`
        .glass-effect {
          background: rgba(255, 255, 255, 0.1);
          backdrop-filter: blur(10px);
          border-bottom: 1px solid rgba(255, 255, 255, 0.2);
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
      `}</style>
        </header>
    );
};

export default Header;
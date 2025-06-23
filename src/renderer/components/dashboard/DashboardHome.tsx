// src/renderer/components/dashboard/DashboardHome.tsx
import React from 'react';
import { Code, FileText, Shield, Eye, Activity, Clock, AlertTriangle } from 'lucide-react';
import StatsCard from './StatsCard';
import { ActiveView } from '@/renderer/types';
import LogsComponent from '../shared/LogsComponent';

interface DashboardHomeProps {
    onNavigate: (view: ActiveView) => void;
    electronAPI: any;
}

const DashboardHome: React.FC<DashboardHomeProps> = ({ onNavigate, electronAPI }) => {
    const navigationCards = [
        {
            id: 'scripts',
            title: 'Scripts',
            subtitle: 'Automatización',
            description: 'Ejecutar scripts de detección y análisis de amenazas en tiempo real',
            icon: <Code className="w-8 h-8 text-white" />,
            bgColor: 'bg-green-500',
            view: 'scripts' as ActiveView
        },
        {
            id: 'logs',
            title: 'Logs',
            subtitle: 'Monitoreo',
            description: 'Revisar logs del sistema y eventos de seguridad registrados',
            icon: <FileText className="w-8 h-8 text-white" />,
            bgColor: 'bg-blue-500',
            view: 'logs' as ActiveView
        },
        {
            id: 'firewall',
            title: 'Firewall',
            subtitle: 'Protección',
            description: 'Gestionar reglas del firewall y IPs bloqueadas del sistema',
            icon: <Shield className="w-8 h-8 text-white" />,
            bgColor: 'bg-red-500',
            view: 'firewall' as ActiveView
        },
        {
            id: 'ips',
            title: 'IPs Detectadas',
            subtitle: 'Amenazas',
            description: 'Visualizar IPs maliciosas detectadas por el sistema IDS',
            icon: <Eye className="w-8 h-8 text-white" />,
            bgColor: 'bg-purple-500',
            view: 'logs' as ActiveView // Por ahora va a logs, luego se puede crear vista específica
        }
    ];

    return (
        <div className="space-y-8">
            {/* Navigation Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {navigationCards.map((card) => (
                    <div
                        key={card.id}
                        className="glass-effect rounded-2xl p-6 card-hover cursor-pointer transform transition-all duration-200 hover:scale-105"
                        onClick={() => onNavigate(card.view)}
                    >
                        <div className="flex items-center justify-between mb-4">
                            <div className={`${card.bgColor} p-3 rounded-xl`}>
                                {card.icon}
                            </div>
                            <div className="text-right">
                                <div className="text-2xl font-bold text-white">{card.title}</div>
                                <div className="text-blue-200 text-sm">{card.subtitle}</div>
                            </div>
                        </div>
                        <p className="text-white text-opacity-80 text-sm">
                            {card.description}
                        </p>
                    </div>
                ))}
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <StatsCard
                    title="Sistema"
                    value="Activo"
                    icon={<Activity className="w-6 h-6" />}
                    color="green"
                    description="Estado del IDS"
                />
                <StatsCard
                    title="Amenazas Hoy"
                    value="0"
                    icon={<AlertTriangle className="w-6 h-6" />}
                    color="yellow"
                    description="Últimas 24h"
                />
                <StatsCard
                    title="IPs Bloqueadas"
                    value="0"
                    icon={<Shield className="w-6 h-6" />}
                    color="red"
                    description="Total bloqueadas"
                />
                <StatsCard
                    title="Uptime"
                    value="00:00:00"
                    icon={<Clock className="w-6 h-6" />}
                    color="blue"
                    description="Tiempo activo"
                />
            </div>

            {/* Live Activity */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Recent Activity */}
                <div className="glass-effect rounded-2xl p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-xl font-semibold text-white flex items-center">
                            <Activity className="w-5 h-5 text-blue-400 mr-3" />
                            Actividad Reciente
                        </h3>
                        <span className="text-sm text-blue-200">Últimos 25 registros</span>
                    </div>

                    <div className="bg-white bg-opacity-10 rounded-lg p-4 h-64 overflow-y-auto custom-scrollbar">
                        <div className="text-center text-white text-opacity-70 mt-20">
                            <Activity className="w-12 h-12 mx-auto mb-4 text-white text-opacity-30" />
                            <p>No hay actividad reciente</p>
                        </div>
                    </div>
                </div>

                {/* Live Feed */}
                <div className="glass-effect rounded-2xl p-6">
                    <div className="grid grid-cols-1 gap-4 h-full">
                        {/* User Actions */}
                        <LogsComponent
                            title="Acciones de Usuario"
                            logType="user"
                            height="h-24"
                            className="!p-0 !bg-transparent !border-0"
                        />

                        {/* Script Logs */}
                        <LogsComponent
                            title="Logs de Script"
                            logType="script"
                            height="h-32"
                            className="!p-0 !bg-transparent !border-0"
                        />
                    </div>
                </div>
            </div>

            {/*  <style jsx>{`
        .glass-effect {
          background: rgba(255, 255, 255, 0.1);
          backdrop-filter: blur(10px);
          border: 1px solid rgba(255, 255, 255, 0.2);
        }

        .card-hover {
          transition: all 0.3s ease;
        }

        .card-hover:hover {
          background: rgba(255, 255, 255, 0.15);
          border-color: rgba(255, 255, 255, 0.3);
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
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
      `}</style> */}
        </div>
    );
};

export default DashboardHome;
// src/renderer/components/firewall/FirewallDashboard.tsx
import React from 'react';
import { Shield, Trash2, RefreshCw, Check, X, Globe, AlertTriangle } from 'lucide-react';
import { useFirewall } from '@hooks/useFirewall';

const FirewallDashboard: React.FC = () => {
    const {
        blockedIPs,
        firewallStats,
        geoData,
        loading,
        isAdmin,
        selectedIPs,
        loadFirewallData,
        removeIP,
        removeMultipleIPs,
        toggleIPSelection,
        selectAllIPs,
        clearSelection,
        getThreatLevel
    } = useFirewall();

    const removeIndividualIP = async (ip: string) => {
        const success = await removeIP(ip);
        if (success) {
            console.log(`IP ${ip} eliminada del firewall`);
        } else {
            console.error(`Error al eliminar IP ${ip}`);
        }
    };

    const removeSelectedIPs = async () => {
        if (selectedIPs.size === 0) return;

        const ipsArray = Array.from(selectedIPs);
        const success = await removeMultipleIPs(ipsArray);
        if (success) {
            console.log(`${ipsArray.length} IPs eliminadas del firewall`);
        } else {
            console.error('Error al eliminar IPs seleccionadas');
        }
    };

    const selectAll = () => {
        if (selectedIPs.size === blockedIPs.length) {
            clearSelection();
        } else {
            selectAllIPs();
        }
    };

    const getThreatColor = (level: 'low' | 'medium' | 'high') => {
        switch (level) {
            case 'high': return 'text-red-600 bg-red-50';
            case 'medium': return 'text-yellow-600 bg-yellow-50';
            case 'low': return 'text-green-600 bg-green-50';
            default: return 'text-gray-600 bg-gray-50';
        }
    };

    const getThreatLabel = (level: 'low' | 'medium' | 'high') => {
        switch (level) {
            case 'high': return 'Alto';
            case 'medium': return 'Medio';
            case 'low': return 'Bajo';
            default: return 'Desconocido';
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <RefreshCw className="animate-spin h-8 w-8 text-blue-500" />
                <span className="ml-2 text-gray-600">Cargando datos del firewall...</span>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="glass-effect rounded-2xl p-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold text-white flex items-center">
                            <Shield className="mr-3 h-8 w-8 text-blue-400" />
                            Gestión de Firewall
                        </h1>
                        <p className="text-white text-opacity-70 mt-2">
                            Administra las IPs bloqueadas en el firewall de Windows
                        </p>
                    </div>
                </div>
            </div>

            {/* Estado de permisos */}
            <div className={`glass-effect rounded-2xl p-4 ${isAdmin ? 'border-green-400' : 'border-red-400'} border-opacity-50`}>
                <div className="flex items-center">
                    {isAdmin ? (
                        <>
                            <Check className="h-5 w-5 text-green-400 mr-2" />
                            <span className="text-green-300">Ejecutándose con permisos de administrador</span>
                        </>
                    ) : (
                        <>
                            <X className="h-5 w-5 text-red-400 mr-2" />
                            <span className="text-red-300">Se requieren permisos de administrador</span>
                        </>
                    )}
                </div>
            </div>

            {/* Estadísticas del firewall */}
            {firewallStats && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="glass-effect rounded-2xl p-4">
                        <h3 className="text-sm font-medium text-white text-opacity-70">Regla Inbound</h3>
                        <div className="flex items-center mt-2">
                            <div className={`w-3 h-3 rounded-full mr-2 ${firewallStats.InboundExists && firewallStats.InboundEnabled ? 'bg-green-500' : 'bg-red-500'}`}></div>
                            <span className="text-lg font-semibold text-white">
                                {firewallStats.InboundExists ? (firewallStats.InboundEnabled ? 'Activa' : 'Inactiva') : 'No existe'}
                            </span>
                        </div>
                    </div>
                    <div className="glass-effect rounded-2xl p-4">
                        <h3 className="text-sm font-medium text-white text-opacity-70">Regla Outbound</h3>
                        <div className="flex items-center mt-2">
                            <div className={`w-3 h-3 rounded-full mr-2 ${firewallStats.OutboundExists && firewallStats.OutboundEnabled ? 'bg-green-500' : 'bg-red-500'}`}></div>
                            <span className="text-lg font-semibold text-white">
                                {firewallStats.OutboundExists ? (firewallStats.OutboundEnabled ? 'Activa' : 'Inactiva') : 'No existe'}
                            </span>
                        </div>
                    </div>
                    <div className="glass-effect rounded-2xl p-4">
                        <h3 className="text-sm font-medium text-white text-opacity-70">IPs Bloqueadas</h3>
                        <p className="text-2xl font-bold text-blue-400 mt-2">{blockedIPs.length}</p>
                    </div>
                    <div className="glass-effect rounded-2xl p-4">
                        <h3 className="text-sm font-medium text-white text-opacity-70">Seleccionadas</h3>
                        <p className="text-2xl font-bold text-orange-400 mt-2">{selectedIPs.size}</p>
                    </div>
                </div>
            )}

            {/* Controles */}
            <div className="glass-effect rounded-2xl p-6">
                <div className="flex flex-wrap gap-3">
                    <button
                        onClick={loadFirewallData}
                        className="flex items-center px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 transition-all"
                        disabled={loading}
                    >
                        <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                        Actualizar
                    </button>

                    <button
                        onClick={selectAll}
                        className="flex items-center px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-all"
                    >
                        {selectedIPs.size === blockedIPs.length ? 'Deseleccionar Todo' : 'Seleccionar Todo'}
                    </button>

                    {selectedIPs.size > 0 && (
                        <button
                            onClick={removeSelectedIPs}
                            className="flex items-center px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-50 transition-all"
                            disabled={!isAdmin}
                        >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Eliminar Seleccionadas ({selectedIPs.size})
                        </button>
                    )}
                </div>
            </div>

            {/* Tabla de IPs */}
            <div className="glass-effect rounded-2xl p-6">
                <h2 className="text-xl font-bold text-white mb-4">IPs Bloqueadas</h2>

                {blockedIPs.length === 0 ? (
                    <div className="text-center py-8">
                        <Shield className="h-12 w-12 text-white text-opacity-30 mx-auto mb-4" />
                        <p className="text-white text-opacity-70">No hay IPs bloqueadas en el firewall</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-white border-opacity-20">
                                    <th className="px-4 py-3 text-left text-xs font-medium text-white text-opacity-70 uppercase tracking-wider">
                                        <input
                                            type="checkbox"
                                            checked={selectedIPs.size === blockedIPs.length && blockedIPs.length > 0}
                                            onChange={selectAll}
                                            className="rounded border-white border-opacity-30 bg-white bg-opacity-20 text-blue-500"
                                        />
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-white text-opacity-70 uppercase tracking-wider">
                                        IP Address
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-white text-opacity-70 uppercase tracking-wider">
                                        País
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-white text-opacity-70 uppercase tracking-wider">
                                        ISP
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-white text-opacity-70 uppercase tracking-wider">
                                        Nivel de Amenaza
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-white text-opacity-70 uppercase tracking-wider">
                                        Acciones
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white divide-opacity-10">
                                {blockedIPs.map((ipObj) => {
                                    const ip = typeof ipObj === 'string' ? ipObj : ipObj.ip;
                                    const geo = geoData[ip];
                                    const threatLevel = getThreatLevel(ip);

                                    return (
                                        <tr
                                            key={ip}
                                            className={`hover:bg-white hover:bg-opacity-5 transition-all ${selectedIPs.has(ip) ? 'bg-blue-500 bg-opacity-20' : ''
                                                }`}
                                        >
                                            <td className="px-4 py-3">
                                                <input
                                                    type="checkbox"
                                                    checked={selectedIPs.has(ip)}
                                                    onChange={() => toggleIPSelection(ip)}
                                                    className="rounded border-white border-opacity-30 bg-white bg-opacity-20 text-blue-500"
                                                />
                                            </td>
                                            <td className="px-4 py-3 text-sm font-mono text-white">
                                                {ip}
                                            </td>
                                            <td className="px-4 py-3 text-sm text-white text-opacity-90">
                                                <div className="flex items-center">
                                                    {geo?.country && (
                                                        <>
                                                            <Globe className="h-4 w-4 mr-1 text-blue-400" />
                                                            {geo.country}
                                                        </>
                                                    )}
                                                    {!geo?.country && <span className="text-white text-opacity-50">-</span>}
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-sm text-white text-opacity-90">
                                                {geo?.isp || <span className="text-white text-opacity-50">-</span>}
                                            </td>
                                            <td className="px-4 py-3 text-sm">
                                                <span className={`px-2 py-1 rounded text-xs font-medium ${getThreatColor(threatLevel)}`}>
                                                    {getThreatLabel(threatLevel)}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-sm">
                                                <button
                                                    onClick={() => removeIndividualIP(ip)}
                                                    className="text-red-400 hover:text-red-300 disabled:opacity-50 transition-all"
                                                    disabled={!isAdmin}
                                                    title="Eliminar IP del firewall"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            <style jsx>{`
                .glass-effect {
                    background: rgba(255, 255, 255, 0.1);
                    backdrop-filter: blur(10px);
                    border: 1px solid rgba(255, 255, 255, 0.2);
                }
            `}</style>
        </div>
    );
};

export default FirewallDashboard;
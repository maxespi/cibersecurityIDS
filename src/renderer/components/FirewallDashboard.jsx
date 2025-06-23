// src/renderer/components/FirewallDashboard.jsx
import React, { useState, useEffect } from 'react';
import { Shield, Trash2, Globe, AlertTriangle, Check, X, RefreshCw } from 'lucide-react';

const FirewallDashboard = () => {
    const [blockedIPs, setBlockedIPs] = useState([]);
    const [firewallStats, setFirewallStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isAdmin, setIsAdmin] = useState(false);
    const [selectedIPs, setSelectedIPs] = useState(new Set());
    const [geoData, setGeoData] = useState({});

    useEffect(() => {
        checkPermissions();
        loadFirewallData();
    }, []);

    const checkPermissions = async () => {
        try {
            const result = await window.electronAPI.checkAdminPrivileges();
            setIsAdmin(result.isAdmin);
            if (!result.isAdmin) {
                console.warn('Se requieren permisos de administrador para gestionar el firewall');
            }
        } catch (error) {
            console.error('Error checking permissions:', error);
        }
    };

    const loadFirewallData = async () => {
        setLoading(true);
        try {
            // Cargar IPs bloqueadas
            const ipsResult = await window.electronAPI.getBlockedIPs();
            if (ipsResult.success) {
                setBlockedIPs(ipsResult.data.total);

                // Cargar datos geográficos para cada IP (máximo 50 para no sobrecargar)
                const ipsToGeolocate = ipsResult.data.total.slice(0, 50);
                const geoPromises = ipsToGeolocate.map(async (ip) => {
                    try {
                        const geoResult = await window.electronAPI.getIPGeolocation(ip);
                        return { ip, data: geoResult.success ? geoResult.data : null };
                    } catch (error) {
                        return { ip, data: null };
                    }
                });

                const geoResults = await Promise.all(geoPromises);
                const geoMap = {};
                geoResults.forEach(({ ip, data }) => {
                    geoMap[ip] = data;
                });
                setGeoData(geoMap);
            }

            // Cargar estadísticas del firewall
            const statsResult = await window.electronAPI.getFirewallStats();
            if (statsResult.success) {
                setFirewallStats(statsResult.data);
            }
        } catch (error) {
            console.error('Error loading firewall data:', error);
        } finally {
            setLoading(false);
        }
    };

    const removeSelectedIPs = async () => {
        if (selectedIPs.size === 0) return;

        if (!window.confirm(`¿Estás seguro de que deseas eliminar ${selectedIPs.size} IP(s) del firewall?`)) {
            return;
        }

        setLoading(true);
        try {
            const promises = Array.from(selectedIPs).map(ip =>
                window.electronAPI.removeIPFromFirewall(ip)
            );

            await Promise.all(promises);
            setSelectedIPs(new Set());
            await loadFirewallData();
            alert(`${promises.length} IP(s) eliminadas del firewall`);
        } catch (error) {
            console.error('Error removing IPs:', error);
            alert('Error al eliminar IPs del firewall');
        } finally {
            setLoading(false);
        }
    };

    const removeIndividualIP = async (ip) => {
        if (!window.confirm(`¿Estás seguro de que deseas eliminar la IP ${ip} del firewall?`)) {
            return;
        }

        setLoading(true);
        try {
            await window.electronAPI.removeIPFromFirewall(ip);
            await loadFirewallData();
            alert(`IP ${ip} eliminada del firewall`);
        } catch (error) {
            console.error('Error removing IP:', error);
            alert('Error al eliminar la IP del firewall');
        } finally {
            setLoading(false);
        }
    };

    const toggleIPSelection = (ip) => {
        const newSelected = new Set(selectedIPs);
        if (newSelected.has(ip)) {
            newSelected.delete(ip);
        } else {
            newSelected.add(ip);
        }
        setSelectedIPs(newSelected);
    };

    const selectAll = () => {
        if (selectedIPs.size === blockedIPs.length) {
            setSelectedIPs(new Set());
        } else {
            setSelectedIPs(new Set(blockedIPs));
        }
    };

    const getThreatLevel = (ip) => {
        const geo = geoData[ip];
        if (!geo) return 'unknown';
        return geo.threat === 'High' ? 'high' : 'low';
    };

    const getThreatColor = (level) => {
        switch (level) {
            case 'high': return 'text-red-600 bg-red-50';
            case 'low': return 'text-green-600 bg-green-50';
            default: return 'text-gray-600 bg-gray-50';
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
        <div className="p-6 max-w-7xl mx-auto">
            <div className="mb-6">
                <h1 className="text-3xl font-bold text-gray-900 flex items-center">
                    <Shield className="mr-3 h-8 w-8 text-blue-500" />
                    Gestión de Firewall
                </h1>
                <p className="text-gray-600 mt-2">
                    Administra las IPs bloqueadas en el firewall de Windows
                </p>
            </div>

            {/* Estado de permisos */}
            <div className={`mb-6 p-4 rounded-lg border ${isAdmin ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                <div className="flex items-center">
                    {isAdmin ? (
                        <>
                            <Check className="h-5 w-5 text-green-600 mr-2" />
                            <span className="text-green-800">Ejecutándose con permisos de administrador</span>
                        </>
                    ) : (
                        <>
                            <X className="h-5 w-5 text-red-600 mr-2" />
                            <span className="text-red-800">Se requieren permisos de administrador</span>
                        </>
                    )}
                </div>
            </div>

            {/* Estadísticas del firewall */}
            {firewallStats && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                    <div className="bg-white p-4 rounded-lg border shadow-sm">
                        <h3 className="text-sm font-medium text-gray-500">Regla Inbound</h3>
                        <div className="flex items-center mt-2">
                            <div className={`w-3 h-3 rounded-full mr-2 ${firewallStats.InboundExists && firewallStats.InboundEnabled ? 'bg-green-500' : 'bg-red-500'}`}></div>
                            <span className="text-lg font-semibold">
                                {firewallStats.InboundExists ? (firewallStats.InboundEnabled ? 'Activa' : 'Inactiva') : 'No existe'}
                            </span>
                        </div>
                    </div>
                    <div className="bg-white p-4 rounded-lg border shadow-sm">
                        <h3 className="text-sm font-medium text-gray-500">Regla Outbound</h3>
                        <div className="flex items-center mt-2">
                            <div className={`w-3 h-3 rounded-full mr-2 ${firewallStats.OutboundExists && firewallStats.OutboundEnabled ? 'bg-green-500' : 'bg-red-500'}`}></div>
                            <span className="text-lg font-semibold">
                                {firewallStats.OutboundExists ? (firewallStats.OutboundEnabled ? 'Activa' : 'Inactiva') : 'No existe'}
                            </span>
                        </div>
                    </div>
                    <div className="bg-white p-4 rounded-lg border shadow-sm">
                        <h3 className="text-sm font-medium text-gray-500">IPs Bloqueadas</h3>
                        <p className="text-2xl font-bold text-blue-600 mt-2">{blockedIPs.length}</p>
                    </div>
                    <div className="bg-white p-4 rounded-lg border shadow-sm">
                        <h3 className="text-sm font-medium text-gray-500">Seleccionadas</h3>
                        <p className="text-2xl font-bold text-orange-600 mt-2">{selectedIPs.size}</p>
                    </div>
                </div>
            )}

            {/* Controles */}
            <div className="flex flex-wrap gap-3 mb-6">
                <button
                    onClick={loadFirewallData}
                    className="flex items-center px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
                    disabled={loading}
                >
                    <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                    Actualizar
                </button>

                <button
                    onClick={selectAll}
                    className="flex items-center px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
                >
                    {selectedIPs.size === blockedIPs.length ? 'Deseleccionar Todo' : 'Seleccionar Todo'}
                </button>

                {selectedIPs.size > 0 && (
                    <button
                        onClick={removeSelectedIPs}
                        className="flex items-center px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-50"
                        disabled={!isAdmin || loading}
                    >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Eliminar Seleccionadas ({selectedIPs.size})
                    </button>
                )}
            </div>

            {/* Tabla de IPs */}
            <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gray-50 border-b">
                            <tr>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    <input
                                        type="checkbox"
                                        checked={selectedIPs.size === blockedIPs.length && blockedIPs.length > 0}
                                        onChange={selectAll}
                                        className="rounded border-gray-300"
                                    />
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Dirección IP
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    País
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Ciudad
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    ISP
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Nivel de Amenaza
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Acciones
                                </th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {blockedIPs.map((ip, index) => {
                                const geo = geoData[ip];
                                const threatLevel = getThreatLevel(ip);

                                return (
                                    <tr key={ip} className={`hover:bg-gray-50 ${selectedIPs.has(ip) ? 'bg-blue-50' : ''}`}>
                                        <td className="px-4 py-3">
                                            <input
                                                type="checkbox"
                                                checked={selectedIPs.has(ip)}
                                                onChange={() => toggleIPSelection(ip)}
                                                className="rounded border-gray-300"
                                            />
                                        </td>
                                        <td className="px-4 py-3 text-sm font-mono font-medium text-gray-900">
                                            {ip}
                                        </td>
                                        <td className="px-4 py-3 text-sm text-gray-500">
                                            <div className="flex items-center">
                                                <Globe className="h-4 w-4 mr-2 text-gray-400" />
                                                {geo?.country || 'Desconocido'}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-sm text-gray-500">
                                            {geo?.city || 'Desconocido'}
                                        </td>
                                        <td className="px-4 py-3 text-sm text-gray-500">
                                            {geo?.isp || 'Desconocido'}
                                        </td>
                                        <td className="px-4 py-3 text-sm">
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getThreatColor(threatLevel)}`}>
                                                {threatLevel === 'high' && <AlertTriangle className="h-3 w-3 mr-1" />}
                                                {threatLevel === 'high' ? 'Alto' : threatLevel === 'low' ? 'Bajo' : 'Desconocido'}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-sm">
                                            <button
                                                onClick={() => removeIndividualIP(ip)}
                                                className="text-red-600 hover:text-red-900 disabled:opacity-50"
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

                {blockedIPs.length === 0 && (
                    <div className="text-center py-8">
                        <Shield className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                        <p className="text-gray-500">No hay IPs bloqueadas en el firewall</p>
                    </div>
                )}
            </div>
        </div>
    );
};

// Exportar para uso global
window.FirewallDashboard = FirewallDashboard;

export default FirewallDashboard;
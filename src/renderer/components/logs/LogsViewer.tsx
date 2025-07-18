// src/renderer/components/logs/LogsViewer.tsx
import React, { useState } from 'react';
import { Search, Filter, Download, RefreshCw, Calendar, User, Terminal, Activity, Shield, Target } from 'lucide-react';
import { useLogs } from '@hooks/useLogs';
import { LogType } from '@/renderer/types';

const LogsViewer: React.FC<{ electronAPI: any }> = ({ electronAPI }) => {
    const [activeFilter, setActiveFilter] = useState<'all' | LogType | 'windows' | 'detected-ips'>('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [exactMatch, setExactMatch] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage] = useState(50);

    // Logs de la aplicación
    const { logs: appLogs, loading, searchLogs, refetch } = useLogs(
        activeFilter === 'all' || activeFilter === 'windows' || activeFilter === 'detected-ips' ? undefined : activeFilter
    );

    // Logs de script y Windows Events desde electronAPI
    const scriptLogs = electronAPI.scriptState.logs || [];
    const detectedIPs = electronAPI.scriptState.detectedIPs || [];

    const filterOptions = [
        { value: 'all', label: 'Todos los Logs', icon: <Activity className="w-4 h-4" /> },
        { value: 'user', label: 'Usuario', icon: <User className="w-4 h-4" /> },
        { value: 'script', label: 'Scripts', icon: <Terminal className="w-4 h-4" /> },
        { value: 'system', label: 'Sistema', icon: <Activity className="w-4 h-4" /> },
        { value: 'windows', label: 'Eventos Windows', icon: <Shield className="w-4 h-4" /> },
        { value: 'detected-ips', label: 'IPs Detectadas', icon: <Target className="w-4 h-4" /> }
    ];

    // Combinar todos los logs según el filtro
    const getCombinedLogs = () => {
        let combinedLogs = [];

        switch (activeFilter) {
            case 'all':
                // Convertir script logs a formato estándar
                const formattedScriptLogs = scriptLogs.map((log, index) => ({
                    id: `script-${index}`,
                    timestamp: new Date(),
                    level: 'info' as const,
                    source: 'script' as const,
                    message: log
                }));

                // Convertir IPs detectadas a logs
                const formattedIPLogs = detectedIPs.map((ip, index) => ({
                    id: `ip-${index}`,
                    timestamp: new Date(),
                    level: 'warning' as const,
                    source: 'system' as const,
                    message: `IP sospechosa detectada: ${ip}`
                }));

                combinedLogs = [
                    ...appLogs,
                    ...formattedScriptLogs,
                    ...formattedIPLogs
                ];
                break;

            case 'windows':
                combinedLogs = scriptLogs.map((log, index) => ({
                    id: `windows-${index}`,
                    timestamp: new Date(),
                    level: 'info' as const,
                    source: 'system' as const,
                    message: log
                }));
                break;

            case 'detected-ips':
                combinedLogs = detectedIPs.map((ip, index) => ({
                    id: `detected-${index}`,
                    timestamp: new Date(),
                    level: 'warning' as const,
                    source: 'system' as const,
                    message: `IP detectada: ${ip}`,
                    metadata: { ip, type: 'failed_login' }
                }));
                break;

            default:
                combinedLogs = appLogs.filter(log => log.source === activeFilter);
        }

        // Ordenar por timestamp descendente
        return combinedLogs.sort((a, b) =>
            new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        );
    };

    const logs = getCombinedLogs();

    const handleSearch = async () => {
        if (searchQuery.trim()) {
            if (activeFilter === 'windows' || activeFilter === 'detected-ips') {
                // Búsqueda local para logs de script
                setCurrentPage(1);
            } else {
                await searchLogs(searchQuery, exactMatch);
            }
        } else {
            refetch();
        }
    };

    const handleFilterChange = (filter: typeof activeFilter) => {
        setActiveFilter(filter);
        setCurrentPage(1);
    };

    // Filtrar por búsqueda si es necesario
    const filteredLogs = searchQuery && (activeFilter === 'windows' || activeFilter === 'detected-ips')
        ? logs.filter(log =>
            log.message.toLowerCase().includes(searchQuery.toLowerCase())
        )
        : logs;

    const totalPages = Math.ceil(filteredLogs.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const currentLogs = filteredLogs.slice(startIndex, endIndex);

    const formatDate = (date: Date) => {
        return new Date(date).toLocaleDateString('es-ES', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
    };

    const getLevelColor = (level: string) => {
        switch (level) {
            case 'error': return 'text-red-400 bg-red-500 bg-opacity-20';
            case 'warning': return 'text-yellow-400 bg-yellow-500 bg-opacity-20';
            case 'success': return 'text-green-400 bg-green-500 bg-opacity-20';
            default: return 'text-blue-400 bg-blue-500 bg-opacity-20';
        }
    };

    const getSourceColor = (source: string) => {
        switch (source) {
            case 'user': return 'text-green-400';
            case 'script': return 'text-orange-400';
            case 'system': return 'text-blue-400';
            default: return 'text-gray-400';
        }
    };

    return (
        <div className="space-y-6">
            {/* Header con estadísticas */}
            <div className="glass-effect rounded-2xl p-6">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
                    <div>
                        <h1 className="text-2xl font-bold text-white mb-2">Visor de Logs</h1>
                        <p className="text-white text-opacity-70">
                            Monitoreo y análisis de eventos del sistema
                        </p>

                        {/* Estadísticas rápidas */}
                        <div className="flex space-x-6 mt-4">
                            <div className="text-center">
                                <div className="text-xl font-bold text-green-400">{appLogs.length}</div>
                                <div className="text-xs text-white text-opacity-60">App Logs</div>
                            </div>
                            <div className="text-center">
                                <div className="text-xl font-bold text-orange-400">{scriptLogs.length}</div>
                                <div className="text-xs text-white text-opacity-60">Script Events</div>
                            </div>
                            <div className="text-center">
                                <div className="text-xl font-bold text-red-400">{detectedIPs.length}</div>
                                <div className="text-xs text-white text-opacity-60">IPs Detectadas</div>
                            </div>
                        </div>
                    </div>

                    <div className="flex space-x-3">
                        <button
                            onClick={() => {
                                refetch();
                                electronAPI.updateSystemStatus();
                            }}
                            disabled={loading}
                            className="flex items-center px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-all disabled:opacity-50"
                        >
                            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                            Actualizar
                        </button>

                        <button
                            onClick={() => {
                                // Exportar todos los logs combinados
                                const dataStr = JSON.stringify(logs, null, 2);
                                const dataBlob = new Blob([dataStr], { type: 'application/json' });
                                const url = URL.createObjectURL(dataBlob);
                                const link = document.createElement('a');
                                link.href = url;
                                link.download = `cyberguard-logs-${new Date().toISOString().split('T')[0]}.json`;
                                link.click();
                            }}
                            className="flex items-center px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-all"
                        >
                            <Download className="w-4 h-4 mr-2" />
                            Exportar
                        </button>
                    </div>
                </div>
            </div>

            {/* Filters and Search */}
            <div className="glass-effect rounded-2xl p-6">
                <div className="space-y-4">
                    {/* Filter Tabs */}
                    <div className="flex flex-wrap gap-2">
                        {filterOptions.map((option) => (
                            <button
                                key={option.value}
                                onClick={() => handleFilterChange(option.value as typeof activeFilter)}
                                className={`flex items-center px-4 py-2 rounded-lg font-medium transition-all ${activeFilter === option.value
                                    ? 'bg-white text-blue-900'
                                    : 'bg-white bg-opacity-20 text-white hover:bg-opacity-30'
                                    }`}
                            >
                                {option.icon}
                                <span className="ml-2">{option.label}</span>
                            </button>
                        ))}
                    </div>

                    {/* Search Bar */}
                    <div className="flex flex-col lg:flex-row space-y-4 lg:space-y-0 lg:space-x-4">
                        <div className="flex-1 relative">
                            <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-white text-opacity-50" />
                            <input
                                type="text"
                                placeholder="Buscar en los logs..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                                className="w-full pl-10 pr-4 py-2 bg-white bg-opacity-20 text-white placeholder-white placeholder-opacity-50 rounded-lg border border-white border-opacity-20 focus:border-opacity-50 focus:outline-none"
                            />
                        </div>

                        <button
                            onClick={handleSearch}
                            className="px-6 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-all"
                        >
                            Buscar
                        </button>
                    </div>

                    {/* Search Options */}
                    <div className="flex items-center justify-between">
                        <label className="flex items-center space-x-2 text-sm text-white text-opacity-70">
                            <input
                                type="checkbox"
                                checked={exactMatch}
                                onChange={(e) => setExactMatch(e.target.checked)}
                                className="rounded"
                            />
                            <span>Coincidencia exacta</span>
                        </label>

                        <div className="text-sm text-white text-opacity-60">
                            Mostrando {startIndex + 1}-{Math.min(endIndex, filteredLogs.length)} de {filteredLogs.length} resultados
                        </div>
                    </div>
                </div>
            </div>

            {/* Logs Table */}
            <div className="glass-effect rounded-2xl p-6">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-white border-opacity-20">
                                <th className="text-left py-3 px-4 text-white text-opacity-70 font-medium">
                                    <Calendar className="w-4 h-4 inline mr-2" />
                                    Fecha/Hora
                                </th>
                                <th className="text-left py-3 px-4 text-white text-opacity-70 font-medium">
                                    <Filter className="w-4 h-4 inline mr-2" />
                                    Nivel
                                </th>
                                <th className="text-left py-3 px-4 text-white text-opacity-70 font-medium">
                                    <User className="w-4 h-4 inline mr-2" />
                                    Origen
                                </th>
                                <th className="text-left py-3 px-4 text-white text-opacity-70 font-medium">
                                    Mensaje
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan={4} className="text-center py-8">
                                        <RefreshCw className="w-6 h-6 text-white text-opacity-50 animate-spin mx-auto mb-2" />
                                        <div className="text-white text-opacity-70">Cargando logs...</div>
                                    </td>
                                </tr>
                            ) : currentLogs.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="text-center py-8">
                                        <Activity className="w-12 h-12 text-white text-opacity-30 mx-auto mb-4" />
                                        <div className="text-white text-opacity-70">No se encontraron logs</div>
                                    </td>
                                </tr>
                            ) : (
                                currentLogs.map((log) => (
                                    <tr
                                        key={log.id}
                                        className="border-b border-white border-opacity-10 hover:bg-white hover:bg-opacity-5 transition-all"
                                    >
                                        <td className="py-3 px-4 text-white text-opacity-90 font-mono text-sm">
                                            {formatDate(log.timestamp)}
                                        </td>
                                        <td className="py-3 px-4">
                                            <span className={`px-2 py-1 rounded text-xs font-medium ${getLevelColor(log.level)}`}>
                                                {log.level.toUpperCase()}
                                            </span>
                                        </td>
                                        <td className="py-3 px-4">
                                            <span className={`text-sm font-medium ${getSourceColor(log.source)}`}>
                                                {log.source.charAt(0).toUpperCase() + log.source.slice(1)}
                                            </span>
                                        </td>
                                        <td className="py-3 px-4 text-white text-opacity-90 max-w-md">
                                            <div className="truncate" title={log.message}>
                                                {log.message}
                                            </div>
                                            {/* Mostrar IP si está disponible */}
                                            {log.metadata?.ip && (
                                                <div className="text-xs text-orange-400 mt-1">
                                                    IP: {log.metadata.ip}
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="flex items-center justify-between mt-6 pt-4 border-t border-white border-opacity-20">
                        <button
                            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                            disabled={currentPage === 1}
                            className="flex items-center px-4 py-2 bg-white bg-opacity-20 text-white rounded-lg hover:bg-opacity-30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            ← Anterior
                        </button>

                        <div className="flex items-center space-x-2">
                            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                const pageNumber = i + 1;
                                return (
                                    <button
                                        key={pageNumber}
                                        onClick={() => setCurrentPage(pageNumber)}
                                        className={`px-3 py-1 rounded ${currentPage === pageNumber
                                            ? 'bg-white text-blue-900'
                                            : 'bg-white bg-opacity-20 text-white hover:bg-opacity-30'
                                            } transition-all`}
                                    >
                                        {pageNumber}
                                    </button>
                                );
                            })}
                            {totalPages > 5 && (
                                <>
                                    <span className="text-white text-opacity-50">...</span>
                                    <button
                                        onClick={() => setCurrentPage(totalPages)}
                                        className={`px-3 py-1 rounded ${currentPage === totalPages
                                            ? 'bg-white text-blue-909'
                                            : 'bg-white bg-opacity-20 text-white hover:bg-opacity-30'
                                            } transition-all`}
                                    >
                                        {totalPages}
                                    </button>
                                </>
                            )}
                        </div>

                        <button
                            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                            disabled={currentPage === totalPages}
                            className="flex items-center px-4 py-2 bg-white bg-opacity-20 text-white rounded-lg hover:bg-opacity-30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Siguiente →
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default LogsViewer;
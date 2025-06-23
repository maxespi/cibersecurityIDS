// src/renderer/components/shared/LogsComponent.tsx
import React from 'react';
import { Terminal, User, Activity, RefreshCw, Search, AlertCircle } from 'lucide-react';
import { LogEntry, LogType } from '@types/index';
import { useLogs } from '@hooks/useLogs';

interface LogsComponentProps {
    title: string;
    logType?: LogType;
    height?: string;
    showControls?: boolean;
    showSearch?: boolean;
    limit?: number;
    className?: string;
}

const LogIcon: React.FC<{ type?: LogType }> = ({ type }) => {
    switch (type) {
        case 'user':
            return <User className="w-5 h-5 text-green-400" />;
        case 'script':
            return <Terminal className="w-5 h-5 text-orange-400" />;
        case 'system':
            return <Activity className="w-5 h-5 text-blue-400" />;
        default:
            return <Activity className="w-5 h-5 text-purple-400" />;
    }
};

const LogLevel: React.FC<{ level: LogEntry['level'] }> = ({ level }) => {
    const getColor = () => {
        switch (level) {
            case 'error': return 'text-red-400 bg-red-500 bg-opacity-20';
            case 'warning': return 'text-yellow-400 bg-yellow-500 bg-opacity-20';
            case 'success': return 'text-green-400 bg-green-500 bg-opacity-20';
            default: return 'text-blue-400 bg-blue-500 bg-opacity-20';
        }
    };

    return (
        <span className={`text-xs font-medium px-2 py-1 rounded ${getColor()}`}>
            {level.toUpperCase()}
        </span>
    );
};

const LogEntryComponent: React.FC<{ log: LogEntry }> = ({ log }) => {
    const formatTime = (timestamp: Date) => {
        return new Date(timestamp).toLocaleTimeString('es-ES', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
    };

    return (
        <div className="flex items-start space-x-3 py-2 border-b border-white border-opacity-10 last:border-b-0">
            <span className="text-xs text-white text-opacity-50 mt-1 font-mono min-w-[60px]">
                {formatTime(log.timestamp)}
            </span>
            <LogLevel level={log.level} />
            <span className="flex-1 text-sm text-white text-opacity-90 break-words">
                {log.message}
            </span>
        </div>
    );
};

const EmptyState: React.FC<{ logType?: LogType; loading: boolean; error?: string | null }> = ({
    logType,
    loading,
    error
}) => {
    if (loading) {
        return (
            <div className="flex items-center justify-center h-full">
                <RefreshCw className="w-6 h-6 text-white text-opacity-50 animate-spin" />
                <span className="ml-2 text-white text-opacity-70">Cargando logs...</span>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex items-center justify-center h-full text-red-400">
                <AlertCircle className="w-6 h-6 mr-2" />
                <span>Error: {error}</span>
            </div>
        );
    }

    return (
        <div className="flex flex-col items-center justify-center h-full text-white text-opacity-50">
            <LogIcon type={logType} />
            <p className="mt-2 text-center">
                {logType ? `No hay logs de ${logType}` : 'No hay logs disponibles'}
            </p>
        </div>
    );
};

const LogsComponent: React.FC<LogsComponentProps> = ({
    title,
    logType,
    height = 'h-64',
    showControls = false,
    showSearch = false,
    limit,
    className = ''
}) => {
    const { logs, loading, error, refetch, searchLogs } = useLogs(logType, limit);
    const [searchQuery, setSearchQuery] = React.useState('');
    const [exactMatch, setExactMatch] = React.useState(false);
    const [isSearching, setIsSearching] = React.useState(false);

    const handleSearch = async () => {
        if (searchQuery.trim()) {
            setIsSearching(true);
            try {
                await searchLogs(searchQuery, exactMatch);
            } finally {
                setIsSearching(false);
            }
        } else {
            refetch();
        }
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            handleSearch();
        }
    };

    const handleClearSearch = () => {
        setSearchQuery('');
        refetch();
    };

    return (
        <div className={`glass-effect rounded-2xl p-6 ${className}`}>
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-semibold text-white flex items-center">
                    <LogIcon type={logType} />
                    <span className="ml-3">{title}</span>
                    {logs.length > 0 && (
                        <span className="ml-2 text-sm text-white text-opacity-60 font-normal">
                            ({logs.length})
                        </span>
                    )}
                </h3>

                {showControls && (
                    <button
                        onClick={refetch}
                        disabled={loading}
                        className="p-2 rounded-lg bg-white bg-opacity-20 text-white hover:bg-opacity-30 transition-all disabled:opacity-50"
                        title="Actualizar logs"
                    >
                        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                )}
            </div>

            {/* Search */}
            {showSearch && (
                <div className="mb-4 space-y-2">
                    <div className="flex space-x-2">
                        <div className="flex-1 relative">
                            <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-white text-opacity-50" />
                            <input
                                type="text"
                                placeholder="Buscar en los logs..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                onKeyPress={handleKeyPress}
                                className="w-full pl-10 pr-10 py-2 bg-white bg-opacity-20 text-white placeholder-white placeholder-opacity-50 rounded-lg border border-white border-opacity-20 focus:border-opacity-50 focus:outline-none transition-all"
                            />
                            {searchQuery && (
                                <button
                                    onClick={handleClearSearch}
                                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-white text-opacity-50 hover:text-opacity-100 transition-all"
                                    title="Limpiar búsqueda"
                                >
                                    ×
                                </button>
                            )}
                        </div>
                        <button
                            onClick={handleSearch}
                            disabled={isSearching}
                            className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors disabled:opacity-50"
                        >
                            {isSearching ? (
                                <RefreshCw className="w-4 h-4 animate-spin" />
                            ) : (
                                'Buscar'
                            )}
                        </button>
                    </div>

                    <div className="flex items-center justify-between">
                        <label className="flex items-center space-x-2 text-sm text-white text-opacity-70">
                            <input
                                type="checkbox"
                                checked={exactMatch}
                                onChange={(e) => setExactMatch(e.target.checked)}
                                className="rounded border-white border-opacity-30 bg-white bg-opacity-20 text-blue-500 focus:ring-blue-500 focus:ring-opacity-50"
                            />
                            <span>Coincidencia exacta</span>
                        </label>

                        <p className="text-sm text-white text-opacity-60">
                            {logs.length > 0 ? `${logs.length} resultado${logs.length !== 1 ? 's' : ''}` : 'Sin resultados'}
                        </p>
                    </div>
                </div>
            )}

            {/* Logs Container */}
            <div className={`bg-white bg-opacity-10 rounded-lg p-4 ${height} overflow-y-auto custom-scrollbar`}>
                {logs.length === 0 ? (
                    <EmptyState logType={logType} loading={loading} error={error} />
                ) : (
                    <div className="space-y-1">
                        {logs.map((log) => (
                            <LogEntryComponent key={log.id} log={log} />
                        ))}
                    </div>
                )}
            </div>

            {/*     <style jsx>{`
        .glass-effect {
          background: rgba(255, 255, 255, 0.1);
          backdrop-filter: blur(10px);
          border: 1px solid rgba(255, 255, 255, 0.2);
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

        .custom-scrollbar {
          scrollbar-width: thin;
          scrollbar-color: rgba(255, 255, 255, 0.3) rgba(255, 255, 255, 0.1);
        }

        .custom-scrollbar > div > div:hover {
          background-color: rgba(255, 255, 255, 0.05);
          border-radius: 4px;
          transition: background-color 0.2s ease;
        }
      `}</style> */}
        </div>
    );
};

export default LogsComponent;
import React, { useState } from 'react';
import { Plus, Trash2, Shield, Clock, AlertTriangle, RefreshCw } from 'lucide-react';
import { useWhitelist } from '../../hooks/useWhitelist';

const WhitelistManager: React.FC = () => {
    const { whitelist, loading, error, addToWhitelist, removeFromWhitelist, loadWhitelist } = useWhitelist();
    const [newIP, setNewIP] = useState('');
    const [description, setDescription] = useState('');
    const [permanent, setPermanent] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        e.stopPropagation(); // ✅ Prevenir propagación de eventos
        
        console.log('🔧 [DEBUG] Formulario submit iniciado'); // DEBUG
        
        if (!newIP.trim()) {
            console.log('🔧 [DEBUG] IP vacía, retornando');
            return;
        }

        setIsSubmitting(true);
        console.log('🔧 [DEBUG] Agregando IP:', newIP); // DEBUG
        
        try {
            const result = await addToWhitelist({
                ip: newIP.trim(),
                description: description.trim() || undefined,
                permanent,
                expiresAt: permanent ? undefined : new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
            });

            console.log('🔧 [DEBUG] Resultado:', result); // DEBUG

            if (result.success) {
                console.log('🔧 [DEBUG] IP agregada exitosamente, limpiando formulario');
                setNewIP('');
                setDescription('');
                // ✅ NO NAVEGAR - mantener en whitelist
                console.log('🔧 [DEBUG] Formulario limpiado, permaneciendo en whitelist');
            } else {
                console.error('🔧 [DEBUG] Error:', result.error);
            }
        } catch (error) {
            console.error('🔧 [DEBUG] Excepción:', error);
        } finally {
            setIsSubmitting(false);
            console.log('🔧 [DEBUG] Submit completado');
        }
    };

    const handleRemove = async (ipId: number) => {
        console.log('🔧 [DEBUG] Removiendo IP:', ipId);
        if (confirm('¿Estás seguro de que quieres eliminar esta IP de la whitelist?')) {
            const result = await removeFromWhitelist(ipId);
            console.log('🔧 [DEBUG] Resultado remove:', result);
        }
    };

    console.log('🔧 [DEBUG] WhitelistManager render, whitelist length:', whitelist.length);

    return (
        <div className="space-y-6">
            {/* Header con estadísticas */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="glass-effect rounded-xl p-6 text-center">
                    <div className="text-3xl font-bold text-green-400">{whitelist.length}</div>
                    <div className="text-white text-opacity-70">IPs en Whitelist</div>
                </div>
                <div className="glass-effect rounded-xl p-6 text-center">
                    <div className="text-3xl font-bold text-blue-400">
                        {whitelist.filter(entry => entry.permanent).length}
                    </div>
                    <div className="text-white text-opacity-70">Permanentes</div>
                </div>
                <div className="glass-effect rounded-xl p-6 text-center">
                    <div className="text-3xl font-bold text-yellow-400">
                        {whitelist.filter(entry => !entry.permanent).length}
                    </div>
                    <div className="text-white text-opacity-70">Temporales</div>
                </div>
            </div>

            {/* Formulario */}
            <div className="glass-effect rounded-2xl p-6">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl font-semibold text-white flex items-center">
                        <Shield className="w-5 h-5 mr-3 text-green-400" />
                        Gestión de Lista Blanca
                    </h3>
                    <button
                        type="button" // ✅ Especificar tipo
                        onClick={loadWhitelist}
                        disabled={loading}
                        className="p-2 rounded-lg bg-white bg-opacity-20 text-white hover:bg-opacity-30 transition-all disabled:opacity-50"
                        title="Actualizar lista"
                    >
                        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                </div>

                {error && (
                    <div className="mb-4 p-4 bg-red-500 bg-opacity-20 border border-red-500 border-opacity-30 rounded-lg text-red-400 flex items-center">
                        <AlertTriangle className="w-5 h-5 mr-2" />
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4 mb-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <input
                            type="text"
                            placeholder="Dirección IP (ej. 192.168.1.100)"
                            value={newIP}
                            onChange={(e) => setNewIP(e.target.value)}
                            required
                            className="px-3 py-2 bg-white bg-opacity-20 text-white placeholder-white placeholder-opacity-50 rounded-lg border border-white border-opacity-20 focus:border-opacity-50 focus:outline-none"
                        />
                        <input
                            type="text"
                            placeholder="Descripción (opcional)"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            className="px-3 py-2 bg-white bg-opacity-20 text-white placeholder-white placeholder-opacity-50 rounded-lg border border-white border-opacity-20 focus:border-opacity-50 focus:outline-none"
                        />
                    </div>

                    <div className="flex items-center justify-between">
                        <label className="flex items-center space-x-2 text-sm text-white">
                            <input
                                type="checkbox"
                                checked={permanent}
                                onChange={(e) => setPermanent(e.target.checked)}
                                className="rounded"
                            />
                            <span>Lista blanca permanente</span>
                        </label>

                        <button
                            type="submit"
                            disabled={isSubmitting || loading || !newIP.trim()}
                            className="flex items-center px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-all disabled:opacity-50"
                        >
                            {isSubmitting ? (
                                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                            ) : (
                                <Plus className="w-4 h-4 mr-2" />
                            )}
                            {isSubmitting ? 'Agregando...' : 'Agregar IP'}
                        </button>
                    </div>
                </form>

                {/* Tabla */}
                <div className="overflow-x-auto">
                    {loading && whitelist.length === 0 ? (
                        <div className="flex items-center justify-center py-8">
                            <RefreshCw className="w-6 h-6 animate-spin text-white text-opacity-50 mr-2" />
                            <span className="text-white text-opacity-70">Cargando whitelist...</span>
                        </div>
                    ) : whitelist.length === 0 ? (
                        <div className="text-center py-8 text-white text-opacity-70">
                            <Shield className="w-12 h-12 mx-auto mb-4 text-white text-opacity-30" />
                            <p>No hay IPs en la whitelist</p>
                            <p className="text-sm">Agrega una IP para comenzar</p>
                        </div>
                    ) : (
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-white border-opacity-20">
                                    <th className="text-left py-3 px-4 text-white text-opacity-70 font-medium">IP</th>
                                    <th className="text-left py-3 px-4 text-white text-opacity-70 font-medium">Descripción</th>
                                    <th className="text-left py-3 px-4 text-white text-opacity-70 font-medium">Tipo</th>
                                    <th className="text-left py-3 px-4 text-white text-opacity-70 font-medium">Agregada</th>
                                    <th className="text-right py-3 px-4 text-white text-opacity-70 font-medium">Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {whitelist.map((entry) => (
                                    <tr key={entry.id} className="border-b border-white border-opacity-10 hover:bg-white hover:bg-opacity-5">
                                        <td className="py-3 px-4 text-white font-mono">{entry.ip}</td>
                                        <td className="py-3 px-4 text-white text-opacity-90">{entry.description || '-'}</td>
                                        <td className="py-3 px-4">
                                            <span className={`px-2 py-1 rounded text-xs font-medium ${entry.permanent
                                                    ? 'bg-green-500 bg-opacity-20 text-green-400'
                                                    : 'bg-yellow-500 bg-opacity-20 text-yellow-400'
                                                }`}>
                                                {entry.permanent ? (
                                                    <>
                                                        <Shield className="w-3 h-3 inline mr-1" />
                                                        Permanente
                                                    </>
                                                ) : (
                                                    <>
                                                        <Clock className="w-3 h-3 inline mr-1" />
                                                        Temporal
                                                    </>
                                                )}
                                            </span>
                                        </td>
                                        <td className="py-3 px-4 text-white text-opacity-70 text-sm">
                                            {new Date(entry.createdAt).toLocaleDateString('es-ES')}
                                        </td>
                                        <td className="py-3 px-4 text-right">
                                            <button
                                                type="button" // ✅ Especificar tipo
                                                onClick={() => handleRemove(entry.id)}
                                                disabled={loading}
                                                className="text-red-400 hover:text-red-300 transition-colors disabled:opacity-50"
                                                title="Eliminar de whitelist"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
        </div>
    );
};

export default WhitelistManager;
import { useState, useEffect, useCallback, useRef } from "react";

interface WhitelistEntry {
  id: number;
  ip: string;
  description?: string;
  addedBy?: string;
  permanent: boolean;
  createdAt: string;
  expiresAt?: string | null;
}

export const useWhitelist = () => {
  const [whitelist, setWhitelist] = useState<WhitelistEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isInitialized = useRef(false);

  const loadWhitelist = useCallback(async () => {
    try {
      console.log("🔧 [WHITELIST] Iniciando carga...");
      setLoading(true);
      setError(null);

      const result = await window.electronAPI.getWhitelistIPs();
      console.log(
        "🔧 [WHITELIST] Resultado carga:",
        result?.success,
        "entries:",
        result?.data?.length
      );

      if (result.success) {
        setWhitelist(result.data);
        console.log("🔧 [WHITELIST] Estado actualizado correctamente");
      } else {
        setError(result.error);
        console.error("🔧 [WHITELIST] Error en carga:", result.error);
      }
    } catch (err) {
      const errorMsg = `Error loading whitelist: ${err}`;
      setError(errorMsg);
      console.error("🔧 [WHITELIST] Excepción en carga:", err);
    } finally {
      setLoading(false);
      console.log("🔧 [WHITELIST] Carga finalizada");
    }
  }, []);

  const addToWhitelist = useCallback(
    async (data: {
      ip: string;
      description?: string;
      permanent: boolean;
      expiresAt?: string;
    }) => {
      // ✅ Guard para evitar operaciones simultáneas
      if (loading) return { success: false, error: "Operación en progreso" };

      try {
        console.log("🔧 [DEBUG] addToWhitelist iniciado con:", data);
        setLoading(true);
        setError(null);

        const result = await window.electronAPI.addWhitelistIP(data);
        console.log("🔧 [DEBUG] Resultado addWhitelistIP:", result);

        if (result.success) {
          // ✅ Actualizar estado local inmediatamente sin recargar
          const newEntry: WhitelistEntry = {
            id: result.data.id,
            ip: result.data.ip,
            description: result.data.description,
            addedBy: result.data.addedBy,
            permanent: result.data.permanent,
            createdAt: result.data.createdAt,
            expiresAt: result.data.expiresAt,
          };

          setWhitelist((prevWhitelist) => {
            const exists = prevWhitelist.some(
              (entry) => entry.ip === newEntry.ip
            );
            if (exists) return prevWhitelist;
            return [newEntry, ...prevWhitelist];
          });

          return { success: true, data: newEntry };
        } else {
          setError(result.error);
          console.error("🔧 [DEBUG] Error en addWhitelistIP:", result.error);
          return { success: false, error: result.error };
        }
      } catch (err) {
        const errorMsg = `Error adding to whitelist: ${err}`;
        setError(errorMsg);
        console.error("🔧 [DEBUG] Excepción en addToWhitelist:", err);
        return { success: false, error: errorMsg };
      } finally {
        setLoading(false);
        console.log("🔧 [DEBUG] addToWhitelist completado");
      }
    },
    []
  ); // ✅ Array vacío para máxima estabilidad

  const removeFromWhitelist = useCallback(async (ipId: number) => {
    try {
      console.log("🔧 [DEBUG] removeFromWhitelist iniciado:", ipId);
      setLoading(true);
      setError(null);

      const result = await window.electronAPI.removeWhitelistIP(ipId);
      console.log("🔧 [DEBUG] Resultado removeWhitelistIP:", result);

      if (result.success) {
        // ✅ Actualizar estado local inmediatamente
        setWhitelist((prev) => prev.filter((entry) => entry.id !== ipId));
        console.log("🔧 [DEBUG] IP removida del estado local");
        return { success: true };
      } else {
        setError(result.error);
        console.error("🔧 [DEBUG] Error en removeWhitelistIP:", result.error);
        return { success: false, error: result.error };
      }
    } catch (err) {
      const errorMsg = `Error removing from whitelist: ${err}`;
      setError(errorMsg);
      console.error("🔧 [DEBUG] Excepción en removeFromWhitelist:", err);
      return { success: false, error: errorMsg };
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isInitialized.current) {
      isInitialized.current = true;
      loadWhitelist();
    }
  }, []);

  return {
    whitelist,
    loading,
    error,
    setError,
    loadWhitelist,
    addToWhitelist,
    removeFromWhitelist,
  };
};

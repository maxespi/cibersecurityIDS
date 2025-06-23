// src/renderer/hooks/useLogs.ts
import { useState, useEffect, useCallback } from "react";
import { LogEntry, LogType } from "@types/index";

export const useLogs = (logType?: LogType, limit?: number) => {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLogs = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      let result;
      if (logType) {
        result = await window.electronAPI.getLogs(logType);
      } else {
        result = await window.electronAPI.getRecentLogs(limit);
      }

      if (result.success) {
        setLogs(result.data);
      } else {
        setError(result.error || "Error fetching logs");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [logType, limit]);

  const addLog = useCallback((newLog: LogEntry) => {
    setLogs((prev) => [newLog, ...prev.slice(0, 99)]); // Mantener solo los últimos 100
  }, []);

  const clearLogs = useCallback(() => {
    setLogs([]);
  }, []);

  const searchLogs = useCallback(
    async (query: string, exactMatch: boolean = false) => {
      try {
        setLoading(true);
        const result = await window.electronAPI.searchLogs(query, exactMatch);

        if (result.success) {
          setLogs(result.data);
        } else {
          setError(result.error || "Error searching logs");
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Search error");
      } finally {
        setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    fetchLogs();

    // Suscribirse a actualizaciones en tiempo real
    const unsubscribe = window.electronAPI.onLogUpdate((newLog: LogEntry) => {
      // Solo agregar si coincide con el tipo de log o si no hay filtro
      if (!logType || newLog.source === logType) {
        addLog(newLog);
      }
    });

    return unsubscribe;
  }, [fetchLogs, logType, addLog]);

  return {
    logs,
    loading,
    error,
    refetch: fetchLogs,
    addLog,
    clearLogs,
    searchLogs,
  };
};

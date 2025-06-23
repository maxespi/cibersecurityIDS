import { useState, useEffect, useCallback } from "react";
import { LogEntry } from "@types/index";

export interface ScriptState {
  isRunning: boolean;
  intervalId: NodeJS.Timeout | null;
  logs: string[];
}

export const useElectronAPI = () => {
  const [scriptState, setScriptState] = useState<ScriptState>({
    isRunning: false,
    intervalId: null,
    logs: [],
  });

  const [systemStatus, setSystemStatus] = useState({
    firewallEnabled: false,
    loggingActive: false,
    lastUpdate: new Date(),
  });

  // ============ SCRIPT FUNCTIONS ============
  const executeSingleScan = useCallback(async () => {
    try {
      addLogEntry("Iniciando escaneo único...");
      const result = await window.electronAPI.runScript("scanForIpIn4625.ps1");

      if (result.success) {
        addLogEntry("✅ Escaneo completado exitosamente");
        return result;
      } else {
        addLogEntry(`❌ Error en escaneo: ${result.error}`);
        throw new Error(result.error);
      }
    } catch (error) {
      addLogEntry(`❌ Error ejecutando escaneo: ${error}`);
      throw error;
    }
  }, []);

  const executeFirewallRules = useCallback(async () => {
    try {
      addLogEntry("Aplicando reglas de firewall...");
      const result = await window.electronAPI.runScript("addFirewallRules.ps1");

      if (result.success) {
        addLogEntry("✅ Reglas de firewall aplicadas");
        updateSystemStatus();
        return result;
      } else {
        addLogEntry(`❌ Error aplicando reglas: ${result.error}`);
        throw new Error(result.error);
      }
    } catch (error) {
      addLogEntry(`❌ Error en firewall: ${error}`);
      throw error;
    }
  }, []);

  const startScriptExecution = useCallback(
    (intervalSeconds: number) => {
      if (scriptState.isRunning) {
        addLogEntry("⚠️ El script ya está ejecutándose");
        return;
      }

      addLogEntry(
        `🚀 Iniciando ejecución automática cada ${intervalSeconds} segundos`
      );

      const intervalId = setInterval(async () => {
        try {
          await executeSingleScan();
          await executeFirewallRules();
        } catch (error) {
          addLogEntry(`❌ Error en ejecución automática: ${error}`);
        }
      }, intervalSeconds * 1000);

      setScriptState((prev) => ({
        ...prev,
        isRunning: true,
        intervalId,
      }));

      // Ejecutar inmediatamente la primera vez
      executeSingleScan().then(() => executeFirewallRules());
    },
    [scriptState.isRunning, executeSingleScan, executeFirewallRules]
  );

  const stopScriptExecution = useCallback(() => {
    if (!scriptState.isRunning) {
      addLogEntry("⚠️ No hay script ejecutándose");
      return;
    }

    if (scriptState.intervalId) {
      clearInterval(scriptState.intervalId);
    }

    setScriptState((prev) => ({
      ...prev,
      isRunning: false,
      intervalId: null,
    }));

    addLogEntry("⏹️ Ejecución automática detenida");
  }, [scriptState.isRunning, scriptState.intervalId]);

  // ============ LOG FUNCTIONS ============
  const addLogEntry = useCallback((message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    const logEntry = `[${timestamp}] ${message}`;

    setScriptState((prev) => ({
      ...prev,
      logs: [logEntry, ...prev.logs.slice(0, 99)], // Mantener solo 100 logs
    }));
  }, []);

  const clearLogs = useCallback(() => {
    setScriptState((prev) => ({
      ...prev,
      logs: [],
    }));
    addLogEntry("📝 Logs limpiados");
  }, []);

  // ============ NAVIGATION FUNCTIONS ============
  const navigateToScripts = useCallback(() => {
    window.electronAPI.navigateToScripts();
    addLogEntry("📂 Navegando a Scripts");
  }, []);

  const navigateToLogs = useCallback(() => {
    window.electronAPI.navigateToLogs();
    addLogEntry("📋 Navegando a Logs");
  }, []);

  const navigateToFirewall = useCallback(() => {
    window.electronAPI.navigateToFirewall();
    addLogEntry("🔥 Navegando a Firewall");
  }, []);

  // ============ SYSTEM STATUS ============
  const updateSystemStatus = useCallback(async () => {
    try {
      const firewallStats = await window.electronAPI.getFirewallStats();
      const adminCheck = await window.electronAPI.checkAdminPrivileges();

      setSystemStatus((prev) => ({
        ...prev,
        firewallEnabled: firewallStats.success
          ? firewallStats.data.InboundEnabled
          : false,
        lastUpdate: new Date(),
      }));
    } catch (error) {
      console.error("Error updating system status:", error);
    }
  }, []);

  // ============ LOAD CONTENT FUNCTIONS ============
  const loadLogContent = useCallback(() => {
    window.electronAPI.loadLogContent();
    addLogEntry("📄 Cargando contenido de logs...");
  }, []);

  const loadLogContent2 = useCallback(() => {
    window.electronAPI.loadLogContent2();
    addLogEntry("📄 Cargando contenido de logs secundarios...");
  }, []);

  // ============ EFFECTS ============
  useEffect(() => {
    // Configurar listeners para eventos de Electron
    const setupElectronListeners = () => {
      // Listener para datos de log
      if (window.electronAPI.onLogData) {
        window.electronAPI.onLogData((data) => {
          addLogEntry(`📊 ${data}`);
        });
      }

      // Listener para errores de log
      if (window.electronAPI.onLogError) {
        window.electronAPI.onLogError((error) => {
          addLogEntry(`❌ Error: ${error}`);
        });
      }

      // Listener para cierre de log
      if (window.electronAPI.onLogClose) {
        window.electronAPI.onLogClose((message) => {
          addLogEntry(`🔚 ${message}`);
        });
      }

      // Listener para contenido de log
      if (window.electronAPI.onLogContent) {
        window.electronAPI.onLogContent((content) => {
          addLogEntry("📋 Contenido de log actualizado");
        });
      }

      // Listener para app opened
      if (window.electronAPI.onAppOpened) {
        window.electronAPI.onAppOpened(() => {
          addLogEntry("🚀 CyberGuard IDS iniciado");
          updateSystemStatus();
        });
      }

      // Listener para user login
      if (window.electronAPI.onUserLoggedIn) {
        window.electronAPI.onUserLoggedIn((username) => {
          addLogEntry(`👤 Usuario conectado: ${username}`);
        });
      }
    };

    setupElectronListeners();
    updateSystemStatus();

    // Cleanup interval al desmontar
    return () => {
      if (scriptState.intervalId) {
        clearInterval(scriptState.intervalId);
      }
    };
  }, [updateSystemStatus, addLogEntry, scriptState.intervalId]);

  // Auto-refresh cada 30 segundos
  useEffect(() => {
    const refreshInterval = setInterval(() => {
      updateSystemStatus();
    }, 30000);

    return () => clearInterval(refreshInterval);
  }, [updateSystemStatus]);

  return {
    // Script state
    scriptState,
    systemStatus,

    // Script functions
    executeSingleScan,
    executeFirewallRules,
    startScriptExecution,
    stopScriptExecution,

    // Log functions
    addLogEntry,
    clearLogs,
    loadLogContent,
    loadLogContent2,

    // Navigation functions
    navigateToScripts,
    navigateToLogs,
    navigateToFirewall,

    // System functions
    updateSystemStatus,
  };
};

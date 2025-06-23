import { useState, useEffect, useCallback } from "react";
import { LogEntry } from "@types/index";

export interface ScriptState {
  isRunning: boolean;
  intervalId: NodeJS.Timeout | null;
  logs: string[];
  detectedIPs: string[];
  blockedIPs: string[];
  lastEventTimestamp: Date | null;
}

export const useElectronAPI = () => {
  const [scriptState, setScriptState] = useState<ScriptState>({
    isRunning: false,
    intervalId: null,
    logs: [],
    detectedIPs: [],
    blockedIPs: [],
    lastEventTimestamp: null,
  });

  const [systemStatus, setSystemStatus] = useState({
    firewallEnabled: false,
    loggingActive: false,
    lastUpdate: new Date(),
    whitelistIPs: [] as string[],
  });

  // ============ LOG ANALYSIS FUNCTIONS ============
  const analyzeFailedLogins = useCallback(async () => {
    try {
      addLogEntry("🔍 Analizando logs de intentos fallidos...");
      // Llamar a la API de Electron para obtener eventos de Windows
      const result = await window.electronAPI.analyzeWindowsEvents({
        eventId: 4625,
        maxEvents: 40000,
        lastTimestamp: scriptState.lastEventTimestamp,
      });

      if (result.success) {
        const { events, newIPs, timestamp } = result.data;

        if (newIPs.length > 0) {
          setScriptState((prev) => ({
            ...prev,
            detectedIPs: [...prev.detectedIPs, ...newIPs].filter(
              (ip, index, arr) => arr.indexOf(ip) === index
            ),
            lastEventTimestamp: timestamp
              ? new Date(timestamp)
              : prev.lastEventTimestamp,
          }));

          addLogEntry(`✅ Encontradas ${newIPs.length} nuevas IPs sospechosas`);
          addLogEntry(`📊 Total de eventos analizados: ${events.length}`);

          // Mostrar las nuevas IPs
          newIPs.forEach((ip) => {
            addLogEntry(`🎯 Nueva IP detectada: ${ip}`);
          });

          return { success: true, newIPs, events };
        } else {
          addLogEntry("ℹ️ No se encontraron nuevas IPs sospechosas");
          return { success: true, newIPs: [], events };
        }
      } else {
        addLogEntry(`❌ Error analizando logs: ${result.error}`);
        throw new Error(result.error);
      }
    } catch (error) {
      addLogEntry(`❌ Error en análisis: ${error}`);
      throw error;
    }
  }, [scriptState.lastEventTimestamp]);

  const updateFirewallRules = useCallback(
    async (ipsToBlock?: string[]) => {
      try {
        addLogEntry("🔥 Actualizando reglas de firewall...");

        const targetIPs = ipsToBlock || scriptState.detectedIPs;

        if (targetIPs.length === 0) {
          addLogEntry("⚠️ No hay IPs para bloquear");
          return { success: true, blocked: 0 };
        }

        // Filtrar IPs contra whitelist
        const filteredIPs = targetIPs.filter(
          (ip) => !systemStatus.whitelistIPs.includes(ip)
        );

        if (filteredIPs.length === 0) {
          addLogEntry("ℹ️ Todas las IPs están en la whitelist");
          return { success: true, blocked: 0 };
        }

        // Llamar a la API de Electron para actualizar firewall
        const result = await window.electronAPI.updateFirewallRules({
          ipsToBlock: filteredIPs,
          ruleName: "Bloquear IPs seleccionadas",
        });

        if (result.success) {
          const { newlyBlocked, totalBlocked } = result.data;

          setScriptState((prev) => ({
            ...prev,
            blockedIPs: [...prev.blockedIPs, ...newlyBlocked].filter(
              (ip, index, arr) => arr.indexOf(ip) === index
            ),
          }));

          addLogEntry(
            `✅ Firewall actualizado: ${newlyBlocked.length} nuevas IPs bloqueadas`
          );
          addLogEntry(`📊 Total de IPs bloqueadas: ${totalBlocked}`);

          // Mostrar las IPs bloqueadas
          newlyBlocked.forEach((ip) => {
            addLogEntry(`🚫 IP bloqueada: ${ip}`);
          });

          updateSystemStatus();
          return { success: true, blocked: newlyBlocked.length };
        } else {
          addLogEntry(`❌ Error actualizando firewall: ${result.error}`);
          throw new Error(result.error);
        }
      } catch (error) {
        addLogEntry(`❌ Error en firewall: ${error}`);
        throw error;
      }
    },
    [scriptState.detectedIPs, systemStatus.whitelistIPs]
  );

  // ============ SCRIPT EXECUTION FUNCTIONS ============
  const executeSingleScan = useCallback(async () => {
    try {
      addLogEntry("🚀 Iniciando escaneo único...");

      // Paso 1: Analizar logs
      const analysisResult = await analyzeFailedLogins();

      if (analysisResult.newIPs.length > 0) {
        addLogEntry(
          `🔍 Se encontraron ${analysisResult.newIPs.length} nuevas IPs`
        );
        return analysisResult;
      } else {
        addLogEntry("✅ Escaneo completado - Sin nuevas amenazas");
        return analysisResult;
      }
    } catch (error) {
      addLogEntry(`❌ Error en escaneo único: ${error}`);
      throw error;
    }
  }, [analyzeFailedLogins]);

  const executeFirewallUpdate = useCallback(async () => {
    try {
      addLogEntry("🔥 Ejecutando actualización de firewall...");

      const result = await updateFirewallRules();

      if (result.blocked > 0) {
        addLogEntry(
          `✅ Firewall actualizado: ${result.blocked} IPs bloqueadas`
        );
      } else {
        addLogEntry("ℹ️ Firewall ya actualizado - Sin cambios");
      }

      return result;
    } catch (error) {
      addLogEntry(`❌ Error actualizando firewall: ${error}`);
      throw error;
    }
  }, [updateFirewallRules]);

  const executeFullScanAndBlock = useCallback(async () => {
    try {
      addLogEntry("🎯 Iniciando escaneo completo con bloqueo automático...");

      // Paso 1: Analizar logs
      const analysisResult = await analyzeFailedLogins();

      // Paso 2: Si hay nuevas IPs, actualizar firewall
      if (analysisResult.newIPs.length > 0) {
        addLogEntry(
          `🔍 Nuevas amenazas detectadas: ${analysisResult.newIPs.length} IPs`
        );

        const firewallResult = await updateFirewallRules(analysisResult.newIPs);

        addLogEntry(
          `✅ Proceso completo: ${firewallResult.blocked} IPs bloqueadas`
        );
        return {
          analyzed: analysisResult.events.length,
          detected: analysisResult.newIPs.length,
          blocked: firewallResult.blocked,
        };
      } else {
        addLogEntry("✅ Escaneo completo - Sin nuevas amenazas detectadas");
        return {
          analyzed: analysisResult.events.length,
          detected: 0,
          blocked: 0,
        };
      }
    } catch (error) {
      addLogEntry(`❌ Error en escaneo completo: ${error}`);
      throw error;
    }
  }, [analyzeFailedLogins, updateFirewallRules]);

  const startScriptExecution = useCallback(
    (intervalSeconds: number, autoFirewall: boolean = true) => {
      if (scriptState.isRunning) {
        addLogEntry("⚠️ El script ya está ejecutándose");
        return;
      }

      addLogEntry(
        `🚀 Iniciando ejecución automática cada ${intervalSeconds} segundos`
      );
      addLogEntry(
        `🔥 Auto-firewall: ${autoFirewall ? "Activado" : "Desactivado"}`
      );

      const intervalId = setInterval(async () => {
        try {
          if (autoFirewall) {
            await executeFullScanAndBlock();
          } else {
            await executeSingleScan();
          }
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
      if (autoFirewall) {
        executeFullScanAndBlock();
      } else {
        executeSingleScan();
      }
    },
    [scriptState.isRunning, executeFullScanAndBlock, executeSingleScan]
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

  // ============ UTILITY FUNCTIONS ============
  const loadWhitelist = useCallback(async () => {
    try {
      const result = await window.electronAPI.getWhitelistIPs();
      if (result.success) {
        setSystemStatus((prev) => ({
          ...prev,
          whitelistIPs: result.data,
        }));
        addLogEntry(`📋 Whitelist cargada: ${result.data.length} IPs`);
      }
    } catch (error) {
      addLogEntry(`❌ Error cargando whitelist: ${error}`);
    }
  }, []);

  const clearDetectedIPs = useCallback(() => {
    setScriptState((prev) => ({
      ...prev,
      detectedIPs: [],
    }));
    addLogEntry("🗑️ Lista de IPs detectadas limpiada");
  }, []);

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

  // ============ EFFECTS ============
  useEffect(() => {
    // Inicialización
    updateSystemStatus();
    loadWhitelist();

    // Setup listeners
    const setupElectronListeners = () => {
      if (window.electronAPI.onLogData) {
        window.electronAPI.onLogData((data) => {
          addLogEntry(`📊 ${data}`);
        });
      }

      if (window.electronAPI.onLogError) {
        window.electronAPI.onLogError((error) => {
          addLogEntry(`❌ Error: ${error}`);
        });
      }

      if (window.electronAPI.onAppOpened) {
        window.electronAPI.onAppOpened(() => {
          addLogEntry("🚀 CyberGuard IDS iniciado");
          updateSystemStatus();
          loadWhitelist();
        });
      }

      if (window.electronAPI.onUserLoggedIn) {
        window.electronAPI.onUserLoggedIn((username) => {
          addLogEntry(`👤 Usuario conectado: ${username}`);
        });
      }
    };

    setupElectronListeners();

    // Cleanup
    return () => {
      if (scriptState.intervalId) {
        clearInterval(scriptState.intervalId);
      }
    };
  }, [updateSystemStatus, loadWhitelist, addLogEntry, scriptState.intervalId]);

  return {
    // State
    scriptState,
    systemStatus,

    // Analysis functions
    analyzeFailedLogins,
    updateFirewallRules,

    // Execution functions
    executeSingleScan,
    executeFirewallUpdate,
    executeFullScanAndBlock,
    startScriptExecution,
    stopScriptExecution,

    // Utility functions
    clearDetectedIPs,
    loadWhitelist,

    // Log functions
    addLogEntry,
    clearLogs,

    // System functions
    updateSystemStatus,
  };
};

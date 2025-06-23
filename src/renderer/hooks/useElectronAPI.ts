import { useState, useEffect, useCallback } from "react";

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

  useEffect(() => {
    // ❌ AQUÍ ESTÁ EL PROBLEMA - eventos que causan navegación
    console.log("🔧 [DEBUG] Configurando listeners de electronAPI...");

    // ✅ Configurar listeners SIN navegación automática
    const handleLogData = (data: string) => {
      console.log("🔧 [DEBUG] Log data recibido:", data);
      setScriptState((prev) => ({
        ...prev,
        logs: [...prev.logs.slice(-49), data], // Mantener últimos 50 logs
      }));
      // ❌ NO NAVEGAR AUTOMÁTICAMENTE
    };

    const handleLogError = (data: string) => {
      console.log("🔧 [DEBUG] Log error recibido:", data);
      setScriptState((prev) => ({
        ...prev,
        logs: [...prev.logs.slice(-49), `ERROR: ${data}`],
      }));
    };

    const handleLogClose = (message: string) => {
      console.log("🔧 [DEBUG] Log close recibido:", message);
      setScriptState((prev) => ({
        ...prev,
        isRunning: false,
        logs: [...prev.logs, `SCRIPT TERMINADO: ${message}`],
      }));
      // ❌ NO NAVEGAR AUTOMÁTICAMENTE
    };

    const handleUserLoggedIn = (username: string) => {
      console.log("🔧 [DEBUG] Usuario logueado:", username);
      // ❌ NO CAMBIAR VISTA AUTOMÁTICAMENTE
      // setActiveView('dashboard'); // ESTO CAUSABA EL PROBLEMA
    };

    // Registrar listeners
    if (window.electronAPI) {
      window.electronAPI.onLogData?.(handleLogData);
      window.electronAPI.onLogError?.(handleLogError);
      window.electronAPI.onLogClose?.(handleLogClose);
      window.electronAPI.onUserLoggedIn?.(handleUserLoggedIn);
    }

    // Cleanup
    return () => {
      console.log("🔧 [DEBUG] Limpiando listeners...");
      // Aquí iría la limpieza si los métodos devuelven unsubscribe functions
    };
  }, []); // ✅ Array vacío para evitar re-ejecutar

  // ============ FUNCIONES DE ANÁLISIS ============
  const analyzeFailedLogins = useCallback(async () => {
    try {
      console.log("🔧 [DEBUG] Analizando logins fallidos...");

      const result = await window.electronAPI.analyzeWindowsEvents({
        eventId: 4625,
        maxEvents: 100,
        lastTimestamp: scriptState.lastEventTimestamp,
      });

      if (result.success) {
        console.log("🔧 [DEBUG] Análisis completado:", result.data);

        setScriptState((prev) => ({
          ...prev,
          detectedIPs: result.data.newIPs || [],
          lastEventTimestamp: new Date(),
        }));

        return result.data;
      }

      return null;
    } catch (error) {
      console.error("🔧 [DEBUG] Error en análisis:", error);
      return null;
    }
  }, [scriptState.lastEventTimestamp]);

  const updateFirewallRules = useCallback(
    async (ipsToBlock?: string[]) => {
      try {
        console.log("🔧 [DEBUG] Actualizando reglas de firewall...");

        const ips = ipsToBlock || scriptState.detectedIPs;
        if (ips.length === 0) {
          console.log("🔧 [DEBUG] No hay IPs para bloquear");
          return null;
        }

        const result = await window.electronAPI.updateFirewallRules({
          ipsToBlock: ips,
          ruleName: "CyberGuard-AutoBlock",
        });

        if (result.success) {
          console.log("🔧 [DEBUG] Firewall actualizado:", result.data);

          setScriptState((prev) => ({
            ...prev,
            blockedIPs: [...prev.blockedIPs, ...result.data.newlyBlocked],
          }));

          return result.data;
        }

        return null;
      } catch (error) {
        console.error("🔧 [DEBUG] Error actualizando firewall:", error);
        return null;
      }
    },
    [scriptState.detectedIPs]
  );

  // ============ FUNCIONES DE CONTROL DE SCRIPTS ============
  const startScript = useCallback(async () => {
    try {
      console.log("🔧 [DEBUG] Iniciando script...");

      setScriptState((prev) => ({
        ...prev,
        isRunning: true,
        logs: [...prev.logs, "Iniciando monitoreo automático..."],
      }));

      // Ejecutar análisis inicial
      await analyzeFailedLogins();

      // NO configurar intervalo automático aquí para evitar problemas

      return { success: true };
    } catch (error) {
      console.error("🔧 [DEBUG] Error iniciando script:", error);
      setScriptState((prev) => ({
        ...prev,
        isRunning: false,
        logs: [...prev.logs, `Error: ${error}`],
      }));
      return { success: false, error: error };
    }
  }, [analyzeFailedLogins]);

  const stopScript = useCallback(() => {
    console.log("🔧 [DEBUG] Deteniendo script...");

    setScriptState((prev) => {
      if (prev.intervalId) {
        clearInterval(prev.intervalId);
      }

      return {
        ...prev,
        isRunning: false,
        intervalId: null,
        logs: [...prev.logs, "Script detenido por el usuario"],
      };
    });
  }, []);

  const runSingleScan = useCallback(async () => {
    try {
      console.log("🔧 [DEBUG] Ejecutando escaneo único...");

      setScriptState((prev) => ({
        ...prev,
        logs: [...prev.logs, "Iniciando escaneo único..."],
      }));

      const analysisResult = await analyzeFailedLogins();

      if (analysisResult && analysisResult.newIPs.length > 0) {
        const firewallResult = await updateFirewallRules(analysisResult.newIPs);

        setScriptState((prev) => ({
          ...prev,
          logs: [
            ...prev.logs,
            `Escaneo completado: ${analysisResult.newIPs.length} IPs detectadas`,
            `Firewall actualizado: ${
              firewallResult?.newlyBlocked?.length || 0
            } IPs bloqueadas`,
          ],
        }));
      } else {
        setScriptState((prev) => ({
          ...prev,
          logs: [
            ...prev.logs,
            "Escaneo completado: No se detectaron nuevas amenazas",
          ],
        }));
      }

      return { success: true };
    } catch (error) {
      console.error("🔧 [DEBUG] Error en escaneo único:", error);
      setScriptState((prev) => ({
        ...prev,
        logs: [...prev.logs, `Error en escaneo: ${error}`],
      }));
      return { success: false, error: error };
    }
  }, [analyzeFailedLogins, updateFirewallRules]);

  return {
    ...window.electronAPI,

    scriptState,
    systemStatus,
    // Funciones de control expuestas

    startScript,
    stopScript,
    runSingleScan,
    analyzeFailedLogins,
    updateFirewallRules,
  };
};

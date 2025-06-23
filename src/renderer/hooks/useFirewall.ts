// src/renderer/hooks/useFirewall.ts
import { useState, useEffect, useCallback } from "react";
import { BlockedIP, FirewallStats, GeoData } from "@types/index";

export const useFirewall = () => {
  const [blockedIPs, setBlockedIPs] = useState<BlockedIP[]>([]);
  const [firewallStats, setFirewallStats] = useState<FirewallStats | null>(
    null
  );
  const [geoData, setGeoData] = useState<Record<string, GeoData>>({});
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [selectedIPs, setSelectedIPs] = useState<Set<string>>(new Set());

  const loadFirewallData = useCallback(async () => {
    setLoading(true);
    try {
      // Cargar IPs bloqueadas
      const ipsResult = await window.electronAPI.getBlockedIPs();
      if (ipsResult.success) {
        setBlockedIPs(ipsResult.data.total);

        // Cargar datos geográficos (límite de 50 para no sobrecargar)
        const ipsToGeolocate = ipsResult.data.total.slice(0, 50);
        const geoPromises = ipsToGeolocate.map(async (ip) => {
          try {
            const geoResult = await window.electronAPI.getIPGeolocation(ip.ip);
            return {
              ip: ip.ip,
              data: geoResult.success ? geoResult.data : null,
            };
          } catch {
            return { ip: ip.ip, data: null };
          }
        });

        const geoResults = await Promise.all(geoPromises);
        const newGeoData: Record<string, GeoData> = {};
        geoResults.forEach(({ ip, data }) => {
          if (data) newGeoData[ip] = data;
        });
        setGeoData(newGeoData);
      }

      // Cargar estadísticas del firewall
      const statsResult = await window.electronAPI.getFirewallStats();
      if (statsResult.success) {
        setFirewallStats(statsResult.data);
      }
    } catch (error) {
      console.error("Error loading firewall data:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  const checkPermissions = useCallback(async () => {
    try {
      const result = await window.electronAPI.checkAdminPrivileges();
      setIsAdmin(result.success ? result.data.isAdmin : false);
    } catch (error) {
      console.error("Error checking permissions:", error);
      setIsAdmin(false);
    }
  }, []);

  const removeIP = useCallback(async (ip: string) => {
    try {
      const result = await window.electronAPI.removeIPFromFirewall(ip);
      if (result.success) {
        setBlockedIPs((prev) =>
          prev.filter((blockedIP) => blockedIP.ip !== ip)
        );
        setSelectedIPs((prev) => {
          const newSet = new Set(prev);
          newSet.delete(ip);
          return newSet;
        });
        return true;
      }
      return false;
    } catch (error) {
      console.error("Error removing IP:", error);
      return false;
    }
  }, []);

  const removeMultipleIPs = useCallback(async (ips: string[]) => {
    try {
      const result = await window.electronAPI.removeMultipleIPsFromFirewall(
        ips
      );
      if (result.success) {
        setBlockedIPs((prev) =>
          prev.filter((blockedIP) => !ips.includes(blockedIP.ip))
        );
        setSelectedIPs(new Set());
        return true;
      }
      return false;
    } catch (error) {
      console.error("Error removing multiple IPs:", error);
      return false;
    }
  }, []);

  const toggleIPSelection = useCallback((ip: string) => {
    setSelectedIPs((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(ip)) {
        newSet.delete(ip);
      } else {
        newSet.add(ip);
      }
      return newSet;
    });
  }, []);

  const selectAllIPs = useCallback(() => {
    setSelectedIPs(new Set(blockedIPs.map((ip) => ip.ip)));
  }, [blockedIPs]);

  const clearSelection = useCallback(() => {
    setSelectedIPs(new Set());
  }, []);

  const getThreatLevel = useCallback(
    (ip: string): "low" | "medium" | "high" => {
      const blockedIP = blockedIPs.find((blocked) => blocked.ip === ip);
      if (!blockedIP) return "low";

      if (blockedIP.attempts > 20) return "high";
      if (blockedIP.attempts > 10) return "medium";
      return "low";
    },
    [blockedIPs]
  );

  useEffect(() => {
    checkPermissions();
    loadFirewallData();

    // Suscribirse a actualizaciones del firewall
    const unsubscribe = window.electronAPI.onFirewallUpdate(() => {
      loadFirewallData();
    });

    return unsubscribe;
  }, [checkPermissions, loadFirewallData]);

  return {
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
    getThreatLevel,
  };
};

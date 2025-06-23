// src/renderer/types/index.ts

export interface APIResponse<T> {
  success: boolean;
  data: T;
  error?: string;
}

export interface BlockedIP {
  ip: string;
  timestamp: Date;
  attempts: number;
  country?: string;
  isp?: string;
  threatLevel: "low" | "medium" | "high";
  blocked_at?: string;
}

export interface FirewallStats {
  InboundExists: boolean;
  InboundEnabled: boolean;
  OutboundExists: boolean;
  OutboundEnabled: boolean;
  totalBlocked: number;
}

export interface LogEntry {
  id: string;
  timestamp: Date;
  level: "info" | "warning" | "error" | "success";
  message: string;
  source: "user" | "script" | "system";
  metadata?: Record<string, any>;
}

export interface GeoData {
  country?: string;
  region?: string;
  city?: string;
  isp?: string;
  org?: string;
  timezone?: string;
}

export interface ScriptConfig {
  interval: number;
  enabled: boolean;
  runOnce: boolean;
  autoFirewall: boolean;
}

export type ActiveView =
  | "dashboard"
  | "scripts"
  | "logs"
  | "firewall"
  | "whitelist";
export type LogType = "user" | "script" | "system";

// Electron API Types
export interface ElectronAPI {
  // Authentication
  login(
    username: string,
    password: string
  ): Promise<APIResponse<{ token: string }>>;

  // Firewall
  getBlockedIPs(): Promise<APIResponse<{ total: BlockedIP[] }>>;
  getFirewallStats(): Promise<APIResponse<FirewallStats>>;
  removeIPFromFirewall(ip: string): Promise<APIResponse<void>>;
  removeMultipleIPsFromFirewall(ips: string[]): Promise<APIResponse<void>>;
  checkAdminPrivileges(): Promise<APIResponse<{ isAdmin: boolean }>>;
  getIPGeolocation(ip: string): Promise<APIResponse<GeoData>>;

  // Scripts
  runScript: (scriptName: string) => Promise<APIResponse<any>>;
  startScriptExecution: (scriptName: string) => Promise<APIResponse<any>>; // ✅ AGREGAR
  getScriptStatus: () => Promise<
    APIResponse<{ isRunning: boolean; lastRun: string; interval: number }>
  >;
  stopScript?: () => Promise<APIResponse<void>>;

  // Logs
  getLogs?(type: LogType): Promise<APIResponse<LogEntry[]>>;
  getRecentLogs?(limit?: number): Promise<APIResponse<LogEntry[]>>;
  searchLogs?(
    query: string,
    exactMatch?: boolean
  ): Promise<APIResponse<LogEntry[]>>;

  // Whitelist
  getWhitelistIPs(): Promise<APIResponse<any[]>>;
  addWhitelistIP(data: any): Promise<APIResponse<any>>;
  removeWhitelistIP(ipId: number): Promise<APIResponse<void>>;

  // Windows Event Analysis
  analyzeWindowsEvents(options: any): Promise<APIResponse<any>>;
  updateFirewallRules(options: any): Promise<APIResponse<any>>;

  // Events con cleanup functions
  onAppOpened?(callback: () => void): (() => void) | void;
  onUserLoggedIn?(callback: (username: string) => void): (() => void) | void;
  onLogUpdate?(callback: (log: LogEntry) => void): (() => void) | void;
  onScriptOutput?(callback: (output: string) => void): (() => void) | void;
  onFirewallUpdate?(callback: () => void): (() => void) | void;

  // Script events
  onLogData?(callback: (data: string) => void): (() => void) | void;
  onLogError?(callback: (data: string) => void): (() => void) | void;
  onLogClose?(callback: (message: string) => void): (() => void) | void;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}

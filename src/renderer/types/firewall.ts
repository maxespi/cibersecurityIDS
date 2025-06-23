// types/firewall.ts
export interface BlockedIP {
  ip: string;
  timestamp: Date;
  attempts: number;
  country?: string;
  isp?: string;
  threatLevel: "low" | "medium" | "high";
}

export interface FirewallStats {
  InboundExists: boolean;
  InboundEnabled: boolean;
  OutboundExists: boolean;
  OutboundEnabled: boolean;
  totalBlocked: number;
}

// types/logs.ts
export interface LogEntry {
  id: string;
  timestamp: Date;
  level: "info" | "warning" | "error";
  message: string;
  source: "user" | "script" | "system";
  metadata?: Record<string, any>;
}

// types/electron.d.ts
export interface ElectronAPI {
  // Firewall
  getBlockedIPs(): Promise<APIResponse<{ total: BlockedIP[] }>>;
  removeIPFromFirewall(ip: string): Promise<APIResponse<void>>;

  // Logs
  getLogs(type: string): Promise<APIResponse<LogEntry[]>>;
  onLogUpdate(type: string, callback: (log: LogEntry) => void): () => void;

  // Navigation
  navigateToScripts(): Promise<void>;
  navigateToLogs(): Promise<void>;
  navigateToFirewall(): Promise<void>;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}

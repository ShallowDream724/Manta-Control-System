declare module 'node-wifi' {
  interface WiFiNetwork {
    ssid: string;
    bssid: string;
    mode: string;
    channel: number;
    frequency: number;
    signal_level: number;
    quality: number;
    security: string;
    security_flags: string[];
  }

  interface WiFiConnection {
    ssid: string;
    bssid: string;
    mode: string;
    frequency: number;
    signal_level: number;
    quality: number;
    security: string;
    ip?: string;
  }

  interface WiFiConfig {
    ssid: string;
    password?: string;
  }

  interface InitOptions {
    iface?: string | null;
  }

  export function init(options: InitOptions): void;
  export function scan(): Promise<WiFiNetwork[]>;
  export function getCurrentConnections(): Promise<WiFiConnection[]>;
  export function connect(config: WiFiConfig): Promise<void>;
  export function disconnect(): Promise<void>;
}

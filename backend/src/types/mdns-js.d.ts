declare module 'mdns-js' {
  interface ServiceType {
    name: string;
    protocol: string;
  }

  interface AdvertisementOptions {
    name?: string;
    host?: string;
    txt?: Record<string, string>;
  }

  interface Advertisement {
    start(): void;
    stop(): void;
    on(event: 'ready', listener: () => void): void;
    on(event: 'error', listener: (error: Error) => void): void;
  }

  interface Browser {
    start(): void;
    stop(): void;
    discover(): void;
    on(event: 'ready', listener: () => void): void;
    on(event: 'update', listener: (data: any) => void): void;
    on(event: 'error', listener: (error: Error) => void): void;
  }

  export function tcp(service: string): ServiceType;
  export function udp(service: string): ServiceType;
  export function createAdvertisement(
    serviceType: ServiceType,
    port: number,
    options?: AdvertisementOptions
  ): Advertisement;
  export function createBrowser(serviceType: ServiceType): Browser;
}

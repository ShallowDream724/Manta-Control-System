export interface ArduinoStatus {
  success: boolean;
  online: boolean;
  devices?: number;
  uptimeSec?: number;
  responseTime?: number;
}

export class ArduinoService {
  private baseUrl: string;
  constructor(baseUrl: string = '/api') {
    this.baseUrl = baseUrl;
  }

  async getStatus(): Promise<ArduinoStatus> {
    const r = await fetch(`${this.baseUrl}/arduino/status`);
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return r.json();
  }
}

export const arduinoService = new ArduinoService();

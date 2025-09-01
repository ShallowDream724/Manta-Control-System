# 任务编排器 - Arduino通信协议模块

## 核心设计理念

Arduino通信协议模块负责PC与Arduino之间的高效通信，核心特点：
1. **批量命令发送** - 同一时刻的多个动作批量发送，实现真并行
2. **内存优化** - 考虑Arduino内存限制，优化协议格式
3. **可靠传输** - 确保命令正确传达和执行
4. **实时反馈** - Arduino及时反馈执行状态
5. **错误处理** - 完善的错误检测和报告机制

## 通信协议设计

### 批量命令协议
```typescript
// 批量命令格式（PC → Arduino）
interface BatchCommand {
  timestamp: number;           // 命令时间戳
  commandId: string;          // 命令唯一ID
  commands: DeviceCommand[];   // 设备命令列表
}

// 单个设备命令
interface DeviceCommand {
  deviceId: string;           // 设备ID（对应引脚配置）
  action: 'setPower' | 'setState' | 'getPower' | 'getState';
  value?: number | boolean;   // 设置值（查询命令不需要）
  duration?: number;          // 持续时间（毫秒，可选）
}

// 示例：同时控制多个设备
const batchCommand: BatchCommand = {
  timestamp: 1640995200000,
  commandId: "cmd_001",
  commands: [
    { deviceId: "pump1", action: "setPower", value: 80 },
    { deviceId: "valve1", action: "setState", value: true },
    { deviceId: "pump2", action: "setPower", value: 0 },
    { deviceId: "valve2", action: "setState", value: false }
  ]
};
```

### Arduino响应协议
```typescript
// Arduino响应格式（Arduino → PC）
interface CommandResponse {
  commandId: string;          // 对应的命令ID
  timestamp: number;          // 响应时间戳
  success: boolean;           // 执行是否成功
  results: DeviceResult[];    // 各设备执行结果
  error?: string;             // 错误信息（如果有）
}

// 单个设备执行结果
interface DeviceResult {
  deviceId: string;           // 设备ID
  success: boolean;           // 该设备命令是否成功
  currentValue: number | boolean; // 当前值
  error?: string;             // 设备级错误信息
}

// 示例：Arduino响应
const response: CommandResponse = {
  commandId: "cmd_001",
  timestamp: 1640995200100,
  success: true,
  results: [
    { deviceId: "pump1", success: true, currentValue: 80 },
    { deviceId: "valve1", success: true, currentValue: true },
    { deviceId: "pump2", success: true, currentValue: 0 },
    { deviceId: "valve2", success: false, currentValue: false, error: "Pin not configured" }
  ]
};
```

## JSON协议优化

### 内存优化的JSON格式
```typescript
// 优化前：完整字段名（占用更多内存）
{
  "timestamp": 1640995200000,
  "commandId": "cmd_001",
  "commands": [
    {
      "deviceId": "pump1",
      "action": "setPower",
      "value": 80
    }
  ]
}

// 优化后：简化字段名（节省内存）
{
  "ts": 1640995200000,
  "id": "cmd_001",
  "cmds": [
    {
      "dev": "pump1",
      "act": "setPwr",
      "val": 80
    }
  ]
}
```

### 协议压缩策略
```typescript
// PC端协议编码器
class ProtocolEncoder {
  // 字段映射表
  private static readonly FIELD_MAP = {
    timestamp: 'ts',
    commandId: 'id',
    commands: 'cmds',
    deviceId: 'dev',
    action: 'act',
    value: 'val',
    duration: 'dur'
  };
  
  private static readonly ACTION_MAP = {
    setPower: 'setPwr',
    setState: 'setSt',
    getPower: 'getPwr',
    getState: 'getSt'
  };
  
  // 编码批量命令
  static encode(batchCommand: BatchCommand): string {
    const compressed = {
      ts: batchCommand.timestamp,
      id: batchCommand.commandId,
      cmds: batchCommand.commands.map(cmd => ({
        dev: cmd.deviceId,
        act: this.ACTION_MAP[cmd.action] || cmd.action,
        ...(cmd.value !== undefined && { val: cmd.value }),
        ...(cmd.duration !== undefined && { dur: cmd.duration })
      }))
    };
    
    return JSON.stringify(compressed);
  }
  
  // 解码Arduino响应
  static decode(response: string): CommandResponse {
    const compressed = JSON.parse(response);
    
    return {
      commandId: compressed.id,
      timestamp: compressed.ts,
      success: compressed.ok,
      results: compressed.res?.map((r: any) => ({
        deviceId: r.dev,
        success: r.ok,
        currentValue: r.val,
        error: r.err
      })) || [],
      error: compressed.err
    };
  }
}
```

## Arduino端实现

### 设备管理器
```cpp
// Arduino端设备管理器
class DeviceManager {
private:
  struct DeviceConfig {
    String id;
    int pin;
    String type;  // "pwm" or "digital"
    int maxPower;
    int currentValue;
  };
  
  DeviceConfig devices[MAX_DEVICES];
  int deviceCount = 0;
  
public:
  // 初始化设备配置
  void initializeDevices(const JsonDocument& config) {
    JsonArray deviceArray = config["devices"];
    deviceCount = min((int)deviceArray.size(), MAX_DEVICES);
    
    for (int i = 0; i < deviceCount; i++) {
      JsonObject device = deviceArray[i];
      devices[i].id = device["id"].as<String>();
      devices[i].pin = device["pin"];
      devices[i].type = device["mode"].as<String>();
      devices[i].maxPower = device["maxPower"] | 100;
      devices[i].currentValue = 0;
      
      // 初始化引脚
      pinMode(devices[i].pin, OUTPUT);
      if (devices[i].type == "pwm") {
        analogWrite(devices[i].pin, 0);
      } else {
        digitalWrite(devices[i].pin, LOW);
      }
    }
  }
  
  // 执行设备命令
  bool executeCommand(const String& deviceId, const String& action, int value) {
    DeviceConfig* device = findDevice(deviceId);
    if (!device) return false;
    
    if (action == "setPwr") {
      return setPower(device, value);
    } else if (action == "setSt") {
      return setState(device, value > 0);
    }
    
    return false;
  }
  
private:
  DeviceConfig* findDevice(const String& deviceId) {
    for (int i = 0; i < deviceCount; i++) {
      if (devices[i].id == deviceId) {
        return &devices[i];
      }
    }
    return nullptr;
  }
  
  bool setPower(DeviceConfig* device, int power) {
    if (device->type != "pwm") return false;
    
    power = constrain(power, 0, device->maxPower);
    int pwmValue = map(power, 0, 100, 0, 255);
    
    analogWrite(device->pin, pwmValue);
    device->currentValue = power;
    return true;
  }
  
  bool setState(DeviceConfig* device, bool state) {
    digitalWrite(device->pin, state ? HIGH : LOW);
    device->currentValue = state ? 1 : 0;
    return true;
  }
};
```

### 命令处理器
```cpp
// Arduino端命令处理器
class CommandProcessor {
private:
  DeviceManager& deviceManager;
  
public:
  CommandProcessor(DeviceManager& dm) : deviceManager(dm) {}
  
  // 处理批量命令
  String processBatchCommand(const String& jsonCommand) {
    DynamicJsonDocument doc(1024);
    DeserializationError error = deserializeJson(doc, jsonCommand);
    
    if (error) {
      return createErrorResponse("", "JSON parse error");
    }
    
    String commandId = doc["id"];
    JsonArray commands = doc["cmds"];
    
    // 创建响应文档
    DynamicJsonDocument response(1024);
    response["id"] = commandId;
    response["ts"] = millis();
    response["ok"] = true;
    
    JsonArray results = response.createNestedArray("res");
    
    // 执行所有命令（真并行）
    for (JsonObject cmd : commands) {
      String deviceId = cmd["dev"];
      String action = cmd["act"];
      int value = cmd["val"] | 0;
      
      JsonObject result = results.createNestedObject();
      result["dev"] = deviceId;
      
      bool success = deviceManager.executeCommand(deviceId, action, value);
      result["ok"] = success;
      
      if (success) {
        result["val"] = deviceManager.getCurrentValue(deviceId);
      } else {
        result["err"] = "Command failed";
        response["ok"] = false;
      }
    }
    
    String responseStr;
    serializeJson(response, responseStr);
    return responseStr;
  }
  
private:
  String createErrorResponse(const String& commandId, const String& error) {
    DynamicJsonDocument response(256);
    response["id"] = commandId;
    response["ts"] = millis();
    response["ok"] = false;
    response["err"] = error;
    
    String responseStr;
    serializeJson(response, responseStr);
    return responseStr;
  }
};
```

## HTTP服务器实现

### Arduino HTTP API
```cpp
// Arduino HTTP服务器
class ArduinoHTTPServer {
private:
  WebServer server;
  CommandProcessor& processor;
  
public:
  ArduinoHTTPServer(CommandProcessor& proc) : server(80), processor(proc) {}
  
  void begin() {
    // 设置CORS
    server.onNotFound([this]() {
      if (server.method() == HTTP_OPTIONS) {
        handleCORS();
      } else {
        server.send(404, "text/plain", "Not Found");
      }
    });
    
    // 批量命令接口
    server.on("/api/commands", HTTP_POST, [this]() {
      handleBatchCommand();
    });
    
    // 健康检查接口
    server.on("/api/health", HTTP_GET, [this]() {
      handleHealthCheck();
    });
    
    // 设备状态查询接口
    server.on("/api/status", HTTP_GET, [this]() {
      handleStatusQuery();
    });
    
    server.begin();
    Serial.println("HTTP server started on port 80");
  }
  
  void handleClient() {
    server.handleClient();
  }
  
private:
  void handleCORS() {
    server.sendHeader("Access-Control-Allow-Origin", "*");
    server.sendHeader("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
    server.sendHeader("Access-Control-Allow-Headers", "Content-Type");
    server.send(200);
  }
  
  void handleBatchCommand() {
    // 设置CORS
    server.sendHeader("Access-Control-Allow-Origin", "*");
    
    if (!server.hasArg("plain")) {
      server.send(400, "application/json", "{\"error\":\"No body\"}");
      return;
    }
    
    String body = server.arg("plain");
    String response = processor.processBatchCommand(body);
    
    server.send(200, "application/json", response);
  }
  
  void handleHealthCheck() {
    server.sendHeader("Access-Control-Allow-Origin", "*");
    
    DynamicJsonDocument doc(256);
    doc["status"] = "ok";
    doc["uptime"] = millis();
    doc["freeMemory"] = ESP.getFreeHeap();
    
    String response;
    serializeJson(doc, response);
    server.send(200, "application/json", response);
  }
  
  void handleStatusQuery() {
    server.sendHeader("Access-Control-Allow-Origin", "*");
    
    // 返回所有设备当前状态
    String statusResponse = deviceManager.getAllDeviceStatus();
    server.send(200, "application/json", statusResponse);
  }
};
```

## PC端通信客户端

### HTTP客户端实现
```typescript
// PC端Arduino通信客户端
class ArduinoClient {
  private baseUrl: string;
  private timeout: number;
  
  constructor(arduinoIP: string, port: number = 80) {
    this.baseUrl = `http://${arduinoIP}:${port}/api`;
    this.timeout = 5000; // 5秒超时
  }
  
  // 发送批量命令
  async sendBatchCommand(batchCommand: BatchCommand): Promise<CommandResponse> {
    const encodedCommand = ProtocolEncoder.encode(batchCommand);
    
    try {
      const response = await fetch(`${this.baseUrl}/commands`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: encodedCommand,
        signal: AbortSignal.timeout(this.timeout)
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const responseText = await response.text();
      return ProtocolEncoder.decode(responseText);
      
    } catch (error) {
      throw new Error(`Arduino communication failed: ${error.message}`);
    }
  }
  
  // 健康检查
  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/health`, {
        method: 'GET',
        signal: AbortSignal.timeout(this.timeout)
      });
      return response.ok;
    } catch {
      return false;
    }
  }
  
  // 查询设备状态
  async getDeviceStatus(): Promise<DeviceStatus[]> {
    try {
      const response = await fetch(`${this.baseUrl}/status`, {
        method: 'GET',
        signal: AbortSignal.timeout(this.timeout)
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      return await response.json();
    } catch (error) {
      throw new Error(`Failed to get device status: ${error.message}`);
    }
  }
}
```

## 错误处理和重连

### 连接管理
```typescript
// Arduino连接管理器
class ArduinoConnectionManager {
  private client: ArduinoClient;
  private isConnected: boolean = false;
  private reconnectInterval: number = 5000;
  private maxRetries: number = 3;
  
  constructor(arduinoIP: string) {
    this.client = new ArduinoClient(arduinoIP);
    this.startHealthCheck();
  }
  
  // 发送命令（带重连逻辑）
  async sendCommand(batchCommand: BatchCommand): Promise<CommandResponse> {
    if (!this.isConnected) {
      throw new Error('Arduino not connected');
    }
    
    try {
      return await this.client.sendBatchCommand(batchCommand);
    } catch (error) {
      this.isConnected = false;
      throw error;
    }
  }
  
  // 定期健康检查
  private startHealthCheck() {
    setInterval(async () => {
      try {
        const isHealthy = await this.client.healthCheck();
        if (isHealthy !== this.isConnected) {
          this.isConnected = isHealthy;
          this.notifyConnectionChange(isHealthy);
        }
      } catch {
        if (this.isConnected) {
          this.isConnected = false;
          this.notifyConnectionChange(false);
        }
      }
    }, this.reconnectInterval);
  }
  
  private notifyConnectionChange(connected: boolean) {
    console.log(`Arduino ${connected ? 'connected' : 'disconnected'}`);
    // 发送连接状态变化事件
  }
}
```

## 总结

Arduino通信协议模块的核心优势：

1. **高效的批量通信** - 一次请求控制多个设备，实现真并行
2. **内存优化协议** - 压缩JSON格式，适应Arduino内存限制
3. **可靠的错误处理** - 完善的超时和重连机制
4. **实时状态反馈** - 及时获取设备执行结果
5. **标准HTTP协议** - 易于调试和扩展
6. **CORS支持** - 支持Web前端直接访问

这个通信协议确保了PC与Arduino之间的高效、可靠通信，为任务编排器提供了坚实的硬件控制基础。

import { Logger } from 'winston';
import type { DeviceConfig } from '../../types/device';

/**
 * 代码生成服务抽象基类
 */
export abstract class CodeGenerationService {
  constructor(protected logger: Logger) {}

  /**
   * 生成代码的抽象方法
   */
  abstract generateCode(devices: DeviceConfig[], config: any): Promise<GeneratedCode>;

  /**
   * 验证设备配置
   */
  protected validateDevices(devices: DeviceConfig[]): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (devices.length === 0) {
      errors.push('至少需要配置一个设备');
      return { isValid: false, errors, warnings };
    }

    // 检查引脚冲突
    const usedPins = new Set<number>();
    devices.forEach(device => {
      if (usedPins.has(device.pin)) {
        errors.push(`引脚 ${device.pin} 被多个设备使用`);
      }
      usedPins.add(device.pin);
    });

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }
}

/**
 * Arduino代码生成服务
 */
export class ArduinoCodeGenerationService extends CodeGenerationService {
  private readonly VALID_PWM_PINS = [3, 5, 6, 9, 10, 11];
  private readonly BOARD_TYPE = 'Arduino UNO R4 WiFi';

  async generateCode(devices: DeviceConfig[], wifiConfig: WifiConfig): Promise<GeneratedCode> {
    this.logger.info(`Generating Arduino code for ${devices.length} devices`);

    // 验证配置
    const validation = this.validateArduinoConfig(devices);
    if (!validation.isValid) {
      throw new Error(`配置验证失败: ${validation.errors.join(', ')}`);
    }

    // 生成代码
    const code = this.buildArduinoCode(devices, wifiConfig);
    
    return {
      code,
      language: 'cpp',
      platform: this.BOARD_TYPE,
      generatedAt: new Date(),
      metadata: {
        deviceCount: devices.length,
        pwmDevices: devices.filter(d => d.type === 'pwm').length,
        digitalDevices: devices.filter(d => d.type === 'digital').length,
        usedPins: devices.map(d => d.pin).sort((a, b) => a - b),
        wifiConfig: {
          ssid: wifiConfig.ssid,
          hasPassword: !!wifiConfig.password
        }
      },
      validation
    };
  }

  /**
   * 验证Arduino特定配置
   */
  private validateArduinoConfig(devices: DeviceConfig[]): ValidationResult {
    const baseValidation = this.validateDevices(devices);
    const warnings = [...baseValidation.warnings];

    // Arduino特定验证
    devices.forEach(device => {
      if (device.type === 'pwm' && !this.VALID_PWM_PINS.includes(device.pin)) {
        warnings.push(`引脚 ${device.pin} 可能不支持PWM (${device.name})`);
      }
    });

    return {
      ...baseValidation,
      warnings
    };
  }

  /**
   * 构建Arduino代码
   */
  private buildArduinoCode(devices: DeviceConfig[], wifiConfig: WifiConfig): string {
    const sections = [
      this.generateHeader(devices),
      this.generateIncludes(),
      this.generateWifiConfig(wifiConfig),
      this.generateDeviceConfig(devices),
      this.generateDeviceState(devices),
      this.generateGlobalVariables(),
      this.generateSetupFunction(devices),
      this.generateLoopFunction(),
      this.generateDeviceFunctions(devices),
      this.generateHttpHandlers(devices),
      this.generateUtilityFunctions(devices)
    ];

    return sections.join('\n\n');
  }

  private generateHeader(devices: DeviceConfig[]): string {
    return `/**
 * FishControl 自动生成代码
 * ${this.BOARD_TYPE}专用
 * 
 * 设备配置：
${devices.map(d => ` * - ${d.name} (${d.id}): 引脚${d.pin} ${d.type.toUpperCase()}`).join('\n')}
 * 
 * 生成时间: ${new Date().toISOString()}
 * 代码生成器版本: 2.0.0
 */`;
  }

  private generateIncludes(): string {
    return `#include <WiFiS3.h>
#include <ArduinoJson.h>

// 确保使用正确的库版本
// WiFiS3: Arduino UNO R4 WiFi专用
// ArduinoJson: 版本6.x或更高`;
  }

  private generateWifiConfig(wifiConfig: WifiConfig): string {
    return `// ==================== WiFi配置 ====================
const char* ssid = "${wifiConfig.ssid}";
const char* pass = "${wifiConfig.password}";`;
  }

  private generateDeviceConfig(devices: DeviceConfig[]): string {
    const constants = devices.map(device => {
      const constName = device.id.toUpperCase() + '_PIN';
      return `const int ${constName} = ${device.pin};   // ${device.name}`;
    }).join('\n');

    return `// ==================== 设备配置 ====================
${constants}`;
  }

  private generateDeviceState(devices: DeviceConfig[]): string {
    return `// ==================== 设备状态结构 ====================
struct DeviceState {
  int currentValue;    // 当前值（PWM: 0-255, 数字: 0/1）
  bool isActive;       // 是否激活
  unsigned long endTime; // 结束时间（定时任务用）
};

DeviceState devices[${devices.length}];
const char* deviceNames[] = {${devices.map(d => `"${d.id}"`).join(', ')}};
const int devicePins[] = {${devices.map(d => d.pin).join(', ')}};
const bool isPWM[] = {${devices.map(d => d.type === 'pwm' ? 'true' : 'false').join(', ')}};`;
  }

  private generateGlobalVariables(): string {
    return `// ==================== 全局变量 ====================
WiFiServer server(80);
unsigned long lastStatusCheck = 0;
const unsigned long STATUS_INTERVAL = 1000; // 1秒检查一次定时任务

// ==================== WiFi日志器 ====================
class WiFiLogger {
  private:
    String lastLog = "";
    bool hasPendingLog = false;
    unsigned long lastSendTime = 0;
    const unsigned long MIN_SEND_INTERVAL = 1000; // 最小发送间隔1秒

  public:
    void log(String level, String message, String category = "system") {
      // 只发送重要日志，避免过度发送
      if (level == "error" || level == "warn") {
        sendLogImmediately(level, message, category);
      } else {
        // info和debug日志有频率限制
        unsigned long now = millis();
        if (now - lastSendTime >= MIN_SEND_INTERVAL) {
          sendLogImmediately(level, message, category);
          lastSendTime = now;
        }
      }
    }

    void sendLogImmediately(String level, String message, String category) {
      // 清理消息中的控制字符
      String cleanMessage = cleanJsonString(message);

      // 构造JSON日志
      String jsonLog = "{\\"timestamp\\":" + String(millis()) +
                      ",\\"level\\":\\"" + level +
                      "\\",\\"message\\":\\"" + cleanMessage +
                      "\\",\\"category\\":\\"" + category + "\\"}";

      // 发送到后端
      WiFiClient client;
      if (client.connect("192.168.4.2", 8080)) {
        client.println("POST /api/arduino-logs HTTP/1.1");
        client.println("Host: 192.168.4.2:8080");
        client.println("Content-Type: application/json");
        client.println("Connection: close");
        client.print("Content-Length: ");
        client.println(jsonLog.length());
        client.println();
        client.print(jsonLog);
        client.flush(); // 确保数据发送完成
        delay(10);      // 给服务器时间处理
        client.stop();
      } else {
        // 连接失败，保存最后一条日志用于重试
        lastLog = jsonLog;
        hasPendingLog = true;
      }
    }

    // 清理JSON字符串中的控制字符
    String cleanJsonString(String input) {
      String result = "";
      for (int i = 0; i < input.length(); i++) {
        char c = input.charAt(i);
        // 过滤控制字符，保留可打印字符
        if (c >= 32 && c <= 126) {
          // 转义JSON特殊字符
          if (c == '"') {
            result += "\\\\\\"";
          } else if (c == '\\\\') {
            result += "\\\\\\\\";
          } else {
            result += c;
          }
        } else if (c == '\\n') {
          result += "\\\\n";
        } else if (c == '\\r') {
          result += "\\\\r";
        } else if (c == '\\t') {
          result += "\\\\t";
        }
        // 其他控制字符直接忽略
      }
      return result;
    }

    void retryLastLog() {
      if (hasPendingLog && lastLog.length() > 0) {
        WiFiClient client;
        if (client.connect("192.168.4.2", 8080)) {
          client.println("POST /api/arduino-logs HTTP/1.1");
          client.println("Host: 192.168.4.2:8080");
          client.println("Content-Type: application/json");
          client.println("Connection: close");
          client.print("Content-Length: ");
          client.println(lastLog.length());
          client.println();
          client.print(lastLog);
          client.flush(); // 确保数据发送完成
          delay(10);      // 给服务器时间处理
          client.stop();

          // 重试成功，清除待发送日志
          hasPendingLog = false;
          lastLog = "";
        }
      }
    }
};

WiFiLogger wifiLogger;`;
  }

  private generateSetupFunction(devices: DeviceConfig[]): string {
    return `void setup() {
  // 初始化串口
  Serial.begin(115200);
  while (!Serial) delay(10);
  
  Serial.println("=================================");
  Serial.println("FishControl 自动生成版本启动中...");
  Serial.println("设备数量: ${devices.length}");
  Serial.println("=================================");
  
  // 初始化设备引脚
  initializeDevices();
  
  // 初始化WiFi热点
  initializeWiFi();
  
  // 启动HTTP服务器
  server.begin();
  Serial.print("HTTP服务器已启动，IP地址: ");
  Serial.println(WiFi.localIP());
  Serial.println("API端点: http://192.168.4.1/api/commands");
  Serial.println("其他设备可连接WiFi热点来控制系统");
  Serial.println("=================================");
}`;
  }

  private generateLoopFunction(): string {
    return `void loop() {
  // 处理HTTP请求
  handleHTTPRequests();

  // 检查定时任务
  checkTimedTasks();

  // 重试失败的日志发送
  wifiLogger.retryLastLog();

  delay(10); // 短暂延迟
}`;
  }

  private generateDeviceFunctions(devices: DeviceConfig[]): string {
    return `/**
 * 初始化设备引脚
 */
void initializeDevices() {
  Serial.println("初始化设备引脚...");
  
  for (int i = 0; i < ${devices.length}; i++) {
    pinMode(devicePins[i], OUTPUT);
    devices[i].currentValue = 0;
    devices[i].isActive = false;
    devices[i].endTime = 0;
    
    // 设置初始状态为关闭
    if (isPWM[i]) {
      analogWrite(devicePins[i], 0);
    } else {
      digitalWrite(devicePins[i], LOW);
    }
    
    Serial.print("设备 ");
    Serial.print(deviceNames[i]);
    Serial.print(" (引脚 ");
    Serial.print(devicePins[i]);
    Serial.print(") 初始化完成 - ");
    Serial.println(isPWM[i] ? "PWM模式" : "数字模式");
  }
}`;
  }

  private generateHttpHandlers(devices: DeviceConfig[]): string {
    return `// ==================== HTTP处理函数 ====================

/**
 * 处理HTTP请求
 */
void handleHTTPRequests() {
  WiFiClient client = server.available();
  if (!client) return;

  String request = "";
  unsigned long timeout = millis() + 3000; // 3秒超时
  int contentLength = 0;
  bool headersComplete = false;

  // 读取请求头
  while (client.connected() && millis() < timeout && !headersComplete) {
    if (client.available()) {
      String line = client.readStringUntil('\\n');
      request += line + "\\n";

      // 检查Content-Length（不区分大小写）
      String lowerLine = line;
      lowerLine.toLowerCase();
      if (lowerLine.startsWith("content-length:")) {
        String lengthStr = line.substring(line.indexOf(':') + 1);
        lengthStr.trim();
        contentLength = lengthStr.toInt();
      }

      // 检查是否读取完成
      if (line.length() == 1 && line[0] == '\\r') {
        headersComplete = true;
      }
    }
  }

  // 如果是POST请求，继续读取请求体
  if (headersComplete && contentLength > 0 && request.indexOf("POST") >= 0) {
    String body = "";
    int bytesRead = 0;
    unsigned long bodyTimeout = millis() + 2000; // 2秒超时

    while (client.connected() && millis() < bodyTimeout && bytesRead < contentLength) {
      if (client.available()) {
        char c = client.read();
        body += c;
        bytesRead++;
      }
      delay(1); // 小延时，给Arduino时间处理
    }

    request += body;
  }

  // 解析请求
  if (request.indexOf("POST /api/commands") >= 0) {
    // 删除：不记录每次HTTP请求，太频繁
    handleBatchCommands(client, request);
  } else if (request.indexOf("GET /api/status") >= 0) {
    handleStatusQuery(client);
  } else if (request.indexOf("OPTIONS") >= 0) {
    handleCORSPreflight(client);
  } else {
    wifiLogger.log("warn", "Unknown request: " + request.substring(0, 30), "http");
    send404(client);
  }

  client.stop();
}

/**
 * 处理批量命令
 */
void handleBatchCommands(WiFiClient& client, String& request) {
  // 发送CORS头
  sendCORSHeaders(client);

  // 提取JSON数据
  int jsonStart = request.indexOf("{");
  if (jsonStart == -1) {
    Serial.println("错误: 请求中没有找到JSON数据");
    Serial.println("请求内容: " + request);
    sendError(client, 400, "No JSON found");
    return;
  }

  String jsonData = request.substring(jsonStart);
  Serial.println("提取的JSON数据: " + jsonData);
  Serial.println("JSON数据长度: " + String(jsonData.length()));

  // 解析JSON
  DynamicJsonDocument doc(2048);
  DeserializationError error = deserializeJson(doc, jsonData);

  if (error) {
    String errorMsg = "JSON解析失败: " + String(error.c_str());
    Serial.println(errorMsg);
    Serial.println("原始JSON: " + jsonData);
    Serial.println("JSON前50字符: " + jsonData.substring(0, min(50, jsonData.length())));
    wifiLogger.log("error", errorMsg, "json_parse");
    sendError(client, 400, "JSON Parse Error");
    return;
  }

  // 执行命令 - 适配后端格式 {id, ts, cmds: [{dev, act, val, dur}]}
  String commandId = doc["id"];
  unsigned long timestamp = doc["ts"];
  JsonArray commands = doc["cmds"];
  int executedCount = 0;

  Serial.print("收到批处理命令 ID: ");
  Serial.print(commandId);
  Serial.print(", 时间戳: ");
  Serial.print(timestamp);
  Serial.print(", 命令数: ");
  Serial.println(commands.size());

  for (JsonObject cmd : commands) {
    String device = cmd["dev"];      // 后端格式：dev
    String action = cmd["act"];      // 后端格式：act
    int value = cmd["val"];          // 后端格式：val
    int duration = cmd["dur"];       // 后端格式：dur

    // 映射设备ID和动作类型
    String mappedDevice = mapDeviceId(device);
    String mappedAction = mapActionType(action);

    if (executeDeviceCommand(mappedDevice, mappedAction, value, duration)) {
      executedCount++;
    }
  }

  // 返回结果
  client.println("HTTP/1.1 200 OK");
  client.println("Content-Type: application/json");
  client.println("Connection: close");
  client.println();
  client.print("{\\"success\\": true, \\"executed\\": ");
  client.print(executedCount);
  client.println("}");

  String resultMsg = "执行了 " + String(executedCount) + " 个命令";
  Serial.println(resultMsg);
  // 删除：不记录每次命令执行结果，太频繁
}

/**
 * 处理状态查询
 */
void handleStatusQuery(WiFiClient& client) {
  sendCORSHeaders(client);

  client.println("HTTP/1.1 200 OK");
  client.println("Content-Type: application/json");
  client.println("Connection: close");
  client.println();
  client.println("{\\"status\\": \\"online\\", \\"devices\\": " + String(${devices.length}) + "}");
}

/**
 * 处理CORS预检请求
 */
void handleCORSPreflight(WiFiClient& client) {
  client.println("HTTP/1.1 200 OK");
  client.println("Access-Control-Allow-Origin: *");
  client.println("Access-Control-Allow-Methods: GET, POST, OPTIONS");
  client.println("Access-Control-Allow-Headers: Content-Type");
  client.println("Connection: close");
  client.println();
}

/**
 * 发送404错误
 */
void send404(WiFiClient& client) {
  client.println("HTTP/1.1 404 Not Found");
  client.println("Content-Type: text/plain");
  client.println("Connection: close");
  client.println();
  client.println("404 Not Found");
}

/**
 * 发送错误响应
 */
void sendError(WiFiClient& client, int code, String message) {
  client.print("HTTP/1.1 ");
  client.print(code);
  client.println(" Error");
  client.println("Content-Type: application/json");
  client.println("Connection: close");
  client.println();
  client.print("{\\"error\\": \\"");
  client.print(message);
  client.println("\\"}");
}

/**
 * 发送CORS头
 */
void sendCORSHeaders(WiFiClient& client) {
  // CORS头在具体响应中发送
}`;
  }

  private generateUtilityFunctions(devices: DeviceConfig[]): string {
    return `// ==================== 工具函数 ====================

/**
 * 初始化WiFi热点
 */
void initializeWiFi() {
  Serial.println("正在创建WiFi热点...");

  // 创建WiFi热点
  WiFi.beginAP(ssid, pass);

  // 等待热点启动
  while (WiFi.status() != WL_AP_LISTENING) {
    delay(500);
    Serial.print(".");
  }

  Serial.println();
  Serial.println("WiFi热点已创建");
  Serial.print("热点名称: ");
  Serial.println(ssid);
  Serial.print("IP地址: ");
  Serial.println(WiFi.localIP());
  Serial.println("其他设备可以连接此热点来控制Arduino");
}

/**
 * 映射设备ID：后端格式 -> Arduino格式
 */
String mapDeviceId(String backendId) {
  if (backendId == "pump1") return "inflate_pump_1";
  if (backendId == "pump2") return "inflate_pump_2";
  if (backendId == "pump3") return "exhaust_pump_1";
  if (backendId == "pump4") return "exhaust_pump_2";
  if (backendId == "valve1") return "valve_1";
  if (backendId == "valve2") return "valve_2";

  // 如果没有映射，返回原始ID
  return backendId;
}

/**
 * 映射动作类型：后端格式 -> Arduino格式
 */
String mapActionType(String backendAction) {
  if (backendAction == "setPwr") return "power";
  if (backendAction == "setSt") return "state";

  // 如果没有映射，返回原始动作
  return backendAction;
}

/**
 * 执行设备命令
 */
bool executeDeviceCommand(String deviceId, String action, int value, int duration) {
  // 查找设备索引
  int deviceIndex = -1;
  for (int i = 0; i < ${devices.length}; i++) {
    if (String(deviceNames[i]) == deviceId) {
      deviceIndex = i;
      break;
    }
  }

  if (deviceIndex == -1) {
    String errorMsg = "未知设备: " + deviceId;
    Serial.println(errorMsg);
    wifiLogger.log("error", errorMsg, "device_control");
    return false;
  }

  // 执行命令
  if (action == "power" || action == "set_power") {
    // PWM功率控制
    if (isPWM[deviceIndex]) {
      int pwmValue = map(value, 0, 100, 0, 255);
      analogWrite(devicePins[deviceIndex], pwmValue);
      devices[deviceIndex].currentValue = pwmValue;

      String logMsg = "设备 " + deviceId + " PWM设置为 " + String(value) + "% (" + String(pwmValue) + "/255)";
      Serial.println(logMsg);
      wifiLogger.log("info", logMsg, "device_control");
    } else {
      Serial.print("设备 ");
      Serial.print(deviceId);
      Serial.println(" 不支持PWM控制");
      return false;
    }
  } else if (action == "state" || action == "set_state") {
    // 数字状态控制
    bool state = (value > 0);
    digitalWrite(devicePins[deviceIndex], state ? HIGH : LOW);
    devices[deviceIndex].currentValue = state ? 1 : 0;

    String logMsg = "设备 " + deviceId + " 状态设置为 " + (state ? "开启" : "关闭");
    Serial.println(logMsg);
    wifiLogger.log("info", logMsg, "device_control");
  } else {
    Serial.print("未知动作: ");
    Serial.println(action);
    return false;
  }

  // 更新设备状态
  devices[deviceIndex].isActive = (value > 0);

  // 处理定时关闭
  if (duration > 0 && value > 0) {
    devices[deviceIndex].endTime = millis() + duration;
    Serial.print("将在 ");
    Serial.print(duration);
    Serial.println("ms 后自动关闭");
  } else {
    devices[deviceIndex].endTime = 0;
  }

  return true;
}

/**
 * 检查定时任务
 */
void checkTimedTasks() {
  unsigned long now = millis();

  for (int i = 0; i < ${devices.length}; i++) {
    if (devices[i].endTime > 0 && now >= devices[i].endTime) {
      // 时间到，关闭设备
      if (isPWM[i]) {
        analogWrite(devicePins[i], 0);
      } else {
        digitalWrite(devicePins[i], LOW);
      }

      devices[i].currentValue = 0;
      devices[i].isActive = false;
      devices[i].endTime = 0;

      String logMsg = "设备 " + String(deviceNames[i]) + " 定时关闭";
      Serial.println(logMsg);
      wifiLogger.log("info", logMsg, "timer_task");
    }
  }
}`;
  }
}

// ==================== 类型定义 ====================
// 注意：这些类型应该与前端共享，避免重复定义

export interface GeneratedCode {
  code: string;
  language: string;
  platform: string;
  generatedAt: Date;
  metadata: CodeMetadata;
  validation: ValidationResult;
}

export interface CodeMetadata {
  deviceCount: number;
  pwmDevices: number;
  digitalDevices: number;
  usedPins: number[];
  wifiConfig: {
    ssid: string;
    hasPassword: boolean;
  };
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export interface WifiConfig {
  ssid: string;
  password: string;
  channel?: number;
  maxConnections?: number;
}

# Arduino代码生成器设计

## 核心目标
根据用户的设备配置自动生成Arduino C++代码，实现：
1. WiFi热点创建和管理
2. HTTP服务器处理控制命令
3. 设备控制逻辑（PWM/Digital）
4. 100小时稳定运行保证

## 代码模板结构

### 基础模板框架
```cpp
#include <WiFi.h>
#include <WebServer.h>
#include <ESPmDNS.h>

// WiFi配置（固定部分）
const char* ssid = "FishControl_WiFi";
const char* password = "fish2025";

// 设备引脚定义（动态生成）
{{DEVICE_PINS_DEFINITIONS}}

// 设备控制变量（动态生成）
{{DEVICE_CONTROL_VARIABLES}}

WebServer server(80);

void setup() {
  Serial.begin(115200);
  
  // 初始化设备引脚（动态生成）
  {{DEVICE_PINS_INITIALIZATION}}
  
  // 启动WiFi热点
  setupWiFiHotspot();
  
  // 启动HTTP服务器
  setupWebServer();
  
  // 启动mDNS
  setupMDNS();
}

void loop() {
  server.handleClient();
  MDNS.update();
  
  // 连接状态监控
  monitorConnection();
  
  // 内存管理
  manageMemory();
  
  delay(10); // 避免看门狗重置
}
```

### WiFi稳定性保证
```cpp
void setupWiFiHotspot() {
  WiFi.mode(WIFI_AP);
  WiFi.softAP(ssid, password, 1, 0, 4); // 最多4个连接
  
  IPAddress IP = WiFi.softAPIP();
  Serial.print("AP IP address: ");
  Serial.println(IP);
}

void monitorConnection() {
  static unsigned long lastCheck = 0;
  if (millis() - lastCheck > 30000) { // 每30秒检查一次
    if (WiFi.softAPgetStationNum() == 0) {
      // 重启热点如果没有连接
      WiFi.softAPdisconnect(true);
      delay(1000);
      setupWiFiHotspot();
    }
    lastCheck = millis();
  }
}

void manageMemory() {
  static unsigned long lastGC = 0;
  if (millis() - lastGC > 60000) { // 每分钟清理一次
    // 强制垃圾回收
    ESP.getFreeHeap();
    lastGC = millis();
  }
}
```

### HTTP服务器模板
```cpp
void setupWebServer() {
  // 设备控制路由（动态生成）
  {{DEVICE_CONTROL_ROUTES}}
  
  // 状态查询路由
  server.on("/status", HTTP_GET, handleStatus);
  
  // 健康检查
  server.on("/health", HTTP_GET, handleHealth);
  
  // CORS处理
  server.onNotFound(handleCORS);
  
  server.begin();
  Serial.println("HTTP server started");
}

void handleCORS() {
  server.sendHeader("Access-Control-Allow-Origin", "*");
  server.sendHeader("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
  server.sendHeader("Access-Control-Allow-Headers", "Content-Type");
  
  if (server.method() == HTTP_OPTIONS) {
    server.send(200);
  } else {
    server.send(404, "text/plain", "Not Found");
  }
}
```

### mDNS配置
```cpp
void setupMDNS() {
  if (MDNS.begin("fish")) {
    Serial.println("mDNS responder started");
    MDNS.addService("http", "tcp", 80);
  } else {
    Serial.println("Error setting up mDNS responder!");
  }
}
```

## 动态代码生成规则

### 设备引脚定义生成
```javascript
// 生成器逻辑
function generateDevicePins(devices) {
  return devices.map(device => {
    const pinName = device.id.toUpperCase();
    return `const int ${pinName}_PIN = ${device.pin};`;
  }).join('\n');
}
```

### 设备控制路由生成
```javascript
function generateControlRoutes(devices) {
  return devices.map(device => {
    if (device.type === 'pump' && device.mode === 'pwm') {
      return generatePumpRoute(device);
    } else if (device.type === 'valve' && device.mode === 'digital') {
      return generateValveRoute(device);
    }
  }).join('\n');
}

function generatePumpRoute(device) {
  return `
  server.on("/${device.id}/control", HTTP_POST, []() {
    String body = server.arg("plain");
    DynamicJsonDocument doc(1024);
    deserializeJson(doc, body);
    
    int power = doc["power"];
    power = constrain(power, 0, ${device.maxPower || 100});
    
    int pwmValue = map(power, 0, 100, 0, 255);
    analogWrite(${device.id.toUpperCase()}_PIN, pwmValue);
    
    server.sendHeader("Access-Control-Allow-Origin", "*");
    server.send(200, "application/json", "{\\"success\\": true}");
  });`;
}
```

### 设备初始化生成
```javascript
function generateDeviceInit(devices) {
  return devices.map(device => {
    if (device.mode === 'pwm') {
      return `pinMode(${device.id.toUpperCase()}_PIN, OUTPUT);`;
    } else {
      return `pinMode(${device.id.toUpperCase()}_PIN, OUTPUT);`;
    }
  }).join('\n  ');
}
```

## 内存优化策略

### 字符串优化
```cpp
// 使用PROGMEM存储常量字符串
const char RESPONSE_SUCCESS[] PROGMEM = "{\"success\": true}";
const char RESPONSE_ERROR[] PROGMEM = "{\"success\": false, \"error\": \"%s\"}";

void sendSuccess() {
  server.sendHeader("Access-Control-Allow-Origin", "*");
  server.send_P(200, "application/json", RESPONSE_SUCCESS);
}
```

### 请求处理优化
```cpp
void handleDeviceControl() {
  // 限制请求体大小
  if (server.hasArg("plain") && server.arg("plain").length() > 512) {
    server.send(400, "text/plain", "Request too large");
    return;
  }
  
  // 快速解析和响应
  // ... 控制逻辑
  
  // 立即释放资源
  server.arg("plain").clear();
}
```

## 错误处理和恢复

### 看门狗保护
```cpp
#include <esp_task_wdt.h>

void setup() {
  // 配置看门狗
  esp_task_wdt_init(30, true); // 30秒超时
  esp_task_wdt_add(NULL);
}

void loop() {
  esp_task_wdt_reset(); // 重置看门狗
  
  // 主循环逻辑
  server.handleClient();
  
  delay(10);
}
```

### 异常恢复
```cpp
void handleException() {
  // 记录错误
  Serial.println("Exception occurred, restarting...");
  
  // 安全关闭所有设备
  {{EMERGENCY_SHUTDOWN_CODE}}
  
  // 重启系统
  ESP.restart();
}
```

## 生成器实现要点

### 配置验证
1. 引脚冲突检测
2. PWM引脚验证（Arduino UNO R4 WiFi的PWM引脚：3,5,6,9,10,11）
3. 设备类型与模式匹配检查

### 代码质量保证
1. 生成的代码语法检查
2. 内存使用估算
3. 编译前验证

### 扩展性设计
1. 支持未来Arduino板型
2. 模块化模板系统
3. 插件式设备类型扩展

## 测试验证流程

### 自动化测试
1. 配置文件解析测试
2. 代码生成正确性测试
3. 编译验证测试

### 实际验证
1. 生成代码烧录测试
2. WiFi连接稳定性测试
3. 设备控制功能测试
4. 100小时连续运行测试

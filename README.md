# Manta Control

仿生蝠鲼控制系统（Arduino UNO R4 WiFi + 前后端）。

- 设备配置 → 自动生成 Arduino 固件代码
- 控制面板 → 即时控制（PWM/数字），移动/平板/桌面自适应
- 任务编排器 → 步骤/延时/并行循环（统一 0.1 秒精度）
- 后端服务 → 指令调度、日志/状态汇聚、前端静态资源托管

本仓库包含：
- `backend/` Node/Express + WebSocket + 任务调度
- `frontend/` Vite + React + Tailwind 前端
- `config/` 设备与系统默认配置（示例）

---

## 功能亮点

- 代码生成器
  - 使用“设备配置页”当前设备列表（ID/引脚/类型）直接生成 Arduino UNO R4 WiFi 固件
  - WiFi 配置优先级：请求体 `wifiConfig` > `config/devices.json` > 默认值

- 任务编排/执行
  - 支持动作、延时、并行循环与子步骤
  - 全链路时间精度统一 0.1s（100ms）：
    - 前端输入即时四舍五入到 1 位小数
    - 保存/后端接收均规整为 100ms
  - 后端 100ms 调度 tick，批量压缩命令发送给 Arduino

- 控制面板
  - 桌面 3 列 / 平板 2 列 / 移动 1 列
  - PWM 支持“滑块 + 手动输入百分比（0–100）”
  - 设备图标与颜色继承“设备配置页”分组设置
  - 左下角显示真实 Arduino 在线状态与运行时间（uptime）

- 固件模板（UNO R4 WiFi）
  - 内置 HTTP 服务器（/api/commands 接收批量命令，/api/status 返回状态）
  - 降内存：固定容量 `StaticJsonDocument` 解析 JSON；减少串口打印
  - 仅维护每个设备一个 `endTime` 计时，loop 内轮询，无额外动态分配

---

## 快速开始

### 1) 准备环境
- Node.js 18+（前后端）
- Arduino IDE（烧录 UNO R4 WiFi，依赖 WiFiS3、ArduinoJson 6.x）

### 2) 安装依赖
```
# Backend
cd backend
npm ci

# Frontend
cd ../frontend
npm ci
```

### 3) 开发运行
两种方式：

- 分开跑（推荐开发阶段）：
```
# 前端 Dev（Vite）
cd frontend
npm run dev

# 后端 Dev
cd ../backend
npm run dev
```
- 一体化（后端托管前端 dist）：
```
cd frontend
npm run build
cd ../backend
npm run build
npm start
```
默认后端监听 `0.0.0.0:8080`，静态文件来自 `frontend/dist`（如存在）。
然后浏览器访问 http://localhost:8080/ 即可

### 4) 连接 Arduino（量产/演示）
- 烧录生成的固件后，UNO R4 WiFi 作为 AP：`192.168.4.1`
- PC 连接该 AP 后通常为 `192.168.4.2`，后端可与 Arduino 互通
- 其他设备（如手机）连接热点后可访问 192.168.4.2:8080 
---

## 配置

- `config/devices.json`
  - 示例已包含 6 个设备（4 PWM 泵 + 2 数字阀）
  - 代码生成器与控制面板会使用“设备配置页”的当前设备（前端可导入/导出/本地保存）

- 环境变量（后端）
  - `PORT`：后端端口（默认 8080）
  - `HOST`：后端主机（默认 0.0.0.0）
  - `ARDUINO_BASE_URL`：发送命令的 Arduino 基础地址（默认 `http://192.168.4.1`）
  - `ARDUINO_STATUS_TIMEOUT_MS`：状态查询超时（默认 3000ms）

---

## 前端页面

- 控制面板（Dashboard）
  - 实时控制设备；PWM 支持滑块 + 数字输入；持续时间 0.1s 精度
  - 自适应：移动 1 列 / 平板 2 列 / 桌面 3 列

- 设备配置
  - 增删改设备、分组、图标
  - 本地存储保存，可导入导出
  - 代码生成（Arduino 代码）

- 任务编排器
  - 可视化编辑步骤、延时与并行循环
  - 执行/停止任务，查看执行进度与日志

- 系统日志
  - 后端/固件/前端整合日志（后端提供接口）

---

## API 概览（后端）

- 代码生成
  - `POST /api/device-configs/generate-arduino`
  - Request：`{ devices: DeviceConfig[], wifiConfig?: { ssid, password } }`
  - Response：`{ success, data: { code, metadata, validation } }`

- 任务执行
  - `POST /api/task-execution/start` → `{ task, estimatedDuration? }`
  - `POST /api/task-execution/stop`
  - `GET  /api/task-execution/status`

- Arduino 状态代理
  - `GET /api/arduino/status` → `{ success, online, uptimeSec? }`
  - 支持查询参数：`?host=192.168.4.1`

- Arduino 日志接收
  - `POST /api/arduino-logs`（固件调用）

命令下发压缩格式（后端 → 固件）：
```json
{
  "id": "cmd_...",
  "ts": 1699999999999,
  "cmds": [
    { "dev": "pump1", "act": "setPwr", "val": 60, "dur": 1500 }
  ]
}
```
固件内会将 `setPwr/setSt` 映射回 `power/state` 并执行；设备 ID 与配置页保持一致。

---

## 代码生成（从前端触发）
- 打开“设备配置” → 点击“生成 Arduino 代码”
- 复制到 Arduino IDE，选择开发板“Arduino UNO R4 WiFi”，安装所需库，烧录即可

注意：UNO R4 WiFi 常用 PWM 引脚：`3,5,6,9,10,11`（模板会给出警告但不强制）

---

## 常见问题

- 控制面板只有两列？
  - 窗口宽度需 ≥ 1024px 才进入 3 列（与设备配置页断点一致）

- `/api/arduino/status` 一直离线？
  - 检查电脑是否连到了 Arduino AP；或用 `?host=` 指定实际地址
  - 也可设置后端 `ARDUINO_BASE_URL` 让任务下发指向正确的 Arduino 地址

- 任务未执行但后端成功？
  - 检查固件串口输出与后端日志；确认设备 ID 与配置页完全一致；确认持续时间大于 0
 
- Buggggggggg？
  - 作者水平有限，如果你觉得此项目有利用价值，但BUG满天飞，建议用AI自行更改。

- 对这个程序感兴趣？
  - 我知道我写的**很烂**但此时此刻能力有限，时间有限，项目只有大体能跑，诸多预想并未完善。如果你希望对这个项目继续开发，或对其中某些细节有疑问，欢迎找贾老师要我的联系方式。

---

## 许可
本项目基于 MIT License 开源，详见根目录 `LICENSE` 文件。


# 前端重构设计文档

## 设计目标

### 核心要求
- **三端完美适配**: 手机/平板/电脑无缝体验
- **现代化设计**: iOS 20风格，超越Apple设计水准
- **架构清晰**: 每个文件≤400行，文件夹≤8个文件
- **PWA支持**: 手机端接近原生应用体验
- **可配置框架**: 支持自定义设备配置，为后人开路

### 用户体验目标
- **直观操作**: 控制面板一目了然
- **流畅交互**: 60fps动画，即时反馈
- **防冲突设计**: 多用户协作友好提示
- **响应式布局**: 自适应不同屏幕尺寸
- **配置化设计**: 用户可自定义设备，导入导出配置

## 技术架构

### 技术栈选择
```
React 18 + TypeScript + Vite
├── UI框架: Tailwind CSS + Headless UI
├── 动画: Framer Motion
├── 状态管理: Zustand
├── 路由: React Router v6
├── PWA: Vite PWA Plugin
└── 图标: Heroicons + Lucide React
```

### 响应式断点设计
```css
/* 手机端 */
@media (max-width: 767px) {
  /* 单列布局，卡片堆叠 */
  /* 底部导航栏 */
  /* 全屏模态框 */
}

/* 平板端 */
@media (min-width: 768px) and (max-width: 1023px) {
  /* 双列网格布局 */
  /* 侧边导航栏 */
  /* 分屏模态框 */
}

/* 电脑端 */
@media (min-width: 1024px) {
  /* 三列仪表板布局 */
  /* 顶部导航栏 */
  /* 浮动模态框 */
}
```

## 组件架构设计

### 目录结构
```
src/
├── components/
│   ├── layout/              # 布局组件 (≤8个文件)
│   │   ├── AppLayout.tsx           # 主布局容器
│   │   ├── Navigation.tsx          # 导航组件
│   │   ├── Header.tsx              # 头部组件
│   │   ├── Sidebar.tsx             # 侧边栏组件
│   │   ├── BottomNav.tsx           # 底部导航(移动端)
│   │   ├── ResponsiveContainer.tsx # 响应式容器
│   │   └── LoadingScreen.tsx       # 加载屏幕
│   ├── device/              # 设备控制组件
│   │   ├── DeviceCard.tsx          # 设备卡片
│   │   ├── DeviceControl.tsx       # 设备控制器
│   │   ├── PowerSlider.tsx         # 功率滑块
│   │   ├── StateToggle.tsx         # 状态开关
│   │   ├── TimerControl.tsx        # 定时控制
│   │   ├── DeviceStatus.tsx        # 设备状态显示
│   │   └── ConflictAlert.tsx       # 冲突提示
│   ├── config/              # 配置管理组件
│   │   ├── DeviceConfigEditor.tsx  # 设备配置编辑器
│   │   ├── DeviceConfigCard.tsx    # 设备配置卡片
│   │   ├── ConfigImportExport.tsx  # 配置导入导出
│   │   ├── PinSelector.tsx         # 引脚选择器
│   │   ├── DeviceTypeSelector.tsx  # 设备类型选择器
│   │   ├── ConfigValidator.tsx     # 配置验证器
│   │   └── DefaultConfigs.tsx      # 默认配置模板
│   ├── task/                # 任务编排组件
│   │   ├── TaskEditor.tsx          # 任务编辑器
│   │   ├── StepCard.tsx            # 步骤卡片
│   │   ├── LoopContainer.tsx       # 循环容器
│   │   ├── ActionItem.tsx          # 动作项
│   │   ├── TaskPreview.tsx         # 任务预览
│   │   ├── ExecutionControl.tsx    # 执行控制
│   │   └── TaskLockModal.tsx       # 任务锁定模态框
│   ├── common/              # 通用组件
│   │   ├── Button.tsx              # 按钮组件
│   │   ├── Card.tsx                # 卡片组件
│   │   ├── Modal.tsx               # 模态框组件
│   │   ├── Toast.tsx               # 提示组件
│   │   ├── Slider.tsx              # 滑块组件
│   │   ├── Toggle.tsx              # 开关组件
│   │   └── Badge.tsx               # 徽章组件
│   └── responsive/          # 响应式适配组件
│       ├── DeviceDetector.tsx      # 设备检测
│       ├── BreakpointProvider.tsx  # 断点提供者
│       ├── MobileLayout.tsx        # 移动端布局
│       ├── TabletLayout.tsx        # 平板端布局
│       ├── DesktopLayout.tsx       # 桌面端布局
│       └── AdaptiveGrid.tsx        # 自适应网格
├── layouts/                 # 页面布局
│   ├── MobileLayout.tsx            # 移动端页面布局
│   ├── TabletLayout.tsx            # 平板端页面布局
│   ├── DesktopLayout.tsx           # 桌面端页面布局
│   └── PWALayout.tsx               # PWA布局
├── hooks/                   # 自定义Hooks
│   ├── useResponsive.ts            # 响应式Hook
│   ├── useDeviceDetection.ts       # 设备检测Hook
│   ├── useTouch.ts                 # 触摸手势Hook
│   ├── useKeyboard.ts              # 键盘快捷键Hook
│   ├── useConflictDetection.ts     # 冲突检测Hook
│   └── usePWA.ts                   # PWA功能Hook
├── utils/                   # 工具函数
│   ├── responsive.ts               # 响应式工具
│   ├── animation.ts                # 动画工具
│   ├── touch.ts                    # 触摸工具
│   └── pwa.ts                      # PWA工具
└── styles/                  # 样式文件
    ├── globals.css                 # 全局样式
    ├── components.css              # 组件样式
    ├── responsive.css              # 响应式样式
    └── animations.css              # 动画样式
```

## 页面设计规范

### 控制面板设计
#### 手机端 (≤767px)
- **单列卡片布局**: 设备卡片垂直堆叠
- **底部导航**: 控制面板/任务编排/日志/设置
- **滑动操作**: 左滑显示更多选项
- **触摸优化**: 44px最小触摸目标

#### 平板端 (768px-1023px)
- **双列网格**: 2x3设备卡片网格
- **侧边导航**: 左侧固定导航栏
- **分屏模式**: 支持任务编排分屏显示

#### 电脑端 (≥1024px)
- **三列布局**: 导航/控制面板/状态监控
- **悬浮控制**: 鼠标悬停显示详细控制
- **键盘快捷键**: 支持快捷键操作

### 任务编排器设计
#### 移动端优化
- **分步编辑**: 步骤/循环/动作分页编辑
- **拖拽排序**: 触摸友好的拖拽操作
- **折叠预览**: 可折叠的任务预览

#### 桌面端优化
- **可视化编辑**: 拖拽式任务编排
- **实时预览**: 右侧实时预览面板
- **快捷操作**: 右键菜单和快捷键

## 交互设计规范

### 冲突处理设计
```typescript
// 控制冲突提示
interface ConflictAlert {
  type: 'device_busy' | 'task_running';
  message: string;
  actions: Array<{
    label: string;
    action: () => void;
    variant: 'primary' | 'secondary' | 'danger';
  }>;
}

// 示例：设备控制冲突
{
  type: 'device_busy',
  message: '有别人也在控制，别打架哦',
  actions: [
    { label: '等待', action: () => {}, variant: 'secondary' },
    { label: '强制控制', action: () => {}, variant: 'danger' }
  ]
}

// 示例：任务执行冲突
{
  type: 'task_running',
  message: '有任务正在执行',
  actions: [
    { label: '停止当前任务', action: () => {}, variant: 'danger' },
    { label: '取消', action: () => {}, variant: 'secondary' }
  ]
}
```

### 动画设计规范
- **进入动画**: 淡入 + 上滑 (300ms)
- **退出动画**: 淡出 + 下滑 (200ms)
- **状态变化**: 颜色渐变 (150ms)
- **加载动画**: 脉冲效果
- **手势反馈**: 触摸涟漪效果

### PWA功能设计
- **离线支持**: 缓存关键页面和资源
- **安装提示**: 智能安装横幅
- **推送通知**: 设备状态变化通知
- **后台同步**: 离线操作队列

## 可配置框架设计

### 设备配置结构
```typescript
interface DeviceConfig {
  id: string;                    // 设备唯一ID
  name: string;                  // 用户自定义设备名称
  type: 'pump' | 'valve';        // 设备类型：泵或阀
  pin: number;                   // Arduino引脚号 (0-99)
  description?: string;          // 设备描述
  signalType: 'digital' | 'pwm'; // 信号类型
}

// 默认配置 - 用户的6个设备
const DEFAULT_DEVICES: DeviceConfig[] = [
  { id: 'pump1', name: '充气泵1', type: 'pump', pin: 5, signalType: 'pwm' },
  { id: 'pump2', name: '充气泵2', type: 'pump', pin: 6, signalType: 'pwm' },
  { id: 'pump3', name: '抽气泵1', type: 'pump', pin: 10, signalType: 'pwm' },
  { id: 'pump4', name: '抽气泵2', type: 'pump', pin: 11, signalType: 'pwm' },
  { id: 'valve1', name: '电磁阀1', type: 'valve', pin: 2, signalType: 'digital' },
  { id: 'valve2', name: '电磁阀2', type: 'valve', pin: 4, signalType: 'digital' }
];
```

### 配置管理功能
- **配置编辑器**: 可视化编辑设备配置
- **引脚冲突检测**: 防止引脚重复使用
- **配置验证**: 引脚范围(0-99)、名称唯一性验证
- **导入导出**: JSON格式配置文件导入导出
- **Arduino代码生成**: 根据配置自动生成Arduino代码模板

### 配置影响范围
1. **控制面板**: 根据配置动态生成设备控制卡片
2. **任务编排器**: 动作项设备选择器根据配置更新
3. **Arduino代码**: 自动生成对应的引脚定义和控制逻辑
4. **后端API**: 设备状态管理和命令处理

## 开发计划

### 第一阶段：基础架构
1. 清理现有代码
2. 建立新的组件架构
3. 实现响应式布局系统
4. 建立设计系统组件

### 第二阶段：核心功能
1. 重构控制面板
2. 重构任务编排器
3. 实现冲突检测和提示
4. 优化三端交互体验

### 第三阶段：高级功能
1. PWA功能实现
2. 动画和交互优化
3. 性能优化
4. 测试和调试

## 质量保证

### 代码规范
- TypeScript严格模式
- ESLint + Prettier代码格式化
- 组件单元测试
- E2E测试覆盖

### 性能指标
- 首屏加载 <2s
- 交互响应 <100ms
- 动画帧率 60fps
- 包体积 <500KB

### 兼容性要求
- iOS Safari 14+
- Android Chrome 90+
- 桌面端 Chrome/Firefox/Safari 最新版
- 支持触摸和鼠标操作

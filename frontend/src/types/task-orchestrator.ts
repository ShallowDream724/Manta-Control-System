/**
 * 任务编排器 - 前端统一类型定义
 * 基于后端类型定义，适配前端需求
 */

// ==================== 基础动作类型 ====================

/**
 * 基础动作 - 对应设备配置的具体操作
 */
export interface TaskAction {
  id: string;
  deviceId: string;        // 对应设备配置的ID
  actionType: 'power' | 'state';  // 功率控制或开关控制
  value: number | boolean; // 功率值(0-100)或开关状态(true/false)
  duration: number;        // 持续时间（毫秒）
  name: string;           // 动作名称（前端显示用）
}

/**
 * 延时动作 - 特殊的容器动作
 * 重要：延时内的循环深度限制为1，不能再嵌套循环
 */
export interface DelayAction {
  id: string;
  type: 'delay';
  name: string;
  delayMs: number;         // 延时毫秒数
  actions: (TaskAction | DelayAction)[]; // 延时后执行的动作列表（支持嵌套延时）
  parallelLoops: ParallelLoop[];         // 延时后执行的并行循环列表（循环深度限制为1）
}

// ==================== 子步骤结构 ====================

/**
 * 子步骤 - 循环内的最小执行单元
 * 注意：子步骤内不能包含循环，只能包含普通动作和延时动作
 */
export interface SubStep {
  id: string;
  name: string;
  actions: (TaskAction | DelayAction)[];  // 支持普通动作和延时动作，不支持循环
}

// ==================== 并行循环结构 ====================

/**
 * 并行循环 - 可独立执行的循环单元
 * 重要：循环内不能嵌套循环
 */
export interface ParallelLoop {
  id: string;
  name: string;
  iterations: number;      // 循环次数
  intervalMs: number;      // 循环间隔（毫秒）
  subSteps: SubStep[];     // 子步骤列表（串行执行）
}

// ==================== 步骤结构 ====================

/**
 * 步骤 - 任务的主要组成单元
 * 步骤内的内容并行执行，步骤间串行执行
 */
export interface Step {
  id: string;
  name: string;
  // 步骤内的内容并行执行
  actions: (TaskAction | DelayAction)[];  // 普通动作（单次执行）
  parallelLoops: ParallelLoop[];      // 并行循环列表
}

// ==================== 任务结构 ====================

/**
 * 任务 - 完整的执行序列
 */
export interface Task {
  id: string;
  name: string;
  steps: Step[];           // 步骤按顺序执行（串行）
  createdAt: number;
  updatedAt: number;
}

// ==================== 前端专用类型 ====================

/**
 * 任务编辑器状态
 */
export interface TaskEditorState {
  currentTask: Task;
  isPreviewOpen: boolean;
  isExecuting: boolean;
  selectedStepId?: string;
  selectedActionId?: string;
}

/**
 * 组件通用Props
 */
export interface BaseContainerProps {
  devices: import('../types').DeviceConfig[];
  groups: import('../types').DeviceGroup[];
}

/**
 * 步骤容器Props
 */
export interface StepContainerProps extends BaseContainerProps {
  step: Step;
  stepIndex: number;
  onUpdate: (step: Step) => void;
  onDelete: () => void;
}

/**
 * 延时容器Props
 */
export interface DelayContainerProps extends BaseContainerProps {
  delay: DelayAction;
  onUpdate: (delay: DelayAction) => void;
  onDelete: () => void;
  depth?: number; // 嵌套深度，用于样式调整
  disableLoop?: boolean; // 禁用循环功能（当在循环内部时）
}

/**
 * 循环容器Props
 */
export interface LoopContainerProps extends BaseContainerProps {
  loop: ParallelLoop;
  onUpdate: (loop: ParallelLoop) => void;
  onDelete: () => void;
}

/**
 * 动作项Props
 */
export interface ActionItemProps {
  action: TaskAction;
  devices: import('../types').DeviceConfig[];
  onUpdate: (action: TaskAction) => void;
  onDelete: () => void;
}

/**
 * 分组按钮Props
 */
export interface GroupActionButtonsProps extends BaseContainerProps {
  onAddAction: (deviceId: string) => void;
  onAddDelay: () => void;
  onAddLoop?: () => void; // 可选，某些容器不支持循环
  className?: string;
}

// ==================== 工具函数类型 ====================

/**
 * ID生成函数类型
 */
export type GenerateIdFunction = () => string;

/**
 * 动作类型联合
 */
export type AnyAction = TaskAction | DelayAction;

/**
 * 容器类型联合
 */
export type AnyContainer = DelayAction | ParallelLoop;

// ==================== 验证相关类型 ====================

/**
 * 验证错误
 */
export interface ValidationError {
  type: 'error' | 'warning';
  message: string;
  path: string; // 错误路径，如 "steps[0].actions[1]"
}

/**
 * 验证结果
 */
export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
}

// ==================== 常量 ====================

/**
 * 最大嵌套深度
 */
export const MAX_NESTING_DEPTH = 5;

/**
 * 最大循环次数
 */
export const MAX_LOOP_ITERATIONS = 1000;

/**
 * 最大延时时间（毫秒）
 */
export const MAX_DELAY_MS = 24 * 60 * 60 * 1000; // 24小时

/**
 * 任务编排器 - 工具函数
 */

import type {
  Task,
  Step,
  TaskAction,
  DelayAction,
  ParallelLoop,
  SubStep,
  ValidationResult,
  ValidationError,
  GenerateIdFunction
} from '../types/task-orchestrator';
import type { DeviceConfig } from '../types';

// ==================== ID生成 ====================

/**
 * 生成唯一ID
 */
export const generateId: GenerateIdFunction = () => 
  `${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

// ==================== 动作创建 ====================

/**
 * 创建设备动作
 */
export function createTaskAction(device: DeviceConfig): TaskAction {
  const isPwm = device.type === 'pwm';
  const value = isPwm ? 50 : true;
  const duration = 5000; // 5秒 = 5000毫秒

  return {
    id: generateId(),
    deviceId: device.id,
    actionType: isPwm ? 'power' : 'state',
    value,
    duration,
    name: `${device.name} - ${isPwm ? '50%功率' : '开启'} 5秒`
  };
}

/**
 * 创建延时动作
 */
export function createDelayAction(delaySeconds: number = 3): DelayAction {
  return {
    id: generateId(),
    type: 'delay',
    name: `延时 ${delaySeconds}秒`,
    delayMs: delaySeconds * 1000,
    actions: [],
    parallelLoops: []
  };
}

/**
 * 创建子步骤
 */
export function createSubStep(name?: string): SubStep {
  return {
    id: generateId(),
    name: name || '新子步骤',
    actions: []
  };
}

/**
 * 创建并行循环
 */
export function createParallelLoop(iterations: number = 3): ParallelLoop {
  // 默认创建第一个子步骤
  const defaultSubStep = createSubStep('子步骤 1');

  return {
    id: generateId(),
    name: `循环 ${iterations} 次`,
    iterations,
    intervalMs: 1000, // 1秒间隔
    subSteps: [defaultSubStep]
  };
}

/**
 * 创建步骤
 */
export function createStep(name?: string): Step {
  return {
    id: generateId(),
    name: name || '新步骤',
    actions: [],
    parallelLoops: []
  };
}

/**
 * 创建任务
 */
export function createTask(name?: string): Task {
  return {
    id: generateId(),
    name: name || '新任务',
    steps: [],
    createdAt: Date.now(),
    updatedAt: Date.now()
  };
}

// ==================== 更新函数 ====================

/**
 * 更新动作名称
 */
export function updateActionName(action: TaskAction, device: DeviceConfig): TaskAction {
  const isPwm = device.type === 'pwm';
  const valueText = isPwm ? `${action.value}%功率` : (action.value ? '开启' : '关闭');
  const durationText = `${(action.duration / 1000).toFixed(1)}秒`;
  
  return {
    ...action,
    name: `${device.name} - ${valueText} ${durationText}`
  };
}

/**
 * 更新延时名称
 */
export function updateDelayName(delay: DelayAction): DelayAction {
  return {
    ...delay,
    name: `延时 ${delay.delayMs / 1000}秒`
  };
}

/**
 * 更新循环名称
 */
export function updateLoopName(loop: ParallelLoop): ParallelLoop {
  return {
    ...loop,
    name: `循环 ${loop.iterations} 次`
  };
}

// ==================== 验证函数 ====================

/**
 * 验证任务结构
 */
export function validateTask(task: Task, devices: DeviceConfig[]): ValidationResult {
  const errors: ValidationError[] = [];
  
  // 验证任务基本信息
  if (!task.name.trim()) {
    errors.push({
      type: 'error',
      message: '任务名称不能为空',
      path: 'task.name'
    });
  }
  
  if (task.steps.length === 0) {
    errors.push({
      type: 'warning',
      message: '任务没有步骤',
      path: 'task.steps'
    });
  }
  
  // 验证每个步骤
  task.steps.forEach((step, stepIndex) => {
    validateStep(step, devices, `steps[${stepIndex}]`, errors);
  });
  
  return {
    isValid: errors.filter(e => e.type === 'error').length === 0,
    errors
  };
}

/**
 * 验证步骤
 */
function validateStep(step: Step, devices: DeviceConfig[], path: string, errors: ValidationError[]) {
  if (!step.name.trim()) {
    errors.push({
      type: 'error',
      message: '步骤名称不能为空',
      path: `${path}.name`
    });
  }
  
  if (step.actions.length === 0 && step.parallelLoops.length === 0) {
    errors.push({
      type: 'warning',
      message: '步骤没有内容',
      path: `${path}`
    });
  }
  
  // 验证动作
  step.actions.forEach((action, actionIndex) => {
    validateAction(action, devices, `${path}.actions[${actionIndex}]`, errors);
  });
  
  // 验证循环
  step.parallelLoops.forEach((loop, loopIndex) => {
    validateLoop(loop, devices, `${path}.parallelLoops[${loopIndex}]`, errors);
  });
}

/**
 * 验证动作
 */
function validateAction(action: TaskAction | DelayAction, devices: DeviceConfig[], path: string, errors: ValidationError[]) {
  if ('type' in action && action.type === 'delay') {
    // 验证延时动作
    const delayAction = action as DelayAction;
    if (delayAction.delayMs <= 0) {
      errors.push({
        type: 'error',
        message: '延时时间必须大于0',
        path: `${path}.delayMs`
      });
    }
    
    // 递归验证延时内的动作
    delayAction.actions.forEach((nestedAction, nestedIndex) => {
      validateAction(nestedAction, devices, `${path}.actions[${nestedIndex}]`, errors);
    });
  } else {
    // 验证普通动作
    const taskAction = action as TaskAction;
    const device = devices.find(d => d.id === taskAction.deviceId);
    
    if (!device) {
      errors.push({
        type: 'error',
        message: `设备不存在: ${taskAction.deviceId}`,
        path: `${path}.deviceId`
      });
    } else {
      // 验证动作值
      if (device.type === 'pwm') {
        const power = taskAction.value as number;
        if (power < 0 || power > 100) {
          errors.push({
            type: 'error',
            message: 'PWM功率必须在0-100之间',
            path: `${path}.value`
          });
        }
      }
    }
    
    if (taskAction.duration <= 0) {
      errors.push({
        type: 'error',
        message: '持续时间必须大于0',
        path: `${path}.duration`
      });
    }
  }
}

/**
 * 验证循环
 */
function validateLoop(loop: ParallelLoop, devices: DeviceConfig[], path: string, errors: ValidationError[]) {
  if (loop.iterations <= 0) {
    errors.push({
      type: 'error',
      message: '循环次数必须大于0',
      path: `${path}.iterations`
    });
  }
  
  if (loop.intervalMs < 0) {
    errors.push({
      type: 'error',
      message: '循环间隔不能为负数',
      path: `${path}.intervalMs`
    });
  }
  
  if (loop.subSteps.length === 0) {
    errors.push({
      type: 'warning',
      message: '循环没有子步骤',
      path: `${path}.subSteps`
    });
  }
  
  // 验证子步骤
  loop.subSteps.forEach((subStep, subStepIndex) => {
    validateSubStep(subStep, devices, `${path}.subSteps[${subStepIndex}]`, errors);
  });
}

/**
 * 验证子步骤
 */
function validateSubStep(subStep: SubStep, devices: DeviceConfig[], path: string, errors: ValidationError[]) {
  if (!subStep.name.trim()) {
    errors.push({
      type: 'error',
      message: '子步骤名称不能为空',
      path: `${path}.name`
    });
  }
  
  if (subStep.actions.length === 0) {
    errors.push({
      type: 'warning',
      message: '子步骤没有动作',
      path: `${path}.actions`
    });
  }
  
  // 验证子步骤中的动作
  subStep.actions.forEach((action, actionIndex) => {
    validateAction(action, devices, `${path}.actions[${actionIndex}]`, errors);
  });
}

// ==================== 格式化函数 ====================

/**
 * 格式化时间
 */
export function formatTime(seconds: number): string {
  if (seconds < 60) return `${seconds.toFixed(1)}秒`;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return remainingSeconds > 0 ? `${minutes}分${remainingSeconds.toFixed(1)}秒` : `${minutes}分钟`;
}

/**
 * 计算任务总时长（估算）
 */
export function calculateTaskDuration(task: Task): number {
  let totalDuration = 0;
  
  task.steps.forEach(step => {
    let stepDuration = 0;
    
    // 计算步骤中动作的最大持续时间（并行执行）
    const actionDurations = step.actions.map(action => calculateActionDuration(action));
    const maxActionDuration = Math.max(0, ...actionDurations);
    
    // 计算循环的持续时间
    const loopDurations = step.parallelLoops.map(loop => calculateLoopDuration(loop));
    const maxLoopDuration = Math.max(0, ...loopDurations);
    
    // 步骤持续时间是动作和循环的最大值（并行执行）
    stepDuration = Math.max(maxActionDuration, maxLoopDuration);
    totalDuration += stepDuration;
  });
  
  return totalDuration;
}

/**
 * 计算动作持续时间
 */
function calculateActionDuration(action: TaskAction | DelayAction): number {
  if ('type' in action && action.type === 'delay') {
    const delayAction = action as DelayAction;

    // 计算延时内动作的最大持续时间
    const actionsDuration = delayAction.actions.reduce((max, nestedAction) =>
      Math.max(max, calculateActionDuration(nestedAction)), 0
    );

    // 计算延时内循环的最大持续时间
    const loopsDuration = delayAction.parallelLoops.reduce((max, loop) =>
      Math.max(max, calculateLoopDuration(loop)), 0
    );

    // 延时总时间 = 延时时间 + max(动作时间, 循环时间)
    return delayAction.delayMs + Math.max(actionsDuration, loopsDuration);
  } else {
    const taskAction = action as TaskAction;
    return taskAction.duration;
  }
}

/**
 * 计算循环持续时间
 */
function calculateLoopDuration(loop: ParallelLoop): number {
  const subStepDuration = loop.subSteps.reduce((total, subStep) => {
    const subStepActionDuration = subStep.actions.reduce((max, action) => 
      Math.max(max, calculateActionDuration(action)), 0
    );
    return total + subStepActionDuration;
  }, 0);
  
  // 循环间隔是在循环之间，不是每次循环都加
  // 3次循环只有2个间隔：循环1结束->间隔->循环2结束->间隔->循环3结束
  const totalLoopTime = subStepDuration * loop.iterations;
  const totalIntervalTime = loop.intervalMs * (loop.iterations - 1);

  return totalLoopTime + totalIntervalTime;
}

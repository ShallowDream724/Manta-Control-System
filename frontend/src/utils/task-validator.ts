/**
 * 任务验证工具
 * 提供任务配置的验证逻辑
 */

import type { Task, Step, TaskAction, DelayAction, ParallelLoop, SubStep } from '../types/task-orchestrator';
import type { DeviceConfig } from '../types';

export interface ValidationError {
  id: string;
  type: 'error' | 'warning';
  message: string;
  location: {
    stepIndex?: number;
    actionId?: string;
    loopId?: string;
    subStepId?: string;
  };
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationError[];
}

/**
 * 验证完整任务
 */
export function validateTask(task: Task, devices: DeviceConfig[]): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationError[] = [];

  // 基础验证
  if (!task.name.trim()) {
    errors.push({
      id: 'task-name-empty',
      type: 'error',
      message: '任务名称不能为空',
      location: {}
    });
  }

  if (task.steps.length === 0) {
    warnings.push({
      id: 'task-no-steps',
      type: 'warning',
      message: '任务没有步骤',
      location: {}
    });
  }

  // 验证每个步骤
  task.steps.forEach((step, stepIndex) => {
    const stepResult = validateStep(step, devices, stepIndex);
    errors.push(...stepResult.errors);
    warnings.push(...stepResult.warnings);
  });

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * 验证步骤
 */
export function validateStep(step: Step, devices: DeviceConfig[], stepIndex: number): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationError[] = [];

  // 步骤名称验证
  if (!step.name.trim()) {
    errors.push({
      id: `step-${stepIndex}-name-empty`,
      type: 'error',
      message: `步骤 ${stepIndex + 1} 名称不能为空`,
      location: { stepIndex }
    });
  }

  // 步骤内容验证
  if (step.actions.length === 0 && step.parallelLoops.length === 0) {
    warnings.push({
      id: `step-${stepIndex}-empty`,
      type: 'warning',
      message: `步骤 ${stepIndex + 1} 没有内容`,
      location: { stepIndex }
    });
  }

  // 验证动作
  step.actions.forEach(action => {
    const actionResult = validateAction(action, devices, stepIndex);
    errors.push(...actionResult.errors);
    warnings.push(...actionResult.warnings);
  });

  // 验证循环
  step.parallelLoops.forEach(loop => {
    const loopResult = validateLoop(loop, devices, stepIndex);
    errors.push(...loopResult.errors);
    warnings.push(...loopResult.warnings);
  });

  // 设备冲突检测
  const conflictResult = detectDeviceConflicts(step, devices, stepIndex);
  warnings.push(...conflictResult.warnings);

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * 验证动作
 */
export function validateAction(
  action: TaskAction | DelayAction, 
  devices: DeviceConfig[], 
  stepIndex: number
): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationError[] = [];

  if ('type' in action && action.type === 'delay') {
    // 延时动作验证
    const delayAction = action as DelayAction;
    
    if (delayAction.delayMs <= 0) {
      errors.push({
        id: `delay-${action.id}-invalid-time`,
        type: 'error',
        message: '延时时间必须大于0',
        location: { stepIndex, actionId: action.id }
      });
    }

    if (delayAction.delayMs > 3600000) { // 1小时
      warnings.push({
        id: `delay-${action.id}-long-time`,
        type: 'warning',
        message: '延时时间超过1小时，请确认是否正确',
        location: { stepIndex, actionId: action.id }
      });
    }

    // 递归验证嵌套动作
    delayAction.actions.forEach(nestedAction => {
      const nestedResult = validateAction(nestedAction, devices, stepIndex);
      errors.push(...nestedResult.errors);
      warnings.push(...nestedResult.warnings);
    });

    // 验证嵌套循环
    delayAction.parallelLoops.forEach(loop => {
      const loopResult = validateLoop(loop, devices, stepIndex);
      errors.push(...loopResult.errors);
      warnings.push(...loopResult.warnings);
    });
  } else {
    // 设备动作验证
    const taskAction = action as TaskAction;
    
    const device = devices.find(d => d.id === taskAction.deviceId);
    if (!device) {
      errors.push({
        id: `action-${action.id}-device-not-found`,
        type: 'error',
        message: '设备不存在',
        location: { stepIndex, actionId: action.id }
      });
      return { isValid: false, errors, warnings };
    }

    // 验证动作类型和值
    if (device.type === 'pwm' && taskAction.actionType === 'power') {
      const power = taskAction.value as number;
      if (power < 0 || power > 100) {
        errors.push({
          id: `action-${action.id}-invalid-power`,
          type: 'error',
          message: 'PWM功率值必须在0-100之间',
          location: { stepIndex, actionId: action.id }
        });
      }
    } else if (device.type === 'digital' && taskAction.actionType === 'state') {
      if (typeof taskAction.value !== 'boolean') {
        errors.push({
          id: `action-${action.id}-invalid-state`,
          type: 'error',
          message: '数字设备状态值必须是布尔值',
          location: { stepIndex, actionId: action.id }
        });
      }
    } else {
      errors.push({
        id: `action-${action.id}-type-mismatch`,
        type: 'error',
        message: '动作类型与设备类型不匹配',
        location: { stepIndex, actionId: action.id }
      });
    }

    // 验证持续时间
    if (taskAction.duration <= 0) {
      errors.push({
        id: `action-${action.id}-invalid-duration`,
        type: 'error',
        message: '动作持续时间必须大于0',
        location: { stepIndex, actionId: action.id }
      });
    }

    if (taskAction.duration > 3600000) { // 1小时
      warnings.push({
        id: `action-${action.id}-long-duration`,
        type: 'warning',
        message: '动作持续时间超过1小时，请确认是否正确',
        location: { stepIndex, actionId: action.id }
      });
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * 验证循环
 */
export function validateLoop(loop: ParallelLoop, devices: DeviceConfig[], stepIndex: number): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationError[] = [];

  // 循环参数验证
  if (loop.iterations <= 0) {
    errors.push({
      id: `loop-${loop.id}-invalid-iterations`,
      type: 'error',
      message: '循环次数必须大于0',
      location: { stepIndex, loopId: loop.id }
    });
  }

  if (loop.iterations > 1000) {
    warnings.push({
      id: `loop-${loop.id}-many-iterations`,
      type: 'warning',
      message: '循环次数超过1000次，请确认是否正确',
      location: { stepIndex, loopId: loop.id }
    });
  }

  if (loop.intervalMs < 0) {
    errors.push({
      id: `loop-${loop.id}-invalid-interval`,
      type: 'error',
      message: '循环间隔不能为负数',
      location: { stepIndex, loopId: loop.id }
    });
  }

  // 子步骤验证
  if (loop.subSteps.length === 0) {
    warnings.push({
      id: `loop-${loop.id}-no-substeps`,
      type: 'warning',
      message: '循环没有子步骤',
      location: { stepIndex, loopId: loop.id }
    });
  }

  loop.subSteps.forEach(subStep => {
    const subStepResult = validateSubStep(subStep, devices, stepIndex, loop.id);
    errors.push(...subStepResult.errors);
    warnings.push(...subStepResult.warnings);
  });

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * 验证子步骤
 */
export function validateSubStep(
  subStep: SubStep, 
  devices: DeviceConfig[], 
  stepIndex: number, 
  loopId: string
): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationError[] = [];

  if (!subStep.name.trim()) {
    errors.push({
      id: `substep-${subStep.id}-name-empty`,
      type: 'error',
      message: '子步骤名称不能为空',
      location: { stepIndex, loopId, subStepId: subStep.id }
    });
  }

  if (subStep.actions.length === 0) {
    warnings.push({
      id: `substep-${subStep.id}-empty`,
      type: 'warning',
      message: '子步骤没有动作',
      location: { stepIndex, loopId, subStepId: subStep.id }
    });
  }

  // 验证子步骤中的动作
  subStep.actions.forEach(action => {
    const actionResult = validateAction(action, devices, stepIndex);
    errors.push(...actionResult.errors);
    warnings.push(...actionResult.warnings);
  });

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * 检测设备冲突
 */
export function detectDeviceConflicts(step: Step, devices: DeviceConfig[], stepIndex: number): ValidationResult {
  const warnings: ValidationError[] = [];
  const deviceUsage = new Map<string, number>();

  // 统计设备使用次数
  const countDeviceUsage = (actions: (TaskAction | DelayAction)[]) => {
    actions.forEach(action => {
      if ('deviceId' in action) {
        const count = deviceUsage.get(action.deviceId) || 0;
        deviceUsage.set(action.deviceId, count + 1);
      } else if ('type' in action && action.type === 'delay') {
        countDeviceUsage(action.actions);
      }
    });
  };

  countDeviceUsage(step.actions);

  // 检查循环中的设备使用
  step.parallelLoops.forEach(loop => {
    loop.subSteps.forEach(subStep => {
      countDeviceUsage(subStep.actions);
    });
  });

  // 生成冲突警告
  deviceUsage.forEach((count, deviceId) => {
    if (count > 1) {
      const device = devices.find(d => d.id === deviceId);
      if (device) {
        warnings.push({
          id: `step-${stepIndex}-device-${deviceId}-conflict`,
          type: 'warning',
          message: `设备 "${device.name}" 在步骤 ${stepIndex + 1} 中被使用 ${count} 次，可能产生冲突`,
          location: { stepIndex }
        });
      }
    }
  });

  return {
    isValid: true,
    errors: [],
    warnings
  };
}

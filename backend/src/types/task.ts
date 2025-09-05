/**
 * 任务相关类型定义
 * 与前端保持一致
 */

export interface Task {
  id: string;
  name: string;
  steps: Step[];
  createdAt: number;
  updatedAt: number;
}

export interface Step {
  id: string;
  name: string;
  actions: (TaskAction | DelayAction)[];
  parallelLoops: ParallelLoop[];
}

export interface TaskAction {
  id: string;
  deviceId: string;
  actionType: 'power' | 'state';
  value: number | boolean;
  duration: number;
  name: string;
}

export interface DelayAction {
  id: string;
  type: 'delay';
  name: string;
  delayMs: number;
  actions: (TaskAction | DelayAction)[];
  parallelLoops: ParallelLoop[];
}

export interface ParallelLoop {
  id: string;
  name: string;
  iterations: number;
  intervalMs: number;
  subSteps: SubStep[];
}

export interface SubStep {
  id: string;
  name: string;
  actions: (TaskAction | DelayAction)[];
}

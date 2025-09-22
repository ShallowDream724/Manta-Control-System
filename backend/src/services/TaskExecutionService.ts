import { Logger } from 'winston';
import { UnifiedLogService } from './UnifiedLogService';
import type { Task, Step, TaskAction, DelayAction, ParallelLoop, SubStep } from '../types/task';

// 延时状态
interface DelayState {
  endTime: number;
  triggered: boolean;
  actions: (TaskAction | DelayAction)[];
  parallelLoops: ParallelLoop[];
}

// 循环状态
interface LoopState {
  iteration: number;        // 当前第几次迭代 (0-based)
  subStep: number;         // 当前第几个子步骤 (0-based)
  nextTime: number;        // 下次执行时间
  subStepEndTime: number | null;  // 当前子步骤结束时间
  totalIterations: number; // 总迭代次数
  intervalMs: number;      // 循环间隔
  loop: ParallelLoop;      // 循环定义
}

// 执行状态
interface ExecutionState {
  task: Task;
  stepIndex: number;
  stepStartTime: number;
  delays: DelayState[];
  loops: LoopState[];
  directActionsExecuted: boolean; // 标记普通动作是否已执行
  isCompleted: boolean;
}

/**
 * 任务执行服务 - 核心调度逻辑（状态机版本）
 */
export class TaskExecutionService {
  private executionTimer: NodeJS.Timeout | null = null;
  private taskTimeoutTimer: NodeJS.Timeout | null = null;
  private isRunning = false;
  private executionState: ExecutionState | null = null;

  constructor(
    private logger: Logger,
    private logService: UnifiedLogService
  ) {}

  /**
   * 开始执行任务（状态机版本）
   */
  async executeTask(task: Task, estimatedDuration?: number): Promise<void> {
    this.logService.logTaskExecution('START', `Starting task: ${task.name}`, {
      taskId: task.id,
      stepCount: task.steps.length
    });

    // 清理之前的调度
    this.stopExecution();

    // 初始化执行状态
    const startTime = Date.now();
    this.executionState = this.initializeExecutionState(task, startTime);

    // 使用前端传递的预计时长，如果没有则计算
    const finalEstimatedDuration = estimatedDuration || this.calculateTaskDuration(task);
    const timeoutDuration = finalEstimatedDuration + 30000; // 预计时间 + 30秒

    this.logService.logTaskExecution('SCHEDULE', `Initialized task execution state`, {
      taskId: task.id,
      stepCount: task.steps.length,
      startTime: new Date(startTime).toISOString(),
      estimatedDuration: `${Math.round(finalEstimatedDuration/1000)}s`,
      timeoutDuration: `${Math.round(timeoutDuration/1000)}s`
    });

    // 开始调度循环
    this.startScheduler();

    // 设置任务超时保护（预计时间 + 30秒）
    this.taskTimeoutTimer = setTimeout(() => {
      this.logger.warn(`Task execution timeout after ${Math.round(timeoutDuration/1000)}s, stopping...`);
      this.stopExecution();
    }, timeoutDuration);

    this.logger.info(`Task execution started with state machine approach`);
  }

  /**
   * 计算任务预计时长（毫秒）- 简化版本
   */
  private calculateTaskDuration(task: Task): number {
    // 简化计算：假设每个步骤平均5秒，每个循环额外加时间
    let totalDuration = 0;

    task.steps.forEach(step => {
      // 基础步骤时间：5秒
      let stepDuration = 5000;

      // 每个动作额外加1秒
      stepDuration += step.actions.length * 1000;

      // 每个循环根据迭代次数计算
      step.parallelLoops.forEach(loop => {
        const iterations = (loop as any).iterations || 1;
        const interval = (loop as any).interval || 1000;
        stepDuration += iterations * interval;
      });

      totalDuration += stepDuration;
    });

    // 最小5秒，最大30分钟
    return Math.max(5000, Math.min(totalDuration, 30 * 60 * 1000));
  }

  /**
   * 停止执行
   */
  stopExecution(): void {
    if (this.executionTimer) {
      clearInterval(this.executionTimer);
      this.executionTimer = null;
    }
    if (this.taskTimeoutTimer) {
      clearTimeout(this.taskTimeoutTimer);
      this.taskTimeoutTimer = null;
    }
    this.isRunning = false;
    this.logger.info('Task execution stopped');
  }



  /**
   * 启动调度器 - 每100ms检查一次（状态机版本）
   */
  private startScheduler(): void {
    this.isRunning = true;

    this.executionTimer = setInterval(() => {
      if (!this.executionState || this.executionState.isCompleted) {
        this.logger.info('Task completed, stopping scheduler');
        this.stopExecution();
        return;
      }

      const now = Date.now();
      const commandsToExecute: TaskAction[] = [];

      // 检查普通动作是否需要执行（只在步骤开始时执行一次）
      this.checkDirectActions(now, commandsToExecute);

      // 检查延时是否到期
      this.checkDelays(now, commandsToExecute);

      // 检查循环是否该执行
      this.checkLoops(now, commandsToExecute);

      // 批量执行命令
      if (commandsToExecute.length > 0) {
        this.executeCommands(commandsToExecute, now);
      }

      // 检查当前步骤是否完成
      this.checkStepCompletion(now);

    }, 100); // 每100ms检查一次
  }



  /**
   * 发送命令到Arduino
   */
  private async sendToArduino(payload: ArduinoPayload): Promise<void> {
    const startTime = Date.now();

    try {
      // 记录发送日志
      this.logService.logArduino('send', `Sending ${payload.cmds.length} commands to Arduino`, {
        commandCount: payload.cmds.length,
        commands: payload.cmds.map(cmd => `${cmd.dev}:${cmd.act}=${cmd.val}`),
        timestamp: payload.ts,
        commandId: payload.id
      });

      // 实际的HTTP请求到Arduino，带超时控制
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const baseUrl = process.env.ARDUINO_BASE_URL || 'http://192.168.4.1';
      const response = await fetch(`${baseUrl}/api/commands`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(payload),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      const responseTime = Date.now() - startTime;

      if (!response.ok) {
        throw new Error(`Arduino HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();

      // 记录接收日志
      this.logService.logArduino('receive', `Arduino responded successfully`, {
        responseTime,
        result,
        status: response.status
      });

      // 同时记录到控制台
      this.logger.info('Arduino commands sent successfully:', {
        commandCount: payload.cmds.length,
        responseTime: `${responseTime}ms`,
        status: response.status,
        commandId: payload.id
      });

    } catch (error) {
      const responseTime = Date.now() - startTime;

      // 记录错误日志
      this.logService.logArduino('send', `Arduino communication failed`, {
        error: error instanceof Error ? error.message : String(error),
        responseTime,
        payload,
        isTimeout: error instanceof Error && error.name === 'AbortError'
      });

      // 同时记录到控制台，便于调试
      this.logger.error('Arduino communication failed:', {
        error: error instanceof Error ? error.message : String(error),
        responseTime,
        isTimeout: error instanceof Error && error.name === 'AbortError',
        payload: {
          timestamp: payload.ts,
          commandCount: payload.cmds.length,
          commandId: payload.id
        }
      });

      // 不抛出错误，继续执行其他命令
    }
  }

  /**
   * 获取调度状态（状态机版本）
   */
  getScheduleStatus() {
    if (!this.executionState) {
      return {
        isRunning: this.isRunning,
        totalSteps: 0,
        currentStep: 0,
        activeLoops: 0,
        pendingDelays: 0,
        isCompleted: true
      };
    }

    const activeLoops = this.executionState.loops.filter(loop =>
      loop.iteration < loop.totalIterations
    ).length;

    const pendingDelays = this.executionState.delays.filter(delay =>
      !delay.triggered
    ).length;

    return {
      isRunning: this.isRunning,
      totalSteps: this.executionState.task.steps.length,
      currentStep: this.executionState.stepIndex + 1,
      activeLoops,
      pendingDelays,
      isCompleted: this.executionState.isCompleted
    };
  }

  /**
   * 生成命令ID
   */
  private generateCommandId(): string {
    return `cmd_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  /**
   * 映射动作类型到Arduino期望的格式
   */
  private mapActionType(actionType: string): string {
    const actionMap: Record<string, string> = {
      'power': 'setPwr',
      'state': 'setSt'
    };
    return actionMap[actionType] || actionType;
  }

  /**
   * 初始化执行状态
   */
  private initializeExecutionState(task: Task, startTime: number): ExecutionState {
    const firstStep = task.steps[0];
    if (!firstStep) {
      return {
        task,
        stepIndex: 0,
        stepStartTime: startTime,
        delays: [],
        loops: [],
        directActionsExecuted: false,
        isCompleted: true
      };
    }

    return {
      task,
      stepIndex: 0,
      stepStartTime: startTime,
      delays: this.initializeDelayStates(firstStep, startTime),
      loops: this.initializeLoopStates(firstStep, startTime),
      directActionsExecuted: false,
      isCompleted: false
    };
  }

  /**
   * 初始化延时状态
   */
  private initializeDelayStates(step: Step, stepStartTime: number): DelayState[] {
    const delayStates: DelayState[] = [];

    for (const action of step.actions) {
      if ('type' in action && action.type === 'delay') {
        const delayAction = action as DelayAction;
        delayStates.push({
          endTime: stepStartTime + delayAction.delayMs,
          triggered: false,
          actions: delayAction.actions,
          parallelLoops: delayAction.parallelLoops
        });
      }
    }

    return delayStates;
  }

  /**
   * 初始化循环状态
   */
  private initializeLoopStates(step: Step, stepStartTime: number): LoopState[] {
    const loopStates: LoopState[] = [];

    for (const loop of step.parallelLoops) {
      loopStates.push({
        iteration: 0,
        subStep: 0,
        nextTime: stepStartTime,
        subStepEndTime: null,
        totalIterations: loop.iterations,
        intervalMs: loop.intervalMs,
        loop: loop
      });
    }

    return loopStates;
  }

  /**
   * 检查普通动作是否需要执行
   */
  private checkDirectActions(now: number, commandsToExecute: TaskAction[]): void {
    if (!this.executionState || this.executionState.directActionsExecuted) return;

    const currentStep = this.executionState.task.steps[this.executionState.stepIndex];
    if (!currentStep) return;

    // 收集步骤中的普通动作（非延时、非循环）
    for (const action of currentStep.actions) {
      if (!('type' in action)) {
        // 这是普通动作
        commandsToExecute.push(action as TaskAction);
      }
    }

    // 标记普通动作已执行
    if (commandsToExecute.length > 0) {
      this.executionState.directActionsExecuted = true;
      this.logger.info(`[SCHEDULER] Executing ${commandsToExecute.length} direct actions`);
    }
  }

  /**
   * 检查延时是否到期
   */
  private checkDelays(now: number, commandsToExecute: TaskAction[]): void {
    if (!this.executionState) return;

    for (const delayState of this.executionState.delays) {
      if (!delayState.triggered && now >= delayState.endTime) {
        delayState.triggered = true;

        // 执行延时内的直接动作
        for (const action of delayState.actions) {
          if (!('type' in action)) {
            commandsToExecute.push(action as TaskAction);
          }
        }

        // 初始化延时内的循环
        for (const loop of delayState.parallelLoops) {
          this.executionState.loops.push({
            iteration: 0,
            subStep: 0,
            nextTime: now,
            subStepEndTime: null,
            totalIterations: loop.iterations,
            intervalMs: loop.intervalMs,
            loop: loop
          });
        }
      }
    }
  }

  /**
   * 检查循环是否该执行
   */
  private checkLoops(now: number, commandsToExecute: TaskAction[]): void {
    if (!this.executionState) return;

    for (const loopState of this.executionState.loops) {
      // 检查是否该执行下一个子步骤
      if (now >= loopState.nextTime && loopState.iteration < loopState.totalIterations) {

        // 如果有子步骤正在执行，检查是否完成
        if (loopState.subStepEndTime !== null && now < loopState.subStepEndTime) {
          // 子步骤还在执行中，跳过
          continue;
        }

        const currentSubStep = loopState.loop.subSteps[loopState.subStep];

        if (currentSubStep) {
          // 收集当前子步骤的所有动作
          for (const action of currentSubStep.actions) {
            if (!('type' in action)) {
              commandsToExecute.push(action as TaskAction);
            }
          }

          // 计算子步骤结束时间
          const durations = currentSubStep.actions.map(action =>
            ('type' in action) ? 0 : (action as TaskAction).duration
          );
          const maxDuration = durations.length > 0 ? Math.max(...durations) : 0;
          loopState.subStepEndTime = now + maxDuration;

          this.logger.info(`[SCHEDULER] Loop ${loopState.iteration + 1}/${loopState.totalIterations}, SubStep ${loopState.subStep + 1}/${loopState.loop.subSteps.length}, Duration: ${maxDuration}ms`);
        }

        // 推进循环状态
        this.advanceLoopState(loopState, now);
      }
    }
  }

  /**
   * 推进循环状态
   */
  private advanceLoopState(loopState: LoopState, now: number): void {
    loopState.subStep++;

    // 如果当前循环的所有子步骤都完成了
    if (loopState.subStep >= loopState.loop.subSteps.length) {
      loopState.iteration++;
      loopState.subStep = 0;

      // 如果还有更多迭代，设置下次执行时间为当前子步骤完成后 + 间隔
      if (loopState.iteration < loopState.totalIterations) {
        // 等待当前子步骤完成，然后加上循环间隔
        const nextIterationTime = (loopState.subStepEndTime || now) + loopState.intervalMs;
        loopState.nextTime = nextIterationTime;

        this.logger.info(`[SCHEDULER] Loop iteration ${loopState.iteration} completed, next iteration at ${new Date(nextIterationTime).toLocaleTimeString()}`);
      }
    } else {
      // 继续下一个子步骤，等待当前子步骤完成
      loopState.nextTime = loopState.subStepEndTime || now;
    }
  }

  /**
   * 执行命令（状态机版本）
   */
  private executeCommands(commands: TaskAction[], timestamp: number): void {
    // 按设备分组，处理同设备的冲突
    const deviceCommands = new Map<string, TaskAction>();

    commands.forEach(cmd => {
      const existing = deviceCommands.get(cmd.deviceId);
      if (existing) {
        this.logger.warn(`Device ${cmd.deviceId} has conflicting commands, using latest`);
      }
      deviceCommands.set(cmd.deviceId, cmd);
    });

    const finalCommands = Array.from(deviceCommands.values());

    // 生成命令ID
    const commandId = this.generateCommandId();

    // 构造Arduino期望的压缩格式
    const arduinoPayload = {
      id: commandId,
      ts: timestamp,
      cmds: finalCommands.map(cmd => ({
        dev: cmd.deviceId,
        act: this.mapActionType(cmd.actionType),
        val: cmd.value,
        dur: cmd.duration
      }))
    };

    // 发送到Arduino
    this.sendToArduino(arduinoPayload);

    // 详细日志
    this.logger.info(`[SCHEDULER] ${new Date(timestamp).toISOString()}`);
    this.logger.info(`  - Executing ${finalCommands.length} commands`);
    finalCommands.forEach(cmd => {
      this.logger.info(`  - ${cmd.deviceId}: ${cmd.actionType}=${cmd.value} (${cmd.duration}ms)`);
    });
  }

  /**
   * 检查步骤完成状态
   */
  private checkStepCompletion(now: number): void {
    if (!this.executionState) return;

    const currentStep = this.executionState.task.steps[this.executionState.stepIndex];
    if (!currentStep) {
      this.executionState.isCompleted = true;
      return;
    }

    // 检查所有延时是否都已触发
    const allDelaysTriggered = this.executionState.delays.every(delay => delay.triggered);

    // 检查所有循环是否都已完成
    const allLoopsCompleted = this.executionState.loops.every(loop =>
      loop.iteration >= loop.totalIterations
    );

    // 如果当前步骤完成，推进到下一步骤
    if (allDelaysTriggered && allLoopsCompleted) {
      this.advanceToNextStep(now);
    }
  }

  /**
   * 推进到下一步骤
   */
  private advanceToNextStep(now: number): void {
    if (!this.executionState) return;

    this.executionState.stepIndex++;

    if (this.executionState.stepIndex >= this.executionState.task.steps.length) {
      // 任务完成
      this.executionState.isCompleted = true;
      this.logger.info('Task execution completed');
      return;
    }

    // 初始化新步骤
    const nextStep = this.executionState.task.steps[this.executionState.stepIndex];
    this.executionState.stepStartTime = now;
    this.executionState.delays = this.initializeDelayStates(nextStep, now);
    this.executionState.loops = this.initializeLoopStates(nextStep, now);

    this.logger.info(`Advanced to step ${this.executionState.stepIndex + 1}: ${nextStep.name}`);
  }
}

// ==================== 类型定义 ====================

interface ArduinoPayload {
  id: string;
  ts: number;
  cmds: Array<{
    dev: string;
    act: string;
    val: any;
    dur: number;
  }>;
}

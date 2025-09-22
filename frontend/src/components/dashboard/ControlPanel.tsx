import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import type { DeviceConfig, DeviceGroup } from '../../types';
import { DEFAULT_DEVICES, DEFAULT_DEVICE_GROUPS } from '../../types';
import DeviceIcon from '../config/DeviceIcon';
import { taskExecutionService } from '../../services/TaskExecutionService';
import { generateId } from '../../utils/task-orchestrator';
import { useResponsive } from '../../hooks/useResponsive';

interface DeviceControlState {
  value: number | boolean;
  durationSec: number; // 0.1s 精度
}

export default function ControlPanel() {
  const { isMobile, isTablet } = useResponsive();
  const [devices, setDevices] = useState<DeviceConfig[]>(DEFAULT_DEVICES);
  const [groups, setGroups] = useState<DeviceGroup[]>(DEFAULT_DEVICE_GROUPS);
  const [control, setControl] = useState<Record<string, DeviceControlState>>({});

  // 加载设备配置
  useEffect(() => {
    const configJson = localStorage.getItem('fish_control_device_config');
    if (configJson) {
      try {
        const cfg = JSON.parse(configJson);
        if (Array.isArray(cfg.devices)) setDevices(cfg.devices);
        if (Array.isArray(cfg.groups)) setGroups(cfg.groups);
      } catch {}
    }
  }, []);

  // 初始化控制状态
  useEffect(() => {
    const next: Record<string, DeviceControlState> = {};
    devices.forEach(d => {
      next[d.id] = {
        value: d.type === 'pwm' ? 50 : false,
        durationSec: 5.0
      };
    });
    setControl(next);
  }, [devices]);

  const onChangeValue = (id: string, v: number | boolean) => {
    setControl(prev => ({ ...prev, [id]: { ...prev[id], value: v } }));
  };
  const onChangePwRatio = (id: string, v: string) => {
    const num = Number(v.replace(',', '.'));
    const rounded = isNaN(num) ? 0 : Math.round(num);
    const clamped = Math.max(0, Math.min(100, rounded));
    setControl(prev => ({ ...prev, [id]: { ...prev[id], value: clamped } }));
  };
  const onChangeDuration = (id: string, v: string) => {
    const num = Number(v.replace(',', '.'));
    const rounded = isNaN(num) ? 0 : Math.round(num * 10) / 10;
    setControl(prev => ({ ...prev, [id]: { ...prev[id], durationSec: rounded } }));
  };

  // 执行单设备控制
  const executeDevice = async (d: DeviceConfig) => {
    const c = control[d.id];
    if (!c) return;

    const now = Date.now();
    const action = {
      id: generateId(),
      deviceId: d.id,
      actionType: d.type === 'pwm' ? 'power' as const : 'state' as const,
      value: c.value,
      duration: Math.round(c.durationSec * 10) * 100,
      name: `${d.name}`
    };

    const task = {
      id: generateId(),
      name: `Quick - ${d.name}`,
      steps: [
        {
          id: generateId(),
          name: 'Quick Step',
          actions: [action],
          parallelLoops: []
        }
      ],
      createdAt: now,
      updatedAt: now
    };

    try {
      await taskExecutionService.startTask(task);
    } catch (e) {
      alert('发送失败，请检查后端连接');
    }
  };

  // 分组显示
  const grouped: Record<string, { group?: DeviceGroup; items: DeviceConfig[] }> = {};
  devices.forEach(d => {
    const g = groups.find(x => x.id === d.groupId);
    const key = g?.id || 'ungrouped';
    if (!grouped[key]) grouped[key] = { group: g, items: [] };
    grouped[key].items.push(d);
  });

  return (
    <div className="space-y-8">
      {Object.values(grouped).map(({ group, items }) => (
        <section key={group?.id || 'ungrouped'}>
          <div className="flex items-center mb-4">
            <span
              className="inline-block w-2.5 h-2.5 rounded-full mr-2"
              style={{ backgroundColor: group?.color || '#94a3b8' }}
            />
            <h3 className="text-base font-semibold text-gray-900">
              {group?.name || '未分组'}
            </h3>
          </div>
          <div className={`grid gap-6 ${isMobile ? 'grid-cols-1' : ''} ${isTablet ? 'grid-cols-2' : ''} ${!isMobile && !isTablet ? 'grid-cols-3' : ''}`}>
            {items.map(d => (
              <div
                key={d.id}
                className="bg-white/80 backdrop-blur-sm border border-gray-200 rounded-2xl p-4 shadow-sm ring-1 ring-gray-200/70 hover:ring-gray-300 hover:shadow-md transition"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-2">
                    <span style={{ color: group?.color || '#64748b' }}>
                      <DeviceIcon iconId={d.icon} className="w-5 h-5" />
                    </span>
                    <div>
                      <div className="font-medium text-gray-900 tracking-tight">{d.name}</div>
                      <div className="text-xs text-gray-500">引脚 {d.pin}</div>
                    </div>
                  </div>
                </div>

                {d.type === 'pwm' ? (
                  <div className="space-y-3">
                    <div className="flex items-center space-x-3">
                      <input
                        type="range"
                        min={0}
                        max={100}
                        value={Number(control[d.id]?.value || 0)}
                        onChange={e => onChangeValue(d.id, Number(e.target.value))}
                        className="flex-1 accent-blue-600 h-1.5"
                      />
                      <input
                        type="number"
                        inputMode="numeric"
                        min={0}
                        max={100}
                        step={1}
                        value={Number(control[d.id]?.value ?? 0)}
                        onChange={e => onChangePwRatio(d.id, e.target.value)}
                        className="w-14 px-2 py-1 text-xs text-gray-800 border border-gray-300 rounded-md text-center no-spinner focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <span className="text-xs text-gray-600">%</span>
                    </div>
                  </div>
                ) : (
                  <div className="bg-gray-100 rounded-xl p-0.5 flex">
                    <button
                      className={`flex-1 px-3 py-1.5 text-sm rounded-lg transition ${
                        control[d.id]?.value
                          ? 'bg-white shadow-sm ring-1 ring-gray-200 text-gray-900'
                          : 'text-gray-700'
                      }`}
                      onClick={() => onChangeValue(d.id, true)}
                    >开启</button>
                    <button
                      className={`flex-1 px-3 py-1.5 text-sm rounded-lg transition ${
                        !control[d.id]?.value
                          ? 'bg-white shadow-sm ring-1 ring-gray-200 text-gray-900'
                          : 'text-gray-700'
                      }`}
                      onClick={() => onChangeValue(d.id, false)}
                    >关闭</button>
                  </div>
                )}

                <div className="mt-4">
                  <label className="text-xs text-gray-600">持续时间(秒)</label>
                  <input
                    type="number"
                    inputMode="decimal"
                    min={0}
                    step={0.1}
                    className={`mt-1 w-full px-2 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 no-spinner ${isMobile ? 'text-sm' : ''}`}
                    value={control[d.id]?.durationSec ?? 5}
                    onChange={e => onChangeDuration(d.id, e.target.value)}
                  />
                </div>

                <div className="mt-4 flex justify-end">
                  <motion.button
                    whileTap={{ scale: 0.98 }}
                    onClick={() => executeDevice(d)}
                    className="px-4 py-2 rounded-xl bg-gray-900 text-white hover:bg-gray-800 shadow-sm"
                  >
                    执行
                  </motion.button>
                </div>
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

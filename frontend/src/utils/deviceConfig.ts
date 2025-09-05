import type { DeviceConfig, ConfigValidationResult } from '../types';
import { DEFAULT_DEVICES } from '../types';

/**
 * 验证设备配置
 */
export function validateDeviceConfig(devices: DeviceConfig[]): ConfigValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // 检查设备ID唯一性
  const ids = devices.map(d => d.id);
  const duplicateIds = ids.filter((id, index) => ids.indexOf(id) !== index);
  if (duplicateIds.length > 0) {
    errors.push(`设备ID重复: ${duplicateIds.join(', ')}`);
  }

  // 检查设备名称唯一性
  const names = devices.map(d => d.name);
  const duplicateNames = names.filter((name, index) => names.indexOf(name) !== index);
  if (duplicateNames.length > 0) {
    warnings.push(`设备名称重复: ${duplicateNames.join(', ')}`);
  }

  // 检查引脚冲突
  const pins = devices.map(d => d.pin);
  const duplicatePins = pins.filter((pin, index) => pins.indexOf(pin) !== index);
  if (duplicatePins.length > 0) {
    errors.push(`引脚冲突: ${duplicatePins.join(', ')}`);
  }

  // 检查引脚范围
  devices.forEach(device => {
    if (device.pin < 0 || device.pin > 50) {
      errors.push(`设备 ${device.name} 的引脚号 ${device.pin} 超出范围 (0-50)`);
    }
  });

  // 检查设备名称长度
  devices.forEach(device => {
    if (device.name.length === 0) {
      errors.push(`设备ID ${device.id} 的名称不能为空`);
    }
    if (device.name.length > 20) {
      warnings.push(`设备 ${device.name} 的名称过长，建议不超过20个字符`);
    }
  });

  // 由于现在type就是信号类型，不需要额外检查匹配性

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * 导出设备配置为JSON
 */
export function exportDeviceConfig(devices: DeviceConfig[]): string {
  const config = {
    version: '1.0',
    timestamp: new Date().toISOString(),
    devices: devices
  };
  return JSON.stringify(config, null, 2);
}

/**
 * 从JSON导入设备配置
 */
export function importDeviceConfig(jsonString: string): DeviceConfig[] {
  try {
    const config = JSON.parse(jsonString);
    
    // 检查配置格式
    if (!config.devices || !Array.isArray(config.devices)) {
      throw new Error('配置文件格式错误：缺少devices数组');
    }

    // 验证每个设备配置
    const devices: DeviceConfig[] = config.devices.map((device: any, index: number) => {
      if (!device.id || typeof device.id !== 'string') {
        throw new Error(`设备 ${index + 1} 缺少有效的ID`);
      }
      if (!device.name || typeof device.name !== 'string') {
        throw new Error(`设备 ${device.id} 缺少有效的名称`);
      }
      if (!['pwm', 'digital'].includes(device.type)) {
        throw new Error(`设备 ${device.id} 的类型必须是 'pwm' 或 'digital'`);
      }
      if (typeof device.pin !== 'number' || device.pin < 0 || device.pin > 99) {
        throw new Error(`设备 ${device.id} 的引脚号必须是0-99之间的数字`);
      }

      return {
        id: device.id,
        name: device.name,
        type: device.type,
        pin: device.pin,
        icon: device.icon || 'bolt',
        description: device.description || ''
      };
    });

    return devices;
  } catch (error) {
    throw new Error(`导入配置失败: ${error instanceof Error ? error.message : '未知错误'}`);
  }
}

/**
 * 获取默认设备配置
 */
export function getDefaultDeviceConfig(): DeviceConfig[] {
  return [...DEFAULT_DEVICES];
}

/**
 * 生成新的设备ID
 */
export function generateDeviceId(existingDevices: DeviceConfig[], type: 'pwm' | 'digital'): string {
  const prefix = type === 'pwm' ? 'pwm' : 'digital';
  const existingIds = existingDevices
    .filter(d => d.id.startsWith(prefix))
    .map(d => {
      const match = d.id.match(/\d+$/);
      return match ? parseInt(match[0]) : 0;
    });

  const maxId = existingIds.length > 0 ? Math.max(...existingIds) : 0;
  return `${prefix}${maxId + 1}`;
}

/**
 * 检查引脚是否可用
 */
export function isPinAvailable(pin: number, devices: DeviceConfig[], excludeDeviceId?: string): boolean {
  return !devices.some(d => d.pin === pin && d.id !== excludeDeviceId);
}

/**
 * 获取下一个可用引脚
 */
export function getNextAvailablePin(devices: DeviceConfig[], preferredPins?: number[]): number {
  const usedPins = new Set(devices.map(d => d.pin));
  
  // 如果有首选引脚，先尝试这些
  if (preferredPins) {
    for (const pin of preferredPins) {
      if (!usedPins.has(pin)) {
        return pin;
      }
    }
  }
  
  // 否则从0开始找第一个可用的
  for (let pin = 0; pin <= 99; pin++) {
    if (!usedPins.has(pin)) {
      return pin;
    }
  }
  
  throw new Error('没有可用的引脚');
}

/**
 * 创建新设备配置
 */
export function createNewDevice(
  existingDevices: DeviceConfig[],
  type: 'pwm' | 'digital',
  name?: string
): DeviceConfig {
  const id = generateDeviceId(existingDevices, type);
  const pin = getNextAvailablePin(existingDevices);
  const defaultName = name || `${type === 'pwm' ? 'PWM设备' : 'Digital设备'}${id.replace(/\D/g, '')}`;

  return {
    id,
    name: defaultName,
    type,
    pin,
    icon: type === 'pwm' ? 'bolt' : 'cog',
    description: ''
  };
}

/**
 * 克隆设备配置
 */
export function cloneDevice(device: DeviceConfig, existingDevices: DeviceConfig[]): DeviceConfig {
  const newId = generateDeviceId(existingDevices, device.type);
  const newPin = getNextAvailablePin(existingDevices);
  
  return {
    ...device,
    id: newId,
    name: `${device.name} (副本)`,
    pin: newPin
  };
}

/**
 * 获取推荐的引脚配置
 */
export function getRecommendedPins(): { pwm: number[]; digital: number[] } {
  return {
    pwm: [3, 5, 6, 9, 10, 11], // PWM引脚
    digital: [2, 4, 7, 8, 12, 13] // 数字引脚
  };
}

/**
 * 检查配置是否为默认配置
 */
export function isDefaultConfig(devices: DeviceConfig[]): boolean {
  if (devices.length !== DEFAULT_DEVICES.length) {
    return false;
  }
  
  return devices.every((device, index) => {
    const defaultDevice = DEFAULT_DEVICES[index];
    return device.id === defaultDevice.id &&
           device.name === defaultDevice.name &&
           device.type === defaultDevice.type &&
           device.pin === defaultDevice.pin;
  });
}

/**
 * 重置为默认配置
 */
export function resetToDefaultConfig(): DeviceConfig[] {
  return getDefaultDeviceConfig();
}

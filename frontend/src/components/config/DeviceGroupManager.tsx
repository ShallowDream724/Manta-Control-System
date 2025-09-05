import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  PlusIcon, 
  PencilIcon, 
  TrashIcon,
  TagIcon
} from '@heroicons/react/24/outline';
import type { DeviceGroup, DeviceConfig } from '../../types';


interface DeviceGroupManagerProps {
  groups: DeviceGroup[];
  devices: DeviceConfig[];
  onGroupsChange: (groups: DeviceGroup[]) => void;
  onDevicesChange: (devices: DeviceConfig[]) => void;
}

interface GroupFormData {
  name: string;
  color: string;
  icon: string;
  description: string;
}

const AVAILABLE_COLORS = [
  '#3B82F6', '#EF4444', '#10B981', '#F59E0B', 
  '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16'
];

const AVAILABLE_ICONS = [
  'bolt', 'fire', 'cog', 'cpu-chip', 'wrench-screwdriver',
  'beaker', 'battery-100', 'signal', 'wifi', 'power'
];

/**
 * 设备分组管理组件
 * 支持分组的增删改查、设备分组分配
 */
export default function DeviceGroupManager({
  groups,
  devices,
  onGroupsChange,
  onDevicesChange
}: DeviceGroupManagerProps) {
  const [editingGroup, setEditingGroup] = useState<DeviceGroup | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState<GroupFormData>({
    name: '',
    color: AVAILABLE_COLORS[0],
    icon: AVAILABLE_ICONS[0],
    description: ''
  });

  // 生成唯一ID
  const generateId = () => `group_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  // 获取分组中的设备数量
  const getDeviceCount = (groupId: string) => {
    return devices.filter(device => device.groupId === groupId).length;
  };

  // 开始创建新分组
  const startCreateGroup = () => {
    setEditingGroup(null);
    setFormData({
      name: '',
      color: AVAILABLE_COLORS[0],
      icon: AVAILABLE_ICONS[0],
      description: ''
    });
    setShowForm(true);
  };

  // 开始编辑分组
  const startEditGroup = (group: DeviceGroup) => {
    setEditingGroup(group);
    setFormData({
      name: group.name,
      color: group.color,
      icon: group.icon,
      description: group.description || ''
    });
    setShowForm(true);
  };

  // 保存分组
  const saveGroup = () => {
    if (!formData.name.trim()) return;

    const groupData = {
      id: editingGroup?.id || generateId(),
      name: formData.name.trim(),
      color: formData.color,
      icon: formData.icon,
      description: formData.description.trim()
    };

    if (editingGroup) {
      // 编辑现有分组
      const updatedGroups = groups.map(group => 
        group.id === editingGroup.id ? groupData : group
      );
      onGroupsChange(updatedGroups);
    } else {
      // 创建新分组
      onGroupsChange([...groups, groupData]);
    }

    setShowForm(false);
    setEditingGroup(null);
  };

  // 删除分组
  const deleteGroup = (groupId: string) => {
    if (getDeviceCount(groupId) > 0) {
      alert('无法删除包含设备的分组，请先移除分组中的设备');
      return;
    }

    const updatedGroups = groups.filter(group => group.id !== groupId);
    onGroupsChange(updatedGroups);
  };

  // 移动设备到分组
  const moveDeviceToGroup = (deviceId: string, groupId: string) => {
    const updatedDevices = devices.map(device =>
      device.id === deviceId ? { ...device, groupId } : device
    );
    onDevicesChange(updatedDevices);
  };

  return (
    <div className="space-y-6">
      {/* 分组列表 */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">设备分组管理</h3>
          <motion.button
            onClick={startCreateGroup}
            whileTap={{ scale: 0.98 }}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <PlusIcon className="w-4 h-4" />
            <span>新建分组</span>
          </motion.button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {groups.map((group) => (
            <motion.div
              key={group.id}
              layout
              className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center space-x-3">
                  <div 
                    className="w-8 h-8 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: group.color + '20' }}
                  >
                    <TagIcon 
                      className="w-4 h-4" 
                      style={{ color: group.color }}
                    />
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900">{group.name}</h4>
                    <p className="text-sm text-gray-500">{getDeviceCount(group.id)} 个设备</p>
                  </div>
                </div>
                <div className="flex items-center space-x-1">
                  <motion.button
                    onClick={() => startEditGroup(group)}
                    whileTap={{ scale: 0.95 }}
                    className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                  >
                    <PencilIcon className="w-4 h-4" />
                  </motion.button>
                  <motion.button
                    onClick={() => deleteGroup(group.id)}
                    whileTap={{ scale: 0.95 }}
                    className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                  >
                    <TrashIcon className="w-4 h-4" />
                  </motion.button>
                </div>
              </div>
              
              {group.description && (
                <p className="text-sm text-gray-600 mb-3">{group.description}</p>
              )}

              {/* 分组中的设备 */}
              <div className="space-y-2">
                {devices
                  .filter(device => device.groupId === group.id)
                  .map(device => (
                    <div
                      key={device.id}
                      className="flex items-center justify-between p-2 bg-gray-50 rounded text-sm"
                    >
                      <span className="font-medium">{device.name}</span>
                      <span className="text-gray-500">引脚 {device.pin}</span>
                    </div>
                  ))
                }
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* 未分组设备 */}
      {devices.filter(device => !device.groupId || !groups.find(g => g.id === device.groupId)).length > 0 && (
        <div>
          <h4 className="text-md font-medium text-gray-900 mb-3">未分组设备</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {devices
              .filter(device => !device.groupId || !groups.find(g => g.id === device.groupId))
              .map(device => (
                <div
                  key={device.id}
                  className="flex items-center justify-between p-3 bg-yellow-50 border border-yellow-200 rounded-lg"
                >
                  <div>
                    <span className="font-medium text-gray-900">{device.name}</span>
                    <span className="text-sm text-gray-500 ml-2">引脚 {device.pin}</span>
                  </div>
                  <select
                    value=""
                    onChange={(e) => moveDeviceToGroup(device.id, e.target.value)}
                    className="text-sm border border-gray-300 rounded px-2 py-1"
                  >
                    <option value="">选择分组</option>
                    {groups.map(group => (
                      <option key={group.id} value={group.id}>{group.name}</option>
                    ))}
                  </select>
                </div>
              ))
            }
          </div>
        </div>
      )}

      {/* 分组表单模态框 */}
      <AnimatePresence>
        {showForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-lg p-6 w-full max-w-md mx-4"
            >
              <h3 className="text-lg font-semibold mb-4">
                {editingGroup ? '编辑分组' : '新建分组'}
              </h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    分组名称
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="输入分组名称"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    分组颜色
                  </label>
                  <div className="flex space-x-2">
                    {AVAILABLE_COLORS.map(color => (
                      <button
                        key={color}
                        onClick={() => setFormData({ ...formData, color })}
                        className={`w-8 h-8 rounded-full border-2 ${
                          formData.color === color ? 'border-gray-400' : 'border-gray-200'
                        }`}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    描述（可选）
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    rows={3}
                    placeholder="输入分组描述"
                  />
                </div>
              </div>

              <div className="flex space-x-3 mt-6">
                <motion.button
                  onClick={() => setShowForm(false)}
                  whileTap={{ scale: 0.98 }}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  取消
                </motion.button>
                <motion.button
                  onClick={saveGroup}
                  whileTap={{ scale: 0.98 }}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  保存
                </motion.button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

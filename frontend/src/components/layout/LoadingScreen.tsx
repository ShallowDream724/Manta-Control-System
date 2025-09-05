
import { motion } from 'framer-motion';

/**
 * 加载屏幕组件
 * 现代化的加载动画，支持三端适配
 */
export default function LoadingScreen() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
      <div className="text-center">
        {/* Logo动画 */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="mb-8"
        >
          <div className="w-20 h-20 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <span className="text-white font-bold text-2xl">MC</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">仿生蝠鲼控制系统</h1>
          <p className="text-gray-600 mt-2">Manta Control System</p>
        </motion.div>

        {/* 加载动画 */}
        <div className="flex items-center justify-center space-x-2 mb-6">
          {[0, 1, 2].map((index) => (
            <motion.div
              key={index}
              className="w-3 h-3 bg-blue-600 rounded-full"
              animate={{
                scale: [1, 1.2, 1],
                opacity: [0.7, 1, 0.7]
              }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                delay: index * 0.2
              }}
            />
          ))}
        </div>

        {/* 加载文本 */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-gray-600"
        >
          正在连接设备...
        </motion.p>

        {/* 进度条 */}
        <div className="w-64 h-1 bg-gray-200 rounded-full mx-auto mt-4 overflow-hidden">
          <motion.div
            className="h-full bg-blue-600 rounded-full"
            initial={{ width: 0 }}
            animate={{ width: "100%" }}
            transition={{ duration: 2, ease: "easeInOut" }}
          />
        </div>
      </div>
    </div>
  );
}

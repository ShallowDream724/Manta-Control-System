// 测试Arduino通信的脚本
// 使用Node.js内置的fetch (Node.js 18+)

async function testArduino() {
  const testPayload = {
    id: "test_cmd_123",
    ts: Date.now(),
    cmds: [
      {
        dev: "pump1",
        act: "setPwr", 
        val: 50,
        dur: 5000
      }
    ]
  };

  console.log('发送测试数据到Arduino:');
  console.log(JSON.stringify(testPayload, null, 2));

  try {
    const response = await fetch('http://192.168.4.1/api/commands', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testPayload)
    });

    console.log('Arduino响应状态:', response.status);
    console.log('Arduino响应头:', Object.fromEntries(response.headers));
    
    const responseText = await response.text();
    console.log('Arduino响应内容:', responseText);

  } catch (error) {
    console.error('连接Arduino失败:', error.message);
  }
}

// 测试Arduino状态
async function testArduinoStatus() {
  try {
    const response = await fetch('http://192.168.4.1/api/status');
    console.log('Arduino状态响应:', response.status);
    const responseText = await response.text();
    console.log('Arduino状态内容:', responseText);
  } catch (error) {
    console.error('获取Arduino状态失败:', error.message);
  }
}

// 获取后端日志
async function getBackendLogs() {
  try {
    const response = await fetch('http://localhost:8080/api/logs?source=arduino&limit=20');
    const logs = await response.json();
    console.log('\n=== Arduino日志 ===');
    if (logs.data && logs.data.length > 0) {
      logs.data.forEach(log => {
        console.log(`[${new Date(log.timestamp).toLocaleTimeString()}] ${log.level.toUpperCase()}: ${log.message}`);
      });
    } else {
      console.log('没有Arduino日志');
    }
  } catch (error) {
    console.error('获取日志失败:', error.message);
  }
}

console.log('=== 测试Arduino状态 ===');
testArduinoStatus().then(() => {
  console.log('\n=== 测试Arduino命令 ===');
  return testArduino();
}).then(() => {
  // 等待一下让日志传输完成
  setTimeout(() => {
    getBackendLogs();
  }, 2000);
});

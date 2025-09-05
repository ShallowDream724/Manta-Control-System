// 测试WiFi日志传输
async function testWiFiLogs() {
  console.log('=== 测试WiFi日志传输 ===');
  
  // 1. 清空现有日志
  console.log('1. 清空现有日志...');
  try {
    await fetch('http://localhost:8080/api/logs/clear', { method: 'POST' });
    console.log('   日志已清空');
  } catch (error) {
    console.log('   清空日志失败:', error.message);
  }
  
  // 2. 发送一个简单命令触发Arduino日志
  console.log('\n2. 发送命令触发Arduino日志...');
  const testPayload = {
    id: "wifi_log_test_" + Date.now(),
    ts: Date.now(),
    cmds: [
      {
        dev: "pump1",
        act: "setPwr", 
        val: 25,
        dur: 1000
      }
    ]
  };

  try {
    const response = await fetch('http://192.168.4.1/api/commands', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testPayload)
    });

    console.log('   Arduino响应状态:', response.status);
    const responseText = await response.text();
    console.log('   Arduino响应内容:', responseText);

  } catch (error) {
    console.error('   连接Arduino失败:', error.message);
    return;
  }

  // 3. 等待日志传输
  console.log('\n3. 等待日志传输...');
  for (let i = 5; i > 0; i--) {
    process.stdout.write(`   等待 ${i} 秒...\r`);
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  console.log('\n   等待完成');

  // 4. 检查后端是否收到Arduino日志
  console.log('\n4. 检查后端日志...');
  try {
    const response = await fetch('http://localhost:8080/api/logs?source=arduino&limit=10');
    const logs = await response.json();
    
    if (logs.data && logs.data.length > 0) {
      console.log(`   ✅ 收到 ${logs.data.length} 条Arduino日志:`);
      logs.data.forEach((log, index) => {
        console.log(`   ${index + 1}. [${new Date(log.timestamp).toLocaleTimeString()}] ${log.level.toUpperCase()}: ${log.message}`);
      });
    } else {
      console.log('   ❌ 没有收到Arduino日志');
      
      // 检查是否有解析错误
      const errorResponse = await fetch('http://localhost:8080/api/logs?level=error&limit=5');
      const errorLogs = await errorResponse.json();
      
      if (errorLogs.data && errorLogs.data.length > 0) {
        console.log('\n   发现错误日志:');
        errorLogs.data.forEach((log, index) => {
          console.log(`   ${index + 1}. [${new Date(log.timestamp).toLocaleTimeString()}] ERROR: ${log.message}`);
        });
      }
    }
  } catch (error) {
    console.error('   获取日志失败:', error.message);
  }

  // 5. 检查后端通信日志
  console.log('\n5. 检查Arduino通信日志...');
  try {
    const response = await fetch('http://localhost:8080/api/logs?source=arduino&category=communication&limit=5');
    const logs = await response.json();
    
    if (logs.data && logs.data.length > 0) {
      console.log(`   ✅ 收到 ${logs.data.length} 条通信日志:`);
      logs.data.forEach((log, index) => {
        console.log(`   ${index + 1}. [${new Date(log.timestamp).toLocaleTimeString()}] ${log.level.toUpperCase()}: ${log.message}`);
      });
    } else {
      console.log('   ❌ 没有收到通信日志');
    }
  } catch (error) {
    console.error('   获取通信日志失败:', error.message);
  }
}

// 测试后端日志接收接口
async function testLogReceiveEndpoint() {
  console.log('\n=== 测试后端日志接收接口 ===');
  
  const testLog = {
    timestamp: Date.now(),
    level: "info",
    message: "测试日志传输",
    category: "test"
  };

  try {
    const response = await fetch('http://localhost:8080/api/arduino-logs', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testLog)
    });

    console.log('后端日志接收响应状态:', response.status);
    const responseText = await response.text();
    console.log('后端日志接收响应:', responseText);

    // 检查是否成功接收
    await new Promise(resolve => setTimeout(resolve, 1000));
    const logsResponse = await fetch('http://localhost:8080/api/logs?source=arduino&limit=1');
    const logs = await logsResponse.json();
    
    if (logs.data && logs.data.length > 0 && logs.data[0].message === "测试日志传输") {
      console.log('✅ 后端日志接收接口工作正常');
    } else {
      console.log('❌ 后端日志接收接口有问题');
    }

  } catch (error) {
    console.error('测试后端日志接收失败:', error.message);
  }
}

// 运行测试
testLogReceiveEndpoint().then(() => {
  return testWiFiLogs();
});

// 专门测试Arduino日志发送功能
async function testArduinoLogSending() {
  console.log('=== 测试Arduino日志发送功能 ===');
  
  // 1. 清空现有日志
  console.log('1. 清空现有日志...');
  try {
    await fetch('http://localhost:8080/api/logs/clear', { method: 'POST' });
    console.log('   日志已清空');
  } catch (error) {
    console.log('   清空日志失败:', error.message);
  }
  
  // 2. 发送一个会触发错误日志的命令（错误日志会立即发送）
  console.log('\n2. 发送错误命令触发error日志...');
  const errorPayload = {
    id: "error_test_" + Date.now(),
    ts: Date.now(),
    cmds: [
      {
        dev: "unknown_device", // 未知设备，会触发错误
        act: "setPwr", 
        val: 50,
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
      body: JSON.stringify(errorPayload)
    });

    console.log('   Arduino响应状态:', response.status);
    const responseText = await response.text();
    console.log('   Arduino响应内容:', responseText);

  } catch (error) {
    console.error('   连接Arduino失败:', error.message);
    return;
  }

  // 3. 等待错误日志传输
  console.log('\n3. 等待错误日志传输...');
  for (let i = 3; i > 0; i--) {
    process.stdout.write(`   等待 ${i} 秒...\r`);
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  console.log('\n   等待完成');

  // 4. 检查是否收到错误日志
  console.log('\n4. 检查错误日志...');
  try {
    const response = await fetch('http://localhost:8080/api/logs?source=arduino&level=error&limit=5');
    const logs = await response.json();
    
    if (logs.data && logs.data.length > 0) {
      console.log(`   ✅ 收到 ${logs.data.length} 条Arduino错误日志:`);
      logs.data.forEach((log, index) => {
        console.log(`   ${index + 1}. [${new Date(log.timestamp).toLocaleTimeString()}] ERROR: ${log.message}`);
      });
    } else {
      console.log('   ❌ 没有收到Arduino错误日志');
    }
  } catch (error) {
    console.error('   获取错误日志失败:', error.message);
  }

  // 5. 检查所有Arduino日志
  console.log('\n5. 检查所有Arduino日志...');
  try {
    const response = await fetch('http://localhost:8080/api/logs?source=arduino&limit=10');
    const logs = await response.json();
    
    if (logs.data && logs.data.length > 0) {
      console.log(`   ✅ 收到 ${logs.data.length} 条Arduino日志:`);
      logs.data.forEach((log, index) => {
        console.log(`   ${index + 1}. [${new Date(log.timestamp).toLocaleTimeString()}] ${log.level.toUpperCase()}: ${log.message}`);
      });
    } else {
      console.log('   ❌ 没有收到任何Arduino日志');
    }
  } catch (error) {
    console.error('   获取日志失败:', error.message);
  }

  // 6. 测试后端网络连接
  console.log('\n6. 测试Arduino到后端的网络连接...');
  console.log('   检查后端是否在192.168.4.2:8080监听...');
  
  try {
    // 从Arduino的角度测试连接
    const response = await fetch('http://192.168.4.2:8080/health');
    console.log('   ✅ 后端健康检查响应:', response.status);
  } catch (error) {
    console.log('   ❌ 无法连接到192.168.4.2:8080:', error.message);
    console.log('   这可能是Arduino日志发送失败的原因');
  }
}

// 测试手动发送日志到Arduino日志接口
async function testManualLogSend() {
  console.log('\n=== 测试手动发送日志 ===');
  
  const testLog = {
    timestamp: Date.now(),
    level: "info",
    message: "手动测试日志",
    category: "manual_test"
  };

  try {
    const response = await fetch('http://localhost:8080/api/arduino-logs', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testLog)
    });

    console.log('手动日志发送响应状态:', response.status);
    const responseText = await response.text();
    console.log('手动日志发送响应:', responseText);

    // 检查是否成功接收
    await new Promise(resolve => setTimeout(resolve, 500));
    const logsResponse = await fetch('http://localhost:8080/api/logs?source=arduino&limit=1');
    const logs = await logsResponse.json();
    
    if (logs.data && logs.data.length > 0 && logs.data[0].message === "手动测试日志") {
      console.log('✅ 手动日志发送成功');
    } else {
      console.log('❌ 手动日志发送失败');
      console.log('最新日志:', logs.data?.[0]);
    }

  } catch (error) {
    console.error('手动日志发送失败:', error.message);
  }
}

// 运行测试
testManualLogSend().then(() => {
  return testArduinoLogSending();
});

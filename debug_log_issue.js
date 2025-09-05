// 调试日志问题
async function debugLogIssue() {
  console.log('=== 调试日志问题 ===');
  
  // 1. 测试后端日志接收和存储
  console.log('1. 测试后端日志接收和存储...');
  
  const testLog = {
    timestamp: Date.now(),
    level: "error",  // 使用error级别，确保Arduino会立即发送
    message: "测试错误日志",
    category: "test"
  };

  try {
    // 发送日志到后端
    const response = await fetch('http://localhost:8080/api/arduino-logs', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testLog)
    });

    console.log('   后端响应状态:', response.status);
    const responseText = await response.text();
    console.log('   后端响应内容:', responseText);

    // 立即查询日志
    console.log('\n2. 立即查询日志...');
    const logsResponse = await fetch('http://localhost:8080/api/logs?source=arduino&limit=5');
    const logs = await logsResponse.json();
    
    console.log('   查询响应状态:', logsResponse.status);
    console.log('   查询响应结构:', {
      success: logs.success,
      total: logs.total,
      dataLength: logs.data?.length,
      hasData: !!logs.data
    });
    
    if (logs.data && logs.data.length > 0) {
      console.log('   ✅ 找到日志:');
      logs.data.forEach((log, index) => {
        console.log(`   ${index + 1}. [${new Date(log.timestamp).toLocaleTimeString()}] ${log.level}: ${log.message}`);
      });
    } else {
      console.log('   ❌ 没有找到日志');
      console.log('   完整响应:', JSON.stringify(logs, null, 2));
    }

  } catch (error) {
    console.error('   测试失败:', error.message);
  }

  // 3. 测试Arduino错误日志发送
  console.log('\n3. 触发Arduino错误日志...');
  
  // 发送一个会触发Arduino错误的命令
  const errorCommand = {
    id: "error_trigger_" + Date.now(),
    ts: Date.now(),
    cmds: [
      {
        dev: "nonexistent_device_" + Date.now(), // 不存在的设备
        act: "setPwr",
        val: 100,
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
      body: JSON.stringify(errorCommand)
    });

    console.log('   Arduino响应状态:', response.status);
    const responseText = await response.text();
    console.log('   Arduino响应内容:', responseText);

  } catch (error) {
    console.error('   Arduino连接失败:', error.message);
    return;
  }

  // 4. 等待Arduino日志传输
  console.log('\n4. 等待Arduino错误日志传输...');
  for (let i = 5; i > 0; i--) {
    process.stdout.write(`   等待 ${i} 秒...\r`);
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  console.log('\n   等待完成');

  // 5. 查询Arduino错误日志
  console.log('\n5. 查询Arduino错误日志...');
  try {
    const response = await fetch('http://localhost:8080/api/logs?source=arduino&level=error&limit=10');
    const logs = await response.json();
    
    console.log('   查询响应状态:', response.status);
    console.log('   错误日志数量:', logs.data?.length || 0);
    
    if (logs.data && logs.data.length > 0) {
      console.log('   ✅ 找到Arduino错误日志:');
      logs.data.forEach((log, index) => {
        console.log(`   ${index + 1}. [${new Date(log.timestamp).toLocaleTimeString()}] ERROR: ${log.message}`);
      });
    } else {
      console.log('   ❌ 没有找到Arduino错误日志');
    }

  } catch (error) {
    console.error('   查询失败:', error.message);
  }

  // 6. 查询所有最新日志
  console.log('\n6. 查询所有最新日志...');
  try {
    const response = await fetch('http://localhost:8080/api/logs?limit=20');
    const logs = await response.json();
    
    console.log('   总日志数量:', logs.data?.length || 0);
    
    if (logs.data && logs.data.length > 0) {
      console.log('   最新20条日志:');
      logs.data.forEach((log, index) => {
        console.log(`   ${index + 1}. [${log.source}] [${log.level}] ${log.message}`);
      });
    } else {
      console.log('   ❌ 没有找到任何日志');
    }

  } catch (error) {
    console.error('   查询失败:', error.message);
  }
}

// 运行调试
debugLogIssue();

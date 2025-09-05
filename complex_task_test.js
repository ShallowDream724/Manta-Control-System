// 测试复杂任务：延时里套循环，循环有多个子步骤
async function testComplexTask() {
  const complexTask = {
    "id": "complex_test_" + Date.now(),
    "name": "复杂测试任务",
    "steps": [
      {
        "id": "step1_" + Date.now(),
        "name": "步骤1",
        "actions": [
          {
            "id": "delay1_" + Date.now(),
            "type": "delay",
            "name": "延时2秒后执行复杂操作",
            "delayMs": 2000,
            "actions": [
              {
                "id": "action1_" + Date.now(),
                "deviceId": "pump1",
                "actionType": "power",
                "value": 30,
                "duration": 3000,
                "name": "充气泵1 - 30%功率 3秒"
              }
            ],
            "parallelLoops": [
              {
                "id": "loop1_" + Date.now(),
                "name": "循环3次",
                "iterations": 3,
                "intervalMs": 1000,
                "subSteps": [
                  {
                    "id": "substep1_" + Date.now(),
                    "name": "子步骤1",
                    "actions": [
                      {
                        "id": "action2_" + Date.now(),
                        "deviceId": "pump2",
                        "actionType": "power",
                        "value": 40,
                        "duration": 2000,
                        "name": "充气泵2 - 40%功率 2秒"
                      }
                    ]
                  },
                  {
                    "id": "substep2_" + Date.now(),
                    "name": "子步骤2",
                    "actions": [
                      {
                        "id": "action3_" + Date.now(),
                        "deviceId": "valve1",
                        "actionType": "state",
                        "value": true,
                        "duration": 1500,
                        "name": "电磁阀1 - 开启 1.5秒"
                      },
                      {
                        "id": "action4_" + Date.now(),
                        "deviceId": "pump3",
                        "actionType": "power",
                        "value": 60,
                        "duration": 1000,
                        "name": "抽气泵1 - 60%功率 1秒"
                      }
                    ]
                  }
                ]
              }
            ]
          }
        ],
        "parallelLoops": []
      }
    ],
    "createdAt": Date.now(),
    "updatedAt": Date.now()
  };

  console.log('发送复杂测试任务到后端:');
  console.log(JSON.stringify(complexTask, null, 2));

  try {
    const response = await fetch('http://localhost:8080/api/task-execution/start', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        task: complexTask,
        estimatedDuration: 20000 // 20秒预估
      })
    });

    console.log('后端响应状态:', response.status);
    const responseData = await response.json();
    console.log('后端响应:', JSON.stringify(responseData, null, 2));

    // 等待任务执行完成
    console.log('\n等待任务执行...');
    await new Promise(resolve => setTimeout(resolve, 25000)); // 等待25秒

    // 获取执行日志
    await getExecutionLogs();

  } catch (error) {
    console.error('测试失败:', error.message);
  }
}

// 获取执行日志
async function getExecutionLogs() {
  try {
    const response = await fetch('http://localhost:8080/api/logs?source=backend&category=task_execution&limit=50');
    const logs = await response.json();
    console.log('\n=== 任务执行日志 ===');
    if (logs.data && logs.data.length > 0) {
      logs.data.forEach(log => {
        console.log(`[${new Date(log.timestamp).toLocaleTimeString()}] ${log.level.toUpperCase()}: ${log.message}`);
      });
    } else {
      console.log('没有任务执行日志');
    }

    // 获取Arduino通信日志
    const arduinoResponse = await fetch('http://localhost:8080/api/logs?source=arduino&limit=30');
    const arduinoLogs = await arduinoResponse.json();
    console.log('\n=== Arduino通信日志 ===');
    if (arduinoLogs.data && arduinoLogs.data.length > 0) {
      arduinoLogs.data.forEach(log => {
        console.log(`[${new Date(log.timestamp).toLocaleTimeString()}] ${log.level.toUpperCase()}: ${log.message}`);
      });
    } else {
      console.log('没有Arduino通信日志');
    }
  } catch (error) {
    console.error('获取日志失败:', error.message);
  }
}

console.log('=== 复杂任务测试 ===');
console.log('任务结构：延时2秒 → 并行执行(pump1 + 3次循环)');
console.log('循环结构：每次循环有2个子步骤，间隔1秒');
console.log('预期执行时间：约15秒');
console.log('');

testComplexTask();

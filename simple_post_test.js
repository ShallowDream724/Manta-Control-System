// 简单的POST测试，验证Arduino是否能正确读取请求体
async function simplePostTest() {
  console.log('=== 简单POST测试 ===');
  
  const testData = {
    "test": "hello",
    "number": 123
  };

  console.log('发送简单JSON数据:');
  console.log(JSON.stringify(testData, null, 2));

  try {
    const response = await fetch('http://192.168.4.1/api/commands', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testData)
    });

    console.log('Arduino响应状态:', response.status);
    const responseText = await response.text();
    console.log('Arduino响应内容:', responseText);

  } catch (error) {
    console.error('连接Arduino失败:', error.message);
  }
}

// 测试不同大小的数据
async function testDifferentSizes() {
  console.log('\n=== 测试不同大小的数据 ===');
  
  const tests = [
    { name: "小数据", data: { "a": 1 } },
    { name: "中等数据", data: { "test": "hello world", "numbers": [1,2,3,4,5] } },
    { name: "大数据", data: { 
      "id": "test_large_data_" + Date.now(),
      "message": "这是一个比较长的测试消息，用来测试Arduino是否能正确处理较大的JSON数据",
      "array": [1,2,3,4,5,6,7,8,9,10],
      "object": { "nested": true, "value": 42, "text": "nested object" }
    }}
  ];

  for (const test of tests) {
    console.log(`\n测试 ${test.name}:`);
    const jsonStr = JSON.stringify(test.data);
    console.log(`数据长度: ${jsonStr.length} 字节`);
    console.log(`数据内容: ${jsonStr}`);

    try {
      const response = await fetch('http://192.168.4.1/api/commands', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: jsonStr
      });

      console.log(`响应状态: ${response.status}`);
      const responseText = await response.text();
      console.log(`响应内容: ${responseText}`);

    } catch (error) {
      console.error(`测试失败: ${error.message}`);
    }

    // 等待一下再进行下一个测试
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
}

// 运行测试
simplePostTest().then(() => {
  return testDifferentSizes();
});

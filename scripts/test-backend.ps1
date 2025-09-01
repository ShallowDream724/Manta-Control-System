# Manta Control Ultra - 后端服务测试脚本
# 用于测试后端API和WebSocket连接

Write-Host "🧪 Manta Control Ultra - 后端服务测试" -ForegroundColor Green
Write-Host "=======================================" -ForegroundColor Green

$backendUrl = "http://localhost:8080"
$testResults = @()

# 检查后端服务是否运行
Write-Host "🔍 检查后端服务状态..." -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$backendUrl/" -Method GET -TimeoutSec 5
    if ($response.status -eq "running") {
        Write-Host "✅ 后端服务正在运行" -ForegroundColor Green
        Write-Host "   版本: $($response.version)" -ForegroundColor Gray
        Write-Host "   设备数量: $($response.totalDevices)" -ForegroundColor Gray
        $testResults += "后端服务状态: ✅"
    } else {
        Write-Host "❌ 后端服务状态异常" -ForegroundColor Red
        $testResults += "后端服务状态: ❌"
    }
} catch {
    Write-Host "❌ 无法连接到后端服务" -ForegroundColor Red
    Write-Host "   请确保后端服务已启动: cd backend && npm run dev" -ForegroundColor Yellow
    $testResults += "后端服务状态: ❌"
    
    Write-Host ""
    Write-Host "📊 测试结果汇总:" -ForegroundColor Cyan
    Write-Host "=================" -ForegroundColor Cyan
    foreach ($result in $testResults) {
        Write-Host "  $result" -ForegroundColor White
    }
    exit 1
}

# 测试健康检查端点
Write-Host "🏥 测试健康检查端点..." -ForegroundColor Yellow
try {
    $healthResponse = Invoke-RestMethod -Uri "$backendUrl/health" -Method GET -TimeoutSec 5
    if ($healthResponse.status -eq "healthy") {
        Write-Host "✅ 健康检查通过" -ForegroundColor Green
        Write-Host "   运行时间: $([math]::Round($healthResponse.uptime, 2))秒" -ForegroundColor Gray
        $testResults += "健康检查: ✅"
    } else {
        Write-Host "❌ 健康检查失败" -ForegroundColor Red
        $testResults += "健康检查: ❌"
    }
} catch {
    Write-Host "❌ 健康检查端点无响应" -ForegroundColor Red
    $testResults += "健康检查: ❌"
}

# 测试设备API
Write-Host "🔧 测试设备API..." -ForegroundColor Yellow
try {
    $devicesResponse = Invoke-RestMethod -Uri "$backendUrl/api/devices" -Method GET -TimeoutSec 5
    if ($devicesResponse.success -and $devicesResponse.data) {
        $deviceCount = $devicesResponse.data.Count
        Write-Host "✅ 设备API正常，共 $deviceCount 个设备" -ForegroundColor Green
        
        # 显示设备列表
        foreach ($device in $devicesResponse.data) {
            Write-Host "   - $($device.name) (ID: $($device.id), 类型: $($device.type))" -ForegroundColor Gray
        }
        $testResults += "设备API: ✅"
    } else {
        Write-Host "❌ 设备API响应异常" -ForegroundColor Red
        $testResults += "设备API: ❌"
    }
} catch {
    Write-Host "❌ 设备API无响应" -ForegroundColor Red
    $testResults += "设备API: ❌"
}

# 测试设备状态API
Write-Host "📊 测试设备状态API..." -ForegroundColor Yellow
try {
    $statusResponse = Invoke-RestMethod -Uri "$backendUrl/api/devices/status" -Method GET -TimeoutSec 5
    if ($statusResponse.success -and $statusResponse.data) {
        $onlineDevices = ($statusResponse.data | Where-Object { $_.isOnline }).Count
        $totalDevices = $statusResponse.data.Count
        Write-Host "✅ 设备状态API正常" -ForegroundColor Green
        Write-Host "   在线设备: $onlineDevices/$totalDevices" -ForegroundColor Gray
        $testResults += "设备状态API: ✅"
    } else {
        Write-Host "❌ 设备状态API响应异常" -ForegroundColor Red
        $testResults += "设备状态API: ❌"
    }
} catch {
    Write-Host "❌ 设备状态API无响应" -ForegroundColor Red
    $testResults += "设备状态API: ❌"
}

# 测试设备控制API（模拟命令）
Write-Host "🎮 测试设备控制API..." -ForegroundColor Yellow
try {
    # 获取第一个设备进行测试
    $devicesResponse = Invoke-RestMethod -Uri "$backendUrl/api/devices" -Method GET -TimeoutSec 5
    if ($devicesResponse.success -and $devicesResponse.data.Count -gt 0) {
        $testDevice = $devicesResponse.data[0]
        
        # 构造测试命令
        $testCommand = @{
            action = if ($testDevice.type -eq "pump") { "set_power" } else { "set_state" }
            value = if ($testDevice.type -eq "pump") { 0 } else { $false }
        }
        
        $controlResponse = Invoke-RestMethod -Uri "$backendUrl/api/devices/$($testDevice.id)/control" -Method POST -Body ($testCommand | ConvertTo-Json) -ContentType "application/json" -TimeoutSec 5
        
        if ($controlResponse.success) {
            Write-Host "✅ 设备控制API正常" -ForegroundColor Green
            Write-Host "   测试设备: $($testDevice.name)" -ForegroundColor Gray
            Write-Host "   命令ID: $($controlResponse.data.commandId)" -ForegroundColor Gray
            $testResults += "设备控制API: ✅"
        } else {
            Write-Host "❌ 设备控制API执行失败" -ForegroundColor Red
            $testResults += "设备控制API: ❌"
        }
    } else {
        Write-Host "⚠️  无可用设备进行控制测试" -ForegroundColor Yellow
        $testResults += "设备控制API: ⚠️"
    }
} catch {
    Write-Host "❌ 设备控制API无响应" -ForegroundColor Red
    $testResults += "设备控制API: ❌"
}

# 测试WebSocket连接（简单检查）
Write-Host "🔌 检查WebSocket端点..." -ForegroundColor Yellow
try {
    # 尝试连接WebSocket（这里只是检查端口是否开放）
    $tcpClient = New-Object System.Net.Sockets.TcpClient
    $tcpClient.Connect("localhost", 8080)
    if ($tcpClient.Connected) {
        Write-Host "✅ WebSocket端口可访问" -ForegroundColor Green
        $testResults += "WebSocket端点: ✅"
    } else {
        Write-Host "❌ WebSocket端口不可访问" -ForegroundColor Red
        $testResults += "WebSocket端点: ❌"
    }
    $tcpClient.Close()
} catch {
    Write-Host "❌ WebSocket端口检查失败" -ForegroundColor Red
    $testResults += "WebSocket端点: ❌"
}

# 输出测试结果
Write-Host ""
Write-Host "📊 测试结果汇总:" -ForegroundColor Cyan
Write-Host "=================" -ForegroundColor Cyan
foreach ($result in $testResults) {
    Write-Host "  $result" -ForegroundColor White
}

# 统计成功率
$successCount = ($testResults | Where-Object { $_ -like "*✅*" }).Count
$totalTests = $testResults.Count
$successRate = [math]::Round(($successCount / $totalTests) * 100, 1)

Write-Host ""
Write-Host "🎯 测试完成！成功率: $successRate% ($successCount/$totalTests)" -ForegroundColor Green

if ($successRate -eq 100) {
    Write-Host "🎉 所有测试通过！后端服务运行正常。" -ForegroundColor Green
} elseif ($successRate -ge 80) {
    Write-Host "⚠️  大部分测试通过，但有部分功能需要检查。" -ForegroundColor Yellow
} else {
    Write-Host "❌ 多项测试失败，请检查后端服务配置。" -ForegroundColor Red
}

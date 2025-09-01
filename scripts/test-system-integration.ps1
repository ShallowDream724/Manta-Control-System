#!/usr/bin/env pwsh
# 系统集成测试脚本

param(
    [string]$BackendUrl = "http://localhost:9000",
    [string]$FrontendUrl = "http://localhost:5174"
)

Write-Host "🧪 开始系统集成测试..." -ForegroundColor Cyan
Write-Host "后端地址: $BackendUrl" -ForegroundColor Yellow
Write-Host "前端地址: $FrontendUrl" -ForegroundColor Yellow
Write-Host ""

$testResults = @()
$totalTests = 0
$passedTests = 0

function Test-Endpoint {
    param(
        [string]$Name,
        [string]$Url,
        [string]$Method = "GET",
        $Body = $null
    )
    
    $script:totalTests++
    Write-Host "测试 $totalTests : $Name" -NoNewline
    
    try {
        $params = @{
            Uri = $Url
            Method = $Method
            TimeoutSec = 10
        }
        
        if ($Body) {
            $params.Body = ($Body | ConvertTo-Json)
            $params.ContentType = "application/json"
        }
        
        $response = Invoke-RestMethod @params
        Write-Host " ✅" -ForegroundColor Green
        $script:passedTests++
        return @{ Success = $true; Response = $response }
    }
    catch {
        Write-Host " ❌" -ForegroundColor Red
        Write-Host "   错误: $($_.Exception.Message)" -ForegroundColor Red
        return @{ Success = $false; Error = $_.Exception.Message }
    }
}

function Test-WebPage {
    param(
        [string]$Name,
        [string]$Url
    )
    
    $script:totalTests++
    Write-Host "测试 $totalTests : $Name" -NoNewline
    
    try {
        $response = Invoke-WebRequest -Uri $Url -TimeoutSec 10
        if ($response.StatusCode -eq 200) {
            Write-Host " ✅" -ForegroundColor Green
            $script:passedTests++
            return $true
        } else {
            Write-Host " ❌ (状态码: $($response.StatusCode))" -ForegroundColor Red
            return $false
        }
    }
    catch {
        Write-Host " ❌" -ForegroundColor Red
        Write-Host "   错误: $($_.Exception.Message)" -ForegroundColor Red
        return $false
    }
}

# 1. 测试后端核心功能
Write-Host "📡 测试后端核心功能..." -ForegroundColor Blue

$result1 = Test-Endpoint "后端健康检查" "$BackendUrl/health"
$result2 = Test-Endpoint "系统状态" "$BackendUrl/"
$result3 = Test-Endpoint "设备配置API" "$BackendUrl/api/device-configs"
$result4 = Test-Endpoint "设备状态API" "$BackendUrl/api/devices/status"
$result5 = Test-Endpoint "设备信息API" "$BackendUrl/api/devices"

# 2. 测试前端页面
Write-Host ""
Write-Host "🌐 测试前端页面..." -ForegroundColor Blue

$page1 = Test-WebPage "前端首页" "$FrontendUrl/"
$page2 = Test-WebPage "仪表盘页面" "$FrontendUrl/dashboard"
$page3 = Test-WebPage "控制面板页面" "$FrontendUrl/control"
$page4 = Test-WebPage "设备配置页面" "$FrontendUrl/device-config"
$page5 = Test-WebPage "任务编排页面" "$FrontendUrl/tasks"
$page6 = Test-WebPage "系统日志页面" "$FrontendUrl/logs"
$page7 = Test-WebPage "设置页面" "$FrontendUrl/settings"

# 3. 测试可配置框架
Write-Host ""
Write-Host "🔧 测试可配置框架..." -ForegroundColor Blue

# 创建测试设备
$testDevice = @{
    id = "integration_test_pump"
    name = "集成测试泵"
    type = "pump"
    pin = 13
    mode = "pwm"
    pwmFrequency = 1000
    maxPower = 100
    description = "系统集成测试设备"
}

$createResult = Test-Endpoint "创建测试设备" "$BackendUrl/api/device-configs" "POST" $testDevice

# 获取设备配置
$getResult = Test-Endpoint "获取设备配置" "$BackendUrl/api/device-configs/$($testDevice.id)"

# 更新设备配置
if ($createResult.Success) {
    $updateDevice = $testDevice.Clone()
    $updateDevice.maxPower = 80
    $updateDevice.description = "已更新的集成测试设备"
    
    $updateResult = Test-Endpoint "更新设备配置" "$BackendUrl/api/device-configs/$($testDevice.id)" "PUT" $updateDevice
}

# 4. 测试设备控制功能
Write-Host ""
Write-Host "🎮 测试设备控制功能..." -ForegroundColor Blue

# 注意：这些测试预期会失败，因为没有实际的Arduino设备
$pumpControl = @{
    action = "set_power"
    value = 50
}

$controlResult1 = Test-Endpoint "泵控制测试(预期失败)" "$BackendUrl/api/devices/$($testDevice.id)/control" "POST" $pumpControl

# 5. 测试数据一致性
Write-Host ""
Write-Host "📊 测试数据一致性..." -ForegroundColor Blue

$configsResult = Test-Endpoint "获取所有配置" "$BackendUrl/api/device-configs"
$statesResult = Test-Endpoint "获取所有状态" "$BackendUrl/api/devices/status"

if ($configsResult.Success -and $statesResult.Success) {
    $configs = $configsResult.Response.data
    $states = $statesResult.Response.data
    
    Write-Host "   配置数量: $($configs.Count)" -ForegroundColor Gray
    Write-Host "   状态数量: $($states.Count)" -ForegroundColor Gray
    
    # 检查新创建的设备是否在配置中
    $newDeviceConfig = $configs | Where-Object { $_.id -eq $testDevice.id }
    if ($newDeviceConfig) {
        Write-Host "   ✅ 新设备配置已保存" -ForegroundColor Green
        $script:passedTests++
    } else {
        Write-Host "   ❌ 新设备配置未找到" -ForegroundColor Red
    }
    $script:totalTests++
}

# 6. 清理测试数据
Write-Host ""
Write-Host "🧹 清理测试数据..." -ForegroundColor Blue

if ($createResult.Success) {
    $deleteResult = Test-Endpoint "删除测试设备" "$BackendUrl/api/device-configs/$($testDevice.id)" "DELETE"
}

# 7. 测试系统性能
Write-Host ""
Write-Host "⚡ 测试系统性能..." -ForegroundColor Blue

$startTime = Get-Date
$perfResult = Test-Endpoint "性能测试-健康检查" "$BackendUrl/health"
$endTime = Get-Date
$responseTime = ($endTime - $startTime).TotalMilliseconds

Write-Host "   响应时间: $([math]::Round($responseTime, 2))ms" -ForegroundColor Gray

if ($responseTime -lt 1000) {
    Write-Host "   ✅ 响应时间良好 (<1秒)" -ForegroundColor Green
    $script:passedTests++
} else {
    Write-Host "   ⚠️ 响应时间较慢 (>1秒)" -ForegroundColor Yellow
}
$script:totalTests++

# 8. 显示测试结果
Write-Host ""
Write-Host "📊 系统集成测试结果" -ForegroundColor Magenta
Write-Host "========================" -ForegroundColor Magenta
Write-Host "总测试数: $totalTests" -ForegroundColor White
Write-Host "通过数: $passedTests" -ForegroundColor Green
Write-Host "失败数: $($totalTests - $passedTests)" -ForegroundColor Red

if ($totalTests -gt 0) {
    $successRate = [math]::Round(($passedTests / $totalTests) * 100, 2)
    Write-Host "成功率: $successRate%" -ForegroundColor Yellow
} else {
    Write-Host "成功率: 0%" -ForegroundColor Yellow
}

# 9. 功能模块状态总结
Write-Host ""
Write-Host "🎯 功能模块状态总结" -ForegroundColor Cyan
Write-Host "===================" -ForegroundColor Cyan

$modules = @(
    @{ Name = "后端核心服务"; Status = if ($result1.Success -and $result2.Success) { "✅ 正常" } else { "❌ 异常" } },
    @{ Name = "设备配置API"; Status = if ($result3.Success) { "✅ 正常" } else { "❌ 异常" } },
    @{ Name = "设备状态API"; Status = if ($result4.Success) { "✅ 正常" } else { "❌ 异常" } },
    @{ Name = "前端页面"; Status = if ($page1 -and $page2 -and $page3) { "✅ 正常" } else { "❌ 异常" } },
    @{ Name = "可配置框架"; Status = if ($createResult.Success) { "✅ 正常" } else { "❌ 异常" } },
    @{ Name = "设备控制"; Status = "⚠️ 待硬件" },
    @{ Name = "系统性能"; Status = if ($responseTime -lt 1000) { "✅ 良好" } else { "⚠️ 一般" } }
)

foreach ($module in $modules) {
    Write-Host "$($module.Name): $($module.Status)" -ForegroundColor White
}

Write-Host ""
if ($successRate -ge 80) {
    Write-Host "🎉 系统集成测试基本通过！核心功能正常运行！" -ForegroundColor Green
    Write-Host "💡 下一步可以开发Arduino端代码来完成硬件集成。" -ForegroundColor Cyan
    exit 0
} elseif ($successRate -ge 60) {
    Write-Host "⚠️ 系统集成测试部分通过，存在一些问题需要修复。" -ForegroundColor Yellow
    exit 1
} else {
    Write-Host "❌ 系统集成测试失败，需要检查核心功能。" -ForegroundColor Red
    exit 1
}

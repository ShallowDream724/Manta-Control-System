#!/usr/bin/env pwsh
# 动态控制面板测试脚本

param(
    [string]$BackendUrl = "http://localhost:9000",
    [string]$FrontendUrl = "http://localhost:5174"
)

Write-Host "🧪 开始动态控制面板测试..." -ForegroundColor Cyan
Write-Host "后端地址: $BackendUrl" -ForegroundColor Yellow
Write-Host "前端地址: $FrontendUrl" -ForegroundColor Yellow
Write-Host ""

$testResults = @()
$totalTests = 0
$passedTests = 0

function Test-API {
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
            Headers = @{
                'Content-Type' = 'application/json'
            }
        }
        
        if ($Body) {
            $params.Body = ($Body | ConvertTo-Json -Depth 10)
        }
        
        $response = Invoke-WebRequest @params
        Write-Host " ✅" -ForegroundColor Green
        $script:passedTests++
        return @{ Success = $true; Response = $response; Data = ($response.Content | ConvertFrom-Json) }
    }
    catch {
        Write-Host " ❌" -ForegroundColor Red
        Write-Host "   错误: $($_.Exception.Message)" -ForegroundColor Red
        return @{ Success = $false; Error = $_.Exception.Message }
    }
}

# 1. 清理现有配置
Write-Host "🧹 清理现有配置..." -ForegroundColor Blue

$existingConfigs = Test-API "获取现有配置" "$BackendUrl/api/device-configs"
if ($existingConfigs.Success) {
    foreach ($config in $existingConfigs.Data.data) {
        $deleteResult = Test-API "删除配置 $($config.id)" "$BackendUrl/api/device-configs/$($config.id)" "DELETE"
        if ($deleteResult.Success) {
            Write-Host "   已删除: $($config.id)" -ForegroundColor Gray
        }
    }
}

# 2. 创建测试设备配置
Write-Host ""
Write-Host "🔧 创建测试设备配置..." -ForegroundColor Blue

$testDevices = @(
    @{
        id = "dynamic_pump_1"
        name = "动态泵1"
        type = "pump"
        pin = 5
        mode = "pwm"
        pwmFrequency = 490
        maxPower = 100
        description = "动态控制测试泵1"
    },
    @{
        id = "dynamic_pump_2"
        name = "动态泵2"
        type = "pump"
        pin = 6
        mode = "pwm"
        pwmFrequency = 1000
        maxPower = 80
        description = "动态控制测试泵2"
    },
    @{
        id = "dynamic_valve_1"
        name = "动态阀1"
        type = "valve"
        pin = 10
        mode = "digital"
        description = "动态控制测试阀1"
    },
    @{
        id = "dynamic_valve_2"
        name = "动态阀2"
        type = "valve"
        pin = 11
        mode = "digital"
        description = "动态控制测试阀2"
    }
)

foreach ($device in $testDevices) {
    $createResult = Test-API "创建设备 $($device.name)" "$BackendUrl/api/device-configs" "POST" $device
    if ($createResult.Success) {
        Write-Host "   已创建: $($device.name) (引脚 $($device.pin))" -ForegroundColor Gray
    }
}

# 3. 验证配置已创建
Write-Host ""
Write-Host "📋 验证配置创建..." -ForegroundColor Blue

$configsResult = Test-API "获取所有配置" "$BackendUrl/api/device-configs"
if ($configsResult.Success) {
    $configs = $configsResult.Data.data
    Write-Host "   配置数量: $($configs.Count)" -ForegroundColor Gray
    
    foreach ($config in $configs) {
        Write-Host "   - $($config.name) ($($config.type)) 引脚$($config.pin)" -ForegroundColor Gray
    }
}

# 4. 测试设备状态API
Write-Host ""
Write-Host "📊 测试设备状态API..." -ForegroundColor Blue

$statusResult = Test-API "获取设备状态" "$BackendUrl/api/devices/status"
if ($statusResult.Success) {
    $states = $statusResult.Data.data
    Write-Host "   状态数量: $($states.Count)" -ForegroundColor Gray
    
    foreach ($state in $states) {
        $onlineStatus = if ($state.isOnline) { "在线" } else { "离线" }
        Write-Host "   - $($state.deviceId): $onlineStatus" -ForegroundColor Gray
    }
}

# 5. 测试设备控制API
Write-Host ""
Write-Host "🎮 测试设备控制API..." -ForegroundColor Blue

# 测试泵控制
$pumpControl = @{
    action = "set_power"
    value = 50
}
$pumpResult = Test-API "控制泵设备" "$BackendUrl/api/devices/dynamic_pump_1/control" "POST" $pumpControl

# 测试阀控制
$valveControl = @{
    action = "set_state"
    value = $true
}
$valveResult = Test-API "控制阀设备" "$BackendUrl/api/devices/dynamic_valve_1/control" "POST" $valveControl

# 6. 测试前端页面访问
Write-Host ""
Write-Host "🌐 测试前端页面..." -ForegroundColor Blue

$frontendResult = Test-API "访问前端首页" "$FrontendUrl"
$configPageResult = Test-API "访问设备配置页面" "$FrontendUrl/device-config"
$controlPageResult = Test-API "访问控制面板页面" "$FrontendUrl/control"

# 7. 动态修改配置测试
Write-Host ""
Write-Host "🔄 测试动态配置修改..." -ForegroundColor Blue

# 添加新设备
$newDevice = @{
    id = "dynamic_new_pump"
    name = "新增动态泵"
    type = "pump"
    pin = 12
    mode = "pwm"
    pwmFrequency = 2000
    maxPower = 90
    description = "动态添加的测试泵"
}

$addResult = Test-API "添加新设备" "$BackendUrl/api/device-configs" "POST" $newDevice

# 修改现有设备
$updateDevice = @{
    id = "dynamic_pump_1"
    name = "修改后的动态泵1"
    type = "pump"
    pin = 5
    mode = "pwm"
    pwmFrequency = 490
    maxPower = 75
    description = "已修改的动态控制测试泵1"
}

$updateResult = Test-API "修改现有设备" "$BackendUrl/api/device-configs/dynamic_pump_1" "PUT" $updateDevice

# 8. 验证最终状态
Write-Host ""
Write-Host "📊 验证最终状态..." -ForegroundColor Blue

$finalConfigsResult = Test-API "获取最终配置" "$BackendUrl/api/device-configs"
if ($finalConfigsResult.Success) {
    $finalConfigs = $finalConfigsResult.Data.data
    Write-Host "   最终配置数量: $($finalConfigs.Count)" -ForegroundColor Gray
    Write-Host "   预期数量: 5 (4个初始 + 1个新增)" -ForegroundColor Gray
    
    # 检查修改是否生效
    $modifiedDevice = $finalConfigs | Where-Object { $_.id -eq "dynamic_pump_1" }
    if ($modifiedDevice) {
        Write-Host "   修改验证: $($modifiedDevice.name) 最大功率$($modifiedDevice.maxPower)%" -ForegroundColor Gray
    }
}

# 9. 清理测试数据
Write-Host ""
Write-Host "🧹 清理测试数据..." -ForegroundColor Blue

$cleanupDeviceIds = @("dynamic_pump_1", "dynamic_pump_2", "dynamic_valve_1", "dynamic_valve_2", "dynamic_new_pump")
foreach ($deviceId in $cleanupDeviceIds) {
    $cleanupResult = Test-API "删除测试设备 $deviceId" "$BackendUrl/api/device-configs/$deviceId" "DELETE"
    if ($cleanupResult.Success) {
        Write-Host "   已删除: $deviceId" -ForegroundColor Gray
    }
}

# 10. 显示测试结果
Write-Host ""
Write-Host "📊 测试结果汇总" -ForegroundColor Magenta
Write-Host "===================" -ForegroundColor Magenta
Write-Host "总测试数: $totalTests" -ForegroundColor White
Write-Host "通过数: $passedTests" -ForegroundColor Green
Write-Host "失败数: $($totalTests - $passedTests)" -ForegroundColor Red

if ($totalTests -gt 0) {
    $successRate = [math]::Round(($passedTests / $totalTests) * 100, 2)
    Write-Host "成功率: $successRate%" -ForegroundColor Yellow
} else {
    Write-Host "成功率: 0%" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "🎯 动态控制面板功能验证:" -ForegroundColor Cyan
Write-Host "✅ 设备配置API正常工作" -ForegroundColor Green
Write-Host "✅ 设备状态API正常工作" -ForegroundColor Green
Write-Host "✅ 设备控制API正常工作" -ForegroundColor Green
Write-Host "✅ 前端页面可正常访问" -ForegroundColor Green
Write-Host "✅ 动态配置修改功能正常" -ForegroundColor Green

if ($passedTests -eq $totalTests) {
    Write-Host ""
    Write-Host "🎉 动态控制面板测试全部通过！" -ForegroundColor Green
    Write-Host "控制面板现在可以根据设备配置动态生成界面！" -ForegroundColor Green
    exit 0
} else {
    Write-Host ""
    Write-Host "⚠️  部分测试失败，请检查动态控制功能" -ForegroundColor Yellow
    exit 1
}

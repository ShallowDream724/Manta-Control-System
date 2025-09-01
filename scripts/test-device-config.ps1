#!/usr/bin/env pwsh
# 设备配置功能测试脚本

param(
    [string]$BackendUrl = "http://localhost:9000"
)

Write-Host "🧪 开始设备配置功能测试..." -ForegroundColor Cyan
Write-Host "后端地址: $BackendUrl" -ForegroundColor Yellow
Write-Host ""

$testResults = @()
$totalTests = 0
$passedTests = 0

function Test-API {
    param(
        [string]$Name,
        [string]$Url,
        [string]$Method = "GET",
        $Body = $null,
        [string]$ExpectedStatus = "200"
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
        
        if ($response.StatusCode -eq $ExpectedStatus) {
            Write-Host " ✅" -ForegroundColor Green
            $script:passedTests++
            return @{ Success = $true; Response = $response; Data = ($response.Content | ConvertFrom-Json) }
        } else {
            Write-Host " ❌ (状态码: $($response.StatusCode))" -ForegroundColor Red
            return @{ Success = $false; Error = "Unexpected status code: $($response.StatusCode)" }
        }
    }
    catch {
        Write-Host " ❌" -ForegroundColor Red
        Write-Host "   错误: $($_.Exception.Message)" -ForegroundColor Red
        return @{ Success = $false; Error = $_.Exception.Message }
    }
}

# 1. 测试获取设备配置列表
Write-Host "📋 测试设备配置API..." -ForegroundColor Blue

$result1 = Test-API "获取设备配置列表" "$BackendUrl/api/device-configs"
$initialConfigs = if ($result1.Success) { $result1.Data.data } else { @() }
$initialCount = $initialConfigs.Count

Write-Host "   当前配置数量: $initialCount" -ForegroundColor Gray

# 2. 测试创建设备配置
Write-Host ""
Write-Host "➕ 测试创建设备配置..." -ForegroundColor Blue

$testDevice = @{
    id = "test_pump_$(Get-Date -Format 'HHmmss')"
    name = "测试泵"
    type = "pump"
    pin = 15
    mode = "pwm"
    pwmFrequency = 1000
    maxPower = 80
    description = "自动化测试创建的设备"
}

$result2 = Test-API "创建新设备配置" "$BackendUrl/api/device-configs" "POST" $testDevice "201"
$createdDevice = if ($result2.Success) { $result2.Data.data } else { $null }

if ($createdDevice) {
    Write-Host "   创建的设备ID: $($createdDevice.id)" -ForegroundColor Gray
}

# 3. 测试获取单个设备配置
if ($createdDevice) {
    Write-Host ""
    Write-Host "🔍 测试获取单个设备配置..." -ForegroundColor Blue
    
    $result3 = Test-API "获取设备配置详情" "$BackendUrl/api/device-configs/$($createdDevice.id)"
    
    if ($result3.Success) {
        $deviceDetail = $result3.Data.data
        Write-Host "   设备名称: $($deviceDetail.name)" -ForegroundColor Gray
        Write-Host "   设备类型: $($deviceDetail.type)" -ForegroundColor Gray
        Write-Host "   引脚号: $($deviceDetail.pin)" -ForegroundColor Gray
    }
}

# 4. 测试更新设备配置
if ($createdDevice) {
    Write-Host ""
    Write-Host "✏️ 测试更新设备配置..." -ForegroundColor Blue
    
    $updatedDevice = @{
        id = $createdDevice.id
        name = "更新后的测试泵"
        type = $createdDevice.type
        pin = $createdDevice.pin
        mode = $createdDevice.mode
        pwmFrequency = $createdDevice.pwmFrequency
        maxPower = 90
        description = "已更新的设备描述"
    }
    
    $result4 = Test-API "更新设备配置" "$BackendUrl/api/device-configs/$($createdDevice.id)" "PUT" $updatedDevice
    
    if ($result4.Success) {
        $updated = $result4.Data.data
        Write-Host "   更新后名称: $($updated.name)" -ForegroundColor Gray
        Write-Host "   更新后功率: $($updated.maxPower)%" -ForegroundColor Gray
    }
}

# 5. 测试配置验证
Write-Host ""
Write-Host "🔒 测试配置验证..." -ForegroundColor Blue

# 测试重复ID
$duplicateDevice = @{
    id = $testDevice.id
    name = "重复ID设备"
    type = "valve"
    pin = 16
    mode = "digital"
    description = "应该失败的设备"
}

# 这些测试预期会失败，我们需要捕获异常
try {
    $result5 = Test-API "创建重复ID设备(应失败)" "$BackendUrl/api/device-configs" "POST" $duplicateDevice
    if ($result5.Success) {
        Write-Host "   ❌ 应该失败但成功了" -ForegroundColor Red
    } else {
        Write-Host "   ✅ 正确拒绝了重复ID" -ForegroundColor Green
        $script:passedTests++
    }
} catch {
    Write-Host "   ✅ 正确拒绝了重复ID" -ForegroundColor Green
    $script:passedTests++
}

# 测试重复引脚
$duplicatePinDevice = @{
    id = "duplicate_pin_test"
    name = "重复引脚设备"
    type = "valve"
    pin = $testDevice.pin
    mode = "digital"
    description = "应该失败的设备"
}

try {
    $result6 = Test-API "创建重复引脚设备(应失败)" "$BackendUrl/api/device-configs" "POST" $duplicatePinDevice
    if ($result6.Success) {
        Write-Host "   ❌ 应该失败但成功了" -ForegroundColor Red
    } else {
        Write-Host "   ✅ 正确拒绝了重复引脚" -ForegroundColor Green
        $script:passedTests++
    }
} catch {
    Write-Host "   ✅ 正确拒绝了重复引脚" -ForegroundColor Green
    $script:passedTests++
}

# 6. 测试批量操作
Write-Host ""
Write-Host "📦 测试批量操作..." -ForegroundColor Blue

$batchDevices = @(
    @{
        id = "batch_test_1"
        name = "批量测试设备1"
        type = "pump"
        pin = 17
        mode = "pwm"
        pwmFrequency = 500
        maxPower = 100
        description = "批量导入测试1"
    },
    @{
        id = "batch_test_2"
        name = "批量测试设备2"
        type = "valve"
        pin = 18
        mode = "digital"
        description = "批量导入测试2"
    }
)

$result7 = Test-API "批量导入设备配置" "$BackendUrl/api/device-configs/import" "POST" $batchDevices

# 7. 验证最终配置数量
Write-Host ""
Write-Host "📊 验证最终状态..." -ForegroundColor Blue

$result8 = Test-API "获取最终配置列表" "$BackendUrl/api/device-configs"
$finalConfigs = if ($result8.Success) { $result8.Data.data } else { @() }
$finalCount = $finalConfigs.Count

Write-Host "   初始配置数量: $initialCount" -ForegroundColor Gray
Write-Host "   最终配置数量: $finalCount" -ForegroundColor Gray
Write-Host "   预期增加数量: 3 (1个单独创建 + 2个批量导入)" -ForegroundColor Gray

# 8. 清理测试数据
Write-Host ""
Write-Host "🧹 清理测试数据..." -ForegroundColor Blue

$testDeviceIds = @($testDevice.id, "batch_test_1", "batch_test_2")
foreach ($deviceId in $testDeviceIds) {
    $cleanupResult = Test-API "删除测试设备 $deviceId" "$BackendUrl/api/device-configs/$deviceId" "DELETE"
    if ($cleanupResult.Success) {
        Write-Host "   已删除: $deviceId" -ForegroundColor Gray
    }
}

# 9. 显示测试结果
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

if ($passedTests -eq $totalTests) {
    Write-Host ""
    Write-Host "🎉 所有设备配置测试通过！" -ForegroundColor Green
    exit 0
} else {
    Write-Host ""
    Write-Host "⚠️  部分测试失败，请检查设备配置功能" -ForegroundColor Yellow
    exit 1
}

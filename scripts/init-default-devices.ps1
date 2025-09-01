#!/usr/bin/env pwsh
# 初始化默认设备配置脚本

param(
    [string]$BackendUrl = "http://localhost:9000"
)

Write-Host "🔧 初始化默认设备配置..." -ForegroundColor Cyan
Write-Host "后端地址: $BackendUrl" -ForegroundColor Yellow
Write-Host ""

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
    Write-Host "操作 $totalTests : $Name" -NoNewline
    
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

# 1. 检查当前配置
Write-Host "📋 检查当前配置..." -ForegroundColor Blue

$currentResult = Test-API "获取当前配置" "$BackendUrl/api/device-configs"
$currentConfigs = if ($currentResult.Success) { $currentResult.Data.data } else { @() }

Write-Host "   当前配置数量: $($currentConfigs.Count)" -ForegroundColor Gray

# 2. 定义默认设备配置
$defaultDevices = @(
    @{
        id = "inflate_pump_1"
        name = "充气泵1"
        type = "pump"
        pin = 5
        mode = "pwm"
        pwmFrequency = 490
        maxPower = 100
        description = "主充气泵，用于快速充气"
    },
    @{
        id = "inflate_pump_2"
        name = "充气泵2"
        type = "pump"
        pin = 6
        mode = "pwm"
        pwmFrequency = 490
        maxPower = 100
        description = "辅助充气泵，用于精细调节"
    },
    @{
        id = "exhaust_pump_1"
        name = "抽气泵1"
        type = "pump"
        pin = 10
        mode = "pwm"
        pwmFrequency = 490
        maxPower = 100
        description = "主抽气泵，用于快速排气"
    },
    @{
        id = "exhaust_pump_2"
        name = "抽气泵2"
        type = "pump"
        pin = 11
        mode = "pwm"
        pwmFrequency = 490
        maxPower = 100
        description = "辅助抽气泵，用于精细调节"
    },
    @{
        id = "valve_1"
        name = "电磁阀1"
        type = "valve"
        pin = 2
        mode = "digital"
        description = "主控制阀门"
    },
    @{
        id = "valve_2"
        name = "电磁阀2"
        type = "valve"
        pin = 4
        mode = "digital"
        description = "辅助控制阀门"
    }
)

# 3. 检查哪些设备需要创建
Write-Host ""
Write-Host "🔍 检查需要创建的设备..." -ForegroundColor Blue

$existingIds = $currentConfigs | ForEach-Object { $_.id }
$devicesToCreate = @()

foreach ($device in $defaultDevices) {
    if ($device.id -in $existingIds) {
        Write-Host "   跳过已存在: $($device.name) ($($device.id))" -ForegroundColor Yellow
    } else {
        $devicesToCreate += $device
        Write-Host "   需要创建: $($device.name) ($($device.id))" -ForegroundColor Gray
    }
}

Write-Host "   需要创建设备数量: $($devicesToCreate.Count)" -ForegroundColor Cyan

# 4. 创建缺失的设备
if ($devicesToCreate.Count -gt 0) {
    Write-Host ""
    Write-Host "➕ 创建默认设备..." -ForegroundColor Blue
    
    foreach ($device in $devicesToCreate) {
        $createResult = Test-API "创建 $($device.name)" "$BackendUrl/api/device-configs" "POST" $device
        if ($createResult.Success) {
            Write-Host "   已创建: $($device.name) (引脚 $($device.pin))" -ForegroundColor Gray
        }
    }
} else {
    Write-Host ""
    Write-Host "✅ 所有默认设备已存在，无需创建" -ForegroundColor Green
}

# 5. 验证最终配置
Write-Host ""
Write-Host "📊 验证最终配置..." -ForegroundColor Blue

$finalResult = Test-API "获取最终配置" "$BackendUrl/api/device-configs"
if ($finalResult.Success) {
    $finalConfigs = $finalResult.Data.data
    Write-Host "   最终配置数量: $($finalConfigs.Count)" -ForegroundColor Gray
    
    # 检查所有默认设备是否都存在
    $missingDevices = @()
    foreach ($device in $defaultDevices) {
        $found = $finalConfigs | Where-Object { $_.id -eq $device.id }
        if ($found) {
            Write-Host "   ✅ $($device.name) ($($device.id))" -ForegroundColor Green
        } else {
            Write-Host "   ❌ $($device.name) ($($device.id)) - 缺失" -ForegroundColor Red
            $missingDevices += $device
        }
    }
    
    if ($missingDevices.Count -eq 0) {
        Write-Host ""
        Write-Host "🎉 所有默认设备配置完成！" -ForegroundColor Green
    } else {
        Write-Host ""
        Write-Host "⚠️ 还有 $($missingDevices.Count) 个设备配置缺失" -ForegroundColor Yellow
    }
}

# 6. 显示设备配置详情
Write-Host ""
Write-Host "📋 设备配置详情" -ForegroundColor Magenta
Write-Host "===============" -ForegroundColor Magenta

if ($finalResult.Success) {
    $finalConfigs = $finalResult.Data.data | Sort-Object pin
    
    Write-Host "充气系统:" -ForegroundColor Cyan
    $finalConfigs | Where-Object { $_.id -like "*inflate*" } | ForEach-Object {
        Write-Host "  - $($_.name) (引脚$($_.pin), $($_.mode), $($_.maxPower)%)" -ForegroundColor White
    }
    
    Write-Host "抽气系统:" -ForegroundColor Cyan
    $finalConfigs | Where-Object { $_.id -like "*exhaust*" } | ForEach-Object {
        Write-Host "  - $($_.name) (引脚$($_.pin), $($_.mode), $($_.maxPower)%)" -ForegroundColor White
    }
    
    Write-Host "阀门系统:" -ForegroundColor Cyan
    $finalConfigs | Where-Object { $_.id -like "*valve*" } | ForEach-Object {
        Write-Host "  - $($_.name) (引脚$($_.pin), $($_.mode))" -ForegroundColor White
    }
}

# 7. 显示操作结果
Write-Host ""
Write-Host "📊 操作结果汇总" -ForegroundColor Magenta
Write-Host "===============" -ForegroundColor Magenta
Write-Host "总操作数: $totalTests" -ForegroundColor White
Write-Host "成功数: $passedTests" -ForegroundColor Green
Write-Host "失败数: $($totalTests - $passedTests)" -ForegroundColor Red

if ($totalTests -gt 0) {
    $successRate = [math]::Round(($passedTests / $totalTests) * 100, 2)
    Write-Host "成功率: $successRate%" -ForegroundColor Yellow
} else {
    Write-Host "成功率: 0%" -ForegroundColor Yellow
}

if ($passedTests -eq $totalTests) {
    Write-Host ""
    Write-Host "🎉 默认设备配置初始化完成！" -ForegroundColor Green
    Write-Host "💡 现在可以在控制面板中看到所有设备了。" -ForegroundColor Cyan
    exit 0
} else {
    Write-Host ""
    Write-Host "⚠️ 部分操作失败，请检查后端服务状态" -ForegroundColor Yellow
    exit 1
}

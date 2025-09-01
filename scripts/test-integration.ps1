#!/usr/bin/env pwsh
# 前后端集成测试脚本

param(
    [string]$BackendUrl = "http://localhost:9000",
    [string]$FrontendUrl = "http://localhost:5173"
)

Write-Host "🧪 开始前后端集成测试..." -ForegroundColor Cyan
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
        [hashtable]$Body = $null
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

function Test-WebSocket {
    param(
        [string]$Url
    )

    $script:totalTests++
    Write-Host "测试 $totalTests : WebSocket连接" -NoNewline
    
    try {
        # 简单的WebSocket连接测试
        $uri = [System.Uri]::new($Url)
        $tcpClient = New-Object System.Net.Sockets.TcpClient
        $tcpClient.Connect($uri.Host, $uri.Port)
        $tcpClient.Close()

        Write-Host " ✅" -ForegroundColor Green
        $script:passedTests++
        return $true
    }
    catch {
        Write-Host " ❌" -ForegroundColor Red
        Write-Host "   错误: $($_.Exception.Message)" -ForegroundColor Red
        return $false
    }
}

# 1. 测试后端基础功能
Write-Host "📡 测试后端API..." -ForegroundColor Blue

$result1 = Test-Endpoint "后端健康检查" "$BackendUrl/health"
$result2 = Test-Endpoint "系统状态" "$BackendUrl/"
$result3 = Test-Endpoint "设备配置" "$BackendUrl/api/devices"
$result4 = Test-Endpoint "设备状态" "$BackendUrl/api/devices/status"

# 2. 测试设备控制API
Write-Host ""
Write-Host "🎮 测试设备控制..." -ForegroundColor Blue

# 测试泵控制
$pumpControl = @{
    action = "set_power"
    value = 50
}
$result5 = Test-Endpoint "泵功率控制" "$BackendUrl/api/devices/pump1/control" "POST" $pumpControl

# 测试阀控制
$valveControl = @{
    action = "set_state"
    value = $true
}
$result6 = Test-Endpoint "阀状态控制" "$BackendUrl/api/devices/valve1/control" "POST" $valveControl

# 3. 测试WebSocket连接
Write-Host ""
Write-Host "🔌 测试WebSocket..." -ForegroundColor Blue

$wsResult = Test-WebSocket "$BackendUrl"

# 4. 测试前端页面
Write-Host ""
Write-Host "🌐 测试前端页面..." -ForegroundColor Blue

$result7 = Test-Endpoint "前端首页" "$FrontendUrl"

# 5. 显示测试结果
Write-Host ""
Write-Host "📊 测试结果汇总" -ForegroundColor Magenta
Write-Host "===================" -ForegroundColor Magenta
Write-Host "总测试数: $totalTests" -ForegroundColor White
Write-Host "通过数: $passedTests" -ForegroundColor Green
Write-Host "失败数: $($totalTests - $passedTests)" -ForegroundColor Red
if ($totalTests -gt 0) {
    Write-Host "成功率: $([math]::Round(($passedTests / $totalTests) * 100, 2))%" -ForegroundColor Yellow
} else {
    Write-Host "成功率: 0%" -ForegroundColor Yellow
}

if ($passedTests -eq $totalTests) {
    Write-Host ""
    Write-Host "🎉 所有测试通过！前后端集成正常！" -ForegroundColor Green
    exit 0
} else {
    Write-Host ""
    Write-Host "⚠️  部分测试失败，请检查相关服务状态" -ForegroundColor Yellow
    exit 1
}

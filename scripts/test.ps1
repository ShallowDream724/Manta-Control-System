# Manta Control Ultra - 测试脚本
# 用于验证项目各组件功能

Write-Host "🧪 Manta Control Ultra - 功能测试" -ForegroundColor Green
Write-Host "=================================" -ForegroundColor Green

$testResults = @()

# 测试前端构建
Write-Host "🔧 测试前端构建..." -ForegroundColor Yellow
Set-Location frontend
npm run build 2>$null
if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ 前端构建成功" -ForegroundColor Green
    $testResults += "前端构建: ✅"
} else {
    Write-Host "❌ 前端构建失败" -ForegroundColor Red
    $testResults += "前端构建: ❌"
}

# 测试后端编译
Write-Host "🔧 测试后端编译..." -ForegroundColor Yellow
Set-Location ..\backend
npm run build 2>$null
if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ 后端编译成功" -ForegroundColor Green
    $testResults += "后端编译: ✅"
} else {
    Write-Host "❌ 后端编译失败" -ForegroundColor Red
    $testResults += "后端编译: ❌"
}

# 测试配置文件
Write-Host "📋 测试配置文件..." -ForegroundColor Yellow
Set-Location ..
$configFiles = @("config/devices.json", "config/system.json")
$configValid = $true

foreach ($file in $configFiles) {
    if (Test-Path $file) {
        try {
            $content = Get-Content $file | ConvertFrom-Json
            Write-Host "✅ $file 格式正确" -ForegroundColor Green
        } catch {
            Write-Host "❌ $file 格式错误" -ForegroundColor Red
            $configValid = $false
        }
    } else {
        Write-Host "❌ $file 不存在" -ForegroundColor Red
        $configValid = $false
    }
}

if ($configValid) {
    $testResults += "配置文件: ✅"
} else {
    $testResults += "配置文件: ❌"
}

# 测试目录结构
Write-Host "📁 测试目录结构..." -ForegroundColor Yellow
$requiredDirs = @(
    "frontend/src/components",
    "frontend/src/pages", 
    "frontend/src/hooks",
    "backend/src/controllers",
    "backend/src/services",
    "backend/src/models",
    "arduino/templates",
    "arduino/generated"
)

$dirValid = $true
foreach ($dir in $requiredDirs) {
    if (!(Test-Path $dir)) {
        Write-Host "❌ 缺少目录: $dir" -ForegroundColor Red
        $dirValid = $false
    }
}

if ($dirValid) {
    Write-Host "✅ 目录结构完整" -ForegroundColor Green
    $testResults += "目录结构: ✅"
} else {
    $testResults += "目录结构: ❌"
}

# 输出测试结果
Write-Host ""
Write-Host "📊 测试结果汇总:" -ForegroundColor Cyan
Write-Host "=================" -ForegroundColor Cyan
foreach ($result in $testResults) {
    Write-Host "  $result" -ForegroundColor White
}

Write-Host ""
Write-Host "🎯 测试完成！" -ForegroundColor Green

# Manta Control Ultra - 项目初始化脚本
# 用于快速设置开发环境

Write-Host "🚀 Manta Control Ultra - 项目初始化" -ForegroundColor Green
Write-Host "=================================" -ForegroundColor Green

# 检查 Node.js 版本
Write-Host "📋 检查 Node.js 版本..." -ForegroundColor Yellow
$nodeVersion = node --version 2>$null
if ($nodeVersion) {
    Write-Host "✅ Node.js 版本: $nodeVersion" -ForegroundColor Green
} else {
    Write-Host "❌ 未找到 Node.js，请先安装 Node.js" -ForegroundColor Red
    exit 1
}

# 检查 npm 版本
$npmVersion = npm --version 2>$null
if ($npmVersion) {
    Write-Host "✅ npm 版本: $npmVersion" -ForegroundColor Green
} else {
    Write-Host "❌ 未找到 npm" -ForegroundColor Red
    exit 1
}

# 安装前端依赖
Write-Host "📦 安装前端依赖..." -ForegroundColor Yellow
Set-Location frontend
npm install
if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ 前端依赖安装完成" -ForegroundColor Green
} else {
    Write-Host "❌ 前端依赖安装失败" -ForegroundColor Red
    exit 1
}

# 安装后端依赖
Write-Host "📦 安装后端依赖..." -ForegroundColor Yellow
Set-Location ..\backend
npm install
if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ 后端依赖安装完成" -ForegroundColor Green
} else {
    Write-Host "❌ 后端依赖安装失败" -ForegroundColor Red
    exit 1
}

# 创建日志目录
Write-Host "📁 创建必要目录..." -ForegroundColor Yellow
Set-Location ..
if (!(Test-Path "logs")) {
    New-Item -ItemType Directory -Path "logs"
    Write-Host "✅ 创建 logs 目录" -ForegroundColor Green
}

if (!(Test-Path "database")) {
    New-Item -ItemType Directory -Path "database"
    Write-Host "✅ 创建 database 目录" -ForegroundColor Green
}

Write-Host "🎉 项目初始化完成！" -ForegroundColor Green
Write-Host "" 
Write-Host "📝 下一步操作:" -ForegroundColor Cyan
Write-Host "  1. 启动后端: cd backend && npm run dev" -ForegroundColor White
Write-Host "  2. 启动前端: cd frontend && npm run dev" -ForegroundColor White
Write-Host "  3. 访问: http://localhost:5173" -ForegroundColor White

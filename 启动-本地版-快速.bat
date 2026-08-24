@echo off
chcp 65001 >nul
title 南雍待办 - 本地版（开发模式）
echo ============================================
echo   南雍待办（本地版·开发模式）启动中...
echo ============================================
echo.

cd /d "%~dp0"

if not exist node_modules (
    echo 首次运行，正在安装依赖...
    call pnpm install
    if errorlevel 1 (
        echo 依赖安装失败，请确认已安装 Node.js 和 pnpm
        pause
        exit /b 1
    )
)

echo.
echo ============================================
echo   ✅ 启动中！请稍候，浏览器打开：
echo.
echo       http://localhost:3000
echo.
echo   关闭此窗口 = 停止服务器
echo ============================================
echo.

set PORT=3000
call npx next dev
if errorlevel 1 (
    echo 3000 端口被占用，改用 3100...
    set PORT=3100
    call npx next dev
)

pause

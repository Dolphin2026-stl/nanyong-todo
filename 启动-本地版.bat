@echo off
chcp 65001 >nul
title 南雍待办 - 本地版启动器
echo ============================================
echo   南雍待办（本地版）启动中...
echo ============================================
echo.

cd /d "%~dp0"

REM 检查是否有 node_modules，没有则先安装
if not exist node_modules (
    echo [1/3] 首次运行，正在安装依赖（需要几分钟）...
    call pnpm install
    if errorlevel 1 (
        echo.
        echo [错误] 依赖安装失败，请确认已安装 Node.js 和 pnpm
        pause
        exit /b 1
    )
)

echo [2/3] 正在构建...
call npx next build
if errorlevel 1 (
    echo.
    echo [错误] 构建失败，请检查错误信息
    pause
    exit /b 1
)

echo [3/3] 正在启动服务器...
echo.
echo ============================================
echo   ✅ 启动成功！请在浏览器打开：
echo.
echo       http://localhost:3000
echo.
echo   关闭此窗口 = 停止服务器
echo ============================================
echo.

REM 启动服务器（3000 端口被占用时自动改用 3100）
set PORT=3000
npx next start
if errorlevel 1 (
    echo.
    echo [提示] 3000 端口被占用，改用 3100...
    set PORT=3100
    npx next start
)

pause

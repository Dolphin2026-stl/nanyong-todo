@echo off
chcp 65001 >nul
title NanyongToDo Local Quick
echo Starting...
cd /d "%~dp0"
if not exist node_modules (
    echo Installing dependencies...
    call pnpm install
    if errorlevel 1 ( echo Install failed & pause & exit /b 1 )
)
if not exist ".next\BUILD_ID" (
    echo Building...
    "C:\Program Files\nodejs\node.exe" "%~dp0node_modules\next\dist\bin\next" build
    if errorlevel 1 ( echo Build failed & pause & exit /b 1 )
)
echo.
echo ============================================
echo   OK! Open: http://localhost:3100
echo   Close this window to stop server
echo ============================================
echo.
set PORT=3100
set LOCAL_JWT_SECRET=nanyong-local-run-secret
set COREPACK_ENABLE_STRICT=0
"C:\Program Files\nodejs\node.exe" "%~dp0node_modules\next\dist\bin\next" start
pause
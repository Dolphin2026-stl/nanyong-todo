@echo off
rem NanyongToDo local server autostart
setlocal
cd /d "E:\TODO-list\backup\nanyong-todo"

netstat -an | findstr ":3100 .*LISTENING" >nul 2>&1
if %errorlevel%==0 exit /b 0

set PORT=3100
set LOCAL_JWT_SECRET=nanyong-local-run-secret
set COREPACK_ENABLE_STRICT=0

start "" /min "C:\Program Files\nodejs\node.exe" "E:\TODO-list\backup\nanyong-todo\node_modules\next\dist\bin\next" start
exit /b 0
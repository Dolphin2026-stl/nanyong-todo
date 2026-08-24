' 南雍待办本地版 - 开机自启启动器（隐藏窗口）
' 由启动文件夹快捷方式在用户登录时调用，后台静默运行本地服务器

Option Explicit

Dim repoDir, nodePath, shell, fso, logFile
repoDir = "E:\TODO-list\backup\nanyong-todo"
nodePath = "C:\Program Files\nodejs\node.exe"
logFile = repoDir & "\data\startup.log"

Set fso = CreateObject("Scripting.FileSystemObject")
If Not fso.FolderExists(repoDir & "\data") Then
    fso.CreateFolder repoDir & "\data"
End If

' 记录启动
Dim logStream
Set logStream = fso.OpenTextFile(logFile, 8, True)
logStream.WriteLine Now & " - 启动南雍待办本地版"
logStream.Close

Set shell = CreateObject("WScript.Shell")
shell.CurrentDirectory = repoDir

' 静默启动 next start（-p 指定端口 3100，避免 3000 被占用）
' 使用 cmd /c 设置环境变量后启动，窗口隐藏(0)
Dim cmd
cmd = "cmd /c ""set PORT=3100 && set LOCAL_JWT_SECRET=nanyong-local-run-secret && set COREPACK_ENABLE_STRICT=0 && """ & nodePath & """ """ & repoDir & "\node_modules\next\dist\bin\next"" start"""
shell.Run cmd, 0, False

' 追加日志
Set logStream = fso.OpenTextFile(logFile, 8, True)
logStream.WriteLine Now & " - 启动命令已执行: " & cmd
logStream.Close

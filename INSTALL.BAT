@echo off
setlocal EnableExtensions DisableDelayedExpansion
title Viecodie Installer - Full Setup (Online va Offline)
rem Put this file beside package.json. Optional: INSTALL.BAT "C:\path\to\CODE"
rem --check only reports prerequisites; --help shows usage. Neither installs anything.
if /i "%~1"=="--help" goto help
set "PATH=%ProgramFiles%\nodejs;%LOCALAPPDATA%\Programs\nodejs;%APPDATA%\npm;%LOCALAPPDATA%\Programs\Ollama;%ProgramFiles%\Ollama;%PATH%"
if /i "%~1"=="--check" goto check_only
set "VIE_SOURCE=%~dp0"
if not "%~1"=="" set "VIE_SOURCE=%~1"
set "VIE_STEP=Find source folder"
cd /d "%VIE_SOURCE%"
if errorlevel 1 goto failed
if not exist "package.json" goto missing_source
if not exist "src\cli.tsx" goto missing_source
node -e "const p=require('./package.json');process.exit(p.name==='viecodie-agent'?0:1)" >nul 2>nul

echo.
echo ============================================================
echo VIECODIE - CAI DAT / CAU HINH (INSTALL ^& SETUP)
echo ============================================================
echo Ho tro chay song song:
echo  * ONLINE  : DeepSeek Cloud API (sieu nhe, khong can cai dat Ollama)
echo  * OFFLINE : Ollama Local (Qwen / DeepSeek R1 tren may, khong can mang)
echo ============================================================
echo.

set "VIE_STEP=Install Node.js LTS"
node -e "process.exit(Number(process.versions.node.split('.')[0])>=22?0:1)" >nul 2>nul
if not errorlevel 1 goto node_ready
where winget.exe >nul 2>nul
if errorlevel 1 goto node_manual
echo Dang cai dat Node.js LTS qua winget...
winget install --id OpenJS.NodeJS.LTS --exact --silent --accept-source-agreements --accept-package-agreements
set "PATH=%ProgramFiles%\nodejs;%LOCALAPPDATA%\Programs\nodejs;%PATH%"
node -e "process.exit(Number(process.versions.node.split('.')[0])>=22?0:1)" >nul 2>nul
if errorlevel 1 goto node_manual

:node_ready
set "VIE_STEP=Check Node.js, npm and source"
node --version
call npm.cmd --version
if errorlevel 1 goto failed
node -e "const p=require('./package.json');process.exit(p.name==='viecodie-agent'?0:1)"
if errorlevel 1 goto missing_source
if not exist "package-lock.json" goto missing_source

set "VIE_STAGE=%TEMP%\viecodie-install-%RANDOM%-%RANDOM%"
mkdir "%VIE_STAGE%"
if errorlevel 1 goto failed

set "VIE_STEP=Install dependencies"
echo.
echo [1/5] Dang cai dat cac thu vien (npm ci)...
call npm.cmd ci --no-audit --no-fund
if errorlevel 1 goto failed

set "VIE_STEP=Build CLI and web interface"
echo.
echo [2/5] Dang bien dich CLI va Web UI (npm run build)...
call npm.cmd run build
if errorlevel 1 goto failed
if not exist "dist\cli.js" goto failed
if not exist "dist\web\index.html" goto failed

set "VIE_STEP=Package the completed build"
echo.
echo [3/5] Dang dong goi san pham...
call npm.cmd pack --ignore-scripts --pack-destination "%VIE_STAGE%"
if errorlevel 1 goto failed
set "VIE_ARCHIVE="
for %%F in ("%VIE_STAGE%\*.tgz") do if exist "%%~fF" set "VIE_ARCHIVE=%%~fF"
if not defined VIE_ARCHIVE goto failed

set "VIE_STEP=Install and verify Viecodie command"
echo.
echo [4/5] Dang cai dat lenh viecodie vao he thong Windows...
set "VIE_PREFIX=%APPDATA%\npm"
call npm.cmd install --global "%VIE_ARCHIVE%" --prefix "%VIE_PREFIX%" --ignore-scripts --no-audit --no-fund
if errorlevel 1 goto failed
set "PATH=%VIE_PREFIX%;%PATH%"
if not exist "%VIE_PREFIX%\viecodie.cmd" goto failed
call "%VIE_PREFIX%\viecodie.cmd" --version
if errorlevel 1 goto failed
call "%VIE_PREFIX%\viecodie.cmd" --help >nul
if errorlevel 1 goto failed
powershell.exe -NoProfile -Command "$p=$env:VIE_PREFIX; $old=[Environment]::GetEnvironmentVariable('Path','User'); $parts=@($old -split ';' | Where-Object { $_ }); if ($parts -notcontains $p) { [Environment]::SetEnvironmentVariable('Path', (($parts + $p) -join ';'), 'User') }"
if errorlevel 1 echo WARNING: User PATH could not be saved. Full command: "%VIE_PREFIX%\viecodie.cmd"

echo.
echo ============================================================
echo [5/5] CAU HINH MO HINH AI (AI SETUP)
echo ============================================================
echo [1] Che do OFFLINE (Cai dat Ollama va chay model tren may, khong can mang)
echo [2] Che do ONLINE  (Dung DeepSeek Cloud API - sieu nhe, khong can Ollama)
echo [3] Che do DUAL    (Chay song song ca Online DeepSeek va Offline Ollama)
echo [4] Bo qua         (Giu nguyen cau hinh AI hien tai)
echo.
choice /c 1234 /n /m "Nhap lua chon cua ban [1, 2, 3 hoac 4]: "
if errorlevel 4 goto success
if errorlevel 3 goto setup_dual
if errorlevel 2 goto setup_online
goto install_ollama

:setup_online
set "VIE_STEP=Configure DeepSeek Online API"
echo.
echo --- CAU HINH DEEPSEEK CLOUD API (ONLINE) ---
echo Lay API Key tai: https://platform.deepseek.com
set "DEEPSEEK_KEY="
set /p "DEEPSEEK_KEY=Nhap DeepSeek API Key (Nhan Enter de bo qua neu chua co): "
if defined DEEPSEEK_KEY (
  powershell.exe -NoProfile -Command "$k=$env:DEEPSEEK_KEY.Trim(); if ($k) { [Environment]::SetEnvironmentVariable('DEEPSEEK_API_KEY', $k, 'User') }"
)
node -e "const fs=require('fs'),path=require('path');const d=path.join(require('os').homedir(),'.viecodie'),p=path.join(d,'config.json'),legacy=path.join(require('os').homedir(),'.miii','config.json');const source=fs.existsSync(p)?p:fs.existsSync(legacy)?legacy:null;const c=source?JSON.parse(fs.readFileSync(source,'utf8')):{};fs.mkdirSync(d,{recursive:true});if(source)fs.copyFileSync(source,p+'.backup-'+Date.now());c.provider='deepseek';c.model='deepseek-chat';const key=process.env.DEEPSEEK_KEY?process.env.DEEPSEEK_KEY.trim():'';c.providers={...c.providers,deepseek:{type:'openai',baseUrl:'https://api.deepseek.com',apiKey:key||undefined,apiKeyEnv:'DEEPSEEK_API_KEY',contextWindow:65536},ollama:{type:'ollama',baseUrl:'http://localhost:11434'}};c.modelContexts={...c.modelContexts,'deepseek-chat':65536,'deepseek-reasoner':65536};fs.writeFileSync(p,JSON.stringify(c,null,2));"
if errorlevel 1 goto ai_failed
echo Da cau hinh DeepSeek Online API thanh cong!
goto success

:setup_dual
set "VIE_STEP=Configure Dual Mode"
echo.
echo --- CAU HINH SONG SONG ONLINE DEEPSEEK VA OFFLINE OLLAMA ---
echo Lay API Key tai: https://platform.deepseek.com
set "DEEPSEEK_KEY="
set /p "DEEPSEEK_KEY=Nhap DeepSeek API Key cho che do Online (Nhan Enter de bo qua): "
if defined DEEPSEEK_KEY (
  powershell.exe -NoProfile -Command "$k=$env:DEEPSEEK_KEY.Trim(); if ($k) { [Environment]::SetEnvironmentVariable('DEEPSEEK_API_KEY', $k, 'User') }"
)
node -e "const fs=require('fs'),path=require('path');const d=path.join(require('os').homedir(),'.viecodie'),p=path.join(d,'config.json'),legacy=path.join(require('os').homedir(),'.miii','config.json');const source=fs.existsSync(p)?p:fs.existsSync(legacy)?legacy:null;const c=source?JSON.parse(fs.readFileSync(source,'utf8')):{};fs.mkdirSync(d,{recursive:true});if(source)fs.copyFileSync(source,p+'.backup-'+Date.now());const key=process.env.DEEPSEEK_KEY?process.env.DEEPSEEK_KEY.trim():'';c.providers={...c.providers,deepseek:{type:'openai',baseUrl:'https://api.deepseek.com',apiKey:key||undefined,apiKeyEnv:'DEEPSEEK_API_KEY',contextWindow:65536}};c.modelContexts={...c.modelContexts,'deepseek-chat':65536,'deepseek-reasoner':65536};fs.writeFileSync(p,JSON.stringify(c,null,2));"
echo Da luu cau hinh DeepSeek Online! Tiep tuc thiet lap Ollama Offline...
goto install_ollama

:install_ollama
set "VIE_STEP=Install Ollama"
where ollama.exe >nul 2>nul
if not errorlevel 1 goto ollama_ready
where winget.exe >nul 2>nul
if errorlevel 1 goto ollama_manual
echo Dang cai dat Ollama qua winget...
winget install --id Ollama.Ollama --exact --silent --accept-source-agreements --accept-package-agreements
set "PATH=%LOCALAPPDATA%\Programs\Ollama;%ProgramFiles%\Ollama;%PATH%"
where ollama.exe >nul 2>nul
if errorlevel 1 goto ollama_manual

:ollama_ready
set "VIE_STEP=Start Ollama server"
echo Dang khoi dong Ollama va kiem tra ket noi http://localhost:11434 ...
powershell.exe -NoProfile -Command "$ErrorActionPreference='Stop'; function Ready { try { $null=Invoke-RestMethod 'http://127.0.0.1:11434/api/tags' -TimeoutSec 2; return $true } catch { return $false } }; if (Ready) { exit 0 }; $app=Join-Path $env:LOCALAPPDATA 'Programs\Ollama\ollama app.exe'; if (Test-Path -LiteralPath $app) { Start-Process -FilePath $app -WindowStyle Hidden } else { Start-Process -FilePath 'ollama.exe' -ArgumentList 'serve' -WindowStyle Hidden }; for ($i=0; $i -lt 20; $i++) { Start-Sleep -Seconds 2; if (Ready) { exit 0 } }; Write-Host 'Ollama chua khoi dong. Hay mo Ollama tu Start Menu.'; exit 1"
if errorlevel 1 goto ai_failed

echo.
echo Chon mo hinh AI cho Ollama Offline:
echo [1] qwen2.5-coder:7b  - Khuyen dung (Lap trinh xuat sac, on dinh)
echo [2] deepseek-r1:7b    - Mo hinh suy luan DeepSeek R1 Local
echo [3] qwen2.5-coder:3b  - Ban sieu nhe cho may RAM 8GB
echo [4] Bo qua tai model  (Giu nguyen cac model da co)
echo.
choice /c 1234 /n /m "Chon [1, 2, 3 hoac 4]: "
if errorlevel 4 goto save_ollama_config
if errorlevel 3 goto set_model_3b
if errorlevel 2 goto set_model_deepseek
set "VIE_MODEL=qwen2.5-coder:7b"
goto pull_model
:set_model_deepseek
set "VIE_MODEL=deepseek-r1:7b"
goto pull_model
:set_model_3b
set "VIE_MODEL=qwen2.5-coder:3b"

:pull_model
set "VIE_STEP=Download Ollama model"
echo Dang tai mo hinh %VIE_MODEL%. Qua trinh nay co the mat vai phut...
ollama.exe pull %VIE_MODEL%
if errorlevel 1 goto ai_failed
ollama.exe show %VIE_MODEL% >nul
if errorlevel 1 goto ai_failed

:save_ollama_config
set "VIE_STEP=Save Ollama provider and model"
node -e "const fs=require('fs'),path=require('path');const d=path.join(require('os').homedir(),'.viecodie'),p=path.join(d,'config.json'),legacy=path.join(require('os').homedir(),'.miii','config.json');const source=fs.existsSync(p)?p:fs.existsSync(legacy)?legacy:null;const c=source?JSON.parse(fs.readFileSync(source,'utf8')):{};fs.mkdirSync(d,{recursive:true});if(source)fs.copyFileSync(source,p+'.backup-'+Date.now());c.provider='ollama';if(process.env.VIE_MODEL)c.model=process.env.VIE_MODEL;c.providers={...c.providers,ollama:{type:'ollama',baseUrl:'http://localhost:11434'},deepseek:{type:'openai',baseUrl:'https://api.deepseek.com',apiKeyEnv:'DEEPSEEK_API_KEY',contextWindow:65536}};fs.writeFileSync(p,JSON.stringify(c,null,2));"
if errorlevel 1 goto ai_failed
goto success

:node_manual
echo.
echo [LOI] Can cai dat Node.js LTS (phien ban 22 tro len) tu: https://nodejs.org
echo Sau khi cai dat xong, hay chay lai INSTALL.BAT.
goto failed

:ollama_manual
echo.
echo [CANH BAO] Viecodie da duoc cai dat, nhung khong the tu dong cai Ollama.
echo Ban co the tai va cai Ollama thu cong tai: https://ollama.com/download/windows
echo Sau do chay lai INSTALL.BAT hoac dung che do Online DeepSeek API.
goto ai_failed

:missing_source
echo.
echo [LOI] Hay dat file INSTALL.BAT ben trong thu muc ma nguon cua Viecodie
echo (ngang hang voi package.json va thu muc src).
echo Hoac chay: INSTALL.BAT "C:\path\to\CODE"
goto failed

:ai_failed
echo.
echo Viecodie da duoc cai dat thanh cong. Thiet lap AI tam dung tai buoc: %VIE_STEP%
echo Ban co the cau hinh truc tiep trong ung dung sau khi mo.
pause
exit /b 1

:success
echo.
echo ============================================================
echo THIET LAP THANH CONG! VIECODIE DA SAN SANG SU DUNG
echo ============================================================
echo * Lenh Terminal:      viecodie
echo * Giao dien Web UI:    viecodie web
echo.
echo * Chuyen doi nhanh Online / Offline:
echo   - Web UI:  Chon ngay o menu "Nha cung cap" (DeepSeek hoac Ollama)
echo   - CLI:     Go /provider deepseek hoac /provider ollama
echo ============================================================
echo.
choice /c YN /n /m "Mo giao dien Viecodie Web ngay bay gio? [Y/N]: "
if errorlevel 2 exit /b 0
call "%VIE_PREFIX%\viecodie.cmd" web
if errorlevel 1 goto failed
exit /b 0

:failed
echo.
echo THAT BAI tai buoc: %VIE_STEP%
echo Vui long kiem tra thong bao loi o tren. Ban co the chay lai file bat ky luc nao.
pause
exit /b 1

:check_only
echo Dang kiem tra dieu kien tien quyet...
set "VIE_CHECK=0"
node -e "process.exit(Number(process.versions.node.split('.')[0])>=22?0:1)" >nul 2>nul
if errorlevel 1 (echo Node.js 22+: CHUA CO hoac qua cu) else (echo Node.js 22+: OK)
if errorlevel 1 set "VIE_CHECK=1"
where npm.cmd >nul 2>nul
if errorlevel 1 (echo npm: CHUA CO) else (echo npm: OK)
if errorlevel 1 set "VIE_CHECK=1"
where ollama.exe >nul 2>nul
if errorlevel 1 (echo Ollama: CHUA CO - co the dung Online DeepSeek hoac cai qua script) else (echo Ollama: DA CO)
exit /b %VIE_CHECK%

:help
echo Cach su dung:
echo Dat file INSTALL.BAT canh file package.json cua du an roi nhap dup chuot de chay.
echo Hoac chay qua dong lenh:
echo   INSTALL.BAT "C:\path\to\CODE"
echo   INSTALL.BAT --check   Kiem tra moi truong khong cai dat
echo   INSTALL.BAT --help    Hien thi huong dan
exit /b 0

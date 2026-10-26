@echo off
setlocal EnableExtensions DisableDelayedExpansion
title Viecodie Installer - Build and Ollama Fix
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
rem Node may not exist yet; verify project identity again after installing it.
echo.
echo ============================================================
echo VIECODIE - INSTALL / REPAIR
echo ============================================================
echo This installs Node.js if needed, then builds the local source.
echo Later you can choose Ollama setup or keep your existing AI setup.
echo.
set "VIE_STEP=Install Node.js LTS"
node -e "process.exit(Number(process.versions.node.split('.')[0])>=22?0:1)" >nul 2>nul
if not errorlevel 1 goto node_ready
where winget.exe >nul 2>nul
if errorlevel 1 goto node_manual
winget install --id OpenJS.NodeJS.LTS --exact --silent --accept-source-agreements --accept-package-agreements
rem Refresh PATH even when winget reports that the package is already installed.
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
echo [1/5] Installing dependencies. Please wait...
echo npm install-scripts warnings alone are not a failure; the build below checks the result.
call npm.cmd ci --no-audit --no-fund
if errorlevel 1 goto failed
set "VIE_STEP=Build CLI and web interface"
echo.
echo [2/5] Building CLI and web interface...
call npm.cmd run build
if errorlevel 1 goto failed
if not exist "dist\cli.js" goto failed
if not exist "dist\web\index.html" goto failed
set "VIE_STEP=Package the completed build"
echo.
echo [3/5] Packaging the build...
rem Packing FIRST avoids the missing dist/cli.js and local-folder symlink problems.
rem Build already ran explicitly; do not run prepack a second time.
call npm.cmd pack --ignore-scripts --pack-destination "%VIE_STAGE%"
if errorlevel 1 goto failed
set "VIE_ARCHIVE="
for %%F in ("%VIE_STAGE%\*.tgz") do if exist "%%~fF" set "VIE_ARCHIVE=%%~fF"
if not defined VIE_ARCHIVE goto failed
set "VIE_STEP=Install and verify Viecodie command"
echo.
echo [4/5] Installing the packaged build for your Windows account...
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
echo [5/5] AI setup
echo [1] Set up local Ollama and download a model
echo [2] Keep existing AI / API configuration and skip Ollama
choice /c 12 /n /m "Choose 1 or 2: "
if errorlevel 2 goto success
set "VIE_STEP=Install Ollama"
where ollama.exe >nul 2>nul
if not errorlevel 1 goto ollama_ready
where winget.exe >nul 2>nul
if errorlevel 1 goto ollama_manual
winget install --id Ollama.Ollama --exact --silent --accept-source-agreements --accept-package-agreements
set "PATH=%LOCALAPPDATA%\Programs\Ollama;%ProgramFiles%\Ollama;%PATH%"
where ollama.exe >nul 2>nul
if errorlevel 1 goto ollama_manual
:ollama_ready
set "VIE_STEP=Start Ollama server"
echo Starting Ollama and waiting for http://localhost:11434 ...
rem Reuse a running server; otherwise start the tray app or CLI in the background.
powershell.exe -NoProfile -Command "$ErrorActionPreference='Stop'; function Ready { try { $null=Invoke-RestMethod 'http://127.0.0.1:11434/api/tags' -TimeoutSec 2; return $true } catch { return $false } }; if (Ready) { exit 0 }; $app=Join-Path $env:LOCALAPPDATA 'Programs\Ollama\ollama app.exe'; if (Test-Path -LiteralPath $app) { Start-Process -FilePath $app -WindowStyle Hidden } else { Start-Process -FilePath 'ollama.exe' -ArgumentList 'serve' -WindowStyle Hidden }; for ($i=0; $i -lt 20; $i++) { Start-Sleep -Seconds 2; if (Ready) { exit 0 } }; Write-Host 'Ollama did not start. Open Ollama from Start, then rerun this installer.'; exit 1"
if errorlevel 1 goto ai_failed
echo.
echo Choose a model. Download size and speed depend on your computer.
echo [1] qwen2.5-coder:3b - smaller model
echo [2] qwen2.5-coder:7b - larger model
echo [3] Skip downloading; keep installed model and configuration
choice /c 123 /n /m "Choose 1, 2 or 3: "
if errorlevel 3 goto success
if errorlevel 2 goto model_7b
set "VIE_MODEL=qwen2.5-coder:3b"
goto pull_model
:model_7b
set "VIE_MODEL=qwen2.5-coder:7b"
:pull_model
set "VIE_STEP=Download Ollama model"
echo Downloading %VIE_MODEL%. This may take a while...
ollama.exe pull %VIE_MODEL%
if errorlevel 1 goto ai_failed
ollama.exe show %VIE_MODEL% >nul
if errorlevel 1 goto ai_failed
set "VIE_STEP=Save Ollama provider and model"
rem Preserve all other settings. Back up existing config before making changes.
node -e "const fs=require('fs'),path=require('path');const d=path.join(require('os').homedir(),'.viecodie'),p=path.join(d,'config.json'),legacy=path.join(require('os').homedir(),'.miii','config.json');const source=fs.existsSync(p)?p:fs.existsSync(legacy)?legacy:null;const c=source?JSON.parse(fs.readFileSync(source,'utf8')):{};fs.mkdirSync(d,{recursive:true});if(source)fs.copyFileSync(source,p+'.backup-'+Date.now());c.provider='ollama';c.model=process.env.VIE_MODEL;c.providers={...c.providers,ollama:{type:'ollama',baseUrl:'http://localhost:11434'}};fs.writeFileSync(p,JSON.stringify(c,null,2));"
if errorlevel 1 goto ai_failed
goto success
:node_manual
echo Install Node.js LTS from https://nodejs.org then run INSTALL.BAT again.
echo Node.js 22 or newer is required by this installer.
goto failed
:ollama_manual
echo Viecodie is installed, but Ollama could not be installed automatically.
echo Install it from https://ollama.com/download/windows then rerun INSTALL.BAT.
goto ai_failed
:missing_source
echo Put INSTALL.BAT inside the CODE folder, beside package.json and src.
echo Or run: INSTALL.BAT "D:\Download\1044\CODE"
goto failed
:ai_failed
echo.
echo Viecodie is installed. AI setup is incomplete at: %VIE_STEP%
echo Fix the error above and rerun, or configure another provider in the app.
pause
exit /b 1
:success
echo.
echo SUCCESS: Viecodie has been built, installed, and its command verified.
echo Command: "%VIE_PREFIX%\viecodie.cmd"
echo Run viecodie web from your project folder to use the browser interface.
echo If using an API provider, configure its API key and model in the app.
echo Keep this terminal open while the web interface runs.
choice /c YN /n /m "Open Viecodie web now? [Y/N]: "
if errorlevel 2 exit /b 0
call "%VIE_PREFIX%\viecodie.cmd" web
if errorlevel 1 goto failed
exit /b 0
:failed
echo.
echo FAILED at: %VIE_STEP%
echo Read the error above or send a screenshot. The installer can be run again.
pause
exit /b 1
:check_only
echo Checking only. Nothing will be installed or downloaded.
set "VIE_CHECK=0"
node -e "process.exit(Number(process.versions.node.split('.')[0])>=22?0:1)" >nul 2>nul
if errorlevel 1 (echo Node.js 22+: MISSING or too old) else (echo Node.js 22+: OK)
if errorlevel 1 set "VIE_CHECK=1"
where npm.cmd >nul 2>nul
if errorlevel 1 (echo npm: MISSING) else (echo npm: OK)
if errorlevel 1 set "VIE_CHECK=1"
where ollama.exe >nul 2>nul
if errorlevel 1 (echo Ollama: MISSING - choose Ollama setup during installation) else (echo Ollama: FOUND)
exit /b %VIE_CHECK%
:help
echo Place INSTALL.BAT beside the project's package.json, then double-click it.
echo Alternative: INSTALL.BAT "C:\path\to\CODE"
echo INSTALL.BAT --check   Check prerequisites without installing anything.
echo INSTALL.BAT --help    Show this help.
exit /b 0
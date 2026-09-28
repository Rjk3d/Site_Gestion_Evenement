@echo off
cd /d "%~dp0"
title Activites et Excursions

REM ============================================================
REM   Lanceur tout-en-un : installe Node.js si besoin,
REM   puis demarre l'application et ouvre le navigateur.
REM   Aucune ligne a taper : il suffit de double-cliquer.
REM ============================================================

set "APPDIR=%~dp0"
set "PORTABLE=%APPDIR%runtime\node-v24.15.0-win-x64\node.exe"
set "NEXTREL=node_modules\next\dist\bin\next"
set "NODEEXE="

REM --- L'application est-elle deja installee sur ce PC ? ---
if not exist "%APPDIR%%NEXTREL%" goto :installer
if not exist "%APPDIR%.next\BUILD_ID" goto :installer
goto :chercher_node

:installer
if not exist "%APPDIR%INSTALLER-SUR-CE-PC.bat" (
  echo.
  echo   PROBLEME : le dossier de l'application est incomplet.
  echo   Recopiez l'INTEGRALITE du dossier d'origine, puis relancez ce fichier.
  echo.
  pause
  exit /b 1
)
echo.
echo   Premiere utilisation sur cet ordinateur.
echo   Installation automatique en cours, merci de patienter...
echo.
call "%APPDIR%INSTALLER-SUR-CE-PC.bat" /auto
if not exist "%APPDIR%.next\BUILD_ID" exit /b 1

:chercher_node
REM --- 1) Node.js portable deja installe dans le dossier ? ---
if exist "%PORTABLE%" (
  set "NODEEXE=%PORTABLE%"
  goto :run
)

REM --- 2) Node.js deja present sur l'ordinateur en version compatible ? ---
for /f "tokens=1 delims=." %%v in ('node -v 2^>nul') do set "SYSMAJOR=%%v"
if "%SYSMAJOR%"=="v24" (
  set "NODEEXE=node"
  goto :run
)

REM --- 3) Sinon : installation automatique de Node.js (une seule fois) ---
echo.
echo   Premiere utilisation sur cet ordinateur.
echo   Installation automatique du moteur necessaire (1 a 2 minutes)...
echo   Merci de patienter, ne fermez pas cette fenetre.
echo.
powershell -NoProfile -ExecutionPolicy Bypass -Command "$ProgressPreference='SilentlyContinue'; [Net.ServicePointManager]::SecurityProtocol=[Net.SecurityProtocolType]::Tls12; New-Item -ItemType Directory -Force -Path '%APPDIR%runtime' | Out-Null; Invoke-WebRequest -Uri 'https://nodejs.org/dist/v24.15.0/node-v24.15.0-win-x64.zip' -OutFile '%APPDIR%runtime\node.zip'"
if exist "%APPDIR%runtime\node.zip" tar -xf "%APPDIR%runtime\node.zip" -C "%APPDIR%runtime"
if not exist "%PORTABLE%" if exist "%APPDIR%runtime\node.zip" powershell -NoProfile -Command "$ProgressPreference='SilentlyContinue'; Expand-Archive -Path '%APPDIR%runtime\node.zip' -DestinationPath '%APPDIR%runtime' -Force"
del /f /q "%APPDIR%runtime\node.zip" >nul 2>&1
if exist "%PORTABLE%" (
  set "NODEEXE=%PORTABLE%"
  goto :run
)
echo.
echo   ECHEC de l'installation automatique.
echo   Verifiez la connexion Internet, puis relancez ce fichier.
echo.
pause
exit /b 1

:run
REM Rendre node disponible pour d'eventuels sous-processus
if exist "%PORTABLE%" set "PATH=%APPDIR%runtime\node-v24.15.0-win-x64;%PATH%"

REM Demarrer le serveur en arriere-plan, sans fenetre visible
powershell -NoProfile -Command "Start-Process -FilePath '%NODEEXE%' -ArgumentList '%NEXTREL%','start' -WorkingDirectory '%APPDIR%' -WindowStyle Hidden"

REM Attendre que le serveur soit pret (jusqu'a 30 s), puis ouvrir le navigateur
powershell -NoProfile -Command "for ($i=0; $i -lt 30; $i++) { try { if ((Invoke-WebRequest 'http://localhost:3000' -UseBasicParsing -TimeoutSec 2).StatusCode -eq 200) { break } } catch {} ; Start-Sleep -Seconds 1 }"
start "" "http://localhost:3000"
exit /b 0

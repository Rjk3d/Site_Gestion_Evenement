@echo off
cd /d "%~dp0"
title Installation - Activites et Excursions

set "APPDIR=%~dp0"
set "NODEVER=v24.15.0"
set "NODEDIR=%APPDIR%runtime\node-%NODEVER%-win-x64"
set "PORTABLE=%NODEDIR%\node.exe"
set "AUTO=%~1"
set "SYSMAJOR="

echo ================================================================
echo    ACTIVITES ET EXCURSIONS - Installation sur cet ordinateur
echo ================================================================
echo.
echo A faire UNE SEULE FOIS sur ce PC.
echo Duree : 3 a 10 minutes selon la connexion Internet.
echo Une connexion Internet est necessaire.
echo Ne fermez pas cette fenetre pendant l'installation.
echo.

REM --- Avertissement si le dossier est trop profond dans l'arborescence ---
powershell -NoProfile -Command "if ('%APPDIR%'.Length -gt 90) { exit 1 } else { exit 0 }"
if not errorlevel 1 goto :chemin_ok
echo   ATTENTION : le dossier de l'application est place tres profond :
echo   %APPDIR%
echo   Windows limite la longueur des chemins et l'installation peut echouer.
echo   Conseil : deplacez le dossier vers un endroit plus court, par exemple
echo   C:\Apps\Evo2  puis relancez ce fichier.
echo.
:chemin_ok

REM ================= ETAPE 1 : moteur Node.js =================
echo [1/5] Verification du moteur Node.js...
if exist "%PORTABLE%" goto :node_portable

for /f "tokens=1 delims=." %%v in ('node -v 2^>nul') do set "SYSMAJOR=%%v"
if "%SYSMAJOR%"=="v24" goto :node_systeme
if "%SYSMAJOR%"=="v22" goto :node_systeme

echo       Node.js absent : telechargement automatique en cours...
echo       35 Mo a telecharger, environ 1 minute.
powershell -NoProfile -ExecutionPolicy Bypass -Command "$ProgressPreference='SilentlyContinue'; [Net.ServicePointManager]::SecurityProtocol=[Net.SecurityProtocolType]::Tls12; New-Item -ItemType Directory -Force -Path '%APPDIR%runtime' | Out-Null; Invoke-WebRequest -Uri 'https://nodejs.org/dist/%NODEVER%/node-%NODEVER%-win-x64.zip' -OutFile '%APPDIR%runtime\node.zip'"
if not exist "%APPDIR%runtime\node.zip" goto :erreur_node
echo       Decompression...
tar -xf "%APPDIR%runtime\node.zip" -C "%APPDIR%runtime"
if not exist "%PORTABLE%" powershell -NoProfile -Command "$ProgressPreference='SilentlyContinue'; Expand-Archive -Path '%APPDIR%runtime\node.zip' -DestinationPath '%APPDIR%runtime' -Force"
del /f /q "%APPDIR%runtime\node.zip" >nul 2>&1
if not exist "%PORTABLE%" goto :erreur_node

:node_portable
set "PATH=%NODEDIR%;%PATH%"
echo       Moteur Node.js pret dans le dossier de l'application.
goto :etape2

:node_systeme
echo       Node.js deja present sur cet ordinateur : OK

REM ================= ETAPE 2 : configuration =================
:etape2
echo [2/5] Verification du fichier de configuration...
if exist "%APPDIR%.env" goto :env_ok
> ".env" echo DATABASE_URL="file:./dev.db"
echo       Fichier .env cree.
goto :etape3

:env_ok
echo       Fichier .env present : OK

REM ================= ETAPE 3 : dependances =================
:etape3
echo [3/5] Installation des composants de l'application...
echo       Merci de patienter, cela peut prendre plusieurs minutes.
if exist "%APPDIR%node_modules\next\dist\bin\next" goto :deps_presentes
call npm install
if errorlevel 1 goto :erreur_npm
goto :etape4

:deps_presentes
echo       Composants deja presents : generation du client base de donnees.
call npx prisma generate
if errorlevel 1 goto :erreur_npm

REM ================= ETAPE 4 : base de donnees =================
:etape4
echo [4/5] Preparation de la base de donnees...
if exist "%APPDIR%dev.db" goto :db_existante
call npx prisma migrate deploy
if errorlevel 1 goto :erreur_db
call npx prisma db seed
if errorlevel 1 goto :erreur_db
echo       Nouvelle base creee avec des donnees d'exemple.
goto :etape5

:db_existante
echo       Base de donnees existante detectee : mise a jour du schema.
call npx prisma migrate deploy
if errorlevel 1 goto :erreur_db

REM ================= ETAPE 5 : compilation =================
:etape5
echo [5/5] Compilation de l'application...
echo       C'est l'etape la plus longue, merci de patienter.
call npm run build
if errorlevel 1 goto :erreur_build

echo.
echo Creation du raccourci sur le Bureau...
powershell -NoProfile -Command "$d=[Environment]::GetFolderPath('Desktop'); $s=(New-Object -ComObject WScript.Shell).CreateShortcut((Join-Path $d 'Activites et Excursions.lnk')); $s.TargetPath='%APPDIR%LANCER-Activites-Excursions.bat'; $s.WorkingDirectory='%APPDIR%'; $s.IconLocation='%APPDIR%excursion.ico'; $s.Description='Gestion des activites et excursions'; $s.Save()"

echo.
echo ================================================================
echo    INSTALLATION TERMINEE
echo ================================================================
echo.
echo Pour utiliser l'application au quotidien, double-cliquez sur
echo le raccourci "Activites et Excursions" place sur le Bureau,
echo ou sur le fichier LANCER-Activites-Excursions.bat.
echo.
if "%AUTO%"=="/auto" exit /b 0
choice /C ON /N /M "Ouvrir l'application maintenant ? [O]ui / [N]on : "
if errorlevel 2 goto :fin
start "" "%APPDIR%LANCER-Activites-Excursions.bat"

:fin
exit /b 0

REM ================= MESSAGES D'ERREUR =================
:erreur_node
echo.
echo   ECHEC : impossible d'installer le moteur Node.js.
echo   Verifiez la connexion Internet, puis relancez ce fichier.
goto :stop

:erreur_npm
echo.
echo   ECHEC pendant l'installation des composants.
echo   Causes possibles : pas de connexion Internet, ou antivirus/pare-feu
echo   qui bloque le telechargement. Relancez ce fichier apres verification.
goto :stop

:erreur_db
echo.
echo   ECHEC pendant la preparation de la base de donnees.
echo   Verifiez que le fichier .env contient bien la ligne :
echo   DATABASE_URL="file:./dev.db"
goto :stop

:erreur_build
echo.
echo   ECHEC pendant la compilation de l'application.
echo   Verifiez que le dossier a bien ete copie en entier.
goto :stop

:stop
echo.
pause
exit /b 1

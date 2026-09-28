@echo off
cd /d "%~dp0"
title Preparer le transfert vers un autre PC

set "APPDIR=%~dp0"
set "EXCLUDEDB="
set "BUREAU="

echo ================================================================
echo    Preparer une copie de l'application pour un autre PC
echo ================================================================
echo.
echo Ce script fabrique un fichier ZIP leger sur votre Bureau.
echo Les composants techniques ne sont PAS copies : ils seront
echo telecharges automatiquement sur le nouvel ordinateur.
echo.
choice /C 12A /N /M "Inclure quoi ? [1] avec les donnees actuelles  [2] base vierge  [A]nnuler : "
if errorlevel 3 goto :annule
if errorlevel 2 set "EXCLUDEDB=dev.db"

echo.
echo Copie des fichiers utiles...

for /f "usebackq delims=" %%d in (`powershell -NoProfile -Command "[Environment]::GetFolderPath('Desktop')"`) do set "BUREAU=%%d"
if not defined BUREAU set "BUREAU=%USERPROFILE%\Desktop"

set "STAGE=%TEMP%\Evo2-transfert"
set "ZIP=%BUREAU%\Evo2-installation.zip"

if exist "%STAGE%" rmdir /s /q "%STAGE%"

robocopy "%APPDIR%." "%STAGE%" /E ^
 /XD node_modules .next runtime out coverage .git .claude ^
 /XF tsconfig.tsbuildinfo *.db-journal *.lnk PACKAGER-POUR-AUTRE-PC.bat %EXCLUDEDB% ^
 /NFL /NDL /NJH /NJS /NP
if errorlevel 8 goto :erreur_copie

echo Compression en cours...
if exist "%ZIP%" del /f /q "%ZIP%"
powershell -NoProfile -Command "$ProgressPreference='SilentlyContinue'; Compress-Archive -Path '%STAGE%\*' -DestinationPath '%ZIP%' -Force"
if not exist "%ZIP%" goto :erreur_zip

rmdir /s /q "%STAGE%"

echo.
echo ================================================================
echo    PAQUET PRET
echo ================================================================
echo.
echo Fichier cree : %ZIP%
powershell -NoProfile -Command "'Taille : ' + [math]::Round((Get-Item '%ZIP%').Length/1MB,1) + ' Mo'"
echo.
echo A faire ensuite sur l'autre ordinateur :
echo   1. Copier ce fichier ZIP sur le nouveau PC (cle USB, WeTransfer...^)
echo   2. Clic droit sur le ZIP  puis  "Extraire tout"
echo   3. Ouvrir le dossier extrait
echo   4. Double-cliquer sur INSTALLER-SUR-CE-PC.bat et attendre la fin
echo.
explorer "%BUREAU%"
pause
exit /b 0

:annule
echo.
echo Operation annulee.
pause
exit /b 0

:erreur_copie
echo.
echo   ECHEC pendant la copie des fichiers.
pause
exit /b 1

:erreur_zip
echo.
echo   ECHEC pendant la compression.
echo   Le dossier temporaire est conserve ici : %STAGE%
pause
exit /b 1

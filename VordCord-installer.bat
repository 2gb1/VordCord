@echo off
setlocal enabledelayedexpansion
title VordCord Installer
color 0b
echo ==========================================
echo        VordCord - Local Installer
echo ==========================================
echo.

:: إيقاف ديسكورد إجباري
taskkill /f /im Discord.exe >nul 2>&1

echo [*] Setting up local VordCord directories...
set "VEN_DIR=%appdata%\Vencord"
set "DIST_DIR=%VEN_DIR%\dist"
if not exist "%DIST_DIR%" mkdir "%DIST_DIR%"

:: إذا كنت مشغل السكربت من داخل مجلد المشروع، راح ينسخ ملفات الـ dist المحلية مباشرة
if exist "%~dp0dist" (
    echo [*] Copying local build files...
    xcopy /s /y "%~dp0dist\*" "%DIST_DIR%\" >nul
)

echo [*] Injecting into Discord...
curl -L -s "https://github.com/Vencord/Installer/releases/latest/download/VencordInstallerCli.exe" -o "%temp%\VencordInstallerCli.exe"

set "VENCORD_USER_DATA_DIR=%VEN_DIR%"
set "VENCORD_DEV_INSTALL=1"
"%temp%\VencordInstallerCli.exe" -install -branch auto

echo.
echo [+] VordCord Installed Successfully from local files!
echo You can now open Discord safely.
pause
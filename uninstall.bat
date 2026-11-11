@echo off
setlocal enabledelayedexpansion
title VordCord Uninstaller
color 0c

echo ========================================================
echo           VordCord - Uninstaller
echo ========================================================
echo.
echo This will remove VordCord / Vencord from Discord
echo and restore the original Discord files.
echo Your Discord account and messages are not affected.
echo.
choice /c YN /m "Continue"
if errorlevel 2 exit /b

echo.
echo [*] Closing Discord...
taskkill /f /im Discord.exe >nul 2>&1
taskkill /f /im DiscordPTB.exe >nul 2>&1
taskkill /f /im DiscordCanary.exe >nul 2>&1
timeout /t 2 /nobreak >nul

set found=0

for %%D in (Discord DiscordPTB DiscordCanary) do (
    if exist "%LOCALAPPDATA%\%%D" (
        for /d %%A in ("%LOCALAPPDATA%\%%D\app-*") do (
            set "R=%%A\resources"
            if exist "!R!\_app.asar" (
                if exist "!R!\app" rmdir /s /q "!R!\app"
                if exist "!R!\app.asar" del /f /q "!R!\app.asar"
                ren "!R!\_app.asar" app.asar
                echo [OK] Restored: %%A
                set found=1
            )
        )
    )
)

echo.
if "!found!"=="0" (
    echo [i] No modified Discord install was found.
) else (
    echo [OK] Done. Open Discord normally.
)
echo.
pause
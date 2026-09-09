@echo off
cd /d "%~dp0"
title ScanBot - keep this window open

if not exist ".venv\Scripts\python.exe" (
    echo.
    echo Python isn't installed in this folder yet, so the bot can't start.
    echo.
    echo Tell whoever set this up, or see the Setup section of README.md.
    echo.
    echo Press any key to close this window.
    pause >nul
    exit /b 1
)

rem The bot needs two codes saved in .env before it can do anything. Rather than
rem starting up just to fail, hand straight over to setup on a first run or a
rem half-filled file. Double-clicking this one file is then always correct.
set NEEDS_SETUP=
if not exist ".env" set NEEDS_SETUP=1
if exist ".env" (
    findstr /i /c:"PASTE_YOUR" ".env" >nul 2>&1
    if not errorlevel 1 set NEEDS_SETUP=1
)

if defined NEEDS_SETUP (
    echo.
    echo Your two codes aren't saved yet, so let's do that first.
    echo The bot will start on its own once they're in.
    ".venv\Scripts\python.exe" setup.py
    if errorlevel 1 (
        echo.
        echo Setup didn't finish, so there's nothing to start yet.
        echo Double-click START-BOT.bat again whenever you're ready.
        echo.
        echo Press any key to close this window.
        pause >nul
        exit /b 1
    )
    echo.
    echo ----------------------------------------------------------------
    echo.
)

echo Starting ScanBot. Keep this window open while you use the bot.
echo Close it, or press Ctrl+C, to stop the bot.
echo.
".venv\Scripts\python.exe" bot.py
echo.
echo The bot has stopped. Press any key to close this window.
pause >nul

@echo off
cd /d "%~dp0"
".venv\Scripts\python.exe" setup.py
echo.
echo Press any key to close this window.
pause >nul

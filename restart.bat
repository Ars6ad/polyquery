@echo off
echo Killing all Node.js processes...
taskkill /F /IM node.exe 2>nul
timeout /t 2 /nobreak >nul

echo Starting Polyquery server...
cd /d "%~dp0"
start "Polyquery Server" cmd /k "node server.js"

echo.
echo Server is starting...
echo Open http://localhost:3000 in your browser
echo.
pause

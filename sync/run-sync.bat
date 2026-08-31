@echo off
REM Chạy Sync Engine daemon. Dùng cho Task Scheduler (trigger: At startup).
REM Cấu hình đặt trong .env.sync (xem .env.sync.example).
cd /d "%~dp0.."
:loop
node sync\daemon.mjs
echo Daemon thoat luc %date% %time% - khoi dong lai sau 15 giay
timeout /t 15 /nobreak >nul
goto loop

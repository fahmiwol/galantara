@echo off
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0Galantara.ps1"
if errorlevel 1 pause

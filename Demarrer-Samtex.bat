@echo off
REM ============================================================
REM  Demarrer-Samtex.bat — ouvre la caisse dans votre navigateur
REM ============================================================
REM  Aucune installation requise : PowerShell (deja sur Windows)
REM  demarre un petit serveur local, sans fenetre noire.
REM  La caisse s'ouvre dans Chrome ou Edge.
REM
REM  Alternative encore plus simple : double-cliquez sur
REM  "index.html" (rien a installer, aucune fenetre).
REM ============================================================
cd /d "%~dp0"

where powershell >nul 2>nul
if errorlevel 1 (
    echo Impossible de trouver PowerShell. Double-cliquez sur "index.html".
    pause
    exit /b 1
)

REM Lance le serveur local de facon invisible (aucune fenetre noiree),
REM puis il ouvre la caisse dans le navigateur.
start "" powershell -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File "%~dp0serve.ps1"
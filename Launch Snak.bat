@echo off
cd /d "%~dp0"
rem Snak — opens the app in your browser. Close this window to stop it.
start "" http://localhost:8911/
node build\serve.mjs

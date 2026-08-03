REM Runs the push script without the PowerShell execution-policy prompt.
REM Double-click this, or type:  ykay-push.cmd
@echo off
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0ykay-push.ps1" %*

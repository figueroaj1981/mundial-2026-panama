@echo off
REM setup-task.bat — Registra tarea automática en Windows Task Scheduler
REM Ejecutar como Administrador

SET TASK_NAME=MundialFIFA2026_Update
SET NODE_PATH=node
SET SCRIPT_PATH=%~dp0update_worldcup.js

echo.
echo ====================================================
echo  Mundial 2026 — Configuracion de tarea automatica
echo ====================================================
echo.
echo Tarea: %TASK_NAME%
echo Script: %SCRIPT_PATH%
echo Horario: Todos los dias a las 6:00 AM (hora local)
echo.

REM Eliminar tarea existente si hay
schtasks /Delete /TN "%TASK_NAME%" /F >nul 2>&1

REM Crear nueva tarea
schtasks /Create ^
  /TN "%TASK_NAME%" ^
  /TR "%NODE_PATH% \"%SCRIPT_PATH%\"" ^
  /SC DAILY ^
  /ST 06:00 ^
  /RU SYSTEM ^
  /RL HIGHEST ^
  /F

IF %ERRORLEVEL% EQU 0 (
  echo.
  echo [OK] Tarea programada exitosamente.
  echo      Se ejecutara todos los dias a las 6:00 AM.
  echo.
  echo Para ejecutar ahora manualmente:
  echo   schtasks /Run /TN "%TASK_NAME%"
  echo.
  echo Para ver el estado:
  echo   schtasks /Query /TN "%TASK_NAME%"
) ELSE (
  echo.
  echo [ERROR] No se pudo crear la tarea.
  echo         Asegurate de ejecutar este archivo como Administrador.
)

echo.
pause

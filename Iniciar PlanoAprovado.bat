@echo off
title PlanoAprovado
color 0A

echo.
echo  ========================================
echo    PlanoAprovado - Iniciando...
echo  ========================================
echo.

:: Vai para a pasta do projeto (ajuste o caminho se necessário)
cd /d "C:\Users\ResTIC16\Music\academiaflow"

:: Verifica se node_modules existe
if not exist "node_modules" (
    echo  Instalando dependencias pela primeira vez...
    npm install
)

echo  Iniciando servidor...
echo  Abrindo navegador em 4 segundos...
echo.

:: Abre o navegador depois de 4 segundos
start /b cmd /c "timeout /t 4 /nobreak >nul && start http://localhost:3000"

:: Inicia o app
npm run dev

pause

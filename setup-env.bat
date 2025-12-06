@echo off
echo ========================================
echo  Configurando Frontend com mesma API
echo ========================================

echo Copiando configurações do Pusher...
copy pusher-config.env .env

echo.
echo Arquivo .env criado com sucesso!
echo.
echo Configurações aplicadas:
echo - API URL: https://zenithggapi.vercel.app/api/v1
echo - Pusher Key: 2e6225a59f1054d688dd
echo - Pusher Cluster: mt1
echo - Pusher App ID: 2037345
echo.
echo ⚡ Reinicie o servidor de desenvolvimento para aplicar as mudanças
echo    npm run dev
echo.
echo 🚀 Chat em tempo real configurado e pronto para uso!
echo ========================================

pause

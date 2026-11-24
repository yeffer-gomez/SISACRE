#!/bin/bash
# ============================================================
# SISACRE - Script de desarrollo local (sin Docker)
# Requiere: Node.js 20+, PostgreSQL corriendo localmente
# ============================================================

set -e

echo ""
echo "╔══════════════════════════════════════════╗"
echo "║   SISACRE - Inicio en modo desarrollo   ║"
echo "╚══════════════════════════════════════════╝"
echo ""

# Backend
echo "▶ Instalando dependencias del backend..."
cd backend
npm install

echo "▶ Iniciando backend en puerto 3000..."
DB_HOST=localhost DB_PORT=5432 DB_NAME=sisacre_db DB_USER=sisacre_user \
DB_PASSWORD=sisacre_pass JWT_SECRET=sisacre_jwt_secret_2024 \
PORT=3000 npm run dev &
BACKEND_PID=$!

cd ..

# Frontend
echo "▶ Instalando dependencias del frontend..."
cd frontend
npm install

echo "▶ Iniciando Angular en puerto 4200..."
npm start &
FRONTEND_PID=$!

cd ..

echo ""
echo "✅ Aplicación iniciada:"
echo "   Frontend: http://localhost:4200"
echo "   Backend:  http://localhost:3000"
echo ""
echo "Presiona Ctrl+C para detener ambos servidores"
echo ""

# Wait and cleanup
trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; echo 'Servidores detenidos.'" EXIT
wait

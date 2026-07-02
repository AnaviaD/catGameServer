#!/bin/bash
# scripts/update.sh

echo "🔄 ACTUALIZANDO SERVIDOR..."
cd /home/ec2-user/game-server

# Backup
tar -czf /tmp/backup-$(date +%Y%m%d-%H%M%S).tar.gz .

# Pull
git pull origin main

# Instalar dependencias
npm install

# Reiniciar
pm2 restart game-server

# Verificar
curl -s http://localhost:3000/stats

echo "✅ ACTUALIZACIÓN COMPLETADA"
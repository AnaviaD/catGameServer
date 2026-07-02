#!/bin/bash
# monitor.sh - Script para monitorear el servidor game-server

# ============================================
# CONFIGURACIÓN
# ============================================
#          /home/ec2-user/game-server/catGameServer/scripts
# GAME_DIR="/home/ec2-user/game-server/catGameServer/game-server"  # Ruta de tu proyecto
PROCESS_NAME="game-server"                      # Nombre en PM2
LOG_FILE="/home/ec2-user/monitor.log"          # Archivo de logs
REFRESH_INTERVAL=5                              # Segundos entre actualizaciones

# ============================================
# FUNCIONES
# ============================================

# Función para obtener timestamp
get_timestamp() {
    date '+%Y-%m-%d %H:%M:%S'
}

# Función para verificar si el servidor está corriendo
check_server_status() {
    if pm2 list | grep -q "$PROCESS_NAME"; then
        echo "🟢 ACTIVO"
    else
        echo "🔴 DETENIDO"
    fi
}

# Función para obtener número de jugadores
get_players_count() {
    # Intentar obtener de la API
    local stats=$(curl -s http://localhost:3000/stats 2>/dev/null)
    if [ $? -eq 0 ] && [ ! -z "$stats" ]; then
        echo "$stats" | grep -o '"players":[0-9]*' | cut -d':' -f2
    else
        echo "N/A"
    fi
}

# Función para obtener uso de CPU
get_cpu_usage() {
    top -bn1 | grep "Cpu(s)" | awk '{print $2}' | cut -d'%' -f1
}

# Función para obtener uso de memoria
get_memory_usage() {
    free -h | grep Mem | awk '{print $3 "/" $2}'
}

# Función para obtener uso de disco
get_disk_usage() {
    df -h / | awk 'NR==2 {print $3 "/" $2 " (" $5 ")"}'
}

# Función para obtener conexiones activas
get_active_connections() {
    sudo netstat -anp 2>/dev/null | grep :3000 | grep ESTABLISHED | wc -l
}

# Función para obtener uptime del servidor
get_server_uptime() {
    if pm2 list | grep -q "$PROCESS_NAME"; then
        pm2 describe "$PROCESS_NAME" 2>/dev/null | grep "uptime" | head -1 | awk '{print $4, $5, $6}'
    else
        echo "N/A"
    fi
}

# Función para mostrar el panel principal
show_dashboard() {
    clear
    echo "╔═══════════════════════════════════════════════════════════╗"
    echo "║            🎮 MONITOREO DEL SERVIDOR DE JUEGO            ║"
    echo "╚═══════════════════════════════════════════════════════════╝"
    echo ""
    echo "📅 $(get_timestamp)"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    
    # Estado del servidor
    echo "🟢 ESTADO DEL SERVIDOR:"
    echo "   └─ PM2: $(check_server_status)"
    echo "   └─ Uptime: $(get_server_uptime)"
    echo ""
    
    # Jugadores
    echo "👥 JUGADORES:"
    echo "   └─ Conectados: $(get_players_count)"
    echo "   └─ Conexiones activas: $(get_active_connections)"
    echo ""
    
    # Recursos del sistema
    echo "💻 RECURSOS DEL SISTEMA:"
    echo "   └─ CPU: $(get_cpu_usage)%"
    echo "   └─ Memoria: $(get_memory_usage)"
    echo "   └─ Disco: $(get_disk_usage)"
    echo ""
    
    # Estado de PM2
    echo "📋 PROCESOS PM2:"
    pm2 list
    echo ""
    
    # Últimos logs (solo si el servidor está corriendo)
    if pm2 list | grep -q "$PROCESS_NAME"; then
        echo "📝 ÚLTIMOS LOGS:"
        pm2 logs "$PROCESS_NAME" --lines 3 --nostream 2>/dev/null | grep -v "PM2" | tail -3
    fi
    
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "🔄 Actualizando cada $REFRESH_INTERVAL segundos..."
    echo "❌ Presiona Ctrl+C para salir"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
}

# ============================================
# LOOP PRINCIPAL
# ============================================

# Verificar que existe el directorio
# if [ ! -d "$GAME_DIR" ]; then
#     echo "❌ Error: No se encuentra el directorio $GAME_DIR"
#     echo "   Por favor, actualiza la variable GAME_DIR en el script"
#     exit 1
# fi

# Verificar que PM2 está instalado
if ! command -v pm2 &> /dev/null; then
    echo "❌ Error: PM2 no está instalado"
    echo "   Instala con: npm install -g pm2"
    exit 1
fi

# Ejecutar en loop
while true; do
    show_dashboard
    sleep $REFRESH_INTERVAL
done
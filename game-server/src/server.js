const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const cors = require('cors');

// ============================================
// CONFIGURACIÓN DEL SERVIDOR
// ============================================
const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Ruta de prueba para verificar que el servidor está vivo
app.get('/', (req, res) => {
    res.json({
        status: 'ok',
        message: 'Servidor WebSocket funcionando',
        timestamp: new Date().toISOString(),
        players: players.size
    });
});

// Ruta para ver estadísticas
app.get('/stats', (req, res) => {
    res.json({
        activePlayers: players.size,
        totalConnections: totalConnections,
        players: Array.from(players.values()).map(p => ({
            id: p.id,
            name: p.name,
            x: p.x,
            z: p.z
        }))
    });
});

// ============================================
// CREAR SERVIDOR HTTP + WEBSOCKET
// ============================================
const server = http.createServer(app);
const wss = new WebSocket.Server({ 
    server, 
    path: '/ws'  // Los clientes se conectan a ws://IP:3000/ws
});

// ============================================
// ESTADO DEL JUEGO (en memoria)
// ============================================
const players = new Map();  // playerId -> {id, name, x, y, z}
let totalConnections = 0;

// ============================================
// MANEJO DE CONEXIONES WEBSOCKET
// ============================================
wss.on('connection', (ws) => {
    // Generar ID único para el jugador
    const playerId = `player_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;
    const playerName = `Jugador-${totalConnections + 1}`;
    
    // Crear jugador con posición inicial aleatoria
    const player = {
        id: playerId,
        name: playerName,
        x: Math.random() * 100 - 50,
        y: 1,
        z: Math.random() * 100 - 50
    };
    
    // Guardar en el estado
    players.set(playerId, player);
    totalConnections++;
    
    console.log(`✅ Nuevo jugador: ${playerName} (${playerId})`);
    console.log(`👥 Jugadores activos: ${players.size}`);

    // ============================================
    // 1. ENVIAR ESTADO INICIAL AL NUEVO JUGADOR
    // ============================================
    const initMessage = {
        type: 'init',
        playerId: playerId,
        player: player,
        players: Array.from(players.values())
    };
    ws.send(JSON.stringify(initMessage));
    
    // ============================================
    // 2. NOTIFICAR A TODOS QUE UN NUEVO JUGADOR SE UNIÓ
    // ============================================
    broadcast({
        type: 'playerJoined',
        player: player
    }, ws);  // Excluir al que acaba de unirse

    // ============================================
    // 3. MANEJAR MENSAJES DEL CLIENTE
    // ============================================
    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message);
            
            // Solo manejamos movimiento por ahora
            if (data.type === 'move') {
                const p = players.get(playerId);
                if (p && data.position) {
                    // Actualizar posición
                    p.x += data.position.x || 0;
                    p.z += data.position.z || 0;
                    
                    // Limitar movimiento (opcional)
                    p.x = Math.max(-100, Math.min(100, p.x));
                    p.z = Math.max(-100, Math.min(100, p.z));
                    
                    // Broadcast a TODOS (incluyendo al que envió)
                    broadcast({
                        type: 'playerUpdate',
                        playerId: playerId,
                        position: { x: p.x, y: p.y, z: p.z }
                    });
                }
            }
            
            // Mensaje de chat (opcional pero útil para pruebas)
            if (data.type === 'message') {
                broadcast({
                    type: 'chat',
                    playerId: playerId,
                    playerName: player.name,
                    message: data.message
                });
            }
            
            // Ping para mantener conexión viva
            if (data.type === 'ping') {
                ws.send(JSON.stringify({
                    type: 'pong',
                    timestamp: Date.now()
                }));
            }
            
        } catch (error) {
            console.error('Error procesando mensaje:', error);
        }
    });

    // ============================================
    // 4. MANEJAR DESCONEXIÓN
    // ============================================
    ws.on('close', () => {
        players.delete(playerId);
        console.log(`❌ Jugador desconectado: ${playerName}`);
        console.log(`👥 Jugadores activos: ${players.size}`);
        
        broadcast({
            type: 'playerLeft',
            playerId: playerId
        });
    });

    // ============================================
    // 5. MANEJAR ERRORES
    // ============================================
    ws.on('error', (error) => {
        console.error(`Error en WebSocket de ${playerName}:`, error.message);
    });
});

// ============================================
// FUNCIÓN PARA BROADCAST
// ============================================
function broadcast(data, excludeWs = null) {
    const message = JSON.stringify(data);
    let count = 0;
    
    wss.clients.forEach((client) => {
        if (client !== excludeWs && client.readyState === WebSocket.OPEN) {
            client.send(message);
            count++;
        }
    });
    
    // Log solo para eventos importantes
    if (data.type === 'playerJoined' || data.type === 'playerLeft') {
        console.log(`📡 Broadcast ${data.type} a ${count} clientes`);
    }
}

// ============================================
// INICIAR SERVIDOR
// ============================================
server.listen(PORT, '0.0.0.0', () => {
    console.log('========================================');
    console.log('🎮 WEBSOCKET SERVER');
    console.log('========================================');
    console.log(`✅ HTTP: http://localhost:${PORT}`);
    console.log(`✅ WebSocket: ws://localhost:${PORT}/ws`);
    console.log(`✅ Stats: http://localhost:${PORT}/stats`);
    console.log('========================================');
    console.log('📡 Esperando conexiones...');
});

// ============================================
// MANEJO DE SEÑALES PARA CIERRE 
// ============================================
process.on('SIGTERM', () => {
    console.log('🛑 Cerrando servidor...');
    wss.close(() => {
        server.close(() => {
            console.log('✅ Servidor cerrado');
            process.exit(0);
        });
    });
});
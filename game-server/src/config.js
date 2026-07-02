// backend/src/config.js
const dotenv = require('dotenv');
dotenv.config();

module.exports = {
    // Servidor
    PORT: process.env.PORT || 3000,
    NODE_ENV: process.env.NODE_ENV || 'development',
    
    // IP Pública (usar IP ELÁSTICA)
    PUBLIC_IP: process.env.PUBLIC_IP || '3.86.45.123', // ← TU IP ELÁSTICA
    
    // WebSocket
    WS_PATH: '/ws',
    MAX_PLAYERS: 8,
    
    // Redis (cuando lo agregues)
    REDIS_URL: process.env.REDIS_URL || 'redis://localhost:6379',
    
    // JWT (para autenticación)
    JWT_SECRET: process.env.JWT_SECRET || 'mi-secreto-super-seguro',
    
    // AWS
    AWS_REGION: process.env.AWS_REGION || 'us-east-1',
};
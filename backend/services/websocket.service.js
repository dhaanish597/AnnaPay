import { Server } from 'socket.io';

let io = null;

export const initWebSocket = (server) => {
    io = new Server(server, {
        cors: {
            origin: '*',
            methods: ['GET', 'POST']
        }
    });

    io.on('connection', (socket) => {
        console.log(`[WebSocket] Client connected: ${socket.id}`);
        socket.on('disconnect', () => {
            console.log(`[WebSocket] Client disconnected: ${socket.id}`);
        });
    });

    console.log('[WebSocket] Server initialized and ready.');
    return io;
};

export const broadcastNotification = (payload) => {
    if (io) {
        console.log(`[WebSocket] Broadcasting live alert to all connected dashboard clients...`);
        io.emit('new_notification', payload);
    } else {
        console.warn('[WebSocket] Warning: io instance not initialized yet.');
    }
};

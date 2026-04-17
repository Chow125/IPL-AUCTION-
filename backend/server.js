const express = require('express');
const http = require('http');
const cors = require('cors');
const { Server } = require('socket.io');

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: '*', // For MVP, allow all origins
        methods: ['GET', 'POST']
    }
});

// Import handlers
const setupRoomHandlers = require('./src/socket/roomHandlers');
const setupAuctionHandlers = require('./src/socket/auctionHandlers');

// State Memory (Usually this would be MongoDB/Redis)
const state = {
    rooms: {}, // { code: { users: [], currentBid: {}, timer: 0, players: [] } }
    playersData: require('./data/players.json')
};

io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    setupRoomHandlers(io, socket, state);
    setupAuctionHandlers(io, socket, state);

    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
        // Handle removing user from room state if necessary
        for (const roomCode in state.rooms) {
            const room = state.rooms[roomCode];
            const userIndex = room.users.findIndex(u => u.id === socket.id);
            if (userIndex !== -1) {
                room.users.splice(userIndex, 1);
                io.to(roomCode).emit('roomUpdated', room);
            }
        }
    });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

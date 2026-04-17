module.exports = (io, socket, state) => {

    // Helper: create a shuffled index array for the player list
    const createShuffledPool = (playersList) => {
        const indices = playersList.map((_, i) => i);
        for (let i = indices.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [indices[i], indices[j]] = [indices[j], indices[i]];
        }
        return indices;
    };

    socket.on('createRoom', ({ username }, callback) => {
        const roomCode = Math.random().toString(36).substring(2, 7).toUpperCase();
        const playersList = JSON.parse(JSON.stringify(state.playersData));

        state.rooms[roomCode] = {
            admin: socket.id,
            users: [{ id: socket.id, username, isOwner: true, teamName: `${username}'s Team`, budget: 10000, playersBought: [] }],
            activePlayerIndex: null,
            playersList,
            shuffledPool: createShuffledPool(playersList),
            currentBid: { amount: 0, highestBidder: null, highestBidderId: null },
            timer: 0,
            timerDuration: 20,          // configurable: 10 / 15 / 20 / 30
            hasStarted: false,
            isPaused: false,
            phase: 'lobby',             // 'lobby' → 'auction'
            autoFlow: true,
            auctionMode: 'random',
            activeCategory: null,
            auctionHistory: [],
            poolPointer: 0,
            teamSelections: {}          // userId → { code, name, primary, secondary, textColor }
        };

        socket.join(roomCode);
        callback({ success: true, roomCode, user: state.rooms[roomCode].users[0], roomState: state.rooms[roomCode] });
        io.to(roomCode).emit('roomUpdated', state.rooms[roomCode]);
    });

    socket.on('joinRoom', ({ username, roomCode }, callback) => {
        const room = state.rooms[roomCode];

        if (!room) {
            return callback({ success: false, message: 'Room not found' });
        }

        const existingUser = room.users.find(u => u.username === username);
        if (existingUser) {
            const wasAdmin = room.admin === existingUser.id;
            existingUser.id = socket.id;
            if (wasAdmin) room.admin = socket.id;
            socket.join(roomCode);
            return callback({ success: true, roomCode, user: existingUser, roomState: room });
        }

        const newUser = {
            id: socket.id,
            username,
            isOwner: false,
            teamName: `${username}'s Team`,
            budget: 10000,
            playersBought: []
        };
        room.users.push(newUser);
        socket.join(roomCode);

        callback({ success: true, roomCode, user: newUser, roomState: room });
        io.to(roomCode).emit('roomUpdated', room);
    });

    // ── Select IPL franchise in lobby ────────────────────────────
    socket.on('selectTeam', ({ roomCode, team }, callback) => {
        const room = state.rooms[roomCode];
        if (!room) return callback({ success: false, message: 'Room not found' });

        // Free any previous selection by this user
        Object.keys(room.teamSelections).forEach(uid => {
            if (uid === socket.id) delete room.teamSelections[uid];
        });

        // Check if team already taken by another user
        const takenBy = Object.entries(room.teamSelections).find(([, t]) => t.code === team.code);
        if (takenBy) return callback({ success: false, message: `${team.name} is already taken!` });

        room.teamSelections[socket.id] = team;

        // Update the user's teamName
        const user = room.users.find(u => u.id === socket.id);
        if (user) user.teamName = team.name;

        io.to(roomCode).emit('roomUpdated', room);
        callback({ success: true });
    });

    // ── Set timer duration (host only) ───────────────────────────
    socket.on('setTimerDuration', ({ roomCode, duration }, callback) => {
        const room = state.rooms[roomCode];
        if (!room) return callback({ success: false, message: 'Room not found' });
        if (room.admin !== socket.id) return callback({ success: false, message: 'Not authorized' });

        room.timerDuration = Math.max(5, Math.min(60, parseInt(duration) || 20));
        io.to(roomCode).emit('roomUpdated', room);
        callback({ success: true, timerDuration: room.timerDuration });
    });

    // ── Start auction from lobby (host only) ─────────────────────
    socket.on('startAuction', ({ roomCode }, callback) => {
        const room = state.rooms[roomCode];
        if (!room) return callback({ success: false, message: 'Room not found' });
        if (room.admin !== socket.id) return callback({ success: false, message: 'Not authorized' });

        room.phase = 'auction';
        io.to(roomCode).emit('phaseChanged', { phase: 'auction', roomState: room });
        io.to(roomCode).emit('roomUpdated', room);
        callback({ success: true });
    });

    socket.on('setAuctionMode', ({ roomCode, mode, category }, callback) => {
        const room = state.rooms[roomCode];
        if (!room) return callback({ success: false, message: 'Room not found' });
        if (room.admin !== socket.id) return callback({ success: false, message: 'Not authorized' });

        room.auctionMode = mode;
        room.activeCategory = category || null;
        callback({ success: true });
        io.to(roomCode).emit('roomUpdated', room);
    });
};

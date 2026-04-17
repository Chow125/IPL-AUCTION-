let timers = {};
let autoFlowTimeouts = {}; // track pending auto-flow setTimeout handles

module.exports = (io, socket, state) => {

    // ─── Cancel any pending auto-flow for a room ─────────────────────────────
    const cancelAutoFlow = (roomCode) => {
        if (autoFlowTimeouts[roomCode]) {
            clearTimeout(autoFlowTimeouts[roomCode]);
            delete autoFlowTimeouts[roomCode];
        }
    };

    // ─── Interval timer helpers ───────────────────────────────────────────────
    const clearRoomTimer = (roomCode) => {
        if (timers[roomCode]) {
            clearInterval(timers[roomCode]);
            delete timers[roomCode];
        }
    };

    const startBiddingTimer = (roomCode) => {
        clearRoomTimer(roomCode);
        const room = state.rooms[roomCode];
        timers[roomCode] = setInterval(() => {
            if (!room || room.isPaused) return;
            if (room.timer <= 0) {
                clearRoomTimer(roomCode);
                finishAuction(roomCode);
            } else {
                room.timer -= 1;
                io.to(roomCode).emit('timerUpdate', { timer: room.timer });
            }
        }, 1000);
    };

    // ─── Smart random / category picker ──────────────────────────────────────
    const pickNextPlayerIndex = (room, category) => {
        if (room.auctionMode === 'category' && category) {
            const candidates = room.playersList
                .map((p, i) => ({ p, i }))
                .filter(({ p }) => !p.sold && !p.unsold && !p.skipped && p.role === category);
            if (candidates.length === 0) return null;
            return candidates[Math.floor(Math.random() * candidates.length)].i;
        }

        // Random mode — walk shuffledPool
        while (room.poolPointer < room.shuffledPool.length) {
            const idx = room.shuffledPool[room.poolPointer++];
            const player = room.playersList[idx];
            if (player && !player.sold && !player.unsold && !player.skipped) return idx;
        }
        return null;
    };

    // ─── Auto-flow: pick next → preview → start ───────────────────────────────
    // Called after finishAuction when autoFlow is on.
    // Timeline:
    //   0s   → emit autoNextCountdown (t=4) so UI shows "Next player in 4s"
    //   each second → emit autoNextCountdown (t=3,2,1)
    //   4s   → pick player, emit playerSelected
    //   emit autoPreviewCountdown (t=3,2,1)
    //   3s later → startBiddingTimer, emit auctionStarted
    const scheduleAutoFlow = (roomCode) => {
        cancelAutoFlow(roomCode);
        const room = state.rooms[roomCode];
        if (!room || !room.autoFlow || room.isPaused) return;

        let nextCountdown = 4;

        // Countdown to picking next player
        const nextCountdownInterval = setInterval(() => {
            const r = state.rooms[roomCode];
            if (!r || !r.autoFlow || r.isPaused) {
                clearInterval(nextCountdownInterval);
                return;
            }
            io.to(roomCode).emit('autoNextCountdown', { seconds: nextCountdown });
            nextCountdown--;
            if (nextCountdown < 0) {
                clearInterval(nextCountdownInterval);

                // Pick next player
                const idx = pickNextPlayerIndex(r, r.activeCategory);
                if (idx === null) {
                    // Pool exhausted
                    io.to(roomCode).emit('auctionComplete', { history: r.auctionHistory });
                    return;
                }

                r.activePlayerIndex = idx;
                r.currentBid = { amount: 0, highestBidder: null, highestBidderId: null };
                r.hasStarted = false;

                const player = r.playersList[idx];
                io.to(roomCode).emit('playerSelected', { player, playerIndex: idx });

                // Preview countdown before bidding starts
                let previewCountdown = 4;
                const previewInterval = setInterval(() => {
                    const r2 = state.rooms[roomCode];
                    if (!r2 || !r2.autoFlow || r2.isPaused) {
                        clearInterval(previewInterval);
                        return;
                    }
                    io.to(roomCode).emit('autoPreviewCountdown', { seconds: previewCountdown });
                    previewCountdown--;
                    if (previewCountdown < 0) {
                        clearInterval(previewInterval);
                        const r3 = state.rooms[roomCode];
                        if (!r3 || r3.hasStarted) return;
                        r3.timer = r3.timerDuration || 20;
                        r3.hasStarted = true;
                        r3.isPaused = false;
                        io.to(roomCode).emit('auctionStarted', { roomState: r3 });
                        startBiddingTimer(roomCode);
                    }
                }, 1000);
                autoFlowTimeouts[roomCode] = previewInterval;
            }
        }, 1000);

        autoFlowTimeouts[roomCode] = nextCountdownInterval;
    };

    // ─── finishAuction ────────────────────────────────────────────────────────
    const finishAuction = (roomCode) => {
        const room = state.rooms[roomCode];
        if (!room || room.activePlayerIndex === null) return;

        const player = room.playersList[room.activePlayerIndex];

        if (room.currentBid.highestBidderId) {
            const winner = room.users.find(u => u.id === room.currentBid.highestBidderId);
            if (winner) {
                winner.budget -= room.currentBid.amount;
                winner.playersBought.push({ ...player, soldPrice: room.currentBid.amount });
                player.sold = true;
                player.soldTo = winner.username;
                player.soldPrice = room.currentBid.amount;

                room.auctionHistory.push({
                    type: 'sold',
                    player: player.name,
                    role: player.role,
                    price: room.currentBid.amount,
                    team: winner.username,
                    timestamp: Date.now()
                });

                io.to(roomCode).emit('playerSold', {
                    player,
                    winner: winner.username,
                    price: room.currentBid.amount
                });
            }
        } else {
            player.unsold = true;
            room.auctionHistory.push({
                type: 'unsold',
                player: player.name,
                role: player.role,
                timestamp: Date.now()
            });
            io.to(roomCode).emit('playerUnsold', { player });
        }

        room.activePlayerIndex = null;
        room.currentBid = { amount: 0, highestBidder: null, highestBidderId: null };
        room.hasStarted = false;
        room.isPaused = false;

        io.to(roomCode).emit('roomUpdated', room);

        // Trigger auto-flow if enabled (give 0.5s for clients to process roomUpdated first)
        if (room.autoFlow) {
            setTimeout(() => scheduleAutoFlow(roomCode), 500);
        }
    };

    // ─── selectNextPlayer (manual host pick) ─────────────────────────────────
    socket.on('selectNextPlayer', ({ roomCode, category }, callback) => {
        const room = state.rooms[roomCode];
        if (!room) return callback({ success: false, message: 'Room not found' });
        if (room.admin !== socket.id) return callback({ success: false, message: 'Not authorized' });
        if (room.hasStarted) return callback({ success: false, message: 'Auction in progress' });

        cancelAutoFlow(roomCode); // cancel any pending auto if host takes over manually

        const idx = pickNextPlayerIndex(room, category || room.activeCategory);
        if (idx === null) return callback({ success: false, message: 'No eligible players left' });

        room.activePlayerIndex = idx;
        room.currentBid = { amount: 0, highestBidder: null, highestBidderId: null };
        room.hasStarted = false;

        const player = room.playersList[idx];
        io.to(roomCode).emit('playerSelected', { player, playerIndex: idx });
        callback({ success: true, player, playerIndex: idx });
    });

    // ─── startPlayerAuction (manual host start after preview) ────────────────
    socket.on('startPlayerAuction', ({ roomCode }, callback) => {
        const room = state.rooms[roomCode];
        if (!room) return callback({ success: false, message: 'Room not found' });
        if (room.admin !== socket.id) return callback({ success: false, message: 'Not authorized' });
        if (room.activePlayerIndex === null) return callback({ success: false, message: 'No player selected' });
        if (room.hasStarted) return callback({ success: false, message: 'Already started' });

        cancelAutoFlow(roomCode); // cancel auto preview countdown if host clicks manually

        room.timer = room.timerDuration || 20;
        room.hasStarted = true;
        room.isPaused = false;

        io.to(roomCode).emit('auctionStarted', { roomState: room });
        startBiddingTimer(roomCode);
        callback({ success: true });
    });

    // ─── toggleAutoFlow ───────────────────────────────────────────────────────
    socket.on('toggleAutoFlow', ({ roomCode }, callback) => {
        const room = state.rooms[roomCode];
        if (!room) return callback({ success: false, message: 'Room not found' });
        if (room.admin !== socket.id) return callback({ success: false, message: 'Not authorized' });

        room.autoFlow = !room.autoFlow;

        if (!room.autoFlow) {
            // Host turned off auto — cancel any pending countdown
            cancelAutoFlow(roomCode);
            io.to(roomCode).emit('autoFlowChanged', { autoFlow: false });
        } else {
            io.to(roomCode).emit('autoFlowChanged', { autoFlow: true });
            // If idle (no active player, not started), kick off auto-flow immediately
            if (!room.hasStarted && room.activePlayerIndex === null) {
                scheduleAutoFlow(roomCode);
            }
        }

        callback({ success: true, autoFlow: room.autoFlow });
    });

    // ─── placeBid ─────────────────────────────────────────────────────────────
    socket.on('placeBid', ({ roomCode }, callback) => {
        const room = state.rooms[roomCode];
        if (!room || !room.hasStarted || room.isPaused || room.timer <= 0 || room.activePlayerIndex === null) {
            return callback({ success: false, message: 'Cannot place bid right now' });
        }

        const user = room.users.find(u => u.id === socket.id);
        if (!user) return callback({ success: false, message: 'User not found in room' });
        if (room.admin === socket.id) return callback({ success: false, message: 'Host cannot bid' });

        const player = room.playersList[room.activePlayerIndex];

        if (user.playersBought.length >= 15) {
            return callback({ success: false, message: 'Team limit reached (15 players)' });
        }

        if (room.currentBid.highestBidderId === socket.id) {
            return callback({ success: false, message: 'You are already the highest bidder' });
        }

        const newBidAmount = room.currentBid.amount === 0 ? player.basePrice : room.currentBid.amount + 10;

        if (user.budget < newBidAmount) {
            return callback({ success: false, message: 'Insufficient budget' });
        }

        room.currentBid.amount = newBidAmount;
        room.currentBid.highestBidder = user.username;
        room.currentBid.highestBidderId = user.id;
        room.timer = Math.min(room.timer + 5, room.timerDuration || 20);

        io.to(roomCode).emit('bidPlaced', {
            currentBid: room.currentBid,
            timer: room.timer,
            roomState: room
        });

        callback({ success: true });
    });

    // ─── skipPlayer ───────────────────────────────────────────────────────────
    socket.on('skipPlayer', ({ roomCode }, callback) => {
        const room = state.rooms[roomCode];
        if (!room) return callback({ success: false, message: 'Room not found' });
        if (room.admin !== socket.id) return callback({ success: false, message: 'Not authorized' });

        clearRoomTimer(roomCode);
        cancelAutoFlow(roomCode);

        if (room.activePlayerIndex !== null) {
            const player = room.playersList[room.activePlayerIndex];
            player.skipped = true;
            room.auctionHistory.push({
                type: 'skipped',
                player: player.name,
                role: player.role,
                timestamp: Date.now()
            });
            io.to(roomCode).emit('playerSkipped', { player });
        }

        room.activePlayerIndex = null;
        room.currentBid = { amount: 0, highestBidder: null, highestBidderId: null };
        room.hasStarted = false;
        room.isPaused = false;

        io.to(roomCode).emit('roomUpdated', room);

        // If auto-flow is on, schedule next player after skip too
        if (room.autoFlow) {
            setTimeout(() => scheduleAutoFlow(roomCode), 500);
        }

        callback({ success: true });
    });

    // ─── pauseAuction ─────────────────────────────────────────────────────────
    socket.on('pauseAuction', ({ roomCode }, callback) => {
        const room = state.rooms[roomCode];
        if (!room) return callback({ success: false, message: 'Room not found' });
        if (room.admin !== socket.id) return callback({ success: false, message: 'Not authorized' });

        room.isPaused = true;
        cancelAutoFlow(roomCode); // pause also stops auto-flow countdown
        io.to(roomCode).emit('auctionPaused', { timer: room.timer });
        callback({ success: true });
    });

    // ─── resumeAuction ────────────────────────────────────────────────────────
    socket.on('resumeAuction', ({ roomCode }, callback) => {
        const room = state.rooms[roomCode];
        if (!room) return callback({ success: false, message: 'Room not found' });
        if (room.admin !== socket.id) return callback({ success: false, message: 'Not authorized' });

        room.isPaused = false;
        io.to(roomCode).emit('auctionResumed', { timer: room.timer });

        // If auto-flow was on and we're between players, resume countdown
        if (room.autoFlow && !room.hasStarted && room.activePlayerIndex === null) {
            scheduleAutoFlow(roomCode);
        }

        callback({ success: true });
    });
};

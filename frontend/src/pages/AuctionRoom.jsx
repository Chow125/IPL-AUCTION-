import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { socket } from '../socket';
import CircularTimer from '../components/CircularTimer';
import PlayerCard from '../components/PlayerCard';
import AuctionHistory from '../components/AuctionHistory';
import { showToast } from '../components/Toast';
import { Users, LogOut, LayoutDashboard, Gavel, SkipForward, Pause, Play, ChevronDown, ChevronUp, Shuffle, Tag } from 'lucide-react';

const CATEGORIES = ['Batsman', 'Bowler', 'All-Rounder'];

export default function AuctionRoom() {
    const { roomCode } = useParams();
    const navigate = useNavigate();
    const [currentUser, setCurrentUser] = useState(null);
    const [roomState, setRoomState] = useState(null);
    const [timer, setTimer] = useState(0);
    const [isPaused, setIsPaused] = useState(false);
    const [isRevealed, setIsRevealed] = useState(false);
    const [historyOpen, setHistoryOpen] = useState(false);

    // Auto-flow state
    const [autoFlow, setAutoFlow] = useState(true);
    const [nextCountdown, setNextCountdown] = useState(null);   // seconds until next player picked
    const [previewCountdown, setPreviewCountdown] = useState(null); // seconds until bidding starts

    // Host controls state
    const [selectedMode, setSelectedMode] = useState('random');
    const [selectedCategory, setSelectedCategory] = useState('Batsman');
    const [pickLoading, setPickLoading] = useState(false);

    const prevBidAmount = useRef(0);

    // ── Socket setup ────────────────────────────────────────────
    useEffect(() => {
        const userStr = localStorage.getItem('ipl_user');
        if (!userStr) { navigate('/'); return; }

        const user = JSON.parse(userStr);
        setCurrentUser(user);

        socket.emit('joinRoom', { username: user.username, roomCode }, (res) => {
            if (res.success) {
                setCurrentUser(res.user);
                localStorage.setItem('ipl_user', JSON.stringify(res.user));
                setRoomState(res.roomState);
                setIsPaused(res.roomState.isPaused || false);
                setTimer(res.roomState.timer || 0);
                setAutoFlow(res.roomState.autoFlow ?? true);
                setSelectedMode(res.roomState.auctionMode || 'random');
                // If still in lobby phase, redirect back
                if (res.roomState.phase === 'lobby') { navigate(`/room/${roomCode}`); return; }
                if (res.roomState.activePlayerIndex !== null) setIsRevealed(true);
            } else {
                navigate('/');
            }
        });

        socket.on('roomUpdated', (room) => {
            setRoomState(room);
            setIsPaused(room.isPaused || false);
        });

        socket.on('playerSelected', ({ player }) => {
            setIsRevealed(false);
            setTimeout(() => setIsRevealed(true), 50);
            setRoomState(prev => prev ? { ...prev, activePlayerIndex: prev.playersList?.findIndex(p => p.id === player.id) ?? prev.activePlayerIndex, hasStarted: false } : prev);
            showToast(`🏏 ${player.name} is up next!`, 'info');
        });

        socket.on('auctionStarted', ({ roomState: rs }) => {
            setRoomState(rs);
            setTimer(rs.timer);
            setIsPaused(false);
        });

        socket.on('timerUpdate', ({ timer: t }) => {
            setTimer(t);
        });

        socket.on('bidPlaced', ({ roomState: rs, timer: t }) => {
            setRoomState(rs);
            setTimer(t);
        });

        socket.on('playerSold', ({ player, winner, price }) => {
            const fmt = price >= 100 ? `${(price / 100).toFixed(2)} Cr` : `${price} L`;
            showToast(`🔨 ${player.name} SOLD to ${winner} for ₹${fmt}!`, 'sold');
            setIsRevealed(false);
        });

        socket.on('playerUnsold', ({ player }) => {
            showToast(`❌ ${player.name} went UNSOLD`, 'error');
            setIsRevealed(false);
        });

        socket.on('playerSkipped', ({ player }) => {
            showToast(`⏭️ ${player.name} skipped`, 'skip');
            setIsRevealed(false);
        });

        socket.on('auctionPaused', () => {
            setIsPaused(true);
            showToast('⏸️ Auction paused by host', 'info');
        });

        socket.on('auctionResumed', () => {
            setIsPaused(false);
            showToast('▶️ Auction resumed!', 'success');
        });

        // Auto-flow countdown events
        socket.on('autoNextCountdown', ({ seconds }) => {
            setNextCountdown(seconds);
            setPreviewCountdown(null);
        });

        socket.on('autoPreviewCountdown', ({ seconds }) => {
            setPreviewCountdown(seconds);
            setNextCountdown(null);
        });

        socket.on('autoFlowChanged', ({ autoFlow: af }) => {
            setAutoFlow(af);
            setNextCountdown(null);
            setPreviewCountdown(null);
            showToast(af ? '🤖 Auto mode ON' : '🎮 Manual mode ON', 'info');
        });

        socket.on('auctionComplete', () => {
            setNextCountdown(null);
            setPreviewCountdown(null);
            showToast('🏆 All players auctioned! Auction complete.', 'sold');
        });

        return () => {
            socket.off('roomUpdated');
            socket.off('playerSelected');
            socket.off('auctionStarted');
            socket.off('timerUpdate');
            socket.off('bidPlaced');
            socket.off('playerSold');
            socket.off('playerUnsold');
            socket.off('playerSkipped');
            socket.off('auctionPaused');
            socket.off('auctionResumed');
            socket.off('autoNextCountdown');
            socket.off('autoPreviewCountdown');
            socket.off('autoFlowChanged');
            socket.off('auctionComplete');
        };
    }, [roomCode, navigate]);

    if (!roomState || !currentUser) {
        return (
            <>
                <div className="page-bg" style={{ backgroundImage: "url('/bg-auction.png')" }} />
                <div className="page-content">
                    <div className="glass-card" style={{ textAlign: 'center', padding: '40px' }}>
                        <div style={{ fontSize: '2.5rem', marginBottom: '16px', animation: 'float 2s infinite' }}>🏏</div>
                        <div style={{ color: 'var(--text-dim)' }}>Connecting to auction room…</div>
                    </div>
                </div>
            </>
        );
    }

    const isAdmin = roomState.admin === currentUser.id;
    const activePlayer = roomState.activePlayerIndex !== null
        ? roomState.playersList?.[roomState.activePlayerIndex]
        : null;

    const sortedUsers = [...roomState.users].sort((a, b) => b.playersBought.length - a.playersBought.length);

    const formatMoney = (lakhs) => {
        if (lakhs == null) return '—';
        if (lakhs >= 100) return `₹${(lakhs / 100).toFixed(2)} Cr`;
        return `₹${lakhs} L`;
    };

    const remainingPlayers = roomState.playersList?.filter(p => !p.sold && !p.unsold && !p.skipped).length ?? 0;
    const soldPlayers = roomState.playersList?.filter(p => p.sold).length ?? 0;

    // ── Host actions ──────────────────────────────────────────────
    const handleSetMode = (mode) => {
        setSelectedMode(mode);
        socket.emit('setAuctionMode', { roomCode, mode, category: selectedCategory });
    };

    const handlePickPlayer = () => {
        setPickLoading(true);
        const cat = selectedMode === 'category' ? selectedCategory : null;
        socket.emit('selectNextPlayer', { roomCode, category: cat }, (res) => {
            setPickLoading(false);
            if (!res.success) showToast(`⚠️ ${res.message}`, 'error');
        });
    };

    const handleStartBidding = () => {
        socket.emit('startPlayerAuction', { roomCode }, (res) => {
            if (!res.success) showToast(`⚠️ ${res.message}`, 'error');
        });
    };

    const handleSkip = () => {
        socket.emit('skipPlayer', { roomCode }, (res) => {
            if (!res.success) showToast(`⚠️ ${res.message}`, 'error');
        });
    };

    const handlePauseResume = () => {
        if (isPaused) {
            socket.emit('resumeAuction', { roomCode }, (res) => {
                if (!res.success) showToast(`⚠️ ${res.message}`, 'error');
            });
        } else {
            socket.emit('pauseAuction', { roomCode }, (res) => {
                if (!res.success) showToast(`⚠️ ${res.message}`, 'error');
            });
        }
    };

    const handleToggleAutoFlow = () => {
        socket.emit('toggleAutoFlow', { roomCode }, (res) => {
            if (!res.success) showToast(`⚠️ ${res.message}`, 'error');
            else setAutoFlow(res.autoFlow);
        });
    };

    // ── Participant bid ────────────────────────────────────────────
    const handleBid = () => {
        socket.emit('placeBid', { roomCode }, (res) => {
            if (!res.success) showToast(`⚠️ ${res.message}`, 'error');
        });
    };

    const isHighestBidder = roomState.currentBid?.highestBidderId === currentUser.id;
    const canBid = !isAdmin && roomState.hasStarted && !isPaused && timer > 0 && activePlayer && !isHighestBidder;

    return (
        <>
            <div className="page-bg" style={{ backgroundImage: "url('/bg-auction.png')" }} />
            <div className="page-content" style={{ justifyContent: 'flex-start', padding: '1rem' }}>

                {/* ── Header ── */}
                <header style={{
                    width: '100%', maxWidth: '1400px',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    marginBottom: '16px', padding: '12px 20px',
                    background: 'var(--glass-bg)', border: '1px solid var(--glass-border)',
                    borderRadius: 'var(--radius-lg)', backdropFilter: 'blur(20px)',
                    flexWrap: 'wrap', gap: '12px'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                        <span style={{ fontSize: '1.4rem' }}>🏏</span>
                        <div>
                            <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Room Code</div>
                            <div style={{ fontFamily: 'Rajdhani', fontSize: '1.5rem', fontWeight: 700, color: 'var(--gold)', letterSpacing: '0.2em' }}>{roomCode}</div>
                        </div>
                        <div style={{ width: 1, height: 36, background: 'var(--glass-border)' }} />
                        <div style={{ fontSize: '0.82rem', color: 'var(--text-dim)' }}>
                            <span style={{ color: 'var(--neon-green)', fontWeight: 600 }}>{roomState.users.length}</span> teams ·{' '}
                            <span style={{ color: 'var(--gold)', fontWeight: 600 }}>{soldPlayers}</span> sold ·{' '}
                            <span style={{ fontWeight: 600 }}>{remainingPlayers}</span> left
                        </div>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        <button className="btn btn-navy" style={{ padding: '9px 14px', fontSize: '0.85rem' }} onClick={() => navigate(`/dashboard/${roomCode}`)}>
                            <LayoutDashboard size={16} /> Dashboard
                        </button>
                        <button className="btn btn-danger" style={{ padding: '9px 14px', fontSize: '0.85rem' }} onClick={() => navigate(`/room/${roomCode}`)}>
                            <LogOut size={16} /> Leave
                        </button>
                    </div>
                </header>

                {/* ── Main grid ── */}
                <div className="auction-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: '16px', width: '100%', maxWidth: '1400px', flex: 1 }}>

                    {/* ── CENTER STAGE ── */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

                        {/* Main Stage Card */}
                        <div className="glass-card-flat" style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '55vh', position: 'relative' }}>

                            {/* Pause overlay */}
                            {isPaused && roomState.hasStarted && (
                                <div className="pause-overlay">
                                    <div className="pause-icon">⏸️</div>
                                    <div style={{ fontFamily: 'Rajdhani', fontSize: '1.6rem', fontWeight: 700, color: 'var(--gold)' }}>AUCTION PAUSED</div>
                                    <div style={{ color: 'var(--text-dim)', fontSize: '0.9rem' }}>Waiting for host to resume…</div>
                                    {isAdmin && (
                                        <button className="btn btn-success" style={{ marginTop: '12px' }} onClick={handlePauseResume}>
                                            <Play size={16} /> Resume Auction
                                        </button>
                                    )}
                                </div>
                            )}

                            {/* Waiting for admin to pick / auto countdown */}
                            {!activePlayer && (
                                <div className="waiting-screen">
                                    {nextCountdown !== null ? (
                                        <>
                                            <div style={{ fontSize: '3.5rem', animation: 'float 1.5s ease-in-out infinite' }}>🎲</div>
                                            <div style={{ fontFamily: 'Rajdhani', fontSize: '1.8rem', fontWeight: 700, color: 'var(--gold)' }}>
                                                NEXT PLAYER IN
                                            </div>
                                            <div style={{ fontFamily: 'Rajdhani', fontSize: '4rem', fontWeight: 700, color: 'var(--gold)', textShadow: '0 0 30px var(--gold-glow)', lineHeight: 1, animation: 'pulseScale 0.5s ease-in-out infinite alternate' }}>
                                                {nextCountdown}s
                                            </div>
                                            <div style={{ fontSize: '0.85rem', color: 'var(--text-dim)' }}>Get ready to bid!</div>
                                        </>
                                    ) : (
                                        <>
                                            <div className="waiting-icon">🎯</div>
                                            <div style={{ fontFamily: 'Rajdhani', fontSize: '1.8rem', fontWeight: 700, color: 'var(--text-dim)' }}>
                                                {isAdmin ? (autoFlow ? '🤖 Auto Mode Running' : 'Select a Player to Begin') : 'Waiting for Auctioneer…'}
                                            </div>
                                            <div style={{ fontSize: '0.9rem', maxWidth: '320px' }}>
                                                {isAdmin
                                                    ? (autoFlow ? 'Players are selected automatically. Toggle to Manual to take control.' : 'Use the Host Controls panel to pick the next player.')
                                                    : 'The host will select the next player to auction.'}
                                            </div>
                                        </>
                                    )}
                                </div>
                            )}

                            {/* Player revealed — preview (not started) */}
                            {activePlayer && !roomState.hasStarted && (
                                <div className="preview-screen" style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                    <div className="preview-label">🔔 NEXT UP FOR AUCTION</div>
                                    <PlayerCard player={activePlayer} isRevealed={isRevealed} />

                                    {/* Auto preview countdown */}
                                    {previewCountdown !== null && (
                                        <div style={{ marginTop: '20px', textAlign: 'center' }}>
                                            <div style={{ fontSize: '0.8rem', color: 'var(--text-dim)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '4px' }}>Bidding starts in</div>
                                            <div style={{ fontFamily: 'Rajdhani', fontSize: '3rem', fontWeight: 700, color: 'var(--neon-green)', textShadow: '0 0 20px var(--neon-green-glow)', animation: 'pulseScale 0.5s ease-in-out infinite alternate' }}>
                                                {previewCountdown}s
                                            </div>
                                        </div>
                                    )}

                                    {/* Manual controls (only shown when autoFlow is OFF) */}
                                    {isAdmin && !autoFlow && (
                                        <div style={{ display: 'flex', gap: '12px', marginTop: '24px', flexWrap: 'wrap', justifyContent: 'center' }}>
                                            <button className="btn btn-gold" style={{ fontSize: '1rem', padding: '14px 28px' }} onClick={handleStartBidding}>
                                                <Gavel size={18} /> Start Bidding!
                                            </button>
                                            <button className="btn btn-danger" style={{ fontSize: '0.9rem' }} onClick={handleSkip}>
                                                <SkipForward size={16} /> Skip Player
                                            </button>
                                        </div>
                                    )}
                                    {!isAdmin && previewCountdown === null && (
                                        <div style={{ marginTop: '16px', color: 'var(--text-dim)', fontSize: '0.9rem' }}>
                                            Bidding starts soon…
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* LIVE BIDDING */}
                            {activePlayer && roomState.hasStarted && (
                                <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px' }}>

                                    {/* Timer + bid display row */}
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap', justifyContent: 'center' }}>
                                        <CircularTimer timer={timer} maxTime={20} />
                                        <div style={{ textAlign: 'center' }}>
                                            <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Current Bid</div>
                                            <div style={{
                                                fontFamily: 'Rajdhani', fontSize: 'clamp(2rem, 5vw, 3rem)', fontWeight: 700,
                                                color: roomState.currentBid?.amount > 0 ? 'var(--gold)' : 'var(--text-dim)',
                                                textShadow: roomState.currentBid?.amount > 0 ? '0 0 30px var(--gold-glow)' : 'none',
                                            }}>
                                                {formatMoney(roomState.currentBid?.amount > 0 ? roomState.currentBid.amount : activePlayer.basePrice)}
                                            </div>
                                            {roomState.currentBid?.highestBidder ? (
                                                <div style={{ color: 'var(--neon-green)', fontWeight: 600, fontSize: '0.9rem' }}>
                                                    🏆 {roomState.currentBid.highestBidder}
                                                </div>
                                            ) : (
                                                <div style={{ color: 'var(--text-dim)', fontSize: '0.85rem' }}>No bids yet</div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Player card */}
                                    <PlayerCard player={activePlayer} isRevealed={isRevealed} />

                                    {/* BID BUTTON / ADMIN MESSAGE */}
                                    {!isAdmin ? (
                                        <button
                                            className="btn btn-bid"
                                            onClick={handleBid}
                                            disabled={!canBid}
                                            style={{ width: '100%', maxWidth: '420px' }}
                                        >
                                            {isHighestBidder
                                                ? '✅ You are the highest bidder'
                                                : timer <= 0
                                                ? '⏰ Time\'s up!'
                                                : `🔨 PLACE BID — ${formatMoney(roomState.currentBid?.amount > 0 ? roomState.currentBid.amount + 10 : activePlayer.basePrice)}`}
                                        </button>
                                    ) : (
                                        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', justifyContent: 'center' }}>
                                            <button className="btn btn-navy" onClick={handlePauseResume} style={{ fontSize: '0.85rem' }}>
                                                {isPaused ? <><Play size={15} /> Resume</> : <><Pause size={15} /> Pause</>}
                                            </button>
                                            <button className="btn btn-danger" onClick={handleSkip} style={{ fontSize: '0.85rem' }}>
                                                <SkipForward size={15} /> Skip Player
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* ── SIDEBAR ── */}
                    <div className="sidebar-col" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>

                        {/* HOST CONTROL PANEL */}
                        {isAdmin && (
                            <div className="host-panel">

                                {/* Auto/Manual toggle */}
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <Gavel size={16} style={{ color: 'var(--gold)' }} />
                                        <span style={{ fontFamily: 'Rajdhani', fontWeight: 700, fontSize: '1rem', letterSpacing: '0.05em', color: 'var(--gold)' }}>HOST CONTROLS</span>
                                    </div>
                                    <button
                                        onClick={handleToggleAutoFlow}
                                        style={{
                                            padding: '5px 12px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 700,
                                            border: `1px solid ${autoFlow ? 'var(--neon-green)' : 'var(--gold)'}`,
                                            background: autoFlow ? 'rgba(45,198,83,0.15)' : 'rgba(212,175,55,0.15)',
                                            color: autoFlow ? 'var(--neon-green)' : 'var(--gold)',
                                            cursor: 'pointer', fontFamily: 'Outfit, sans-serif',
                                            transition: 'all 0.2s',
                                        }}
                                    >
                                        {autoFlow ? '🤖 AUTO' : '🎮 MANUAL'}
                                    </button>
                                </div>

                                {/* Mode selector */}
                                <div className="tab-group" style={{ marginBottom: '12px' }}>
                                    <button className={`tab-btn ${selectedMode === 'random' ? 'active' : ''}`} onClick={() => handleSetMode('random')}>
                                        <Shuffle size={13} /> Random
                                    </button>
                                    <button className={`tab-btn ${selectedMode === 'category' ? 'active' : ''}`} onClick={() => handleSetMode('category')}>
                                        <Tag size={13} /> Category
                                    </button>
                                </div>

                                {/* Category picker */}
                                {selectedMode === 'category' && (
                                    <div className="category-grid">
                                        {CATEGORIES.map(cat => (
                                            <button
                                                key={cat}
                                                className={`category-btn ${selectedCategory === cat ? 'selected' : ''}`}
                                                onClick={() => setSelectedCategory(cat)}
                                            >
                                                {cat === 'Batsman' ? '🏏' : cat === 'Bowler' ? '🎯' : '⭐'} {cat}
                                            </button>
                                        ))}
                                    </div>
                                )}

                                {/* Manual pick — only when autoFlow is OFF */}
                                {!autoFlow && !roomState.hasStarted && (
                                    <button
                                        className="btn btn-gold"
                                        onClick={handlePickPlayer}
                                        disabled={pickLoading || (activePlayer && roomState.activePlayerIndex !== null)}
                                        style={{ width: '100%', marginTop: '8px', fontSize: '0.9rem' }}
                                    >
                                        {pickLoading ? '⏳ Picking…' : activePlayer ? '🔄 Pick Different Player' : '🎲 Pick Next Player'}
                                    </button>
                                )}

                                {/* Auto-flow status banner */}
                                {autoFlow && !roomState.hasStarted && (
                                    <div style={{ marginTop: '8px', padding: '10px', background: 'rgba(45,198,83,0.08)', border: '1px solid rgba(45,198,83,0.2)', borderRadius: 'var(--radius-sm)', fontSize: '0.8rem', color: 'var(--neon-green)', textAlign: 'center' }}>
                                        {nextCountdown !== null
                                            ? `⏳ Next player in ${nextCountdown}s…`
                                            : previewCountdown !== null
                                            ? `▶️ Bidding starts in ${previewCountdown}s…`
                                            : '🤖 Auto-flow active — players selected automatically'}
                                    </div>
                                )}

                                {/* Pause/Resume during live bid */}
                                {roomState.hasStarted && (
                                    <button className={`btn ${isPaused ? 'btn-success' : 'btn-navy'}`} onClick={handlePauseResume} style={{ width: '100%', marginTop: '8px', fontSize: '0.9rem' }}>
                                        {isPaused ? <><Play size={15} /> Resume Bidding</> : <><Pause size={15} /> Pause Bidding</>}
                                    </button>
                                )}

                                {/* Skip — always shown when a player is active */}
                                {activePlayer && (
                                    <button className="btn btn-danger" onClick={handleSkip} style={{ width: '100%', marginTop: '8px', fontSize: '0.85rem' }}>
                                        <SkipForward size={14} /> Skip Current Player
                                    </button>
                                )}
                            </div>
                        )}


                        {/* LEADERBOARD */}
                        <div className="glass-card-flat" style={{ flex: 1 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
                                <Users size={15} style={{ color: 'var(--gold)' }} />
                                <span style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--gold)' }}>Teams & Budgets</span>
                            </div>
                            {sortedUsers.map((u, i) => {
                                const isMe = u.id === currentUser.id;
                                const budgetPct = ((10000 - u.budget) / 10000) * 100;
                                return (
                                    <div key={u.id} className={`leaderboard-row ${isMe ? 'is-me' : ''}`}>
                                        <div>
                                            <div style={{ fontWeight: isMe ? 700 : 500, color: isMe ? 'var(--gold)' : 'var(--text-light)', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                {u.id === roomState.admin && <span style={{ fontSize: '0.7rem', background: 'rgba(212,175,55,0.2)', color: 'var(--gold)', padding: '2px 6px', borderRadius: '4px', fontWeight: 700 }}>HOST</span>}
                                                {u.username} {isMe && '(You)'}
                                            </div>
                                            <div style={{ fontSize: '0.73rem', color: 'var(--text-dim)', marginTop: '2px' }}>{u.playersBought.length} / 15 players</div>
                                            {/* Budget bar */}
                                            <div style={{ width: '100%', height: 4, background: 'rgba(255,255,255,0.08)', borderRadius: 2, marginTop: '5px', overflow: 'hidden' }}>
                                                <div style={{ width: `${budgetPct}%`, height: '100%', background: 'linear-gradient(90deg, var(--neon-green), var(--gold))', transition: 'width 0.5s', borderRadius: 2 }} />
                                            </div>
                                        </div>
                                        <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: '12px' }}>
                                            <div style={{ fontFamily: 'Rajdhani', fontWeight: 700, fontSize: '1rem', color: u.budget < 500 ? 'var(--red)' : 'var(--text-light)' }}>
                                                {formatMoney(u.budget)}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* AUCTION HISTORY */}
                        <div className="glass-card-flat">
                            <button
                                style={{ width: '100%', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'var(--gold)', fontWeight: 600, fontSize: '0.9rem', padding: 0 }}
                                onClick={() => setHistoryOpen(o => !o)}
                            >
                                <span>📋 Auction History ({roomState.auctionHistory?.length || 0})</span>
                                {historyOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                            </button>
                            {historyOpen && (
                                <div style={{ marginTop: '14px' }}>
                                    <AuctionHistory history={roomState.auctionHistory || []} />
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}

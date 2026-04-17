import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { socket } from '../socket';
import { IPL_TEAMS } from '../data/teamData';
import { showToast } from '../components/Toast';
import { Users, Gavel, Clock, LogOut, Copy, Check } from 'lucide-react';

const TIMER_OPTIONS = [10, 15, 20, 30];

// SVG team badge — same as in PlayerCard
function TeamBadge({ team, size = 56 }) {
    const r = size / 2;
    const fontSize = size * 0.28;
    const sw = size * 0.07;
    return (
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
            <circle cx={r} cy={r} r={r - sw / 2} fill={team.primary} stroke={team.secondary} strokeWidth={sw} />
            <ellipse cx={r} cy={r * 0.62} rx={r * 0.52} ry={r * 0.22} fill="rgba(255,255,255,0.13)" />
            <text x={r} y={r + fontSize * 0.38} textAnchor="middle" fontSize={fontSize}
                fontWeight="900" fontFamily="Rajdhani, Arial, sans-serif" letterSpacing="1" fill={team.textColor}>
                {team.short}
            </text>
        </svg>
    );
}

export default function LobbyRoom() {
    const { roomCode } = useParams();
    const navigate = useNavigate();
    const [currentUser, setCurrentUser] = useState(null);
    const [roomState, setRoomState] = useState(null);
    const [copied, setCopied] = useState(false);
    const [timerDuration, setTimerDuration] = useState(20);

    const teams = Object.entries(IPL_TEAMS).filter(([k]) => k !== 'INTL').map(([code, t]) => ({ code, ...t }));

    useEffect(() => {
        const userStr = localStorage.getItem('ipl_user');
        if (!userStr) { navigate('/'); return; }

        const user = JSON.parse(userStr);
        setCurrentUser(user);

        socket.emit('joinRoom', { username: user.username, roomCode }, (res) => {
            if (!res.success) { navigate('/'); return; }
            setCurrentUser(res.user);
            localStorage.setItem('ipl_user', JSON.stringify(res.user));
            setRoomState(res.roomState);
            setTimerDuration(res.roomState.timerDuration || 20);
            // If already in auction phase (e.g. reconnect), navigate straight to auction
            if (res.roomState.phase === 'auction') {
                navigate(`/auction/${roomCode}`);
            }
        });

        socket.on('roomUpdated', (room) => {
            setRoomState(room);
            setTimerDuration(room.timerDuration || 20);
        });

        socket.on('phaseChanged', ({ phase }) => {
            if (phase === 'auction') navigate(`/auction/${roomCode}`);
        });

        return () => {
            socket.off('roomUpdated');
            socket.off('phaseChanged');
        };
    }, [roomCode, navigate]);

    if (!roomState || !currentUser) {
        return (
            <>
                <div className="page-bg" style={{ backgroundImage: "url('/bg-lobby.png')" }} />
                <div className="page-content">
                    <div className="glass-card" style={{ textAlign: 'center', padding: '40px' }}>
                        <div style={{ fontSize: '3rem', marginBottom: '12px', animation: 'float 2s infinite' }}>🏏</div>
                        <div style={{ color: 'var(--text-dim)' }}>Joining lobby…</div>
                    </div>
                </div>
            </>
        );
    }

    const isAdmin = roomState.admin === currentUser.id;
    const myTeam = roomState.teamSelections?.[currentUser.id] || null;
    const takenCodes = new Set(Object.values(roomState.teamSelections || {}).map(t => t.code));

    const copyCode = () => {
        navigator.clipboard.writeText(roomCode);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleSelectTeam = (team) => {
        if (takenCodes.has(team.code) && myTeam?.code !== team.code) {
            showToast(`${team.name} is already taken!`, 'error');
            return;
        }
        socket.emit('selectTeam', { roomCode, team }, (res) => {
            if (!res.success) showToast(`⚠️ ${res.message}`, 'error');
            else showToast(`✅ You picked ${team.name}!`, 'success');
        });
    };

    const handleSetTimer = (dur) => {
        socket.emit('setTimerDuration', { roomCode, duration: dur }, (res) => {
            if (res.success) {
                setTimerDuration(res.timerDuration);
                showToast(`⏱ Timer set to ${res.timerDuration}s`, 'info');
            }
        });
    };

    const handleStartAuction = () => {
        socket.emit('startAuction', { roomCode }, (res) => {
            if (!res.success) showToast(`⚠️ ${res.message}`, 'error');
        });
    };

    // Build player list with their selections
    const playerRows = roomState.users.map(u => ({
        ...u,
        selection: roomState.teamSelections?.[u.id] || null,
        isMe: u.id === currentUser.id,
        isHost: u.id === roomState.admin,
    }));

    const allPicked = playerRows.filter(p => !p.isHost).every(p => p.selection);
    const anyPicked = playerRows.some(p => p.selection);

    return (
        <>
            {/* IPL captains background */}
            <div className="page-bg" style={{ backgroundImage: "url('/bg-lobby.png')" }} />

            <div className="page-content" style={{ justifyContent: 'flex-start', padding: '1.5rem', gap: '20px' }}>

                {/* ── HEADER ── */}
                <header style={{
                    width: '100%', maxWidth: '1300px',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '14px 24px',
                    background: 'var(--glass-bg)', border: '1px solid var(--glass-border)',
                    borderRadius: 'var(--radius-lg)', backdropFilter: 'blur(20px)',
                    flexWrap: 'wrap', gap: '12px'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                        <span style={{ fontSize: '1.6rem' }}>🏏</span>
                        <div>
                            <div style={{ fontSize: '0.68rem', color: 'var(--text-dim)', letterSpacing: '0.12em', textTransform: 'uppercase' }}>Auction Lobby</div>
                            <div style={{ fontFamily: 'Rajdhani', fontSize: '1.8rem', fontWeight: 700, color: 'var(--gold)', letterSpacing: '0.15em', lineHeight: 1 }}>
                                IPL AUCTION {new Date().getFullYear()}
                            </div>
                        </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
                        {/* Room code chip */}
                        <button onClick={copyCode} style={{
                            display: 'flex', alignItems: 'center', gap: '10px',
                            background: 'rgba(212,175,55,0.1)', border: '1px solid var(--gold)',
                            borderRadius: 'var(--radius-md)', padding: '8px 18px', cursor: 'pointer'
                        }}>
                            <div>
                                <div style={{ fontSize: '0.62rem', color: 'var(--text-dim)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Room Code</div>
                                <div style={{ fontFamily: 'Rajdhani', fontSize: '1.4rem', fontWeight: 700, color: 'var(--gold)', letterSpacing: '0.2em' }}>{roomCode}</div>
                            </div>
                            {copied ? <Check size={16} color="var(--neon-green)" /> : <Copy size={14} color="var(--gold)" />}
                        </button>

                        {/* Users count */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-dim)', fontSize: '0.9rem' }}>
                            <Users size={16} style={{ color: 'var(--neon-green)' }} />
                            <span><b style={{ color: 'var(--neon-green)' }}>{roomState.users.length}</b> in lobby</span>
                        </div>

                        <button className="btn btn-danger" style={{ padding: '8px 14px', fontSize: '0.82rem' }} onClick={() => navigate('/')}>
                            <LogOut size={14} /> Leave
                        </button>
                    </div>
                </header>

                {/* ── MAIN LAYOUT ── */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '20px', width: '100%', maxWidth: '1300px', flex: 1 }}>

                    {/* LEFT: Team picker */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

                        <div className="glass-card-flat">
                            <div style={{ marginBottom: '18px' }}>
                                <h2 style={{ fontFamily: 'Rajdhani', fontSize: '1.4rem', fontWeight: 700, color: '#fff', letterSpacing: '0.04em' }}>
                                    🏆 Pick Your IPL Franchise
                                </h2>
                                <div style={{ fontSize: '0.85rem', color: 'var(--text-dim)', marginTop: '4px' }}>
                                    {myTeam
                                        ? <>You selected: <span style={{ color: myTeam.primary, fontWeight: 700 }}>{myTeam.name}</span></>
                                        : 'Choose your team to represent in the auction'}
                                </div>
                            </div>

                            <div style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
                                gap: '12px'
                            }}>
                                {teams.map(team => {
                                    const taken = takenCodes.has(team.code) && myTeam?.code !== team.code;
                                    const isMyPick = myTeam?.code === team.code;
                                    const takenByUser = playerRows.find(p => p.selection?.code === team.code && !p.isMe);

                                    return (
                                        <button
                                            key={team.code}
                                            onClick={() => !taken && handleSelectTeam(team)}
                                            disabled={taken}
                                            style={{
                                                display: 'flex', alignItems: 'center', gap: '14px',
                                                padding: '14px 16px',
                                                background: isMyPick
                                                    ? `linear-gradient(135deg, ${team.primary}33, ${team.secondary}22)`
                                                    : taken ? 'rgba(0,0,0,0.15)' : 'rgba(0,0,0,0.25)',
                                                border: `1.5px solid ${isMyPick ? team.primary : taken ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.08)'}`,
                                                borderRadius: 'var(--radius-md)',
                                                cursor: taken ? 'not-allowed' : 'pointer',
                                                opacity: taken ? 0.45 : 1,
                                                transition: 'all 0.2s',
                                                textAlign: 'left',
                                                position: 'relative',
                                                overflow: 'hidden',
                                                fontFamily: 'Outfit, sans-serif',
                                            }}
                                        >
                                            {/* Glow when selected */}
                                            {isMyPick && (
                                                <div style={{
                                                    position: 'absolute', inset: 0,
                                                    background: `radial-gradient(ellipse at 30% 50%, ${team.primary}22, transparent 70%)`,
                                                    pointerEvents: 'none'
                                                }} />
                                            )}

                                            <TeamBadge team={team} size={50} />

                                            <div style={{ flex: 1, position: 'relative' }}>
                                                <div style={{
                                                    fontFamily: 'Rajdhani', fontWeight: 700,
                                                    fontSize: '1rem', color: isMyPick ? team.primary : '#fff',
                                                    letterSpacing: '0.03em'
                                                }}>
                                                    {team.short}
                                                </div>
                                                <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', lineHeight: 1.3 }}>
                                                    {team.name}
                                                </div>
                                                {takenByUser && (
                                                    <div style={{ fontSize: '0.68rem', color: team.primary, marginTop: '3px', fontWeight: 600 }}>
                                                        → {takenByUser.username}
                                                    </div>
                                                )}
                                            </div>

                                            {isMyPick && (
                                                <Check size={18} style={{ color: team.primary, flexShrink: 0 }} />
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    </div>

                    {/* RIGHT: Lobby panel */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>

                        {/* Players in lobby */}
                        <div className="glass-card-flat">
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
                                <Users size={15} style={{ color: 'var(--gold)' }} />
                                <span style={{ fontWeight: 600, color: 'var(--gold)', fontSize: '0.9rem' }}>
                                    Players in Lobby ({roomState.users.length})
                                </span>
                            </div>

                            {playerRows.map(u => (
                                <div key={u.id} style={{
                                    display: 'flex', alignItems: 'center', gap: '12px',
                                    padding: '10px 0',
                                    borderBottom: '1px solid rgba(255,255,255,0.05)',
                                }}>
                                    {/* Avatar */}
                                    <div style={{
                                        width: 36, height: 36, borderRadius: '50%',
                                        background: u.selection
                                            ? `linear-gradient(135deg, ${u.selection.primary}, ${u.selection.secondary})`
                                            : 'rgba(255,255,255,0.08)',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        fontFamily: 'Rajdhani', fontWeight: 700, fontSize: '0.8rem',
                                        color: u.selection ? u.selection.textColor : 'var(--text-dim)',
                                        flexShrink: 0,
                                        border: u.isMe ? '2px solid var(--gold)' : '2px solid transparent',
                                    }}>
                                        {u.selection ? u.selection.short : u.username[0].toUpperCase()}
                                    </div>

                                    <div style={{ flex: 1 }}>
                                        <div style={{
                                            fontSize: '0.9rem', fontWeight: 600,
                                            color: u.isMe ? 'var(--gold)' : '#fff',
                                            display: 'flex', alignItems: 'center', gap: '6px'
                                        }}>
                                            {u.username}
                                            {u.isMe && <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>(You)</span>}
                                            {u.isHost && <span style={{ fontSize: '0.65rem', background: 'rgba(212,175,55,0.2)', color: 'var(--gold)', padding: '1px 6px', borderRadius: '4px', fontWeight: 700 }}>HOST</span>}
                                        </div>
                                        <div style={{ fontSize: '0.75rem', color: u.selection ? u.selection.primary : 'var(--text-muted)' }}>
                                            {u.selection ? u.selection.name : (u.isHost ? 'Auctioneer (no team)' : 'Picking team…')}
                                        </div>
                                    </div>

                                    {/* Status dot */}
                                    <div style={{
                                        width: 8, height: 8, borderRadius: '50%',
                                        background: u.selection || u.isHost ? 'var(--neon-green)' : 'rgba(255,255,255,0.2)',
                                        boxShadow: (u.selection || u.isHost) ? '0 0 6px var(--neon-green)' : 'none',
                                        flexShrink: 0,
                                    }} />
                                </div>
                            ))}
                        </div>

                        {/* Timer settings (host only) */}
                        {isAdmin && (
                            <div className="glass-card-flat">
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                                    <Clock size={15} style={{ color: 'var(--gold)' }} />
                                    <span style={{ fontWeight: 600, color: 'var(--gold)', fontSize: '0.9rem' }}>Bid Timer</span>
                                    <span style={{ marginLeft: 'auto', fontFamily: 'Rajdhani', fontSize: '1.4rem', fontWeight: 700, color: 'var(--gold)' }}>{timerDuration}s</span>
                                </div>
                                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                    {TIMER_OPTIONS.map(sec => (
                                        <button
                                            key={sec}
                                            onClick={() => handleSetTimer(sec)}
                                            style={{
                                                flex: 1, minWidth: '50px', padding: '10px 8px',
                                                borderRadius: 'var(--radius-sm)',
                                                border: `1px solid ${timerDuration === sec ? 'var(--gold)' : 'var(--glass-border)'}`,
                                                background: timerDuration === sec ? 'rgba(212,175,55,0.15)' : 'rgba(0,0,0,0.25)',
                                                color: timerDuration === sec ? 'var(--gold)' : 'var(--text-dim)',
                                                fontFamily: 'Rajdhani', fontWeight: 700, fontSize: '1.1rem',
                                                cursor: 'pointer', transition: 'all 0.2s',
                                            }}
                                        >
                                            {sec}s
                                        </button>
                                    ))}
                                </div>
                                {/* Custom duration */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '10px' }}>
                                    <input
                                        type="number" min="5" max="60"
                                        className="input-base"
                                        placeholder="Custom (5–60s)"
                                        style={{ flex: 1, padding: '10px 14px', fontSize: '0.9rem' }}
                                        onKeyDown={e => { if (e.key === 'Enter') handleSetTimer(e.target.value); }}
                                    />
                                    <button className="btn btn-navy" style={{ padding: '10px 14px', fontSize: '0.85rem', whiteSpace: 'nowrap' }}
                                        onClick={e => handleSetTimer(e.target.previousElementSibling?.value || 20)}>
                                        Set
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* START AUCTION button */}
                        {isAdmin ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                {!anyPicked && (
                                    <div style={{ fontSize: '0.8rem', color: 'var(--text-dim)', textAlign: 'center' }}>
                                        Waiting for players to pick teams…
                                    </div>
                                )}
                                <button
                                    className="btn btn-gold"
                                    onClick={handleStartAuction}
                                    style={{ padding: '18px', fontSize: '1.1rem', borderRadius: 'var(--radius-lg)', width: '100%' }}
                                >
                                    <Gavel size={20} />
                                    {allPicked ? '🚀 Start Auction!' : '⚡ Start Anyway'}
                                </button>
                                {!allPicked && anyPicked && (
                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', textAlign: 'center' }}>
                                        Not all players have selected teams yet
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div style={{
                                padding: '20px', textAlign: 'center',
                                background: 'rgba(212,175,55,0.06)', border: '1px solid rgba(212,175,55,0.15)',
                                borderRadius: 'var(--radius-md)', color: 'var(--text-dim)', fontSize: '0.9rem'
                            }}>
                                <div style={{ fontSize: '2rem', marginBottom: '8px', animation: 'float 2s infinite' }}>⏳</div>
                                Waiting for the host to start the auction…
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
}

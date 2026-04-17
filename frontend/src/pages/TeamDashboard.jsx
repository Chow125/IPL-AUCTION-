import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { socket } from '../socket';
import AuctionHistory from '../components/AuctionHistory';
import { ArrowLeft, User, Trophy, Gavel } from 'lucide-react';

const ROLE_COLORS = {
    'Batsman':    { color: '#4ea8de', bg: 'rgba(78,168,222,0.12)', icon: '🏏' },
    'Bowler':     { color: '#2dc653', bg: 'rgba(45,198,83,0.12)',  icon: '🎯' },
    'All-Rounder':{ color: '#D4AF37', bg: 'rgba(212,175,55,0.12)', icon: '⭐' },
    'Wicket Keeper':{ color: '#ff9f43', bg: 'rgba(255,159,67,0.12)', icon: '🧤' },
};

export default function TeamDashboard() {
    const { roomCode } = useParams();
    const navigate = useNavigate();
    const [currentUser, setCurrentUser] = useState(null);
    const [roomState, setRoomState] = useState(null);
    const [selectedTeam, setSelectedTeam] = useState(null);
    const [historyOpen, setHistoryOpen] = useState(false);

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
                setSelectedTeam(res.user.id); // Default view: own team
            } else {
                navigate('/');
            }
        });

        socket.on('roomUpdated', (room) => {
            setRoomState(room);
        });

        return () => socket.off('roomUpdated');
    }, [roomCode, navigate]);

    if (!roomState || !currentUser) {
        return (
            <>
                <div className="page-bg" style={{ backgroundImage: "url('/bg-dugout.png')" }} />
                <div className="page-content">
                    <div className="glass-card" style={{ textAlign: 'center', padding: '40px' }}>
                        <div style={{ fontSize: '2.5rem', marginBottom: '16px', animation: 'float 2s infinite' }}>🏟️</div>
                        <div style={{ color: 'var(--text-dim)' }}>Loading dashboard…</div>
                    </div>
                </div>
            </>
        );
    }

    const viewingUser = roomState.users.find(u => u.id === selectedTeam) || roomState.users.find(u => u.id === currentUser.id);
    const totalBudget = 10000;
    const spent = viewingUser ? totalBudget - viewingUser.budget : 0;
    const spentPct = (spent / totalBudget) * 100;

    const formatMoney = (lakhs) => {
        if (lakhs == null) return '—';
        if (lakhs >= 100) return `₹${(lakhs / 100).toFixed(2)} Cr`;
        return `₹${lakhs} L`;
    };

    // Group players by role
    const groupedPlayers = {};
    if (viewingUser) {
        viewingUser.playersBought.forEach(p => {
            const role = p.role || 'Other';
            if (!groupedPlayers[role]) groupedPlayers[role] = [];
            groupedPlayers[role].push(p);
        });
    }

    const soldCount  = roomState.playersList?.filter(p => p.sold).length ?? 0;
    const unsoldCount= roomState.playersList?.filter(p => p.unsold).length ?? 0;
    const remaining  = roomState.playersList?.filter(p => !p.sold && !p.unsold && !p.skipped).length ?? 0;

    return (
        <>
            <div className="page-bg" style={{ backgroundImage: "url('/bg-dugout.png')" }} />
            <div className="page-content" style={{ justifyContent: 'flex-start', padding: '1.5rem', maxWidth: '1200px', margin: '0 auto' }}>

                {/* Back button */}
                <div style={{ width: '100%', marginBottom: '16px' }}>
                    <button className="btn btn-navy" onClick={() => navigate(`/auction/${roomCode}`)} style={{ fontSize: '0.85rem', padding: '10px 18px' }}>
                        <ArrowLeft size={16} /> Back to Auction
                    </button>
                </div>

                {/* Page header */}
                <div style={{ width: '100%', marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
                    <div>
                        <h1 className="heading-hero" style={{ fontSize: 'clamp(1.8rem, 4vw, 2.8rem)' }}>Team Dashboard</h1>
                        <div style={{ color: 'var(--text-dim)', fontSize: '0.88rem', marginTop: '4px' }}>Room <span style={{ color: 'var(--gold)', fontWeight: 700, letterSpacing: '0.1em' }}>{roomCode}</span></div>
                    </div>
                    {/* Auction summary bar */}
                    <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                        {[
                            { label: 'Sold', value: soldCount, color: 'var(--neon-green)' },
                            { label: 'Unsold', value: unsoldCount, color: 'var(--red)' },
                            { label: 'Remaining', value: remaining, color: 'var(--text-dim)' },
                        ].map(s => (
                            <div key={s.label} className="glass-card" style={{ padding: '12px 20px', textAlign: 'center', minWidth: '90px' }}>
                                <div style={{ fontFamily: 'Rajdhani', fontSize: '1.6rem', fontWeight: 700, color: s.color }}>{s.value}</div>
                                <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{s.label}</div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Team selector tabs */}
                <div style={{ width: '100%', overflowX: 'auto', marginBottom: '20px' }}>
                    <div style={{ display: 'flex', gap: '8px', paddingBottom: '4px' }}>
                        {roomState.users.map(u => (
                            <button
                                key={u.id}
                                onClick={() => setSelectedTeam(u.id)}
                                style={{
                                    padding: '9px 18px',
                                    borderRadius: 'var(--radius-md)',
                                    border: `1px solid ${selectedTeam === u.id ? 'var(--gold)' : 'var(--glass-border)'}`,
                                    background: selectedTeam === u.id ? 'rgba(212,175,55,0.12)' : 'var(--glass-bg)',
                                    color: selectedTeam === u.id ? 'var(--gold)' : 'var(--text-dim)',
                                    fontWeight: selectedTeam === u.id ? 700 : 500,
                                    fontSize: '0.88rem',
                                    cursor: 'pointer',
                                    backdropFilter: 'blur(12px)',
                                    whiteSpace: 'nowrap',
                                    transition: 'all 0.2s',
                                    fontFamily: 'Outfit, sans-serif',
                                }}
                            >
                                {u.username} {u.id === currentUser.id && '(You)'} {u.id === roomState.admin && '👑'}
                                <span style={{ marginLeft: '6px', fontSize: '0.75rem', opacity: 0.7 }}>{u.playersBought.length}/15</span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Main content grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '16px', width: '100%', marginBottom: '20px' }}>
                    {/* Budget card */}
                    <div className="glass-card">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                            <div>
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Remaining Budget</div>
                                <div style={{ fontFamily: 'Rajdhani', fontSize: '2.4rem', fontWeight: 700, color: viewingUser?.budget < 500 ? 'var(--red)' : 'var(--neon-green)' }}>
                                    {formatMoney(viewingUser?.budget)}
                                </div>
                            </div>
                            <Trophy size={28} style={{ color: 'var(--gold)', opacity: 0.7 }} />
                        </div>
                        <div style={{ width: '100%', height: '8px', background: 'rgba(255,255,255,0.08)', borderRadius: '4px', overflow: 'hidden', marginBottom: '8px' }}>
                            <div style={{
                                width: `${spentPct}%`, height: '100%',
                                background: spentPct > 80
                                    ? 'linear-gradient(90deg, var(--gold), var(--red))'
                                    : 'linear-gradient(90deg, var(--neon-green), var(--gold))',
                                transition: 'width 0.5s, background 0.3s',
                                borderRadius: '4px',
                            }} />
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                            <span>Spent: {formatMoney(spent)}</span>
                            <span>Total: {formatMoney(totalBudget)}</span>
                        </div>
                    </div>

                    {/* Squad size */}
                    <div className="glass-card">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Squad Size</div>
                            <User size={22} style={{ color: 'var(--blue-accent)', opacity: 0.7 }} />
                        </div>
                        <div style={{ fontFamily: 'Rajdhani', fontSize: '2.4rem', fontWeight: 700 }}>
                            {viewingUser?.playersBought.length ?? 0}
                            <span style={{ fontSize: '1.2rem', color: 'var(--text-dim)', marginLeft: '4px' }}>/ 15</span>
                        </div>
                        {/* Role breakdown */}
                        <div style={{ marginTop: '12px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                            {Object.entries(groupedPlayers).map(([role, players]) => {
                                const cfg = ROLE_COLORS[role] || { color: '#aaa', bg: 'rgba(255,255,255,0.05)', icon: '👤' };
                                return (
                                    <div key={role} style={{ background: cfg.bg, border: `1px solid ${cfg.color}33`, borderRadius: '20px', padding: '4px 10px', fontSize: '0.75rem', color: cfg.color, fontWeight: 600 }}>
                                        {cfg.icon} {players.length} {role}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* Squad list grouped by role */}
                {viewingUser?.playersBought.length === 0 ? (
                    <div className="glass-card" style={{ width: '100%', textAlign: 'center', padding: '48px' }}>
                        <div style={{ fontSize: '3rem', marginBottom: '12px', opacity: 0.4 }}>🏏</div>
                        <div style={{ color: 'var(--text-dim)' }}>No players in squad yet.</div>
                    </div>
                ) : (
                    Object.entries(groupedPlayers).map(([role, players]) => {
                        const cfg = ROLE_COLORS[role] || { color: '#aaa', bg: 'rgba(255,255,255,0.05)', icon: '👤' };
                        return (
                            <div key={role} style={{ width: '100%', marginBottom: '20px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                                    <span style={{ fontSize: '1.2rem' }}>{cfg.icon}</span>
                                    <h2 style={{ fontFamily: 'Rajdhani', fontWeight: 700, color: cfg.color, fontSize: '1.2rem', letterSpacing: '0.05em', textTransform: 'uppercase' }}>{role}s</h2>
                                    <div style={{ flex: 1, height: 1, background: `${cfg.color}33` }} />
                                    <span style={{ fontSize: '0.8rem', color: cfg.color, fontWeight: 600 }}>{players.length} players</span>
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '12px' }}>
                                    {players.map(p => (
                                        <div key={p.id} className="glass-card" style={{ padding: '16px', borderLeft: `3px solid ${cfg.color}` }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                                <div>
                                                    <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>{p.name}</div>
                                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '2px' }}>{p.role}</div>
                                                </div>
                                                <div style={{ textAlign: 'right' }}>
                                                    <div style={{ fontFamily: 'Rajdhani', fontWeight: 700, color: 'var(--gold)', fontSize: '1.05rem' }}>
                                                        {formatMoney(p.soldPrice)}
                                                    </div>
                                                </div>
                                            </div>
                                            {/* Stats mini */}
                                            <div style={{ display: 'flex', gap: '10px', marginTop: '10px', flexWrap: 'wrap' }}>
                                                {p.stats?.runs != null && (
                                                    <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>
                                                        Runs: <span style={{ color: 'var(--text-light)', fontWeight: 600 }}>{p.stats.runs}</span>
                                                    </div>
                                                )}
                                                {p.stats?.wickets != null && (
                                                    <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>
                                                        Wkts: <span style={{ color: 'var(--text-light)', fontWeight: 600 }}>{p.stats.wickets}</span>
                                                    </div>
                                                )}
                                                {p.stats?.strikeRate != null && (
                                                    <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>
                                                        SR: <span style={{ color: 'var(--text-light)', fontWeight: 600 }}>{p.stats.strikeRate}</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        );
                    })
                )}

                {/* Auction History */}
                <div className="glass-card" style={{ width: '100%', marginTop: '8px' }}>
                    <button
                        onClick={() => setHistoryOpen(o => !o)}
                        style={{ width: '100%', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontFamily: 'Outfit,sans-serif' }}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Gavel size={16} style={{ color: 'var(--gold)' }} />
                            <span style={{ fontWeight: 600, color: 'var(--gold)' }}>Full Auction History ({roomState.auctionHistory?.length || 0} events)</span>
                        </div>
                        <span style={{ color: 'var(--text-dim)', fontSize: '1.2rem' }}>{historyOpen ? '▲' : '▼'}</span>
                    </button>
                    {historyOpen && (
                        <div style={{ marginTop: '16px' }}>
                            <AuctionHistory history={roomState.auctionHistory || []} />
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}

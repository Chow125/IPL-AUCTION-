import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { socket } from '../socket';

export default function HomePage() {
    const [username, setUsername] = useState('');
    const [roomCode, setRoomCode] = useState('');
    const [mode, setMode] = useState('join');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleCreate = (e) => {
        e.preventDefault();
        if (!username.trim()) { setError('Username is required'); return; }
        setLoading(true);
        socket.emit('createRoom', { username: username.trim() }, (res) => {
            setLoading(false);
            if (res.success) {
                localStorage.setItem('ipl_user', JSON.stringify(res.user));
                navigate(`/room/${res.roomCode}`);
            } else {
                setError(res.message || 'Error creating room');
            }
        });
    };

    const handleJoin = (e) => {
        e.preventDefault();
        if (!username.trim() || !roomCode.trim()) { setError('Username and Room Code required'); return; }
        setLoading(true);
        socket.emit('joinRoom', { username: username.trim(), roomCode: roomCode.toUpperCase() }, (res) => {
            setLoading(false);
            if (res.success) {
                localStorage.setItem('ipl_user', JSON.stringify(res.user));
                navigate(`/room/${res.roomCode}`);
            } else {
                setError(res.message || 'Error joining room. Check room code.');
            }
        });
    };

    return (
        <>
            {/* Stadium background */}
            <div className="page-bg" style={{ backgroundImage: "url('/bg-stadium.png')" }} />

            <div className="page-content">
                {/* Logo */}
                <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
                    <div style={{ fontSize: '3.5rem', marginBottom: '8px' }}>🏏</div>
                    <h1 className="heading-hero">IPL Auction</h1>
                    <p style={{ color: 'var(--text-dim)', marginTop: '8px', letterSpacing: '0.08em', fontSize: '0.95rem' }}>
                        REAL-TIME MULTIPLAYER BIDDING
                    </p>
                </div>

                {/* Card */}
                <div className="glass-card" style={{ width: '100%', maxWidth: '420px' }}>

                    {/* Tabs */}
                    <div className="tab-group" style={{ marginBottom: '24px' }}>
                        <button
                            className={`tab-btn ${mode === 'join' ? 'active' : ''}`}
                            onClick={() => { setMode('join'); setError(''); }}
                        >
                            🎟 Join Room
                        </button>
                        <button
                            className={`tab-btn ${mode === 'create' ? 'active' : ''}`}
                            onClick={() => { setMode('create'); setError(''); }}
                        >
                            🏟 Create Room
                        </button>
                    </div>

                    {/* Error */}
                    {error && (
                        <div style={{
                            background: 'rgba(255,45,85,0.12)',
                            border: '1px solid var(--red)',
                            borderRadius: 'var(--radius-sm)',
                            padding: '10px 14px',
                            color: 'var(--red)',
                            fontSize: '0.88rem',
                            marginBottom: '16px',
                            fontWeight: 500
                        }}>
                            ⚠️ {error}
                        </div>
                    )}

                    <form onSubmit={mode === 'join' ? handleJoin : handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <div>
                            <label style={{ fontSize: '0.8rem', color: 'var(--text-dim)', letterSpacing: '0.06em', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>
                                Username
                            </label>
                            <input
                                className="input-base"
                                placeholder="Choose your team name…"
                                value={username}
                                onChange={(e) => { setUsername(e.target.value); setError(''); }}
                                maxLength={15}
                                autoComplete="off"
                            />
                        </div>

                        {mode === 'join' && (
                            <div>
                                <label style={{ fontSize: '0.8rem', color: 'var(--text-dim)', letterSpacing: '0.06em', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>
                                    Room Code
                                </label>
                                <input
                                    className="input-base"
                                    placeholder="Enter 5-letter code…"
                                    value={roomCode}
                                    onChange={(e) => { setRoomCode(e.target.value); setError(''); }}
                                    maxLength={5}
                                    style={{ textTransform: 'uppercase', letterSpacing: '0.15em', fontSize: '1.1rem', fontWeight: 700 }}
                                    autoComplete="off"
                                />
                            </div>
                        )}

                        <button
                            type="submit"
                            className="btn btn-gold"
                            disabled={loading}
                            style={{ marginTop: '12px', padding: '16px', fontSize: '1.05rem', borderRadius: 'var(--radius-md)' }}
                        >
                            {loading ? '⏳ Connecting…' : mode === 'join' ? '🎯 Enter Auction' : '🚀 Create Auction Room'}
                        </button>
                    </form>

                    {mode === 'create' && (
                        <div style={{
                            marginTop: '16px',
                            padding: '12px',
                            background: 'rgba(212,175,55,0.07)',
                            border: '1px solid rgba(212,175,55,0.2)',
                            borderRadius: 'var(--radius-sm)',
                            fontSize: '0.82rem',
                            color: 'var(--text-dim)',
                            lineHeight: 1.6
                        }}>
                            🏆 As <span className="gold-text">Host</span>, you control the auction — pick players, set mode, and manage the bidding stage.
                        </div>
                    )}
                </div>

                <p style={{ marginTop: '28px', color: 'var(--text-muted)', fontSize: '0.8rem', letterSpacing: '0.06em' }}>
                    Powered by real-time WebSockets · {new Date().getFullYear()}
                </p>
            </div>
        </>
    );
}

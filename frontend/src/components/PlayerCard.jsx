import { getPlayerTeam } from '../data/teamData';

/**
 * Spotlight player card — center stage.
 * Props: player, currentBid, isRevealed (triggers entry animation)
 */
export default function PlayerCard({ player, currentBid, isRevealed }) {
    if (!player) return null;

    const team = getPlayerTeam(player.name);

    const roleColors = {
        'Batsman':      '#4ea8de',
        'Bowler':       '#2dc653',
        'All-Rounder':  '#D4AF37',
        'Wicket Keeper':'#ff9f43',
    };
    const roleColor = roleColors[player.role] || '#D4AF37';

    const formatMoney = (lakhs) => {
        if (lakhs >= 100) return `${(lakhs / 100).toFixed(2)} Cr`;
        return `${lakhs} L`;
    };

    return (
        <div
            className={`player-card-spotlight ${isRevealed ? 'player-card-enter' : ''}`}
            style={{ '--role-color': roleColor }}
        >
            {/* Spotlight glow */}
            <div className="spotlight-glow" />

            {/* ── Team strip across top ── */}
            <div className="team-strip" style={{
                background: `linear-gradient(135deg, ${team.primary}cc, ${team.secondary}66)`,
                borderBottom: `1px solid ${team.primary}55`,
            }}>
                {/* Team Logo Badge */}
                <TeamLogoBadge team={team} size={48} />

                {/* Team Name */}
                <div style={{ flex: 1, textAlign: 'left' }}>
                    <div style={{ fontSize: '0.65rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.5)', marginBottom: '2px' }}>
                        Current Team
                    </div>
                    <div style={{
                        fontFamily: 'Rajdhani, sans-serif',
                        fontWeight: 700,
                        fontSize: 'clamp(0.85rem, 2vw, 1.05rem)',
                        color: team.primary === '#1C1C1C' ? team.textColor : '#fff',
                        letterSpacing: '0.03em',
                        lineHeight: 1.2,
                        textShadow: `0 1px 8px ${team.primary}88`,
                    }}>
                        {team.name}
                    </div>
                </div>

                {/* Role badge */}
                <div className="role-badge" style={{ background: roleColor, flexShrink: 0, margin: 0 }}>
                    {player.role}
                </div>
            </div>

            {/* ── Player Name ── */}
            <h1 className="player-name" style={{ marginTop: '20px' }}>{player.name}</h1>

            {/* Base Price */}
            <div className="player-base-price">
                Base Price: <span style={{ color: '#D4AF37' }}>{formatMoney(player.basePrice)}</span>
            </div>

            {/* Stats grid */}
            <div className="player-stats-grid">
                <div className="stat-item">
                    <div className="stat-label">Matches</div>
                    <div className="stat-value">{player.stats?.matches ?? '—'}</div>
                </div>
                {(player.role === 'Batsman' || player.role === 'All-Rounder') && (
                    <>
                        <div className="stat-item">
                            <div className="stat-label">Runs</div>
                            <div className="stat-value">{player.stats?.runs ?? '—'}</div>
                        </div>
                        <div className="stat-item">
                            <div className="stat-label">Avg</div>
                            <div className="stat-value">{player.stats?.average ?? '—'}</div>
                        </div>
                        <div className="stat-item">
                            <div className="stat-label">SR</div>
                            <div className="stat-value">{player.stats?.strikeRate ?? '—'}</div>
                        </div>
                    </>
                )}
                {(player.role === 'Bowler' || player.role === 'All-Rounder') && (
                    <>
                        <div className="stat-item">
                            <div className="stat-label">Wickets</div>
                            <div className="stat-value">{player.stats?.wickets ?? '—'}</div>
                        </div>
                        <div className="stat-item">
                            <div className="stat-label">Econ</div>
                            <div className="stat-value">{player.stats?.economy ?? '—'}</div>
                        </div>
                    </>
                )}
            </div>

            {/* Current bid display */}
            {currentBid && (
                <div className="current-bid-display">
                    <div className="bid-label">Current Bid</div>
                    <div className={`bid-amount ${currentBid.amount > 0 ? 'bid-active' : ''}`}>
                        {currentBid.amount > 0 ? formatMoney(currentBid.amount) : formatMoney(player.basePrice)}
                    </div>
                    {currentBid.highestBidder && (
                        <div className="bid-leader">🏆 {currentBid.highestBidder}</div>
                    )}
                </div>
            )}
        </div>
    );
}

/**
 * Circular SVG team logo badge.
 * Shows team abbreviation with primary/secondary colors.
 */
function TeamLogoBadge({ team, size = 52 }) {
    const r = size / 2;
    const fontSize = size * 0.28;
    const strokeW = size * 0.07;

    return (
        <svg
            width={size} height={size}
            viewBox={`0 0 ${size} ${size}`}
            style={{ flexShrink: 0, filter: `drop-shadow(0 2px 8px ${team.primary}88)` }}
        >
            {/* Outer ring */}
            <circle cx={r} cy={r} r={r - strokeW / 2}
                fill={team.primary}
                stroke={team.secondary}
                strokeWidth={strokeW}
            />
            {/* Inner shine arc */}
            <ellipse cx={r} cy={r * 0.6} rx={r * 0.55} ry={r * 0.25}
                fill="rgba(255,255,255,0.12)"
            />
            {/* Team abbreviation */}
            <text
                x={r} y={r + fontSize * 0.38}
                textAnchor="middle"
                fontSize={fontSize}
                fontWeight="900"
                fontFamily="Rajdhani, Arial, sans-serif"
                letterSpacing="1"
                fill={team.textColor}
            >
                {team.short}
            </text>
        </svg>
    );
}

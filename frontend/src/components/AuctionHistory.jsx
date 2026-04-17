/**
 * Auction history log panel.
 * Props: history (array of { type, player, role, price, team, timestamp })
 */
export default function AuctionHistory({ history }) {
    if (!history || history.length === 0) {
        return (
            <div className="history-empty">
                <span>No auctions yet</span>
            </div>
        );
    }

    const typeConfig = {
        sold: { color: '#2dc653', label: 'SOLD', icon: '🔨' },
        unsold: { color: '#FF2D55', label: 'UNSOLD', icon: '❌' },
        skipped: { color: '#888', label: 'SKIPPED', icon: '⏭️' },
    };

    const formatMoney = (lakhs) => {
        if (!lakhs) return '';
        if (lakhs >= 100) return `${(lakhs / 100).toFixed(2)} Cr`;
        return `${lakhs} L`;
    };

    return (
        <div className="history-list">
            {[...history].reverse().map((event, i) => {
                const cfg = typeConfig[event.type] || typeConfig.unsold;
                return (
                    <div key={i} className="history-item" style={{ borderLeftColor: cfg.color }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                                <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>
                                    {cfg.icon} {event.player}
                                </div>
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '2px' }}>
                                    {event.role}
                                </div>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                                <div style={{ color: cfg.color, fontWeight: 700, fontSize: '0.85rem' }}>
                                    {cfg.label}
                                </div>
                                {event.type === 'sold' && (
                                    <div style={{ color: '#D4AF37', fontSize: '0.8rem' }}>
                                        {formatMoney(event.price)}
                                    </div>
                                )}
                                {event.team && (
                                    <div style={{ color: 'var(--text-dim)', fontSize: '0.75rem' }}>
                                        → {event.team}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

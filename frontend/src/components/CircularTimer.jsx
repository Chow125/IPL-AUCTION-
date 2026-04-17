import { useEffect, useRef } from 'react';

/**
 * Animated SVG circular countdown timer.
 * Props: timer (seconds), maxTime (max seconds for full circle)
 */
export default function CircularTimer({ timer, maxTime = 20 }) {
    const prevTimer = useRef(timer);

    useEffect(() => {
        prevTimer.current = timer;
    }, [timer]);

    const size = 100;
    const stroke = 8;
    const r = (size - stroke) / 2;
    const circumference = 2 * Math.PI * r;
    const progress = Math.max(0, timer / maxTime);
    const dashOffset = circumference * (1 - progress);

    // Color: green → yellow → red
    let color = '#2dc653';
    if (timer <= 10) color = '#D4AF37';
    if (timer <= 5) color = '#FF2D55';

    const urgent = timer <= 5 && timer > 0;

    return (
        <div
            style={{
                position: 'relative',
                width: size,
                height: size,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
            }}
        >
            <svg width={size} height={size} style={{ position: 'absolute', top: 0, left: 0 }}>
                {/* Track */}
                <circle
                    cx={size / 2} cy={size / 2} r={r}
                    fill="none"
                    stroke="rgba(255,255,255,0.1)"
                    strokeWidth={stroke}
                />
                {/* Progress arc */}
                <circle
                    cx={size / 2} cy={size / 2} r={r}
                    fill="none"
                    stroke={color}
                    strokeWidth={stroke}
                    strokeDasharray={circumference}
                    strokeDashoffset={dashOffset}
                    strokeLinecap="round"
                    transform={`rotate(-90 ${size / 2} ${size / 2})`}
                    style={{
                        transition: 'stroke-dashoffset 0.9s linear, stroke 0.3s ease',
                        filter: urgent ? `drop-shadow(0 0 6px ${color})` : 'none',
                    }}
                />
            </svg>
            <span
                style={{
                    fontSize: '1.6rem',
                    fontWeight: 700,
                    color,
                    fontVariantNumeric: 'tabular-nums',
                    lineHeight: 1,
                    animation: urgent ? 'pulseScale 0.5s ease-in-out infinite alternate' : 'none',
                }}
            >
                {timer}
            </span>
        </div>
    );
}

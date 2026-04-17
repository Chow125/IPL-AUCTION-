import { useState, useEffect, useCallback } from 'react';

let toastId = 0;

// Global toast store using a simple event emitter pattern
const listeners = new Set();
const toastStore = {
    toasts: [],
    add(toast) {
        this.toasts = [...this.toasts, toast];
        listeners.forEach(fn => fn(this.toasts));
    },
    remove(id) {
        this.toasts = this.toasts.filter(t => t.id !== id);
        listeners.forEach(fn => fn(this.toasts));
    }
};

// Call this from anywhere to fire a toast
export function showToast(message, type = 'info') {
    const id = ++toastId;
    toastStore.add({ id, message, type });
    setTimeout(() => toastStore.remove(id), 3500);
}

// Mount this once at the app root
export default function ToastContainer() {
    const [toasts, setToasts] = useState([]);

    useEffect(() => {
        const handler = (t) => setToasts([...t]);
        listeners.add(handler);
        return () => listeners.delete(handler);
    }, []);

    const dismiss = useCallback((id) => toastStore.remove(id), []);

    const typeStyles = {
        success: { bg: '#1a3a1a', border: '#2dc653', icon: '✅' },
        error: { bg: '#3a1a1a', border: '#FF2D55', icon: '❌' },
        info: { bg: '#1a2a3a', border: '#D4AF37', icon: '🏏' },
        sold: { bg: '#1a2a0a', border: '#D4AF37', icon: '🔨' },
        skip: { bg: '#2a2a1a', border: '#888', icon: '⏭️' },
    };

    return (
        <div style={{
            position: 'fixed',
            top: '20px',
            right: '20px',
            zIndex: 9999,
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
            pointerEvents: 'none',
        }}>
            {toasts.map(toast => {
                const style = typeStyles[toast.type] || typeStyles.info;
                return (
                    <div
                        key={toast.id}
                        onClick={() => dismiss(toast.id)}
                        style={{
                            background: style.bg,
                            border: `1px solid ${style.border}`,
                            borderLeft: `4px solid ${style.border}`,
                            borderRadius: '12px',
                            padding: '14px 20px',
                            color: '#fff',
                            fontSize: '0.95rem',
                            fontWeight: 500,
                            boxShadow: `0 4px 20px rgba(0,0,0,0.4), 0 0 20px ${style.border}22`,
                            animation: 'toastIn 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)',
                            backdropFilter: 'blur(12px)',
                            pointerEvents: 'all',
                            cursor: 'pointer',
                            maxWidth: '340px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px',
                        }}
                    >
                        <span style={{ fontSize: '1.2rem' }}>{style.icon}</span>
                        {toast.message}
                    </div>
                );
            })}
        </div>
    );
}

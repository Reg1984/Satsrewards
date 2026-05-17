import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Bitcoin, Lock, Eye, EyeOff, ArrowRight } from 'lucide-react';
import { useAuthStore } from '../store/authStore';

const liquidGlass: React.CSSProperties = {
  background: 'rgba(255,255,255,0.02)',
  backdropFilter: 'blur(4px)',
  WebkitBackdropFilter: 'blur(4px)',
  boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.07), 0 0 0 1px rgba(255,255,255,0.06)',
};

export function LoginPage() {
  const navigate = useNavigate();
  const { signIn } = useAuthStore();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');
  const [shake, setShake] = useState(false);

  const attempt = async () => {
    if (!email || !password || loading) return;
    setLoading(true);
    setErr('');

    const result = await signIn(email, password);

    if (result.error) {
      setErr('Incorrect email or password.');
      setShake(true);
      setTimeout(() => setShake(false), 600);
      setTimeout(() => setErr(''), 2500);
      setPassword('');
      setLoading(false);
    } else {
      navigate('/app');
    }
  };

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') attempt();
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, background: '#000',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      padding: '24px',
    }}>
      {/* Subtle orange radial glow */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        background: 'radial-gradient(ellipse at 50% 40%, rgba(249,115,22,0.07) 0%, transparent 65%)',
      }} />

      <motion.div
        animate={shake ? { x: [-8, 8, -6, 6, -3, 3, 0] } : { x: 0 }}
        transition={{ duration: 0.5 }}
        style={{ width: '100%', maxWidth: '360px', position: 'relative', zIndex: 1 }}
      >
        {/* Brand */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '48px', justifyContent: 'center' }}>
          <div style={{
            width: 36, height: 36, borderRadius: '50%',
            background: 'rgba(249,115,22,0.12)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            border: '1px solid rgba(249,115,22,0.25)',
          }}>
            <Bitcoin size={18} color="rgba(251,146,60,0.9)" />
          </div>
          <span style={{ fontSize: '1.25rem', fontWeight: 600, color: '#fff', letterSpacing: '-0.02em' }}>
            SatsRewards
          </span>
        </div>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            width: 48, height: 48, borderRadius: '50%',
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.08)',
            marginBottom: '20px',
          }}>
            <Lock size={20} color="rgba(255,255,255,0.5)" />
          </div>
          <h1 style={{
            fontSize: '1.6rem', fontWeight: 600, color: '#fff',
            letterSpacing: '-0.03em', lineHeight: 1.2, marginBottom: '8px',
          }}>
            Sign in
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.875rem' }}>
            SatsRewards admin &amp; school platform
          </p>
        </div>

        {/* Email pill */}
        <div style={{ ...liquidGlass, borderRadius: '9999px', marginBottom: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', padding: '14px 24px' }}>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              onKeyDown={onKey}
              placeholder="Email"
              autoFocus
              autoComplete="email"
              style={{
                flex: 1, background: 'transparent', border: 'none', outline: 'none',
                color: '#fff', fontSize: '0.9rem',
              }}
            />
          </div>
        </div>

        {/* Password pill */}
        <div style={{ ...liquidGlass, borderRadius: '9999px', marginBottom: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', paddingLeft: '24px', paddingRight: '8px', paddingTop: '8px', paddingBottom: '8px' }}>
            <input
              type={showPw ? 'text' : 'password'}
              value={password}
              onChange={e => setPassword(e.target.value)}
              onKeyDown={onKey}
              placeholder="Password"
              autoComplete="current-password"
              style={{
                flex: 1, background: 'transparent', border: 'none', outline: 'none',
                color: err ? 'rgba(248,113,113,0.9)' : '#fff',
                fontSize: '0.9rem', letterSpacing: '0.05em',
              }}
            />
            <button
              onClick={() => setShowPw(s => !s)}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                padding: '8px', color: 'rgba(255,255,255,0.4)',
                display: 'flex', alignItems: 'center',
              }}
            >
              {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
            <button
              onClick={attempt}
              disabled={loading}
              style={{
                width: 36, height: 36, borderRadius: '50%',
                background: loading ? 'rgba(255,255,255,0.4)' : '#fff',
                border: 'none', cursor: loading ? 'default' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0, transition: 'background 0.2s',
              }}
            >
              {loading ? (
                <div style={{
                  width: 14, height: 14, borderRadius: '50%',
                  border: '2px solid rgba(0,0,0,0.3)',
                  borderTopColor: '#000',
                  animation: 'spin 0.7s linear infinite',
                }} />
              ) : (
                <ArrowRight size={16} color="#000" />
              )}
            </button>
          </div>
        </div>

        <AnimatePresence>
          {err && (
            <motion.p
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              style={{ textAlign: 'center', color: 'rgba(248,113,113,0.8)', fontSize: '0.8rem', marginTop: '8px' }}
            >
              {err}
            </motion.p>
          )}
        </AnimatePresence>
      </motion.div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        input::placeholder { color: rgba(255,255,255,0.25); }
      `}</style>
    </div>
  );
}

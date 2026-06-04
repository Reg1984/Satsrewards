import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Bitcoin, Lock, Eye, EyeOff, ArrowRight, Mail } from 'lucide-react';
import { useAuthStore } from '../store/authStore';

const C = {
  bg: '#000',
  orange: 'rgba(251,146,60,0.9)',
  orangeDim: 'rgba(249,115,22,0.07)',
  orangeBorder: 'rgba(249,115,22,0.25)',
  orangeTint: 'rgba(251,146,60,0.15)',
  orangeTintBorder: 'rgba(251,146,60,0.3)',
  white: '#fff',
  whiteDim: 'rgba(255,255,255,0.35)',
  whiteFaint: 'rgba(255,255,255,0.06)',
  border: 'rgba(255,255,255,0.08)',
};

const glass: React.CSSProperties = {
  background: 'rgba(255,255,255,0.02)',
  backdropFilter: 'blur(4px)',
  WebkitBackdropFilter: 'blur(4px)',
  boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.07), 0 0 0 1px rgba(255,255,255,0.06)',
};

const fieldStyle: React.CSSProperties = {
  ...glass,
  borderRadius: 9999,
  display: 'flex',
  alignItems: 'center',
  paddingLeft: 20,
  paddingRight: 12,
  paddingTop: 10,
  paddingBottom: 10,
  gap: 10,
};

const inputStyle: React.CSSProperties = {
  flex: 1,
  background: 'transparent',
  border: 'none',
  outline: 'none',
  color: C.white,
  fontSize: '0.9rem',
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
      setTimeout(() => setErr(''), 3000);
      setPassword('');
      setLoading(false);
    } else {
      navigate('/app');
    }
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, background: C.bg,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 24,
    }}>
      {/* Glow */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        background: 'radial-gradient(ellipse at 50% 40%, rgba(249,115,22,0.07) 0%, transparent 65%)',
      }} />

      <motion.div
        animate={shake ? { x: [-8, 8, -6, 6, -3, 3, 0] } : { x: 0 }}
        transition={{ duration: 0.5 }}
        style={{ width: '100%', maxWidth: 360, position: 'relative', zIndex: 1 }}
      >
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 44, justifyContent: 'center' }}>
          <div style={{
            width: 36, height: 36, borderRadius: '50%',
            background: C.orangeDim, border: `1px solid ${C.orangeBorder}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Bitcoin size={18} color={C.orange} />
          </div>
          <span style={{ fontSize: '1.25rem', fontWeight: 600, color: C.white, letterSpacing: '-0.02em' }}>
            SatsRewards
          </span>
        </div>

        {/* Heading */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            width: 48, height: 48, borderRadius: '50%',
            background: C.whiteFaint, border: `1px solid ${C.border}`, marginBottom: 16,
          }}>
            <Lock size={20} color={C.whiteDim} />
          </div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 600, color: C.white, letterSpacing: '-0.03em', lineHeight: 1.2, marginBottom: 6 }}>
            Welcome <span style={{ fontStyle: 'italic', color: C.whiteDim }}>back</span>
          </h1>
          <p style={{ color: C.whiteDim, fontSize: '0.85rem' }}>Sign in to your school account</p>
        </div>

        {/* Fields */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 10 }}>
          <div style={fieldStyle}>
            <Mail size={15} color="rgba(255,255,255,0.25)" />
            <input
              type="email"
              value={email}
              onChange={e => { setEmail(e.target.value); setErr(''); }}
              onKeyDown={e => e.key === 'Enter' && attempt()}
              placeholder="Email address"
              autoFocus
              autoComplete="email"
              style={inputStyle}
            />
          </div>

          <div style={{ ...glass, borderRadius: 9999, display: 'flex', alignItems: 'center', paddingLeft: 20, paddingRight: 8, paddingTop: 8, paddingBottom: 8, gap: 10 }}>
            <Lock size={15} color="rgba(255,255,255,0.25)" />
            <input
              type={showPw ? 'text' : 'password'}
              value={password}
              onChange={e => { setPassword(e.target.value); setErr(''); }}
              onKeyDown={e => e.key === 'Enter' && attempt()}
              placeholder="Password"
              autoComplete="current-password"
              style={{ ...inputStyle, color: err ? 'rgba(248,113,113,0.9)' : C.white, letterSpacing: '0.04em' }}
            />
            <button
              onClick={() => setShowPw(s => !s)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 6, color: 'rgba(255,255,255,0.3)', display: 'flex', alignItems: 'center' }}
            >
              {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
            <button
              onClick={attempt}
              disabled={loading}
              style={{
                width: 36, height: 36, borderRadius: '50%',
                background: loading ? 'rgba(255,255,255,0.35)' : C.white,
                border: 'none', cursor: loading ? 'default' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}
            >
              {loading
                ? <div style={{ width: 13, height: 13, borderRadius: '50%', border: '2px solid rgba(0,0,0,0.25)', borderTopColor: '#000', animation: 'spin 0.7s linear infinite' }} />
                : <ArrowRight size={15} color="#000" />
              }
            </button>
          </div>
        </div>

        <AnimatePresence>
          {err && (
            <motion.p
              initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              style={{ textAlign: 'center', color: 'rgba(248,113,113,0.8)', fontSize: '0.8rem', marginBottom: 8 }}
            >
              {err}
            </motion.p>
          )}
        </AnimatePresence>
      </motion.div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        input::placeholder { color: rgba(255,255,255,0.22); }
      `}</style>
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Trophy, BookOpen, Wallet, MessageSquare, Brain,
  Menu, X, Bitcoin, LogOut, ChevronDown, Zap,
  LayoutDashboard, School, Download, Settings, Gamepad2
} from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { useLanguage } from '../contexts/LanguageContext';

// ─── Palette ────────────────────────────────────────────────────────────────
const C = {
  bg: '#0D0F1A',
  bgAlt: '#111420',
  bgCard: '#13162B',
  orange: '#F7931A',
  orangeDim: 'rgba(247,147,26,0.12)',
  orangeBorder: 'rgba(247,147,26,0.22)',
  white: '#F5F2EC',
  whiteDim: 'rgba(245,242,236,0.5)',
  whiteFaint: 'rgba(245,242,236,0.1)',
  border: 'rgba(245,242,236,0.08)',
};

function NavItem({ to, icon: Icon, label, active }: {
  to: string; icon: React.ElementType; label: string; active: boolean;
}) {
  return (
    <Link to={to} style={{
      display: 'flex', alignItems: 'center', gap: 8,
      padding: '8px 14px', borderRadius: 8,
      fontFamily: 'Inter, sans-serif', fontSize: '0.84rem', fontWeight: 500,
      textDecoration: 'none',
      background: active ? C.orangeDim : 'transparent',
      color: active ? C.orange : C.whiteDim,
      border: active ? `1px solid ${C.orangeBorder}` : '1px solid transparent',
      transition: 'all 0.15s',
    }}>
      <Icon size={15} />
      {label}
    </Link>
  );
}

export function Layout() {
  const { user, signOut } = useAuthStore();
  const location = useLocation();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', fn, { passive: true });
    return () => window.removeEventListener('scroll', fn);
  }, []);

  const isActive = (path: string) => location.pathname === path;

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  // Nav links by role
  const studentLinks = [
    { to: '/app', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/app/wallet', icon: Wallet, label: 'Wallet' },
    { to: '/app/learn', icon: BookOpen, label: 'Learn' },
    { to: '/app/games', icon: Gamepad2, label: 'Games' },
    { to: '/app/messages', icon: MessageSquare, label: 'Messages' },
    { to: '/app/ai-assistant', icon: Brain, label: 'AI Tutor' },
  ];

  const teacherLinks = [
    { to: '/app', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/app/funding', icon: Download, label: 'Funding' },
    { to: '/app/learn', icon: BookOpen, label: 'Learn' },
    { to: '/app/messages', icon: MessageSquare, label: 'Messages' },
    { to: '/app/ai-assistant', icon: Brain, label: 'AI Assistant' },
  ];

  const adminLinks = [
    { to: '/app', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/app/school-setup', icon: School, label: 'School Setup' },
    { to: '/app/school-admin', icon: Settings, label: 'Manage' },
    { to: '/app/funding', icon: Download, label: 'Funding' },
    { to: '/app/messages', icon: MessageSquare, label: 'Messages' },
    { to: '/app/ai-assistant', icon: Brain, label: 'AI Assistant' },
  ];

  const links = user?.role === 'admin' ? adminLinks : user?.role === 'teacher' ? teacherLinks : studentLinks;

  return (
    <div className="app-dark" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>

      {/* ── Top nav ─────────────────────────────────────────────────────── */}
      <header style={{
        position: 'sticky', top: 0, zIndex: 40,
        background: scrolled ? 'rgba(13,15,26,0.95)' : C.bgAlt,
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        borderBottom: `1px solid ${C.border}`,
        transition: 'background 0.2s',
      }}>
        <div style={{ maxWidth: 1280, margin: '0 auto', padding: '0 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 60 }}>

            {/* Logo */}
            <Link to="/app" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
              <div style={{
                width: 30, height: 30, borderRadius: '50%',
                background: C.orangeDim, border: `1px solid ${C.orangeBorder}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Bitcoin size={14} color={C.orange} />
              </div>
              <span style={{ fontFamily: 'Inter, sans-serif', fontWeight: 700, fontSize: '0.95rem', color: C.white, letterSpacing: '-0.02em' }}>
                SatsRewards
              </span>
            </Link>

            {/* Desktop nav */}
            <nav style={{ display: 'flex', alignItems: 'center', gap: 4 }} className="hidden-mobile">
              {links.map(l => (
                <NavItem key={l.to} to={l.to} icon={l.icon} label={l.label} active={isActive(l.to)} />
              ))}
            </nav>

            {/* Right: role badge + profile */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }} className="hidden-mobile">
              {user && (
                <div style={{
                  fontFamily: '"JetBrains Mono", monospace', fontSize: '0.68rem',
                  color: C.orange, border: `1px solid ${C.orangeBorder}`,
                  borderRadius: 9999, padding: '3px 10px', textTransform: 'uppercase', letterSpacing: '0.08em',
                }}>
                  {user.role}
                </div>
              )}

              {/* Profile dropdown */}
              <div style={{ position: 'relative' }}>
                <button
                  onClick={() => setProfileOpen(o => !o)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    background: C.whiteFaint, border: `1px solid ${C.border}`,
                    borderRadius: 9999, padding: '6px 12px 6px 8px',
                    cursor: 'pointer', fontFamily: 'Inter, sans-serif', fontSize: '0.84rem',
                    color: C.white,
                  }}
                >
                  <div style={{
                    width: 22, height: 22, borderRadius: '50%',
                    background: C.orangeDim, border: `1px solid ${C.orangeBorder}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '0.65rem', fontWeight: 700, color: C.orange,
                  }}>
                    {user?.name?.charAt(0)?.toUpperCase() ?? '?'}
                  </div>
                  <span style={{ maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {user?.name ?? 'Account'}
                  </span>
                  <ChevronDown size={12} color={C.whiteDim} style={{ transform: profileOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
                </button>

                {profileOpen && (
                  <div style={{
                    position: 'absolute', right: 0, top: 'calc(100% + 8px)',
                    background: C.bgCard, border: `1px solid ${C.border}`,
                    borderRadius: 12, padding: 8, minWidth: 180,
                    boxShadow: '0 16px 40px rgba(0,0,0,0.6)',
                    zIndex: 50,
                  }}>
                    <div style={{ padding: '8px 12px', borderBottom: `1px solid ${C.border}`, marginBottom: 4 }}>
                      <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.82rem', color: C.white, fontWeight: 600 }}>{user?.name}</p>
                      <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.75rem', color: C.whiteDim, marginTop: 2 }}>{user?.email}</p>
                    </div>
                    <button
                      onClick={handleSignOut}
                      style={{
                        width: '100%', display: 'flex', alignItems: 'center', gap: 8,
                        padding: '8px 12px', borderRadius: 8,
                        background: 'none', border: 'none', cursor: 'pointer',
                        fontFamily: 'Inter, sans-serif', fontSize: '0.83rem', color: 'rgba(252,165,165,0.8)',
                        textAlign: 'left',
                      }}
                    >
                      <LogOut size={14} />
                      Sign out
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Mobile hamburger */}
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.whiteDim, padding: 6 }}
              className="show-mobile"
            >
              {menuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {menuOpen && (
          <div style={{ background: C.bgCard, borderTop: `1px solid ${C.border}`, padding: '12px 20px 20px' }}>
            {links.map(l => (
              <Link key={l.to} to={l.to} onClick={() => setMenuOpen(false)} style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '10px 0', textDecoration: 'none',
                fontFamily: 'Inter, sans-serif', fontSize: '0.9rem',
                color: isActive(l.to) ? C.orange : C.whiteDim,
                borderBottom: `1px solid ${C.border}`,
              }}>
                <l.icon size={16} />
                {l.label}
              </Link>
            ))}
            <button
              onClick={handleSignOut}
              style={{
                marginTop: 12, display: 'flex', alignItems: 'center', gap: 10,
                background: 'none', border: 'none', cursor: 'pointer', padding: '10px 0',
                fontFamily: 'Inter, sans-serif', fontSize: '0.9rem', color: 'rgba(252,165,165,0.7)',
              }}
            >
              <LogOut size={16} />
              Sign out
            </button>
          </div>
        )}
      </header>

      {/* ── Page content ──────────────────────────────────────────────────── */}
      {/* Dismiss profile dropdown on outside click */}
      {profileOpen && (
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 39 }}
          onClick={() => setProfileOpen(false)}
        />
      )}

      <main style={{ flex: 1, padding: '28px 20px', maxWidth: 1280, margin: '0 auto', width: '100%' }}>
        <Outlet />
      </main>

      {/* ── Footer ────────────────────────────────────────────────────────── */}
      <footer style={{
        borderTop: `1px solid ${C.border}`, padding: '16px 20px',
        textAlign: 'center',
        fontFamily: '"JetBrains Mono", monospace', fontSize: '0.7rem',
        color: 'rgba(247,147,26,0.3)', letterSpacing: '0.05em',
      }}>
        SatsRewards · SatsStrategy Education Ltd · Co. 16348591
      </footer>

      <style>{`
        @media (max-width: 768px) {
          .hidden-mobile { display: none !important; }
          .show-mobile   { display: flex !important; }
        }
        @media (min-width: 769px) {
          .show-mobile   { display: none !important; }
          .hidden-mobile { display: flex !important; }
        }
        .app-dark a { color: inherit; }
      `}</style>
    </div>
  );
}

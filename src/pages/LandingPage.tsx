import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion, useInView, useMotionValue, useSpring, animate } from 'framer-motion';
import {
  Zap, BookOpen, Trophy, Users, Shield, ChevronRight,
  ArrowRight, CheckCircle, Bitcoin, GraduationCap,
  BarChart3, Lock, Globe, ChevronDown, Menu, X, Wallet,
  Sparkles, TrendingUp, Award
} from 'lucide-react';

// ─── Palette ────────────────────────────────────────────────────────────────
const C = {
  bg: '#0D0F1A',
  bgAlt: '#111420',
  bgCard: '#13162100',
  orange: '#F7931A',
  orangeDim: 'rgba(247,147,26,0.15)',
  orangeBorder: 'rgba(247,147,26,0.25)',
  white: '#F5F2EC',
  whiteDim: 'rgba(245,242,236,0.55)',
  whiteFaint: 'rgba(245,242,236,0.12)',
  border: 'rgba(245,242,236,0.08)',
  borderMid: 'rgba(245,242,236,0.15)',
};

// ─── Content ─────────────────────────────────────────────────────────────────
const NAV_LINKS = [
  { label: 'How It Works', href: '#how-it-works' },
  { label: 'For Schools', href: '#for-schools' },
  { label: 'Trust & Safety', href: '#trust' },
  { label: 'FAQ', href: '#faq' },
];

const HOW_IT_WORKS = [
  {
    step: '01',
    title: 'School signs up',
    description: 'Onboarding takes less than a day. We configure your school, import your classes, and train your staff — remotely or on-site.',
  },
  {
    step: '02',
    title: 'Teachers reward learning',
    description: 'Award satoshis instantly for correct answers, behaviour, attendance, or effort. One tap from any device.',
  },
  {
    step: '03',
    title: 'Students earn and learn',
    description: 'Students watch their sats grow, explore a Bitcoin wallet, and learn real financial literacy — not just theory.',
  },
];

const FOR_TEACHERS = [
  'Reward any subject, any moment — maths, science, behaviour, attendance',
  'AI-generated quizzes and personalised feedback for every student',
  'Real-time class dashboard showing who is engaged and who needs support',
  'Works alongside your existing MIS and reward systems',
  'No Bitcoin knowledge required — we train your whole staff team',
];

const FOR_STUDENTS = [
  'Earn real satoshis (fractions of Bitcoin) for learning',
  'Watch your wallet grow as you complete tasks and quizzes',
  'Compete on class and school leaderboards',
  'Learn how money, savings, and Bitcoin actually work',
  'Withdraw to your own Lightning wallet when you are ready',
];

const TRUST_ITEMS = [
  {
    icon: Shield,
    title: 'GDPR Compliant',
    description: 'All student data is stored on UK/EU servers. We are registered with the ICO and provide a full Data Processing Agreement for schools.',
  },
  {
    icon: Lock,
    title: 'Safeguarding First',
    description: 'No student under 13 can withdraw without parental approval. All wallet activity is logged and visible to school administrators.',
  },
  {
    icon: Globe,
    title: 'Registered Company',
    description: 'SatsStrategy Education Ltd is registered in England and Wales (Company No. 16348591). We are a proper education technology business.',
  },
  {
    icon: BarChart3,
    title: 'Volatility Protection',
    description: "Schools control reward caps and withdrawal limits. Sats are a motivational tool first — financial exposure is always in the school's hands.",
  },
  {
    icon: Users,
    title: 'Parent Transparency',
    description: "We provide a parent information pack with every school onboarding. Parents can view their child's wallet and activity at any time.",
  },
  {
    icon: Award,
    title: 'Education-Led Design',
    description: 'Built by educators, not just technologists. Every feature is designed to support learning outcomes, not replace them.',
  },
];

const FAQS = [
  {
    q: 'Do students need a Bitcoin wallet to get started?',
    a: "No. We provide a custodial wallet inside the platform. Students can earn and accumulate sats without any external wallet. When they're ready to learn about self-custody, we guide them through setting up their own Lightning wallet.",
  },
  {
    q: "What if Bitcoin's value drops?",
    a: "Schools set reward caps — for example, a student might earn up to 500 sats per day, worth a few pence at current prices. The motivational value is in earning and accumulating, not speculation. We're explicit with parents that sats are an educational reward, not an investment.",
  },
  {
    q: 'Is this FCA regulated?',
    a: "We facilitate small-value educational rewards, not financial services. Schools are not providing financial products — they're rewarding students in the same way a supermarket gives loyalty points. We have taken legal advice and operate within existing education reward frameworks.",
  },
  {
    q: 'How much does it cost?',
    a: 'We quote per school based on pupil numbers, services needed, and support tier. We do not publish a public price list — contact us for a personalised proposal.',
  },
  {
    q: "What about students who don't want to engage with Bitcoin?",
    a: 'Participation is always opt-in. Schools can run SatsRewards alongside traditional reward systems. Students who prefer house points or merits still benefit from the same AI quiz and feedback tools.',
  },
  {
    q: 'How long does onboarding take?',
    a: 'Most schools are fully live within one week. Remote onboarding covers a half-day setup call, staff training, and a pilot class test run. On-site options are available for schools that prefer in-person support.',
  },
];

const BITCOIN_PROPS = [
  { value: '21,000,000', label: 'Total supply — ever', note: 'Hard-capped by code, not policy.' },
  { value: '< 1s', label: 'Lightning settlement', note: 'Instant payments, zero middlemen.' },
  { value: '0', label: 'Middlemen', note: 'Student-to-wallet, no bank required.' },
  { value: '100M', label: 'Sats per Bitcoin', note: 'Divisible enough for every child.' },
];

const STATS = [
  { value: '2,400+', label: 'Sats awarded in pilots' },
  { value: '94%', label: 'Teacher satisfaction' },
  { value: '3×', label: 'Homework completion' },
  { value: '< 1 day', label: 'Avg onboarding time' },
];

// ─── Animated number counter hook ────────────────────────────────────────────
function useCounter(target: number, duration = 2200) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true });

  useEffect(() => {
    if (!inView) return;
    const controls = animate(0, target, {
      duration: duration / 1000,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: v => setCount(Math.floor(v)),
    });
    return () => controls.stop();
  }, [inView, target, duration]);

  return { count, ref };
}

// ─── Animated SVG Node Network ───────────────────────────────────────────────
function NodeNetwork() {
  const nodes = [
    { x: 10, y: 20 }, { x: 25, y: 65 }, { x: 42, y: 15 }, { x: 58, y: 50 },
    { x: 72, y: 25 }, { x: 85, y: 70 }, { x: 93, y: 40 }, { x: 30, y: 85 },
    { x: 65, y: 85 }, { x: 50, y: 35 },
  ];
  const edges = [
    [0,2],[0,1],[2,9],[9,3],[3,1],[3,4],[4,9],[4,6],[6,5],[5,8],[8,3],[1,7],[7,8],[4,5],
  ];

  return (
    <svg
      viewBox="0 0 100 100"
      preserveAspectRatio="xMidYMid slice"
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0.22 }}
    >
      <defs>
        <filter id="glow">
          <feGaussianBlur stdDeviation="0.8" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>

      {/* Static edges */}
      {edges.map(([a, b], i) => (
        <line
          key={i}
          x1={nodes[a].x} y1={nodes[a].y}
          x2={nodes[b].x} y2={nodes[b].y}
          stroke="rgba(247,147,26,0.2)" strokeWidth="0.25"
        />
      ))}

      {/* Travelling light pulses along edges */}
      {edges.map(([a, b], i) => {
        const delay = (i * 0.7) % 5;
        const dur = 2.5 + (i % 3) * 0.8;
        return (
          <circle key={`pulse-${i}`} r="0.5" fill="#F7931A" filter="url(#glow)" opacity="0.9">
            <animateMotion
              dur={`${dur}s`}
              begin={`${delay}s`}
              repeatCount="indefinite"
              path={`M${nodes[a].x},${nodes[a].y} L${nodes[b].x},${nodes[b].y}`}
            />
            <animate attributeName="opacity" values="0;0.9;0" dur={`${dur}s`} begin={`${delay}s`} repeatCount="indefinite" />
          </circle>
        );
      })}

      {/* Nodes with pulse */}
      {nodes.map((n, i) => {
        const isHub = i === 9;
        const r = isHub ? 1.4 : 0.7;
        return (
          <g key={i}>
            {isHub && (
              <circle cx={n.x} cy={n.y} r={r + 1} fill="none" stroke="#F7931A" strokeWidth="0.3" opacity="0.4">
                <animate attributeName="r" values={`${r+0.5};${r+2};${r+0.5}`} dur="3s" repeatCount="indefinite" />
                <animate attributeName="opacity" values="0.4;0;0.4" dur="3s" repeatCount="indefinite" />
              </circle>
            )}
            <circle cx={n.x} cy={n.y} r={r} fill={isHub ? '#F7931A' : 'rgba(247,147,26,0.65)'} filter={isHub ? 'url(#glow)' : undefined}>
              {!isHub && (
                <animate attributeName="opacity" values="0.65;1;0.65" dur={`${2 + (i % 4)}s`} begin={`${i * 0.3}s`} repeatCount="indefinite" />
              )}
            </circle>
          </g>
        );
      })}
    </svg>
  );
}

// ─── FAQ accordion ─────────────────────────────────────────────────────────────
function FAQItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ borderBottom: `1px solid ${C.border}` }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center',
          justifyContent: 'space-between', padding: '20px 0',
          background: 'none', border: 'none', cursor: 'pointer',
          gap: 16, textAlign: 'left',
        }}
      >
        <span style={{ fontFamily: 'Inter, sans-serif', fontWeight: 500, color: C.white, fontSize: '0.9rem', lineHeight: 1.5 }}>{q}</span>
        <ChevronDown size={16} color={C.whiteDim} style={{ flexShrink: 0, transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
      </button>
      {open && (
        <p style={{ paddingBottom: 20, fontFamily: 'Inter, sans-serif', fontSize: '0.875rem', color: C.whiteDim, lineHeight: 1.7, marginTop: -6 }}>
          {a}
        </p>
      )}
    </div>
  );
}

// ─── Scroll reveal wrapper ────────────────────────────────────────────────────
function Reveal({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-50px' }}
      transition={{ duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}

// ─── Hover card wrapper ───────────────────────────────────────────────────────
function HoverCard({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <motion.div
      whileHover={{ y: -4, boxShadow: '0 0 0 1px rgba(247,147,26,0.25), 0 16px 40px rgba(247,147,26,0.07)' }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      style={style}
    >
      {children}
    </motion.div>
  );
}

// ─── Animated stat counter ────────────────────────────────────────────────────
function StatCounter({ value, label }: { value: string; label: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true });
  const [displayed, setDisplayed] = useState('0');

  useEffect(() => {
    if (!inView) return;
    // Parse the numeric portion
    const raw = value.replace(/[^0-9.]/g, '');
    const num = parseFloat(raw);
    if (isNaN(num)) { setDisplayed(value); return; }
    const prefix = value.startsWith('<') ? '< ' : '';
    const suffix = value.replace(/[0-9.,<>\s]/g, '');
    const controls = animate(0, num, {
      duration: 1.6,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: v => {
        const rounded = num % 1 === 0 ? Math.floor(v).toLocaleString() : v.toFixed(0);
        setDisplayed(`${prefix}${rounded}${suffix}`);
      },
      onComplete: () => setDisplayed(value),
    });
    return () => controls.stop();
  }, [inView, value]);

  return (
    <div ref={ref} style={{ background: C.bgAlt, padding: '18px 12px', textAlign: 'center' }}>
      <div style={{ fontFamily: '"JetBrains Mono", monospace', fontWeight: 600, fontSize: '1.2rem', color: C.white }}>{displayed}</div>
      <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.72rem', color: C.whiteDim, marginTop: 3, letterSpacing: '0.02em' }}>{label}</div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export function LandingPage() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { count: satCount, ref: satRef } = useCounter(21000000, 2400);

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 30);
    window.addEventListener('scroll', fn, { passive: true });
    return () => window.removeEventListener('scroll', fn);
  }, []);

  return (
    <div style={{ background: C.bg, minHeight: '100vh', fontFamily: 'Inter, sans-serif', color: C.white }}>

      {/* ── NAV ─────────────────────────────────────────────────────────── */}
      <header style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50,
        transition: 'background 0.3s, border-color 0.3s',
        background: scrolled ? 'rgba(13,15,26,0.92)' : 'transparent',
        backdropFilter: scrolled ? 'blur(12px)' : 'none',
        WebkitBackdropFilter: scrolled ? 'blur(12px)' : 'none',
        borderBottom: scrolled ? `1px solid ${C.border}` : '1px solid transparent',
      }}>
        <div style={{ maxWidth: 1120, margin: '0 auto', padding: '0 24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 64 }}>

            {/* Logo */}
            <a href="#" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
              <div style={{
                width: 32, height: 32, borderRadius: '50%',
                background: C.orangeDim, border: `1px solid ${C.orangeBorder}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Bitcoin size={16} color={C.orange} />
              </div>
              <span style={{ fontFamily: 'Inter, sans-serif', fontWeight: 600, fontSize: '1rem', color: C.white, letterSpacing: '-0.02em' }}>
                SatsRewards
              </span>
            </a>

            {/* Desktop nav */}
            <nav style={{ display: 'flex', alignItems: 'center', gap: 32 }} className="hidden-mobile">
              {NAV_LINKS.map(l => (
                <a key={l.href} href={l.href} style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.84rem', color: C.whiteDim, textDecoration: 'none', fontWeight: 450 }}>
                  {l.label}
                </a>
              ))}
            </nav>

            {/* CTA group */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }} className="hidden-mobile">
              <Link to="/login" style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.84rem', color: C.whiteDim, textDecoration: 'none' }}>
                Sign in
              </Link>
              <a
                href="mailto:hello@satsrewards.com?subject=Book a Demo"
                style={{
                  fontFamily: 'Inter, sans-serif', fontSize: '0.84rem', fontWeight: 600,
                  background: C.orange, color: '#000', borderRadius: 8,
                  padding: '8px 18px', textDecoration: 'none',
                  transition: 'opacity 0.15s',
                }}
              >
                Book a Demo
              </a>
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
          <div style={{ background: C.bgAlt, borderTop: `1px solid ${C.border}`, padding: '16px 24px', display: 'flex', flexDirection: 'column', gap: 8 }}>
            {NAV_LINKS.map(l => (
              <a key={l.href} href={l.href} onClick={() => setMenuOpen(false)}
                style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.9rem', color: C.whiteDim, textDecoration: 'none', padding: '8px 0' }}>
                {l.label}
              </a>
            ))}
            <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 12, marginTop: 4, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <Link to="/login" onClick={() => setMenuOpen(false)}
                style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.9rem', color: C.whiteDim, textDecoration: 'none', padding: '8px 0' }}>
                Sign in
              </Link>
              <a href="mailto:hello@satsrewards.com?subject=Book a Demo"
                style={{ fontFamily: 'Inter, sans-serif', fontWeight: 600, fontSize: '0.9rem', background: C.orange, color: '#000', borderRadius: 8, padding: '10px 18px', textDecoration: 'none', textAlign: 'center' }}>
                Book a Demo
              </a>
            </div>
          </div>
        )}
      </header>

      {/* ── HERO ─────────────────────────────────────────────────────────── */}
      <section style={{ position: 'relative', paddingTop: 140, paddingBottom: 100, overflow: 'hidden' }}>
        {/* Node network background */}
        <NodeNetwork />

        {/* Radial glow */}
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          background: 'radial-gradient(ellipse 70% 50% at 50% 30%, rgba(247,147,26,0.09) 0%, transparent 70%)',
        }} />

        <div style={{ position: 'relative', maxWidth: 900, margin: '0 auto', padding: '0 24px', textAlign: 'center' }}>

          {/* Eyebrow */}
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              border: `1px solid ${C.orangeBorder}`, borderRadius: 9999,
              padding: '6px 16px', marginBottom: 32,
              background: C.orangeDim,
            }}>
              <Zap size={12} color={C.orange} />
              <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.78rem', fontWeight: 500, color: 'rgba(247,147,26,0.85)', letterSpacing: '0.04em' }}>
                Built for UK schools — piloting globally
              </span>
            </div>
          </motion.div>

          {/* Headline */}
          <motion.h1
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.08 }}
            style={{
              fontFamily: '"Cormorant Garamond", Georgia, serif',
              fontSize: 'clamp(2.8rem, 7vw, 5.5rem)',
              fontWeight: 600,
              lineHeight: 1.08,
              letterSpacing: '-0.02em',
              color: C.white,
              marginBottom: 28,
            }}
          >
            Reward students with{' '}
            <em style={{ color: C.orange, fontStyle: 'italic' }}>real Bitcoin</em>
            {' '}for learning
          </motion.h1>

          {/* Subhead */}
          <motion.p
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.16 }}
            style={{
              fontFamily: 'Inter, sans-serif',
              fontSize: '1.05rem',
              color: C.whiteDim,
              maxWidth: 560,
              margin: '0 auto 40px',
              lineHeight: 1.7,
              fontWeight: 400,
            }}
          >
            SatsRewards turns everyday classroom achievements into satoshis — real fractions of Bitcoin that students own, accumulate, and learn from.
          </motion.p>

          {/* CTAs */}
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.24 }}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16, flexWrap: 'wrap' }}
          >
            <a
              href="mailto:hello@satsrewards.com?subject=Book a Demo"
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                background: C.orange, color: '#000',
                fontFamily: 'Inter, sans-serif', fontWeight: 700, fontSize: '0.9rem',
                padding: '13px 28px', borderRadius: 10, textDecoration: 'none',
                boxShadow: '0 0 40px rgba(247,147,26,0.25)',
              }}
            >
              Book a Demo <ArrowRight size={15} />
            </a>
            <a
              href="#how-it-works"
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                color: C.whiteDim, fontFamily: 'Inter, sans-serif', fontWeight: 500,
                fontSize: '0.88rem', textDecoration: 'none',
              }}
            >
              See how it works <ChevronRight size={15} />
            </a>
          </motion.div>

          {/* Animated sat counter card */}
          <motion.div
            ref={satRef}
            initial={{ opacity: 0, y: 28 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.4 }}
            style={{
              marginTop: 64,
              display: 'inline-block',
              background: 'rgba(255,255,255,0.03)',
              border: `1px solid ${C.border}`,
              borderRadius: 16,
              padding: '20px 36px',
              backdropFilter: 'blur(8px)',
            }}
          >
            <div style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: 'clamp(1.8rem, 5vw, 3rem)', fontWeight: 600, color: C.orange, letterSpacing: '-0.02em' }}>
              ₿ {satCount.toLocaleString()}
            </div>
            <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.78rem', color: C.whiteDim, marginTop: 4, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
              Total supply — 21 million Bitcoin
            </div>
          </motion.div>

          {/* Stats bar */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.55 }}
            className="stats-grid"
            style={{
              marginTop: 48,
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: 1,
              background: C.border,
              borderRadius: 14,
              overflow: 'hidden',
              border: `1px solid ${C.border}`,
            }}
          >
            {STATS.map(s => (
              <StatCounter key={s.label} value={s.value} label={s.label} />
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── HOW IT WORKS — block explorer timeline ───────────────────────── */}
      <section id="how-it-works" style={{ padding: '100px 24px', position: 'relative' }}>
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0,
          height: 1, background: `linear-gradient(to right, transparent, ${C.border}, transparent)`,
        }} />

        <div style={{ maxWidth: 1060, margin: '0 auto' }}>
          <Reveal>
            <div style={{ textAlign: 'center', marginBottom: 64 }}>
              <p style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: '0.72rem', color: C.orange, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 14 }}>
                How It Works
              </p>
              <h2 style={{ fontFamily: '"Cormorant Garamond", Georgia, serif', fontSize: 'clamp(2rem, 4.5vw, 3.2rem)', fontWeight: 600, letterSpacing: '-0.02em', color: C.white, lineHeight: 1.15 }}>
                Live in your school within a week
              </h2>
              <p style={{ fontFamily: 'Inter, sans-serif', color: C.whiteDim, marginTop: 14, maxWidth: 480, marginLeft: 'auto', marginRight: 'auto', fontSize: '0.9rem', lineHeight: 1.7 }}>
                No complex IT setup. No Bitcoin expertise required. We handle everything so your teachers can focus on teaching.
              </p>
            </div>
          </Reveal>

          {/* Block explorer style steps */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {HOW_IT_WORKS.map((item, i) => (
              <Reveal key={item.step} delay={i * 0.1}>
                <div style={{
                  display: 'flex', alignItems: 'stretch', gap: 0,
                  borderTop: `1px solid ${C.border}`,
                  ...(i === HOW_IT_WORKS.length - 1 ? { borderBottom: `1px solid ${C.border}` } : {}),
                }}>
                  {/* Step number col */}
                  <div style={{
                    width: 88, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    padding: '28px 0',
                    borderRight: `1px solid ${C.border}`,
                  }}>
                    <span style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: '0.78rem', color: C.orange, fontWeight: 600, letterSpacing: '0.06em' }}>
                      #{item.step}
                    </span>
                  </div>

                  {/* Content col */}
                  <div className="step-content" style={{ flex: 1, padding: '28px 36px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                    <h3 style={{ fontFamily: '"Cormorant Garamond", Georgia, serif', fontSize: '1.4rem', fontWeight: 600, color: C.white, marginBottom: 6, letterSpacing: '-0.01em' }}>
                      {item.title}
                    </h3>
                    <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.875rem', color: C.whiteDim, lineHeight: 1.7 }}>
                      {item.description}
                    </p>
                  </div>

                  {/* Status badge col */}
                  <div className="step-confirmed" style={{
                    width: 120, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    borderLeft: `1px solid ${C.border}`, padding: '28px 12px',
                  }}>
                    <div style={{
                      background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.2)',
                      borderRadius: 9999, padding: '4px 12px',
                      fontFamily: '"JetBrains Mono", monospace', fontSize: '0.68rem', color: 'rgb(134,239,172)',
                      letterSpacing: '0.04em',
                    }}>
                      CONFIRMED
                    </div>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── WHY BITCOIN ─────────────────────────────────────────────────── */}
      <section style={{ padding: '100px 24px', position: 'relative', overflow: 'hidden', background: C.bgAlt }}>
        {/* Oversized background number */}
        <div style={{
          position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
          pointerEvents: 'none', overflow: 'hidden',
        }}>
          <span style={{
            fontFamily: '"JetBrains Mono", monospace',
            fontSize: 'clamp(6rem, 18vw, 14rem)',
            fontWeight: 700,
            color: 'rgba(247,147,26,0.04)',
            letterSpacing: '-0.04em',
            whiteSpace: 'nowrap',
            userSelect: 'none',
          }}>
            21,000,000
          </span>
        </div>

        <div style={{ maxWidth: 1060, margin: '0 auto', position: 'relative' }}>
          <Reveal>
            <div style={{ textAlign: 'center', marginBottom: 64 }}>
              <p style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: '0.72rem', color: C.orange, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 14 }}>
                Why Bitcoin
              </p>
              <h2 style={{ fontFamily: '"Cormorant Garamond", Georgia, serif', fontSize: 'clamp(2rem, 4.5vw, 3.2rem)', fontWeight: 600, letterSpacing: '-0.02em', color: C.white, lineHeight: 1.15 }}>
                Not points. Not credits.{' '}
                <em style={{ fontStyle: 'italic', color: C.orange }}>Real money.</em>
              </h2>
              <p style={{ fontFamily: 'Inter, sans-serif', color: C.whiteDim, marginTop: 14, maxWidth: 520, marginLeft: 'auto', marginRight: 'auto', fontSize: '0.9rem', lineHeight: 1.7 }}>
                Every other reward system gives students tokens that expire or reset. Satoshis are Bitcoin. They hold value beyond the school gates. They don't expire. They're theirs.
              </p>
            </div>
          </Reveal>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
            {BITCOIN_PROPS.map((p, i) => (
              <Reveal key={p.value} delay={i * 0.08}>
                <HoverCard style={{
                  background: 'rgba(255,255,255,0.02)',
                  border: `1px solid ${C.border}`,
                  borderRadius: 16, padding: '28px 24px',
                }}>
                  <div style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: '1.8rem', fontWeight: 700, color: C.orange, letterSpacing: '-0.03em', marginBottom: 8 }}>
                    {p.value}
                  </div>
                  <div style={{ fontFamily: 'Inter, sans-serif', fontWeight: 600, fontSize: '0.85rem', color: C.white, marginBottom: 6 }}>
                    {p.label}
                  </div>
                  <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.8rem', color: C.whiteDim, lineHeight: 1.6 }}>
                    {p.note}
                  </div>
                </HoverCard>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── FOR SCHOOLS — bento grid ─────────────────────────────────────── */}
      <section id="for-schools" style={{ padding: '100px 24px' }}>
        <div style={{ maxWidth: 1060, margin: '0 auto' }}>
          <Reveal>
            <div style={{ textAlign: 'center', marginBottom: 64 }}>
              <p style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: '0.72rem', color: C.orange, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 14 }}>
                For Schools
              </p>
              <h2 style={{ fontFamily: '"Cormorant Garamond", Georgia, serif', fontSize: 'clamp(2rem, 4.5vw, 3.2rem)', fontWeight: 600, letterSpacing: '-0.02em', color: C.white, lineHeight: 1.15 }}>
                Built for everyone in the classroom
              </h2>
            </div>
          </Reveal>

          <div className="schools-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            {/* Teachers card */}
            <Reveal delay={0}>
              <HoverCard style={{ background: 'rgba(255,255,255,0.025)', border: `1px solid ${C.border}`, borderRadius: 20, padding: '36px 32px', height: '100%' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(96,165,250,0.1)', border: '1px solid rgba(96,165,250,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Users size={16} color="rgb(147,197,253)" />
                  </div>
                  <span style={{ fontFamily: '"Cormorant Garamond", Georgia, serif', fontSize: '1.25rem', fontWeight: 600, color: C.white }}>For Teachers</span>
                </div>
                <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 28px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {FOR_TEACHERS.map(item => (
                    <li key={item} style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                      <CheckCircle size={14} color="rgb(74,222,128)" style={{ marginTop: 3, flexShrink: 0 }} />
                      <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.84rem', color: C.whiteDim, lineHeight: 1.6 }}>{item}</span>
                    </li>
                  ))}
                </ul>
                <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 20 }}>
                  <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.82rem', color: 'rgba(147,197,253,0.7)', fontStyle: 'italic', lineHeight: 1.6 }}>
                    "I had it set up and running in my Year 9 maths class within 20 minutes. The kids were competing to answer questions correctly."
                  </p>
                  <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.75rem', color: C.whiteDim, marginTop: 8 }}>
                    — Maths Teacher, Secondary School, Birmingham
                  </p>
                </div>
              </HoverCard>
            </Reveal>

            {/* Students card */}
            <Reveal delay={0.08}>
              <HoverCard style={{ background: 'rgba(255,255,255,0.025)', border: `1px solid ${C.border}`, borderRadius: 20, padding: '36px 32px', height: '100%' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: C.orangeDim, border: `1px solid ${C.orangeBorder}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Trophy size={16} color={C.orange} />
                  </div>
                  <span style={{ fontFamily: '"Cormorant Garamond", Georgia, serif', fontSize: '1.25rem', fontWeight: 600, color: C.white }}>For Students</span>
                </div>
                <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 28px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {FOR_STUDENTS.map(item => (
                    <li key={item} style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                      <CheckCircle size={14} color="rgb(74,222,128)" style={{ marginTop: 3, flexShrink: 0 }} />
                      <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.84rem', color: C.whiteDim, lineHeight: 1.6 }}>{item}</span>
                    </li>
                  ))}
                </ul>
                <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 20 }}>
                  <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.82rem', color: 'rgba(251,191,36,0.7)', fontStyle: 'italic', lineHeight: 1.6 }}>
                    "I've got 12,000 sats now. My teacher said I can withdraw them when I'm older. I actually look forward to maths now."
                  </p>
                  <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.75rem', color: C.whiteDim, marginTop: 8 }}>
                    — Year 8 Student, London
                  </p>
                </div>
              </HoverCard>
            </Reveal>

            {/* Feature tiles spanning bottom */}
            {[
              { icon: Sparkles, color: 'rgba(34,197,94,0.1)', iconColor: 'rgb(134,239,172)', border: 'rgba(34,197,94,0.2)', title: 'AI-Powered Quizzes', desc: 'Auto-generated questions for any subject, any year group' },
              { icon: TrendingUp, color: 'rgba(96,165,250,0.1)', iconColor: 'rgb(147,197,253)', border: 'rgba(96,165,250,0.2)', title: 'Progress Analytics', desc: 'Track engagement, identify struggling students early' },
              { icon: Wallet, color: C.orangeDim, iconColor: C.orange, border: C.orangeBorder, title: 'Custodial Wallets', desc: 'No Lightning knowledge needed — we handle the custody' },
              { icon: GraduationCap, color: 'rgba(167,139,250,0.1)', iconColor: 'rgb(196,181,253)', border: 'rgba(167,139,250,0.2)', title: 'Financial Literacy', desc: 'Every student leaves knowing how money and Bitcoin work' },
            ].map((f, i) => (
              <Reveal key={f.title} delay={0.16 + i * 0.06}>
                <HoverCard style={{ background: 'rgba(255,255,255,0.02)', border: `1px solid ${C.border}`, borderRadius: 16, padding: '24px', display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: f.color, border: `1px solid ${f.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <f.icon size={16} color={f.iconColor} />
                  </div>
                  <div>
                    <p style={{ fontFamily: 'Inter, sans-serif', fontWeight: 600, fontSize: '0.88rem', color: C.white, marginBottom: 4 }}>{f.title}</p>
                    <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.8rem', color: C.whiteDim, lineHeight: 1.6 }}>{f.desc}</p>
                  </div>
                </HoverCard>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── TRUST & SAFETY ──────────────────────────────────────────────── */}
      <section id="trust" style={{ padding: '100px 24px', background: C.bgAlt }}>
        <div style={{ maxWidth: 1060, margin: '0 auto' }}>
          <Reveal>
            <div style={{ textAlign: 'center', marginBottom: 64 }}>
              <p style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: '0.72rem', color: C.orange, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 14 }}>
                Trust & Safety
              </p>
              <h2 style={{ fontFamily: '"Cormorant Garamond", Georgia, serif', fontSize: 'clamp(2rem, 4.5vw, 3.2rem)', fontWeight: 600, letterSpacing: '-0.02em', color: C.white, lineHeight: 1.15 }}>
                Built for school procurement
              </h2>
              <p style={{ fontFamily: 'Inter, sans-serif', color: C.whiteDim, marginTop: 14, maxWidth: 480, marginLeft: 'auto', marginRight: 'auto', fontSize: '0.9rem', lineHeight: 1.7 }}>
                We know what finance officers, safeguarding leads, and IT coordinators need before signing off on a new platform.
              </p>
            </div>
          </Reveal>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 16, marginBottom: 32 }}>
            {TRUST_ITEMS.map((item, i) => (
              <Reveal key={item.title} delay={i * 0.06}>
                <HoverCard style={{ background: 'rgba(255,255,255,0.02)', border: `1px solid ${C.border}`, borderRadius: 16, padding: '24px 24px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                    <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(255,255,255,0.05)', border: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <item.icon size={14} color={C.whiteDim} />
                    </div>
                    <span style={{ fontFamily: 'Inter, sans-serif', fontWeight: 600, fontSize: '0.88rem', color: C.white }}>{item.title}</span>
                  </div>
                  <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.82rem', color: C.whiteDim, lineHeight: 1.7 }}>{item.description}</p>
                </HoverCard>
              </Reveal>
            ))}
          </div>

          <Reveal delay={0.2}>
            <div style={{
              background: 'rgba(247,147,26,0.05)', border: `1px solid ${C.orangeBorder}`,
              borderRadius: 16, padding: '28px 32px',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 24,
              flexWrap: 'wrap',
            }}>
              <div>
                <p style={{ fontFamily: 'Inter, sans-serif', fontWeight: 600, fontSize: '0.95rem', color: C.white, marginBottom: 4 }}>
                  Need a Data Processing Agreement?
                </p>
                <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.84rem', color: C.whiteDim }}>
                  We provide a full DPA, ICO registration details, and a safeguarding policy addendum for every school.
                </p>
              </div>
              <a
                href="mailto:hello@satsrewards.com?subject=DPA Request"
                style={{
                  fontFamily: 'Inter, sans-serif', fontWeight: 600, fontSize: '0.84rem',
                  background: C.white, color: C.bg, borderRadius: 8,
                  padding: '10px 22px', textDecoration: 'none', flexShrink: 0,
                }}
              >
                Request documents
              </a>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── FAQ ─────────────────────────────────────────────────────────── */}
      <section id="faq" style={{ padding: '100px 24px' }}>
        <div style={{ maxWidth: 680, margin: '0 auto' }}>
          <Reveal>
            <div style={{ textAlign: 'center', marginBottom: 56 }}>
              <p style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: '0.72rem', color: C.orange, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 14 }}>
                FAQ
              </p>
              <h2 style={{ fontFamily: '"Cormorant Garamond", Georgia, serif', fontSize: 'clamp(2rem, 4.5vw, 3.2rem)', fontWeight: 600, letterSpacing: '-0.02em', color: C.white, lineHeight: 1.15 }}>
                Questions schools ask us
              </h2>
            </div>
          </Reveal>
          <div>
            {FAQS.map(faq => <FAQItem key={faq.q} q={faq.q} a={faq.a} />)}
          </div>
        </div>
      </section>

      {/* ── CTA ─────────────────────────────────────────────────────────── */}
      <section style={{ padding: '100px 24px', background: C.bgAlt, position: 'relative', overflow: 'hidden' }}>
        <div style={{
          position: 'absolute', top: '-30%', left: '50%', transform: 'translateX(-50%)',
          width: 600, height: 600, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(247,147,26,0.07) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />
        <div style={{ maxWidth: 640, margin: '0 auto', textAlign: 'center', position: 'relative' }}>
          <Reveal>
            <h2 style={{ fontFamily: '"Cormorant Garamond", Georgia, serif', fontSize: 'clamp(2rem, 5vw, 3.6rem)', fontWeight: 600, letterSpacing: '-0.02em', color: C.white, lineHeight: 1.1, marginBottom: 20 }}>
              Ready to bring Bitcoin rewards to your school?
            </h2>
            <p style={{ fontFamily: 'Inter, sans-serif', color: C.whiteDim, marginBottom: 40, lineHeight: 1.7, fontSize: '0.95rem' }}>
              Book a 30-minute demo call. We'll show you the platform, answer every question from your leadership team, and give you a personalised proposal.
            </p>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16, flexWrap: 'wrap' }}>
              <a
                href="mailto:hello@satsrewards.com?subject=Book a Demo"
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 8,
                  background: C.orange, color: '#000',
                  fontFamily: 'Inter, sans-serif', fontWeight: 700, fontSize: '0.9rem',
                  padding: '14px 32px', borderRadius: 10, textDecoration: 'none',
                  boxShadow: '0 0 40px rgba(247,147,26,0.2)',
                }}
              >
                Book a Demo <ArrowRight size={15} />
              </a>
              <Link
                to="/login"
                style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.875rem', color: C.whiteDim, textDecoration: 'none', fontWeight: 500 }}
              >
                Sign in to your school account
              </Link>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── FOOTER ─────────────────────────────────────────────────────── */}
      <footer style={{ background: '#080A12', borderTop: `1px solid ${C.border}`, padding: '60px 24px 40px' }}>
        <div style={{ maxWidth: 1060, margin: '0 auto' }}>
          <div className="footer-grid" style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 40, paddingBottom: 40, borderBottom: `1px solid ${C.border}` }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                <div style={{ width: 28, height: 28, borderRadius: '50%', background: C.orangeDim, border: `1px solid ${C.orangeBorder}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Bitcoin size={13} color={C.orange} />
                </div>
                <span style={{ fontFamily: 'Inter, sans-serif', fontWeight: 700, fontSize: '0.95rem', color: C.white }}>SatsRewards</span>
              </div>
              <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.78rem', color: C.whiteDim, lineHeight: 1.7 }}>
                A product of SatsStrategy Education Ltd.<br />
                Registered in England and Wales<br />
                Company No. 16348591
              </p>
              <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.75rem', color: 'rgba(245,242,236,0.25)', marginTop: 8 }}>
                71-75 Shelton Street, Covent Garden, London WC2H 9JQ
              </p>
              <p style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: '0.7rem', color: 'rgba(247,147,26,0.45)', marginTop: 16, letterSpacing: '0.04em' }}>
                Built on Bitcoin. Powered by Lightning. Made in the UK.
              </p>
            </div>

            <div>
              <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.72rem', fontWeight: 600, color: 'rgba(245,242,236,0.35)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 16 }}>
                Product
              </p>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
                {[
                  { label: 'How It Works', href: '#how-it-works' },
                  { label: 'For Schools', href: '#for-schools' },
                  { label: 'Trust & Safety', href: '#trust' },
                ].map(l => (
                  <li key={l.label}>
                    <a href={l.href} style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.82rem', color: C.whiteDim, textDecoration: 'none' }}>
                      {l.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.72rem', fontWeight: 600, color: 'rgba(245,242,236,0.35)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 16 }}>
                Legal
              </p>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
                {[
                  { label: 'Contact Us', href: 'mailto:hello@satsrewards.com' },
                  { label: 'Privacy Policy', to: '/privacy' },
                  { label: 'Terms of Service', to: '/terms' },
                  { label: 'GDPR', to: '/gdpr' },
                ].map(l => (
                  <li key={l.label}>
                    {'to' in l
                      ? <Link to={l.to!} style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.82rem', color: C.whiteDim, textDecoration: 'none' }}>{l.label}</Link>
                      : <a href={l.href} style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.82rem', color: C.whiteDim, textDecoration: 'none' }}>{l.label}</a>
                    }
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.75rem', color: 'rgba(245,242,236,0.2)', marginTop: 28 }}>
            &copy; {new Date().getFullYear()} SatsStrategy Education Ltd. All rights reserved.
          </p>
        </div>
      </footer>

      {/* Responsive overrides */}
      <style>{`
        @media (max-width: 768px) {
          .hidden-mobile { display: none !important; }
          .show-mobile { display: flex !important; }
        }
        @media (min-width: 769px) {
          .show-mobile { display: none !important; }
          .hidden-mobile { display: flex !important; }
        }
        @media (max-width: 600px) {
          .stats-grid { grid-template-columns: repeat(2, 1fr) !important; }
          .schools-grid { grid-template-columns: 1fr !important; }
          .footer-grid { grid-template-columns: 1fr !important; gap: 28px !important; }
          .step-confirmed { display: none !important; }
          .step-content { padding: 20px 16px !important; }
        }
      `}</style>
    </div>
  );
}

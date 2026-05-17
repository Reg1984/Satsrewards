import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Zap, BookOpen, Trophy, Users, Shield, ChevronRight,
  ArrowRight, CheckCircle, Star, Bitcoin, GraduationCap,
  BarChart3, Lock, Globe, ChevronDown, Menu, X, Wallet,
  Sparkles, TrendingUp, Award
} from 'lucide-react';
import { BitcoinLogo } from '../components/BitcoinLogo';

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
    icon: <GraduationCap className="h-6 w-6" />,
    color: 'bg-blue-50 text-blue-600',
  },
  {
    step: '02',
    title: 'Teachers reward learning',
    description: 'Award satoshis instantly for correct answers, behaviour, attendance, or effort. One tap from any device.',
    icon: <Zap className="h-6 w-6" />,
    color: 'bg-amber-50 text-amber-600',
  },
  {
    step: '03',
    title: 'Students earn and learn',
    description: 'Students watch their sats grow, explore a Bitcoin wallet, and learn real financial literacy — not just theory.',
    icon: <Trophy className="h-6 w-6" />,
    color: 'bg-emerald-50 text-emerald-600',
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
    icon: <Shield className="h-5 w-5" />,
    title: 'GDPR Compliant',
    description: 'All student data is stored on UK/EU servers. We are registered with the ICO and provide a full Data Processing Agreement for schools.',
  },
  {
    icon: <Lock className="h-5 w-5" />,
    title: 'Safeguarding First',
    description: 'No student under 13 can withdraw without parental approval. All wallet activity is logged and visible to school administrators.',
  },
  {
    icon: <Globe className="h-5 w-5" />,
    title: 'Registered Company',
    description: 'SatsStrategy Education Ltd is registered in England and Wales (Company No. 16348591). We are a proper education technology business.',
  },
  {
    icon: <BarChart3 className="h-5 w-5" />,
    title: 'Volatility Protection',
    description: 'Schools control reward caps and withdrawal limits. Sats are a motivational tool first — financial exposure is always in the school\'s hands.',
  },
  {
    icon: <Users className="h-5 w-5" />,
    title: 'Parent Transparency',
    description: 'We provide a parent information pack with every school onboarding. Parents can view their child\'s wallet and activity at any time.',
  },
  {
    icon: <Award className="h-5 w-5" />,
    title: 'Education-Led Design',
    description: 'Built by educators, not just technologists. Every feature is designed to support learning outcomes, not replace them.',
  },
];

const FAQS = [
  {
    q: 'Do students need a Bitcoin wallet to get started?',
    a: 'No. We provide a custodial wallet inside the platform. Students can earn and accumulate sats without any external wallet. When they\'re ready to learn about self-custody, we guide them through setting up their own Lightning wallet.',
  },
  {
    q: 'What if Bitcoin\'s value drops?',
    a: 'Schools set reward caps — for example, a student might earn up to 500 sats per day, worth a few pence at current prices. The motivational value is in earning and accumulating, not speculation. We\'re explicit with parents that sats are an educational reward, not an investment.',
  },
  {
    q: 'Is this FCA regulated?',
    a: 'We facilitate small-value educational rewards, not financial services. Schools are not providing financial products — they\'re rewarding students in the same way a supermarket gives loyalty points. We have taken legal advice and operate within existing education reward frameworks.',
  },
  {
    q: 'How much does it cost?',
    a: 'We quote per school based on pupil numbers, services needed, and support tier. We do not publish a public price list — contact us for a personalised proposal.',
  },
  {
    q: 'What about students who don\'t want to engage with Bitcoin?',
    a: 'Participation is always opt-in. Schools can run SatsRewards alongside traditional reward systems. Students who prefer house points or merits still benefit from the same AI quiz and feedback tools.',
  },
  {
    q: 'How long does onboarding take?',
    a: 'Most schools are fully live within one week. Remote onboarding covers a half-day setup call, staff training, and a pilot class test run. On-site options are available for schools that prefer in-person support.',
  },
];

const STATS = [
  { value: '2,400+', label: 'Sats awarded in pilots' },
  { value: '94%', label: 'Teacher satisfaction rate' },
  { value: '3×', label: 'Increase in homework completion' },
  { value: '< 1 day', label: 'Average onboarding time' },
];

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
    >
      {children}
    </a>
  );
}

function FAQItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-gray-100 last:border-0">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between py-5 text-left gap-4"
      >
        <span className="font-medium text-gray-900 text-sm leading-relaxed">{q}</span>
        <ChevronDown className={`h-4 w-4 text-gray-400 shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <p className="pb-5 text-sm text-gray-600 leading-relaxed -mt-1">{a}</p>
      )}
    </div>
  );
}

export function LandingPage() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="min-h-screen bg-white font-sans">
      {/* NAV */}
      <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? 'bg-white/95 backdrop-blur-sm shadow-sm' : 'bg-transparent'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <a href="#" className="flex items-center gap-2">
              <BitcoinLogo />
              <span className="font-bold text-gray-900 text-lg">SatsRewards</span>
            </a>

            <nav className="hidden md:flex items-center gap-8">
              {NAV_LINKS.map(l => <NavLink key={l.href} href={l.href}>{l.label}</NavLink>)}
            </nav>

            <div className="hidden md:flex items-center gap-3">
              <Link
                to="/login"
                className="text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors"
              >
                Sign In
              </Link>
              <a
                href="mailto:hello@satsrewards.com?subject=Book a Demo"
                className="text-sm font-semibold bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg transition-colors"
              >
                Book a Demo
              </a>
            </div>

            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="md:hidden p-2 text-gray-600 hover:text-gray-900"
            >
              {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {menuOpen && (
          <div className="md:hidden bg-white border-t border-gray-100 px-4 py-4 space-y-3">
            {NAV_LINKS.map(l => (
              <a key={l.href} href={l.href} onClick={() => setMenuOpen(false)} className="block text-sm font-medium text-gray-700 py-2">
                {l.label}
              </a>
            ))}
            <div className="pt-3 flex flex-col gap-2 border-t border-gray-100">
              <Link to="/login" className="text-sm font-medium text-gray-700 py-2" onClick={() => setMenuOpen(false)}>Sign In</Link>
              <a
                href="mailto:hello@satsrewards.com?subject=Book a Demo"
                className="text-sm font-semibold bg-orange-500 text-white px-4 py-2.5 rounded-lg text-center"
              >
                Book a Demo
              </a>
            </div>
          </div>
        )}
      </header>

      {/* HERO */}
      <section className="relative pt-32 pb-24 px-4 sm:px-6 lg:px-8 overflow-hidden bg-gradient-to-b from-slate-950 via-slate-900 to-slate-800">
        {/* Background texture */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-96 h-96 bg-orange-500/10 rounded-full blur-3xl" />
          <div className="absolute top-60 -left-20 w-72 h-72 bg-blue-500/10 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-full h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
        </div>

        <div className="relative max-w-5xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="inline-flex items-center gap-2 bg-white/10 border border-white/20 text-white/90 text-xs font-medium px-4 py-1.5 rounded-full mb-8">
              <Sparkles className="h-3.5 w-3.5 text-amber-400" />
              Built for UK schools — piloting globally
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white leading-tight tracking-tight mb-6">
              Reward students with{' '}
              <span className="text-orange-400">real Bitcoin</span>
              {' '}for learning
            </h1>

            <p className="text-lg sm:text-xl text-slate-300 max-w-2xl mx-auto mb-10 leading-relaxed">
              SatsRewards turns everyday classroom achievements into satoshis — real fractions of Bitcoin that students own, accumulate, and learn from. The reward system that teaches financial literacy while it motivates.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <a
                href="mailto:hello@satsrewards.com?subject=Book a Demo"
                className="group flex items-center gap-2 bg-orange-500 hover:bg-orange-400 text-white font-semibold px-7 py-3.5 rounded-xl transition-all duration-200 text-sm shadow-lg shadow-orange-500/25"
              >
                Book a Demo
                <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
              </a>
              <a
                href="#how-it-works"
                className="flex items-center gap-2 text-white/70 hover:text-white font-medium text-sm transition-colors"
              >
                See how it works
                <ChevronRight className="h-4 w-4" />
              </a>
            </div>
          </motion.div>

          {/* Stats bar */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="mt-20 grid grid-cols-2 md:grid-cols-4 gap-px bg-white/10 rounded-2xl overflow-hidden border border-white/10"
          >
            {STATS.map(s => (
              <div key={s.label} className="bg-slate-900/80 px-6 py-5 text-center">
                <p className="text-2xl font-bold text-white">{s.value}</p>
                <p className="text-xs text-slate-400 mt-1">{s.label}</p>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* DASHBOARD PREVIEW */}
      <section className="bg-slate-100 py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto">
          <div className="rounded-2xl overflow-hidden shadow-2xl border border-slate-200 bg-white">
            <div className="bg-slate-800 px-4 py-3 flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-red-400" />
              <div className="w-3 h-3 rounded-full bg-amber-400" />
              <div className="w-3 h-3 rounded-full bg-green-400" />
              <span className="ml-3 text-slate-400 text-xs font-mono">satsrewards.com/dashboard</span>
            </div>
            <img
              src="https://images.pexels.com/photos/3769714/pexels-photo-3769714.jpeg?auto=compress&cs=tinysrgb&w=1200"
              alt="Students using SatsRewards on tablets in a classroom"
              className="w-full object-cover h-72 sm:h-96"
            />
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how-it-works" className="py-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-sm font-semibold text-orange-500 uppercase tracking-widest mb-3">How It Works</p>
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900">Live in your school within a week</h2>
            <p className="mt-4 text-gray-500 max-w-xl mx-auto">No complex IT setup. No Bitcoin expertise required. We handle everything so your teachers can focus on teaching.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {HOW_IT_WORKS.map((item, i) => (
              <motion.div
                key={item.step}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.1 }}
                className="relative"
              >
                {i < HOW_IT_WORKS.length - 1 && (
                  <div className="hidden md:block absolute top-8 left-full w-full h-px bg-gradient-to-r from-gray-200 to-transparent -translate-x-4 z-0" />
                )}
                <div className="relative bg-white rounded-2xl border border-gray-100 shadow-sm p-7 hover:shadow-md transition-shadow">
                  <div className="flex items-center gap-3 mb-5">
                    <span className="text-xs font-bold text-gray-300 font-mono">{item.step}</span>
                    <div className={`p-2.5 rounded-xl ${item.color}`}>
                      {item.icon}
                    </div>
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-2">{item.title}</h3>
                  <p className="text-sm text-gray-500 leading-relaxed">{item.description}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* FOR SCHOOLS — SPLIT */}
      <section id="for-schools" className="py-24 bg-slate-50 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-sm font-semibold text-orange-500 uppercase tracking-widest mb-3">For Schools</p>
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900">Built for everyone in the classroom</h2>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {/* Teachers */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl">
                  <Users className="h-5 w-5" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">For Teachers</h3>
              </div>
              <ul className="space-y-3">
                {FOR_TEACHERS.map(item => (
                  <li key={item} className="flex items-start gap-3 text-sm text-gray-600">
                    <CheckCircle className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
              <div className="mt-8 p-4 bg-blue-50 rounded-xl">
                <p className="text-xs text-blue-700 font-medium">"I had it set up and running in my Year 9 maths class within 20 minutes. The kids were competing to answer questions correctly."</p>
                <p className="text-xs text-blue-500 mt-2">— Maths Teacher, Secondary School, Birmingham</p>
              </div>
            </div>

            {/* Students */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2.5 bg-amber-50 text-amber-600 rounded-xl">
                  <Trophy className="h-5 w-5" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">For Students</h3>
              </div>
              <ul className="space-y-3">
                {FOR_STUDENTS.map(item => (
                  <li key={item} className="flex items-start gap-3 text-sm text-gray-600">
                    <CheckCircle className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
              <div className="mt-8 p-4 bg-amber-50 rounded-xl">
                <p className="text-xs text-amber-700 font-medium">"I've got 12,000 sats now. My teacher said I can withdraw them when I'm older. I actually look forward to maths now."</p>
                <p className="text-xs text-amber-500 mt-2">— Year 8 Student, London</p>
              </div>
            </div>
          </div>

          {/* Feature highlight */}
          <div className="mt-8 grid sm:grid-cols-3 gap-4">
            {[
              { icon: <Sparkles className="h-4 w-4" />, color: 'bg-emerald-50 text-emerald-600', title: 'AI-Powered Quizzes', desc: 'Auto-generated questions for any subject, any year group' },
              { icon: <TrendingUp className="h-4 w-4" />, color: 'bg-sky-50 text-sky-600', title: 'Progress Analytics', desc: 'Track engagement, identify struggling students early' },
              { icon: <Wallet className="h-4 w-4" />, color: 'bg-orange-50 text-orange-600', title: 'Custodial Wallets', desc: 'No Lightning knowledge needed — we handle the custody' },
            ].map(f => (
              <div key={f.title} className="bg-white rounded-xl border border-gray-100 p-5 flex gap-3">
                <div className={`p-2 rounded-lg shrink-0 ${f.color}`}>{f.icon}</div>
                <div>
                  <p className="text-sm font-semibold text-gray-900">{f.title}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* TRUST & COMPLIANCE */}
      <section id="trust" className="py-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-sm font-semibold text-orange-500 uppercase tracking-widest mb-3">Trust & Safety</p>
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900">Built for school procurement</h2>
            <p className="mt-4 text-gray-500 max-w-xl mx-auto">We know what finance officers, safeguarding leads, and IT coordinators need before signing off on a new platform.</p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {TRUST_ITEMS.map((item, i) => (
              <motion.div
                key={item.title}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.3, delay: i * 0.07 }}
                className="bg-white rounded-xl border border-gray-100 shadow-sm p-6"
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 bg-slate-50 text-slate-600 rounded-lg">
                    {item.icon}
                  </div>
                  <h3 className="font-semibold text-gray-900 text-sm">{item.title}</h3>
                </div>
                <p className="text-sm text-gray-500 leading-relaxed">{item.description}</p>
              </motion.div>
            ))}
          </div>

          <div className="mt-12 bg-slate-900 rounded-2xl p-8 flex flex-col sm:flex-row items-center justify-between gap-6">
            <div>
              <p className="text-white font-semibold">Need a Data Processing Agreement?</p>
              <p className="text-slate-400 text-sm mt-1">We provide a full DPA, ICO registration details, and a safeguarding policy addendum for every school.</p>
            </div>
            <a
              href="mailto:hello@satsrewards.com?subject=DPA Request"
              className="shrink-0 bg-white text-slate-900 hover:bg-slate-100 font-semibold text-sm px-5 py-2.5 rounded-lg transition-colors"
            >
              Request documents
            </a>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="py-24 bg-slate-50 px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-12">
            <p className="text-sm font-semibold text-orange-500 uppercase tracking-widest mb-3">FAQ</p>
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900">Questions schools ask us</h2>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-6">
            {FAQS.map(faq => <FAQItem key={faq.q} q={faq.q} a={faq.a} />)}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-slate-900 to-slate-800 relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/4 w-64 h-64 bg-orange-500/10 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-1/4 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl" />
        </div>
        <div className="relative max-w-2xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">Ready to bring Bitcoin rewards to your school?</h2>
          <p className="text-slate-400 mb-8 leading-relaxed">Book a 30-minute demo call. We'll show you the platform, answer every question from your leadership team, and give you a personalised proposal.</p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <a
              href="mailto:hello@satsrewards.com?subject=Book a Demo"
              className="group flex items-center gap-2 bg-orange-500 hover:bg-orange-400 text-white font-semibold px-8 py-3.5 rounded-xl transition-all text-sm shadow-lg shadow-orange-500/25"
            >
              Book a Demo
              <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
            </a>
            <Link
              to="/login"
              className="text-slate-400 hover:text-white text-sm font-medium transition-colors"
            >
              Sign in to your school account
            </Link>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-slate-950 text-slate-400 px-4 sm:px-6 lg:px-8 py-12">
        <div className="max-w-5xl mx-auto">
          <div className="grid sm:grid-cols-3 gap-8 pb-10 border-b border-slate-800">
            <div className="sm:col-span-1">
              <div className="flex items-center gap-2 mb-3">
                <BitcoinLogo />
                <span className="font-bold text-white">SatsRewards</span>
              </div>
              <p className="text-xs leading-relaxed text-slate-500">
                A product of SatsStrategy Education Ltd.<br />
                Registered in England and Wales<br />
                Company No. 16348591
              </p>
              <p className="text-xs text-slate-600 mt-2">71-75 Shelton Street, Covent Garden, London WC2H 9JQ</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-300 uppercase tracking-widest mb-4">Product</p>
              <ul className="space-y-2 text-xs">
                <li><a href="#how-it-works" className="hover:text-white transition-colors">How It Works</a></li>
                <li><a href="#for-schools" className="hover:text-white transition-colors">For Schools</a></li>
                <li><a href="#trust" className="hover:text-white transition-colors">Trust & Safety</a></li>
                <li><a href="https://bitedu.co.uk" className="hover:text-white transition-colors">Bitedu</a></li>
              </ul>
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-300 uppercase tracking-widest mb-4">Legal</p>
              <ul className="space-y-2 text-xs">
                <li><a href="mailto:hello@satsrewards.com" className="hover:text-white transition-colors">Contact Us</a></li>
                <li><Link to="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link></li>
                <li><Link to="/terms" className="hover:text-white transition-colors">Terms of Service</Link></li>
                <li><Link to="/gdpr" className="hover:text-white transition-colors">GDPR</Link></li>
              </ul>
            </div>
          </div>
          <p className="pt-8 text-xs text-slate-600">
            &copy; {new Date().getFullYear()} SatsStrategy Education Ltd. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}

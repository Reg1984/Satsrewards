import React, { useState } from 'react';
import { DollarSign, Cpu, Wrench, GraduationCap, Plane, Headphones as HeadphonesIcon, ChevronDown, ChevronUp, Info, RefreshCw, Lock } from 'lucide-react';

interface PriceItem {
  label: string;
  price: string;
  notes: string;
  updated: string;
}

interface Section {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  items: PriceItem[];
}

const SECTIONS: Section[] = [
  {
    id: 'ai',
    title: 'AI API Costs',
    description: 'Anthropic Claude usage — per school per month, scales with student activity',
    icon: <Cpu className="h-5 w-5" />,
    color: 'blue',
    items: [
      { label: 'Claude Opus 4 — per million input tokens', price: '$15.00', notes: 'Used for admin agent, outreach drafting, complex reasoning', updated: 'May 2026' },
      { label: 'Claude Opus 4 — per million output tokens', price: '$75.00', notes: 'Primary cost driver for outreach emails and AI responses', updated: 'May 2026' },
      { label: 'Claude Sonnet 4 — per million input tokens', price: '$3.00', notes: 'Used for quiz generation, feedback, lighter tasks', updated: 'May 2026' },
      { label: 'Claude Sonnet 4 — per million output tokens', price: '$15.00', notes: 'Good balance of cost vs capability for student-facing AI', updated: 'May 2026' },
      { label: 'Estimated AI cost — small school (100–300 pupils)', price: '$8–$20/mo', notes: 'Based on average quiz usage + teacher AI interactions', updated: 'May 2026' },
      { label: 'Estimated AI cost — medium school (300–800 pupils)', price: '$20–$55/mo', notes: 'Scales roughly linearly with active student count', updated: 'May 2026' },
      { label: 'Estimated AI cost — large school / trust (800–3000 pupils)', price: '$55–$200/mo', notes: 'Trust-wide deployments; cache discounts apply at scale', updated: 'May 2026' },
      { label: 'Prompt caching discount (Anthropic)', price: '90% off cached tokens', notes: 'System prompts cached — significant savings at volume', updated: 'May 2026' },
    ],
  },
  {
    id: 'platform',
    title: 'Platform & Infrastructure',
    description: 'Supabase hosting, Lightning node, storage, and email delivery',
    icon: <Wrench className="h-5 w-5" />,
    color: 'emerald',
    items: [
      { label: 'Supabase Pro plan', price: '$25/mo', notes: 'Base database, auth, edge functions — shared across all schools', updated: 'May 2026' },
      { label: 'Supabase per-school compute add-on (if isolated)', price: '$10–$25/mo', notes: 'Only needed if school requires data isolation', updated: 'May 2026' },
      { label: 'Email delivery — Resend (per 1,000 emails)', price: '$1.00', notes: 'Outreach emails + transactional; 100/day free on base plan', updated: 'May 2026' },
      { label: 'Tavily search API — per 1,000 searches', price: '$4.00', notes: 'Used by AI agent for outreach prospect discovery', updated: 'May 2026' },
      { label: 'Lightning node hosting (Voltage)', price: '$12–$50/mo', notes: 'Depends on channel liquidity required per school', updated: 'May 2026' },
      { label: 'Annual maintenance estimate per school', price: '£500–£1,500/yr', notes: 'Includes bug fixes, updates, minor feature work, monitoring', updated: 'May 2026' },
    ],
  },
  {
    id: 'onboarding',
    title: 'Onboarding & Setup',
    description: 'One-time costs for new school sign-up and go-live',
    icon: <GraduationCap className="h-5 w-5" />,
    color: 'amber',
    items: [
      { label: 'Remote onboarding — standard (half day)', price: '£350–£500', notes: 'Video call setup, teacher accounts, wallet config, test run', updated: 'May 2026' },
      { label: 'Remote onboarding — full (full day)', price: '£700–£1,000', notes: 'Full school migration, data import, parent comms template', updated: 'May 2026' },
      { label: 'On-site onboarding — UK (per day)', price: '£800–£1,200', notes: 'Includes travel within UK; day rate + expenses', updated: 'May 2026' },
      { label: 'On-site onboarding — international (per day)', price: '$1,500–$2,500', notes: 'Excludes flights and accommodation (quoted separately)', updated: 'May 2026' },
      { label: 'Data migration from existing platform', price: '£200–£600', notes: 'ClassDojo, Mathletics, CSV imports — depends on data quality', updated: 'May 2026' },
      { label: 'Custom branding / white-label setup', price: '£300–£800', notes: 'School logo, colours, custom email domain', updated: 'May 2026' },
    ],
  },
  {
    id: 'workshops',
    title: 'Workshops & Training',
    description: 'Bitcoin literacy and financial education sessions for staff and students',
    icon: <GraduationCap className="h-5 w-5" />,
    color: 'orange',
    items: [
      { label: 'Teacher training workshop — remote (2 hrs)', price: '£250–£400', notes: 'Platform walkthrough, reward strategy, Q&A', updated: 'May 2026' },
      { label: 'Teacher training workshop — on-site (half day)', price: '£500–£800', notes: 'Hands-on session, up to 20 teachers', updated: 'May 2026' },
      { label: 'Student Bitcoin literacy session — remote (1 hr)', price: '£150–£250', notes: 'What is Bitcoin, why sats, how to use a wallet', updated: 'May 2026' },
      { label: 'Student Bitcoin literacy session — on-site (half day)', price: '£400–£700', notes: 'Interactive workshop, up to 60 students', updated: 'May 2026' },
      { label: 'Parent information evening — remote', price: '£150–£300', notes: 'Addresses concerns, explains safeguarding and custody', updated: 'May 2026' },
      { label: 'Annual CPD / refresh session — remote', price: '£200–£350', notes: 'New features, strategy review, staff refresher', updated: 'May 2026' },
      { label: 'Workshop bundle — full school launch (3 sessions)', price: '£900–£1,500', notes: 'Teachers + students + parents; remote delivery', updated: 'May 2026' },
    ],
  },
  {
    id: 'travel',
    title: 'Travel & Expenses',
    description: 'Reference rates for on-site visits — quote per trip',
    icon: <Plane className="h-5 w-5" />,
    color: 'sky',
    items: [
      { label: 'UK day rate (on-site)', price: '£600–£900/day', notes: 'Plus mileage (£0.45/mile) or rail fare + accommodation if needed', updated: 'May 2026' },
      { label: 'UK mileage rate (HMRC approved)', price: '£0.45/mile', notes: 'First 10,000 miles; standard HMRC advisory rate', updated: 'May 2026' },
      { label: 'UK hotel (London)', price: '£120–£200/night', notes: 'Budget: £80–£120. Add to on-site quote if staying overnight', updated: 'May 2026' },
      { label: 'UK hotel (outside London)', price: '£70–£120/night', notes: 'Varies by city; always quote actuals', updated: 'May 2026' },
      { label: 'Europe — day rate on-site', price: '€900–€1,400/day', notes: 'Plus flights (€150–€400 return) and hotel (€100–€200/night)', updated: 'May 2026' },
      { label: 'USA — day rate on-site', price: '$1,200–$1,800/day', notes: 'Plus flights ($600–$1,200 return) and hotel ($150–$250/night)', updated: 'May 2026' },
      { label: 'Middle East — day rate on-site', price: '$1,500–$2,200/day', notes: 'Plus flights ($500–$900 return) and hotel ($120–$200/night)', updated: 'May 2026' },
      { label: 'Asia / Pacific — day rate on-site', price: '$1,500–$2,500/day', notes: 'Plus flights ($700–$1,400 return) and hotel ($120–$250/night)', updated: 'May 2026' },
      { label: 'El Salvador — day rate on-site', price: '$1,200–$1,800/day', notes: 'Plus flights ($600–$1,000 return) and hotel ($80–$150/night)', updated: 'May 2026' },
    ],
  },
  {
    id: 'support',
    title: 'Ongoing Support Tiers',
    description: 'Annual support contracts — included in or added to platform fee',
    icon: <HeadphonesIcon className="h-5 w-5" />,
    color: 'rose',
    items: [
      { label: 'Email support only (included in base)', price: 'Included', notes: '48hr response SLA; ticketing system', updated: 'May 2026' },
      { label: 'Standard support (business hours, Slack)', price: '£500–£1,000/yr', notes: '8hr response SLA, dedicated Slack channel, quarterly review', updated: 'May 2026' },
      { label: 'Priority support (dedicated account manager)', price: '£2,000–£4,000/yr', notes: '2hr response SLA, monthly check-ins, feature prioritisation', updated: 'May 2026' },
      { label: 'Enterprise (trusts / international groups)', price: 'POA', notes: 'Custom SLA, dedicated infrastructure, on-site reviews included', updated: 'May 2026' },
    ],
  },
];

const colorMap: Record<string, { bg: string; border: string; icon: string; badge: string }> = {
  blue:    { bg: 'bg-blue-50',    border: 'border-blue-100',   icon: 'text-blue-600',    badge: 'bg-blue-100 text-blue-700' },
  emerald: { bg: 'bg-emerald-50', border: 'border-emerald-100',icon: 'text-emerald-600', badge: 'bg-emerald-100 text-emerald-700' },
  amber:   { bg: 'bg-amber-50',   border: 'border-amber-100',  icon: 'text-amber-600',   badge: 'bg-amber-100 text-amber-700' },
  orange:  { bg: 'bg-orange-50',  border: 'border-orange-100', icon: 'text-orange-600',  badge: 'bg-orange-100 text-orange-700' },
  sky:     { bg: 'bg-sky-50',     border: 'border-sky-100',    icon: 'text-sky-600',     badge: 'bg-sky-100 text-sky-700' },
  rose:    { bg: 'bg-rose-50',    border: 'border-rose-100',   icon: 'text-rose-600',    badge: 'bg-rose-100 text-rose-700' },
};

export function PricingReference() {
  const [open, setOpen] = useState<Record<string, boolean>>({ ai: true });

  const toggle = (id: string) => setOpen(prev => ({ ...prev, [id]: !prev[id] }));

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      {/* Header */}
      <div className="flex items-start gap-3 mb-6">
        <div className="bg-gray-900 text-white p-2.5 rounded-lg mt-0.5">
          <Lock className="h-4 w-4" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Internal Pricing Reference</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            Private cost guide for quoting schools. Not published anywhere. Use these figures when writing follow-up emails — always quote a range and add a margin.
          </p>
        </div>
        <div className="ml-auto flex items-center gap-1.5 text-xs text-gray-400 bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5 whitespace-nowrap">
          <RefreshCw className="h-3 w-3" />
          Rates as of May 2026
        </div>
      </div>

      {/* Notice */}
      <div className="flex items-start gap-2.5 bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
        <Info className="h-4 w-4 mt-0.5 shrink-0 text-amber-600" />
        <p>
          These are <strong>your cost inputs</strong> — not what you charge. Add your margin on top. Typical markup: <strong>2–3x on AI/infrastructure</strong>, <strong>1.5–2x on day rates</strong>. Always quote in writing via follow-up email only, never on the website.
        </p>
      </div>

      {/* Sections */}
      {SECTIONS.map(section => {
        const c = colorMap[section.color];
        const isOpen = !!open[section.id];
        return (
          <div key={section.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
            <button
              onClick={() => toggle(section.id)}
              className="w-full flex items-center gap-3 p-5 text-left hover:bg-gray-50 transition-colors"
            >
              <div className={`p-2 rounded-lg ${c.bg} ${c.icon}`}>
                {section.icon}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-900 text-sm">{section.title}</p>
                <p className="text-xs text-gray-500 mt-0.5 truncate">{section.description}</p>
              </div>
              <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${c.badge}`}>
                {section.items.length} items
              </span>
              <div className="text-gray-400 ml-1">
                {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </div>
            </button>

            {isOpen && (
              <div className="border-t border-gray-100">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 text-left">
                      <th className="px-5 py-2.5 text-xs font-medium text-gray-500 w-2/5">Item</th>
                      <th className="px-4 py-2.5 text-xs font-medium text-gray-500 w-32">Rate / Price</th>
                      <th className="px-4 py-2.5 text-xs font-medium text-gray-500">Notes</th>
                      <th className="px-4 py-2.5 text-xs font-medium text-gray-500 w-24 text-right">Updated</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {section.items.map((item, i) => (
                      <tr key={i} className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-5 py-3 font-medium text-gray-800 leading-snug">{item.label}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-block font-semibold text-sm px-2.5 py-1 rounded-lg ${c.badge}`}>
                            {item.price}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-500 text-xs leading-relaxed">{item.notes}</td>
                        <td className="px-4 py-3 text-gray-400 text-xs text-right">{item.updated}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        );
      })}

      {/* Footer note */}
      <div className="text-center pt-2 pb-4">
        <p className="text-xs text-gray-400">
          All prices subject to change. Check Anthropic, Supabase, and Resend pricing pages before quoting large contracts.
        </p>
      </div>
    </div>
  );
}

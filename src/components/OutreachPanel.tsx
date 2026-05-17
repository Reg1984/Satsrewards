import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Send, Users, Plus, ChevronRight, Search, Building2, MapPin, User, Star, Clock, CheckCircle2, XCircle, MessageSquare, BarChart3, Target, Zap, RefreshCw, ChevronDown, ChevronUp, Eye, CreditCard as Edit3, Inbox, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { toast } from 'sonner';

// ── Types ─────────────────────────────────────────────────────────────────────

interface Prospect {
  id: string;
  organisation_name: string;
  organisation_type: string;
  contact_name: string;
  contact_title: string;
  contact_email: string;
  region: string;
  pupil_count: number;
  school_count: number;
  stage: ProspectStage;
  ai_score: number;
  research_notes: string;
  pain_points: string[];
  personalisation_hooks: string[];
  competitor_platforms: string[];
  reply_sentiment: string;
  last_contacted_at: string | null;
  next_follow_up_at: string | null;
  do_not_contact: boolean;
  created_at: string;
  updated_at: string;
}

interface OutreachEmail {
  id: string;
  prospect_id: string;
  subject: string;
  body: string;
  email_type: string;
  status: EmailStatus;
  tone: string;
  sent_at: string | null;
  created_at: string;
}

interface OutreachResponse {
  id: string;
  prospect_id: string;
  response_type: string;
  content: string;
  sentiment: string;
  key_objections: string[];
  expressed_interests: string[];
  ai_summary: string;
  received_at: string;
}

interface PipelineStats {
  total: number;
  byStage: Record<string, number>;
  emailsSent: number;
  repliesReceived: number;
  converted: number;
}

type ProspectStage = 'identified' | 'researched' | 'emailed' | 'replied' | 'meeting_booked' | 'demo_given' | 'converted' | 'declined' | 'dormant';
type EmailStatus = 'draft' | 'sent' | 'bounced' | 'opened' | 'replied';
interface SentEmailRow {
  id: string;
  subject: string;
  body: string;
  email_type: string;
  status: EmailStatus;
  sent_at: string | null;
  created_at: string;
  prospect_id: string;
  organisation_name: string;
  contact_name: string;
  contact_title: string;
  contact_email: string;
  region: string;
  stage: ProspectStage;
}

type PanelView = 'pipeline' | 'sent' | 'analytics';

// ── Stage config ──────────────────────────────────────────────────────────────

const STAGE_CONFIG: Record<ProspectStage, { label: string; color: string; bg: string; dot: string }> = {
  identified:    { label: 'Identified',     color: 'text-gray-600',   bg: 'bg-gray-100',   dot: 'bg-gray-400' },
  researched:    { label: 'Researched',     color: 'text-blue-700',   bg: 'bg-blue-50',    dot: 'bg-blue-500' },
  emailed:       { label: 'Emailed',        color: 'text-amber-700',  bg: 'bg-amber-50',   dot: 'bg-amber-500' },
  replied:       { label: 'Replied',        color: 'text-teal-700',   bg: 'bg-teal-50',    dot: 'bg-teal-500' },
  meeting_booked:{ label: 'Meeting Booked', color: 'text-orange-700', bg: 'bg-orange-50',  dot: 'bg-orange-500' },
  demo_given:    { label: 'Demo Given',     color: 'text-violet-700', bg: 'bg-violet-50',  dot: 'bg-violet-500' },
  converted:     { label: 'Converted',      color: 'text-green-700',  bg: 'bg-green-50',   dot: 'bg-green-600' },
  declined:      { label: 'Declined',       color: 'text-red-700',    bg: 'bg-red-50',     dot: 'bg-red-500' },
  dormant:       { label: 'Dormant',        color: 'text-slate-600',  bg: 'bg-slate-100',  dot: 'bg-slate-400' },
};

const SENTIMENT_CONFIG: Record<string, { color: string; icon: React.ReactNode }> = {
  positive:   { color: 'text-green-600',  icon: <CheckCircle2 className="h-3.5 w-3.5" /> },
  interested: { color: 'text-blue-600',   icon: <Star className="h-3.5 w-3.5" /> },
  neutral:    { color: 'text-gray-500',   icon: <MessageSquare className="h-3.5 w-3.5" /> },
  negative:   { color: 'text-red-500',    icon: <XCircle className="h-3.5 w-3.5" /> },
  objection:  { color: 'text-amber-600',  icon: <AlertCircle className="h-3.5 w-3.5" /> },
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function timeAgo(dateStr: string | null): string {
  if (!dateStr) return '—';
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

function ScoreBadge({ score }: { score: number }) {
  const color = score >= 70 ? 'text-green-700 bg-green-50 border-green-200'
    : score >= 40 ? 'text-amber-700 bg-amber-50 border-amber-200'
    : 'text-gray-600 bg-gray-50 border-gray-200';
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-semibold px-1.5 py-0.5 rounded border ${color}`}>
      <Zap className="h-2.5 w-2.5" />{score}
    </span>
  );
}

function StagePill({ stage }: { stage: ProspectStage }) {
  const cfg = STAGE_CONFIG[stage] ?? STAGE_CONFIG.identified;
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-full ${cfg.bg} ${cfg.color}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
}

// ── Add Prospect Form ─────────────────────────────────────────────────────────

function AddProspectModal({ onClose, onAdded }: { onClose: () => void; onAdded: () => void }) {
  const [form, setForm] = useState({
    organisation_name: '', organisation_type: 'school', contact_name: '',
    contact_title: 'Headteacher', contact_email: '', region: '',
    pupil_count: '', school_count: '1', website: '', extra_context: '',
  });
  const [researching, setResearching] = useState(false);

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const handleResearchAndAdd = async () => {
    if (!form.organisation_name || !form.contact_email) {
      toast.error('Organisation name and contact email are required');
      return;
    }
    setResearching(true);
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
      const resp = await fetch(`${supabaseUrl}/functions/v1/admin-agent/chat`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${anonKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: `Research this prospect and save to database: ${form.organisation_name}, ${form.contact_title} ${form.contact_name}, email: ${form.contact_email}, region: ${form.region}, pupils: ${form.pupil_count || 'unknown'}, schools: ${form.school_count}, type: ${form.organisation_type}${form.website ? `, website: ${form.website}` : ''}${form.extra_context ? `. Context: ${form.extra_context}` : ''}. Use the research_prospect tool with save_to_db: true.`,
        }),
      });
      if (resp.ok) {
        toast.success('Prospect researched and added to pipeline');
        onAdded();
        onClose();
      } else {
        toast.error('Failed to research prospect');
      }
    } catch {
      toast.error('Error adding prospect');
    } finally {
      setResearching(false);
    }
  };

  const handleAddBasic = async () => {
    if (!form.organisation_name || !form.contact_email) {
      toast.error('Organisation name and contact email are required');
      return;
    }
    const { data: { user } } = await supabase.auth.getUser();
    const userId = user?.id ?? 'demo-user';
    const { error } = await supabase.from('outreach_prospects').insert({
      created_by: userId,
      organisation_name: form.organisation_name,
      organisation_type: form.organisation_type,
      contact_name: form.contact_name,
      contact_title: form.contact_title,
      contact_email: form.contact_email,
      region: form.region,
      pupil_count: parseInt(form.pupil_count) || 0,
      school_count: parseInt(form.school_count) || 1,
      website: form.website,
      stage: 'identified',
    });
    if (error) { toast.error('Failed to add prospect'); return; }
    toast.success('Prospect added');
    onAdded();
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden"
      >
        <div className="bg-gradient-to-r from-slate-800 to-slate-700 px-6 py-4">
          <h2 className="text-white font-semibold text-lg">Add Prospect</h2>
          <p className="text-slate-300 text-sm">Add schools globally — UK, USA, Asia, Middle East, Australia and more</p>
        </div>
        <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="block text-xs font-medium text-gray-600 mb-1">Organisation Name *</label>
              <input className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-300" value={form.organisation_name} onChange={e => set('organisation_name', e.target.value)} placeholder="Oakwood Academy Trust" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Type</label>
              <select className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-300" value={form.organisation_type} onChange={e => set('organisation_type', e.target.value)}>
                <option value="school">Single School</option>
                <option value="trust">Trust</option>
                <option value="academy_trust">Academy Trust</option>
                <option value="local_authority">Local Authority</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Region</label>
              <input className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-300" value={form.region} onChange={e => set('region', e.target.value)} placeholder="London" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Contact Name</label>
              <input className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-300" value={form.contact_name} onChange={e => set('contact_name', e.target.value)} placeholder="Sarah Thompson" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Title</label>
              <input className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-300" value={form.contact_title} onChange={e => set('contact_title', e.target.value)} placeholder="Headteacher" />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-medium text-gray-600 mb-1">Contact Email *</label>
              <input type="email" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-300" value={form.contact_email} onChange={e => set('contact_email', e.target.value)} placeholder="head@oakwoodtrust.co.uk" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Pupils</label>
              <input type="number" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-300" value={form.pupil_count} onChange={e => set('pupil_count', e.target.value)} placeholder="800" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Schools in Trust</label>
              <input type="number" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-300" value={form.school_count} onChange={e => set('school_count', e.target.value)} placeholder="1" />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-medium text-gray-600 mb-1">Website</label>
              <input className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-300" value={form.website} onChange={e => set('website', e.target.value)} placeholder="https://oakwoodtrust.co.uk" />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-medium text-gray-600 mb-1">Extra Context (for AI research)</label>
              <textarea className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-300 resize-none" rows={2} value={form.extra_context} onChange={e => set('extra_context', e.target.value)} placeholder="Uses ClassDojo currently, interested in financial education, recently received Ofsted Good..." />
            </div>
          </div>
        </div>
        <div className="px-6 pb-5 flex gap-3">
          <button onClick={onClose} className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">Cancel</button>
          <button onClick={handleAddBasic} className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">Quick Add</button>
          <button
            onClick={handleResearchAndAdd}
            disabled={researching}
            className="flex-1 px-4 py-2.5 bg-slate-800 text-white rounded-xl text-sm font-medium hover:bg-slate-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-60"
          >
            {researching ? <><RefreshCw className="h-4 w-4 animate-spin" />Researching...</> : <><Zap className="h-4 w-4" />AI Research & Add</>}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ── Prospect Detail Drawer ────────────────────────────────────────────────────

function ProspectDrawer({ prospect, onClose, onRefresh }: { prospect: Prospect; onClose: () => void; onRefresh: () => void }) {
  const [emails, setEmails] = useState<OutreachEmail[]>([]);
  const [responses, setResponses] = useState<OutreachResponse[]>([]);
  const [activeTab, setActiveTab] = useState<'overview' | 'emails' | 'responses'>('overview');
  const [drafting, setDrafting] = useState(false);
  const [draftResult, setDraftResult] = useState<{ subject: string; body: string } | null>(null);
  const [sending, setSending] = useState(false);
  const [emailType, setEmailType] = useState<string>('initial');
  const [emailTone, setEmailTone] = useState<string>('professional');
  const [responseText, setResponseText] = useState('');
  const [loggingResponse, setLoggingResponse] = useState(false);

  useEffect(() => {
    supabase.from('outreach_emails').select('*').eq('prospect_id', prospect.id).order('created_at', { ascending: false })
      .then(({ data }) => setEmails(data ?? []));
    supabase.from('outreach_responses').select('*').eq('prospect_id', prospect.id).order('received_at', { ascending: false })
      .then(({ data }) => setResponses(data ?? []));
  }, [prospect.id]);

  const handleDraft = async () => {
    setDrafting(true);
    setDraftResult(null);
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
      const resp = await fetch(`${supabaseUrl}/functions/v1/admin-agent/chat`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${anonKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: `Draft a ${emailType} outreach email for prospect ID ${prospect.id} (${prospect.organisation_name}, ${prospect.contact_title} ${prospect.contact_name}). Use a ${emailTone} tone. Save it to the database. Return just the subject and body.`,
        }),
      });
      if (resp.ok) {
        // Reload emails
        const { data } = await supabase.from('outreach_emails').select('*').eq('prospect_id', prospect.id).order('created_at', { ascending: false });
        setEmails(data ?? []);
        toast.success('Email drafted and saved');
        setActiveTab('emails');
      } else {
        toast.error('Failed to draft email');
      }
    } catch {
      toast.error('Error drafting email');
    } finally {
      setDrafting(false);
    }
  };

  const handleSend = async (email: OutreachEmail) => {
    setSending(true);
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
      const resp = await fetch(`${supabaseUrl}/functions/v1/admin-agent/chat`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${anonKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: `Send outreach email ID ${email.id} to ${prospect.contact_email} (prospect: ${prospect.organisation_name})`,
        }),
      });
      if (resp.ok) {
        const { data } = await supabase.from('outreach_emails').select('*').eq('prospect_id', prospect.id).order('created_at', { ascending: false });
        setEmails(data ?? []);
        onRefresh();
        toast.success(`Email sent to ${prospect.contact_email}`);
      } else {
        toast.error('Failed to send email');
      }
    } catch {
      toast.error('Error sending email');
    } finally {
      setSending(false);
    }
  };

  const handleLogResponse = async () => {
    if (!responseText.trim()) return;
    setLoggingResponse(true);
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
      await fetch(`${supabaseUrl}/functions/v1/admin-agent/chat`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${anonKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: `Log this email reply from ${prospect.organisation_name} (prospect ID: ${prospect.id}): "${responseText}"`,
        }),
      });
      const { data } = await supabase.from('outreach_responses').select('*').eq('prospect_id', prospect.id).order('received_at', { ascending: false });
      setResponses(data ?? []);
      setResponseText('');
      onRefresh();
      toast.success('Response logged and analysed');
    } catch {
      toast.error('Error logging response');
    } finally {
      setLoggingResponse(false);
    }
  };

  const annualSaving = prospect.pupil_count * 12 * prospect.school_count;

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 flex justify-end" onClick={e => e.target === e.currentTarget && onClose()}>
      <motion.div
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className="w-full max-w-xl bg-white shadow-2xl flex flex-col h-full overflow-hidden"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-800 to-slate-700 px-5 py-4 flex items-start gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <StagePill stage={prospect.stage} />
              <ScoreBadge score={prospect.ai_score} />
            </div>
            <h2 className="text-white font-semibold text-base leading-snug">{prospect.organisation_name}</h2>
            <p className="text-slate-300 text-sm">{prospect.contact_title} {prospect.contact_name && `— ${prospect.contact_name}`}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white mt-0.5">
            <XCircle className="h-5 w-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-100 flex">
          {(['overview', 'emails', 'responses'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-2.5 text-sm font-medium capitalize transition-colors ${activeTab === tab ? 'border-b-2 border-slate-700 text-slate-800' : 'text-gray-500 hover:text-gray-700'}`}
            >
              {tab} {tab === 'emails' && emails.length > 0 && <span className="ml-1 text-xs bg-gray-100 text-gray-600 rounded-full px-1.5">{emails.length}</span>}
              {tab === 'responses' && responses.length > 0 && <span className="ml-1 text-xs bg-teal-100 text-teal-700 rounded-full px-1.5">{responses.length}</span>}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto">
          {activeTab === 'overview' && (
            <div className="p-5 space-y-4">
              {/* Contact */}
              <div className="grid grid-cols-2 gap-3">
                {prospect.contact_email && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Mail className="h-4 w-4 text-gray-400 shrink-0" />
                    <span className="truncate">{prospect.contact_email}</span>
                  </div>
                )}
                {prospect.region && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <MapPin className="h-4 w-4 text-gray-400 shrink-0" />
                    <span>{prospect.region}</span>
                  </div>
                )}
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Users className="h-4 w-4 text-gray-400 shrink-0" />
                  <span>{prospect.pupil_count ? `${prospect.pupil_count.toLocaleString()} pupils` : 'Pupils unknown'}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Building2 className="h-4 w-4 text-gray-400 shrink-0" />
                  <span>{prospect.school_count > 1 ? `${prospect.school_count} schools` : 'Single school'}</span>
                </div>
              </div>

              {/* Value calc */}
              {annualSaving > 0 && (
                <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3.5">
                  <p className="text-xs font-semibold text-emerald-700 uppercase tracking-wide mb-2">Potential Value</p>
                  <div className="flex items-end gap-1">
                    <span className="text-2xl font-bold text-emerald-700">£{annualSaving.toLocaleString()}</span>
                    <span className="text-emerald-600 text-sm mb-0.5">/year saved</span>
                  </div>
                  <p className="text-xs text-emerald-600 mt-1">vs. competitor platforms at ~£18/pupil/year</p>
                  {prospect.pupil_count > 0 && (
                    <p className="text-xs text-emerald-600 mt-0.5">
                      Students earn ~{(1000 * 12 * 5).toLocaleString()} sats each over 5 school years
                    </p>
                  )}
                </div>
              )}

              {/* Research notes */}
              {prospect.research_notes && (
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">AI Research Notes</p>
                  <p className="text-sm text-gray-700 leading-relaxed">{prospect.research_notes}</p>
                </div>
              )}

              {/* Pain points */}
              {prospect.pain_points?.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Pain Points</p>
                  <div className="flex flex-wrap gap-1.5">
                    {prospect.pain_points.map((p, i) => (
                      <span key={i} className="text-xs bg-red-50 text-red-700 border border-red-100 rounded-full px-2.5 py-0.5">{p}</span>
                    ))}
                  </div>
                </div>
              )}

              {/* Personalisation hooks */}
              {prospect.personalisation_hooks?.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Personalisation Hooks</p>
                  <div className="flex flex-wrap gap-1.5">
                    {prospect.personalisation_hooks.map((h, i) => (
                      <span key={i} className="text-xs bg-blue-50 text-blue-700 border border-blue-100 rounded-full px-2.5 py-0.5">{h}</span>
                    ))}
                  </div>
                </div>
              )}

              {/* Competitors */}
              {prospect.competitor_platforms?.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Uses Competitor Platforms</p>
                  <div className="flex flex-wrap gap-1.5">
                    {prospect.competitor_platforms.map((c, i) => (
                      <span key={i} className="text-xs bg-amber-50 text-amber-700 border border-amber-100 rounded-full px-2.5 py-0.5">{c}</span>
                    ))}
                  </div>
                </div>
              )}

              {/* Timeline */}
              <div className="flex items-center justify-between text-xs text-gray-500 pt-1">
                <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" />Last contact: {timeAgo(prospect.last_contacted_at)}</span>
                {prospect.next_follow_up_at && (
                  <span className="flex items-center gap-1 text-amber-600"><Clock className="h-3.5 w-3.5" />Follow up: {timeAgo(prospect.next_follow_up_at)}</span>
                )}
              </div>
            </div>
          )}

          {activeTab === 'emails' && (
            <div className="p-5 space-y-4">
              {/* Draft new email */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
                <p className="text-sm font-medium text-slate-700">Draft New Email</p>
                <div className="grid grid-cols-2 gap-2">
                  <select
                    value={emailType}
                    onChange={e => setEmailType(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-300 bg-white"
                  >
                    <option value="initial">Initial Outreach</option>
                    <option value="follow_up_1">First Follow-up</option>
                    <option value="follow_up_2">Second Follow-up</option>
                    <option value="case_study">Case Study</option>
                    <option value="breakup">Break-up Email</option>
                    <option value="custom">Custom</option>
                  </select>
                  <select
                    value={emailTone}
                    onChange={e => setEmailTone(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-300 bg-white"
                  >
                    <option value="professional">Professional</option>
                    <option value="warm">Warm</option>
                    <option value="bold">Bold</option>
                    <option value="concise">Concise</option>
                  </select>
                </div>
                <button
                  onClick={handleDraft}
                  disabled={drafting}
                  className="w-full py-2.5 bg-slate-800 text-white rounded-xl text-sm font-medium hover:bg-slate-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-60"
                >
                  {drafting ? <><RefreshCw className="h-4 w-4 animate-spin" />Drafting with AI...</> : <><Edit3 className="h-4 w-4" />AI Draft Email</>}
                </button>
              </div>

              {/* Email list */}
              {emails.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  <Mail className="h-10 w-10 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">No emails yet</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {emails.map(email => (
                    <div key={email.id} className="border border-gray-100 rounded-xl overflow-hidden">
                      <div className="px-4 py-3 bg-gray-50 flex items-center justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-gray-800 truncate">{email.subject}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${
                              email.status === 'sent' ? 'bg-blue-50 text-blue-700' :
                              email.status === 'draft' ? 'bg-gray-100 text-gray-600' :
                              email.status === 'opened' ? 'bg-teal-50 text-teal-700' :
                              email.status === 'replied' ? 'bg-green-50 text-green-700' :
                              'bg-red-50 text-red-700'
                            }`}>{email.status}</span>
                            <span className="text-xs text-gray-400">{email.email_type.replace('_', ' ')}</span>
                            <span className="text-xs text-gray-400">{timeAgo(email.created_at)}</span>
                          </div>
                        </div>
                        {email.status === 'draft' && (
                          <button
                            onClick={() => handleSend(email)}
                            disabled={sending}
                            className="shrink-0 px-3 py-1.5 bg-slate-800 text-white rounded-lg text-xs font-medium hover:bg-slate-700 transition-colors flex items-center gap-1.5"
                          >
                            <Send className="h-3 w-3" />Send
                          </button>
                        )}
                      </div>
                      <div className="px-4 py-3">
                        <p className="text-sm text-gray-600 whitespace-pre-wrap leading-relaxed line-clamp-4">{email.body}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'responses' && (
            <div className="p-5 space-y-4">
              {/* Log response */}
              <div className="bg-teal-50 border border-teal-200 rounded-xl p-4 space-y-3">
                <p className="text-sm font-medium text-teal-800">Log a Response</p>
                <textarea
                  value={responseText}
                  onChange={e => setResponseText(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-teal-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-300 bg-white resize-none"
                  placeholder="Paste their email reply or note what was said on a call..."
                />
                <button
                  onClick={handleLogResponse}
                  disabled={loggingResponse || !responseText.trim()}
                  className="w-full py-2.5 bg-teal-700 text-white rounded-xl text-sm font-medium hover:bg-teal-600 transition-colors flex items-center justify-center gap-2 disabled:opacity-60"
                >
                  {loggingResponse ? <><RefreshCw className="h-4 w-4 animate-spin" />Analysing...</> : <><Inbox className="h-4 w-4" />Log & Analyse Response</>}
                </button>
              </div>

              {/* Response list */}
              {responses.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  <MessageSquare className="h-10 w-10 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">No responses logged yet</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {responses.map(resp => {
                    const sentiment = SENTIMENT_CONFIG[resp.sentiment] ?? SENTIMENT_CONFIG.neutral;
                    return (
                      <div key={resp.id} className="border border-gray-100 rounded-xl p-4 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className={`flex items-center gap-1.5 text-xs font-medium ${sentiment.color}`}>
                            {sentiment.icon}{resp.sentiment}
                          </span>
                          <span className="text-xs text-gray-400">{timeAgo(resp.received_at)}</span>
                        </div>
                        {resp.ai_summary && <p className="text-sm font-medium text-gray-700">{resp.ai_summary}</p>}
                        <p className="text-sm text-gray-600 line-clamp-3 leading-relaxed">{resp.content}</p>
                        {resp.key_objections?.length > 0 && (
                          <div className="flex flex-wrap gap-1 pt-1">
                            <span className="text-xs text-gray-500">Objections:</span>
                            {resp.key_objections.map((o, i) => (
                              <span key={i} className="text-xs bg-red-50 text-red-600 rounded-full px-2 py-0.5">{o}</span>
                            ))}
                          </div>
                        )}
                        {resp.expressed_interests?.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            <span className="text-xs text-gray-500">Interests:</span>
                            {resp.expressed_interests.map((i, idx) => (
                              <span key={idx} className="text-xs bg-green-50 text-green-600 rounded-full px-2 py-0.5">{i}</span>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}

// ── Analytics View ────────────────────────────────────────────────────────────

function AnalyticsView() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      const userId = user?.id ?? 'demo-user';

      const [prospectsRes, emailsRes, responsesRes] = await Promise.all([
        supabase.from('outreach_prospects').select('stage, ai_score, reply_sentiment').eq('created_by', userId),
        supabase.from('outreach_emails').select('status, email_type').eq('created_by', userId),
        supabase.from('outreach_responses').select('sentiment, key_objections').eq('created_by', userId),
      ]);

      const prospects = prospectsRes.data ?? [];
      const emails = emailsRes.data ?? [];
      const responses = responsesRes.data ?? [];

      const sent = emails.filter(e => e.status !== 'draft').length;
      const replied = responses.length;
      const converted = prospects.filter(p => p.stage === 'converted').length;

      const stageCounts: Record<string, number> = {};
      for (const p of prospects) stageCounts[p.stage] = (stageCounts[p.stage] ?? 0) + 1;

      const allObjections = responses.flatMap(r => r.key_objections ?? []);
      const objCounts: Record<string, number> = {};
      for (const o of allObjections) objCounts[o] = (objCounts[o] ?? 0) + 1;
      const topObjections = Object.entries(objCounts).sort((a, b) => b[1] - a[1]).slice(0, 5);

      setStats({ prospects: prospects.length, sent, replied, converted, replyRate: sent ? Math.round((replied / sent) * 100) : 0, conversionRate: prospects.length ? Math.round((converted / prospects.length) * 100) : 0, stageCounts, topObjections });
      setLoading(false);
    };
    fetchStats();
  }, []);

  if (loading) return <div className="flex items-center justify-center py-16"><RefreshCw className="h-6 w-6 animate-spin text-gray-400" /></div>;

  const stageOrder: ProspectStage[] = ['identified', 'researched', 'emailed', 'replied', 'meeting_booked', 'demo_given', 'converted'];

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total Prospects', value: stats?.prospects ?? 0, icon: <Target className="h-4 w-4" />, color: 'text-slate-700 bg-slate-100' },
          { label: 'Emails Sent', value: stats?.sent ?? 0, icon: <Send className="h-4 w-4" />, color: 'text-blue-700 bg-blue-50' },
          { label: 'Reply Rate', value: `${stats?.replyRate ?? 0}%`, icon: <MessageSquare className="h-4 w-4" />, color: 'text-teal-700 bg-teal-50' },
          { label: 'Converted', value: stats?.converted ?? 0, icon: <CheckCircle2 className="h-4 w-4" />, color: 'text-green-700 bg-green-50' },
        ].map(stat => (
          <div key={stat.label} className="bg-white border border-gray-100 rounded-xl p-4">
            <div className={`inline-flex p-2 rounded-lg mb-2 ${stat.color}`}>{stat.icon}</div>
            <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
            <p className="text-xs text-gray-500 mt-0.5">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Pipeline funnel */}
      <div className="bg-white border border-gray-100 rounded-xl p-4">
        <p className="text-sm font-semibold text-gray-700 mb-3">Pipeline Funnel</p>
        <div className="space-y-2">
          {stageOrder.map(stage => {
            const count = stats?.stageCounts?.[stage] ?? 0;
            const max = stats?.prospects || 1;
            const cfg = STAGE_CONFIG[stage];
            return (
              <div key={stage} className="flex items-center gap-3">
                <span className={`w-28 text-xs font-medium ${cfg.color}`}>{cfg.label}</span>
                <div className="flex-1 bg-gray-100 rounded-full h-2 overflow-hidden">
                  <div className={`h-full rounded-full ${cfg.dot}`} style={{ width: `${(count / max) * 100}%` }} />
                </div>
                <span className="w-6 text-xs text-right text-gray-500">{count}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Top objections */}
      {stats?.topObjections?.length > 0 && (
        <div className="bg-white border border-gray-100 rounded-xl p-4">
          <p className="text-sm font-semibold text-gray-700 mb-3">Top Objections (from responses)</p>
          <div className="space-y-2">
            {stats.topObjections.map(([obj, count]: [string, number]) => (
              <div key={obj} className="flex items-center justify-between">
                <span className="text-sm text-gray-600 flex-1 mr-2 truncate">{obj}</span>
                <span className="text-xs font-semibold text-gray-500 bg-gray-100 rounded-full px-2 py-0.5">{count}×</span>
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-400 mt-3">Use these in follow-up emails and AI memory to pre-empt objections.</p>
        </div>
      )}
    </div>
  );
}

// ── Sent Emails Feed ──────────────────────────────────────────────────────────

const EMAIL_STATUS_CONFIG: Record<EmailStatus, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
  draft:   { label: 'Draft',   color: 'text-gray-600',  bg: 'bg-gray-100',   icon: <Edit3 className="h-3 w-3" /> },
  sent:    { label: 'Sent',    color: 'text-blue-700',  bg: 'bg-blue-50',    icon: <Send className="h-3 w-3" /> },
  bounced: { label: 'Bounced', color: 'text-red-700',   bg: 'bg-red-50',     icon: <XCircle className="h-3 w-3" /> },
  opened:  { label: 'Opened',  color: 'text-teal-700',  bg: 'bg-teal-50',    icon: <Eye className="h-3 w-3" /> },
  replied: { label: 'Replied', color: 'text-green-700', bg: 'bg-green-50',   icon: <MessageSquare className="h-3 w-3" /> },
};

function SentEmailsView({ onSelectProspect }: { onSelectProspect: (id: string) => void }) {
  const [rows, setRows] = useState<SentEmailRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<EmailStatus | ''>('');

  const fetch = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    const userId = user?.id ?? 'demo-user';

    // Join emails with prospects to get org info
    const { data: emails } = await supabase
      .from('outreach_emails')
      .select('id, subject, body, email_type, status, sent_at, created_at, prospect_id')
      .eq('created_by', userId)
      .neq('status', 'draft')
      .order('sent_at', { ascending: false })
      .limit(100);

    if (!emails?.length) { setRows([]); setLoading(false); return; }

    const prospectIds = [...new Set(emails.map(e => e.prospect_id))];
    const { data: prospects } = await supabase
      .from('outreach_prospects')
      .select('id, organisation_name, contact_name, contact_title, contact_email, region, stage')
      .in('id', prospectIds);

    const prospectMap = Object.fromEntries((prospects ?? []).map(p => [p.id, p]));

    const merged: SentEmailRow[] = emails.map(e => ({
      ...e,
      status: e.status as EmailStatus,
      ...(prospectMap[e.prospect_id] ?? {
        organisation_name: 'Unknown', contact_name: '', contact_title: '', contact_email: '', region: '', stage: 'emailed' as ProspectStage,
      }),
    }));

    setRows(merged);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetch();
    // Poll every 15s so new agent sends appear automatically
    const interval = setInterval(fetch, 15000);
    return () => clearInterval(interval);
  }, [fetch]);

  const filtered = statusFilter ? rows.filter(r => r.status === statusFilter) : rows;
  const counts: Partial<Record<EmailStatus, number>> = {};
  for (const r of rows) counts[r.status] = (counts[r.status] ?? 0) + 1;

  const totalSent = rows.length;
  const todayCount = rows.filter(r => {
    const d = r.sent_at ?? r.created_at;
    return d && new Date(d).toDateString() === new Date().toDateString();
  }).length;

  return (
    <div className="space-y-4">
      {/* Summary stats */}
      <div className="grid grid-cols-4 gap-2">
        {[
          { label: 'Total Sent', value: totalSent, color: 'text-slate-700', bg: 'bg-slate-50' },
          { label: 'Today', value: todayCount, color: 'text-blue-700', bg: 'bg-blue-50' },
          { label: 'Opened', value: counts['opened'] ?? 0, color: 'text-teal-700', bg: 'bg-teal-50' },
          { label: 'Replied', value: counts['replied'] ?? 0, color: 'text-green-700', bg: 'bg-green-50' },
        ].map(s => (
          <div key={s.label} className={`rounded-xl p-3 ${s.bg} text-center`}>
            <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
            <p className={`text-xs font-medium ${s.color} opacity-70 mt-0.5`}>{s.label}</p>
          </div>
        ))}
      </div>

      {/* Status filter pills */}
      <div className="flex flex-wrap gap-1.5">
        <button
          onClick={() => setStatusFilter('')}
          className={`text-xs font-medium px-3 py-1 rounded-full border transition-colors ${!statusFilter ? 'bg-slate-800 text-white border-slate-800' : 'border-gray-200 text-gray-600 hover:border-slate-400'}`}
        >
          All ({totalSent})
        </button>
        {(Object.keys(EMAIL_STATUS_CONFIG) as EmailStatus[]).filter(s => s !== 'draft').map(s => {
          const cfg = EMAIL_STATUS_CONFIG[s];
          const c = counts[s] ?? 0;
          if (!c) return null;
          return (
            <button
              key={s}
              onClick={() => setStatusFilter(statusFilter === s ? '' : s)}
              className={`inline-flex items-center gap-1 text-xs font-medium px-3 py-1 rounded-full border transition-colors ${statusFilter === s ? `${cfg.bg} ${cfg.color} border-current` : 'border-gray-200 text-gray-600 hover:border-gray-400'}`}
            >
              {cfg.icon}{cfg.label} ({c})
            </button>
          );
        })}
        <button onClick={fetch} className="ml-auto p-1.5 rounded-full border border-gray-200 text-gray-400 hover:text-gray-600 hover:border-gray-400 transition-colors">
          <RefreshCw className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Email list */}
      {loading ? (
        <div className="flex items-center justify-center py-12"><RefreshCw className="h-5 w-5 animate-spin text-gray-400" /></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12">
          <Send className="h-12 w-12 mx-auto text-gray-200 mb-3" />
          <p className="text-gray-500 font-medium text-sm">No emails sent yet</p>
          <p className="text-xs text-gray-400 mt-1 max-w-xs mx-auto">Ask the AI agent to "find international schools in Singapore" or "find schools in New York" or "find schools in El Salvador" to get started.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(row => {
            const statusCfg = EMAIL_STATUS_CONFIG[row.status] ?? EMAIL_STATUS_CONFIG.sent;
            const isExpanded = expandedId === row.id;
            return (
              <motion.div
                key={row.id}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                className="border border-gray-100 rounded-xl overflow-hidden hover:border-gray-200 transition-colors"
              >
                <div
                  className="flex items-start gap-3 px-4 py-3 cursor-pointer hover:bg-gray-50 transition-colors"
                  onClick={() => setExpandedId(isExpanded ? null : row.id)}
                >
                  {/* Status indicator */}
                  <div className={`mt-0.5 shrink-0 p-1.5 rounded-lg ${statusCfg.bg} ${statusCfg.color}`}>
                    {statusCfg.icon}
                  </div>

                  <div className="flex-1 min-w-0">
                    {/* Org + subject */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-sm text-gray-900 truncate">{row.organisation_name}</span>
                      <span className={`inline-flex items-center gap-1 text-xs font-medium px-1.5 py-0.5 rounded-full ${statusCfg.bg} ${statusCfg.color}`}>
                        {statusCfg.icon}{statusCfg.label}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5 truncate">{row.subject}</p>
                    <div className="flex items-center gap-3 mt-1 flex-wrap">
                      {row.contact_email && (
                        <span className="flex items-center gap-1 text-xs text-gray-400">
                          <Mail className="h-3 w-3" />{row.contact_email}
                        </span>
                      )}
                      {row.region && (
                        <span className="flex items-center gap-1 text-xs text-gray-400">
                          <MapPin className="h-3 w-3" />{row.region}
                        </span>
                      )}
                      <span className="flex items-center gap-1 text-xs text-gray-400">
                        <Clock className="h-3 w-3" />
                        {row.sent_at ? `Sent ${timeAgo(row.sent_at)}` : timeAgo(row.created_at)}
                      </span>
                      <span className="text-xs text-gray-400 capitalize">{row.email_type.replace(/_/g, ' ')}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={e => { e.stopPropagation(); onSelectProspect(row.prospect_id); }}
                      className="p-1.5 rounded-lg border border-gray-200 text-gray-400 hover:text-slate-700 hover:border-slate-300 transition-colors"
                      title="View prospect"
                    >
                      <User className="h-3.5 w-3.5" />
                    </button>
                    {isExpanded ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
                  </div>
                </div>

                {/* Expanded email body */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="px-4 pb-4 pt-1 border-t border-gray-100 bg-gray-50">
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Email Content</p>
                        <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{row.body}</p>
                        {row.sent_at && (
                          <p className="text-xs text-gray-400 mt-3 flex items-center gap-1">
                            <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                            Delivered to {row.contact_email} on {new Date(row.sent_at).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' })}
                          </p>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>
      )}

      <p className="text-xs text-center text-gray-400">Auto-refreshes every 15 seconds</p>
    </div>
  );
}

// ── Main OutreachPanel ────────────────────────────────────────────────────────

const TONE_OPTIONS = [
  { value: 'professional', label: 'Professional', description: 'Formal and credible' },
  { value: 'warm', label: 'Warm', description: 'Friendly and approachable' },
  { value: 'bold', label: 'Bold', description: 'Direct and confident' },
  { value: 'concise', label: 'Concise', description: 'Short and to the point' },
];

export function OutreachPanel() {
  const [view, setView] = useState<PanelView>('pipeline');
  const [prospects, setProspects] = useState<Prospect[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProspect, setSelectedProspect] = useState<Prospect | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [stageFilter, setStageFilter] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);
  const [sentCount, setSentCount] = useState(0);
  const [globalTone, setGlobalTone] = useState<string>('professional');
  const [savingTone, setSavingTone] = useState(false);

  // Load saved global tone from AI memory on mount
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      supabase.from('ai_agent_memory')
        .select('memory_value')
        .eq('admin_id', user.id)
        .eq('memory_key', 'outreach_default_tone')
        .maybeSingle()
        .then(({ data }) => { if (data?.memory_value) setGlobalTone(data.memory_value); });
    });
  }, []);

  const saveGlobalTone = async (tone: string) => {
    setSavingTone(true);
    setGlobalTone(tone);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      await supabase.from('ai_agent_memory').upsert({
        admin_id: user.id,
        memory_key: 'outreach_default_tone',
        memory_value: tone,
        category: 'outreach',
        updated_at: new Date().toISOString(),
      }, { onConflict: 'admin_id,memory_key' });
    } finally {
      setSavingTone(false);
    }
  };

  const fetchProspects = useCallback(async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    const userId = user?.id ?? 'demo-user';
    const [prospectsRes, sentRes] = await Promise.all([
      supabase.from('outreach_prospects').select('*').eq('created_by', userId).order('updated_at', { ascending: false }),
      supabase.from('outreach_emails').select('id', { count: 'exact', head: true }).eq('created_by', userId).neq('status', 'draft'),
    ]);
    setProspects(prospectsRes.data ?? []);
    setSentCount(sentRes.count ?? 0);
    setLoading(false);
  }, []);

  useEffect(() => { fetchProspects(); }, [fetchProspects, refreshKey]);

  const filtered = prospects.filter(p => {
    if (stageFilter && p.stage !== stageFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return p.organisation_name.toLowerCase().includes(q) || p.contact_email.toLowerCase().includes(q) || p.region.toLowerCase().includes(q) || p.contact_name.toLowerCase().includes(q);
    }
    return true;
  });

  const stageCounts: Record<string, number> = {};
  for (const p of prospects) stageCounts[p.stage] = (stageCounts[p.stage] ?? 0) + 1;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-800 to-slate-700 px-5 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-white font-semibold text-base flex items-center gap-2">
              <Target className="h-4.5 w-4.5" />
              School Outreach Pipeline
            </h2>
            <p className="text-slate-300 text-xs mt-0.5">{prospects.length} prospects · {sentCount} sent · {stageCounts['converted'] ?? 0} converted</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setRefreshKey(k => k + 1)}
              className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-600 transition-colors"
            >
              <RefreshCw className="h-4 w-4" />
            </button>
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-lg text-sm font-medium transition-colors"
            >
              <Plus className="h-4 w-4" />Add Prospect
            </button>
          </div>
        </div>

        {/* Global tone selector */}
        <div className="flex items-center gap-2 mt-3 mb-1">
          <span className="text-slate-400 text-xs font-medium shrink-0">Default tone:</span>
          <div className="flex gap-1">
            {TONE_OPTIONS.map(opt => (
              <button
                key={opt.value}
                onClick={() => saveGlobalTone(opt.value)}
                disabled={savingTone}
                title={opt.description}
                className={`px-2.5 py-0.5 rounded-full text-xs font-medium transition-colors ${
                  globalTone === opt.value
                    ? 'bg-white text-slate-800'
                    : 'text-slate-300 hover:text-white hover:bg-slate-600'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* View tabs */}
        <div className="flex gap-1 mt-2">
          <button
            onClick={() => setView('pipeline')}
            className={`flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-medium transition-colors ${view === 'pipeline' ? 'bg-white text-slate-800' : 'text-slate-300 hover:text-white hover:bg-slate-600'}`}
          >
            <Users className="h-3 w-3" />Pipeline
          </button>
          <button
            onClick={() => setView('sent')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium transition-colors ${view === 'sent' ? 'bg-white text-slate-800' : 'text-slate-300 hover:text-white hover:bg-slate-600'}`}
          >
            <Send className="h-3 w-3" />Sent Emails
            {sentCount > 0 && (
              <span className={`text-xs px-1.5 py-0.5 rounded-full font-semibold ${view === 'sent' ? 'bg-slate-800 text-white' : 'bg-white/20 text-white'}`}>
                {sentCount}
              </span>
            )}
          </button>
          <button
            onClick={() => setView('analytics')}
            className={`flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-medium transition-colors ${view === 'analytics' ? 'bg-white text-slate-800' : 'text-slate-300 hover:text-white hover:bg-slate-600'}`}
          >
            <BarChart3 className="h-3 w-3" />Analytics
          </button>
        </div>
      </div>

      <div className="p-4">
        {view === 'analytics' ? (
          <AnalyticsView />
        ) : view === 'sent' ? (
          <SentEmailsView
            onSelectProspect={async (prospectId) => {
              const found = prospects.find(p => p.id === prospectId);
              if (found) { setSelectedProspect(found); return; }
              // Fetch if not in current list
              const { data } = await supabase.from('outreach_prospects').select('*').eq('id', prospectId).maybeSingle();
              if (data) setSelectedProspect(data);
            }}
          />
        ) : (
          <>
            {/* Filters */}
            <div className="flex gap-2 mb-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                <input
                  className="w-full pl-8 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-200"
                  placeholder="Search prospects..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                />
              </div>
              <select
                value={stageFilter}
                onChange={e => setStageFilter(e.target.value)}
                className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-200 bg-white"
              >
                <option value="">All Stages</option>
                {Object.entries(STAGE_CONFIG).map(([key, cfg]) => (
                  <option key={key} value={key}>{cfg.label} {stageCounts[key] ? `(${stageCounts[key]})` : ''}</option>
                ))}
              </select>
            </div>

            {/* Stage pills summary */}
            {!stageFilter && prospects.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-4">
                {Object.entries(stageCounts).map(([stage, count]) => {
                  const cfg = STAGE_CONFIG[stage as ProspectStage];
                  if (!cfg || !count) return null;
                  return (
                    <button
                      key={stage}
                      onClick={() => setStageFilter(stage)}
                      className={`text-xs font-medium px-2 py-0.5 rounded-full border transition-colors hover:opacity-80 ${cfg.bg} ${cfg.color} border-transparent`}
                    >
                      {cfg.label}: {count}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Prospect list */}
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <RefreshCw className="h-5 w-5 animate-spin text-gray-400" />
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-12">
                <Target className="h-12 w-12 mx-auto text-gray-200 mb-3" />
                <p className="text-gray-500 font-medium text-sm">
                  {prospects.length === 0 ? 'No prospects yet' : 'No prospects match your filters'}
                </p>
                {prospects.length === 0 && (
                  <div className="mt-4 space-y-2">
                    <p className="text-xs text-gray-400 max-w-xs mx-auto">Add a school or trust and let the AI research them, draft personalised emails, and track your outreach.</p>
                    <button
                      onClick={() => setShowAddModal(true)}
                      className="mt-2 px-4 py-2 bg-slate-800 text-white rounded-lg text-sm font-medium hover:bg-slate-700 transition-colors"
                    >
                      Add your first prospect
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                {filtered.map(prospect => (
                  <motion.button
                    key={prospect.id}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    onClick={() => setSelectedProspect(prospect)}
                    className="w-full text-left border border-gray-100 rounded-xl px-4 py-3.5 hover:border-slate-300 hover:bg-slate-50 transition-all group"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className="font-medium text-gray-900 text-sm truncate">{prospect.organisation_name}</span>
                          <StagePill stage={prospect.stage} />
                        </div>
                        <div className="flex items-center gap-3 text-xs text-gray-500 flex-wrap">
                          {prospect.contact_name && <span className="flex items-center gap-1"><User className="h-3 w-3" />{prospect.contact_title} {prospect.contact_name}</span>}
                          {prospect.region && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{prospect.region}</span>}
                          {prospect.pupil_count > 0 && <span className="flex items-center gap-1"><Users className="h-3 w-3" />{prospect.pupil_count.toLocaleString()}</span>}
                          {prospect.last_contacted_at && <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{timeAgo(prospect.last_contacted_at)}</span>}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <ScoreBadge score={prospect.ai_score} />
                        {prospect.reply_sentiment && SENTIMENT_CONFIG[prospect.reply_sentiment] && (
                          <span className={`${SENTIMENT_CONFIG[prospect.reply_sentiment].color}`}>
                            {SENTIMENT_CONFIG[prospect.reply_sentiment].icon}
                          </span>
                        )}
                        <ChevronRight className="h-4 w-4 text-gray-300 group-hover:text-gray-500 transition-colors" />
                      </div>
                    </div>
                  </motion.button>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Modals */}
      {showAddModal && (
        <AddProspectModal
          onClose={() => setShowAddModal(false)}
          onAdded={() => setRefreshKey(k => k + 1)}
        />
      )}

      <AnimatePresence>
        {selectedProspect && (
          <ProspectDrawer
            prospect={selectedProspect}
            onClose={() => setSelectedProspect(null)}
            onRefresh={() => setRefreshKey(k => k + 1)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

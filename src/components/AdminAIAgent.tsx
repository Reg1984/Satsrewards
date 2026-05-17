import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Brain, Send, Loader, ChevronDown, ChevronUp, Plus, MessageSquare, Trash2, Database, X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';
import { toast } from 'sonner';

interface Message {
  id?: string;
  role: 'user' | 'assistant';
  content: string;
  created_at?: string;
}

interface Conversation {
  id: string;
  title: string;
  updated_at: string;
}

interface Memory {
  id: string;
  memory_key: string;
  memory_value: string;
  category: string;
  updated_at: string;
}

const AGENT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-agent`;

async function agentFetch(path: string, options: RequestInit = {}) {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token ?? import.meta.env.VITE_SUPABASE_ANON_KEY;
  const res = await fetch(`${AGENT_URL}${path}`, {
    ...options,
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...(options.headers ?? {}),
    },
  });
  if (!res.ok) throw new Error(`Agent error ${res.status}`);
  return res.json();
}

const SUGGESTED_PROMPTS = [
  "What's the current health of my school platform?",
  "How can I improve student engagement?",
  "Explain any compliance issues I should be aware of.",
  "What reward strategies work best for this age group?",
  "Help me write an announcement for students.",
  "How do I onboard new teachers?",
];

export function AdminAIAgent() {
  const { user } = useAuthStore();
  const [isExpanded, setIsExpanded] = useState(false);
  const [showMemory, setShowMemory] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [memories, setMemories] = useState<Memory[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    if (isExpanded) scrollToBottom();
  }, [messages, isExpanded, scrollToBottom]);

  useEffect(() => {
    if (isExpanded && conversations.length === 0) {
      loadConversations();
    }
  }, [isExpanded]);

  const loadConversations = async () => {
    try {
      const data = await agentFetch('/conversations');
      setConversations(data.conversations ?? []);
    } catch { /* silent */ }
  };

  const loadMemory = async () => {
    try {
      const data = await agentFetch('/memory');
      setMemories(data.memories ?? []);
    } catch { /* silent */ }
  };

  const loadConversation = async (id: string) => {
    setLoadingHistory(true);
    try {
      const data = await agentFetch(`/conversations/${id}`);
      setMessages(data.messages ?? []);
      setConversationId(id);
      setShowHistory(false);
    } catch {
      toast.error('Failed to load conversation');
    } finally {
      setLoadingHistory(false);
    }
  };

  const startNewConversation = () => {
    setMessages([]);
    setConversationId(null);
    setShowHistory(false);
    inputRef.current?.focus();
  };

  const sendMessage = async (text?: string) => {
    const msg = (text ?? input).trim();
    if (!msg || loading) return;

    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: msg }]);
    setLoading(true);

    try {
      const data = await agentFetch('/chat', {
        method: 'POST',
        body: JSON.stringify({ message: msg, conversation_id: conversationId }),
      });

      setMessages(prev => [...prev, { role: 'assistant', content: data.reply }]);
      if (data.conversation_id && !conversationId) {
        setConversationId(data.conversation_id);
        loadConversations();
      }
    } catch {
      toast.error('Agent failed to respond. Check API key configuration.');
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please ensure an AI API key (ANTHROPIC_API_KEY or HUGGING_FACE_API_KEY) is configured in your Supabase Edge Function secrets.',
      }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const formatTime = (iso: string) => {
    return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setIsExpanded(v => !v)}
        className="w-full flex items-center justify-between px-6 py-4 hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="bg-gradient-to-br from-blue-500 to-cyan-500 p-2 rounded-lg">
            <Brain className="h-5 w-5 text-white" />
          </div>
          <div className="text-left">
            <h3 className="font-semibold text-gray-900">Admin AI Agent</h3>
            <p className="text-xs text-gray-500">Adaptive assistant with memory — knows your school</p>
          </div>
          <span className="ml-2 flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></span>
            <span className="text-xs text-green-600 font-medium">Live</span>
          </span>
        </div>
        {isExpanded ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
      </button>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <div className="border-t border-gray-100">
              {/* Toolbar */}
              <div className="flex items-center gap-2 px-4 py-2 bg-gray-50 border-b border-gray-100">
                <button
                  onClick={startNewConversation}
                  className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <Plus className="h-3.5 w-3.5" /> New Chat
                </button>
                <button
                  onClick={() => { setShowHistory(v => !v); setShowMemory(false); loadConversations(); }}
                  className={`flex items-center gap-1 px-3 py-1.5 text-xs font-medium border rounded-lg transition-colors ${showHistory ? 'bg-blue-50 text-blue-700 border-blue-200' : 'text-gray-700 bg-white border-gray-200 hover:bg-gray-50'}`}
                >
                  <MessageSquare className="h-3.5 w-3.5" /> History
                </button>
                <button
                  onClick={() => { setShowMemory(v => !v); setShowHistory(false); loadMemory(); }}
                  className={`flex items-center gap-1 px-3 py-1.5 text-xs font-medium border rounded-lg transition-colors ${showMemory ? 'bg-blue-50 text-blue-700 border-blue-200' : 'text-gray-700 bg-white border-gray-200 hover:bg-gray-50'}`}
                >
                  <Database className="h-3.5 w-3.5" /> Memory
                </button>
              </div>

              {/* History Panel */}
              <AnimatePresence>
                {showHistory && (
                  <motion.div
                    initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }}
                    className="overflow-hidden border-b border-gray-100"
                  >
                    <div className="p-3 bg-gray-50 max-h-48 overflow-y-auto space-y-1">
                      {conversations.length === 0 ? (
                        <p className="text-xs text-gray-500 text-center py-2">No previous conversations</p>
                      ) : conversations.map(c => (
                        <button
                          key={c.id}
                          onClick={() => loadConversation(c.id)}
                          className={`w-full text-left px-3 py-2 rounded-lg text-xs hover:bg-white transition-colors border ${conversationId === c.id ? 'bg-white border-blue-200 text-blue-700' : 'border-transparent text-gray-700'}`}
                        >
                          <p className="font-medium truncate">{c.title}</p>
                          <p className="text-gray-400 mt-0.5">{formatTime(c.updated_at)}</p>
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Memory Panel */}
              <AnimatePresence>
                {showMemory && (
                  <motion.div
                    initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }}
                    className="overflow-hidden border-b border-gray-100"
                  >
                    <div className="p-3 bg-gray-50 max-h-48 overflow-y-auto space-y-1">
                      <p className="text-xs text-gray-500 mb-2">Things the agent remembers about your school:</p>
                      {memories.length === 0 ? (
                        <p className="text-xs text-gray-400 text-center py-2">No memories yet — they build up as you chat</p>
                      ) : memories.map(m => (
                        <div key={m.id} className="bg-white border border-gray-100 rounded-lg px-3 py-2 text-xs">
                          <div className="flex items-center justify-between">
                            <span className="font-medium text-gray-700">{m.memory_key}</span>
                            <span className="text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded text-xs">{m.category}</span>
                          </div>
                          <p className="text-gray-600 mt-0.5">{m.memory_value}</p>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Messages */}
              <div className="h-80 overflow-y-auto p-4 space-y-4 bg-white">
                {loadingHistory && (
                  <div className="flex justify-center py-8">
                    <Loader className="h-5 w-5 animate-spin text-gray-400" />
                  </div>
                )}

                {!loadingHistory && messages.length === 0 && (
                  <div className="space-y-4">
                    <div className="text-center pt-4">
                      <div className="bg-gradient-to-br from-blue-500 to-cyan-500 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3">
                        <Brain className="h-6 w-6 text-white" />
                      </div>
                      <p className="text-sm font-semibold text-gray-800">Hi {user?.name?.split(' ')[0] ?? 'Admin'}, I'm your school AI agent.</p>
                      <p className="text-xs text-gray-500 mt-1">I know your school's live data and remember past conversations.</p>
                    </div>
                    <div className="grid grid-cols-1 gap-2 mt-4">
                      {SUGGESTED_PROMPTS.map((p, i) => (
                        <button
                          key={i}
                          onClick={() => sendMessage(p)}
                          className="text-left px-3 py-2 text-xs text-gray-700 bg-gray-50 hover:bg-blue-50 hover:text-blue-700 border border-gray-100 hover:border-blue-200 rounded-lg transition-colors"
                        >
                          {p}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {!loadingHistory && messages.map((msg, i) => (
                  <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm ${
                      msg.role === 'user'
                        ? 'bg-blue-600 text-white rounded-br-sm'
                        : 'bg-gray-100 text-gray-800 rounded-bl-sm'
                    }`}>
                      <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                    </div>
                  </div>
                ))}

                {loading && (
                  <div className="flex justify-start">
                    <div className="bg-gray-100 rounded-2xl rounded-bl-sm px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '0ms' }}></span>
                        <span className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '150ms' }}></span>
                        <span className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '300ms' }}></span>
                      </div>
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              <div className="border-t border-gray-100 p-3 bg-gray-50">
                <div className="flex items-end gap-2">
                  <textarea
                    ref={inputRef}
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Ask about your school, students, compliance, or anything..."
                    rows={1}
                    className="flex-1 resize-none rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder-gray-400"
                    style={{ minHeight: '42px', maxHeight: '120px' }}
                    onInput={e => {
                      const t = e.currentTarget;
                      t.style.height = 'auto';
                      t.style.height = `${Math.min(t.scrollHeight, 120)}px`;
                    }}
                    disabled={loading}
                  />
                  <button
                    onClick={() => sendMessage()}
                    disabled={loading || !input.trim()}
                    className="flex-shrink-0 w-10 h-10 flex items-center justify-center bg-blue-600 hover:bg-blue-700 disabled:bg-gray-200 text-white rounded-xl transition-colors"
                  >
                    {loading ? <Loader className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  </button>
                </div>
                <p className="text-xs text-gray-400 mt-1.5 ml-1">Press Enter to send · Shift+Enter for new line</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

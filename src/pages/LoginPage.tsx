import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

export function LoginPage() {
  const navigate = useNavigate();
  const { signIn, loading, error, clearError, user } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  useEffect(() => {
    if (user) navigate('/app');
  }, [user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    await signIn(email, password);
  };

  return (
    <div className="min-h-screen bg-[#050505] flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-orange-500/10 border border-orange-500/30 mb-4">
            <span className="text-orange-400 text-xl font-bold">₿</span>
          </div>
          <h1 className="text-white text-xl font-semibold">SatsRewards</h1>
          <p className="text-gray-500 text-sm mt-1">Learn, Earn, Stack Sats</p>
        </div>

        <div className="bg-[#0d0d0d] border border-white/10 rounded-xl p-6">
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="email" className="text-orange-400 text-sm font-medium">Email</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={e => { setEmail(e.target.value); if (error) clearError(); }}
                placeholder="you@example.com"
                required
                disabled={loading}
                className="bg-[#0a0a0a] border border-white/10 text-white placeholder-gray-600 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-orange-500/50 disabled:opacity-50 transition-colors"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="password" className="text-orange-400 text-sm font-medium">Password</label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={e => { setPassword(e.target.value); if (error) clearError(); }}
                placeholder="••••••••"
                required
                disabled={loading}
                className="bg-[#0a0a0a] border border-white/10 text-white placeholder-gray-600 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-orange-500/50 disabled:opacity-50 transition-colors"
              />
            </div>

            {error && (
              <p className="text-red-400 text-sm">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-orange-500 hover:bg-orange-400 disabled:bg-orange-500/40 text-white font-semibold py-2.5 rounded-lg text-sm transition-colors mt-1"
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

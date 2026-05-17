import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { Mail, Lock, Loader, AlertCircle } from 'lucide-react';

export function LoginPage() {
  const navigate = useNavigate();
  const { signIn, loading, error, clearError, user } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [validation, setValidation] = useState<{ email?: string; password?: string }>({});

  useEffect(() => {
    if (user) {
      navigate('/app');
    }
  }, [user, navigate]);

  const validateForm = () => {
    const newValidation: { email?: string; password?: string } = {};

    if (!email.trim()) {
      newValidation.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newValidation.email = 'Please enter a valid email address';
    }

    if (!password) {
      newValidation.password = 'Password is required';
    } else if (password.length < 6) {
      newValidation.password = 'Password must be at least 6 characters';
    }

    setValidation(newValidation);
    return Object.keys(newValidation).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();

    if (!validateForm()) {
      return;
    }

    await signIn(email, password);
  };

  const handleInputChange = (field: 'email' | 'password', value: string) => {
    if (field === 'email') {
      setEmail(value);
    } else {
      setPassword(value);
    }

    if (validation[field]) {
      setValidation(prev => ({ ...prev, [field]: undefined }));
    }

    if (error) {
      clearError();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-lg shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-8 py-12 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-white rounded-full mb-4">
              <svg className="w-8 h-8 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z" />
              </svg>
            </div>
            <h1 className="text-3xl font-bold text-white mb-2">SatsRewards</h1>
            <p className="text-blue-100">Learn, Earn, and Grow Together</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="px-8 py-8">
            {/* Error Message */}
            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-red-900 text-sm">{error}</p>
                  <p className="text-red-700 text-xs mt-1">Please check your credentials and try again.</p>
                </div>
              </div>
            )}

            {/* Email Field */}
            <div className="mb-5">
              <label htmlFor="email" className="block text-sm font-semibold text-gray-800 mb-2">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={e => handleInputChange('email', e.target.value)}
                  placeholder="you@example.com"
                  className={`w-full pl-10 pr-4 py-3 border-2 rounded-lg transition-colors ${
                    validation.email
                      ? 'border-red-300 bg-red-50 focus:outline-none focus:border-red-400'
                      : 'border-gray-200 bg-gray-50 focus:outline-none focus:border-blue-400 focus:bg-white'
                  }`}
                  disabled={loading}
                />
              </div>
              {validation.email && (
                <p className="text-red-600 text-sm mt-2 flex items-center gap-1">
                  <span className="text-red-600">•</span> {validation.email}
                </p>
              )}
            </div>

            {/* Password Field */}
            <div className="mb-6">
              <label htmlFor="password" className="block text-sm font-semibold text-gray-800 mb-2">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={e => handleInputChange('password', e.target.value)}
                  placeholder="••••••••"
                  className={`w-full pl-10 pr-4 py-3 border-2 rounded-lg transition-colors ${
                    validation.password
                      ? 'border-red-300 bg-red-50 focus:outline-none focus:border-red-400'
                      : 'border-gray-200 bg-gray-50 focus:outline-none focus:border-blue-400 focus:bg-white'
                  }`}
                  disabled={loading}
                />
              </div>
              {validation.password && (
                <p className="text-red-600 text-sm mt-2 flex items-center gap-1">
                  <span className="text-red-600">•</span> {validation.password}
                </p>
              )}
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 disabled:from-gray-400 disabled:to-gray-500 text-white font-semibold py-3 rounded-lg transition-all duration-200 flex items-center justify-center gap-2 mb-4"
            >
              {loading ? (
                <>
                  <Loader className="w-5 h-5 animate-spin" />
                  <span>Signing In...</span>
                </>
              ) : (
                <span>Sign In</span>
              )}
            </button>

            {/* Demo Credentials Info */}
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-100">
              <p className="text-xs text-gray-600 mb-2 font-semibold">Demo Credentials:</p>
              <p className="text-xs text-gray-700 mb-1">
                <span className="font-medium">Email:</span> demo@example.com
              </p>
              <p className="text-xs text-gray-700">
                <span className="font-medium">Password:</span> password123
              </p>
            </div>
          </form>

          {/* Footer */}
          <div className="bg-gray-50 px-8 py-4 border-t border-gray-100 text-center">
            <p className="text-gray-600 text-sm">
              Experience the future of learning and earning
            </p>
          </div>
        </div>

        {/* Security Notice */}
        <div className="mt-8 text-center text-gray-400 text-xs">
          <p>
            Your data is encrypted and secure. We use industry-standard security practices.
          </p>
        </div>
      </div>
    </div>
  );
}

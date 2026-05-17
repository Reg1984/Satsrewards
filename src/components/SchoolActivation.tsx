import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Shield, CheckCircle, XCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';

export function SchoolActivation() {
  const { user } = useAuthStore();
  const [activationCode, setActivationCode] = useState('');
  const [error, setError] = useState('');
  const queryClient = useQueryClient();

  const { data: school } = useQuery({
    queryKey: ['school', user?.school_id],
    queryFn: async () => {
      const { data } = await supabase
        .from('schools')
        .select('*')
        .eq('id', user?.school_id)
        .single();
      return data;
    },
    enabled: !!user?.school_id
  });

  const activateMutation = useMutation({
    mutationFn: async (code: string) => {
      const { data, error } = await supabase
        .from('schools')
        .update({ 
          subscription_status: 'active',
          activated_at: new Date().toISOString(),
          subscription_start_date: new Date().toISOString(),
          subscription_end_date: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()
        })
        .eq('id', user?.school_id)
        .eq('activation_code', code)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['school'] });
    }
  });

  const handleActivation = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setError('');
      await activateMutation.mutateAsync(activationCode);
    } catch (err) {
      setError('Invalid activation code');
    }
  };

  if (!school) return null;

  if (school.subscription_status === 'active') {
    return (
      <div className="bg-green-50 rounded-xl p-6 flex items-center space-x-4">
        <CheckCircle className="h-8 w-8 text-green-500" />
        <div>
          <h3 className="font-semibold text-green-900">School Activated</h3>
          <p className="text-green-700">Your school subscription is active and ready to use.</p>
        </div>
      </div>
    );
  }

  if (school.subscription_status === 'trial') {
    const trialEnds = new Date(school.trial_ends_at);
    const daysLeft = Math.ceil((trialEnds.getTime() - Date.now()) / (1000 * 60 * 60 * 24));

    return (
      <div className="bg-yellow-50 rounded-xl p-6">
        <div className="flex items-center space-x-4">
          <Shield className="h-8 w-8 text-yellow-500" />
          <div>
            <h3 className="font-semibold text-yellow-900">Trial Mode</h3>
            <p className="text-yellow-700">{daysLeft} days remaining in your trial</p>
          </div>
        </div>
        
        <form onSubmit={handleActivation} className="mt-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Activation Code
              </label>
              <input
                type="text"
                value={activationCode}
                onChange={(e) => setActivationCode(e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500"
                placeholder="Enter your activation code"
              />
            </div>
            
            {error && (
              <p className="text-sm text-red-600">{error}</p>
            )}

            <button
              type="submit"
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-orange-600 hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
            >
              Activate School
            </button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="bg-red-50 rounded-xl p-6 flex items-center space-x-4">
      <XCircle className="h-8 w-8 text-red-500" />
      <div>
        <h3 className="font-semibold text-red-900">Subscription Inactive</h3>
        <p className="text-red-700">Please contact support to activate your school subscription.</p>
      </div>
    </div>
  );
}
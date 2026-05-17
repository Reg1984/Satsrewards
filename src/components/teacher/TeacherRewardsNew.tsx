import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Trophy, Plus, CreditCard as Edit2, Trash2, Check, X, AlertTriangle, Download } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/authStore';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';

interface RewardRule {
  id: string;
  name: string;
  description: string;
  sats_amount: number;
  category: string;
  active: boolean;
  class_id?: string;
}

export function TeacherRewardsNew() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [isCreating, setIsCreating] = useState(false);
  const [editingRule, setEditingRule] = useState<RewardRule | null>(null);

  // Fetch school balance
  const { data: schoolData, isLoading: isLoadingSchool, error: schoolError } = useQuery({
    queryKey: ['school-balance', user?.school_id],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from('schools')
          .select('id, name, school_balance')
          .eq('id', user?.school_id)
          .single();
        
        if (error) {
          console.error('Error fetching school balance:', error);
          throw error;
        }
        
        return data;
      } catch (error) {
        console.error('Error fetching school balance:', error);
        throw error;
      }
    },
    enabled: !!user?.school_id,
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000)
  });

  const { data: rules, isLoading: isLoadingRules, error: rulesError } = useQuery({
    queryKey: ['reward-rules', user?.school_id],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from('reward_rules')
          .select('*')
          .eq('school_id', user?.school_id)
          .order('created_at', { ascending: false });

        if (error) {
          console.error('Error fetching reward rules:', error);
          throw error;
        }
        
        return data as RewardRule[];
      } catch (error) {
        console.error('Error fetching reward rules:', error);
        throw error;
      }
    },
    enabled: !!user?.school_id,
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000)
  });

  const createMutation = useMutation({
    mutationFn: async (newRule: Partial<RewardRule>) => {
      try {
        // Check if school has enough balance
        if (schoolData && schoolData.school_balance < newRule.sats_amount!) {
          throw new Error('School does not have enough balance for this reward');
        }

        const { data, error } = await supabase
          .from('reward_rules')
          .insert({
            ...newRule,
            school_id: user?.school_id,
            created_by: user?.id
          })
          .select()
          .single();

        if (error) {
          console.error('Error creating reward rule:', error);
          throw error;
        }
        
        return data;
      } catch (error) {
        console.error('Error creating reward rule:', error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reward-rules'] });
      setIsCreating(false);
      toast.success('Reward rule created successfully');
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Failed to create reward rule');
    }
  });

  const updateMutation = useMutation({
    mutationFn: async (rule: RewardRule) => {
      try {
        const { data, error } = await supabase
          .from('reward_rules')
          .update(rule)
          .eq('id', rule.id)
          .select()
          .single();

        if (error) {
          console.error('Error updating reward rule:', error);
          throw error;
        }
        
        return data;
      } catch (error) {
        console.error('Error updating reward rule:', error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reward-rules'] });
      setEditingRule(null);
      toast.success('Reward rule updated successfully');
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Failed to update reward rule');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      try {
        const { error } = await supabase
          .from('reward_rules')
          .delete()
          .eq('id', id);

        if (error) {
          console.error('Error deleting reward rule:', error);
          throw error;
        }
      } catch (error) {
        console.error('Error deleting reward rule:', error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reward-rules'] });
      toast.success('Reward rule deleted successfully');
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Failed to delete reward rule');
    }
  });

  if (isLoadingSchool || isLoadingRules) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading rewards data...</p>
        </div>
      </div>
    );
  }

  if (schoolError || rulesError) {
    return (
      <div className="p-6 bg-red-50 rounded-lg">
        <div className="flex items-start space-x-3 text-red-600">
          <AlertTriangle className="h-6 w-6 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium">Error Loading Rewards Data</p>
            <p className="text-sm mt-1">
              {schoolError instanceof Error 
                ? schoolError.message 
                : rulesError instanceof Error 
                  ? rulesError.message 
                  : 'An unexpected error occurred'}
            </p>
            <button 
              onClick={() => window.location.reload()}
              className="mt-3 px-3 py-1 bg-red-100 text-red-700 rounded-md hover:bg-red-200 transition-colors text-sm"
            >
              Refresh Page
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 min-h-screen">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Trophy className="h-6 w-6 text-orange-500" />
          <h2 className="text-xl font-semibold text-gray-900">Reward Rules</h2>
        </div>
        <div className="flex items-center space-x-4">
          <div className="bg-orange-50 px-4 py-2 rounded-lg">
            <span className="text-sm text-orange-800">
              School Balance: <span className="font-semibold">{schoolData?.school_balance || 0} SATs</span>
            </span>
          </div>
          <Link
            to="/app/funding"
            className="btn-neu flex items-center text-orange-600"
          >
            <Download className="h-4 w-4 mr-2" />
            Add Funds
          </Link>
          {!isCreating && !editingRule && (
            <button
              onClick={() => setIsCreating(true)}
              className="btn-neu flex items-center text-orange-600"
            >
              <Plus className="h-4 w-4 mr-2" />
              New Rule
            </button>
          )}
        </div>
      </div>

      {/* School balance warning */}
      {schoolData?.school_balance === 0 && (
        <div className="bg-yellow-50 p-4 rounded-lg">
          <div className="flex">
            <AlertTriangle className="h-5 w-5 text-yellow-400 mr-2" />
            <div>
              <h3 className="text-sm font-medium text-yellow-800">School balance is empty</h3>
              <p className="text-sm text-yellow-700 mt-1">
                Your school has no SATs balance. Please visit the Funding page to add SATs to your school wallet.
              </p>
              <div className="mt-3">
                <Link
                  to="/app/funding"
                  className="text-sm font-medium text-yellow-800 hover:text-yellow-700"
                >
                  Go to Funding →
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}

      {(isCreating || editingRule) && (
        <div className="bg-white rounded-lg shadow-sm p-6">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              const ruleData = {
                name: formData.get('name') as string,
                description: formData.get('description') as string,
                sats_amount: parseInt(formData.get('sats_amount') as string),
                category: formData.get('category') as string,
                class_id: formData.get('class_id') as string || undefined,
                active: true
              };

              if (editingRule) {
                updateMutation.mutate({ ...editingRule, ...ruleData });
              } else {
                createMutation.mutate(ruleData);
              }
            }}
            className="space-y-4"
          >
            <div>
              <label className="block text-sm font-medium text-gray-700">Name</label>
              <input
                type="text"
                name="name"
                defaultValue={editingRule?.name}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Description</label>
              <textarea
                name="description"
                defaultValue={editingRule?.description}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500"
                rows={3}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">SATs Amount</label>
              <input
                type="number"
                name="sats_amount"
                defaultValue={editingRule?.sats_amount}
                min="1"
                max={schoolData?.school_balance || 1000}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500"
                required
              />
              {schoolData?.school_balance !== undefined && (
                <p className="text-xs text-gray-500 mt-1">
                  Available: {schoolData.school_balance} SATs
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Category</label>
              <select
                name="category"
                defaultValue={editingRule?.category}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500"
                required
              >
                <option value="attendance">Attendance</option>
                <option value="homework">Homework</option>
                <option value="participation">Participation</option>
                <option value="achievement">Achievement</option>
                <option value="behavior">Behavior</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Class (Optional)</label>
              <input
                type="text"
                name="class_id"
                defaultValue={editingRule?.class_id}
                placeholder="Leave empty for school-wide rule"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500"
              />
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={() => {
                  setIsCreating(false);
                  setEditingRule(null);
                }}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-sm font-medium text-white bg-orange-500 rounded-md hover:bg-orange-600"
              >
                {editingRule ? 'Update Rule' : 'Create Rule'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4">
        {rules?.map((rule) => (
          <div
            key={rule.id}
            className="bg-white rounded-lg shadow-sm p-6 flex items-center justify-between"
          >
            <div>
              <h3 className="text-lg font-medium text-gray-900">{rule.name}</h3>
              <p className="text-sm text-gray-500">{rule.description}</p>
              <div className="mt-2 flex items-center space-x-4">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                  {rule.sats_amount} sats
                </span>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                  {rule.category}
                </span>
                {rule.class_id && (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    Class: {rule.class_id}
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setEditingRule(rule)}
                className="p-2 text-gray-400 hover:text-gray-500"
              >
                <Edit2 className="h-5 w-5" />
              </button>
              <button
                onClick={() => {
                  if (confirm('Are you sure you want to delete this rule?')) {
                    deleteMutation.mutate(rule.id);
                  }
                }}
                className="p-2 text-gray-400 hover:text-red-500"
              >
                <Trash2 className="h-5 w-5" />
              </button>
              <button
                onClick={() => updateMutation.mutate({ ...rule, active: !rule.active })}
                className={`p-2 ${rule.active ? 'text-green-500' : 'text-gray-400'}`}
              >
                {rule.active ? (
                  <Check className="h-5 w-5" />
                ) : (
                  <X className="h-5 w-5" />
                )}
              </button>
            </div>
          </div>
        ))}

        {!rules?.length && !isCreating && (
          <div className="bg-gray-50 p-8 text-center rounded-lg">
            <p className="text-gray-500">No reward rules found. Create your first rule to start rewarding students!</p>
          </div>
        )}
      </div>
    </div>
  );
}
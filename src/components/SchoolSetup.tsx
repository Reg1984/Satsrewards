import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { School, GraduationCap, Trophy, Users, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';

const schoolSchema = z.object({
  name: z.string().min(3, 'School name must be at least 3 characters'),
  domain: z.string().email('Must be a valid email domain'),
  country: z.string().min(2, 'Please select a country'),
  timezone: z.string(),
  subscription_tier: z.enum(['free', 'premium', 'enterprise']),
  max_students: z.number().min(1),
  settings: z.object({
    minimum_withdrawal: z.number().min(0),
    maximum_daily_rewards: z.number().min(0),
    allowed_withdrawal_days: z.array(z.string()),
    require_parent_approval: z.boolean()
  })
});

type SchoolFormData = z.infer<typeof schoolSchema>;

export function SchoolSetup() {
  const [step, setStep] = useState(1);
  const { user } = useAuthStore();
  const { register, handleSubmit, formState: { errors } } = useForm<SchoolFormData>({
    resolver: zodResolver(schoolSchema),
    defaultValues: {
      subscription_tier: 'free',
      max_students: 100,
      settings: {
        minimum_withdrawal: 100,
        maximum_daily_rewards: 1000,
        allowed_withdrawal_days: ['monday', 'wednesday', 'friday'],
        require_parent_approval: true
      }
    }
  });

  const onSubmit = async (data: SchoolFormData) => {
    try {
      const { data: school, error } = await supabase
        .from('schools')
        .insert({
          ...data,
          compliance_status: {
            kyc_verified: false,
            age_verification: false,
            parent_consent_required: true
          }
        })
        .select()
        .single();

      if (error) throw error;

      // Update user's profile with school_id
      if (school) {
        await supabase
          .from('profiles')
          .update({ school_id: school.id, role: 'admin' })
          .eq('id', user?.id);
      }

      setStep(2);
    } catch (error) {
      console.error('Error creating school:', error);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-8 flex items-center space-x-3">
        <School className="h-8 w-8 text-orange-500" />
        <h1 className="text-2xl font-bold text-gray-900">School Setup</h1>
      </div>

      {step === 1 && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-6">Basic Information</h2>
          
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700">School Name</label>
              <input
                type="text"
                {...register('name')}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500"
              />
              {errors.name && (
                <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">School Domain</label>
              <input
                type="text"
                {...register('domain')}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500"
              />
              {errors.domain && (
                <p className="mt-1 text-sm text-red-600">{errors.domain.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Country</label>
              <select
                {...register('country')}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500"
              >
                <option value="">Select a country</option>
                <option value="US">United States</option>
                <option value="GB">United Kingdom</option>
                <option value="SV">El Salvador</option>
                {/* Add more countries */}
              </select>
              {errors.country && (
                <p className="mt-1 text-sm text-red-600">{errors.country.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Timezone</label>
              <select
                {...register('timezone')}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500"
              >
                <option value="UTC">UTC</option>
                <option value="America/New_York">Eastern Time</option>
                <option value="America/Chicago">Central Time</option>
                <option value="America/Denver">Mountain Time</option>
                <option value="America/Los_Angeles">Pacific Time</option>
                {/* Add more timezones */}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Subscription Tier</label>
              <div className="mt-2 grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="relative rounded-lg border border-gray-300 bg-white p-4 shadow-sm cursor-pointer hover:border-orange-500">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="text-sm">
                        <p className="font-medium text-gray-900">Free</p>
                        <p className="text-gray-500">Basic features</p>
                      </div>
                    </div>
                    <input
                      type="radio"
                      {...register('subscription_tier')}
                      value="free"
                      className="h-4 w-4 text-orange-500 focus:ring-orange-500"
                    />
                  </div>
                </div>

                <div className="relative rounded-lg border border-gray-300 bg-white p-4 shadow-sm cursor-pointer hover:border-orange-500">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="text-sm">
                        <p className="font-medium text-gray-900">Premium</p>
                        <p className="text-gray-500">Advanced features</p>
                      </div>
                    </div>
                    <input
                      type="radio"
                      {...register('subscription_tier')}
                      value="premium"
                      className="h-4 w-4 text-orange-500 focus:ring-orange-500"
                    />
                  </div>
                </div>

                <div className="relative rounded-lg border border-gray-300 bg-white p-4 shadow-sm cursor-pointer hover:border-orange-500">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="text-sm">
                        <p className="font-medium text-gray-900">Enterprise</p>
                        <p className="text-gray-500">Custom solutions</p>
                      </div>
                    </div>
                    <input
                      type="radio"
                      {...register('subscription_tier')}
                      value="enterprise"
                      className="h-4 w-4 text-orange-500 focus:ring-orange-500"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-6">
              <button
                type="submit"
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-orange-500 hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
              >
                Continue to Compliance Setup
              </button>
            </div>
          </form>
        </div>
      )}

      {step === 2 && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-6">Setup Complete!</h2>
          <div className="space-y-4">
            <div className="flex items-center text-green-500">
              <Trophy className="h-6 w-6 mr-2" />
              <span>Reward system is ready</span>
            </div>
            <div className="flex items-center text-green-500">
              <Users className="h-6 w-6 mr-2" />
              <span>You can now invite teachers and students</span>
            </div>
            <div className="flex items-center text-green-500">
              <GraduationCap className="h-6 w-6 mr-2" />
              <span>Educational content is available</span>
            </div>
            
            <div className="mt-8 p-4 bg-orange-50 rounded-lg">
              <div className="flex items-start">
                <AlertCircle className="h-5 w-5 text-orange-500 mt-0.5 mr-2" />
                <div>
                  <h3 className="text-sm font-medium text-orange-800">Next Steps</h3>
                  <ul className="mt-2 text-sm text-orange-700 list-disc list-inside">
                    <li>Set up your first class</li>
                    <li>Create reward rules</li>
                    <li>Invite your teachers</li>
                    <li>Review compliance requirements</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
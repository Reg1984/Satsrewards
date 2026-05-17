import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';
import { ImageUpload } from './ImageUpload';
import { toast } from 'sonner';

export function StudentProfile() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(user?.name || '');

  const updateProfileMutation = useMutation({
    mutationFn: async (data: { name?: string; image_url?: string }) => {
      const { error } = await supabase
        .from('profiles')
        .update(data)
        .eq('id', user?.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      toast.success('Profile updated successfully');
      setIsEditing(false);
    },
    onError: (error) => {
      toast.error('Failed to update profile');
      console.error('Error updating profile:', error);
    },
  });

  const handleImageUpload = async (url: string) => {
    try {
      await updateProfileMutation.mutateAsync({ image_url: url });
    } catch (error) {
      console.error('Error updating profile image:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updateProfileMutation.mutateAsync({ name });
    } catch (error) {
      console.error('Error updating profile:', error);
    }
  };

  return (
    <div className="card-neu">
      <h2 className="text-xl font-semibold text-gray-900 mb-6">Your Profile</h2>

      <div className="space-y-8">
        <div>
          <ImageUpload
            onUpload={handleImageUpload}
            currentImageUrl={user?.image_url}
          />
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Display Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={!isEditing}
              className="input-neu w-full"
              placeholder="Your name"
            />
          </div>

          <div className="flex justify-end space-x-3">
            {isEditing ? (
              <>
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="btn-neu text-gray-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-neu text-orange-600"
                >
                  Save Changes
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => setIsEditing(true)}
                className="btn-neu text-orange-600"
              >
                Edit Profile
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
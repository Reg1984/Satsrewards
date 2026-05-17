import React, { useState } from 'react';
import { Camera, Upload, X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';
import { toast } from 'sonner';

interface ImageUploadProps {
  onUpload: (url: string) => void;
  currentImageUrl?: string;
  studentId?: string;
}

export function ImageUpload({ onUpload, currentImageUrl, studentId }: ImageUploadProps) {
  const [uploading, setUploading] = useState(false);
  const { user } = useAuthStore();

  const uploadImage = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setUploading(true);

      if (!event.target.files || event.target.files.length === 0) {
        throw new Error('You must select an image to upload.');
      }

      const file = event.target.files[0];
      
      // Validate file type
      if (!file.type.startsWith('image/')) {
        throw new Error('Please upload an image file.');
      }

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        throw new Error('Image size must be less than 5MB.');
      }

      const fileExt = file.name.split('.').pop()?.toLowerCase();
      const allowedExtensions = ['jpg', 'jpeg', 'png', 'gif'];
      
      if (!fileExt || !allowedExtensions.includes(fileExt)) {
        throw new Error('Please upload a JPG, PNG, or GIF file.');
      }

      // Generate a unique filename
      const fileName = `${studentId || user?.id}-${Date.now()}.${fileExt}`;
      const filePath = `student-images/${fileName}`;

      // Upload image to Supabase Storage
      const { error: uploadError, data } = await supabase.storage
        .from('student-images')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        throw uploadError;
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('student-images')
        .getPublicUrl(filePath);

      onUpload(publicUrl);
      toast.success('Image uploaded successfully');
    } catch (error) {
      console.error('Error uploading image:', error);
      toast.error(error instanceof Error ? error.message : 'Error uploading image');
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveImage = async () => {
    try {
      if (currentImageUrl) {
        // Extract file path from URL
        const filePath = currentImageUrl.split('/').pop();
        if (filePath) {
          await supabase.storage
            .from('student-images')
            .remove([`student-images/${filePath}`]);
        }
      }
      onUpload('');
      toast.success('Image removed successfully');
    } catch (error) {
      console.error('Error removing image:', error);
      toast.error('Error removing image');
    }
  };

  return (
    <div className="space-y-4">
      {currentImageUrl ? (
        <div className="relative">
          <img
            src={currentImageUrl}
            alt="Profile"
            className="w-32 h-32 rounded-full object-cover border-2 border-gray-200"
          />
          <button
            onClick={handleRemoveImage}
            className="absolute -top-2 -right-2 p-1.5 bg-red-100 rounded-full text-red-600 hover:bg-red-200 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <div className="flex items-center justify-center w-32 h-32 bg-gray-100 rounded-full border-2 border-dashed border-gray-300">
          <Camera className="h-8 w-8 text-gray-400" />
        </div>
      )}

      <div>
        <label className="flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 cursor-pointer transition-colors">
          <Upload className="h-4 w-4 mr-2" />
          {uploading ? 'Uploading...' : 'Upload Image'}
          <input
            type="file"
            className="hidden"
            accept="image/jpeg,image/png,image/gif"
            onChange={uploadImage}
            disabled={uploading}
          />
        </label>
        <p className="mt-2 text-xs text-gray-500">
          JPG, PNG or GIF (max. 5MB)
        </p>
      </div>
    </div>
  );
}
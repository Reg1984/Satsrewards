import React, { useState, useEffect } from 'react';
import { Compass, Loader2, AlertTriangle, BookOpen, Award } from 'lucide-react';
import { Gamepad2 } from './Games';
import { recommendContent } from '../lib/ai';
import { useAuthStore } from '../store/authStore';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';

interface AILearningRecommenderProps {
  className?: string;
}

export function AILearningRecommender({ className }: AILearningRecommenderProps) {
  const [recommendations, setRecommendations] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const { user } = useAuthStore();

  // Fetch student profile and progress data
  const { data: studentData, isLoading: isLoadingStudentData } = useQuery({
    queryKey: ['student-profile-for-recommendations', user?.id],
    queryFn: async () => {
      try {
        // Get student profile
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user?.id)
          .single();

        if (profileError) throw profileError;

        // Get student progress
        const { data: progress, error: progressError } = await supabase
          .from('student_progress')
          .select(`
            *,
            content:content_id(id, title, difficulty_level, type)
          `)
          .eq('student_id', user?.id);

        if (progressError) throw progressError;

        // Get behavior records
        const { data: behavior, error: behaviorError } = await supabase
          .from('behavior_records')
          .select('*')
          .eq('student_id', user?.id)
          .order('created_at', { ascending: false })
          .limit(10);

        if (behaviorError) throw behaviorError;

        return {
          profile,
          progress: progress || [],
          behavior: behavior || []
        };
      } catch (error) {
        console.error('Error fetching student data for recommendations:', error);
        throw error;
      }
    },
    enabled: !!user?.id
  });

  // Generate recommendations when student data is loaded
  useEffect(() => {
    if (studentData && !isLoading && !recommendations) {
      handleGenerateRecommendations();
    }
  }, [studentData]);

  const handleGenerateRecommendations = async () => {
    if (!studentData) {
      toast.error('Student data not available');
      return;
    }

    setIsLoading(true);
    setError('');
    
    try {
      const response = await recommendContent(studentData, user?.id);
      
      if (response.error) {
        setError(response.error);
        toast.error('Failed to generate recommendations');
      } else {
        setRecommendations(response.content);
      }
    } catch (err) {
      console.error('Error generating recommendations:', err);
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
      toast.error('Failed to generate recommendations');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoadingStudentData) {
    return (
      <div className={`bg-white rounded-lg shadow-sm p-6 border border-gray-100 ${className}`}>
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 text-blue-500 animate-spin" />
          <span className="ml-2 text-gray-600">Loading your learning profile...</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg shadow-sm p-6 border border-gray-100 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center">
          <Compass className="h-5 w-5 text-blue-500 mr-2" />
          <h3 className="text-lg font-medium text-gray-900">Personalized Learning Path</h3>
        </div>
        {recommendations && (
          <button
            onClick={handleGenerateRecommendations}
            disabled={isLoading}
            className="text-sm text-blue-600 hover:text-blue-800"
          >
            Refresh
          </button>
        )}
      </div>
      
      <div className="space-y-4">
        {!recommendations && !isLoading && !error && (
          <p className="text-gray-600">
            Our AI will analyze your learning history and suggest personalized content to help you progress.
          </p>
        )}
        
        {isLoading && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 text-blue-500 animate-spin" />
            <span className="ml-2 text-gray-600">Generating personalized recommendations...</span>
          </div>
        )}
        
        {error && (
          <div className="p-4 bg-red-50 rounded-lg border border-red-100">
            <div className="flex items-start">
              <AlertTriangle className="h-5 w-5 text-red-500 mt-0.5 mr-2 flex-shrink-0" />
              <div>
                <h4 className="font-medium text-red-800">Error</h4>
                <p className="text-sm text-red-600 mt-1">{error}</p>
                <button
                  onClick={handleGenerateRecommendations}
                  className="mt-2 text-sm text-red-700 hover:text-red-900"
                >
                  Try Again
                </button>
              </div>
            </div>
          </div>
        )}
        
        {recommendations && (
          <div className="space-y-4">
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-100">
              <div className="whitespace-pre-line text-gray-700">
                {recommendations}
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <Link
                to="/app/learn"
                className="flex items-center justify-center p-3 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200"
              >
                <BookOpen className="h-5 w-5 mr-2" />
                Explore Lessons
              </Link>
              <Link
                to="/app/games"
                className="flex items-center justify-center p-3 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200"
              >
                <Gamepad2 className="h-5 w-5 mr-2" />
                Play Games
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
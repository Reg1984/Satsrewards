import React, { useState, useEffect } from 'react';
import { BarChart4, Loader2, AlertTriangle, TrendingUp, TrendingDown, Award } from 'lucide-react';
import { analyzePerformance } from '../lib/ai';
import { useAuthStore } from '../store/authStore';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { toast } from 'sonner';

interface AIPerformanceAnalyzerProps {
  className?: string;
  studentId?: string; // Optional: for teachers to analyze specific students
}

export function AIPerformanceAnalyzer({ className, studentId }: AIPerformanceAnalyzerProps) {
  const [analysis, setAnalysis] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const { user } = useAuthStore();
  
  // Determine which student to analyze
  const targetStudentId = studentId || user?.id;
  const isTeacherView = !!studentId && user?.role === 'teacher';

  // Fetch student performance data
  const { data: performanceData, isLoading: isLoadingPerformance } = useQuery({
    queryKey: ['student-performance-data', targetStudentId],
    queryFn: async () => {
      try {
        // Get student profile
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', targetStudentId)
          .single();

        if (profileError) throw profileError;

        // Get student progress
        const { data: progress, error: progressError } = await supabase
          .from('student_progress')
          .select(`
            *,
            content:content_id(id, title, difficulty_level, type)
          `)
          .eq('student_id', targetStudentId);

        if (progressError) throw progressError;

        // Get behavior records
        const { data: behavior, error: behaviorError } = await supabase
          .from('behavior_records')
          .select('*')
          .eq('student_id', targetStudentId)
          .order('created_at', { ascending: false });

        if (behaviorError) throw behaviorError;

        // Get attendance records
        const { data: attendance, error: attendanceError } = await supabase
          .from('attendance')
          .select('*')
          .eq('student_id', targetStudentId)
          .order('date', { ascending: false });

        if (attendanceError) throw attendanceError;

        // Get awards
        const { data: awards, error: awardsError } = await supabase
          .from('awards')
          .select('*')
          .eq('student_id', targetStudentId)
          .order('created_at', { ascending: false });

        if (awardsError) throw awardsError;

        return {
          profile,
          progress: progress || [],
          behavior: behavior || [],
          attendance: attendance || [],
          awards: awards || []
        };
      } catch (error) {
        console.error('Error fetching student performance data:', error);
        throw error;
      }
    },
    enabled: !!targetStudentId
  });

  // Generate analysis when performance data is loaded
  useEffect(() => {
    if (performanceData && !isLoading && !analysis) {
      handleGenerateAnalysis();
    }
  }, [performanceData]);

  const handleGenerateAnalysis = async () => {
    if (!performanceData) {
      toast.error('Performance data not available');
      return;
    }

    setIsLoading(true);
    setError('');
    
    try {
      const response = await analyzePerformance(performanceData, user?.id);
      
      if (response.error) {
        setError(response.error);
        toast.error('Failed to generate analysis');
      } else {
        setAnalysis(response.content);
      }
    } catch (err) {
      console.error('Error generating analysis:', err);
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
      toast.error('Failed to generate analysis');
    } finally {
      setIsLoading(false);
    }
  };

  // Calculate some basic stats for display
  const calculateStats = () => {
    if (!performanceData) return null;
    
    const completedLessons = performanceData.progress.filter(p => p.completed).length;
    const totalLessons = performanceData.progress.length;
    const completionRate = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;
    
    const positivePoints = performanceData.behavior
      .filter(b => b.type === 'positive')
      .reduce((sum, b) => sum + b.points, 0);
    
    const negativePoints = performanceData.behavior
      .filter(b => b.type === 'negative')
      .reduce((sum, b) => sum + Math.abs(b.points), 0);
    
    const behaviorScore = positivePoints - negativePoints;
    
    const presentDays = performanceData.attendance.filter(a => a.status === 'present').length;
    const totalDays = performanceData.attendance.length;
    const attendanceRate = totalDays > 0 ? Math.round((presentDays / totalDays) * 100) : 0;
    
    const totalAwards = performanceData.awards.length;
    const totalSats = performanceData.awards.reduce((sum, a) => sum + a.sats, 0);
    
    return {
      completedLessons,
      totalLessons,
      completionRate,
      behaviorScore,
      attendanceRate,
      totalAwards,
      totalSats
    };
  };

  const stats = calculateStats();

  if (isLoadingPerformance) {
    return (
      <div className={`bg-white rounded-lg shadow-sm p-6 border border-gray-100 ${className}`}>
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 text-indigo-500 animate-spin" />
          <span className="ml-2 text-gray-600">Loading performance data...</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg shadow-sm p-6 border border-gray-100 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center">
          <BarChart4 className="h-5 w-5 text-indigo-500 mr-2" />
          <h3 className="text-lg font-medium text-gray-900">
            {isTeacherView ? 'Student Performance Analysis' : 'Your Performance Analysis'}
          </h3>
        </div>
        {analysis && (
          <button
            onClick={handleGenerateAnalysis}
            disabled={isLoading}
            className="text-sm text-indigo-600 hover:text-indigo-800"
          >
            Refresh
          </button>
        )}
      </div>
      
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white shadow-sm p-3 rounded-lg text-center border border-gray-100">
            <p className="text-sm text-gray-500">Completion Rate</p>
            <p className="text-xl font-bold text-gray-800">{stats.completionRate}%</p>
            <p className="text-xs text-gray-500">{stats.completedLessons}/{stats.totalLessons} lessons</p>
          </div>
          
          <div className="bg-white shadow-sm p-3 rounded-lg text-center border border-gray-100">
            <p className="text-sm text-gray-500">Behavior Score</p>
            <p className={`text-xl font-bold ${stats.behaviorScore >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {stats.behaviorScore >= 0 ? '+' : ''}{stats.behaviorScore}
            </p>
            <p className="text-xs text-gray-500">
              {stats.behaviorScore >= 0 ? (
                <TrendingUp className="h-3 w-3 inline text-green-500 mr-1" />
              ) : (
                <TrendingDown className="h-3 w-3 inline text-red-500 mr-1" />
              )}
              Points
            </p>
          </div>
          
          <div className="bg-white shadow-sm p-3 rounded-lg text-center border border-gray-100">
            <p className="text-sm text-gray-500">Attendance</p>
            <p className="text-xl font-bold text-gray-800">{stats.attendanceRate}%</p>
            <p className="text-xs text-gray-500">Present days</p>
          </div>
          
          <div className="bg-white shadow-sm p-3 rounded-lg text-center border border-gray-100">
            <p className="text-sm text-gray-500">Total Rewards</p>
            <p className="text-xl font-bold text-orange-500">{stats.totalSats}</p>
            <p className="text-xs text-gray-500">
              <Award className="h-3 w-3 inline text-orange-500 mr-1" />
              SATs earned
            </p>
          </div>
        </div>
      )}
      
      <div className="space-y-4">
        {!analysis && !isLoading && !error && (
          <p className="text-gray-600">
            Our AI will analyze your performance data to provide personalized insights and recommendations.
          </p>
        )}
        
        {isLoading && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 text-indigo-500 animate-spin" />
            <span className="ml-2 text-gray-600">Analyzing performance data...</span>
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
                  onClick={handleGenerateAnalysis}
                  className="mt-2 text-sm text-red-700 hover:text-red-900"
                >
                  Try Again
                </button>
              </div>
            </div>
          </div>
        )}
        
        {analysis && (
          <div className="p-4 bg-indigo-50 rounded-lg border border-indigo-100">
            <div className="whitespace-pre-line text-gray-700">
              {analysis}
            </div>
          </div>
        )}
        
        {!isLoading && !analysis && !error && (
          <button
            onClick={handleGenerateAnalysis}
            className="w-full px-4 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600"
          >
            Generate Analysis
          </button>
        )}
      </div>
    </div>
  );
}
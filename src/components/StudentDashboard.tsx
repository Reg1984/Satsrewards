import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { 
  Award, 
  Users, 
  BookOpen, 
  Trophy, 
  Check, 
  Clock, 
  X, 
  AlertTriangle, 
  Brain, 
  Zap, 
  Lightbulb, 
  Flame, 
  Map, 
  ArrowRight, 
  Star, 
  BarChart4, 
  Calendar, 
  MessageSquare, 
  HelpCircle, 
  Settings, 
  Bell
} from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { supabase } from '../lib/supabase';
import { format } from 'date-fns';
import { Wallet } from './Wallet';
import { StudentProfile } from './StudentProfile';
import ZapStudent from './ZapStudent';
import { toast } from 'sonner';
import { logError, logInfo } from '../lib/errorLogging';
import { motion, AnimatePresence } from 'framer-motion';
import { useLanguage } from '../contexts/LanguageContext';
import { translations } from '../lib/translations';
import { Leaderboard } from './Leaderboard';
import { SearchBar } from './SearchBar';
import { Sidebar } from './Sidebar';

export function StudentDashboard() {
  const { user } = useAuthStore();
  const { language } = useLanguage();
  console.log('StudentDashboard: Current language is', language);
  
  const t = translations[language];
  const [learningStreak, setLearningStreak] = useState(5);
  const [nextRecommendation, setNextRecommendation] = useState({
    title: t.dashboard.nextRecommendation.title,
    description: t.dashboard.nextRecommendation.description,
    type: 'lesson',
    difficulty: 'intermediate',
    reward: 150,
    id: ''
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [level, setLevel] = useState(1);
  const [badges, setBadges] = useState(0);

  // Fetch student data with improved error handling and retries
  const { data: studentData, error: queryError, isLoading, refetch } = useQuery({
    queryKey: ['student-data', user?.id],
    queryFn: async () => {
      try {
        if (!user?.id) {
          throw new Error('No user ID available');
        }

        console.log("Fetching student data for user:", user.id);
        
        // First verify the Supabase connection
        const { data: connectionTest, error: connectionError } = await supabase
          .from('profiles')
          .select('id')
          .limit(1);

        if (connectionError) {
          console.error('Supabase connection test failed:', connectionError);
          logError(connectionError, { 
            component: 'StudentDashboard', 
            action: 'connectionTest',
            skipServerLog: true
          });
          throw new Error('Database connection failed');
        }

        console.log("Connection test passed, proceeding with main query");

        // If connection test passes, proceed with the main query
        const { data, error } = await supabase
          .from('profiles')
          .select(`
            id,
            name,
            email,
            role,
            class_id,
            school_id,
            educational_credits,
            image_url,
            student_behavior:behavior_records!behavior_records_student_id_fkey(
              id,
              type,
              category,
              points,
              created_at
            ),
            student_attendance:attendance!attendance_student_id_fkey(
              id,
              date,
              status
            ),
            student_progress:student_progress(
              id,
              content_id,
              completed,
              quiz_score,
              completed_at
            )
          `)
          .eq('id', user.id)
          .maybeSingle();

        if (error) {
          console.error('Failed to fetch student data:', error);
          logError(error, { 
            component: 'StudentDashboard', 
            action: 'fetchStudentData', 
            userId: user.id,
            skipServerLog: true
          });
          throw error;
        }

        // If no data found and in preview mode, return default data
        if (!data && user.id === '00000000-0000-0000-0000-000000000002') {
          console.log("Creating default student profile for preview mode");
          return {
            id: user.id,
            name: 'Preview Student',
            email: 'preview@example.com',
            role: 'student',
            class_id: 'PREVIEW-CLASS',
            school_id: 'PREVIEW-SCHOOL',
            educational_credits: 1000,
            image_url: 'https://images.unsplash.com/photo-1517841905240-472988babdf9',
            student_behavior: [
              {
                id: 'preview-behavior-1',
                type: 'positive',
                category: 'Participation',
                points: 50,
                created_at: new Date().toISOString()
              }
            ],
            student_attendance: [
              {
                id: 'preview-attendance-1',
                date: new Date().toISOString(),
                status: 'present'
              }
            ],
            student_progress: [
              {
                id: 'preview-progress-1',
                content_id: 'preview-content-1',
                completed: true,
                quiz_score: 85,
                completed_at: new Date().toISOString(),
                best_score: 85
              }
            ]
          };
        }

        // If no data found and not in preview mode, throw error
        if (!data) {
          console.error('No student data found for user:', user.id);
          const noDataError = new Error('No student profile found');
          logError(noDataError, { 
            component: 'StudentDashboard', 
            userId: user.id,
            skipServerLog: true
          });
          throw noDataError;
        }

        console.log("Student data fetched successfully:", data);
        return data;
      } catch (error) {
        console.error('Error in student data query:', error);
        logError(error as Error, { 
          component: 'StudentDashboard', 
          action: 'queryFn', 
          userId: user?.id,
          skipServerLog: true
        });
        throw error;
      }
    },
    enabled: !!user?.id,
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
  });

  // Fetch total educational content count
  const { data: totalContentData } = useQuery({
    queryKey: ['total-educational-content'],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('educational_content')
        .select('*', { count: 'exact', head: true })
        .eq('published', true);

      if (error) throw error;
      return count || 0;
    }
  });

  // Fetch educational content for recommendations
  const { data: educationalContent } = useQuery({
    queryKey: ['educational-content'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('educational_content')
        .select('*')
        .eq('published', true)
        .order('difficulty_level', { ascending: true });

      if (error) throw error;
      return data;
    },
  });

  // Update next recommendation when content or student data changes
  useEffect(() => {
    if (educationalContent && educationalContent.length > 0 && studentData) {
      const completedContentIds = studentData?.student_progress?.map(p => p.content_id) || [];
      const recommendedContent = educationalContent.find(c => !completedContentIds.includes(c.id));
      if (recommendedContent) {
        setNextRecommendation({
          id: recommendedContent.id,
          title: recommendedContent.title,
          description: recommendedContent.content.substring(0, 100) + '...',
          type: recommendedContent.type || 'lesson',
          difficulty: recommendedContent.difficulty_level,
          reward: recommendedContent.reward_sats
        });
      }
    }
  }, [educationalContent, studentData]);

  useEffect(() => {
    console.log("StudentDashboard useEffect - studentData:", studentData);
    console.log("StudentDashboard useEffect - language:", language);
    
    if (studentData) {
      // Calculate learning streak based on student progress
      if (studentData.student_progress) {
        const sortedProgress = [...studentData.student_progress].sort((a, b) => 
          new Date(b.completed_at || 0).getTime() - new Date(a.completed_at || 0).getTime()
        );
        
        if (sortedProgress.length > 0) {
          // Count consecutive days with completed content
          let streak = 1;
          const today = new Date().setHours(0, 0, 0, 0);
          let currentDate = new Date(sortedProgress[0].completed_at || today).setHours(0, 0, 0, 0);
          
          for (let i = 1; i < sortedProgress.length; i++) {
            const progressDate = new Date(sortedProgress[i].completed_at || 0).setHours(0, 0, 0, 0);
            const dayDiff = (currentDate - progressDate) / (1000 * 60 * 60 * 24);
            
            if (dayDiff === 1) {
              streak++;
              currentDate = progressDate;
            } else if (dayDiff > 1) {
              break;
            }
          }
          
          setLearningStreak(streak);
        }
      }

      // Calculate level based on educational credits
      const credits = studentData.educational_credits || 0;
      const calculatedLevel = Math.max(1, Math.floor(credits / 500) + 1);
      setLevel(calculatedLevel);

      // Calculate badges based on completed lessons
      const completedLessons = studentData.student_progress?.filter(p => p.completed).length || 0;
      const calculatedBadges = Math.floor(completedLessons / 3); // 1 badge for every 3 completed lessons
      setBadges(calculatedBadges);
    }
  }, [studentData, language]);

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    // Implement search functionality here
    console.log("Searching for:", query);
  };

  if (isLoading) {
    console.log("StudentDashboard is loading");
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">{t.dashboard.loading}</p>
        </div>
      </div>
    );
  }

  if (queryError) {
    console.log("StudentDashboard encountered an error:", queryError);
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center p-8 max-w-md mx-auto bg-red-50 rounded-lg border border-red-200">
          <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-red-700 mb-2">{t.dashboard.errors.title}</h3>
          <p className="text-red-600 mb-4">
            {queryError instanceof Error ? queryError.message : t.dashboard.errors.generic}
          </p>
          <button 
            onClick={() => refetch()}
            className="px-4 py-2 bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors"
          >
            {t.dashboard.errors.tryAgain}
          </button>
        </div>
      </div>
    );
  }

  if (!studentData) {
    console.log("StudentDashboard has no data");
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center p-8 max-w-md mx-auto bg-yellow-50 rounded-lg border border-yellow-200">
          <AlertTriangle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-yellow-700 mb-2">{t.dashboard.errors.noProfile}</h3>
          <p className="text-yellow-600">{t.dashboard.errors.contactAdmin}</p>
        </div>
      </div>
    );
  }

  console.log("StudentDashboard rendering with data:", studentData);

  // Calculate progress metrics
  const totalLessons = totalContentData || 20; // Use fetched total or fallback to 20
  const completedLessons = studentData.student_progress?.filter(p => p.completed).length || 0;
  const progressPercentage = Math.round((completedLessons / totalLessons) * 100) || 0;
  
  // Calculate behavior score
  const behaviorScore = studentData.student_behavior?.reduce((sum, record) => 
    sum + (record.type === 'positive' ? record.points : -record.points), 0) || 0;
  
  // Calculate attendance rate
  const attendanceRate = Math.round(
    (studentData.student_attendance?.filter(a => a.status === 'present').length || 0) / 
    (studentData.student_attendance?.length || 1) * 100
  );

  // Get recent activity with enhanced details
  const recentActivity = [
    ...(studentData.student_behavior || []).map(b => ({
      type: 'behavior',
      category: b.category,
      points: b.points,
      date: new Date(b.created_at),
      positive: b.type === 'positive'
    })),
    ...(studentData.student_progress || []).filter(p => p.completed).map(p => {
      // Find the corresponding educational content to get reward points
      const content = educationalContent?.find(c => c.id === p.content_id);
      return {
        type: 'progress',
        category: 'Lesson Completed',
        points: content?.reward_sats || 0,
        date: new Date(p.completed_at || new Date()),
        positive: true,
        contentTitle: content?.title || 'Lesson'
      };
    }),
    ...(studentData.student_attendance || []).map(a => ({
      type: 'attendance',
      category: a.status.charAt(0).toUpperCase() + a.status.slice(1),
      points: a.status === 'present' ? 5 : 0, // Award 5 points for attendance
      date: new Date(a.date),
      positive: a.status === 'present'
    }))
  ].sort((a, b) => b.date.getTime() - a.date.getTime()).slice(0, 5);

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: { 
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: {
        type: "spring",
        stiffness: 300,
        damping: 24
      }
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
      {/* Sidebar */}
      <div className="md:col-span-1">
        <Sidebar>
          <nav className="space-y-2 mt-4">
            <Link to="/app" className="flex items-center px-4 py-2 text-gray-700 rounded-lg hover:bg-gray-100">
              <Trophy className="h-5 w-5 mr-3 text-orange-500" />
              <span>Dashboard</span>
            </Link>
            <Link to="/app/wallet" className="flex items-center px-4 py-2 text-gray-700 rounded-lg hover:bg-gray-100">
              <Zap className="h-5 w-5 mr-3 text-orange-500" />
              <span>Wallet</span>
            </Link>
            <Link to="/app/games" className="flex items-center px-4 py-2 text-gray-700 rounded-lg hover:bg-gray-100">
              <Gamepad className="h-5 w-5 mr-3 text-orange-500" />
              <span>Games</span>
            </Link>
            <Link to="/app/learn" className="flex items-center px-4 py-2 text-gray-700 rounded-lg hover:bg-gray-100">
              <BookOpen className="h-5 w-5 mr-3 text-orange-500" />
              <span>Learn</span>
            </Link>
            <Link to="/app/messages" className="flex items-center px-4 py-2 text-gray-700 rounded-lg hover:bg-gray-100">
              <MessageSquare className="h-5 w-5 mr-3 text-orange-500" />
              <span>Messages</span>
            </Link>
          </nav>
        </Sidebar>
      </div>

      {/* Main Content */}
      <div className="md:col-span-3 space-y-6">
        {/* Search Bar */}
        <SearchBar 
          onSearch={handleSearch} 
          placeholder="Search for lessons, games, or rewards..."
          className="mb-6"
        />

        {/* Profile Section */}
        <motion.div 
          initial="hidden"
          animate="visible"
          variants={containerVariants}
          className="flex items-center justify-between"
        >
          <motion.div variants={itemVariants}>
            <StudentProfile />
          </motion.div>
        </motion.div>

        {/* Leaderboard Section */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Leaderboard />
        </motion.div>

        {/* Zap Section - Moved after Leaderboard */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="flex justify-end mb-4"
        >
          <ZapStudent />
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <motion.div 
            className="lg:col-span-2 space-y-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
          >
            {/* Learning Path Visualization */}
            <motion.div 
              className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 hover:shadow-neu transition-all duration-300"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                  <Map className="h-5 w-5 text-orange-500 mr-2" />
                  {t.dashboard.learningPath.title}
                </h2>
                <span className="text-sm text-gray-500">{progressPercentage}% {t.dashboard.learningPath.complete}</span>
              </div>
              
              <div className="relative h-16 bg-gray-100 rounded-lg mb-4 overflow-hidden">
                <motion.div 
                  className="absolute top-0 left-0 h-full bg-gradient-to-r from-orange-400 to-orange-500 rounded-lg"
                  initial={{ width: 0 }}
                  animate={{ width: `${progressPercentage}%` }}
                  transition={{ duration: 1, ease: "easeOut" }}
                ></motion.div>
                
                {/* Milestone markers */}
                <div className="absolute top-0 left-0 w-full h-full flex items-center justify-between px-4">
                  <motion.div 
                    className={`h-8 w-8 rounded-full flex items-center justify-center z-10 ${progressPercentage >= 25 ? 'bg-orange-500 text-white' : 'bg-white shadow-sm text-gray-500'}`}
                    whileHover={{ scale: 1.1 }}
                    transition={{ type: "spring", stiffness: 400, damping: 10 }}
                  >
                    1
                  </motion.div>
                  <motion.div 
                    className={`h-8 w-8 rounded-full flex items-center justify-center z-10 ${progressPercentage >= 50 ? 'bg-orange-500 text-white' : 'bg-white shadow-sm text-gray-500'}`}
                    whileHover={{ scale: 1.1 }}
                    transition={{ type: "spring", stiffness: 400, damping: 10 }}
                  >
                    2
                  </motion.div>
                  <motion.div 
                    className={`h-8 w-8 rounded-full flex items-center justify-center z-10 ${progressPercentage >= 75 ? 'bg-orange-500 text-white' : 'bg-white shadow-sm text-gray-500'}`}
                    whileHover={{ scale: 1.1 }}
                    transition={{ type: "spring", stiffness: 400, damping: 10 }}
                  >
                    3
                  </motion.div>
                  <motion.div 
                    className={`h-8 w-8 rounded-full flex items-center justify-center z-10 ${progressPercentage >= 100 ? 'bg-orange-500 text-white' : 'bg-white shadow-sm text-gray-500'}`}
                    whileHover={{ scale: 1.1 }}
                    transition={{ type: "spring", stiffness: 400, damping: 10 }}
                  >
                    4
                  </motion.div>
                </div>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                <motion.div 
                  className="bg-white shadow-sm p-3 rounded-lg text-center border border-gray-100 hover:shadow-neu-sm transition-all duration-300"
                  whileHover={{ y: -5 }}
                >
                  <p className="text-sm text-gray-500">{t.dashboard.learningPath.modules}</p>
                  <p className="text-xl font-bold text-gray-800">{completedLessons}/{totalLessons}</p>
                </motion.div>
                <motion.div 
                  className="bg-white shadow-sm p-3 rounded-lg text-center border border-gray-100 hover:shadow-neu-sm transition-all duration-300"
                  whileHover={{ y: -5 }}
                >
                  <p className="text-sm text-gray-500">{t.dashboard.learningPath.streak}</p>
                  <p className="text-xl font-bold text-gray-800">{learningStreak} {t.dashboard.learningPath.days}</p>
                </motion.div>
                <motion.div 
                  className="bg-white shadow-sm p-3 rounded-lg text-center border border-gray-100 hover:shadow-neu-sm transition-all duration-300"
                  whileHover={{ y: -5 }}
                >
                  <p className="text-sm text-gray-500">{t.dashboard.learningPath.badges}</p>
                  <p className="text-xl font-bold text-gray-800">{badges}</p>
                </motion.div>
                <motion.div 
                  className="bg-white shadow-sm p-3 rounded-lg text-center border border-gray-100 hover:shadow-neu-sm transition-all duration-300"
                  whileHover={{ y: -5 }}
                >
                  <p className="text-sm text-gray-500">{t.dashboard.learningPath.level}</p>
                  <p className="text-xl font-bold text-gray-800">{level}</p>
                </motion.div>
              </div>
              
              <div className="flex justify-end">
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Link
                    to="/app/learn"
                    className="px-4 py-2 bg-white text-orange-600 rounded-lg border border-orange-200 hover:bg-orange-50 flex items-center"
                  >
                    {t.dashboard.learningPath.viewFull} <ArrowRight className="h-4 w-4 ml-1" />
                  </Link>
                </motion.div>
              </div>
            </motion.div>

            {/* Next Recommendation */}
            <motion.div 
              className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 hover:shadow-neu transition-all duration-300"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
            >
              <h2 className="text-lg font-semibold text-gray-900 flex items-center mb-4">
                <Lightbulb className="h-5 w-5 text-orange-500 mr-2" />
                {t.dashboard.nextRecommendation.upNext}
              </h2>
              
              <motion.div 
                className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4 border border-blue-100"
                whileHover={{ scale: 1.02 }}
                transition={{ type: "spring", stiffness: 400, damping: 10 }}
              >
                <div className="flex items-start">
                  <motion.div 
                    className="bg-blue-100 p-3 rounded-full mr-4"
                    animate={{ y: [0, -5, 0] }}
                    transition={{ repeat: Infinity, duration: 2 }}
                  >
                    {nextRecommendation.type === 'lesson' ? (
                      <BookOpen className="h-6 w-6 text-blue-600" />
                    ) : (
                      <Gamepad className="h-6 w-6 text-blue-600" />
                    )}
                  </motion.div>
                  <div className="flex-1">
                    <h3 className="font-medium text-blue-800">{nextRecommendation.title}</h3>
                    <p className="text-sm text-blue-600 mt-1">{nextRecommendation.description}</p>
                    <div className="flex items-center mt-2">
                      <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">
                        {nextRecommendation.difficulty}
                      </span>
                      <span className="text-xs bg-orange-100 text-orange-800 px-2 py-0.5 rounded-full ml-2">
                        {nextRecommendation.reward} SATs
                      </span>
                    </div>
                  </div>
                </div>
                <div className="mt-4 flex justify-end">
                  <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                    <Link 
                      to={`/learn?content=${nextRecommendation.id}`} 
                      className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center"
                    >
                      {t.dashboard.nextRecommendation.startNow} <ArrowRight className="h-4 w-4 ml-1" />
                    </Link>
                  </motion.div>
                </div>
              </motion.div>
              
              <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                <motion.button 
                  className="bg-white shadow-sm flex flex-col items-center justify-center p-4 rounded-lg border border-gray-100 hover:shadow-neu-sm transition-all duration-300"
                  whileHover={{ y: -5 }}
                >
                  <Brain className="h-6 w-6 text-purple-500 mb-2" />
                  <span className="text-sm text-gray-700">{t.dashboard.nextRecommendation.personalizedPath}</span>
                </motion.button>
                <motion.button 
                  className="bg-white shadow-sm flex flex-col items-center justify-center p-4 rounded-lg border border-gray-100 hover:shadow-neu-sm transition-all duration-300"
                  whileHover={{ y: -5 }}
                >
                  <BarChart4 className="h-6 w-6 text-green-500 mb-2" />
                  <span className="text-sm text-gray-700">{t.dashboard.nextRecommendation.skillGaps}</span>
                </motion.button>
                <motion.button 
                  className="bg-white shadow-sm flex flex-col items-center justify-center p-4 rounded-lg border border-gray-100 hover:shadow-neu-sm transition-all duration-300"
                  whileHover={{ y: -5 }}
                >
                  <Calendar className="h-6 w-6 text-blue-500 mb-2" />
                  <span className="text-sm text-gray-700">{t.dashboard.nextRecommendation.schedule}</span>
                </motion.button>
              </div>
            </motion.div>

            {/* Recent Activity */}
            <motion.div 
              className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 hover:shadow-neu transition-all duration-300"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7 }}
            >
              <h2 className="text-lg font-semibold text-gray-900 flex items-center mb-4">
                <Clock className="h-5 w-5 text-orange-500 mr-2" />
                {t.dashboard.recentActivity.title}
              </h2>
              
              <div className="space-y-4">
                {recentActivity.length === 0 && (
                  <div className="text-center py-4 text-gray-500">
                    {t.dashboard.recentActivity.noActivity}
                  </div>
                )}
                
                <AnimatePresence>
                  {recentActivity.map((activity, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      transition={{ delay: index * 0.1 }}
                      className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:shadow-sm transition-shadow"
                      whileHover={{ scale: 1.02, backgroundColor: "#f7f7f7" }}
                    >
                      <div className="flex items-center">
                        {activity.type === 'behavior' && (
                          activity.positive ? 
                            <div className="bg-white shadow-sm p-2 rounded-full">
                              <Check className="h-5 w-5 text-green-600" />
                            </div> :
                            <div className="bg-white shadow-sm p-2 rounded-full">
                              <X className="h-5 w-5 text-red-600" />
                            </div>
                        )}
                        {activity.type === 'progress' && (
                          <div className="bg-white shadow-sm p-2 rounded-full">
                            <BookOpen className="h-5 w-5 text-blue-600" />
                          </div>
                        )}
                        {activity.type === 'attendance' && (
                          activity.positive ? 
                            <div className="bg-white shadow-sm p-2 rounded-full">
                              <Check className="h-5 w-5 text-green-600" />
                            </div> :
                            <div className="bg-white shadow-sm p-2 rounded-full">
                              <Clock className="h-5 w-5 text-yellow-600" />
                            </div>
                        )}
                        <div className="ml-3">
                          <p className="font-medium text-gray-800">
                            {activity.type === 'progress' && activity.contentTitle 
                              ? `${activity.contentTitle}` 
                              : activity.category}
                          </p>
                          <p className="text-sm text-gray-500">{format(activity.date, 'PPP')}</p>
                        </div>
                      </div>
                      {activity.points > 0 && (
                        <motion.p 
                          className={`text-lg font-semibold ${activity.positive ? 'text-green-500' : 'text-red-500'}`}
                          initial={{ scale: 1 }}
                          whileHover={{ scale: 1.1 }}
                        >
                          {activity.positive ? '+' : '-'}{activity.points}
                        </motion.p>
                      )}
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </motion.div>
          </motion.div>

          <motion.div 
            className="space-y-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
          >
            {/* Achievements & Gamification */}
            <motion.div 
              className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 hover:shadow-neu transition-all duration-300"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.9 }}
            >
              <h2 className="text-lg font-semibold text-gray-900 flex items-center mb-4">
                <Trophy className="h-5 w-5 text-orange-500 mr-2" />
                {t.dashboard.achievements.title}
              </h2>
              
              <motion.div 
                className="bg-gray-50 rounded-lg p-4 mb-4"
                whileHover={{ scale: 1.02 }}
                transition={{ type: "spring", stiffness: 400, damping: 10 }}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">{t.dashboard.achievements.balance}</p>
                    <motion.p 
                      className="text-2xl font-bold text-gray-800"
                      initial={{ scale: 1 }}
                      animate={{ scale: [1, 1.05, 1] }}
                      transition={{ duration: 0.5, delay: 1.2 }}
                    >
                      {studentData.educational_credits} SATs
                    </motion.p>
                  </div>
                  <motion.div 
                    className="bg-white shadow-sm p-3 rounded-full"
                    animate={{ rotate: [0, 15, -15, 0] }}
                    transition={{ duration: 0.5, delay: 1.5 }}
                  >
                    <Zap className="h-6 w-6 text-orange-500" />
                  </motion.div>
                </div>
              </motion.div>
              
              <div className="mb-4">
                <p className="text-sm font-medium text-gray-700 mb-2">{t.dashboard.achievements.streak}</p>
                <div className="flex space-x-2">
                  {[1, 2, 3, 4, 5, 6, 7].map((day) => (
                    <motion.div 
                      key={day} 
                      className={`flex-1 h-2 rounded-full ${day <= learningStreak ? 'bg-orange-500' : 'bg-gray-200'}`}
                      initial={{ scaleX: 0 }}
                      animate={{ scaleX: 1 }}
                      transition={{ duration: 0.3, delay: 1 + day * 0.1 }}
                    ></motion.div>
                  ))}
                </div>
                <div className="flex justify-between mt-1">
                  <span className="text-xs text-gray-500">Mon</span>
                  <span className="text-xs text-gray-500">Sun</span>
                </div>
              </div>
              
              <p className="text-sm font-medium text-gray-700 mb-2">{t.dashboard.achievements.badges}</p>
              <div className="grid grid-cols-3 gap-2 mb-4">
                <motion.div 
                  className={`bg-white shadow-sm p-2 rounded-lg flex flex-col items-center border border-gray-100 ${learningStreak >= 5 ? 'border-yellow-300' : ''}`}
                  whileHover={{ scale: 1.05 }}
                  transition={{ type: "spring", stiffness: 400, damping: 10 }}
                >
                  <motion.div 
                    className={`${learningStreak >= 5 ? 'bg-yellow-100' : 'bg-gray-100'} p-2 rounded-full`}
                    animate={learningStreak >= 5 ? { scale: [1, 1.2, 1] } : {}}
                    transition={{ duration: 0.5, repeat: 0 }}
                  >
                    <Flame className={`h-4 w-4 ${learningStreak >= 5 ? 'text-yellow-600' : 'text-gray-400'}`} />
                  </motion.div>
                  <span className={`text-xs ${learningStreak >= 5 ? 'text-yellow-600 font-medium' : 'text-gray-400'} mt-1`}>
                    {t.dashboard.achievements.streak5}
                  </span>
                </motion.div>
                <motion.div 
                  className={`bg-white shadow-sm p-2 rounded-lg flex flex-col items-center border border-gray-100 ${badges >= 1 ? 'border-blue-300' : ''}`}
                  whileHover={{ scale: 1.05 }}
                  transition={{ type: "spring", stiffness: 400, damping: 10 }}
                >
                  <motion.div 
                    className={`${badges >= 1 ? 'bg-blue-100' : 'bg-gray-100'} p-2 rounded-full`}
                    animate={badges >= 1 ? { scale: [1, 1.2, 1] } : {}}
                    transition={{ duration: 0.5, delay: 0.2, repeat: 0 }}
                  >
                    <Brain className={`h-4 w-4 ${badges >= 1 ? 'text-blue-600' : 'text-gray-400'}`} />
                  </motion.div>
                  <span className={`text-xs ${badges >= 1 ? 'text-blue-600 font-medium' : 'text-gray-400'} mt-1`}>
                    {t.dashboard.achievements.quiz}
                  </span>
                </motion.div>
                <motion.div 
                  className={`bg-white shadow-sm p-2 rounded-lg flex flex-col items-center border border-gray-100 ${level >= 3 ? 'border-green-300' : ''}`}
                  whileHover={{ scale: 1.05 }}
                  transition={{ type: "spring", stiffness: 400, damping: 10 }}
                >
                  <motion.div 
                    className={`${level >= 3 ? 'bg-green-100' : 'bg-gray-100'} p-2 rounded-full`}
                    animate={level >= 3 ? { scale: [1, 1.2, 1] } : {}}
                    transition={{ duration: 0.5, delay: 0.4, repeat: 0 }}
                  >
                    <Star className={`h-4 w-4 ${level >= 3 ? 'text-green-600' : 'text-gray-400'}`} />
                  </motion.div>
                  <span className={`text-xs ${level >= 3 ? 'text-green-600 font-medium' : 'text-gray-400'} mt-1`}>
                    {t.dashboard.achievements.firstPlace}
                  </span>
                </motion.div>
              </div>
              
              <div className="flex justify-end">
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Link
                    to="/app/wallet?tab=transactions"
                    className="px-4 py-2 bg-white text-orange-600 rounded-lg border border-orange-200 hover:bg-orange-50 flex items-center"
                  >
                    {t.dashboard.achievements.viewAll} <ArrowRight className="h-4 w-4 ml-1" />
                  </Link>
                </motion.div>
              </div>
            </motion.div>
            
            {/* Quick Stats */}
            <motion.div 
              className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 hover:shadow-neu transition-all duration-300"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1 }}
            >
              <h2 className="text-lg font-semibold text-gray-900 flex items-center mb-4">
                <BarChart4 className="h-5 w-5 text-orange-500 mr-2" />
                {t.dashboard.stats.title}
              </h2>
              
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-sm font-medium text-gray-700">{t.dashboard.stats.behavior}</span>
                    <span className="text-sm font-medium text-gray-700">{behaviorScore}</span>
                  </div>
                  <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                    <motion.div 
                      className={`h-full rounded-full ${behaviorScore >= 0 ? 'bg-green-500' : 'bg-red-500'}`}
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min(Math.abs(behaviorScore) / 100 * 100, 100)}%` }}
                      transition={{ duration: 1, delay: 1.1 }}
                    ></motion.div>
                  </div>
                </div>
                
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-sm font-medium text-gray-700">{t.dashboard.stats.attendance}</span>
                    <span className="text-sm font-medium text-gray-700">{attendanceRate}%</span>
                  </div>
                  <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                    <motion.div 
                      className="h-full rounded-full bg-blue-500"
                      initial={{ width: 0 }}
                      animate={{ width: `${attendanceRate}%` }}
                      transition={{ duration: 1, delay: 1.2 }}
                    ></motion.div>
                  </div>
                </div>
                
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-sm font-medium text-gray-700">{t.dashboard.stats.progress}</span>
                    <span className="text-sm font-medium text-gray-700">{progressPercentage}%</span>
                  </div>
                  <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                    <motion.div 
                      className="h-full rounded-full bg-orange-500"
                      initial={{ width: 0 }}
                      animate={{ width: `${progressPercentage}%` }}
                      transition={{ duration: 1, delay: 1.3 }}
                    ></motion.div>
                  </div>
                </div>
              </div>
            </motion.div>
            
            {/* Quick Access */}
            <motion.div 
              className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 hover:shadow-neu transition-all duration-300"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.1 }}
            >
              <h2 className="text-lg font-semibold text-gray-900 flex items-center mb-4">
                <Zap className="h-5 w-5 text-orange-500 mr-2" />
                {t.dashboard.quickAccess.title}
              </h2>
              
              <div className="grid grid-cols-2 gap-3">
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Link to="/app/learn" className="bg-white shadow-sm flex flex-col items-center justify-center p-3 rounded-lg border border-gray-100 hover:shadow-neu-sm transition-all duration-300">
                    <BookOpen className="h-5 w-5 text-blue-500 mb-1" />
                    <span className="text-xs text-gray-700">{t.dashboard.quickAccess.learn}</span>
                  </Link>
                </motion.div>
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Link to="/app/games" className="bg-white shadow-sm flex flex-col items-center justify-center p-3 rounded-lg border border-gray-100 hover:shadow-neu-sm transition-all duration-300">
                    <Trophy className="h-5 w-5 text-yellow-500 mb-1" />
                    <span className="text-xs text-gray-700">{t.dashboard.quickAccess.games}</span>
                  </Link>
                </motion.div>
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Link to="/app/messages" className="bg-white shadow-sm flex flex-col items-center justify-center p-3 rounded-lg border border-gray-100 hover:shadow-neu-sm transition-all duration-300">
                    <MessageSquare className="h-5 w-5 text-green-500 mb-1" />
                    <span className="text-xs text-gray-700">{t.dashboard.quickAccess.messages}</span>
                  </Link>
                </motion.div>
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <button className="w-full bg-white shadow-sm flex flex-col items-center justify-center p-3 rounded-lg border border-gray-100 hover:shadow-neu-sm transition-all duration-300">
                    <HelpCircle className="h-5 w-5 text-purple-500 mb-1" />
                    <span className="text-xs text-gray-700">{t.dashboard.quickAccess.help}</span>
                  </button>
                </motion.div>
              </div>
            </motion.div>
            
            {/* Wallet Preview */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.2 }}
            >
              <Wallet />
            </motion.div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}

// Gamepad icon component since it's not in lucide-react
function Gamepad({ className = "h-6 w-6" }: { className?: string }) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      className={className} 
      width="24" 
      height="24" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round"
    >
      <line x1="6" y1="12" x2="10" y2="12"></line>
      <line x1="8" y1="10" x2="8" y2="14"></line>
      <line x1="15" y1="13" x2="15.01" y2="13"></line>
      <line x1="18" y1="11" x2="18.01" y2="11"></line>
      <rect x="2" y="6" width="20" height="12" rx="2"></rect>
    </svg>
  );
}
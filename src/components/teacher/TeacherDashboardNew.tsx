import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  Activity, 
  Users, 
  Award, 
  Calendar, 
  BookOpen, 
  Wallet, 
  BarChart4, 
  CheckCircle,
  AlertTriangle, 
  Clock, 
  Settings, 
  Bell, 
  HelpCircle, 
  ArrowRight, 
  Zap, 
  FileText, 
  Lightbulb, 
  UserPlus, 
  School
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { Timetable } from './Timetable';
import { motion } from 'framer-motion';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/authStore';
import { format } from 'date-fns';
import { Avatar } from '../Avatar';
import { useLanguage } from '../../contexts/LanguageContext';
import { translations } from '../../lib/translations';
import { SearchBar } from '../SearchBar';
import { Sidebar } from '../Sidebar';
import { TeacherZapForm } from './TeacherZapForm';

export function TeacherDashboardNew() {
  const [activeTab, setActiveTab] = useState<'overview' | 'timetable'>('overview');
  const { user } = useAuthStore();
  const { language } = useLanguage();
  const t = translations[language];
  const [searchQuery, setSearchQuery] = useState('');
  const [isZapModalOpen, setIsZapModalOpen] = useState(false);
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);

  // Fetch class data
  const { data: classData, isLoading } = useQuery({
    queryKey: ['teacher-dashboard', user?.id, user?.classId],
    queryFn: async () => {
      try {
        // Get students in the teacher's class
        const { data: students, error: studentsError } = await supabase
          .from('profiles')
          .select(`
            id,
            name,
            image_url,
            class_id,
            educational_credits,
            student_behavior:behavior_records!behavior_records_student_id_fkey (
              id,
              type,
              category,
              points,
              created_at
            ),
            student_attendance:attendance!attendance_student_id_fkey (
              id,
              date,
              status
            ),
            student_progress:student_progress (
              id,
              content_id,
              completed,
              quiz_score,
              completed_at
            )
          `)
          .eq('role', 'student')
          .eq('class_id', user?.classId);

        if (studentsError) throw studentsError;

        // Get pending approvals
        const { data: pendingApprovals, error: approvalsError } = await supabase
          .from('student_zaps')
          .select(`
            id,
            amount_sats,
            reason,
            created_at,
            sender:sender_id(id, name, image_url),
            receiver:receiver_id(id, name, image_url)
          `)
          .eq('needs_approval', true)
          .eq('approved', false)
          .order('created_at', { ascending: false });

        if (approvalsError) throw approvalsError;

        // Get recent activity
        const recentActivity = [
          ...(students || []).flatMap(student => 
            (student.student_behavior || []).map(b => ({
              type: 'behavior',
              studentName: student.name,
              studentImage: student.image_url,
              category: b.category,
              points: b.points,
              date: new Date(b.created_at),
              positive: b.type === 'positive'
            }))
          ),
          ...(students || []).flatMap(student => 
            (student.student_progress || []).filter(p => p.completed).map(p => ({
              type: 'progress',
              studentName: student.name,
              studentImage: student.image_url,
              category: 'Lesson Completed',
              points: 0,
              date: new Date(p.completed_at || new Date()),
              positive: true
            }))
          ),
          ...(students || []).flatMap(student => 
            (student.student_attendance || []).map(a => ({
              type: 'attendance',
              studentName: student.name,
              studentImage: student.image_url,
              category: a.status.charAt(0).toUpperCase() + a.status.slice(1),
              points: 0,
              date: new Date(a.date),
              positive: a.status === 'present'
            }))
          )
        ].sort((a, b) => b.date.getTime() - a.date.getTime()).slice(0, 5);

        // Calculate class statistics
        const totalStudents = students?.length || 0;
        const averageSats = students?.reduce((sum, student) => sum + (student.educational_credits || 0), 0) / (totalStudents || 1);
        
        const behaviorScore = students?.reduce((sum, student) => {
          const studentScore = student.student_behavior?.reduce((s, b) => 
            s + (b.type === 'positive' ? b.points : -b.points), 0) || 0;
          return sum + studentScore;
        }, 0) / (totalStudents || 1);
        
        const attendanceRate = students?.reduce((sum, student) => {
          const studentRate = (student.student_attendance?.filter(a => a.status === 'present').length || 0) / 
            (student.student_attendance?.length || 1);
          return sum + studentRate;
        }, 0) / (totalStudents || 1) * 100;

        // Get top performing students
        const topStudents = [...(students || [])]
          .sort((a, b) => (b.educational_credits || 0) - (a.educational_credits || 0))
          .slice(0, 3)
          .map(student => ({
            id: student.id,
            name: student.name,
            image_url: student.image_url,
            sats: student.educational_credits || 0
          }));

        return {
          students: students || [],
          pendingApprovals: pendingApprovals || [],
          recentActivity,
          stats: {
            totalStudents,
            averageSats,
            behaviorScore,
            attendanceRate
          },
          topStudents
        };
      } catch (error) {
        console.error('Error fetching teacher dashboard data:', error);
        throw error;
      }
    },
    enabled: !!user?.id && !!user?.classId
  });

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    // Implement search functionality here
    console.log("Searching for:", query);
  };

  const handleAwardSats = (studentId: string) => {
    setSelectedStudentId(studentId);
    setIsZapModalOpen(true);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">{t.teacherDashboard.loading}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
      {/* Sidebar */}
      <div className="md:col-span-1">
        <Sidebar>
          <nav className="space-y-2 mt-4">
            <Link to="/teacher" className="flex items-center px-4 py-2 text-gray-700 rounded-lg hover:bg-gray-100">
              <Activity className="h-5 w-5 mr-3 text-blue-500" />
              <span>Dashboard</span>
            </Link>
            <Link to="/teacher/classes" className="flex items-center px-4 py-2 text-gray-700 rounded-lg hover:bg-gray-100">
              <Users className="h-5 w-5 mr-3 text-blue-500" />
              <span>Classes</span>
            </Link>
            <Link to="/teacher/rewards" className="flex items-center px-4 py-2 text-gray-700 rounded-lg hover:bg-gray-100">
              <Award className="h-5 w-5 mr-3 text-blue-500" />
              <span>Rewards</span>
            </Link>
            <Link to="/teacher/zap-approvals" className="flex items-center px-4 py-2 text-gray-700 rounded-lg hover:bg-gray-100">
              <Zap className="h-5 w-5 mr-3 text-blue-500" />
              <span>Zap Approvals</span>
              {classData?.pendingApprovals?.length ? (
                <span className="ml-auto bg-yellow-100 text-yellow-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
                  {classData.pendingApprovals.length}
                </span>
              ) : null}
            </Link>
            <Link to="/teacher/funding" className="flex items-center px-4 py-2 text-gray-700 rounded-lg hover:bg-gray-100">
              <Wallet className="h-5 w-5 mr-3 text-blue-500" />
              <span>Funding</span>
            </Link>
            <Link to="/app/learn" className="flex items-center px-4 py-2 text-gray-700 rounded-lg hover:bg-gray-100">
              <BookOpen className="h-5 w-5 mr-3 text-blue-500" />
              <span>Learning</span>
            </Link>
          </nav>
        </Sidebar>
      </div>

      {/* Main Content */}
      <div className="md:col-span-3 space-y-6">
        {/* Search Bar */}
        <SearchBar 
          onSearch={handleSearch} 
          placeholder="Search for students, classes, or rewards..."
          className="mb-6"
        />

        {/* Tabs */}
        <div className="bg-white rounded-xl shadow-sm">
          <div className="border-b border-gray-200">
            <nav className="flex -mb-px">
              <button
                onClick={() => setActiveTab('overview')}
                className={`px-6 py-3 text-sm font-medium ${
                  activeTab === 'overview'
                    ? 'border-b-2 border-blue-500 text-blue-600'
                    : 'text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Activity className="h-5 w-5 inline mr-2" />
                {t.teacherDashboard.tabs.overview}
              </button>
              <button
                onClick={() => setActiveTab('timetable')}
                className={`px-6 py-3 text-sm font-medium ${
                  activeTab === 'timetable'
                    ? 'border-b-2 border-blue-500 text-blue-600'
                    : 'text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Calendar className="h-5 w-5 inline mr-2" />
                {t.teacherDashboard.tabs.timetable}
              </button>
            </nav>
          </div>

          <div className="p-6">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.2 }}
            >
              {activeTab === 'overview' && (
                <div className="space-y-6">
                  {/* Quick Stats */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-gray-600">{t.teacherDashboard.stats.totalStudents}</p>
                          <p className="text-2xl font-bold text-gray-800">
                            {classData?.stats.totalStudents || 0}
                          </p>
                        </div>
                        <div className="bg-blue-100 p-3 rounded-full">
                          <Users className="h-6 w-6 text-blue-600" />
                        </div>
                      </div>
                    </div>

                    <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-gray-600">{t.teacherDashboard.stats.averageSats}</p>
                          <p className="text-2xl font-bold text-gray-800">
                            {Math.round(classData?.stats.averageSats || 0)}
                          </p>
                        </div>
                        <div className="bg-orange-100 p-3 rounded-full">
                          <Award className="h-6 w-6 text-orange-600" />
                        </div>
                      </div>
                    </div>

                    <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-gray-600">{t.teacherDashboard.stats.behaviorScore}</p>
                          <p className="text-2xl font-bold text-gray-800">
                            {Math.round(classData?.stats.behaviorScore || 0)}
                          </p>
                        </div>
                        <div className="bg-green-100 p-3 rounded-full">
                          <CheckCircle className="h-6 w-6 text-green-600" />
                        </div>
                      </div>
                    </div>

                    <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-gray-600">{t.teacherDashboard.stats.attendanceRate}</p>
                          <p className="text-2xl font-bold text-gray-800">
                            {Math.round(classData?.stats.attendanceRate || 0)}%
                          </p>
                        </div>
                        <div className="bg-purple-100 p-3 rounded-full">
                          <Clock className="h-6 w-6 text-purple-600" />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Quick Actions */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <Link 
                      to="/teacher/classes"
                      className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-medium text-gray-900">{t.teacherDashboard.actions.manageClass}</h3>
                        <Users className="h-6 w-6 text-blue-500" />
                      </div>
                      <p className="text-gray-600 mb-4">{t.teacherDashboard.actions.manageClassDesc}</p>
                      <div className="flex justify-end">
                        <span className="text-blue-600 flex items-center text-sm font-medium">
                          {t.teacherDashboard.actions.viewClass} <ArrowRight className="h-4 w-4 ml-1" />
                        </span>
                      </div>
                    </Link>

                    <Link 
                      to="/teacher/rewards"
                      className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-medium text-gray-900">{t.teacherDashboard.actions.manageRewards}</h3>
                        <Award className="h-6 w-6 text-orange-500" />
                      </div>
                      <p className="text-gray-600 mb-4">{t.teacherDashboard.actions.manageRewardsDesc}</p>
                      <div className="flex justify-end">
                        <span className="text-orange-600 flex items-center text-sm font-medium">
                          {t.teacherDashboard.actions.viewRewards} <ArrowRight className="h-4 w-4 ml-1" />
                        </span>
                      </div>
                    </Link>

                    <div
                      className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 hover:shadow-md transition-shadow cursor-pointer"
                      onClick={() => setIsZapModalOpen(true)}
                    >
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-medium text-gray-900">Award SATs</h3>
                        <Zap className="h-6 w-6 text-yellow-500" />
                      </div>
                      <p className="text-gray-600 mb-4">Reward students with SATs for their achievements and good behavior.</p>
                      <div className="flex justify-end">
                        <span className="text-yellow-600 flex items-center text-sm font-medium">
                          Award Now <ArrowRight className="h-4 w-4 ml-1" />
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Pending Approvals */}
                  {classData?.pendingApprovals && classData.pendingApprovals.length > 0 && (
                    <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-medium text-gray-900 flex items-center">
                          <AlertTriangle className="h-5 w-5 text-yellow-500 mr-2" />
                          {t.teacherDashboard.pendingApprovals.title}
                        </h3>
                        <Link 
                          to="/teacher/zap-approvals"
                          className="bg-yellow-100 text-yellow-800 text-xs font-medium px-2.5 py-0.5 rounded-full hover:bg-yellow-200 transition-colors"
                        >
                          {classData.pendingApprovals.length} {t.teacherDashboard.pendingApprovals.pending} - View All
                        </Link>
                      </div>
                      
                      <div className="space-y-4">
                        {classData.pendingApprovals.slice(0, 3).map((zap) => (
                          <div key={zap.id} className="flex items-center justify-between p-4 bg-yellow-50 rounded-lg">
                            <div className="flex items-center space-x-4">
                              <Avatar name={zap.sender.name} imageUrl={zap.sender.image_url} size="sm" />
                              <div>
                                <p className="font-medium text-gray-900">
                                  {zap.sender.name} → {zap.receiver.name}
                                </p>
                                <p className="text-sm text-gray-500">{zap.reason}</p>
                                <p className="text-sm text-orange-500">{zap.amount_sats} sats</p>
                              </div>
                            </div>
                            <div className="flex space-x-2">
                              <button 
                                className="p-2 bg-green-100 text-green-600 rounded-lg hover:bg-green-200"
                                onClick={() => {
                                  const zapMutation = {
                                    zapId: zap.id,
                                    approved: true
                                  };
                                  // Call the mutation function here
                                }}
                              >
                                <CheckCircle className="h-5 w-5" />
                              </button>
                              <button 
                                className="p-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200"
                                onClick={() => {
                                  const zapMutation = {
                                    zapId: zap.id,
                                    approved: false
                                  };
                                  // Call the mutation function here
                                }}
                              >
                                <X className="h-5 w-5" />
                              </button>
                            </div>
                          </div>
                        ))}
                        
                        {classData.pendingApprovals.length > 3 && (
                          <Link 
                            to="/teacher/zap-approvals"
                            className="block text-center text-yellow-600 hover:text-yellow-700 font-medium py-2"
                          >
                            View all {classData.pendingApprovals.length} pending approvals
                          </Link>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Recent Activity */}
                  <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-medium text-gray-900 flex items-center">
                        <Activity className="h-5 w-5 text-blue-500 mr-2" />
                        {t.teacherDashboard.recentActivity.title}
                      </h3>
                    </div>
                    
                    <div className="space-y-4">
                      {classData?.recentActivity.map((activity, index) => (
                        <motion.div
                          key={index}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.1 }}
                          className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                        >
                          <div className="flex items-center space-x-4">
                            <Avatar name={activity.studentName} imageUrl={activity.studentImage} size="sm" />
                            <div>
                              <p className="font-medium text-gray-900">{activity.studentName}</p>
                              <p className="text-sm text-gray-500">
                                {activity.category} {activity.points > 0 ? `(${activity.positive ? '+' : '-'}${Math.abs(activity.points)} points)` : ''}
                              </p>
                            </div>
                          </div>
                          <span className="text-sm text-gray-500">
                            {format(activity.date, 'MMM d, h:mm a')}
                          </span>
                        </motion.div>
                      ))}

                      {(!classData?.recentActivity || classData.recentActivity.length === 0) && (
                        <div className="text-center py-4 text-gray-500">
                          {t.teacherDashboard.recentActivity.noActivity}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Top Students */}
                  <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-medium text-gray-900 flex items-center">
                        <Trophy className="h-5 w-5 text-yellow-500 mr-2" />
                        {t.teacherDashboard.topStudents.title}
                      </h3>
                    </div>
                    
                    <div className="space-y-4">
                      {classData?.topStudents.map((student, index) => (
                        <div key={student.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                          <div className="flex items-center space-x-4">
                            <div className="flex-shrink-0 h-10 w-10 relative">
                              <Avatar name={student.name} imageUrl={student.image_url} size="md" />
                              <div className="absolute -top-1 -right-1 bg-yellow-100 rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold text-yellow-800">
                                {index + 1}
                              </div>
                            </div>
                            <div>
                              <p className="font-medium text-gray-900">{student.name}</p>
                              <p className="text-sm text-orange-500">{student.sats} SATs</p>
                            </div>
                          </div>
                          <button 
                            className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                            onClick={() => handleAwardSats(student.id)}
                          >
                            Award SATs
                          </button>
                        </div>
                      ))}

                      {(!classData?.topStudents || classData.topStudents.length === 0) && (
                        <div className="text-center py-4 text-gray-500">
                          {t.teacherDashboard.topStudents.noStudents}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Teaching Resources */}
                  <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-medium text-gray-900 flex items-center">
                        <BookOpen className="h-5 w-5 text-purple-500 mr-2" />
                        {t.teacherDashboard.resources.title}
                      </h3>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="bg-purple-50 p-4 rounded-lg">
                        <div className="flex items-center mb-2">
                          <FileText className="h-5 w-5 text-purple-600 mr-2" />
                          <h4 className="font-medium text-purple-800">{t.teacherDashboard.resources.lessonPlans}</h4>
                        </div>
                        <p className="text-sm text-purple-600 mb-3">{t.teacherDashboard.resources.lessonPlansDesc}</p>
                        <button className="text-purple-700 text-sm font-medium hover:text-purple-900">
                          {t.teacherDashboard.resources.explore} →
                        </button>
                      </div>
                      
                      <div className="bg-blue-50 p-4 rounded-lg">
                        <div className="flex items-center mb-2">
                          <Lightbulb className="h-5 w-5 text-blue-600 mr-2" />
                          <h4 className="font-medium text-blue-800">{t.teacherDashboard.resources.activities}</h4>
                        </div>
                        <p className="text-sm text-blue-600 mb-3">{t.teacherDashboard.resources.activitiesDesc}</p>
                        <button className="text-blue-700 text-sm font-medium hover:text-blue-900">
                          {t.teacherDashboard.resources.explore} →
                        </button>
                      </div>
                      
                      <div className="bg-green-50 p-4 rounded-lg">
                        <div className="flex items-center mb-2">
                          <UserPlus className="h-5 w-5 text-green-600 mr-2" />
                          <h4 className="font-medium text-green-800">{t.teacherDashboard.resources.inviteStudents}</h4>
                        </div>
                        <p className="text-sm text-green-600 mb-3">{t.teacherDashboard.resources.inviteStudentsDesc}</p>
                        <button className="text-green-700 text-sm font-medium hover:text-green-900">
                          {t.teacherDashboard.resources.getStarted} →
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'timetable' && (
                <Timetable />
              )}
            </motion.div>
          </div>
        </div>
      </div>

      {/* Zap Modal */}
      <TeacherZapForm 
        isOpen={isZapModalOpen} 
        onClose={() => {
          setIsZapModalOpen(false);
          setSelectedStudentId(null);
        }} 
        classId={user?.classId}
        preselectedStudentId={selectedStudentId || undefined}
      />
    </div>
  );
}

function Trophy({ className = "h-5 w-5" }) {
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
      <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"></path>
      <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"></path>
      <path d="M4 22h16"></path>
      <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"></path>
      <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"></path>
      <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"></path>
    </svg>
  );
}

function X({ className = "h-5 w-5" }) {
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
      <line x1="18" y1="6" x2="6" y2="18"></line>
      <line x1="6" y1="6" x2="18" y2="18"></line>
    </svg>
  );
}
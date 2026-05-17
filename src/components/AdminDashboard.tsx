import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  School, 
  Users, 
  Shield, 
  AlertTriangle, 
  TrendingUp, 
  Settings, 
  Bell, 
  BarChart4, 
  Calendar, 
  HelpCircle, 
  ArrowRight, 
  Wallet, 
  FileText, 
  UserPlus, 
  Globe, 
  Building, 
  BookOpen, 
  Award, 
  Zap,
  CheckCircle,
  Mail,
  DollarSign
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { SchoolActivation } from './SchoolActivation';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { useAuthStore } from '../store/authStore';
import { Link } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import { translations } from '../lib/translations';
import { SearchBar } from './SearchBar';
import { Sidebar } from './Sidebar';
import { AdminAIAgent } from './AdminAIAgent';
import { OutreachPanel } from './OutreachPanel';
import { PricingReference } from './PricingReference';

export function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<'overview' | 'compliance' | 'settings' | 'outreach' | 'pricing'>('overview');
  const { user } = useAuthStore();
  const { language } = useLanguage();
  console.log('AdminDashboard: Current language is', language);
  
  const t = translations[language];
  const [searchQuery, setSearchQuery] = useState('');
  const queryClient = useQueryClient();

  // Form state for settings
  const [schoolName, setSchoolName] = useState('');
  const [domain, setDomain] = useState('');
  const [country, setCountry] = useState('UK');
  const [timezone, setTimezone] = useState('UTC');
  const [subscriptionTier, setSubscriptionTier] = useState('free');
  const [minimumWithdrawal, setMinimumWithdrawal] = useState(100);
  const [maximumDailyRewards, setMaximumDailyRewards] = useState(1000);
  const [allowedWithdrawalDays, setAllowedWithdrawalDays] = useState<string[]>(['monday', 'wednesday', 'friday']);
  const [requireParentApproval, setRequireParentApproval] = useState(true);

  // Fetch school statistics
  const { data: schoolStats, isLoading } = useQuery({
    queryKey: ['school-stats', user?.school_id],
    queryFn: async () => {
      try {
        const { data: stats, error: statsError } = await supabase
          .from('student_statistics')
          .select('*')
          .single();

        if (statsError) throw statsError;

        const { data: compliance, error: complianceError } = await supabase
          .from('school_compliance_logs')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(5);

        if (complianceError) throw complianceError;

        const { data: announcements, error: announcementsError } = await supabase
          .from('school_announcements')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(5);

        if (announcementsError) throw announcementsError;

        // Get school details
        const { data: school, error: schoolError } = await supabase
          .from('schools')
          .select('*')
          .eq('id', user?.school_id)
          .single();

        if (schoolError) throw schoolError;

        // Get total teachers
        const { data: teachers, error: teachersError } = await supabase
          .from('profiles')
          .select('id')
          .eq('role', 'teacher')
          .eq('school_id', user?.school_id);

        if (teachersError) throw teachersError;

        // Get recent activity
        const { data: recentActivity, error: activityError } = await supabase
          .from('debug_logs')
          .select('*')
          .eq('event_type', 'school_activity')
          .order('created_at', { ascending: false })
          .limit(5);

        if (activityError) throw activityError;

        // Calculate compliance score based on compliance logs
        let complianceScore = 95; // Default value
        if (compliance && compliance.length > 0) {
          const passedChecks = compliance.filter(check => check.status === 'passed').length;
          const totalChecks = compliance.length;
          complianceScore = Math.round((passedChecks / totalChecks) * 100);
        }

        return { 
          stats, 
          compliance, 
          announcements, 
          school, 
          teacherCount: teachers?.length || 0,
          recentActivity: recentActivity || [],
          complianceScore
        };
      } catch (error) {
        console.error('Error fetching school stats:', error);
        throw error;
      }
    },
    enabled: !!user?.school_id
  });

  // Update school settings mutation
  const updateSchoolMutation = useMutation({
    mutationFn: async (data: any) => {
      const { error } = await supabase
        .from('schools')
        .update(data)
        .eq('id', user?.school_id);
      
      if (error) throw error;
      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['school-stats'] });
      toast.success('School settings updated successfully');
    },
    onError: (error) => {
      console.error('Error updating school settings:', error);
      toast.error('Failed to update school settings');
    }
  });

  useEffect(() => {
    console.log('AdminDashboard useEffect: language changed to', language);
    
    // Initialize form state with school data when it's loaded
    if (schoolStats?.school) {
      setSchoolName(schoolStats.school.name || '');
      setDomain(schoolStats.school.domain || '');
      setCountry(schoolStats.school.country || 'UK');
      setTimezone(schoolStats.school.timezone || 'UTC');
      setSubscriptionTier(schoolStats.school.subscription_tier || 'free');
      
      // Initialize reward settings
      const settings = schoolStats.school.settings || {};
      setMinimumWithdrawal(settings.minimum_withdrawal || 100);
      setMaximumDailyRewards(settings.maximum_daily_rewards || 1000);
      setAllowedWithdrawalDays(settings.allowed_withdrawal_days || ['monday', 'wednesday', 'friday']);
      setRequireParentApproval(settings.require_parent_approval !== undefined ? settings.require_parent_approval : true);
    }
  }, [schoolStats, language]);

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    // Implement search functionality here
    console.log("Searching for:", query);
  };

  const handleSaveSchoolSettings = () => {
    updateSchoolMutation.mutate({
      name: schoolName,
      domain,
      country,
      timezone,
      subscription_tier: subscriptionTier
    });
  };

  const handleSaveRewardSettings = () => {
    updateSchoolMutation.mutate({
      settings: {
        minimum_withdrawal: minimumWithdrawal,
        maximum_daily_rewards: maximumDailyRewards,
        allowed_withdrawal_days: allowedWithdrawalDays,
        require_parent_approval: requireParentApproval
      }
    });
  };

  const handleWithdrawalDayToggle = (day: string) => {
    setAllowedWithdrawalDays(prev => 
      prev.includes(day) 
        ? prev.filter(d => d !== day) 
        : [...prev, day]
    );
  };

  const handleRunComplianceAudit = () => {
    toast.info('Compliance audit is being scheduled. You will be notified when it is complete.');
  };

  const handleManageConsent = () => {
    toast.info('Consent management feature is coming soon.');
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">{t.adminDashboard.loading}</p>
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
            <Link to="/app" className="flex items-center px-4 py-2 text-gray-700 rounded-lg hover:bg-gray-100">
              <BarChart4 className="h-5 w-5 mr-3 text-purple-500" />
              <span>Dashboard</span>
            </Link>
            <Link to="/app/school-admin" className="flex items-center px-4 py-2 text-gray-700 rounded-lg hover:bg-gray-100">
              <Building className="h-5 w-5 mr-3 text-purple-500" />
              <span>School Management</span>
            </Link>
            <Link to="/teacher/funding" className="flex items-center px-4 py-2 text-gray-700 rounded-lg hover:bg-gray-100">
              <Wallet className="h-5 w-5 mr-3 text-purple-500" />
              <span>Funding</span>
            </Link>
            <Link to="/app/school-setup" className="flex items-center px-4 py-2 text-gray-700 rounded-lg hover:bg-gray-100">
              <Settings className="h-5 w-5 mr-3 text-purple-500" />
              <span>Settings</span>
            </Link>
            <Link to="/app/messages" className="flex items-center px-4 py-2 text-gray-700 rounded-lg hover:bg-gray-100">
              <Bell className="h-5 w-5 mr-3 text-purple-500" />
              <span>Notifications</span>
            </Link>
          </nav>
        </Sidebar>
      </div>

      {/* Main Content */}
      <div className="md:col-span-3 space-y-6">
        {/* Search Bar */}
        <SearchBar 
          onSearch={handleSearch} 
          placeholder="Search for schools, teachers, or students..."
          className="mb-6"
        />

        {/* School Activation Status */}
        <SchoolActivation />

        {/* Tabs */}
        <div className="bg-white rounded-xl shadow-sm">
          <div className="border-b border-gray-200">
            <nav className="flex -mb-px">
              <button
                onClick={() => setActiveTab('overview')}
                className={`px-6 py-3 text-sm font-medium ${
                  activeTab === 'overview'
                    ? 'border-b-2 border-blue-600 text-blue-700'
                    : 'text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <BarChart4 className="h-5 w-5 inline mr-2" />
                {t.adminDashboard.tabs.overview}
              </button>
              <button
                onClick={() => setActiveTab('compliance')}
                className={`px-6 py-3 text-sm font-medium ${
                  activeTab === 'compliance'
                    ? 'border-b-2 border-blue-600 text-blue-700'
                    : 'text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Shield className="h-5 w-5 inline mr-2" />
                {t.adminDashboard.tabs.compliance}
              </button>
              <button
                onClick={() => setActiveTab('settings')}
                className={`px-6 py-3 text-sm font-medium ${
                  activeTab === 'settings'
                    ? 'border-b-2 border-blue-600 text-blue-700'
                    : 'text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Settings className="h-5 w-5 inline mr-2" />
                {t.adminDashboard.tabs.settings}
              </button>
              <button
                onClick={() => setActiveTab('outreach')}
                className={`px-6 py-3 text-sm font-medium ${
                  activeTab === 'outreach'
                    ? 'border-b-2 border-blue-600 text-blue-700'
                    : 'text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Mail className="h-5 w-5 inline mr-2" />
                Outreach
              </button>
              <button
                onClick={() => setActiveTab('pricing')}
                className={`px-6 py-3 text-sm font-medium ${
                  activeTab === 'pricing'
                    ? 'border-b-2 border-blue-600 text-blue-700'
                    : 'text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <DollarSign className="h-5 w-5 inline mr-2" />
                Pricing
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
                          <p className="text-sm text-gray-600">{t.adminDashboard.stats.totalStudents}</p>
                          <p className="text-2xl font-bold text-gray-800">
                            {schoolStats?.stats?.student_count || 0}
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
                          <p className="text-sm text-gray-600">{t.adminDashboard.stats.totalTeachers}</p>
                          <p className="text-2xl font-bold text-gray-800">
                            {schoolStats?.teacherCount || 0}
                          </p>
                        </div>
                        <div className="bg-green-100 p-3 rounded-full">
                          <School className="h-6 w-6 text-green-600" />
                        </div>
                      </div>
                    </div>

                    <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-gray-600">{t.adminDashboard.stats.schoolBalance}</p>
                          <p className="text-2xl font-bold text-gray-800">
                            {schoolStats?.school?.school_balance || 0} SATs
                          </p>
                        </div>
                        <div className="bg-orange-100 p-3 rounded-full">
                          <Wallet className="h-6 w-6 text-orange-600" />
                        </div>
                      </div>
                    </div>

                    <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-gray-600">{t.adminDashboard.stats.complianceScore}</p>
                          <p className="text-2xl font-bold text-gray-800">
                            {schoolStats?.complianceScore || 0}%
                          </p>
                        </div>
                        <div className="bg-purple-100 p-3 rounded-full">
                          <Shield className="h-6 w-6 text-purple-600" />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Quick Actions */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <Link
                      to="/app/school-admin"
                      className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-medium text-gray-900">{t.adminDashboard.actions.manageSchool}</h3>
                        <Building className="h-6 w-6 text-purple-500" />
                      </div>
                      <p className="text-gray-600 mb-4">{t.adminDashboard.actions.manageSchoolDesc}</p>
                      <div className="flex justify-end">
                        <span className="text-purple-600 flex items-center text-sm font-medium">
                          {t.adminDashboard.actions.manage} <ArrowRight className="h-4 w-4 ml-1" />
                        </span>
                      </div>
                    </Link>

                    <Link 
                      to="/teacher/funding"
                      className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-medium text-gray-900">{t.adminDashboard.actions.manageFunding}</h3>
                        <Wallet className="h-6 w-6 text-green-500" />
                      </div>
                      <p className="text-gray-600 mb-4">{t.adminDashboard.actions.manageFundingDesc}</p>
                      <div className="flex justify-end">
                        <span className="text-green-600 flex items-center text-sm font-medium">
                          {t.adminDashboard.actions.manage} <ArrowRight className="h-4 w-4 ml-1" />
                        </span>
                      </div>
                    </Link>

                    <Link
                      to="/app/school-admin"
                      className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-medium text-gray-900">{t.adminDashboard.actions.inviteUsers}</h3>
                        <UserPlus className="h-6 w-6 text-blue-500" />
                      </div>
                      <p className="text-gray-600 mb-4">{t.adminDashboard.actions.inviteUsersDesc}</p>
                      <div className="flex justify-end">
                        <span className="text-blue-600 flex items-center text-sm font-medium">
                          {t.adminDashboard.actions.invite} <ArrowRight className="h-4 w-4 ml-1" />
                        </span>
                      </div>
                    </Link>
                  </div>

                  {/* Recent Announcements */}
                  <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-medium text-gray-900 flex items-center">
                        <Bell className="h-5 w-5 text-purple-500 mr-2" />
                        {t.adminDashboard.announcements.title}
                      </h3>
                      <Link to="/app/school-admin?tab=announcements" className="text-purple-600 hover:text-purple-800 text-sm font-medium">
                        {t.adminDashboard.announcements.createNew}
                      </Link>
                    </div>
                    
                    <div className="space-y-4">
                      {schoolStats?.announcements?.map(announcement => (
                        <div key={announcement.id} className="bg-gray-50 rounded-lg p-4">
                          <div className="flex items-center justify-between">
                            <h4 className="font-medium text-gray-900">{announcement.title}</h4>
                            <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                              announcement.priority === 'urgent' ? 'bg-red-100 text-red-800' :
                              announcement.priority === 'high' ? 'bg-orange-100 text-orange-800' :
                              'bg-blue-100 text-blue-800'
                            }`}>
                              {announcement.priority}
                            </span>
                          </div>
                          <p className="mt-2 text-sm text-gray-600">{announcement.content}</p>
                        </div>
                      ))}

                      {(!schoolStats?.announcements || schoolStats.announcements.length === 0) && (
                        <div className="text-center py-4 text-gray-500">
                          {t.adminDashboard.announcements.noAnnouncements}
                        </div>
                      )}

                      {schoolStats?.announcements && schoolStats.announcements.length > 0 && (
                        <div className="flex justify-center mt-4">
                          <Link to="/app/school-admin?tab=announcements" className="text-purple-600 hover:text-purple-800 text-sm font-medium">
                            View All Announcements
                          </Link>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Recent Compliance Issues */}
                  <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-medium text-gray-900 flex items-center">
                        <Shield className="h-5 w-5 text-red-500 mr-2" />
                        {t.adminDashboard.compliance.recentIssues}
                      </h3>
                      <Link to="/app/school-admin?tab=compliance" className="text-red-600 hover:text-red-800 text-sm font-medium">
                        {t.adminDashboard.compliance.viewAll}
                      </Link>
                    </div>
                    
                    <div className="space-y-4">
                      {schoolStats?.compliance?.map(issue => (
                        <div key={issue.id} className="bg-gray-50 rounded-lg p-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <h4 className="font-medium text-gray-900">{issue.check_type}</h4>
                              <p className="text-sm text-gray-600">{issue.details.message}</p>
                            </div>
                            <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                              issue.status === 'failed' ? 'bg-red-100 text-red-800' :
                              issue.status === 'warning' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-green-100 text-green-800'
                            }`}>
                              {issue.status}
                            </span>
                          </div>
                        </div>
                      ))}

                      {(!schoolStats?.compliance || schoolStats.compliance.length === 0) && (
                        <div className="text-center py-4 text-gray-500">
                          {t.adminDashboard.compliance.noIssues}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'compliance' && (
                <div className="space-y-6">
                  <h3 className="text-lg font-medium text-gray-900">{t.adminDashboard.compliance.title}</h3>
                  
                  {/* Compliance Status */}
                  <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="font-medium text-gray-900">{t.adminDashboard.compliance.status}</h4>
                      <span className="bg-green-100 text-green-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
                        {t.adminDashboard.compliance.approved}
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <div className="flex items-center mb-2">
                          <Shield className="h-5 w-5 text-green-600 mr-2" />
                          <h5 className="font-medium text-gray-900">{t.adminDashboard.compliance.dataProtection}</h5>
                        </div>
                        <p className="text-sm text-gray-600">{t.adminDashboard.compliance.dataProtectionDesc}</p>
                        <div className="mt-2 flex items-center">
                          <CheckCircle className="h-4 w-4 text-green-600 mr-1" />
                          <span className="text-xs text-green-600">{t.adminDashboard.compliance.compliant}</span>
                        </div>
                      </div>
                      
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <div className="flex items-center mb-2">
                          <Users className="h-5 w-5 text-green-600 mr-2" />
                          <h5 className="font-medium text-gray-900">{t.adminDashboard.compliance.ageVerification}</h5>
                        </div>
                        <p className="text-sm text-gray-600">{t.adminDashboard.compliance.ageVerificationDesc}</p>
                        <div className="mt-2 flex items-center">
                          <CheckCircle className="h-4 w-4 text-green-600 mr-1" />
                          <span className="text-xs text-green-600">{t.adminDashboard.compliance.compliant}</span>
                        </div>
                      </div>
                      
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <div className="flex items-center mb-2">
                          <FileText className="h-5 w-5 text-yellow-600 mr-2" />
                          <h5 className="font-medium text-gray-900">{t.adminDashboard.compliance.termsOfService}</h5>
                        </div>
                        <p className="text-sm text-gray-600">{t.adminDashboard.compliance.termsOfServiceDesc}</p>
                        <div className="mt-2 flex items-center">
                          <AlertTriangle className="h-4 w-4 text-yellow-600 mr-1" />
                          <span className="text-xs text-yellow-600">{t.adminDashboard.compliance.needsReview}</span>
                        </div>
                      </div>
                      
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <div className="flex items-center mb-2">
                          <Globe className="h-5 w-5 text-green-600 mr-2" />
                          <h5 className="font-medium text-gray-900">{t.adminDashboard.compliance.regionalCompliance}</h5>
                        </div>
                        <p className="text-sm text-gray-600">{t.adminDashboard.compliance.regionalComplianceDesc}</p>
                        <div className="mt-2 flex items-center">
                          <CheckCircle className="h-4 w-4 text-green-600 mr-1" />
                          <span className="text-xs text-green-600">{t.adminDashboard.compliance.compliant}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Compliance Actions */}
                  <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
                    <h4 className="font-medium text-gray-900 mb-4">{t.adminDashboard.compliance.actions}</h4>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <Link to="/terms" className="bg-purple-50 hover:bg-purple-100 p-4 rounded-lg text-left transition-colors">
                        <div className="flex items-center mb-2">
                          <FileText className="h-5 w-5 text-purple-600 mr-2" />
                          <h5 className="font-medium text-purple-900">{t.adminDashboard.compliance.reviewPolicies}</h5>
                        </div>
                        <p className="text-sm text-purple-600">{t.adminDashboard.compliance.reviewPoliciesDesc}</p>
                      </Link>
                      
                      <button 
                        onClick={handleRunComplianceAudit}
                        className="bg-blue-50 hover:bg-blue-100 p-4 rounded-lg text-left transition-colors"
                      >
                        <div className="flex items-center mb-2">
                          <Shield className="h-5 w-5 text-blue-600 mr-2" />
                          <h5 className="font-medium text-blue-900">{t.adminDashboard.compliance.runAudit}</h5>
                        </div>
                        <p className="text-sm text-blue-600">{t.adminDashboard.compliance.runAuditDesc}</p>
                      </button>
                      
                      <button 
                        onClick={handleManageConsent}
                        className="bg-green-50 hover:bg-green-100 p-4 rounded-lg text-left transition-colors"
                      >
                        <div className="flex items-center mb-2">
                          <Users className="h-5 w-5 text-green-600 mr-2" />
                          <h5 className="font-medium text-green-900">{t.adminDashboard.compliance.manageConsent}</h5>
                        </div>
                        <p className="text-sm text-green-600">{t.adminDashboard.compliance.manageConsentDesc}</p>
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'outreach' && (
                <OutreachPanel />
              )}

              {activeTab === 'pricing' && (
                <PricingReference />
              )}

              {activeTab === 'settings' && (
                <div className="space-y-6">
                  <h3 className="text-lg font-medium text-gray-900">{t.adminDashboard.settings.title}</h3>
                  
                  {/* School Settings */}
                  <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
                    <h4 className="font-medium text-gray-900 mb-4">{t.adminDashboard.settings.schoolSettings}</h4>
                    
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            {t.adminDashboard.settings.schoolName}
                          </label>
                          <input
                            type="text"
                            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-purple-500 focus:border-purple-500"
                            value={schoolName}
                            onChange={(e) => setSchoolName(e.target.value)}
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            {t.adminDashboard.settings.domain}
                          </label>
                          <input
                            type="text"
                            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-purple-500 focus:border-purple-500"
                            value={domain}
                            onChange={(e) => setDomain(e.target.value)}
                          />
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            {t.adminDashboard.settings.country}
                          </label>
                          <select
                            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-purple-500 focus:border-purple-500"
                            value={country}
                            onChange={(e) => setCountry(e.target.value)}
                          >
                            <option value="UK">United Kingdom</option>
                            <option value="US">United States</option>
                            <option value="CA">Canada</option>
                            <option value="AU">Australia</option>
                            <option value="NZ">New Zealand</option>
                          </select>
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            {t.adminDashboard.settings.timezone}
                          </label>
                          <select
                            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-purple-500 focus:border-purple-500"
                            value={timezone}
                            onChange={(e) => setTimezone(e.target.value)}
                          >
                            <option value="UTC">UTC</option>
                            <option value="Europe/London">London</option>
                            <option value="America/New_York">New York</option>
                            <option value="America/Los_Angeles">Los Angeles</option>
                            <option value="Asia/Tokyo">Tokyo</option>
                            <option value="Australia/Sydney">Sydney</option>
                          </select>
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            {t.adminDashboard.settings.subscriptionTier}
                          </label>
                          <select
                            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-purple-500 focus:border-purple-500"
                            value={subscriptionTier}
                            onChange={(e) => setSubscriptionTier(e.target.value)}
                            disabled
                          >
                            <option value="free">Free</option>
                            <option value="premium">Premium</option>
                            <option value="enterprise">Enterprise</option>
                          </select>
                        </div>
                      </div>
                      
                      <div className="flex justify-end">
                        <button 
                          className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors"
                          onClick={handleSaveSchoolSettings}
                          disabled={updateSchoolMutation.isPending}
                        >
                          {updateSchoolMutation.isPending ? 'Saving...' : t.adminDashboard.settings.saveChanges}
                        </button>
                      </div>
                    </div>
                  </div>
                  
                  {/* Reward Settings */}
                  <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
                    <h4 className="font-medium text-gray-900 mb-4">{t.adminDashboard.settings.rewardSettings}</h4>
                    
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            {t.adminDashboard.settings.minimumWithdrawal}
                          </label>
                          <div className="flex">
                            <input
                              type="number"
                              className="w-full px-3 py-2 border border-gray-300 rounded-l-md shadow-sm focus:outline-none focus:ring-purple-500 focus:border-purple-500"
                              value={minimumWithdrawal}
                              onChange={(e) => setMinimumWithdrawal(parseInt(e.target.value) || 0)}
                            />
                            <span className="inline-flex items-center px-3 py-2 rounded-r-md border border-l-0 border-gray-300 bg-gray-50 text-gray-500">
                              SATs
                            </span>
                          </div>
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            {t.adminDashboard.settings.maximumDailyRewards}
                          </label>
                          <div className="flex">
                            <input
                              type="number"
                              className="w-full px-3 py-2 border border-gray-300 rounded-l-md shadow-sm focus:outline-none focus:ring-purple-500 focus:border-purple-500"
                              value={maximumDailyRewards}
                              onChange={(e) => setMaximumDailyRewards(parseInt(e.target.value) || 0)}
                            />
                            <span className="inline-flex items-center px-3 py-2 rounded-r-md border border-l-0 border-gray-300 bg-gray-50 text-gray-500">
                              SATs
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          {t.adminDashboard.settings.allowedWithdrawalDays}
                        </label>
                        <div className="grid grid-cols-7 gap-2">
                          {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map((day, index) => (
                            <div key={index} className="flex items-center">
                              <input
                                type="checkbox"
                                id={`day-${index}`}
                                className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                                checked={allowedWithdrawalDays.includes(day.toLowerCase())}
                                onChange={() => handleWithdrawalDayToggle(day.toLowerCase())}
                              />
                              <label htmlFor={`day-${index}`} className="ml-2 text-sm text-gray-700">
                                {day.substring(0, 3)}
                              </label>
                            </div>
                          ))}
                        </div>
                      </div>
                      
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          id="require-parent-approval"
                          className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                          checked={requireParentApproval}
                          onChange={(e) => setRequireParentApproval(e.target.checked)}
                        />
                        <label htmlFor="require-parent-approval" className="ml-2 text-sm text-gray-700">
                          {t.adminDashboard.settings.requireParentApproval}
                        </label>
                      </div>
                      
                      <div className="flex justify-end">
                        <button 
                          className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors"
                          onClick={handleSaveRewardSettings}
                          disabled={updateSchoolMutation.isPending}
                        >
                          {updateSchoolMutation.isPending ? 'Saving...' : t.adminDashboard.settings.saveChanges}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          </div>

          {/* AI Agent */}
          <div className="mt-6">
            <AdminAIAgent />
          </div>
        </div>
      </div>
    </div>
  );
}
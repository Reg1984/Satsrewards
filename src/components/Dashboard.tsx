import React from 'react';
import { useAuthStore } from '../store/authStore';
import { StudentDashboard } from './StudentDashboard';
import { TeacherDashboardNew } from './teacher/TeacherDashboardNew';
import { AdminDashboard } from './AdminDashboard';

export function Dashboard() {
  const { user } = useAuthStore();
  
  if (!user) {
    // Redirect to login page or show login component
    return <div className="flex items-center justify-center min-h-screen">
      <div className="text-center p-8 max-w-md mx-auto bg-white rounded-lg shadow-lg">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Welcome to SatsRewards</h2>
        <p className="text-gray-600 mb-6">Please sign in to access your dashboard</p>
        <button 
          onClick={() => window.location.href = '/login'}
          className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
        >
          Sign In
        </button>
      </div>
    </div>;
  }

  // Redirect teacher users to the teacher dashboard
  if (user.role === 'teacher') {
    return <TeacherDashboardNew />;
  }
  
  // Show admin dashboard for admin users
  if (user.role === 'admin') {
    return <AdminDashboard />;
  }

  // Default to student dashboard for any other role
  return <StudentDashboard />;
}
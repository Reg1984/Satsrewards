import React from 'react';
import { Link } from 'react-router-dom';
import { Avatar } from './Avatar';
import { Bell, Settings, HelpCircle, Wallet } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { useLanguage } from '../contexts/LanguageContext';
import { translations } from '../lib/translations';

interface SidebarProps {
  children?: React.ReactNode;
}

export function Sidebar({ children }: SidebarProps) {
  const { user } = useAuthStore();
  const { language } = useLanguage();
  const t = translations[language];

  if (!user) return null;

  return (
    <div className="bg-white shadow-sm rounded-xl p-6 h-full">
      <div className="flex flex-col h-full">
        <div className="flex items-center space-x-4 mb-6">
          {user.image_url && (
            <Avatar 
              name={user.name || ''} 
              imageUrl={user.image_url}
              size="md"
            />
          )}
          <div>
            <h1 className="text-xl font-bold text-gray-900">{user.name}</h1>
            <p className="text-sm text-gray-500">
              {user.role === 'student' && t.dashboard.learnerCockpit}
              {user.role === 'teacher' && t.teacherDashboard.cockpit}
              {user.role === 'admin' && t.adminDashboard.cockpit}
            </p>
          </div>
        </div>

        <div className="flex-grow">
          {children}
        </div>

        <div className="mt-6 pt-6 border-t border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex space-x-3">
              <button className="text-gray-500 hover:text-gray-700">
                <Bell className="h-5 w-5" />
              </button>
              <button className="text-gray-500 hover:text-gray-700">
                <Settings className="h-5 w-5" />
              </button>
              <button className="text-gray-500 hover:text-gray-700">
                <HelpCircle className="h-5 w-5" />
              </button>
            </div>
            <div>
              {user.classId && (
                <span className="text-xs text-gray-500">
                  Class {user.classId}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
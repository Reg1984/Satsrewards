import React, { useState } from 'react';
import { useAuthStore } from '../store/authStore';
import { User } from '../types/auth';
import { motion } from 'framer-motion';
import { UserCog, ChevronDown, ChevronUp } from 'lucide-react';

const mockUsers: Record<string, User> = {
  student: {
    id: '00000000-0000-0000-0000-000000000002',
    email: 'student@test.com',
    role: 'student',
    name: 'Test Student',
    classId: 'class-12A',
    school_id: '00000000-0000-0000-0000-000000000003',
    lastActive: new Date(),
    image_url: 'https://images.unsplash.com/photo-1517841905240-472988babdf9'
  },
  teacher: {
    id: '00000000-0000-0000-0000-000000000001',
    email: 'teacher@test.com',
    role: 'teacher',
    name: 'Test Teacher',
    classId: 'class-12A',
    school_id: '00000000-0000-0000-0000-000000000003',
    lastActive: new Date(),
    image_url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330'
  },
  admin: {
    id: '00000000-0000-0000-0000-000000000004',
    email: 'admin@test.com',
    role: 'admin',
    name: 'Test Admin',
    classId: undefined,
    school_id: '00000000-0000-0000-0000-000000000003',
    lastActive: new Date(),
    image_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d'
  }
};

export function RoleSwitcher() {
  const { user, setUser } = useAuthStore();
  const [isOpen, setIsOpen] = useState(false);

  const switchRole = (role: 'student' | 'teacher' | 'admin') => {
    setUser(mockUsers[role]);
    setIsOpen(false);
  };

  const currentRole = user?.role || 'student';

  return (
    <div className="relative">
      <motion.button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-1 px-3 py-1.5 bg-orange-100 text-orange-800 rounded-md hover:bg-orange-200"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        <UserCog className="h-4 w-4" />
        <span className="text-sm capitalize">{currentRole} Mode</span>
        {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
      </motion.button>

      {isOpen && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg z-50"
        >
          <div className="py-1">
            <button
              onClick={() => switchRole('student')}
              className={`block w-full text-left px-4 py-2 text-sm ${
                currentRole === 'student' ? 'bg-orange-100 text-orange-800' : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              Student Dashboard
            </button>
            <button
              onClick={() => switchRole('teacher')}
              className={`block w-full text-left px-4 py-2 text-sm ${
                currentRole === 'teacher' ? 'bg-orange-100 text-orange-800' : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              Teacher Dashboard
            </button>
            <button
              onClick={() => switchRole('admin')}
              className={`block w-full text-left px-4 py-2 text-sm ${
                currentRole === 'admin' ? 'bg-orange-100 text-orange-800' : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              Admin Dashboard
            </button>
          </div>
        </motion.div>
      )}
    </div>
  );
}

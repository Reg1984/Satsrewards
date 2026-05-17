import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { 
  Users, 
  ArrowLeft, 
  Award, 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  Plus,
  Search,
  Filter,
  Zap
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/authStore';
import { toast } from 'sonner';
import { TeacherZapForm } from './TeacherZapForm';

interface Student {
  id: string;
  name: string;
  image_url?: string;
  educational_credits: number;
}

export function ClassDetails() {
  const { classId } = useParams<{ classId: string }>();
  const { user } = useAuthStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [isZapModalOpen, setIsZapModalOpen] = useState(false);
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);

  // Fetch class data
  const { data: students, isLoading, error } = useQuery({
    queryKey: ['class-details', classId],
    queryFn: async () => {
      try {
        if (!classId) {
          throw new Error('No class ID provided');
        }
        
        console.log('Fetching class details for class:', classId);
        
        const { data, error } = await supabase
          .from('profiles')
          .select(`
            id,
            name,
            image_url,
            educational_credits
          `)
          .eq('class_id', classId)
          .eq('role', 'student');

        if (error) {
          console.error('Error fetching students for class details:', error);
          throw error;
        }

        console.log(`Found ${data?.length || 0} students in class ${classId}`);
        return data as Student[];
      } catch (error) {
        console.error('Error in class details query:', error);
        toast.error('Failed to load class data');
        throw error;
      }
    },
    enabled: !!classId && !!user?.id
  });

  const filteredStudents = students?.filter(student => 
    student.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleAwardSats = (studentId: string) => {
    setSelectedStudentId(studentId);
    setIsZapModalOpen(true);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading class data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-red-50 rounded-lg">
        <div className="flex items-start space-x-3 text-red-600">
          <AlertTriangle className="h-6 w-6 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium">Error Loading Class Data</p>
            <p className="text-sm mt-1">
              {error instanceof Error ? error.message : 'An unexpected error occurred'}
            </p>
            <button 
              onClick={() => window.location.reload()}
              className="mt-3 px-3 py-1 bg-red-100 text-red-700 rounded-md hover:bg-red-200 transition-colors text-sm"
            >
              Refresh Page
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 min-h-screen">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Link to="/teacher/classes" className="text-gray-500 hover:text-gray-700">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h2 className="text-xl font-semibold text-gray-900">Class {classId} Details</h2>
        </div>
        <div className="flex items-center space-x-3">
          <span className="text-sm text-gray-500">
            {students?.length || 0} Students
          </span>
        </div>
      </div>

      {/* Search and Filter */}
      <div className="bg-white rounded-lg shadow-sm p-4 flex flex-wrap gap-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search students..."
            className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500"
          />
        </div>
        <button className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 flex items-center">
          <Filter className="h-4 w-4 mr-2" />
          Filter
        </button>
        <button 
          className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 flex items-center"
          onClick={() => setIsZapModalOpen(true)}
        >
          <Zap className="h-4 w-4 mr-2" />
          Award SATs
        </button>
      </div>

      {/* Student List */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Student
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  SATs Balance
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredStudents?.map((student) => (
                <tr key={student.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10">
                        {student.image_url ? (
                          <img 
                            className="h-10 w-10 rounded-full" 
                            src={student.image_url} 
                            alt={student.name} 
                          />
                        ) : (
                          <div className="h-10 w-10 rounded-full bg-orange-100 flex items-center justify-center text-orange-500 font-semibold">
                            {student.name.charAt(0)}
                          </div>
                        )}
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">{student.name}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{student.educational_credits}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <button 
                      className="text-orange-600 hover:text-orange-700"
                      onClick={() => handleAwardSats(student.id)}
                    >
                      Award SATs
                    </button>
                  </td>
                </tr>
              ))}
              
              {filteredStudents?.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-6 py-4 text-center text-gray-500">
                    No students found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Zap Modal */}
      <TeacherZapForm 
        isOpen={isZapModalOpen} 
        onClose={() => {
          setIsZapModalOpen(false);
          setSelectedStudentId(null);
        }}
        classId={classId}
        preselectedStudentId={selectedStudentId || undefined}
      />
    </div>
  );
}
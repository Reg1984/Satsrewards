import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  Users, 
  Plus, 
  Search, 
  Filter, 
  ArrowLeft, 
  Zap,
  BarChart4
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/authStore';
import { ClassCard } from '../ClassCard';
import { TeacherZapForm } from './TeacherZapForm';

export function TeacherClassesNew() {
  const { user } = useAuthStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [isZapModalOpen, setIsZapModalOpen] = useState(false);

  // Fetch classes taught by the teacher
  const { data: classes, isLoading } = useQuery({
    queryKey: ['teacher-classes', user?.id],
    queryFn: async () => {
      try {
        // First get students in the teacher's class
        const { data: students, error: studentsError } = await supabase
          .from('profiles')
          .select(`
            id, 
            name, 
            image_url, 
            class_id,
            educational_credits
          `)
          .eq('role', 'student')
          .eq('class_id', user?.classId);

        if (studentsError) throw studentsError;

        // Get recent awards
        const { data: awards, error: awardsError } = await supabase
          .from('awards')
          .select(`
            id,
            student_id,
            sats,
            reason,
            created_at
          `)
          .in('student_id', students?.map(s => s.id) || [])
          .order('created_at', { ascending: false })
          .limit(10);

        if (awardsError) throw awardsError;

        // Group students by class
        const classGroups = students?.reduce((acc, student) => {
          if (!acc[student.class_id]) {
            acc[student.class_id] = {
              id: student.class_id,
              name: student.class_id,
              teacherName: user?.name || 'Teacher',
              teacherImage: user?.image_url,
              studentCount: 0,
              totalSats: 0,
              topStudents: [],
              recentAwards: []
            };
          }
          
          acc[student.class_id].studentCount++;
          acc[student.class_id].totalSats += student.educational_credits || 0;
          
          // Add to top students if applicable
          if (acc[student.class_id].topStudents.length < 3 || 
              student.educational_credits > acc[student.class_id].topStudents[acc[student.class_id].topStudents.length - 1]?.sats) {
            
            acc[student.class_id].topStudents.push({
              id: student.id,
              name: student.name,
              imageUrl: student.image_url,
              sats: student.educational_credits || 0
            });
            
            // Sort top students by sats in descending order
            acc[student.class_id].topStudents.sort((a, b) => b.sats - a.sats);
            
            // Keep only top 3
            if (acc[student.class_id].topStudents.length > 3) {
              acc[student.class_id].topStudents.pop();
            }
          }
          
          return acc;
        }, {} as Record<string, any>);

        // Add recent awards to each class
        awards?.forEach(award => {
          const student = students?.find(s => s.id === award.student_id);
          if (student && classGroups[student.class_id]) {
            if (!classGroups[student.class_id].recentAwards) {
              classGroups[student.class_id].recentAwards = [];
            }
            
            if (classGroups[student.class_id].recentAwards.length < 5) {
              classGroups[student.class_id].recentAwards.push({
                id: award.id,
                studentName: student.name,
                reason: award.reason,
                sats: award.sats
              });
            }
          }
        });

        return Object.values(classGroups);
      } catch (error) {
        console.error('Error fetching teacher classes:', error);
        throw error;
      }
    },
    enabled: !!user?.id && user?.role === 'teacher'
  });

  const filteredClasses = classes?.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading classes...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Users className="h-6 w-6 text-orange-500" />
          <h2 className="text-xl font-semibold text-gray-900">My Classes</h2>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setIsZapModalOpen(true)}
            className="flex items-center px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600"
          >
            <Zap className="h-4 w-4 mr-2" />
            Award SATs
          </button>
          <Link
            to="/teacher"
            className="flex items-center px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
          >
            <BarChart4 className="h-4 w-4 mr-2" />
            Dashboard
          </Link>
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
            placeholder="Search classes..."
            className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500"
          />
        </div>
        <button className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 flex items-center">
          <Filter className="h-4 w-4 mr-2" />
          Filter
        </button>
      </div>

      {/* Classes Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredClasses?.map((classData) => (
          <ClassCard key={classData.id} classData={classData} />
        ))}

        {filteredClasses?.length === 0 && (
          <div className="col-span-full bg-gray-50 p-8 text-center rounded-lg">
            <p className="text-gray-500">No classes found</p>
          </div>
        )}
      </div>

      {/* Zap Modal */}
      <TeacherZapForm 
        isOpen={isZapModalOpen} 
        onClose={() => setIsZapModalOpen(false)} 
        classId={user?.classId}
      />
    </div>
  );
}
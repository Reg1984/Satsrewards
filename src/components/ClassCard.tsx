import { motion } from 'framer-motion';
import { Users, Award, TrendingUp, Star } from 'lucide-react';
import { Avatar } from './Avatar';
import { cn, formatNumber } from '../lib/utils';
import { Link } from 'react-router-dom';

interface ClassCardProps {
  classData: {
    id: string;
    name: string;
    teacherName: string;
    teacherImage?: string;
    studentCount: number;
    totalSats: number;
    topStudents: {
      id: string;
      name: string;
      imageUrl?: string;
      sats: number;
    }[];
    recentAwards?: {
      id: string;
      studentName: string;
      reason: string;
      sats: number;
    }[];
  };
  className?: string;
}

export function ClassCard({ classData, className }: ClassCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        'bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100',
        className
      )}
    >
      <div className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Class {classData.name}</h3>
            <div className="mt-1 flex items-center text-sm text-gray-500">
              <Users className="h-4 w-4 mr-1" />
              <span>{classData.studentCount} Students</span>
            </div>
          </div>
          <Avatar name={classData.teacherName} imageUrl={classData.teacherImage} />
        </div>

        <div className="mt-6 grid grid-cols-2 gap-4">
          <div className="bg-orange-50 rounded-lg p-4">
            <div className="flex items-center text-orange-600">
              <Award className="h-5 w-5" />
              <span className="ml-2 text-sm font-medium">Total SATs</span>
            </div>
            <p className="mt-2 text-2xl font-bold text-orange-700">
              {formatNumber(classData.totalSats)}
            </p>
          </div>

          <div className="bg-green-50 rounded-lg p-4">
            <div className="flex items-center text-green-600">
              <TrendingUp className="h-5 w-5" />
              <span className="ml-2 text-sm font-medium">Average</span>
            </div>
            <p className="mt-2 text-2xl font-bold text-green-700">
              {formatNumber(Math.round(classData.totalSats / classData.studentCount))}
            </p>
          </div>
        </div>

        {classData.topStudents.length > 0 && (
          <div className="mt-6">
            <h4 className="text-sm font-medium text-gray-900 mb-3">Top Students</h4>
            <div className="space-y-3">
              {classData.topStudents.map((student, index) => (
                <div
                  key={student.id}
                  className="flex items-center justify-between bg-gray-50 rounded-lg p-3"
                >
                  <div className="flex items-center">
                    <span className="w-6 text-sm font-medium text-gray-500">#{index + 1}</span>
                    <Avatar name={student.name} imageUrl={student.imageUrl} size="sm" className="ml-2" />
                    <span className="ml-3 text-sm text-gray-900">{student.name}</span>
                  </div>
                  <span className="text-sm font-medium text-orange-600">
                    {formatNumber(student.sats)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {classData.recentAwards && classData.recentAwards.length > 0 && (
          <div className="mt-6">
            <h4 className="text-sm font-medium text-gray-900 mb-3">Recent Awards</h4>
            <div className="space-y-3">
              {classData.recentAwards.map(award => (
                <div
                  key={award.id}
                  className="flex items-center justify-between bg-gray-50 rounded-lg p-3"
                >
                  <div className="flex items-center">
                    <Star className="h-4 w-4 text-yellow-500" />
                    <div className="ml-2">
                      <span className="text-sm font-medium text-gray-900">{award.studentName}</span>
                      <p className="text-xs text-gray-500">{award.reason}</p>
                    </div>
                  </div>
                  <span className="text-sm font-medium text-orange-600">
                    +{award.sats}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="border-t border-gray-100 bg-gray-50 px-6 py-4">
        <Link 
          to={`/teacher/class/${classData.id}`}
          className="w-full text-center text-orange-600 hover:text-orange-700 text-sm font-medium"
        >
          View Class Details →
        </Link>
      </div>
    </motion.div>
  );
}